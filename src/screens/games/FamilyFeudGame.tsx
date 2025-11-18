// src/screens/FamilyFeudGame.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { FamilyFeudRound } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  correctoSound,
  strikeSound,
  roundWinSound,
  timerSound,
  transitionSound,
} from "@utils/sound";



// ---------------- CONFIG ----------------
const SCORE_STORAGE_KEY = "familyFeudScores";
const ROUND_TIMER_SECONDS = 30;
const HOST_REVEAL_AWARDS_POINTS = true;

// ---------------- THEMES ----------------
const THEMES = [
  {
    bg: "from-slate-900 via-blue-900 to-slate-900",
    board: "bg-blue-900/70",
    unrevealed: "#0e3a66",
    revealed: "#4B5320", // Military green
  },
  {
    bg: "from-slate-900 via-indigo-900 to-slate-900",
    board: "bg-indigo-900/70",
    unrevealed: "#2a1f6a",
    revealed: "#4B5320",
  },
  {
    bg: "from-slate-900 via-purple-900 to-slate-900",
    board: "bg-purple-900/70",
    unrevealed: "#3c145e",
    revealed: "#4B5320",
  },
  {
    bg: "from-slate-900 via-rose-900 to-slate-900",
    board: "bg-rose-900/70",
    unrevealed: "#631a2b",
    revealed: "#4B5320",
  },
];

interface FamilyFeudGameProps {
  game: { rounds: FamilyFeudRound[]; name?: string };
  onExit?: () => void;
}

const FamilyFeudGame: React.FC<FamilyFeudGameProps> = ({ game, onExit }) => {
  const rounds = game?.rounds ?? [];
  const totalRounds = rounds.length;

  const [roundIndex, setRoundIndex] = useState(0);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [strikes, setStrikes] = useState(0);
  const [activeTeam, setActiveTeam] = useState<"A" | "B">("A");
  const [scores, setScores] = useState<{ A: number; B: number }>(() => {
    try {
      const saved = localStorage.getItem(SCORE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : { A: 0, B: 0 };
    } catch {
      return { A: 0, B: 0 };
    }
  });

  const [isTiming, setIsTiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [flash, setFlash] = useState<null | "strike" | "timeup" | "correct">(
    null
  );
  const [showTransition, setShowTransition] = useState(false);

  const currentRound = rounds[roundIndex];
  const isLastRound = roundIndex === totalRounds - 1;
  const theme = THEMES[roundIndex % THEMES.length];

  const unrevealedAnswers = useMemo(
    () =>
      currentRound
        ? currentRound.answers.filter((a) => !revealed.includes(a.text))
        : [],
    [currentRound, revealed]
  );

  // ---------------- TIMER AUTO START ----------------
  useEffect(() => {
    if (currentRound) {
      timerSound.stop();
      setTimeLeft(ROUND_TIMER_SECONDS);
      setIsTiming(true);
      timerSound.play();
    }
    return () => timerSound.stop();
  }, [roundIndex]);

  // ---------------- TIMER COUNTDOWN ----------------
  useEffect(() => {
    if (!isTiming || timeLeft === null) return;
    if (timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft((v) => (v ? v - 1 : 0)), 1000);
      return () => clearTimeout(t);
    } else {
      // ⏰ Timer reached 0
      timerSound.stop();
     // buzzerSound.play();
      setIsTiming(false);
      setFlash("timeup");
      setTimeout(() => setFlash(null), 400);
    }
  }, [isTiming, timeLeft]);

  // ---------------- HELPERS ----------------
  const flashOnce = (type: "strike" | "correct") => {
    setFlash(type);
    setTimeout(() => setFlash(null), 200);
  };

  const addPoints = useCallback((team: "A" | "B", pts: number) => {
    setScores((prev) => {
      const next = { ...prev, [team]: prev[team] + pts };
      localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // ---------------- HOST ACTIONS ----------------
  const revealSpecific = (text: string) => {
    if (!currentRound || revealed.includes(text)) return;
    const match = currentRound.answers.find((a) => a.text === text);
    if (!match) return;

    correctoSound.play();
    flashOnce("correct");
    setRevealed((r) => [...r, text]);
    if (HOST_REVEAL_AWARDS_POINTS) addPoints(activeTeam, match.points);

    // If all answers revealed → auto stop + buzzer
    if (revealed.length + 1 === currentRound.answers.length) {
      timerSound.stop();
     // buzzerSound.play();
    }
  };

  const revealNext = () => {
    if (unrevealedAnswers.length === 0) return;
    revealSpecific(unrevealedAnswers[0].text);
  };

  const wrongAnswer = () => {
    strikeSound.play();
    flashOnce("strike");
    setStrikes((s) => Math.min(3, s + 1));
  };

  const toggleTeam = () => setActiveTeam((t) => (t === "A" ? "B" : "A"));

  const endRound = () => {
    transitionSound.play();
    setShowTransition(true);
    setTimeout(() => {
      setShowTransition(false);
      if (!isLastRound) {
        setRoundIndex((i) => i + 1);
        setRevealed([]);
        setStrikes(0);
        setActiveTeam((t) => (t === "A" ? "B" : "A"));
      } else {
        roundWinSound.play();
        confetti({ particleCount: 200, spread: 80, origin: { y: 0.7 } });
      }
    }, 1500);
  };

  // ---------------- RENDER ----------------
  if (!currentRound)
    return (
      <div className="h-screen grid place-items-center bg-slate-900 text-white">
        No rounds loaded.
      </div>
    );

  return (
    <div
      className={`fixed inset-0 bg-gradient-to-b ${theme.bg} text-white overflow-hidden`}
    >
      {/* Transition overlay */}
      <AnimatePresence>
        {showTransition && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="text-center"
            >
              <div className="text-yellow-300 text-5xl font-black drop-shadow-lg">
                {isLastRound ? "Final Scores…" : `Round ${roundIndex + 2}`}
              </div>
              {!isLastRound && (
                <div className="text-white/90 text-xl mt-2">
                  Get ready for the next question!
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash overlays */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash}
            className={`absolute inset-0 pointer-events-none z-40 ${
              flash === "strike"
                ? "bg-red-600"
                : flash === "timeup"
                ? "bg-yellow-500"
                : "bg-green-600"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="pt-20 text-center">
        <h2 className="text-4xl md:text-5xl font-black drop-shadow mb-2">
          Round {roundIndex + 1} / {totalRounds}
        </h2>
        <p className="text-lg md:text-xl text-white/85 px-4">
          {currentRound.question}
        </p>
      </div>

      {/* Board */}
      <motion.div
        key={roundIndex}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`mt-8 mx-auto max-w-5xl ${theme.board} rounded-2xl shadow-2xl border border-white/10 p-6`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentRound.answers.map((a, i) => {
            const shown = revealed.includes(a.text);
            return (
              <motion.div
                key={i}
                animate={{
                  backgroundColor: shown ? theme.revealed : theme.unrevealed,
                  color: shown ? "#fff" : "#c9e4ff",
                  scale: shown ? 1.02 : 1,
                }}
                transition={{ duration: 0.3 }}
                className="rounded-xl px-4 py-3 font-semibold flex items-center justify-between border border-white/10"
              >
                <span>{shown ? a.text : "•••••••••••••••••"}</span>
                <span>{shown ? a.points : ""}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Host controls */}
      <div className="mt-6 max-w-5xl mx-auto px-4">
        <p className="text-center text-xs tracking-widest text-white/70 mb-2">
          HOST CONTROL — CLICK THE CORRECT ANSWER
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {currentRound.answers.map((a) => (
            <button
              key={a.text}
              disabled={revealed.includes(a.text)}
              onClick={() => revealSpecific(a.text)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                revealed.includes(a.text)
                  ? "bg-white/15 text-white/50"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {a.text}
            </button>
          ))}
        </div>

        {/* Timer & action bar */}
        <div className="flex flex-col items-center gap-3 mt-6">
          <div className="text-2xl font-bold text-yellow-300">
            {isTiming ? `⏱ ${timeLeft}s` : "⏱ Timer Ready"}
          </div>
          {isTiming && (
            <div className="w-72 h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-3 bg-yellow-400 transition-all duration-1000"
                style={{
                  width: `${
                    ((timeLeft ?? ROUND_TIMER_SECONDS) / ROUND_TIMER_SECONDS) *
                    100
                  }%`,
                }}
              />
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={revealNext}
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-black font-semibold"
            >
              Reveal Next Answer
            </button>
            <button
              onClick={wrongAnswer}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 font-semibold"
            >
              ❌ Wrong Answer
            </button>
            <button
              onClick={toggleTeam}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 font-semibold"
            >
              🔁 Switch Team
            </button>
            <button
              onClick={endRound}
              className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              ⏭ End Round
            </button>
          </div>
        </div>
      </div>

      {/* Footer scores */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-white/80">
        <div className="mb-1">
          Team <strong>{activeTeam}</strong> is playing
        </div>
        <div>
          Scores — Team A:{" "}
          <span className="text-blue-200">{scores.A}</span> | Team B:{" "}
          <span className="text-pink-200">{scores.B}</span>
        </div>
      </div>
    </div>
  );
};

export default FamilyFeudGame;
