import React, { useEffect, useMemo, useState, useRef } from "react";
import { JeopardyGame, JeopardyCategory, JeopardyQuestion, JeopardyTurnMode } from "@/types";
import { useSync } from "@/context/SyncContext";
import { correctSound, wrongSound, timerSound } from "@/utils/sound";
import { resolveMediaUrl } from "@/utils/media";

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



const otherTeam = (team: 0 | 1) => (team === 0 ? 1 : 0) as 0 | 1;

const hasVisualMedia = (url?: string, type?: string) => {
  return !!url && (type === "IMAGE" || type === "VIDEO");
};

// ── TV score overlay (cards shown center of board) ────────────────────────────
const TVScoreOverlay: React.FC<{
  active: { category: JeopardyCategory; question: JeopardyQuestion } | null;
  cardView: CardView;
  currentTeamIndex: 0 | 1;
  teamScores: [number, number];
  teamLabels: [string, string];
  timeLeft: number;
  activeClue: ActiveClueState | null;
  hasReboundAttempted: boolean;
}> = ({ active, cardView, currentTeamIndex, teamScores, teamLabels, timeLeft, activeClue, hasReboundAttempted }) => {
  if (!active) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/90 backdrop-blur-md pointer-events-none">
      <div className="flex flex-col items-center gap-4 w-full max-w-[95vw] p-6 h-full max-h-[92vh] justify-center pointer-events-auto relative overflow-hidden">
        {/* Absolute Timer in Top Right */}
        {cardView === "question" && (
          <div className="absolute top-6 right-8 flex items-center gap-4 z-30 bg-blue-950/95 border-2 border-blue-500/40 px-6 py-3.5 rounded-2xl shadow-2xl shrink-0">
            {activeClue && (
              <div className="flex items-center gap-2 bg-blue-500/25 border border-blue-400/40 px-4 py-2 rounded-xl text-blue-200 text-xs font-black uppercase tracking-wider animate-pulse mr-2 shrink-0">
                <span className="text-base">💡</span>
                <span>
                  {activeClue.type === "CALL_FRIEND" && "Call Friend"}
                  {activeClue.type === "ASK_HOST" && "Ask Host"}
                  {activeClue.type === "ASK_OTHER_TEAM" && "Ask Team"}
                </span>
              </div>
            )}
            <div className="flex flex-col items-center">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">Time</span>
              <span className={`text-6xl font-black tabular-nums transition-colors ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-yellow-300"}`}>
                {timeLeft}
              </span>
            </div>
            {/* Tiny progress bar */}
            <div className="w-24 h-2.5 bg-blue-900 rounded-full overflow-hidden border border-blue-700/60 shrink-0">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? "bg-red-500" : "bg-yellow-400"}`}
                style={{ width: `${(timeLeft / TIMER_DURATION) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Category + points */}
        <div className="text-center shrink-0">
          <p className="text-5xl font-black uppercase text-yellow-300 drop-shadow-lg tracking-wide">{active.category.name}</p>
          <p className="text-3xl font-bold text-yellow-200 mt-1">{active.question.points} pts</p>
        </div>

        {/* Team Scores Bar */}
        {cardView !== "question" && (
          <div className="flex gap-6 shrink-0 mb-4">
            {([0, 1] as const).map(i => (
              <div
                key={i}
                className={`transition-all flex items-center gap-4 ${
                  cardView === "answer"
                    ? "px-8 py-3.5 rounded-3xl border-4 scale-105"
                    : "px-6 py-2.5 rounded-2xl border-2"
                } ${
                  currentTeamIndex === i
                    ? "border-yellow-400 bg-yellow-400/20 shadow-lg"
                    : "border-blue-500/40 bg-blue-900/40"
                }`}
              >
                <span className={`${cardView === "answer" ? "text-2xl" : "text-lg"} font-extrabold text-slate-200`}>{teamLabels[i]}</span>
                <span className={`${cardView === "answer" ? "text-5xl" : "text-4xl"} font-black text-yellow-300`}>{teamScores[i]}</span>
              </div>
            ))}
          </div>
        )}

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
          <div className="flex-1 w-full flex flex-col min-h-0 justify-center">
            {active.question.questionMediaUrl && active.question.questionMediaType ? (
              <div className="grid grid-cols-12 gap-8 w-full items-center min-h-0 flex-1">
                {/* Left Column: Media (7 cols) */}
                <div className="col-span-7 bg-blue-950/40 border border-blue-500/30 rounded-2xl p-4 flex justify-center items-center h-full max-h-[52vh] overflow-hidden">
                  {active.question.questionMediaType === "IMAGE" && (
                    <img src={resolveMediaUrl(active.question.questionMediaUrl)} alt="Question" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
                  )}
                  {active.question.questionMediaType === "AUDIO" && (
                    <div className="w-full flex flex-col items-center justify-center p-8 bg-blue-900/40 rounded-xl">
                      <span className="text-7xl mb-4">🎵</span>
                      <audio controls autoPlay src={resolveMediaUrl(active.question.questionMediaUrl)} className="w-full max-w-md" />
                    </div>
                  )}
                  {active.question.questionMediaType === "VIDEO" && (
                    <video controls autoPlay src={resolveMediaUrl(active.question.questionMediaUrl)} className="max-w-full max-h-full rounded-xl object-contain" />
                  )}
                </div>

                {/* Right Column: Question Text, Clues (5 cols) */}
                <div className="col-span-5 flex flex-col gap-4 items-center text-center justify-center h-full max-h-[52vh] overflow-hidden">
                  <div className="bg-blue-900/85 backdrop-blur rounded-2xl px-6 py-5 border border-blue-400/40 shadow-2xl w-full">
                    <p className="text-3xl md:text-4xl lg:text-5xl font-black leading-relaxed text-white">{active.question.question || "?"}</p>
                  </div>

                  {activeClue && (
                    <div className="bg-blue-900/50 rounded-xl p-3 border border-blue-500/40 w-full text-center space-y-1 animate-fade-in shrink-0">
                      <p className="text-blue-100 font-bold text-lg">
                        {activeClue.type === "CALL_FRIEND" && `${teamLabels[activeClue.usedBy]} is calling a friend.`}
                        {activeClue.type === "ASK_HOST" && `${teamLabels[activeClue.usedBy]} asked the host.`}
                        {activeClue.type === "ASK_OTHER_TEAM" && `${teamLabels[activeClue.usedBy]} asked ${teamLabels[activeClue.targetTeam ?? otherTeam(activeClue.usedBy)]} to answer.`}
                      </p>
                    </div>
                  )}

                  {hasReboundAttempted && !activeClue && (
                    <div className="bg-amber-900/50 rounded-xl p-3 border border-amber-500/40 w-full text-center animate-fade-in shrink-0">
                      <p className="text-amber-100 font-bold text-lg">Rebound! {teamLabels[currentTeamIndex]} gets a chance to answer.</p>
                    </div>
                  )}

                  {!activeClue && !hasReboundAttempted && (
                    <div className="bg-blue-900/40 rounded-full px-5 py-1.5 border border-blue-500/30 text-yellow-300 font-bold text-lg animate-pulse shrink-0">
                      Turn: {teamLabels[currentTeamIndex]}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* No media layouts */
              <div className="max-w-5xl text-center space-y-6 flex flex-col items-center justify-center flex-1 mx-auto w-full overflow-hidden">
                <div className="bg-blue-900/85 backdrop-blur rounded-2xl px-12 py-8 border border-blue-400/40 shadow-2xl w-full">
                  <p className="text-4xl md:text-5xl lg:text-6xl font-black leading-relaxed text-white">{active.question.question || "?"}</p>
                </div>

                {activeClue && (
                  <div className="bg-blue-900/50 rounded-xl p-4 border border-blue-500/40 w-full text-center space-y-1 animate-fade-in shrink-0">
                    <p className="text-blue-100 font-bold text-xl">
                      {activeClue.type === "CALL_FRIEND" && `${teamLabels[activeClue.usedBy]} is calling a friend.`}
                      {activeClue.type === "ASK_HOST" && `${teamLabels[activeClue.usedBy]} asked the host.`}
                      {activeClue.type === "ASK_OTHER_TEAM" && `${teamLabels[activeClue.usedBy]} asked ${teamLabels[activeClue.targetTeam ?? otherTeam(activeClue.usedBy)]} to answer.`}
                    </p>
                  </div>
                )}

                {hasReboundAttempted && !activeClue && (
                  <div className="bg-amber-900/50 rounded-xl p-3 border border-amber-500/40 w-full text-center animate-fade-in shrink-0">
                    <p className="text-amber-100 font-bold text-xl">Rebound! {teamLabels[currentTeamIndex]} gets a chance to answer.</p>
                  </div>
                )}

                {!activeClue && !hasReboundAttempted && (
                  <div className="bg-blue-900/40 rounded-full px-6 py-2 border border-blue-500/30 text-yellow-300 font-bold text-xl animate-pulse shrink-0">
                    Turn: {teamLabels[currentTeamIndex]}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Answer view */}
        {cardView === "answer" && (
          <div className="max-w-[95vw] w-full text-center flex flex-col min-h-0 justify-center">
            {hasVisualMedia(active.question.answerMediaUrl, active.question.answerMediaType) || hasVisualMedia(active.question.questionMediaUrl, active.question.questionMediaType) ? (
              <div className="grid grid-cols-12 gap-8 w-full items-center min-h-0 flex-1">
                {/* Left Column: Answer/Question Media (7 cols) */}
                <div className="col-span-7 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex justify-center items-center h-full max-h-[52vh] overflow-hidden">
                  {hasVisualMedia(active.question.answerMediaUrl, active.question.answerMediaType) ? (
                    <>
                      {active.question.answerMediaType === "IMAGE" && (
                        <img src={resolveMediaUrl(active.question.answerMediaUrl)} alt="Answer media" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
                      )}
                      {active.question.answerMediaType === "VIDEO" && (
                        <video controls src={resolveMediaUrl(active.question.answerMediaUrl)} className="max-w-full max-h-full rounded-xl object-contain" />
                      )}
                    </>
                  ) : (
                    <>
                      {active.question.questionMediaType === "IMAGE" && (
                        <img src={resolveMediaUrl(active.question.questionMediaUrl)} alt="Question media" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
                      )}
                      {active.question.questionMediaType === "VIDEO" && (
                        <video controls src={resolveMediaUrl(active.question.questionMediaUrl)} className="max-w-full max-h-full rounded-xl object-contain" />
                      )}
                    </>
                  )}
                </div>

                {/* Right Column: Correct Answer details (5 cols) */}
                <div className="col-span-5 flex flex-col gap-6 items-center text-center justify-center h-full max-h-[52vh] overflow-hidden">
                  <div className="bg-emerald-900/85 backdrop-blur rounded-2xl px-6 py-8 border-2 border-emerald-400 shadow-2xl w-full">
                    <p className="text-lg text-emerald-300 font-bold mb-3 uppercase tracking-widest">Correct Answer</p>
                    <p className="text-5xl md:text-6xl font-black text-white">{active.question.correctAnswer || "—"}</p>
                    {active.question.explanation?.trim() && (
                      <p className="mt-4 text-xl md:text-2xl text-emerald-200 leading-relaxed border-t border-emerald-800 pt-3">{active.question.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* No media answer layout */
              <div className="bg-emerald-900/85 backdrop-blur rounded-2xl px-14 py-10 border-2 border-emerald-400 shadow-2xl max-w-5xl mx-auto w-full">
                <p className="text-xl text-emerald-300 font-bold mb-4 uppercase tracking-widest">Correct Answer</p>
                <p className="text-7xl md:text-8xl font-black text-white">{active.question.correctAnswer || "—"}</p>
                {active.question.explanation?.trim() && (
                  <p className="mt-6 text-2xl md:text-3xl text-emerald-200 leading-relaxed border-t border-emerald-800 pt-4">{active.question.explanation}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const FeedbackOverlay: React.FC<{ type: "correct" | "wrong" | null; correctAnswer?: string; points?: number }> = ({ type, correctAnswer, points }) => {
  if (!type) return null;
  const isCorrect = type === "correct";
  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/85 backdrop-blur-sm transition-all duration-300">
      <style>{`
        @keyframes floatUpDown {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          15% {
            opacity: 0.7;
            transform: translateY(0) scale(1.1);
          }
          30% {
            opacity: 0.7;
            transform: translateY(0) scale(1);
          }
          70% {
            opacity: 0.7;
            transform: translateY(-10px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-40px) scale(0.9);
          }
        }
        .animate-float-up-down {
          animation: floatUpDown 2s ease-in-out forwards;
        }
      `}</style>
      <div
        className={`px-16 py-10 rounded-3xl border-4 shadow-2xl flex flex-col items-center gap-4 text-center transform scale-105 transition-all max-w-[90vw] relative ${
          isCorrect
            ? "bg-emerald-950/95 border-emerald-400 text-emerald-300 shadow-emerald-900/50 animate-fade-in"
            : "bg-red-950/95 border-red-500 text-red-400 shadow-red-900/50 animate-fade-in"
        }`}
      >
        {points !== undefined && (
          <div
            className={`absolute -top-16 text-7xl md:text-8xl font-black tracking-widest select-none pointer-events-none opacity-0 animate-float-up-down ${
              isCorrect ? "text-emerald-400/50" : "text-red-400/50"
            }`}
          >
            {isCorrect ? `+${points}` : `-${points}`} PTS
          </div>
        )}
        <span className="text-8xl">{isCorrect ? "🏆" : "❌"}</span>
        <h2 className="text-5xl font-black uppercase tracking-wide mt-2 max-w-4xl leading-snug">
          {isCorrect ? "Correct!" : "YOU HAVE THE WRONG ANSWER"}
        </h2>
        {!isCorrect && correctAnswer && (
          <p className="text-3xl font-extrabold uppercase tracking-wide text-red-200 mt-2 max-w-4xl leading-relaxed">
            THE CORRECT ANSWER IS: <span className="text-white font-black underline decoration-red-500 decoration-4 block mt-2 text-4xl">{correctAnswer}</span>
          </p>
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
  const latestRef = useRef({ active, showAnswer, cardView, usedIds, currentTeamIndex, teamScores, timeLeft, isTimerRunning, activeClue, hasReboundAttempted, feedback });
  useEffect(() => {
    latestRef.current = { active, showAnswer, cardView, usedIds, currentTeamIndex, teamScores, timeLeft, isTimerRunning, activeClue, hasReboundAttempted, feedback };
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
          activeClue: s.activeClue, hasReboundAttempted: s.hasReboundAttempted,
          feedback: s.feedback,
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
      activeClue, hasReboundAttempted,
      feedback,
    });
  }, [isViewer, active, showAnswer, cardView, usedIds, currentTeamIndex, teamScores, timeLeft, isTimerRunning, activeClue, hasReboundAttempted, feedback]);

  // ── TV: receive from PC ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isViewer) return;
    const bc = new BroadcastChannel(JEOPARDY_BC);
    bc.onmessage = (ev) => {
      const { type: t, active: a, showAnswer: sa, cardView: cv, usedIds: ui, currentTeamIndex: ct, teamScores: ts, timeLeft: tl, activeClue: ac, hasReboundAttempted: hr, feedback: fb } = ev.data;
      if (t === "STATE_UPDATE") {
        if (a !== undefined) setActive(a);
        if (sa !== undefined) setShowAnswer(sa);
        if (cv !== undefined) setCardView(cv);
        if (ui !== undefined) setUsedIds(new Set(ui));
        if (ct !== undefined) setCurrentTeamIndex(ct);
        if (ts !== undefined) setTeamScores(ts);
        if (tl !== undefined) setTimeLeft(tl);
        if (ac !== undefined) setActiveClue(ac);
        if (hr !== undefined) setHasReboundAttempted(hr);
        if (fb !== undefined) setFeedback(fb);
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

  // Start / stop timerSound
  useEffect(() => {
    if (isTimerRunning && active && timeLeft > 0) {
      timerSound.play();
    } else {
      timerSound.stop();
      timerSound.setPlaybackRate(1.0);
    }
    return () => {
      timerSound.stop();
      timerSound.setPlaybackRate(1.0);
    };
  }, [isTimerRunning, !!active]);

  // Adjust playback rate for extra tension in the last 5 seconds
  useEffect(() => {
    if (isTimerRunning && active) {
      if (timeLeft <= 5) {
        timerSound.setPlaybackRate(1.6);
      } else {
        timerSound.setPlaybackRate(1.0);
      }
    }
  }, [timeLeft, isTimerRunning, !!active]);

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

  const showFeedback = (
    type: "correct" | "wrong",
    options?: { closeAfter?: boolean; durationMs?: number; onComplete?: () => void }
  ) => {
    const { closeAfter = true, durationMs = 2000, onComplete } = options || {};
    setFeedback(type);
    if (type === "correct") correctSound.play(); else wrongSound.play();
    setTimeout(() => {
      setFeedback(null);
      if (onComplete) {
        onComplete();
      } else if (closeAfter) {
        clearQuestionState();
      }
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
    if (!active || showAnswer) return;
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

      const hasExplanation = !!active.question.explanation?.trim();
      showFeedback("correct", {
        closeAfter: !hasExplanation,
        durationMs: 2000,
        onComplete: hasExplanation
          ? () => {
              setCardView("answer");
              setShowAnswer(true);
              advanceTurnAfterResolution("correct", turnBasis);
            }
          : undefined,
      });
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

    const hasExplanation = !!active.question.explanation?.trim();
    showFeedback("correct", {
      closeAfter: !hasExplanation,
      durationMs: 2000,
      onComplete: hasExplanation
        ? () => {
            setCardView("answer");
            setShowAnswer(true);
            advanceTurnAfterResolution("correct", turnBasis);
          }
        : undefined,
    });
  };

  const handleWrong = (_isTimeout = false) => {
    if (!active || showAnswer) return;
    const reboundsAllowed = (game.allowRebounds ?? true) && activeClue?.type !== "ASK_OTHER_TEAM";
    const pts = active.question.points || 0;
    const failingTeam = currentTeamIndex;
    const newScores = [...teamScores] as [number, number];

    // Subtract points from the team that failed
    newScores[failingTeam] -= pts;
    setTeamScores(newScores);
    if (isRemoteMode && sessionData?.teamScores) {
      const teams = Object.keys(sessionData.teamScores).sort();
      updateSession({ teamScores: { ...sessionData.teamScores, [teams[failingTeam]]: newScores[failingTeam] } });
    }

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

    const turnBasis = activeClue?.type === "ASK_OTHER_TEAM" ? activeClue.usedBy : currentTeamIndex;
    showFeedback("wrong", {
      closeAfter: true,
      durationMs: 3000,
      onComplete: () => {
        advanceTurnAfterResolution("wrong", turnBasis);
        clearQuestionState();
        if (isRemoteMode) {
          updateSession({ activeQuestionId: null, hasReboundAttempted: false, currentTeamIndex: (turnBasis === 0 ? 1 : 0) });
        }
      },
    });
  };

  const teamLabel = (index: 0 | 1) => game.teams?.[index] || `Team ${index + 1}`;
  const explanationPlacement = active?.question.explanationPlacement || "WITH_ANSWER";

  const getHostCue = () => {
    if (!active) return "Give them a hint without revealing the answer.";
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
    setCardView("question");
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
        {/* Dynamic TV Header Bar displaying team scores and active turn highlight */}
        <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur border-b border-blue-900/50 shrink-0">
          <div>
            <h1 className="text-4xl font-extrabold tracking-widest uppercase bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">
              {game.name || "Jeopardy"}
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Viktoria Game Show</p>
          </div>
          
          <div className="flex items-center gap-6">
            {([0, 1] as const).map(index => {
              const isTurn = currentTeamIndex === index;
              return (
                <div
                  key={index}
                  className={`relative px-6 py-2 rounded-2xl border-2 transition-all duration-300 flex items-center gap-4 ${
                    isTurn
                      ? "bg-yellow-400/20 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)] scale-105"
                      : "bg-slate-800/40 border-slate-700 text-slate-300"
                  }`}
                >
                  {isTurn && (
                    <span className="absolute -top-2 -left-2 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-md">
                      Active Turn
                    </span>
                  )}
                  <span className={`text-sm font-black uppercase tracking-wider ${isTurn ? "text-yellow-300" : "text-slate-400"}`}>
                    {teamLabel(index)}
                  </span>
                  <span className={`text-4xl font-black tabular-nums ${isTurn ? "text-yellow-300" : "text-slate-100"}`}>
                    {teamScores[index]}
                  </span>
                </div>
              );
            })}
          </div>
        </header>

        <main className="flex-1 flex flex-col p-4 relative h-full min-h-0">
          {game.categories.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-300">No categories configured.</div>
          ) : (
            <div
              className="flex-1 grid gap-2 h-full border-[8px] border-blue-900/80 rounded-2xl p-1 bg-blue-950/20 shadow-2xl overflow-hidden"
              style={{
                gridTemplateColumns: `repeat(${game.categories.length}, minmax(0, 1fr))`,
                gridTemplateRows: `auto repeat(${allPoints.length}, minmax(0, 1fr))`
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
                      className={`h-full flex items-center justify-center font-extrabold text-4xl border shadow-md overflow-hidden relative ${
                        isUsed ? "bg-white p-1" : "bg-blue-700 text-yellow-300 border-blue-400"
                      }`}
                    >
                      {isUsed ? (
                        <img src={CARD_BACK_IMG} alt="Used" className="absolute inset-0 w-full h-full object-contain p-1" />
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
            activeClue={activeClue}
            hasReboundAttempted={hasReboundAttempted}
          />
          <FeedbackOverlay type={feedback} correctAnswer={active?.question.correctAnswer} points={active?.question.points} />
        </main>
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
            className="flex-1 grid gap-2 h-full border-[8px] border-blue-900/80 rounded-2xl p-1 bg-blue-950/20 shadow-2xl overflow-hidden"
            style={{
              gridTemplateColumns: `repeat(${game.categories.length}, minmax(180px, 1fr))`,
              gridTemplateRows: `auto repeat(${allPoints.length}, minmax(0, 1fr))`
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
                    className={`h-full flex items-center justify-center font-extrabold text-4xl rounded-b-lg border shadow-md transition-all overflow-hidden relative ${
                      isUsed
                        ? "bg-white p-1 cursor-not-allowed"
                        : "bg-blue-700 hover:bg-blue-500 text-yellow-300 border-blue-400 hover:scale-[1.02]"
                    }`}
                    title={isUsed ? "Question answered" : `${cat.name} · ${points}`}
                  >
                    {isUsed ? (
                      <img src={CARD_BACK_IMG} alt="Question answered" className="absolute inset-0 w-full h-full object-contain p-1" />
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
          <div className="bg-slate-900 border border-yellow-400 rounded-2xl p-8 w-full h-full flex flex-col gap-6 shadow-2xl overflow-hidden relative">

            {/* Header: category + timer + Start Timer button + Close */}
            <header className="flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-3xl font-bold text-yellow-300 uppercase">{active.category.name}</h2>
                <p className="text-xl text-slate-300">{active.question.points} pts</p>
              </div>
              <div className="flex items-center gap-4">
                {activeClue && (
                  <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-4 py-2 rounded-xl text-blue-300 text-sm font-black uppercase tracking-wider animate-pulse mr-2">
                    <span className="text-base">💡</span>
                    <span>
                      {activeClue.type === "CALL_FRIEND" && `Call Friend (${teamLabel(activeClue.usedBy)})`}
                      {activeClue.type === "ASK_HOST" && `Ask Host (${teamLabel(activeClue.usedBy)})`}
                      {activeClue.type === "ASK_OTHER_TEAM" && `Ask Team (${teamLabel(activeClue.usedBy)})`}
                    </span>
                  </div>
                )}
                <TimerCircle timeLeft={timeLeft} duration={TIMER_DURATION} />
                {/* ★ NEW: Manual timer start/pause */}
                <button
                  onClick={() => setIsTimerRunning(v => !v)}
                  className={`px-5 py-2.5 rounded-xl font-black text-lg transition-all shadow-md uppercase ${
                    isTimerRunning
                      ? "bg-orange-600 hover:bg-orange-500 border border-orange-400 text-white"
                      : !activeClue && canFlashTimerButton
                        ? "bg-red-600 hover:bg-red-500 border-2 border-red-400 text-white animate-grow-shrink shadow-2xl"
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
                  <div className="lg:col-span-7 bg-slate-800 rounded-xl p-4 flex justify-center items-center h-full max-h-[60vh] overflow-hidden">
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
                  <div className="lg:col-span-5 flex flex-col gap-4 justify-center items-center h-full max-h-[60vh] overflow-hidden w-full">
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

                    {/* Duplicate correct answer display removed since the Correct Answer bar is already shown above */}
                  </div>
                </div>
              ) : (
                /* No media layout: vertical flex stack */
                <div className="flex-1 overflow-hidden flex flex-col items-center justify-center space-y-6 w-full max-w-4xl mx-auto h-full max-h-[60vh]">
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

                  {/* Duplicate correct answer display removed since the Correct Answer bar is already shown above */}
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
                {showAnswer ? (
                  <button
                    onClick={clearQuestionState}
                    className="px-8 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 text-xl shadow-lg ring-4 ring-blue-400 animate-pulse"
                  >
                    Next (Return to Grid)
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { setShowAnswer(true); setCardView("answer"); }}
                      className="px-6 py-3 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-300 text-lg"
                    >
                      Show Answer
                    </button>
                    <button onClick={() => handleWrong()} className="px-6 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 text-lg">
                      Wrong (W)
                    </button>
                    <button onClick={handleCorrect} className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 text-lg">
                      Correct (R)
                    </button>
                  </>
                )}
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

    </div>
  );
};

export default JeopardyGameScreen;
