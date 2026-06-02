import React, { useEffect, useMemo, useState, useRef } from "react";
import Lottie from "lottie-react";
import { JeopardyGame, JeopardyCategory, JeopardyQuestion, JeopardyTurnMode } from "@/types";
import { useSync } from "@/context/SyncContext";
import { correctSound, wrongSound } from "@/utils/sound";
import { resolveMediaUrl } from "@/utils/media";
import fireworksAnimation from "@/assets/animations/fireworks.json";

const TIMER_DURATION = 30;
const CARD_BACK_IMG = resolveMediaUrl("images/TADTSlogo.jpg");
const JEOPARDY_BC = "viktoria-jeopardy-state";

type ClueType = "CALL_FRIEND" | "ASK_HOST" | "ASK_OTHER_TEAM";
type CardView = "score" | "question" | "answer";

interface TeamClueUsage {
  remaining: number;
  usedTypes: ClueType[];
}

interface ActiveClueState {
  type: ClueType;
  usedBy: 0 | 1;
  targetTeam?: 0 | 1;
  note?: string;
}

interface JeopardyGameProps {
  game: JeopardyGame;
  onExit: () => void;
  isViewer?: boolean;
}

// ── Timer circle (unchanged from original) ────────────────────────────────────
const TimerCircle: React.FC<{ timeLeft: number; duration: number }> = ({ timeLeft, duration }) => {
  const normalizedRadius = 40;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference - (timeLeft / duration) * circumference;
  const urgent = timeLeft <= 5 && timeLeft > 0;

  return (
    <div className="relative w-24 h-24">
      <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100">
        <circle className="text-slate-700" stroke="currentColor" strokeWidth="10" fill="transparent" r={normalizedRadius} cx="50" cy="50" />
        <circle
          className={`${urgent ? "text-red-400" : "text-yellow-400"} transition-all duration-1000 linear`}
          stroke="currentColor" strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" fill="transparent"
          r={normalizedRadius} cx="50" cy="50"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
        <span className={`text-3xl font-bold ${urgent ? "text-red-400" : ""}`}>{timeLeft}</span>
      </div>
    </div>
  );
};

// ── Feedback overlay (unchanged from original) ────────────────────────────────
const FeedbackOverlay: React.FC<{ type: "correct" | "wrong" }> = ({ type }) => {
  const isCorrect = type === "correct";
  return (
    <div key={type} className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      {isCorrect ? (
        <div className="w-full h-full"><Lottie animationData={fireworksAnimation} loop={false} /></div>
      ) : (
        <div className="flex items-center justify-center w-48 h-48 rounded-full bg-red-500/30 animate-shake">
          <span className="text-9xl text-red-400">✖</span>
        </div>
      )}
    </div>
  );
};

const otherTeam = (team: 0 | 1) => (team === 0 ? 1 : 0) as 0 | 1;

// ── TV score overlay (cards shown center of board) ────────────────────────────
const TVScoreOverlay: React.FC<{
  active: { category: JeopardyCategory; question: JeopardyQuestion } | null;
  cardView: CardView;
  currentTeamIndex: 0 | 1;
  teamScores: [number, number];
  teamLabels: [string, string];
  timeLeft: number;
}> = ({ active, cardView, currentTeamIndex, teamScores, teamLabels, timeLeft }) => {
  if (!active) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/90 backdrop-blur-md pointer-events-none">
      <div className="flex flex-col items-center gap-6 w-full max-w-6xl p-8 h-full justify-center pointer-events-auto">
        {/* Category + points */}
        <div className="text-center shrink-0">
          <p className="text-4xl font-black uppercase text-yellow-300 drop-shadow-lg tracking-wide">{active.category.name}</p>
          <p className="text-2xl font-bold text-yellow-200">{active.question.points} pts</p>
        </div>

        {/* Score cards */}
        {cardView === "score" && (
          <div className="flex gap-6">
            {([0, 1] as const).map(i => (
              <div
                key={i}
                className={`text-center px-12 py-7 rounded-2xl border-4 shadow-2xl transition-all ${
                  currentTeamIndex === i
                    ? "border-yellow-400 bg-yellow-400/20 scale-110"
                    : "border-blue-500/60 bg-blue-900/60"
                }`}
              >
                <p className="text-xl font-bold text-slate-200 mb-1">{teamLabels[i]}</p>
                <p className="text-7xl font-black text-yellow-300">{teamScores[i]}</p>
                <p className="text-sm text-slate-400 mt-1">pts</p>
              </div>
            ))}
          </div>
        )}

        {/* Question view */}
        {cardView === "question" && (
          active.question.questionMediaUrl && active.question.questionMediaType ? (
            <div className="grid grid-cols-12 gap-8 w-full items-center min-h-0 flex-1">
              {/* Left Column: Media (7 cols) */}
              <div className="col-span-7 bg-blue-950/40 border border-blue-500/30 rounded-2xl p-4 flex justify-center items-center h-full max-h-[500px] overflow-hidden">
                {active.question.questionMediaType === "IMAGE" && (
                  <img src={resolveMediaUrl(active.question.questionMediaUrl)} alt="Question" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
                )}
                {active.question.questionMediaType === "AUDIO" && (
                  <div className="w-full flex flex-col items-center justify-center p-8 bg-blue-900/40 rounded-xl">
                    <span className="text-6xl mb-4">🎵</span>
                    <audio controls autoPlay src={resolveMediaUrl(active.question.questionMediaUrl)} className="w-full max-w-md" />
                  </div>
                )}
                {active.question.questionMediaType === "VIDEO" && (
                  <video controls autoPlay src={resolveMediaUrl(active.question.questionMediaUrl)} className="max-w-full max-h-full rounded-xl object-contain" />
                )}
              </div>

              {/* Right Column: Question Text & Timer (5 cols) */}
              <div className="col-span-5 flex flex-col gap-6 items-center text-center justify-center h-full">
                <div className="bg-blue-900/85 backdrop-blur rounded-2xl px-8 py-6 border border-blue-400/40 shadow-2xl w-full">
                  <p className="text-3xl leading-relaxed font-semibold text-white">{active.question.question || "?"}</p>
                </div>
                {/* Timer bar */}
                <div className="w-full max-w-xs h-3 bg-blue-950 rounded-full overflow-hidden border border-blue-700">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? "bg-red-500" : "bg-yellow-400"}`}
                    style={{ width: `${(timeLeft / TIMER_DURATION) * 100}%` }}
                  />
                </div>
                <p className="text-6xl font-black tabular-nums text-yellow-300">{timeLeft}</p>
              </div>
            </div>
          ) : (
            /* No media layouts */
            <div className="max-w-3xl text-center space-y-6 flex flex-col items-center justify-center flex-1">
              <div className="bg-blue-900/85 backdrop-blur rounded-2xl px-12 py-8 border border-blue-400/40 shadow-2xl">
                <p className="text-4xl leading-relaxed font-semibold text-white">{active.question.question || "?"}</p>
              </div>
              {/* Timer bar */}
              <div className="w-72 h-3 bg-blue-950 rounded-full overflow-hidden border border-blue-700">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? "bg-red-500" : "bg-yellow-400"}`}
                  style={{ width: `${(timeLeft / TIMER_DURATION) * 100}%` }}
                />
              </div>
              <p className="text-6xl font-black tabular-nums text-yellow-300">{timeLeft}</p>
            </div>
          )
        )}

        {/* Answer view */}
        {cardView === "answer" && (
          <div className="max-w-3xl text-center">
            <div className="bg-emerald-900/85 backdrop-blur rounded-2xl px-14 py-10 border-2 border-emerald-400 shadow-2xl">
              <p className="text-xl text-emerald-300 font-bold mb-4 uppercase tracking-widest">Correct Answer</p>
              <p className="text-6xl font-black text-white">{active.question.correctAnswer || "—"}</p>
              {active.question.explanation?.trim() && (
                <p className="mt-6 text-xl text-emerald-200">{active.question.explanation}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
const JeopardyGameScreen: React.FC<JeopardyGameProps> = ({ game, onExit, isViewer = false }) => {
  const { sessionData, updateSession, isRemoteMode } = useSync();

  const [active, setActive] = useState<{ category: JeopardyCategory; question: JeopardyQuestion } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [cardView, setCardView] = useState<CardView>("score");
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [currentTeamIndex, setCurrentTeamIndex] = useState<0 | 1>(0);
  const [teamScores, setTeamScores] = useState<[number, number]>([0, 0]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasReboundAttempted, setHasReboundAttempted] = useState(false);
  const [activeClue, setActiveClue] = useState<ActiveClueState | null>(null);
  const [showClueMenu, setShowClueMenu] = useState(false);
  const [canFlashTimerButton, setCanFlashTimerButton] = useState(false);

  useEffect(() => {
    setCanFlashTimerButton(false);
    if (!active) return;
    const timer = setTimeout(() => {
      setCanFlashTimerButton(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [active?.question?.id]);
  const initialClueCount = game.cluesPerTeam ?? 2;
  const [clueUsage, setClueUsage] = useState<[TeamClueUsage, TeamClueUsage]>(() => [
    { remaining: initialClueCount, usedTypes: [] },
    { remaining: initialClueCount, usedTypes: [] },
  ]);

  // Keep latest state in ref so BC handler never has stale closure
  const latestRef = useRef({ active, showAnswer, cardView, usedIds, currentTeamIndex, teamScores, timeLeft, isTimerRunning });
  useEffect(() => {
    latestRef.current = { active, showAnswer, cardView, usedIds, currentTeamIndex, teamScores, timeLeft, isTimerRunning };
  });

  // ── PC: BroadcastChannel → TV ─────────────────────────────────────────────
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (isViewer) return;
    const bc = new BroadcastChannel(JEOPARDY_BC);
    bcRef.current = bc;
    bc.onmessage = (ev) => {
      if (ev.data?.type === "REQUEST_STATE") {
        const s = latestRef.current;
        bc.postMessage({
          type: "STATE_UPDATE",
          active: s.active, showAnswer: s.showAnswer, cardView: s.cardView,
          usedIds: Array.from(s.usedIds), currentTeamIndex: s.currentTeamIndex,
          teamScores: s.teamScores, timeLeft: s.timeLeft, isTimerRunning: s.isTimerRunning,
        });
      }
    };
    return () => { bc.close(); bcRef.current = null; };
  }, [isViewer]);

  // Broadcast every state change to TV
  useEffect(() => {
    if (isViewer || !bcRef.current) return;
    bcRef.current.postMessage({
      type: "STATE_UPDATE",
      active, showAnswer, cardView,
      usedIds: Array.from(usedIds), currentTeamIndex,
      teamScores, timeLeft, isTimerRunning,
    });
  }, [isViewer, active, showAnswer, cardView, usedIds, currentTeamIndex, teamScores, timeLeft, isTimerRunning]);

  // ── TV: receive from PC ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isViewer) return;
    const bc = new BroadcastChannel(JEOPARDY_BC);
    bc.onmessage = (ev) => {
      const { type: t, active: a, showAnswer: sa, cardView: cv, usedIds: ui, currentTeamIndex: ct, teamScores: ts, timeLeft: tl } = ev.data;
      if (t === "STATE_UPDATE") {
        if (a !== undefined) setActive(a);
        if (sa !== undefined) setShowAnswer(sa);
        if (cv !== undefined) setCardView(cv);
        if (ui !== undefined) setUsedIds(new Set(ui));
        if (ct !== undefined) setCurrentTeamIndex(ct);
        if (ts !== undefined) setTeamScores(ts);
        if (tl !== undefined) setTimeLeft(tl);
      }
    };
    bc.postMessage({ type: "REQUEST_STATE" });
    return () => bc.close();
  }, [isViewer]);

  // ── Firebase remote sync (unchanged from original) ────────────────────────
  useEffect(() => {
    if (!isRemoteMode || !sessionData) return;
    if (sessionData.usedQuestionIds) setUsedIds(new Set(sessionData.usedQuestionIds));
    if (sessionData.teamScores) {
      const teams = Object.keys(sessionData.teamScores).sort();
      setTeamScores([sessionData.teamScores[teams[0]] || 0, sessionData.teamScores[teams[1]] || 0]);
    }
    if (sessionData.isAnswerRevealed !== undefined) setShowAnswer(sessionData.isAnswerRevealed);
  }, [sessionData, isRemoteMode]);

  useEffect(() => {
    if (!isRemoteMode || !sessionData?.activeQuestionId) {
      if (!sessionData?.activeQuestionId && active) setActive(null);
      return;
    }
    const qId = sessionData.activeQuestionId;
    if (active?.question.id !== qId) {
      game.categories.forEach(cat => {
        const q = cat.questions.find(qq => qq.id === qId);
        if (q) {
          setActive({ category: cat, question: q as JeopardyQuestion });
          setShowAnswer(sessionData.isAnswerRevealed || false);
          setTimeLeft(TIMER_DURATION);
          setIsTimerRunning(false); // manual start
        }
      });
    }
  }, [sessionData?.activeQuestionId, sessionData?.isAnswerRevealed, isRemoteMode, game.categories]);

  useEffect(() => {
    if (!isRemoteMode || !sessionData?.hostCommand) return;
    const { type } = sessionData.hostCommand;
    if (type === "correct") handleCorrect();
    else if (type === "wrong") handleWrong();
    else if (type === "show_answer" || type === "REVEAL_ANSWER") setShowAnswer(true);
  }, [sessionData?.hostCommand, isRemoteMode]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTimerRunning || !active) return;
    if (timeLeft === 0) {
      setIsTimerRunning(false);
      handleWrong(true);
      return;
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, isTimerRunning, active]);

  useEffect(() => {
    const count = game.cluesPerTeam ?? 2;
    setClueUsage([{ remaining: count, usedTypes: [] }, { remaining: count, usedTypes: [] }]);
  }, [game.id, game.cluesPerTeam]);

  useEffect(() => {
    if (active?.question.questionMediaUrl) {
      console.log("Original media URL:", active.question.questionMediaUrl);
      console.log("Resolved media URL:", resolveMediaUrl(active.question.questionMediaUrl));
    }
  }, [active]);

  const allPoints = useMemo(() => {
    const pts = new Set<number>();
    game.categories.forEach(cat => cat.questions.forEach(q => pts.add(q.points)));
    return Array.from(pts).sort((a, b) => a - b);
  }, [game.categories]);

  const markUsed = (id: string) => {
    const next = new Set(usedIds).add(id);
    setUsedIds(next);
    if (isRemoteMode) updateSession({ usedQuestionIds: Array.from(next) });
  };

  const clearQuestionState = () => {
    setActive(null);
    setShowAnswer(false);
    setCardView("score");
    setIsTimerRunning(false);
    setHasReboundAttempted(false);
    setActiveClue(null);
    setShowClueMenu(false);
    if (isRemoteMode) updateSession({ activeQuestionId: null, activeCategoryId: null, isAnswerRevealed: false });
  };

  const showFeedback = (type: "correct" | "wrong", options?: { closeAfter?: boolean; durationMs?: number }) => {
    const { closeAfter = true, durationMs = 2500 } = options || {};
    setFeedback(type);
    if (type === "correct") correctSound.play(); else wrongSound.play();
    setTimeout(() => {
      setFeedback(null);
      if (closeAfter) clearQuestionState();
    }, durationMs);
  };

  const advanceTurnAfterResolution = (result: "correct" | "wrong", basis: 0 | 1) => {
    const shouldSwitch = result === "wrong" || game.turnMode === JeopardyTurnMode.ALTERNATE_AFTER_QUESTION;
    const nextTeam = shouldSwitch ? otherTeam(basis) : basis;
    setCurrentTeamIndex(nextTeam);
    setHasReboundAttempted(false);
    setActiveClue(null);
    setShowClueMenu(false);
  };

  const handleCorrect = () => {
    if (!active) return;
    const pts = active.question.points || 0;
    const answeringTeam = currentTeamIndex;
    const turnBasis = activeClue?.type === "ASK_OTHER_TEAM" ? activeClue.usedBy : answeringTeam;
    const newScores = [...teamScores] as [number, number];

    if (activeClue?.type === "ASK_OTHER_TEAM" && activeClue.targetTeam !== undefined) {
      const half = Math.ceil(pts / 2);
      newScores[activeClue.usedBy] += half;
      newScores[activeClue.targetTeam] += pts - half;
      setTeamScores(newScores);
      markUsed(active.question.id);
      setIsTimerRunning(false);
      showFeedback("correct");
      advanceTurnAfterResolution("correct", turnBasis);
      return;
    }

    newScores[answeringTeam] += pts;
    setTeamScores(newScores);
    if (isRemoteMode && sessionData?.teamScores) {
      const teams = Object.keys(sessionData.teamScores).sort();
      updateSession({ teamScores: { ...sessionData.teamScores, [teams[answeringTeam]]: newScores[answeringTeam] } });
    }
    markUsed(active.question.id);
    setIsTimerRunning(false);
    showFeedback("correct");
    advanceTurnAfterResolution("correct", turnBasis);
  };

  const handleWrong = (_isTimeout = false) => {
    if (!active) return;
    const reboundsAllowed = (game.allowRebounds ?? true) && activeClue?.type !== "ASK_OTHER_TEAM";

    if (reboundsAllowed && !hasReboundAttempted) {
      setHasReboundAttempted(true);
      const nextTeam = otherTeam(currentTeamIndex);
      setCurrentTeamIndex(nextTeam);
      setIsTimerRunning(false);
      setTimeLeft(TIMER_DURATION);
      setIsTimerRunning(true);
      showFeedback("wrong", { closeAfter: false, durationMs: 1200 });
      if (isRemoteMode) updateSession({ currentTeamIndex: nextTeam, hasReboundAttempted: true });
      return;
    }

    markUsed(active.question.id);
    setIsTimerRunning(false);
    showFeedback("wrong");
    const turnBasis = activeClue?.type === "ASK_OTHER_TEAM" ? activeClue.usedBy : currentTeamIndex;
    advanceTurnAfterResolution("wrong", turnBasis);
    if (isRemoteMode) updateSession({ activeQuestionId: null, hasReboundAttempted: false, currentTeamIndex: (turnBasis === 0 ? 1 : 0) });
  };

  const teamLabel = (index: 0 | 1) => game.teams?.[index] || `Team ${index + 1}`;
  const explanationPlacement = active?.question.explanationPlacement || "WITH_ANSWER";

  const getHostCue = () => {
    if (!active) return "Give them a hint without revealing the answer.";
    if (active.question.explanation?.trim()) return active.question.explanation;
    const answer = active.question.correctAnswer?.trim();
    if (answer) return `Starts with "${answer[0]}" and has ${answer.length} letters.`;
    return "Give them a hint without revealing the answer.";
  };

  const useClue = (type: ClueType) => {
    if (!active) return;
    const teamIdx = currentTeamIndex;
    const usage = clueUsage[teamIdx];
    if (usage.remaining <= 0 || usage.usedTypes.includes(type)) return;

    const updatedTeam: TeamClueUsage = { remaining: Math.max(0, usage.remaining - 1), usedTypes: [...usage.usedTypes, type] };
    setClueUsage(prev => [teamIdx === 0 ? updatedTeam : prev[0], teamIdx === 1 ? updatedTeam : prev[1]] as [TeamClueUsage, TeamClueUsage]);

    if (type === "ASK_OTHER_TEAM") {
      const helperTeam = otherTeam(teamIdx);
      setActiveClue({ type, usedBy: teamIdx, targetTeam: helperTeam });
      setCurrentTeamIndex(helperTeam);
      setHasReboundAttempted(false);
      setIsTimerRunning(false);
      setShowClueMenu(false);
      return;
    }
    if (type === "CALL_FRIEND") {
      setTimeLeft(prev => prev + 10);
      setActiveClue({ type, usedBy: teamIdx, note: "Extra thinking time while you phone a friend." });
    } else if (type === "ASK_HOST") {
      setActiveClue({ type, usedBy: teamIdx, note: getHostCue() });
    }
    setIsTimerRunning(false);
    setShowClueMenu(false);
  };

  const openQuestion = (category: JeopardyCategory, question: JeopardyQuestion) => {
    setActive({ category, question });
    setShowAnswer(false);
    setCardView("score");
    setHasReboundAttempted(false);
    setActiveClue(null);
    setShowClueMenu(false);
    setTimeLeft(TIMER_DURATION);
    setIsTimerRunning(false); // ← host starts manually
  };

  // Debug media URL
  useEffect(() => {
    if (active?.question.questionMediaUrl) {
      const resolved = resolveMediaUrl(active.question.questionMediaUrl);
      console.log("[JeopardyGame] question media", { raw: active.question.questionMediaUrl, resolved, type: active.question.questionMediaType });
    }
  }, [active?.question.questionMediaUrl, active?.question.questionMediaType]);

  // Keyboard shortcuts (host only)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!active || isViewer) return;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); handleCorrect(); }
      if (e.key === "w" || e.key === "W") { e.preventDefault(); handleWrong(); }
      if (e.key === " ") { e.preventDefault(); setIsTimerRunning(v => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, currentTeamIndex, isViewer]);

  // ── TV RENDER: board always visible, overlay on top ───────────────────────
  if (isViewer) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-blue-950 to-slate-900 text-white relative overflow-hidden">
        <main className="flex-1 flex flex-col p-4 relative h-full">
          {game.categories.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-300">No categories configured.</div>
          ) : (
            <div
              className="flex-1 grid gap-2 h-full"
              style={{
                gridTemplateColumns: `repeat(${game.categories.length}, minmax(0, 1fr))`,
                gridTemplateRows: `auto repeat(${allPoints.length}, 1fr)`
              }}
            >
              {game.categories.map(cat => (
                <div key={cat.id} className="bg-slate-800 text-yellow-300 p-3 h-full flex items-center justify-center text-center font-black uppercase tracking-widest border-b-2 border-yellow-500 text-lg md:text-xl lg:text-2xl">
                  <span className="px-1">{cat.name || "Category"}</span>
                </div>
              ))}
              {allPoints.map(points =>
                game.categories.map(cat => {
                  const q = cat.questions.find(qq => qq.points === points);
                  if (!q) return <div key={`${cat.id}-${points}`} className="h-full bg-slate-900/40 border border-slate-700/40" />;
                  const isUsed = usedIds.has(q.id);
                  return (
                    <div
                      key={`${cat.id}-${points}`}
                      className={`h-full flex items-center justify-center font-extrabold text-4xl border shadow-md ${
                        isUsed ? "bg-blue-800 p-1" : "bg-blue-700 text-yellow-300 border-blue-400"
                      }`}
                    >
                      {isUsed ? (
                        <img src={CARD_BACK_IMG} alt="Used" className="h-full w-full object-contain opacity-40" />
                      ) : points}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Score/question/answer overlay centered on board */}
          <TVScoreOverlay
            active={active}
            cardView={cardView}
            currentTeamIndex={currentTeamIndex}
            teamScores={teamScores}
            teamLabels={[teamLabel(0), teamLabel(1)]}
            timeLeft={timeLeft}
          />
        </main>
        {feedback && <FeedbackOverlay type={feedback} />}
      </div>
    );
  }

  // ── HOST RENDER ───────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-blue-950 to-slate-900 text-white relative">
      {/* Top bar with game name and scores — identical to original */}
      <header className="flex items-center justify-between p-4 border-b border-slate-700">
        <div>
          <h1 className="text-3xl font-bold tracking-wide">Jeopardy</h1>
          <p className="text-sm text-slate-300">{game.name || "Custom board"} · {game.categories.length} categories</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-sm">
            {([0, 1] as const).map(index => (
              <div
                key={index}
                className={`px-3 py-1 rounded-lg border transition-all ${
                  currentTeamIndex === index
                    ? "bg-yellow-400 text-black border-yellow-300 scale-110"
                    : "bg-slate-800 text-slate-200 border-slate-600"
                }`}
              >
                <div className="flex items-baseline gap-1">
                  <span className="font-bold">{teamLabel(index)}</span>
                  <span>{teamScores[index]}</span>
                </div>
                <div className="text-[11px] text-yellow-200">Clues left: {clueUsage[index]?.remaining ?? 0}</div>
              </div>
            ))}
          </div>
          <button onClick={onExit} className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg">
            Exit Game
          </button>
        </div>
      </header>

      {/* Board — identical to original, but TADTSlogo.jpg as card back, no $ */}
      <main className="flex-1 flex flex-col p-4 overflow-hidden">
        {game.categories.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-300">No categories configured for this game.</div>
        ) : (
          <div
            className="flex-1 grid gap-2 h-full"
            style={{
              gridTemplateColumns: `repeat(${game.categories.length}, minmax(180px, 1fr))`,
              gridTemplateRows: `auto repeat(${allPoints.length}, 1fr)`
            }}
          >
            {game.categories.map(cat => (
              <div key={cat.id} className="bg-slate-800 text-yellow-300 p-3 rounded-t-lg h-full flex items-center justify-center text-center font-black uppercase tracking-widest border-b-2 border-yellow-500 text-md md:text-lg lg:text-xl">
                <span className="px-2">{cat.name || "Category"}</span>
              </div>
            ))}
            {allPoints.map(points =>
              game.categories.map(cat => {
                const q = cat.questions.find(qq => qq.points === points);
                if (!q) return <div key={`${cat.id}-${points}`} className="h-full rounded-b-lg bg-slate-900/40 border border-slate-700/40" />;
                const isUsed = usedIds.has(q.id);
                return (
                  <button
                    key={`${cat.id}-${points}`}
                    disabled={isUsed}
                    onClick={() => openQuestion(cat, q)}
                    className={`h-full flex items-center justify-center font-extrabold text-4xl rounded-b-lg border shadow-md transition-all ${
                      isUsed
                        ? "bg-white p-1 cursor-not-allowed"
                        : "bg-blue-700 hover:bg-blue-500 text-yellow-300 border-blue-400 hover:scale-[1.02]"
                    }`}
                    title={isUsed ? "Question answered" : `${cat.name} · ${points}`}
                  >
                    {isUsed ? (
                      <img src={CARD_BACK_IMG} alt="Question answered" className="h-full w-full object-contain" />
                    ) : (
                      points  // ← no $ sign
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Active question modal */}
      {active && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8">
          <div className="bg-slate-900 border border-yellow-400 rounded-2xl p-8 w-full h-full flex flex-col gap-6 shadow-2xl overflow-hidden">

            {/* Header: category + timer + Start Timer button + Close */}
            <header className="flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-3xl font-bold text-yellow-300 uppercase">{active.category.name}</h2>
                <p className="text-xl text-slate-300">{active.question.points} pts</p>
              </div>
              <div className="flex items-center gap-4">
                <TimerCircle timeLeft={timeLeft} duration={TIMER_DURATION} />
                {/* ★ NEW: Manual timer start/pause */}
                <button
                  onClick={() => setIsTimerRunning(v => !v)}
                  className={`px-5 py-2.5 rounded-xl font-black text-lg transition-all shadow-md uppercase ${
                    isTimerRunning
                      ? "bg-orange-600 hover:bg-orange-500 border border-orange-400 text-white"
                      : !activeClue && canFlashTimerButton
                        ? "bg-green-600 hover:bg-green-500 ring-4 ring-green-400 animate-pulse text-white"
                        : "bg-red-600 hover:bg-red-500 border-2 border-red-400 text-white scale-105 shadow-2xl"
                  }`}
                >
                  {isTimerRunning ? "⏸ Pause" : "▶ Start Timer"}
                </button>
                <button onClick={clearQuestionState} className="text-lg px-4 py-2 rounded bg-slate-700 hover:bg-slate-600">Close</button>
              </div>
            </header>


            {/* Question content */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {!active.question.question?.trim() && !active.question.questionMediaUrl ? (
                <div className="w-full h-full flex items-center justify-center bg-white rounded-lg">
                  <img src={CARD_BACK_IMG} alt="Logo" className="max-w-xs" />
                </div>
              ) : active.question.questionMediaUrl && active.question.questionMediaType ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full h-full min-h-0">
                  {/* Left Column: Media (7 cols) */}
                  <div className="lg:col-span-7 bg-slate-800 rounded-xl p-4 flex justify-center items-center h-full min-h-[300px] overflow-hidden">
                    {active.question.questionMediaType === "IMAGE" && (
                      <img src={resolveMediaUrl(active.question.questionMediaUrl)} alt="Question media" className="max-w-full max-h-full rounded shadow-lg object-contain" />
                    )}
                    {active.question.questionMediaType === "AUDIO" && (
                      <audio controls autoPlay src={resolveMediaUrl(active.question.questionMediaUrl)} className="w-full max-w-lg" />
                    )}
                    {active.question.questionMediaType === "VIDEO" && (
                      <video controls autoPlay src={resolveMediaUrl(active.question.questionMediaUrl)} className="max-w-full max-h-full rounded shadow-lg object-contain" />
                    )}
                  </div>

                  {/* Right Column: Question + Correct Answer + Clues (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto h-full pr-1">
                    <div className="bg-slate-800 rounded-xl p-6 flex-1 flex items-center justify-center text-center min-h-[150px]">
                      <p className="text-3xl leading-relaxed font-semibold">{active.question.question || "No clue provided."}</p>
                    </div>

                    {/* Correct answer bar */}
                    <div className="bg-emerald-900/80 border-2 border-emerald-400 rounded-xl px-5 py-3 flex flex-col gap-2 w-full shrink-0">
                      <div>
                        <span className="text-emerald-300 text-xs font-black uppercase tracking-widest block mb-1">✓ Correct Answer</span>
                        <span className="text-xl font-black text-white">{active.question.correctAnswer || "—"}</span>
                      </div>
                      {active.question.explanation?.trim() && (
                        <p className="text-xs text-emerald-200 italic leading-relaxed pt-2 border-t border-emerald-800">{active.question.explanation}</p>
                      )}
                    </div>

                    {hasReboundAttempted && (game.allowRebounds ?? true) && !activeClue && (
                      <div className="bg-amber-900/40 rounded-xl p-3 border border-amber-500/60 text-center shrink-0">
                        <p className="text-amber-100 font-semibold text-sm">Rebound! {teamLabel(currentTeamIndex)} gets a chance to answer.</p>
                      </div>
                    )}

                    {activeClue && (
                      <div className="bg-blue-900/40 rounded-xl p-4 border border-blue-500/60 text-center space-y-1 shrink-0">
                        <p className="text-blue-100 font-semibold text-sm">
                          {activeClue.type === "CALL_FRIEND" && `${teamLabel(activeClue.usedBy)} is calling a friend for help.`}
                          {activeClue.type === "ASK_HOST" && `${teamLabel(activeClue.usedBy)} asked the host for a cue.`}
                          {activeClue.type === "ASK_OTHER_TEAM" && `${teamLabel(activeClue.usedBy)} asked ${teamLabel(activeClue.targetTeam ?? otherTeam(activeClue.usedBy))} to answer and split the points.`}
                        </p>
                        {activeClue.note && <p className="text-xs text-blue-200">{activeClue.note}</p>}
                      </div>
                    )}

                    {showAnswer && (
                      <div className="bg-emerald-900/60 rounded-xl p-4 border border-emerald-500 text-center shrink-0">
                        <p className="text-xs text-emerald-300 font-semibold mb-1">Correct Response:</p>
                        <p className="text-xl font-bold">{active.question.correctAnswer || "No answer configured."}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* No media layout: vertical flex stack */
                <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center space-y-6 w-full max-w-4xl mx-auto">
                  <div className="bg-slate-800 rounded-xl p-10 w-full text-center">
                    <p className="text-4xl leading-relaxed font-semibold">{active.question.question || "No clue provided."}</p>
                  </div>

                  {/* Correct answer bar */}
                  <div className="bg-emerald-900/80 border-2 border-emerald-400 rounded-xl px-8 py-5 flex items-start gap-6 w-full shrink-0">
                    <div className="flex-1">
                      <span className="text-emerald-300 text-xs font-black uppercase tracking-widest block mb-1">✓ Correct Answer</span>
                      <span className="text-3xl font-black text-white">{active.question.correctAnswer || "—"}</span>
                    </div>
                    {active.question.explanation?.trim() && (
                      <p className="text-sm text-emerald-200 italic max-w-md text-right leading-relaxed">{active.question.explanation}</p>
                    )}
                  </div>

                  {hasReboundAttempted && (game.allowRebounds ?? true) && !activeClue && (
                    <div className="bg-amber-900/40 rounded-xl p-3 border border-amber-500/60 w-full text-center">
                      <p className="text-amber-100 font-semibold">Rebound! {teamLabel(currentTeamIndex)} gets a chance to answer.</p>
                    </div>
                  )}

                  {activeClue && (
                    <div className="bg-blue-900/40 rounded-xl p-4 border border-blue-500/60 w-full text-center space-y-1">
                      <p className="text-blue-100 font-semibold">
                        {activeClue.type === "CALL_FRIEND" && `${teamLabel(activeClue.usedBy)} is calling a friend for help.`}
                        {activeClue.type === "ASK_HOST" && `${teamLabel(activeClue.usedBy)} asked the host for a cue.`}
                        {activeClue.type === "ASK_OTHER_TEAM" && `${teamLabel(activeClue.usedBy)} asked ${teamLabel(activeClue.targetTeam ?? otherTeam(activeClue.usedBy))} to answer and split the points.`}
                      </p>
                      {activeClue.note && <p className="text-sm text-blue-200">{activeClue.note}</p>}
                    </div>
                  )}

                  {showAnswer && (
                    <div className="bg-emerald-900/60 rounded-xl p-6 border border-emerald-500 w-full text-center">
                      <p className="text-lg text-emerald-300 font-semibold mb-2">Correct Response:</p>
                      <p className="text-3xl font-bold">{active.question.correctAnswer || "No answer configured."}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer (identical to original + Space hotkey mention) */}
            <footer className="relative flex flex-col gap-3 pt-4 shrink-0">
              <div className="flex flex-wrap justify-end items-center gap-3">
                <div className="flex flex-col mr-auto gap-2">
                  <span className="text-sm text-slate-400">Hotkeys: R = Correct, W = Wrong, Space = Start/Pause timer</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-200">{teamLabel(currentTeamIndex)} clues left: {clueUsage[currentTeamIndex]?.remaining ?? 0}</span>
                    <button
                      onClick={() => setShowClueMenu(v => !v)}
                      disabled={(clueUsage[currentTeamIndex]?.remaining ?? 0) <= 0}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Use clue
                    </button>
                  </div>
                </div>
                {!showAnswer && (
                  <button
                    onClick={() => { setShowAnswer(true); setCardView("answer"); }}
                    className="px-6 py-3 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-300 text-lg"
                  >
                    Show Answer
                  </button>
                )}
                <button onClick={() => handleWrong()} className="px-6 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 text-lg">
                  Wrong (W)
                </button>
                <button onClick={handleCorrect} className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 text-lg">
                  Correct (R)
                </button>
              </div>

              {showClueMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-3 w-full bg-slate-800 border border-blue-500/40 rounded-lg p-4 space-y-2 shadow-2xl z-10">
                  <p className="text-xs text-blue-200 uppercase tracking-wide font-semibold">Choose a clue</p>
                  <div className="grid md:grid-cols-3 gap-2">
                    {[
                      { type: "CALL_FRIEND" as ClueType, label: "Call a friend", desc: "Add a bit of extra time while you phone a friend." },
                      { type: "ASK_HOST" as ClueType, label: "Ask the host for a cue", desc: "Reveal a quick hint from the host." },
                      { type: "ASK_OTHER_TEAM" as ClueType, label: "Ask the other team & split points", desc: "The other team answers; points are shared if correct." },
                    ].map(({ type, label, desc }) => {
                      const used = clueUsage[currentTeamIndex]?.usedTypes.includes(type);
                      const disabled = used || (clueUsage[currentTeamIndex]?.remaining ?? 0) <= 0;
                      return (
                        <button
                          key={type}
                          onClick={() => useClue(type)}
                          disabled={disabled}
                          className={`text-left bg-slate-700 rounded-lg p-3 border ${disabled ? "border-slate-600 opacity-50 cursor-not-allowed" : "border-blue-500 hover:bg-slate-600"}`}
                        >
                          <div className="font-semibold text-white">{label}</div>
                          <p className="text-xs text-slate-200">{desc}</p>
                          {used && <span className="text-[11px] text-red-200">Used</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </footer>
          </div>
        </div>
      )}

      {feedback && <FeedbackOverlay type={feedback} />}
    </div>
  );
};

export default JeopardyGameScreen;
