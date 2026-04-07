import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Lottie from "lottie-react";

// 🔊 sounds (confirmed mapping)
import {
  spinSound,        // number called
  correctSound,     // line
  victorySound,     // full card
  jackpotSound,     // end
  suspenseSound,    // background loop
} from "@/utils/sound";

// 🎆 animations (confirmed mapping)
import fireworks from "@/assets/animations/fireworks.json";  // line win
import fire from "@/assets/animations/fire.json";            // diagonal win
import party from "@/assets/animations/party.json";          // full card

import { BingoGame as BingoGameType, BingoRound, BingoCard, Team } from "@/types";

/* =========================================
   Helpers
 ========================================= */
const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

const shuffle = <T,>(arr: T[]) => {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Generate a classic 5x5 card (BINGO) as fallback if none provided
const generateClassicCard = (): BingoCard => {
  // US-style BINGO columns ranges
  const columns: number[][] = [
    shuffle(range(1, 15)).slice(0, 5),   // B
    shuffle(range(16, 30)).slice(0, 5),  // I
    shuffle(range(31, 45)).slice(0, 5),  // N
    shuffle(range(46, 60)).slice(0, 5),  // G
    shuffle(range(61, 75)).slice(0, 5),  // O
  ];

  // Build 5x5 grid by rows taking from each column
  const grid: number[][] = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => columns[c][r])
  );

  // Free space in center
  grid[2][2] = 0; // 0 = "free" sentinel

  return {
    id: `auto_${Date.now()}`,
    grid,
    hasFreeSpace: true,
  };
};

interface BingoProps {
  game: BingoGameType;
  round: BingoRound | null;
  teams: Team[];
  teamScores: Record<string, number>;
  onScoreChange: (teamId: string, score: number) => void;
  onExit: (points?: Record<string, number>) => void;
  hostControl?: "ipad" | "manual";
  playerControl?: "ipad" | "manual";
}

const BingoGame: React.FC<BingoProps> = ({
  game,
  round,
  teams,
  teamScores,
  onScoreChange,
  onExit,
  hostControl = 'ipad',
  playerControl = 'ipad'
}) => {
  // pick first card of the round, fallback to auto
  const card: BingoCard = useMemo(() => {
    const provided = round?.cards?.[0];

    if (!provided) return generateClassicCard();

    // 🔍 Firestore-safe unwrapping: convert [{row:[...]}] → [[...]]
    let grid: (number | string)[][] = [];

    if (Array.isArray(provided.grid) && provided.grid.length > 0) {
      if (Array.isArray(provided.grid[0])) {
        // ✅ Already a matrix
        grid = provided.grid as (number | string)[][];
      } else if (typeof provided.grid[0] === "object" && "row" in provided.grid[0]) {
        // 🔄 Firestore format: unwrap
        grid = (provided.grid as any[]).map((r) => r.row || []);
      }
    }

    // fallback if still invalid
    if (grid.length !== 5 || grid.some((r) => r.length !== 5)) {
      grid = generateClassicCard().grid;
    }

    // ensure free center
    if (provided.hasFreeSpace && grid[2] && grid[2][2] !== 0) {
      grid[2][2] = 0;
    }

    return { ...provided, grid: grid as number[][] };
  }, [round]);

  // Full 1..75 shuffled draw queue
  const fullDeck = useMemo<number[]>(() => shuffle(range(1, 75)), []);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [lastCalled, setLastCalled] = useState<number | null>(null);

  // Track win states to avoid re-triggering sounds/animations
  const [lineWin, setLineWin] = useState(false);
  const [diagWin, setDiagWin] = useState(false);
  const [fullCardWin, setFullCardWin] = useState(false);

  const [animation, setAnimation] = useState<any>(null);

  // cache of indices already checked for lines (to not double-trigger)
  const wonRowsRef = useRef<Set<number>>(new Set());
  const wonColsRef = useRef<Set<number>>(new Set());
  const wonDiagRef = useRef<boolean>(false);

  // Start suspense loop on mount; stop on unmount
  useEffect(() => {
    suspenseSound.stop();
    suspenseSound.setVolume(0.5);
    suspenseSound.play();
    return () => {
      suspenseSound.stop();
      [spinSound, correctSound, victorySound, jackpotSound].forEach((s) => s.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marked matrix (derived): true if the number is in calledNumbers OR free center (0)
  const marked = useMemo<boolean[][]>(() => {
    const drawnSet = new Set(calledNumbers);
    return card.grid.map((row, r) =>
      row.map((val, c) => {
        // Check for free space based on card property or value 0
        if (card.hasFreeSpace && r === 2 && c === 2) return true;
        if (val === 0) return true; // Safeguard if 0 is used as a free space sentinel

        // Check if the number has been called
        return drawnSet.has(val as number);
      })
    );
  }, [calledNumbers, card]);

  // Check wins each time we call a number
  useEffect(() => {
    if (!marked.length) return;

    let triggered = false;

    // Rows
    for (let r = 0; r < 5; r++) {
      const rowComplete = marked[r].every(Boolean);
      if (rowComplete && !wonRowsRef.current.has(r)) {
        wonRowsRef.current.add(r);
        if (!lineWin) {
          correctSound.stop();
          correctSound.play();
          setAnimation(fireworks);
          setLineWin(true);
          triggered = true;
        }
      }
    }

    // Cols
    for (let c = 0; c < 5; c++) {
      const colComplete = [0, 1, 2, 3, 4].every((r) => marked[r][c]);
      if (colComplete && !wonColsRef.current.has(c)) {
        wonColsRef.current.add(c);
        if (!lineWin) {
          correctSound.stop();
          correctSound.play();
          setAnimation(fireworks);
          setLineWin(true);
          triggered = true;
        }
      }
    }

    // Diagonals
    const mainDiag = [0, 1, 2, 3, 4].every((i) => marked[i][i]);
    const antiDiag = [0, 1, 2, 3, 4].every((i) => marked[i][4 - i]);
    if ((mainDiag || antiDiag) && !wonDiagRef.current) {
      wonDiagRef.current = true;
      if (!diagWin) {
        correctSound.stop();
        correctSound.play(); // or a different sound if you prefer
        setAnimation(fire);
        setDiagWin(true);
        triggered = true;
      }
    }

    // Full card
    const all = (marked as boolean[][]).every((row) => row.every(Boolean));
    if (all && !fullCardWin) {
      // stop ambience and celebrate
      suspenseSound.stop();
      correctSound.stop();
      victorySound.stop();

      victorySound.play();
      setAnimation(party);
      setFullCardWin(true);

      // end sound
      setTimeout(() => {
        jackpotSound.stop();
        jackpotSound.play();
      }, 300);

      triggered = true;
    }

    // If any animation triggered, let it play out but don’t block UI
    if (triggered) {
      // no-op; the animation is rendered below via <Lottie />
    }
  }, [marked, lineWin, diagWin, fullCardWin]);

  const remaining = useMemo<number[]>(
    () => fullDeck.filter((n) => !calledNumbers.includes(n)),
    [fullDeck, calledNumbers]
  );

  const handleNextNumber = () => {
    if (fullCardWin) return; // game over
    if (remaining.length === 0) return;

    const next = remaining[0];

    // sound for call
    spinSound.stop();
    spinSound.play();

    setLastCalled(next);
    setCalledNumbers((prev) => [...prev, next]);
  };

  const handleReset = () => {
    setCalledNumbers([]);
    setLastCalled(null);
    setLineWin(false);
    setDiagWin(false);
    setFullCardWin(false);
    setAnimation(null);
    wonRowsRef.current.clear();
    wonColsRef.current.clear();
    wonDiagRef.current = false;

    suspenseSound.stop();
    suspenseSound.setVolume(0.5);
    suspenseSound.play();
  };

  return (
    <div className="min-h-screen w-full text-white bg-gradient-to-b from-gray-900 to-black p-6 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-2 drop-shadow-lg text-center">🟨 BINGO</h1>
      <p className="text-gray-400 mb-6 text-center">
        {game.round?.topic ? `${game.round.topic} — ` : ""}Classic 75-Ball
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_320px] gap-8 w-full max-w-5xl">
        {/* Card */}
        <motion.div
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header B I N G O */}
          <div className="grid grid-cols-5 gap-2 mb-2 text-center font-extrabold text-yellow-400">
            {["B", "I", "N", "G", "O"].map((h) => (
              <div key={h} className="text-2xl">{h}</div>
            ))}
          </div>

          {/* 5x5 grid */}
          <div className="grid grid-cols-5 gap-2">
            {card.grid.map((row, r) =>
              row.map((val, c) => {
                const isFree = (card.hasFreeSpace && r === 2 && c === 2) || val === 0;
                const isCalled = isFree || calledNumbers.includes(val as number); // Cast val to number for includes
                return (
                  <motion.div
                    key={`${r}-${c}`}
                    className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold
                      ${isCalled ? "bg-yellow-400 text-black" : "bg-gray-700 text-gray-200"}
                      ${isFree ? "ring-2 ring-pink-400" : ""}
                    `}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: isCalled ? 1.05 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isFree ? "★" : val}
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Sidebar: Controls + Called numbers */}
        <motion.div
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg flex flex-col"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Caller</h3>
            <span className="text-sm text-gray-400">
              {calledNumbers.length}/75 called
            </span>
          </div>

          {/* Last called ball */}
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-yellow-400 text-black flex items-center justify-center text-3xl font-extrabold shadow-inner">
              {lastCalled ?? "--"}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={handleNextNumber}
              disabled={fullCardWin || remaining.length === 0}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold
                ${fullCardWin || remaining.length === 0
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"}
              `}
            >
              Next Number
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600"
            >
              Reset
            </button>
          </div>

          {/* Called numbers list */}
          <div className="flex-1 overflow-y-auto rounded-lg border border-gray-700 p-2">
            <div className="grid grid-cols-5 gap-2">
              {calledNumbers.map((n) => (
                <div
                  key={n}
                  className="text-center text-sm bg-gray-700 rounded py-1"
                >
                  {n}
                </div>
              ))}
            </div>
          </div>

          {/* Exit */}
          <button
            type="button"
            onClick={() => onExit()}
            className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Exit Game
          </button>
        </motion.div>
      </div>

      {/* Celebration Lottie */}
      {animation && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <Lottie animationData={animation} loop={false} />
        </div>
      )}
    </div>
  );
};

export default BingoGame;
