// src/screens/games/PyramidGame.tsx
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { PyramidGame as PyramidGameType } from "@/types";
import { createSound, failureSound, magicalSound, violinSound } from "@/utils/sound";

interface PyramidGameProps {
  game: PyramidGameType;
  onExit?: () => void;
}

const PyramidGame: React.FC<PyramidGameProps> = ({ game, onExit }) => {
  const questions = game.metadata?.questions || [];
  const [phase, setPhase] = useState<"intro" | "menu" | "play" | "gameover">("intro");
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerInput, setAnswerInput] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lifelines, setLifelines] = useState({
    clue: true,
    phone: true,
    team: true,
  });
  const [timer, setTimer] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 🎵 Sounds
  const soundIntro = createSound("intro.mp3");
  const soundStart = createSound("start.mp3");
  const soundWin = createSound("win.mp3");

  const currentQuestion = questions[currentLevel];
  const isMultiple = currentLevel < 5;

  // 🎬 Intro
  useEffect(() => {
    soundIntro.play();
    const t = setTimeout(() => setPhase("menu"), 4000);
    return () => clearTimeout(t);
  }, []);

  // 🏁 Start Game
  const startGame = () => {
    soundStart.play();
    setPhase("play");
  };

  // ⏱ Timer
  useEffect(() => {
    if (phase !== "play" || gameOver) return;
    const timeLimit = currentLevel < 5 ? 30 : 45;
    setTimer(timeLimit);

    violinSound.play();

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current!);
  }, [currentLevel, phase]);

  const handleTimeout = () => {
    violinSound.stop?.();
    failureSound.play();
    setShowFeedback(true);
    setTimeout(() => {
      setPhase("gameover");
      setGameOver(true);
    }, 1500);
  };

  const handleAnswer = (optionKey?: "a" | "b" | "c") => {
    if (showFeedback || gameOver) return;
    const correctAnswer = currentQuestion.correct;
    const isCorrect = isMultiple
      ? optionKey === correctAnswer
      : answerInput.trim().toLowerCase() === correctAnswer.toLowerCase();

    setShowFeedback(true);
    clearInterval(timerRef.current!);
    violinSound.stop?.();

    if (isCorrect) {
      magicalSound.play();
      const nextScore = score + currentQuestion.value;
      setScore(nextScore);

      setTimeout(() => {
        if (currentLevel + 1 < questions.length) {
          setCurrentLevel((prev) => prev + 1);
          setSelected(null);
          setAnswerInput("");
          setShowFeedback(false);
        } else {
          soundWin.play();
          setPhase("gameover");
          setGameOver(true);
        }
      }, 1500);
    } else {
      failureSound.play();
      setTimeout(() => {
        setPhase("gameover");
        setGameOver(true);
      }, 1500);
    }
  };

  const useLifeline = (type: "clue" | "phone" | "team") => {
    if (!lifelines[type]) return alert("Ya usaste esta ayuda.");
    setLifelines((prev) => ({ ...prev, [type]: false }));
    alert(
      type === "clue"
        ? "🔍 Pista: Analiza bien los términos de la pregunta."
        : type === "phone"
        ? "📞 Un amigo dice: 'Estoy casi seguro que es la opción B.'"
        : "👥 Tu equipo vota por la opción A."
    );
  };

  const restart = () => {
    setPhase("menu");
    setCurrentLevel(0);
    setScore(0);
    setSelected(null);
    setAnswerInput("");
    setShowFeedback(false);
    setGameOver(false);
    setLifelines({ clue: true, phone: true, team: true });
  };

  // 🔹 Intro
  if (phase === "intro") {
    return (
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-black via-[#0a0a1a] to-[#1b2132]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.h1
          className="text-7xl md:text-8xl font-extrabold text-yellow-400 drop-shadow-[0_0_30px_#FFD700]"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2 }}
        >
          PIRÁMIDE DEL CONOCIMIENTO
        </motion.h1>
      </motion.div>
    );
  }

  // 🔹 Menu
  if (phase === "menu") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0e101a] text-center">
        <h2 className="text-5xl text-yellow-400 mb-4 font-bold">
          Bienvenido a la Pirámide del Conocimiento
        </h2>
        <p className="text-gray-400 mb-8 text-lg max-w-xl">
          Supera los 10 niveles de sabiduría. ¡Cada pregunta te acerca a la cima!
        </p>
        <button
          onClick={startGame}
          className="bg-yellow-500 hover:bg-yellow-600 text-black px-10 py-5 text-2xl font-bold rounded-md shadow-lg"
        >
          Comenzar
        </button>
      </div>
    );
  }

  // 🔹 Game Over
  if (phase === "gameover") {
    const victory =
      currentLevel === questions.length - 1 &&
      (selected === currentQuestion.correct ||
        answerInput.trim().toLowerCase() === currentQuestion.correct.toLowerCase());
    return (
      <motion.div
        className="fixed inset-0 flex flex-col items-center justify-center text-center bg-[#0e101a]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h2
          className={`text-6xl font-bold mb-6 ${
            victory ? "text-yellow-400" : "text-red-500"
          }`}
        >
          {victory ? "🏆 ¡Has conquistado la Pirámide!" : "💀 Fin del juego"}
        </h2>
        <p className="text-3xl text-gray-300 mb-8">
          Puntuación total: <span className="font-bold">{score} pts</span>
        </p>
        <div className="flex gap-6">
          <button
            onClick={restart}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-white text-xl"
          >
            Reintentar
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded text-white text-xl"
            >
              Salir
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // 🔹 Game Play
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between bg-gradient-to-b from-[#06080f] via-[#0e101a] to-black overflow-hidden">
      {/* Spotlight */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 50% 60%, #2a3350 0%, #000 90%)",
            "radial-gradient(circle at 50% 40%, #1b2132 0%, #000 90%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
      />

      {/* Pyramid */}
      <div className="relative flex flex-col items-center justify-center flex-1 z-10 mt-8">
        {[...questions].reverse().map((q, idx) => {
          const realIndex = questions.length - 1 - idx;
          const isActive = realIndex === currentLevel;
          const blocks = idx + 1;
          return (
            <div key={idx} className="flex justify-center gap-2 mb-2">
              {Array.from({ length: blocks }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                    opacity: realIndex <= currentLevel ? 1 : 0.5,
                  }}
                  className={`w-24 h-10 rounded-md border text-center flex items-center justify-center font-semibold ${
                    isActive
                      ? "bg-yellow-400 text-black border-yellow-500 shadow-[0_0_25px_#FFD700]"
                      : realIndex < currentLevel
                      ? "bg-green-600 text-white border-green-400"
                      : "bg-[#1b2132] text-gray-400 border-gray-700"
                  }`}
                >
                  {q.value}
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Question Box */}
      <motion.div
        key={currentLevel}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 mb-8 bg-[#1b2132]/90 border border-[#2f3b57] rounded-xl p-6 text-center w-[60%] max-w-2xl shadow-[0_0_25px_rgba(255,215,0,0.2)]"
      >
  {/* Timer with circular animation */}
<div className="absolute -top-10 right-6 flex items-center justify-center">
  <div className="relative w-14 h-14">
    <svg className="transform -rotate-90" viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="#333"
        strokeWidth="8"
        fill="none"
      />
      <motion.circle
        cx="50"
        cy="50"
        r="45"
        stroke={timer <= 10 ? "#ff4444" : "#FFD700"}
        strokeWidth="8"
        fill="none"
        strokeDasharray={2 * Math.PI * 45}
        strokeDashoffset={
          (1 - timer / (currentLevel < 5 ? 30 : 45)) * 2 * Math.PI * 45
        }
        transition={{ duration: 0.9, ease: "linear" }}
      />
    </svg>
    <div
      className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${
        timer <= 10 ? "text-red-500" : "text-yellow-400"
      }`}
    >
      {timer}s
    </div>
  </div>
</div>
        <h3 className="text-xl font-semibold mb-4 text-yellow-300">
          {currentQuestion.question}
        </h3>

        {isMultiple ? (
          <div className="flex flex-col gap-3">
            {(["a", "b", "c"] as const).map((key) => (
              <button
                key={key}
                onClick={() => handleAnswer(key)}
                disabled={showFeedback}
                className={`px-3 py-2 rounded-md border transition-all text-lg ${
                  selected === key
                    ? currentQuestion.correct === key
                      ? "bg-green-600 border-green-400"
                      : "bg-red-600 border-red-400"
                    : "bg-[#151a27] border-gray-700 hover:bg-[#222a3d]"
                }`}
              >
                <span className="text-yellow-400 mr-2">{key.toUpperCase()})</span>
                {currentQuestion.options[key]}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <input
              type="text"
              placeholder="Tu respuesta..."
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              className="bg-[#151a27] border border-gray-700 rounded-md px-3 py-2 w-full text-white text-lg text-center mb-4"
            />
            <div className="flex justify-center gap-3 mb-4">
              {lifelines.clue && (
                <button
                  onClick={() => useLifeline("clue")}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-white text-sm"
                >
                  🔍 Pista
                </button>
              )}
              {lifelines.phone && (
                <button
                  onClick={() => useLifeline("phone")}
                  className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-white text-sm"
                >
                  📞 Llamar
                </button>
              )}
              {lifelines.team && (
                <button
                  onClick={() => useLifeline("team")}
                  className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-white text-sm"
                >
                  👥 Equipo
                </button>
              )}
            </div>
            <button
              onClick={() => handleAnswer()}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-md font-semibold"
            >
              Confirmar
            </button>
          </div>
        )}

        <div className="mt-3 text-sm text-gray-400">
          <p>Nivel: {currentQuestion.level}/10</p>
          <p>Puntuación: {score} pts</p>
        </div>
      </motion.div>
    </div>
  );
};

export default PyramidGame;
