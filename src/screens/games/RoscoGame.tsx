  // src/screens/play/RoscoGame.tsx
  import React, { useEffect, useRef, useState } from "react";
  import { motion } from "framer-motion";
  import { RoscoGame as RoscoGameType } from "@/types";
  import confetti from "canvas-confetti";
  import {
    countdownSound,
    correctSound,
    winSound,
    loseSound,
  } from "@/utils/sound";
  import contestantImg from "/images/contestant1.png";

  interface RoscoGameProps {
    game: RoscoGameType;
    onExit: () => void;
  }

  const GAME_TIME = 120;

  const RoscoGame: React.FC<RoscoGameProps> = ({ game, onExit }) => {
    const [timeLeft, setTimeLeft] = useState(GAME_TIME);
    const [currentLetter, setCurrentLetter] = useState("A");
    const [answers, setAnswers] = useState<Record<string, "pending" | "correct">>(
      () => Object.fromEntries(game.clues.map((c) => [c.letter, "pending"]))
    );
    const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
    const timerRef = useRef<number | null>(null);


    // Timer + countdown
    useEffect(() => {
      if (status !== "playing") return;
      setTimeLeft(GAME_TIME);

      countdownSound.setPlaybackRate(1.5);
      countdownSound.play();

      timerRef.current = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        countdownSound.stop();
      };
    }, [status]);

    useEffect(() => {
      if (status !== "playing") countdownSound.stop();
    }, [status]);

    useEffect(() => {
      if (timeLeft <= 0 && status === "playing") {
        setStatus("lost");
        loseSound.play();
      }
    }, [timeLeft, status]);

    useEffect(() => {
      if (
        status === "playing" &&
        Object.values(answers).every((v) => v === "correct")
      ) {
        setStatus("won");
        winSound.play();
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      }
    }, [answers, status]);

    const markCorrect = () => {
      const clue = game.clues.find((c) => c.letter === currentLetter);
      if (!clue) return;
      setAnswers((prev) => ({ ...prev, [clue.letter]: "correct" }));
      correctSound.play();
      goToNextLetter();
    };

    const goToNextLetter = () => {
      const letters = game.clues.map((c) => c.letter);
      const currentIdx = letters.indexOf(currentLetter);
      for (let i = 1; i <= letters.length; i++) {
        const nextIdx = (currentIdx + i) % letters.length;
        if (answers[letters[nextIdx]] === "pending") {
          setCurrentLetter(letters[nextIdx]);
          return;
        }
      }
    };

    return (
      <div className="fixed inset-0 bg-blue-900 flex flex-col items-center justify-center text-white z-50 p-6">
        <div className="flex items-start justify-center gap-12 w-full">
          {/* Timer + Definition */}
          <div className="flex flex-col items-center w-1/3">
            <div
              className={`text-8xl font-extrabold mb-6 ${
                timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-white"
              }`}
            >
              ⏱ {timeLeft}s
            </div>
            {status === "playing" && (
              <div className="bg-white text-black px-6 py-4 rounded-lg shadow-lg text-center max-w-sm">
                <p className="text-xl italic">
                  {game.clues.find((c) => c.letter === currentLetter)?.definition}
                </p>
              </div>
            )}
          </div>

          {/* Rosco Circle */}
          <div className="relative w-[880px] h-[880px] flex flex-col items-center justify-center">
            {/* Contestant + Buttons stacked */}
            <div className="flex flex-col items-center gap-6 z-20">
              <motion.img
                src={contestantImg}
                alt="Contestant"
                className="w-72 h-72 rounded-full shadow-xl"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              {status === "playing" && (
                <div className="flex gap-6">
                  <button
                    onClick={markCorrect}
                    className="px-6 py-3 bg-green-600 rounded-lg hover:bg-green-700 text-xl"
                  >
                    ✅ Correct
                  </button>
                  <button
                    onClick={goToNextLetter}
                    className="px-6 py-3 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 text-xl"
                  >
                    ⏭ Skip
                  </button>
                </div>
              )}
            </div>

            {/* Letters around circle */}
            {game.clues.map((clue, idx) => {
              const angle = (idx / game.clues.length) * 2 * Math.PI;
              const x = 370 * Math.cos(angle);
              const y = 370 * Math.sin(angle);
              const state = answers[clue.letter];
              const isActive = clue.letter === currentLetter;
              const bg =
                state === "correct"
                  ? "bg-green-700"
                  : isActive
                  ? "bg-yellow-400 text-black"
                  : "bg-gray-600";

              return (
                <motion.div
                  key={clue.letter}
                  className={`absolute w-20 h-20 flex items-center justify-center rounded-full border-2 border-white font-bold text-3xl ${bg}`}
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                  animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  transition={{
                    duration: 0.6,
                    repeat: isActive ? Infinity : 0,
                  }}
                >
                  {clue.letter}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Win/Lose Overlay */}
        {status !== "playing" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
            {status === "won" ? (
              <>
                <h2 className="text-6xl font-bold text-green-400 mb-6">
                  🎉 You Won! 🎉
                </h2>
                <button
                  onClick={onExit}
                  className="bg-blue-600 px-10 py-5 rounded-lg text-3xl hover:bg-blue-700"
                >
                  Return to Menu
                </button>
              </>
            ) : (
              <>
                <h2 className="text-6xl font-bold text-red-500 mb-6">
                  ⏱ Time’s Up!
                </h2>
                <button
                  onClick={onExit}
                  className="bg-gray-600 px-10 py-5 rounded-lg text-3xl hover:bg-gray-700"
                >
                  Exit Game
                </button>
              </>
            )}
          </div>
        )}

        {/* Exit Button */}
        {status === "playing" && (
          <button
            onClick={onExit}
            className="absolute bottom-6 left-6 bg-red-600 px-6 py-3 rounded-lg hover:bg-red-700"
          >
            Exit
          </button>
        )}
      </div>
    );
  };

  export default RoscoGame;
