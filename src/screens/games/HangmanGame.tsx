import React, { useState, useEffect, useRef } from "react";
import { HangmanGame as HangmanGameType } from "@/types";
import confetti from "canvas-confetti";
import {
  correctSound,
  wrongSound,
  winSound,
  loseSound,
  timerSound,
} from "@/utils/sound";

interface HangmanGameWrapperProps {
  game: HangmanGameType;
  onExit: () => void;
}

const HangmanGameWrapper: React.FC<HangmanGameWrapperProps> = ({
  game,
  onExit,
}) => {
  // ✅ Defensive guard in case of missing or bad data
  if (!game || !Array.isArray(game.phrases) || game.phrases.length === 0) {
    console.warn("⚠️ HangmanGameWrapper: game invalid or missing", game);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <h2 className="text-3xl font-bold mb-3">Cargando el juego...</h2>
        <p className="text-gray-400 mb-4">
          Esperando datos de Firestore o el enrutador.
        </p>
        <button
          onClick={onExit}
          className="mt-2 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
        >
          Volver
        </button>
      </div>
    );
  }

  // ✅ Game state
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [score, setScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [elapsedTime, setElapsedTime] = useState(0);

  const currentPhrase = game.phrases[currentPhraseIndex];
  const phraseText = currentPhrase?.text?.toUpperCase() || "";
  const maxAttempts = game.maxAttempts || 8;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ Timer logic (counts UP)
  useEffect(() => {
    if (gameStatus !== "playing") return;

    timerSound.play();

    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerSound.stop();
    };
  }, [currentPhraseIndex, gameStatus]);

  // ✅ Win / Lose logic
  useEffect(() => {
    if (!currentPhrase) return;

    const uniqueLetters = Array.from(
      new Set(phraseText.replace(/[^A-Z]/g, ""))
    );
    const allGuessed = uniqueLetters.every((l) => guessedLetters.includes(l));

    if (allGuessed) {
      if (currentPhraseIndex === game.phrases.length - 1) {
        setGameStatus("won");
        winSound.play();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      } else {
        setScore((prev) => prev + (maxAttempts - wrongGuesses) * 10);
        setCurrentPhraseIndex((prev) => prev + 1);
        setGuessedLetters([]);
        setWrongGuesses(0);
        setElapsedTime(0);
      }
    }

    if (wrongGuesses >= maxAttempts) {
      setGameStatus("lost");
      loseSound.play();
    }
  }, [guessedLetters, wrongGuesses]);

  // ✅ Handle letter clicks
  const handleLetterClick = (letter: string) => {
    if (gameStatus !== "playing" || guessedLetters.includes(letter)) return;

    setGuessedLetters((prev) => [...prev, letter]);

    if (phraseText.includes(letter)) {
      correctSound.play();
    } else {
      wrongSound.play();
      setWrongGuesses((prev) => prev + 1);
    }
  };

  // ✅ Timer renderer
  const renderTimer = () => {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    return (
      <div className="text-center mb-4">
        <span className="bg-gray-800 text-yellow-400 px-4 py-2 rounded-lg text-lg font-bold">
          ⏱ {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </div>
    );
  };

  // 🏆 Win screen
  if (gameStatus === "won") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white z-50">
        <h2 className="text-5xl font-bold mb-4">🎉 ¡Felicidades! 🎉</h2>
        <p className="text-2xl mb-6">Puntaje Final: {score}</p>
        <button
          onClick={onExit}
          className="bg-blue-600 text-white px-8 py-4 rounded-lg text-xl hover:bg-blue-700"
        >
          Salir
        </button>
      </div>
    );
  }

  // 💀 Lose screen
  if (gameStatus === "lost") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white z-50">
        <h2 className="text-5xl font-bold mb-4 text-red-500">¡Juego Terminado! 😢</h2>
        <p className="text-2xl mb-2">La frase era:</p>
        <p className="text-3xl font-bold mb-6">{phraseText}</p>
        <p className="text-xl mb-6">Puntaje: {score}</p>
        <button
          onClick={onExit}
          className="bg-gray-600 text-white px-8 py-4 rounded-lg text-xl hover:bg-gray-700"
        >
          Salir
        </button>
      </div>
    );
  }

  // 🎮 Main game screen
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white flex flex-col p-8 z-40">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold">🎤 Hangman Show</h2>
        <div className="text-right">
          <p className="text-xl">Puntaje: {score}</p>
          <p className="text-red-400">
            Errores: {wrongGuesses}/{maxAttempts}
          </p>
        </div>
      </div>

      {/* Timer */}
      {renderTimer()}

      {/* Category */}
      <div className="text-center mb-6">
        <span className="bg-yellow-400 text-black px-6 py-2 rounded-lg text-xl font-bold shadow-lg">
          {currentPhrase?.category || "Categoría"}
        </span>
      </div>

      {/* Phrase */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {phraseText.split("").map((char, i) => {
          if (char === " ") return <div key={i} className="w-6"></div>;
          const guessed = guessedLetters.includes(char);
          return (
            <div
              key={i}
              className={`w-14 h-20 flex items-center justify-center text-3xl font-bold rounded-lg shadow-lg border-4 transition-all duration-300 ${
                guessed
                  ? "bg-green-500 text-white scale-110"
                  : "bg-gray-800 text-transparent"
              }`}
            >
              {char}
            </div>
          );
        })}
      </div>

      {/* Keyboard */}
      <div className="grid grid-cols-9 gap-3 mt-6 mx-auto">
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
          <button
            key={letter}
            onClick={() => handleLetterClick(letter)}
            disabled={
              guessedLetters.includes(letter) || gameStatus !== "playing"
            }
            className={`w-12 h-12 text-xl font-bold rounded-lg shadow-md transition-all ${
              guessedLetters.includes(letter)
                ? phraseText.includes(letter)
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
                : "bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white"
            } disabled:opacity-50`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Exit button */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={onExit}
          className="bg-gray-600 px-6 py-3 rounded-lg hover:bg-gray-700"
        >
          Salir
        </button>
      </div>
    </div>
  );
};

export default HangmanGameWrapper;
