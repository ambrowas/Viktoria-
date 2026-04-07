import React, { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import { JeopardyGame, JeopardyCategory, JeopardyQuestion, JeopardyTurnMode } from "@/types";
import { useSync } from "@/context/SyncContext";
import { correctSound, wrongSound } from "@/utils/sound";
import { resolveMediaUrl } from "@/utils/media";
import fireworksAnimation from "@/assets/animations/fireworks.json";

const TIMER_DURATION = 30;

type ClueType = "CALL_FRIEND" | "ASK_HOST" | "ASK_OTHER_TEAM";

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
}

const TimerCircle: React.FC<{ timeLeft: number, duration: number }> = ({ timeLeft, duration }) => {
  const normalizedRadius = 40;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference - (timeLeft / duration) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100">
        <circle
          className="text-slate-700"
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          r={normalizedRadius}
          cx="50"
          cy="50"
        />
        <circle
          className="text-yellow-400 transition-all duration-1000 linear"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx="50"
          cy="50"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
        <span className="text-3xl font-bold">{timeLeft}</span>
      </div>
    </div>
  );
};

const FeedbackOverlay: React.FC<{ type: "correct" | "wrong" }> = ({ type }) => {
  const isCorrect = type === "correct";

  return (
    <div
      key={type}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
    >
      {isCorrect ? (
        <div className="w-full h-full">
          <Lottie animationData={fireworksAnimation} loop={false} />
        </div>
      ) : (
        <div
          className="flex items-center justify-center w-48 h-48 rounded-full bg-red-500/30 animate-shake"
        >
          <span className="text-9xl text-red-400">✖</span>
        </div>
      )}
    </div>
  );
};


const otherTeam = (team: 0 | 1) => (team === 0 ? 1 : 0) as 0 | 1;

const JeopardyGameScreen: React.FC<JeopardyGameProps> = ({ game, onExit }) => {
  const { sessionData, updateSession, isRemoteMode } = useSync();

  const [active, setActive] = useState<{
    category: JeopardyCategory;
    question: JeopardyQuestion;
  } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [currentTeamIndex, setCurrentTeamIndex] = useState<0 | 1>(0);
  const [teamScores, setTeamScores] = useState<[number, number]>([0, 0]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasReboundAttempted, setHasReboundAttempted] = useState(false);
  const [activeClue, setActiveClue] = useState<ActiveClueState | null>(null);
  const [showClueMenu, setShowClueMenu] = useState(false);
  const initialClueCount = game.cluesPerTeam ?? 2;
  const [clueUsage, setClueUsage] = useState<[TeamClueUsage, TeamClueUsage]>(() => [
    { remaining: initialClueCount, usedTypes: [] },
    { remaining: initialClueCount, usedTypes: [] },
  ]);

  // 📡 MISSION 05/06: SYNC STATE FROM FIRESTORE
  useEffect(() => {
    if (!isRemoteMode || !sessionData) return;

    // 1. Sync used IDs
    if (sessionData.usedQuestionIds) {
      setUsedIds(new Set(sessionData.usedQuestionIds));
    }

    // 2. Sync Scores
    if (sessionData.teamScores) {
      const teams = Object.keys(sessionData.teamScores).sort();
      const s1 = sessionData.teamScores[teams[0]] || 0;
      const s2 = sessionData.teamScores[teams[1]] || 0;
      setTeamScores([s1, s2]);
    }

    // 3. Sync Answer Reveal
    if (sessionData.isAnswerRevealed !== undefined) {
      setShowAnswer(sessionData.isAnswerRevealed);
    }
  }, [sessionData, isRemoteMode]);

  // 📡 MISSION 06: QUESTION AUTO-OPENER
  useEffect(() => {
    if (!isRemoteMode || !sessionData?.activeQuestionId) {
      if (!sessionData?.activeQuestionId && active) setActive(null);
      return;
    }

    const qId = sessionData.activeQuestionId;
    if (active?.question.id !== qId) {
      // Find the question in the local game object
      game.categories.forEach(cat => {
        const q = cat.questions.find(qq => qq.id === qId);
        if (q) {
          setActive({ category: cat, question: q as JeopardyQuestion });
          setShowAnswer(sessionData.isAnswerRevealed || false);
          setTimeLeft(TIMER_DURATION);
          setIsTimerRunning(true);
        }
      });
    }
  }, [sessionData?.activeQuestionId, sessionData?.isAnswerRevealed, isRemoteMode, game.categories]);

  // 📡 MISSION 05/06: LISTEN FOR REMOTE ACTIONS
  useEffect(() => {
    if (!isRemoteMode || !sessionData?.hostCommand) return;
    const { type } = sessionData.hostCommand;

    if (type === 'correct') {
      handleCorrect();
    } else if (type === 'wrong') {
      handleWrong();
    } else if (type === 'show_answer' || type === 'REVEAL_ANSWER') {
      setShowAnswer(true);
    }
  }, [sessionData?.hostCommand, isRemoteMode]);

  // Timer effect
  useEffect(() => {
    if (!isTimerRunning || !active) return;

    if (timeLeft === 0) {
      setIsTimerRunning(false);
      handleWrong(true); // Auto-wrong on timeout
      return;
    }

    const timerId = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [timeLeft, isTimerRunning, active]);

  useEffect(() => {
    const count = game.cluesPerTeam ?? 2;
    setClueUsage([
      { remaining: count, usedTypes: [] },
      { remaining: count, usedTypes: [] },
    ]);
  }, [game.id, game.cluesPerTeam]);


  useEffect(() => {
    if (active?.question.questionMediaUrl) {
      console.log("Original media URL:", active.question.questionMediaUrl);
      console.log("Resolved media URL:", resolveMediaUrl(active.question.questionMediaUrl));
    }
  }, [active]);

  const allPoints = useMemo(() => {
    const pts = new Set<number>();
    game.categories.forEach((cat) =>
      cat.questions.forEach((q) => pts.add(q.points))
    );
    return Array.from(pts).sort((a, b) => a - b);
  }, [game.categories]);

  const markUsed = (id: string) => {
    const next = new Set(usedIds).add(id);
    setUsedIds(next);
    if (isRemoteMode) {
      updateSession({ usedQuestionIds: Array.from(next) });
    }
  };

  const clearQuestionState = () => {
    setActive(null);
    setShowAnswer(false);
    setIsTimerRunning(false);
    setHasReboundAttempted(false);
    setActiveClue(null);
    setShowClueMenu(false);

    if (isRemoteMode) {
      updateSession({
        activeQuestionId: null,
        activeCategoryId: null,
        isAnswerRevealed: false
      });
    }
  };

  const showFeedback = (
    type: "correct" | "wrong",
    options?: { closeAfter?: boolean; durationMs?: number }
  ) => {
    const { closeAfter = true, durationMs = 2500 } = options || {};
    setFeedback(type);
    if (type === "correct") {
      correctSound.play();
    } else {
      wrongSound.play();
    }
    setTimeout(() => {
      setFeedback(null);
      if (closeAfter) {
        clearQuestionState();
      }
    }, durationMs); // Increased timeout for animations
  };

  const advanceTurnAfterResolution = (result: "correct" | "wrong", basis: 0 | 1) => {
    const shouldSwitch =
      result === "wrong" || game.turnMode === JeopardyTurnMode.ALTERNATE_AFTER_QUESTION;
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
      const remainder = pts - half;
      newScores[activeClue.usedBy] += half;
      newScores[activeClue.targetTeam] += remainder;
      setTeamScores(newScores);

      markUsed(active.question.id);
      setIsTimerRunning(false);
      showFeedback("correct");
      advanceTurnAfterResolution("correct", turnBasis);
      return;
    }

    newScores[answeringTeam] += pts;
    setTeamScores(newScores);

    // 📡 SYNC SCORE BACK TO FIRESTORE
    if (isRemoteMode && sessionData?.teamScores) {
      const teams = Object.keys(sessionData.teamScores).sort();
      updateSession({
        teamScores: {
          ...sessionData.teamScores,
          [teams[answeringTeam]]: newScores[answeringTeam]
        }
      });
    }

    markUsed(active.question.id);
    setIsTimerRunning(false);
    showFeedback("correct");
    advanceTurnAfterResolution("correct", turnBasis);
  };

  const handleWrong = (_isTimeout = false) => {
    if (!active) return;
    const reboundsAllowed =
      (game.allowRebounds ?? true) && activeClue?.type !== "ASK_OTHER_TEAM";

    if (reboundsAllowed && !hasReboundAttempted) {
      setHasReboundAttempted(true);
      const nextTeam = otherTeam(currentTeamIndex);
      setCurrentTeamIndex(nextTeam);
      setIsTimerRunning(false);
      setTimeLeft(TIMER_DURATION);
      setIsTimerRunning(true);
      showFeedback("wrong", { closeAfter: false, durationMs: 1200 });

      if (isRemoteMode) {
        updateSession({ currentTeamIndex: nextTeam, hasReboundAttempted: true });
      }
      return;
    }

    markUsed(active.question.id);
    setIsTimerRunning(false);
    showFeedback("wrong");

    const turnBasis = activeClue?.type === "ASK_OTHER_TEAM" ? activeClue.usedBy : currentTeamIndex;
    advanceTurnAfterResolution("wrong", turnBasis);

    if (isRemoteMode) {
      updateSession({
        activeQuestionId: null,
        hasReboundAttempted: false,
        currentTeamIndex: (turnBasis === 0 ? 1 : 0) // Basic flip for wrong answer
      });
    }
  };

  const teamLabel = (index: 0 | 1) => game.teams?.[index] || `Team ${index + 1}`;
  const explanationPlacement = active?.question.explanationPlacement || "WITH_ANSWER";

  const getHostCue = () => {
    if (!active) return "Give them a hint without revealing the answer.";
    if (active.question.explanation?.trim()) return active.question.explanation;
    const answer = active.question.correctAnswer?.trim();
    if (answer) {
      return `Starts with "${answer[0]}" and has ${answer.length} letters.`;
    }
    return "Give them a hint without revealing the answer.";
  };

  const useClue = (type: ClueType) => {
    if (!active) return;
    const teamIdx = currentTeamIndex;
    const usage = clueUsage[teamIdx];
    if (usage.remaining <= 0 || usage.usedTypes.includes(type)) return;

    const updatedTeam: TeamClueUsage = {
      remaining: Math.max(0, usage.remaining - 1),
      usedTypes: [...usage.usedTypes, type],
    };

    setClueUsage((prev) =>
      [
        teamIdx === 0 ? updatedTeam : prev[0],
        teamIdx === 1 ? updatedTeam : prev[1],
      ] as [TeamClueUsage, TeamClueUsage]
    );

    if (type === "ASK_OTHER_TEAM") {
      const helperTeam = otherTeam(teamIdx);
      setActiveClue({ type, usedBy: teamIdx, targetTeam: helperTeam });
      setCurrentTeamIndex(helperTeam);
      setHasReboundAttempted(false);
      setShowClueMenu(false);
      return;
    }

    if (type === "CALL_FRIEND") {
      setTimeLeft((prev) => prev + 10);
      setActiveClue({ type, usedBy: teamIdx, note: "Extra thinking time while you phone a friend." });
    } else if (type === "ASK_HOST") {
      setActiveClue({ type, usedBy: teamIdx, note: getHostCue() });
    }

    setShowClueMenu(false);
  };

  const openQuestion = (category: JeopardyCategory, question: JeopardyQuestion) => {
    setActive({ category, question });
    setShowAnswer(false);
    setHasReboundAttempted(false);
    setActiveClue(null);
    setShowClueMenu(false);
    setTimeLeft(TIMER_DURATION);
    setIsTimerRunning(true);
  };

  // Debug: log the media URL we try to render for troubleshooting broken images
  useEffect(() => {
    if (active?.question.questionMediaUrl) {
      const resolved = resolveMediaUrl(active.question.questionMediaUrl);
      console.log("[JeopardyGame] question media", {
        raw: active.question.questionMediaUrl,
        resolved,
        type: active.question.questionMediaType,
      });
    }
  }, [active?.question.questionMediaUrl, active?.question.questionMediaType]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleCorrect();
      }
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        handleWrong();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, currentTeamIndex]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-blue-950 to-slate-900 text-white relative">
      <header className="flex items-center justify-between p-4 border-b border-slate-700">
        <div>
          <h1 className="text-3xl font-bold tracking-wide">Jeopardy</h1>
          <p className="text-sm text-slate-300">
            {game.name || "Custom board"} · {game.categories.length} categories
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-sm">
            {([0, 1] as const).map((index) => (
              <div
                key={index}
                className={`px-3 py-1 rounded-lg border transition-all ${currentTeamIndex === index
                  ? "bg-yellow-400 text-black border-yellow-300 scale-110"
                  : "bg-slate-800 text-slate-200 border-slate-600"
                  }`}
              >
                <div className="flex items-baseline gap-1">
                  <span className="font-bold">{teamLabel(index)}</span>
                  <span>${teamScores[index]}</span>
                </div>
                <div className="text-[11px] text-yellow-200">
                  Clues left: {clueUsage[index]?.remaining ?? 0}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onExit}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg"
          >
            Exit Game
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {game.categories.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-300">
            No categories configured for this game.
          </div>
        ) : (
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${game.categories.length}, minmax(180px, 1fr))`,
            }}
          >
            {/* Headers */}
            {game.categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-slate-800 text-yellow-300 p-2 rounded-t-lg h-20 flex items-center justify-center text-center font-bold uppercase tracking-wide border-b border-yellow-500"
              >
                <span className="px-2">{cat.name || "Category"}</span>
              </div>
            ))}

            {/* Cells by point value */}
            {allPoints.map((points) =>
              game.categories.map((cat) => {
                const q = cat.questions.find((qq) => qq.points === points);
                if (!q) {
                  return (
                    <div
                      key={`${cat.id}-${points}`}
                      className="h-20 rounded-b-lg bg-slate-900/40 border border-slate-700/40"
                    />
                  );
                }

                const isUsed = usedIds.has(q.id);

                return (
                  <button
                    key={`${cat.id}-${points}`}
                    disabled={isUsed}
                    onClick={() => openQuestion(cat, q)}
                    className={`h-28 flex items-center justify-center font-extrabold text-4xl rounded-b-lg border shadow-md transition-all ${isUsed
                      ? "bg-white p-1 cursor-not-allowed"
                      : "bg-blue-700 hover:bg-blue-500 text-yellow-300 border-blue-400 hover:scale-[1.02]"
                      }`}
                    title={isUsed ? "Question answered" : `${cat.name} · $${points}`}
                  >
                    {isUsed ? (
                      <img
                        src={resolveMediaUrl("images/elebilogo.png")}
                        alt="Question answered"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      `$${points}`
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Active clue modal */}
      {active && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8">
          <div className="bg-slate-900 border border-yellow-400 rounded-2xl p-8 w-full h-full flex flex-col gap-6 shadow-2xl overflow-hidden">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-yellow-300 uppercase">
                  {active.category.name}
                </h2>
                <p className="text-xl text-slate-300">${active.question.points}</p>
              </div>
              <TimerCircle timeLeft={timeLeft} duration={TIMER_DURATION} />
              <button
                onClick={clearQuestionState}
                className="text-lg px-4 py-2 rounded bg-slate-700 hover:bg-slate-600"
              >
                Close
              </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center space-y-6">
              {!active.question.question?.trim() && !active.question.questionMediaUrl ? (
                <div className="w-full h-full flex items-center justify-center bg-white rounded-lg">
                  <img
                    src={resolveMediaUrl("images/elebilogo.png")}
                    alt="Logo"
                    className="max-w-xs"
                  />
                </div>
              ) : (
                <>
                  {/* Question media (image/audio/video) */}
                  {active.question.questionMediaUrl && active.question.questionMediaType && (
                    <div className="bg-slate-800 rounded-xl p-4 flex justify-center w-full">
                      {active.question.questionMediaType === "IMAGE" && (
                        <img
                          src={resolveMediaUrl(active.question.questionMediaUrl)}
                          alt="Question media"
                          className="max-h-96 w-auto rounded shadow-lg object-contain"
                        />
                      )}
                      {active.question.questionMediaType === "AUDIO" && (
                        <audio
                          controls
                          autoPlay
                          src={resolveMediaUrl(active.question.questionMediaUrl)}
                          className="w-full max-w-lg"
                        />
                      )}
                      {active.question.questionMediaType === "VIDEO" && (
                        <video
                          controls
                          autoPlay
                          src={resolveMediaUrl(active.question.questionMediaUrl)}
                          className="max-h-96 w-auto rounded shadow-lg"
                        />
                      )}
                    </div>
                  )}

                  <div className="bg-slate-800 rounded-xl p-6 w-full text-center">
                    <p className="text-4xl leading-relaxed font-semibold">
                      {active.question.question || "No clue provided."}
                    </p>
                  </div>

                  {active.question.explanation?.trim() &&
                    explanationPlacement === "WITH_QUESTION" && (
                      <div className="bg-blue-900/50 rounded-xl p-4 border border-blue-500/60 w-full text-center">
                        <p className="text-sm text-blue-100 uppercase tracking-wide mb-1">
                          Explanation
                        </p>
                        <p className="text-lg text-blue-50">
                          {active.question.explanation}
                        </p>
                      </div>
                    )}

                  {hasReboundAttempted && (game.allowRebounds ?? true) && !activeClue && (
                    <div className="bg-amber-900/40 rounded-xl p-3 border border-amber-500/60 w-full text-center">
                      <p className="text-amber-100 font-semibold">
                        Rebound! {teamLabel(currentTeamIndex)} gets a chance to answer.
                      </p>
                    </div>
                  )}

                  {activeClue && (
                    <div className="bg-blue-900/40 rounded-xl p-4 border border-blue-500/60 w-full text-center space-y-1">
                      <p className="text-blue-100 font-semibold">
                        {activeClue.type === "CALL_FRIEND" &&
                          `${teamLabel(activeClue.usedBy)} is calling a friend for help.`}
                        {activeClue.type === "ASK_HOST" &&
                          `${teamLabel(activeClue.usedBy)} asked the host for a cue.`}
                        {activeClue.type === "ASK_OTHER_TEAM" &&
                          `${teamLabel(activeClue.usedBy)} asked ${teamLabel(
                            activeClue.targetTeam ?? otherTeam(activeClue.usedBy)
                          )} to answer and split the points.`}
                      </p>
                      {activeClue.note && (
                        <p className="text-sm text-blue-200">{activeClue.note}</p>
                      )}
                    </div>
                  )}

                  {showAnswer && (
                    <div className="bg-emerald-900/60 rounded-xl p-6 border border-emerald-500 w-full text-center">
                      <p className="text-lg text-emerald-300 font-semibold mb-2">
                        Correct Response:
                      </p>
                      <p className="text-3xl font-bold">
                        {active.question.correctAnswer || "No answer configured."}
                      </p>
                      {active.question.explanation?.trim() &&
                        explanationPlacement === "WITH_ANSWER" && (
                          <div className="mt-3 text-left bg-emerald-800/60 rounded-lg p-3 border border-emerald-400/60">
                            <p className="text-sm text-emerald-200 uppercase tracking-wide mb-1">
                              Why it’s correct
                            </p>
                            <p className="text-base text-emerald-50">
                              {active.question.explanation}
                            </p>
                          </div>
                        )}
                      {active.question.answerMediaUrl &&
                        active.question.answerMediaType && (
                          <div className="mt-4 bg-emerald-800/60 rounded-lg p-3 border border-emerald-400/60">
                            <p className="text-sm text-emerald-200 uppercase tracking-wide mb-2">
                              Answer media
                            </p>
                            <div className="flex justify-center">
                              {active.question.answerMediaType === "IMAGE" && (
                                <img
                                  src={resolveMediaUrl(active.question.answerMediaUrl)}
                                  alt="Answer media"
                                  className="max-h-72 w-auto rounded shadow-lg object-contain"
                                />
                              )}
                              {active.question.answerMediaType === "AUDIO" && (
                                <audio
                                  controls
                                  src={resolveMediaUrl(active.question.answerMediaUrl)}
                                  className="w-full max-w-lg"
                                />
                              )}
                              {active.question.answerMediaType === "VIDEO" && (
                                <video
                                  controls
                                  src={resolveMediaUrl(active.question.answerMediaUrl)}
                                  className="max-h-72 w-auto rounded shadow-lg"
                                />
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </>
              )}
            </div>

            <footer className="relative flex flex-col gap-3 pt-4 shrink-0">
              <div className="flex flex-wrap justify-end items-center gap-3">
                <div className="flex flex-col mr-auto gap-2">
                  <span className="text-sm text-slate-400">
                    Hotkeys: R = Correct, W = Wrong
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-200">
                      {teamLabel(currentTeamIndex)} clues left:{" "}
                      {clueUsage[currentTeamIndex]?.remaining ?? 0}
                    </span>
                    <button
                      onClick={() => setShowClueMenu((v) => !v)}
                      disabled={(clueUsage[currentTeamIndex]?.remaining ?? 0) <= 0}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Use clue
                    </button>
                  </div>
                </div>
                {!showAnswer && (
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="px-6 py-3 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-300 text-lg"
                  >
                    Show Answer
                  </button>
                )}
                <button
                  onClick={() => handleWrong()}
                  className="px-6 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 text-lg"
                >
                  Wrong (W)
                </button>
                <button
                  onClick={handleCorrect}
                  className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 text-lg"
                >
                  Correct (R)
                </button>
              </div>
              {showClueMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-3 w-full bg-slate-800 border border-blue-500/40 rounded-lg p-4 space-y-2 shadow-2xl z-10">
                  <p className="text-xs text-blue-200 uppercase tracking-wide font-semibold">
                    Choose a clue
                  </p>
                  <div className="grid md:grid-cols-3 gap-2">
                    {[
                      {
                        type: "CALL_FRIEND" as ClueType,
                        label: "Call a friend",
                        desc: "Add a bit of extra time while you phone a friend.",
                      },
                      {
                        type: "ASK_HOST" as ClueType,
                        label: "Ask the host for a cue",
                        desc: "Reveal a quick hint from the host.",
                      },
                      {
                        type: "ASK_OTHER_TEAM" as ClueType,
                        label: "Ask the other team & split points",
                        desc: "The other team answers; points are shared if correct.",
                      },
                    ].map(({ type, label, desc }) => {
                      const used = clueUsage[currentTeamIndex]?.usedTypes.includes(type);
                      const disabled = used || (clueUsage[currentTeamIndex]?.remaining ?? 0) <= 0;
                      return (
                        <button
                          key={type}
                          onClick={() => useClue(type)}
                          disabled={disabled}
                          className={`text-left bg-slate-700 rounded-lg p-3 border ${disabled ? "border-slate-600 opacity-50 cursor-not-allowed" : "border-blue-500 hover:bg-slate-600"
                            }`}
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
