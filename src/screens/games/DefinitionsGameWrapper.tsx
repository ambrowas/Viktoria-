import React, { useEffect, useState } from "react";
import { DefinitionsGame } from "@/types";
import { magicalSound, failureSound, winSound } from "@/utils/sound";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

interface DefinitionsGameWrapperProps {
  gameData: DefinitionsGame;
  onExit: () => void;
}

const GAME_TIME = 90; // total seconds

const DefinitionsGameWrapper: React.FC<DefinitionsGameWrapperProps> = ({
  gameData,
  onExit,
}) => {
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [revealed, setRevealed] = useState<{ [key: string]: boolean }>({});
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  // 🎵 Sounds
  const timerAudio = new Audio(`${import.meta.env.BASE_URL}sounds/timer.mp3`);
  timerAudio.loop = true;
  timerAudio.volume = 0.4;

  const loseAudio = new Audio(`${import.meta.env.BASE_URL}sounds/lose.mp3`);
  const victoryAudio = new Audio(`${import.meta.env.BASE_URL}sounds/victory.mp3`);

  // 🕒 Timer
  useEffect(() => {
    if (gameOver) return;

    timerAudio.play().catch(() => {});
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          timerAudio.pause();
          timerAudio.currentTime = 0;
          if (!hasWon) {
            failureSound.play();
            loseAudio.play().catch(() => {});
            setGameOver(true);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      timerAudio.pause();
      timerAudio.currentTime = 0;
    };
  }, [gameOver, hasWon]);

  // 🏁 Win detection
  useEffect(() => {
    if (!gameData.clues?.length) return;

    const allRevealed = gameData.clues.every((clue) => revealed[clue.id]);
    if (allRevealed && !hasWon) {
      setHasWon(true);
      setGameOver(true);
      timerAudio.pause();
      victoryAudio.play().catch(() => {});
      winSound.play();
      confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
    }
  }, [revealed, gameData.clues, hasWon]);

  // 🎯 Reveal a word
  const handleCardDoubleClick = (id: string) => {
    if (gameOver || revealed[id]) return;
    magicalSound.play();
    setRevealed((prev) => ({ ...prev, [id]: true }));
    setScore((s) => s + 100);
  };

  return (
    <div className="fixed inset-0 bg-[#0a0f1f] flex flex-col items-center justify-between text-white overflow-hidden p-6">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-4">
        <h2 className="text-5xl font-extrabold text-white">
          ⏱{" "}
          <span className={timeLeft <= 10 ? "text-red-500" : "text-green-400"}>
            {timeLeft}s
          </span>
        </h2>
        <h3 className="text-4xl font-bold text-yellow-400">Score: {score}</h3>
      </div>

      {/* Main Game Area */}
      <div className="flex flex-1 w-full items-center justify-center gap-10">
        {/* Player / Character */}
        <div className="flex-1 flex justify-center items-center">
          <motion.img
            src={`${import.meta.env.BASE_URL}images/contestant1.png`}
            alt="Contestant"
            className="w-[400px] h-auto object-contain rounded-xl shadow-2xl"
            animate={
              hasWon
                ? { scale: [1, 1.1, 1], rotate: [0, 3, -3, 0] }
                : { scale: [1, 1.03, 1] }
            }
            transition={{
              repeat: Infinity,
              duration: hasWon ? 1.5 : 3,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Definitions List */}
        <div className="flex flex-col gap-4 flex-1 max-w-md">
          {gameData.clues?.map((clue, idx) => {
            const isRevealed = revealed[clue.id];
            const prefix = clue.word.slice(0, 3).toUpperCase();

            return (
              <motion.div
                key={clue.id}
                onDoubleClick={() => handleCardDoubleClick(clue.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  backgroundColor: isRevealed ? "#166534" : "#1e293b",
                }}
                transition={{ duration: 0.4 }}
                className="cursor-pointer rounded-lg p-4 text-center border-2 border-blue-600 text-xl relative overflow-hidden"
              >
                {isRevealed ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-white text-3xl font-extrabold"
                  >
                    {clue.word.toUpperCase()}
                  </motion.span>
                ) : (
                  <>
                    <div className="text-blue-400 text-4xl font-bold">{prefix}</div>
                    <p className="text-gray-300 italic text-sm mt-2">
                      {clue.definition}
                    </p>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-6">
        <button
          onClick={onExit}
          className="bg-red-600 text-white px-8 py-4 rounded-lg text-2xl hover:bg-red-700 border-4 border-black"
        >
          Exit Game
        </button>
      </div>

      {/* 🏆 Win Overlay */}
      {hasWon && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onExit}
        >
          <motion.h1
            className="text-6xl font-extrabold text-green-400"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            🎉 You Won! 🎉
          </motion.h1>
        </motion.div>
      )}

      {/* ❌ Game Over Overlay */}
      {gameOver && !hasWon && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onExit}
        >
          <motion.h1
            className="text-5xl font-extrabold text-red-500"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            ⏰ Time’s Up!
          </motion.h1>
        </motion.div>
      )}
    </div>
  );
};

export default DefinitionsGameWrapper;

