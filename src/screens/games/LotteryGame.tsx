// src/screens/games/LotteryGame.tsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import {
  spinSound,
  reveal1Sound,
  reveal2Sound,
  reveal3Sound,
  reveal4Sound,
  reveal5Sound,
  suspenseSound,
  correctSound,
  jackpotSound,
  victorySound,
} from "@/utils/sound";

import fireworks from "@/assets/animations/fireworks.json";
import fire from "@/assets/animations/fire.json";
import fallbackExplosion from "@/assets/animations/party.json";

import { LotteryGame as LotteryGameType, LotteryDraw, LotteryTicket, Team } from "@/types";

// 🎲 Generate unique random lottery numbers
const generateRandomNumbers = (count: number, max: number): number[] => {
  const nums = new Set<number>();
  while (nums.size < count) nums.add(Math.floor(Math.random() * max) + 1);
  return Array.from(nums);
};

// 🎚️ Fade-out helper
const fadeOutSound = async (sound: any, duration = 800) => {
  if (!sound) return;
  try {
    const steps = 10;
    const interval = duration / steps;
    const initialVolume = 0.7;
    for (let i = 0; i < steps; i++) {
      sound.setVolume(initialVolume * (1 - i / steps));
      await new Promise((r) => setTimeout(r, interval));
    }
    sound.stop();
    sound.setVolume(initialVolume);
  } catch {
    /* noop */
  }
};

interface LotteryProps {
  game: LotteryGameType;
  teams: Team[];
  teamScores: Record<string, number>;
  onScoreChange: (teamId: string, score: number) => void;
  onExit: (points?: Record<string, number>) => void;
  hostControl?: "ipad" | "manual";
  playerControl?: "ipad" | "manual";
}

const LotteryGame: React.FC<LotteryProps> = ({
  game,
  teams,
  teamScores,
  onScoreChange,
  onExit,
  hostControl = 'ipad',
  playerControl = 'ipad'
}) => {
  const [draw, setDraw] = useState<LotteryDraw | null>(game.draw || null);
  const [ticket, setTicket] = useState<LotteryTicket | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [matches, setMatches] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [animation, setAnimation] = useState<any>(null);

  // ✅ Auto-create draw if missing
  useEffect(() => {
    if (!draw) {
      const newDraw: LotteryDraw = {
        id: `auto_${Date.now()}`,
        drawNumbers: generateRandomNumbers(5, 50),
        date: new Date().toISOString(),
      };
      setDraw(newDraw);
      console.log("🎰 Auto-created draw:", newDraw.drawNumbers);
    }
  }, [draw]);

  // ✅ Normalized draw numbers available to both render and logic
  const drawNums = useMemo<number[]>(
    () =>
      (draw?.drawNumbers ?? [])
        .map((n) => Number(n))
        .filter((n) => !isNaN(n)),
    [draw?.drawNumbers]
  );

  // 🎟️ Generate player's ticket
  const handleGenerateTicket = () => {
    const newTicket: LotteryTicket = {
      id: `ticket_${Date.now()}`,
      numbers: generateRandomNumbers(5, 50),
    };
    setTicket(newTicket);
    setMatches(0);
    setRevealed([]);
    setIsComplete(false);
    setAnimation(null);
  };

  // 🎡 Perform progressive draw
  const handleStartDraw = async () => {
    if (!draw || !ticket) return;

    setIsDrawing(true);
    setRevealed([]);
    setMatches(0);

    suspenseSound.stop();
    suspenseSound.setVolume(0.7);
    suspenseSound.play();

    const revealSounds = [reveal1Sound, reveal2Sound, reveal3Sound, reveal4Sound, reveal5Sound];

    for (let i = 0; i < drawNums.length; i++) {
      const num = drawNums[i];

      spinSound.stop();
      spinSound.play();

      await new Promise((r) => setTimeout(r, 1000));

      revealSounds[i]?.stop?.();
      revealSounds[i]?.play();

      setRevealed((prev: number[]) => [...prev, num]);
    }

    await new Promise((r) => setTimeout(r, 1500));

    // ✅ Numeric match calculation
    const matched = (ticket.numbers as (number | string)[]).filter((n) =>
      drawNums.includes(Number(n))
    ).length;
    setMatches(matched);

    // 🎚️ Dynamic fade duration
    let fadeDuration = 800;
    if (matched === 3 || matched === 4) fadeDuration = 1200;
    if (matched === 5) fadeDuration = 1800;

    await fadeOutSound(suspenseSound, fadeDuration);
    spinSound.stop();
    revealSounds.forEach((s) => s.stop?.());

    // 🏆 Celebration logic
    if (matched === 5) {
      victorySound.stop();
      correctSound.stop();
      jackpotSound.stop();
      jackpotSound.play();
      setAnimation(fallbackExplosion);
    } else if (matched === 4) {
      jackpotSound.stop();
      correctSound.stop();
      victorySound.stop();
      victorySound.play();
      setAnimation(fire);
    } else if (matched === 3) {
      jackpotSound.stop();
      victorySound.stop();
      correctSound.stop();
      correctSound.play();
      setAnimation(fireworks);
    } else {
      setAnimation(null);
    }

    setIsDrawing(false);
    setIsComplete(true);
  };

  // 🔇 Cleanup on unmount
  useEffect(() => {
    return () => {
      [
        spinSound,
        suspenseSound,
        jackpotSound,
        victorySound,
        correctSound,
        reveal1Sound,
        reveal2Sound,
        reveal3Sound,
        reveal4Sound,
        reveal5Sound,
      ].forEach((s) => s.stop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-white bg-gradient-to-b from-gray-900 to-black">
      <h1 className="text-4xl font-bold mb-8 drop-shadow-lg text-center">
        🎰 Lottery Draw Experience
      </h1>

      {/* DRAW DISPLAY */}
      {draw && (
        <motion.div
          className="bg-gray-800 p-6 rounded-xl mb-8 text-center shadow-lg border border-gray-700"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-semibold text-yellow-400 mb-2">Official Draw</h2>
          <div className="flex justify-center gap-4">
            {drawNums.map((num: number, i: number) => {
              const revealedNow = revealed.includes(num);
              return (
                <motion.div
                  key={i}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${revealedNow ? "bg-yellow-400 text-black" : "bg-gray-600 text-gray-400"
                    }`}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: revealedNow ? 360 : 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {revealedNow ? num : "?"}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* PLAYER TICKET */}
      <motion.div
        className="bg-gray-800 p-6 rounded-xl text-center shadow-lg border border-gray-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h2 className="text-lg font-semibold text-blue-400 mb-2">Your Ticket</h2>
        {ticket ? (
          <div className="flex justify-center gap-4 mb-4">
            {ticket.numbers.map((num: string | number, i: number) => {
              const isMatch = revealed.includes(Number(num));
              return (
                <motion.div
                  key={i}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${isMatch ? "bg-green-400 text-black scale-110" : "bg-gray-700 text-white"
                    }`}
                  animate={{ scale: isMatch ? 1.2 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {num}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 mb-4">Generate your ticket to play</p>
        )}

        <div className="flex justify-center gap-4">
          <button
            onClick={handleGenerateTicket}
            disabled={isDrawing}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold"
          >
            🎟️ Generate Ticket
          </button>

          {ticket && (
            <button
              onClick={handleStartDraw}
              disabled={isDrawing}
              className={`${isDrawing
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-yellow-500 hover:bg-yellow-600 text-black"
                } px-6 py-2 rounded-lg font-semibold`}
            >
              {isDrawing ? "Drawing..." : "Start Draw"}
            </button>
          )}
        </div>
      </motion.div>

      {/* RESULTS */}
      {isComplete && (
        <motion.div className="mt-10 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3
            className={`text-3xl font-bold ${matches >= 3 ? "text-green-400" : "text-gray-400"
              }`}
          >
            {matches === 5
              ? "💎 JACKPOT! All 5 Numbers Matched!"
              : matches > 0
                ? `You matched ${matches} ${matches === 1 ? "number" : "numbers"}!`
                : "No matches this time – better luck next round!"}
          </h3>

          {animation && (
            <div className="mt-6 w-80 h-80 mx-auto">
              <Lottie animationData={animation} loop={false} />
            </div>
          )}
        </motion.div>
      )}

      <button
        onClick={() => onExit()}
        className="mt-10 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
      >
        Exit Game
      </button>
    </div>
  );
};

export default LotteryGame;
