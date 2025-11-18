import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WheelOfFortuneGame as WheelGameType, WheelRound } from "@/types";
import {
  timerSound,
  magicalSound,
  correctoSound,
  strikeSound,
  victorySound,
  transitionSound,
} from "@/utils/sound";

interface Props {
  game: WheelGameType;
  onExit: () => void;
}

export default function WheelOfFortuneGame({ game, onExit }: Props) {
  const [currentRound, setCurrentRound] = useState<WheelRound | null>(
    game.rounds[0] || null
  );
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<number | string | null>(null);
  const [scale, setScale] = useState(1);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [inputLetter, setInputLetter] = useState("");
  const wheelRef = useRef<HTMLDivElement>(null);

  const sectors = [
    500, 600, 700, 800, 900, 1000,
    "BANKRUPT", "LOSE A TURN",
    250, 400, 350, 750, 950, 1200, 300, 100,
  ];

  const colors = [
    "#FFB703", "#219EBC", "#FB8500", "#8ECAE6",
    "#FFB703", "#219EBC", "#FB8500", "#8ECAE6",
    "#FFB703", "#219EBC", "#FB8500", "#8ECAE6",
    "#FFB703", "#219EBC", "#FB8500", "#8ECAE6",
  ];

  // 🧹 Stop all sounds when leaving
  useEffect(() => {
    return () => {
      timerSound.stop();
      magicalSound.stop();
      transitionSound.stop();
      victorySound.stop();
    };
  }, []);

  const handleSpin = () => {
    if (spinning) return;

    setSpinning(true);
    setSpinResult(null);
    setScale(1.3);
    timerSound.play();

    const spinDuration = 4000;
    const randomIndex = Math.floor(Math.random() * sectors.length);
    const selected = sectors[randomIndex];
    const rotations = 4 + Math.random() * 3;
    const finalAngle = 360 * rotations + (randomIndex * (360 / sectors.length));

    setWheelRotation(finalAngle);

    setTimeout(() => {
      timerSound.stop();
      magicalSound.play();
      setScale(1);
      setSpinning(false);
      setSpinResult(selected);
    }, spinDuration);
  };

  const handleGuess = () => {
    if (!inputLetter || !currentRound) return;
    const letter = inputLetter.toUpperCase();
    setInputLetter("");

    if (revealed.has(letter)) return;

    const inPuzzle = currentRound.puzzle.toUpperCase().includes(letter);
    const newSet = new Set(revealed);

    if (inPuzzle) {
      correctoSound.play();
      newSet.add(letter);
      setRevealed(newSet);
      if (typeof spinResult === "number") {
        const count = currentRound.puzzle
          .toUpperCase()
          .split("")
          .filter((l) => l === letter).length;
        setTotalScore((prev) => prev + spinResult * count);
      }
    } else {
      strikeSound.play();
    }
  };

  const handleSolve = () => {
    if (!currentRound) return;
    setRevealed(new Set(currentRound.puzzle.toUpperCase().replace(/[^A-Z]/g, "").split("")));
    victorySound.play();
  };

  const handleExit = () => {
    timerSound.stop();
    magicalSound.stop();
    transitionSound.stop();
    victorySound.stop();
    onExit();
  };

  const renderPuzzle = () => {
    if (!currentRound) return null;
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {currentRound.puzzle.split("").map((char, i) => {
          const isLetter = /[A-Za-z]/.test(char);
          const revealedChar = revealed.has(char.toUpperCase());
          return (
            <div
              key={i}
              className={`w-10 h-12 flex items-center justify-center border-2 rounded-md text-xl font-bold ${
                isLetter ? "bg-gray-800 border-gray-600" : "border-transparent"
              }`}
            >
              {revealedChar ? char.toUpperCase() : isLetter ? "_" : char}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black text-white flex flex-col items-center justify-center overflow-hidden">
      {/* Exit button */}
      <button
        onClick={handleExit}
        className="absolute top-5 right-6 text-3xl text-gray-300 hover:text-red-400 z-50"
      >
        ✕
      </button>

      {/* Title */}
      <AnimatePresence>
        <motion.h1
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl font-bold text-yellow-400 mb-4 drop-shadow-lg"
        >
          🎡 Wheel of Fortune
        </motion.h1>
      </AnimatePresence>

      <p className="text-lg text-gray-300 mb-2">
        Category: <span className="text-yellow-300">{currentRound?.category}</span>
      </p>
      <p className="text-md text-green-400 mb-4">Total: ${totalScore}</p>

      {renderPuzzle()}

      {/* 🎡 WHEEL */}
      <motion.div
        ref={wheelRef}
        animate={{ rotate: wheelRotation, scale }}
        transition={{ duration: 4, ease: "easeOut" }}
        className="relative mt-10 w-[600px] h-[600px] rounded-full border-[8px] border-yellow-400 overflow-hidden"
      >
        {sectors.map((s, i) => {
          const angle = (360 / sectors.length) * i;
          const bgColor = colors[i % colors.length];
          return (
            <div
              key={i}
              className="absolute w-1/2 h-[50%] origin-bottom left-1/2 top-1/2 flex items-center justify-center text-sm font-bold text-black"
              style={{
                transform: `rotate(${angle}deg) translateX(-50%)`,
                backgroundColor: bgColor,
                clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)",
              }}
            >
              <span
                className="absolute -translate-y-[140px] rotate-[-90deg] text-white text-xs tracking-wide drop-shadow-sm"
                style={{
                  transform: `rotate(${-angle - 90}deg)`,
                  whiteSpace: "nowrap",
                }}
              >
                {typeof s === "number" ? `$${s}` : s}
              </span>
            </div>
          );
        })}
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[20px] border-l-transparent border-r-transparent border-b-yellow-300 transform -translate-x-1/2 -translate-y-4 z-50" />
      </motion.div>

      {/* Results and Controls */}
      <div className="mt-10 text-center">
        {spinResult && (
          <p className="text-3xl mb-4 text-yellow-300 font-bold">
            {typeof spinResult === "number"
              ? `$${spinResult}`
              : spinResult === "BANKRUPT"
              ? "💀 BANKRUPT!"
              : "⏳ LOSE A TURN"}
          </p>
        )}

        <div className="flex justify-center gap-3">
          <button
            onClick={handleSpin}
            disabled={spinning}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded"
          >
            {spinning ? "SPINNING..." : "SPIN 🎡"}
          </button>

          <input
            value={inputLetter}
            onChange={(e) => setInputLetter(e.target.value.toUpperCase())}
            maxLength={1}
            className="bg-gray-800 border border-gray-600 w-12 text-center rounded"
            placeholder="A"
          />
          <button
            onClick={handleGuess}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            GUESS
          </button>

          <button
            onClick={handleSolve}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            SOLVE
          </button>
        </div>
      </div>
    </div>
  );
}
