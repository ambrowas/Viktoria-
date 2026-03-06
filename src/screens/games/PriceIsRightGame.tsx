import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PriceIsRightGame } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { magicalSound, strikeSound, violinSound, timerSound } from "@/utils/sound";

interface Props {
  game: PriceIsRightGame;
  onClose?: () => void;
}

export default function PriceIsRightGame({ game, onClose }: Props) {
  const [intro, setIntro] = useState(true);
  const [flashOn, setFlashOn] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [mounted, setMounted] = useState(false);
  const introTimerRef = useRef<number | null>(null);
  const item = game.items[currentItemIndex];

  useEffect(() => setMounted(true), []);

  // ===== AUTO ENTER FULLSCREEN =====
  useEffect(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    }
  }, []);

  // ===== INTRO EFFECT =====
  useEffect(() => {
    magicalSound.setVolume(0.9);
    magicalSound.play();

    let flashes = 0;
    introTimerRef.current = window.setInterval(() => {
      setFlashOn((f) => !f);
      flashes++;
      if (flashes >= 16) {
        clearInterval(introTimerRef.current!);
        setFlashOn(false);
        setIntro(false);
      }
    }, 300);

    return () => {
      if (introTimerRef.current) clearInterval(introTimerRef.current);
    };
  }, []);

  // ===== BACKGROUND TIMER SOUND =====
  useEffect(() => {
    if (!intro) {
      timerSound.setVolume(0.4);
      timerSound.play();
    }
    return () => timerSound.stop();
  }, [intro]);

  // ===== CLOSE HANDLER =====
  function handleExit() {
    timerSound.stop();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    }
    if (onClose) onClose();
  }

  // ===== REVEAL PRICE =====
  function handleReveal() {
    if (!item || !guess || revealed) return;

    const actual = item.actualPrice || 0;
    const numericGuess = parseFloat(guess);
    if (isNaN(numericGuess)) return;

    setRevealed(true);
    violinSound.play();

    const diff = Math.abs(actual - numericGuess);
    let points = 0;
    if (numericGuess <= actual) {
      if (diff <= 10) points = 120;
      else if (diff <= 50) points = 90;
      else if (diff <= 100) points = 60;
      else if (diff <= 200) points = 30;
    }

    setTimeout(() => {
      if (points > 0) magicalSound.play();
      else strikeSound.play();
      setScore((s) => s + points);
    }, 1200);

    setTimeout(() => {
      if (currentItemIndex < game.items.length - 1) {
        setCurrentItemIndex((i) => i + 1);
        setGuess("");
        setRevealed(false);
      } else {
        timerSound.stop();
        alert(`🎉 Game Over! Final Score: ${score + points}`);
        handleExit();
      }
    }, 3500);
  }

  if (!item) return null;

  return (
    <>
      {/* ✅ Portal for X button */}
      {mounted &&
        createPortal(
          <button
            onClick={handleExit}
            className="fixed top-6 right-8 z-[9999999] text-white text-5xl font-extrabold bg-black/50 px-4 py-1 rounded-full border border-white hover:text-red-500 cursor-pointer"
          >
            ✕
          </button>,
          document.body
        )}

      <div className="fixed inset-0 bg-black text-white flex items-center justify-center z-[10000] overflow-hidden">
        {/* INTRO OVERLAY */}
        <AnimatePresence>
          {intro && (
            <motion.div
              key="intro"
              className="absolute inset-0 flex items-center justify-center bg-black z-[10001] pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute inset-0"
                animate={{ opacity: flashOn ? 0.9 : 0 }}
                transition={{ duration: 0.15 }}
                style={{ backgroundColor: "white" }}
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="relative text-center"
              >
                <h1 className="text-7xl font-extrabold drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                  💵 THE PRICE IS RIGHT 💵
                </h1>
                <p className="mt-6 text-3xl text-gray-300">Get ready to guess & win!</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN GAME */}
        {!intro && (
          <motion.div
            className="relative z-[10002] bg-gray-900 border-[6px] border-yellow-400 rounded-2xl shadow-[0_0_60px_rgba(255,255,255,0.4)] flex flex-col md:flex-row items-center justify-center p-10 w-[90vw] max-w-[1600px] min-h-[80vh]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* IMAGE SIDE */}
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-[50%] h-[500px] object-cover rounded-xl border border-gray-700 mr-10"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://placehold.co/600x400/1e293b/ffffff?text=Imagen+no+disponible";
                }}
              />
            )}

            {/* TEXT SIDE */}
            <div className="flex flex-col justify-center items-center w-[45%] text-center">
              <h2 className="text-5xl font-extrabold mb-4">💵 The Price Is Right!</h2>
              <p className="text-gray-300 mb-8 text-xl">
                Guess the price — without going over!
              </p>

              <h3 className="text-3xl font-bold mb-2">{item.name}</h3>
              <p className="text-gray-400 mb-6">{item.description}</p>

              {!revealed ? (
                <>
                  <input
                    type="number"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    className="w-64 text-center text-2xl p-3 rounded-lg bg-gray-800 border border-gray-600 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-white"
                    placeholder="Enter your guess ($)"
                  />
                  <button
                    onClick={handleReveal}
                    className="bg-yellow-400 text-black text-2xl font-bold px-10 py-4 rounded-xl hover:bg-yellow-500 transition-transform hover:scale-105"
                  >
                    Reveal Price
                  </button>
                </>
              ) : (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="mt-4"
                >
                  <p className="text-xl text-gray-300 mb-1">Actual Price</p>
                  <motion.p
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: [0.7, 1.2, 1], opacity: 1 }}
                    transition={{ type: "spring", stiffness: 180, damping: 12 }}
                    className="text-5xl font-extrabold text-green-400 mb-3"
                  >
                    ${item.actualPrice?.toFixed(2)}
                  </motion.p>
                  <p className="text-2xl text-white font-semibold">
                    Your Guess: ${Number(guess).toFixed(2)}
                  </p>
                </motion.div>
              )}

              <div className="flex justify-between mt-10 w-full text-gray-300 text-lg">
                <span>
                  Item {currentItemIndex + 1} / {game.items.length}
                </span>
                <span className="text-green-400 font-bold">Score: {score}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
