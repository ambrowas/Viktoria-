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
import { useSync } from "@/context/SyncContext";

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

  const { isRemoteMode, sessionData, updateSession } = useSync();
  const lastCommandRef = useRef<number>(Date.now());
  const [pendingCommand, setPendingCommand] = useState<any>(null);

  // ✅ Game state
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [score, setScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const currentPhrase = game.phrases[currentPhraseIndex];
  const phraseText = currentPhrase?.text?.toUpperCase() || "";
  const maxAttempts = game.maxAttempts || 8;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 📡 Broadcast game state to Host
  useEffect(() => {
    if (!isRemoteMode) return;
    updateSession({
      revealedLetters: guessedLetters,
      hangmanErrors: wrongGuesses,
      currentHangmanPhrase: currentPhraseIndex,
    } as any);
  }, [guessedLetters, wrongGuesses, currentPhraseIndex, isRemoteMode, updateSession]);

  // 🎧 Listen for Host Commands
  useEffect(() => {
    if (!isRemoteMode || !sessionData?.hostCommand) return;
    const cmd = sessionData.hostCommand as any;
    
    const ts = cmd.timestamp || 0;
    if (ts > 0 && ts <= lastCommandRef.current) return;
    if (ts > 0) lastCommandRef.current = ts;
    
    setPendingCommand(cmd);
  }, [sessionData?.hostCommand, isRemoteMode]);

  useEffect(() => {
    if (!pendingCommand) return;
    const cmd = pendingCommand;
    
    switch (cmd.type) {
      case 'hangman_toggle_letter': {
        const char = cmd.payload?.char;
        if (!char) break;
        if (guessedLetters.includes(char)) {
            setGuessedLetters(prev => prev.filter(c => c !== char));
        } else {
            handleLetterClick(char);
        }
        break;
      }
      case 'hangman_add_error':
        setWrongGuesses(prev => {
           wrongSound.play();
           return prev + 1;
        });
        break;
      case 'hangman_remove_error':
        setWrongGuesses(prev => Math.max(0, prev - 1));
        break;
      case 'hangman_reset':
        setGuessedLetters([]);
        setWrongGuesses(0);
        setGameStatus("playing");
        setElapsedTime(0);
        setShowHint(false);
        break;
      case 'hangman_reveal_all': {
        const uniqueLetters = Array.from(new Set(phraseText.replace(/[^A-Z]/g, "")));
        setGuessedLetters(prev => Array.from(new Set([...prev, ...uniqueLetters])));
        break;
      }
      case 'hangman_send_hint':
        setShowHint(true);
        // Play small alert accent if hint is shown
        const hintSound = new Audio("/sounds/timer.mp3");
        hintSound.volume = 0.5;
        hintSound.play().catch(() => {});
        setTimeout(() => hintSound.pause(), 1000);
        break;
    }
    
    setPendingCommand(null);
  }, [pendingCommand, guessedLetters, phraseText]);

  // ✅ Timer logic (countdown if hasTimeLimit is true)
  useEffect(() => {
    if (gameStatus !== "playing" || !game.hasTimeLimit) return;

    timerSound.play();

    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => {
        const next = prev + 1;
        if (game.timeLimit && next >= game.timeLimit) {
            setGameStatus("lost");
            loseSound.play();
            if (timerRef.current) clearInterval(timerRef.current);
            timerSound.stop();
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerSound.stop();
    };
  }, [currentPhraseIndex, gameStatus, game.hasTimeLimit, game.timeLimit]);

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
    if (!game.hasTimeLimit || !game.timeLimit) return null;
    
    const remaining = Math.max(0, game.timeLimit - elapsedTime);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    
    return (
      <div className="text-center mb-4">
        <span className={`px-6 py-2 rounded-lg text-xl font-bold shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
           remaining <= 10 ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-800 text-yellow-400'
        }`}>
          ⏱ {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </div>
    );
  };

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

      {/* Category and Hint */}
      <div className="text-center mb-6">
        <span className="bg-yellow-400 text-black px-6 py-2 rounded-lg text-xl font-bold shadow-lg">
          {currentPhrase?.category || "Categoría"}
        </span>
        
        {showHint && currentPhrase?.hint && (
            <div className="mt-4 animate-fade-in">
                <span className="inline-block bg-white/10 border border-white/20 text-white px-8 py-3 rounded-2xl text-lg font-medium italic shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    " {currentPhrase.hint} "
                </span>
            </div>
        )}
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
          className="bg-white/10 px-6 py-3 rounded-xl font-bold border border-white/20 hover:bg-white/20 transition-all shadow-lg"
        >
          Volver
        </button>
      </div>

      {/* 🏆/💀 End Game Overlay */}
      {gameStatus !== "playing" && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in p-8 text-center rounded-3xl m-8 xl:m-20 border border-white/10 shadow-2xl">
          {gameStatus === "won" ? (
            <>
              <h2 className="text-6xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 uppercase tracking-widest drop-shadow-[0_0_20px_rgba(252,163,17,0.5)]">¡Felicidades!</h2>
              <div className="bg-white/10 border border-white/20 px-12 py-6 rounded-3xl mb-8">
                  <p className="text-xl text-slate-300 uppercase tracking-widest font-bold mb-2">Puntaje Final</p>
                  <p className="text-7xl font-black text-white">{score}</p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-6xl font-black mb-6 text-red-500 uppercase tracking-widest drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">¡Juego Terminado!</h2>
              <p className="text-2xl text-slate-300 mb-2 uppercase tracking-widest font-bold">La frase era:</p>
              <p className="text-5xl font-black text-white mb-8 bg-white/10 border border-white/20 px-10 py-5 rounded-3xl w-full max-w-4xl break-words">{phraseText}</p>
              <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl mb-8">
                  <p className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-1">Puntaje Consolidado</p>
                  <p className="text-4xl font-black text-white">{score}</p>
              </div>
            </>
          )}
          <button
            onClick={onExit}
            className="bg-emerald-500 text-black font-black uppercase tracking-widest px-12 py-5 rounded-2xl text-xl hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  );
};

export default HangmanGameWrapper;
