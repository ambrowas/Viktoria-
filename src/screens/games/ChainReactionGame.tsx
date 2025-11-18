import React, { useState, useEffect, useRef } from "react";
import { ChainReactionGame, ChainRound } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

// ✅ Sound assets
import timerSound from "/sounds/timer.mp3";
import strikeSound from "/sounds/strike.mp3";
import correctoSound from "/sounds/correcto.mp3";
import winSound from "/sounds/win.mp3";

interface ChainReactionGameScreenProps {
  game: ChainReactionGame;
  onExit: () => void;
}

const ChainReactionGameScreen: React.FC<ChainReactionGameScreenProps> = ({
  game,
  onExit,
}) => {
  const { lang } = useLanguage();

  const t = {
    en: {
      title: "Chain Reaction",
      nextRound: "Next Round",
      revealLink: "Reveal Link",
      timesUp: "Time’s Up!",
      back: "Back to Library",
      timeOverlay: "TIME’S UP!",
      teamA: "Team A",
      teamB: "Team B",
      switchTeam: "Switch Team",
      winner: "Winner",
      tie: "It’s a Tie!",
      finalStats: "Final Results",
      round: "Round",
      total: "Total Score",
      playAgain: "Play Again",
    },
    es: {
      title: "Reacción en Cadena",
      nextRound: "Siguiente Ronda",
      revealLink: "Revelar Enlace",
      timesUp: "¡Tiempo!",
      back: "Volver a la Biblioteca",
      timeOverlay: "¡TIEMPO!",
      teamA: "Equipo A",
      teamB: "Equipo B",
      switchTeam: "Cambiar de Equipo",
      winner: "Ganador",
      tie: "¡Empate!",
      finalStats: "Resultados Finales",
      round: "Ronda",
      total: "Puntuación Total",
      playAgain: "Jugar de Nuevo",
    },
  }[lang];

  // ===== STATE =====
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [revealedLinks, setRevealedLinks] = useState(1);
  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(true);
  const [showTimeOverlay, setShowTimeOverlay] = useState(false);
  const [roundTransitioning, setRoundTransitioning] = useState(false);
  const [showFinalStats, setShowFinalStats] = useState(false);
  const [winner, setWinner] = useState<"A" | "B" | "TIE" | null>(null);

  const [activeTeam, setActiveTeam] = useState<"A" | "B">("A");
  const [scores, setScores] = useState({ A: 0, B: 0 });
  const [roundScores, setRoundScores] = useState<{ A: number; B: number }[]>([]);

  // ===== AUDIO REFS =====
  const timerRef = useRef<HTMLAudioElement | null>(null);
  const strikeRef = useRef<HTMLAudioElement | null>(null);
  const correctoRef = useRef<HTMLAudioElement | null>(null);
  const winRef = useRef<HTMLAudioElement | null>(null);

  const currentRound: ChainRound = game.rounds[currentRoundIndex];

  // ===== TIMER =====
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      const countdown = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(countdown);
    } else if (timeLeft === 0) {
      setTimerActive(false);
      strikeRef.current?.play();
      setShowTimeOverlay(true);
      setTimeout(() => setShowTimeOverlay(false), 2000);
    }
  }, [timeLeft, timerActive]);

  // ===== AUDIO SETUP =====
  useEffect(() => {
    if (!timerRef.current) {
      timerRef.current = new Audio(timerSound);
      timerRef.current.loop = true;
    }
    if (!strikeRef.current) strikeRef.current = new Audio(strikeSound);
    if (!correctoRef.current) correctoRef.current = new Audio(correctoSound);
    if (!winRef.current) winRef.current = new Audio(winSound);

    timerRef.current.volume = 0.5;
    strikeRef.current.volume = 0.8;
    correctoRef.current.volume = 0.5;
    winRef.current.volume = 0.7;

    timerRef.current.currentTime = 0;
    timerRef.current.play().catch(() => null);

    return () => {
      timerRef.current?.pause();
      strikeRef.current?.pause();
      correctoRef.current?.pause();
      winRef.current?.pause();
    };
  }, [currentRoundIndex]);

  // ===== HANDLERS =====
  const revealNextLink = () => {
    if (revealedLinks < currentRound.chain.length) {
      const next = currentRound.chain[revealedLinks];
      setRevealedLinks((r) => r + 1);
      correctoRef.current?.play(); // ✅ correcto.mp3 for reveals
      setScores((s) => ({
        ...s,
        [activeTeam]: s[activeTeam] + (next?.points || 0),
      }));
    } else {
      setTimerActive(false);
      timerRef.current?.pause();
    }
  };

  const handleNextRound = () => {
    setRoundScores((prev) => [...prev, { A: scores.A, B: scores.B }]);

    if (currentRoundIndex < game.rounds.length - 1) {
      setRoundTransitioning(true);
      timerRef.current?.pause();
      setTimeout(() => {
        setCurrentRoundIndex((i) => i + 1);
        setRevealedLinks(1);
        setTimeLeft(20);
        setTimerActive(true);
        setRoundTransitioning(false);
        timerRef.current?.play().catch(() => null);
      }, 800);
    } else {
      let winnerTeam: "A" | "B" | "TIE" = "TIE";
      if (scores.A > scores.B) winnerTeam = "A";
      else if (scores.B > scores.A) winnerTeam = "B";
      setWinner(winnerTeam);
      setShowFinalStats(true);
      winRef.current?.play(); // ✅ win.mp3 at the end
    }
  };

  const handleTimesUp = () => {
    setTimerActive(false);
    setTimeLeft(0);
    timerRef.current?.pause();
    strikeRef.current?.play();
    setShowTimeOverlay(true);
    setTimeout(() => setShowTimeOverlay(false), 2000);
  };

  const switchTeam = () => setActiveTeam(activeTeam === "A" ? "B" : "A");

  const resetGame = () => {
    setScores({ A: 0, B: 0 });
    setRoundScores([]);
    setCurrentRoundIndex(0);
    setRevealedLinks(1);
    setWinner(null);
    setShowFinalStats(false);
    setTimeLeft(20);
    setTimerActive(true);
  };

  // ===== FINAL STATS SCREEN =====
  if (showFinalStats) {
    return (
      <div className="relative flex flex-col items-center justify-center h-full bg-gradient-to-b from-[#000a12] to-[#001b33] text-white">
        <h1 className="text-5xl font-extrabold text-yellow-400 drop-shadow-lg mb-8 animate-fadeIn">
          {t.finalStats}
        </h1>

        <div className="w-full max-w-3xl bg-black/40 p-6 rounded-xl shadow-lg backdrop-blur-sm">
          <table className="w-full text-center text-lg">
            <thead>
              <tr className="text-yellow-300 border-b border-gray-700">
                <th className="py-3">{t.round}</th>
                <th>{t.teamA}</th>
                <th>{t.teamB}</th>
              </tr>
            </thead>
            <tbody>
              {roundScores.map((r, i) => (
                <tr key={i} className="border-b border-gray-700">
                  <td className="py-2 text-gray-300">{i + 1}</td>
                  <td className="text-green-400">{r.A}</td>
                  <td className="text-blue-400">{r.B}</td>
                </tr>
              ))}
              <tr className="font-bold text-2xl text-yellow-400 border-t border-yellow-500">
                <td className="py-3">{t.total}</td>
                <td>{scores.A}</td>
                <td>{scores.B}</td>
              </tr>
            </tbody>
          </table>

          <div className="text-center mt-8">
            <h2 className="text-4xl font-extrabold text-yellow-400 animate-glow">
              {winner === "TIE"
                ? t.tie
                : `${t.winner}: ${winner === "A" ? t.teamA : t.teamB}`}
            </h2>
          </div>

          <div className="flex justify-center gap-6 mt-10">
            <button
              onClick={resetGame}
              className="bg-green-500 hover:bg-green-600 text-black px-8 py-3 rounded-lg font-bold transition"
            >
              {t.playAgain}
            </button>
            <button
              onClick={onExit}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-8 py-3 rounded-lg font-bold transition"
            >
              {t.back}
            </button>
          </div>
        </div>

        <style>{`
          .animate-glow {
            animation: glowPulse 1.5s ease-in-out infinite alternate;
          }
          @keyframes glowPulse {
            from { text-shadow: 0 0 10px gold, 0 0 20px gold; }
            to { text-shadow: 0 0 30px orange, 0 0 50px gold; }
          }
        `}</style>
      </div>
    );
  }

  // ===== MAIN GAMEPLAY =====
  return (
    <div className="relative flex flex-col items-center justify-center h-full text-white bg-gradient-to-b from-[#001220] via-[#00213a] to-[#000a12] overflow-hidden transition-all duration-700">
      {showTimeOverlay && (
        <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center text-6xl font-extrabold animate-pulse z-50">
          {t.timeOverlay}
        </div>
      )}

      {/* SCOREBOARD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-10 text-center text-white font-bold">
        <div
          className={`px-6 py-2 rounded-lg border-2 ${
            activeTeam === "A"
              ? "border-yellow-400 bg-yellow-900/40"
              : "border-gray-600"
          }`}
        >
          {t.teamA}: <span className="text-yellow-300">{scores.A}</span>
        </div>
        <div
          className={`px-6 py-2 rounded-lg border-2 ${
            activeTeam === "B"
              ? "border-yellow-400 bg-yellow-900/40"
              : "border-gray-600"
          }`}
        >
          {t.teamB}: <span className="text-yellow-300">{scores.B}</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div
        className={`transition-opacity duration-700 ${
          roundTransitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        <h1 className="text-5xl font-extrabold mb-4 tracking-wide text-yellow-400 drop-shadow-lg">
          {t.title}
        </h1>

        <div className="text-lg mb-2 text-gray-300">
          {lang === "en" ? "Round" : "Ronda"} {currentRoundIndex + 1}:
          <span className="ml-2 text-cyan-400 font-semibold">
            {currentRound.theme}
          </span>
        </div>

        {/* TIMER */}
        <div
          className={`text-3xl font-bold mb-6 transition-all duration-300 ${
            timeLeft <= 5
              ? "text-red-500 animate-pulse scale-110"
              : "text-green-400"
          }`}
        >
          ⏱ {timeLeft}s
        </div>

        {/* CHAIN */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 text-center">
          {currentRound.chain.map((q, i) => (
            <div
              key={q.id}
              className={`p-4 rounded-xl border-2 shadow-lg transition-all duration-500 ease-in-out transform ${
                i < revealedLinks
                  ? "bg-[#4b5320] text-white border-green-600 scale-105 shadow-green-600/40 animate-revealPulse"
                  : "bg-gray-800 text-gray-500 border-gray-600"
              }`}
            >
              <div className="text-lg font-semibold">{q.prompt || "???"}</div>
              {i < revealedLinks && (
                <div className="text-sm text-yellow-400 mt-1 font-bold">
                  {q.answer}
                </div>
              )}
              {i < revealedLinks && q.linkHint && (
                <div className="text-xs text-gray-300 italic mt-1">
                  {q.linkHint}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={revealNextLink}
            disabled={revealedLinks >= currentRound.chain.length}
            className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-bold text-black transition disabled:opacity-40"
          >
            {t.revealLink}
          </button>

          <button
            onClick={handleTimesUp}
            className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-bold text-white transition"
          >
            {t.timesUp}
          </button>

          <button
            onClick={handleNextRound}
            className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-bold text-white transition"
          >
            {t.nextRound}
          </button>

          <button
            onClick={switchTeam}
            className="bg-yellow-400 hover:bg-yellow-500 px-6 py-3 rounded-lg font-bold text-black transition"
          >
            {t.switchTeam}
          </button>
        </div>
      </div>

      <button
        onClick={onExit}
        className="absolute bottom-6 right-6 text-gray-400 hover:text-white text-sm underline"
      >
        {t.back}
      </button>
      <style>{`
  /* =====================================
     VIKTORIA FORM FIX — LIGHT TEXT → BLACK
     ===================================== */

  input,
  textarea,
  select {
    background-color: #ffffff !important; /* white background */
    color: #000000 !important; /* ✅ dark black text */
    border: 1px solid #ccc !important;
    border-radius: 0.5rem;
    padding: 0.5rem;
    transition: background-color 0.2s, border-color 0.2s;
  }

  input::placeholder,
  textarea::placeholder {
    color: #444444 !important; /* darker gray placeholders */
  }

  input:hover,
  textarea:hover,
  select:hover {
    background-color: #f9fafb !important; /* subtle hover tone */
    border-color: #999 !important;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: 2px solid #2563eb !important; /* Tailwind blue-600 */
    outline-offset: 2px;
  }

  /* Remove any dark overrides */
  .dark input,
  .dark textarea,
  .dark select {
    background-color: #ffffff !important;
    color: #000000 !important;
    border: 1px solid #ccc !important;
  }

  /* Ensure buttons and icons stay visible */
  button svg {
    color: inherit;
  }
`}</style>
      <style>{`
        @keyframes revealPulse {
          0% { box-shadow: 0 0 0 rgba(255,215,0,0); transform: scale(0.95); }
          50% { box-shadow: 0 0 25px rgba(255,215,0,0.6); transform: scale(1.05); }
          100% { box-shadow: 0 0 0 rgba(255,215,0,0); transform: scale(1); }
        }
        .animate-revealPulse { animation: revealPulse 1s ease-in-out; }
      `}</style>
    </div>
  );
};

export default ChainReactionGameScreen;
