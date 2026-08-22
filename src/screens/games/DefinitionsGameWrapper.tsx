import React, { useEffect, useState, useRef } from "react";
import { DefinitionsGame } from "@/types";
import { magicalSound, failureSound, winSound } from "@/utils/sound";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useSync } from "@/context/SyncContext";
import WebcamFeed from "@/components/WebcamFeed";
import DefinitionsController from "@/screens/host/controllers/DefinitionsController";

interface DefinitionsGameWrapperProps {
  game: DefinitionsGame;
  onExit: (points?: Record<string, number>) => void;
  isViewer?: boolean;
  teams?: any[];
}

const GAME_TIME = 90; // total seconds

const DefinitionsGameWrapper: React.FC<DefinitionsGameWrapperProps> = ({
  game,
  onExit,
  isViewer = false,
  teams = [],
}) => {
  const gameData = game;
  const { sessionData: remoteSessionData, isRemoteMode, updateSession } = useSync();
  const [localSessionData, setLocalSessionData] = useState<any>(null);

  // Sync localSessionData with remoteSessionData when in remote mode
  useEffect(() => {
    if (isRemoteMode) {
      setLocalSessionData(remoteSessionData);
    }
  }, [remoteSessionData, isRemoteMode]);

  // TV receiver for local manual mode
  useEffect(() => {
    if (!isViewer || isRemoteMode) return;
    const tvBc = new BroadcastChannel('viktoria-definitions-sync');
    tvBc.onmessage = (event) => {
      const { type, ...data } = event.data;
      if (type === 'STATE_UPDATE') {
        setLocalSessionData((prev: any) => ({
          ...(prev || {}),
          ...data,
        }));
      }
    };
    return () => tvBc.close();
  }, [isViewer, isRemoteMode]);

  const sessionData = localSessionData;
  const clues = sessionData?.shuffledClues || gameData.clues || [];
  const lastCommandRef = useRef<number>(Date.now());

  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [revealed, setRevealed] = useState<{ [key: string]: boolean }>({});
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  // Derived score: 1000 points per correct definition, +10000 bonus if all are correct
  const correctCount = Object.values(revealed).filter(Boolean).length;
  const totalClues = clues.length;
  const isFinishedAndAllCorrect = totalClues > 0 && correctCount === totalClues;
  const score = (correctCount * 1000) + (isFinishedAndAllCorrect ? 10000 : 0);

  // 📡 Listen for Host Commands (Remote and Local)
  useEffect(() => {
    if (!isViewer) return;
    if (!sessionData?.hostCommand) return;
    const cmd = sessionData.hostCommand as any;
    
    const ts = cmd.timestamp || 0;
    if (ts > 0 && ts <= lastCommandRef.current) return;
    if (ts > 0) lastCommandRef.current = ts;
    
    if (cmd.type === "definition_correct") {
      const idx = cmd.payload?.index;
      if (idx !== undefined && clues?.[idx]) {
        const clue = clues[idx];
        magicalSound.play();
        setRevealed((prev) => ({ ...prev, [clue.id]: true }));
      }
    } else if (cmd.type === "definition_wrong") {
      failureSound.play();
    }
  }, [sessionData?.hostCommand, clues, isViewer]);

  // 🔄 Reset when the host resets the session
  useEffect(() => {
    if (!isViewer) return;
    if (sessionData?.currentDefinitionIndex === 0 || sessionData?.resetTrigger) {
      setRevealed({});
      setGameOver(false);
      setHasWon(false);
      setTimeLeft(GAME_TIME);
    }
  }, [sessionData?.currentDefinitionIndex, sessionData?.resetTrigger, isViewer]);

  // 🎵 Sounds (Refs to avoid memory leaks on re-renders)
  const timerAudioRef = useRef<HTMLAudioElement | null>(null);
  const loseAudioRef = useRef<HTMLAudioElement | null>(null);
  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);

  if (!timerAudioRef.current) {
    const audio = new Audio(`${import.meta.env.BASE_URL}sounds/timer.mp3`);
    audio.loop = true;
    timerAudioRef.current = audio;
  }
  if (!loseAudioRef.current) {
    loseAudioRef.current = new Audio(`${import.meta.env.BASE_URL}sounds/lose.mp3`);
  }
  if (!victoryAudioRef.current) {
    victoryAudioRef.current = new Audio(`${import.meta.env.BASE_URL}sounds/victory.mp3`);
  }

  const timerAudio = timerAudioRef.current;
  const loseAudio = loseAudioRef.current;
  const victoryAudio = victoryAudioRef.current;

  // 🔊 Synchronize Volume
  const volume = sessionData?.gameVolume !== undefined ? sessionData.gameVolume : 0.5;
  useEffect(() => {
    if (!isViewer) return;
    timerAudio.volume = volume * 0.4;
    loseAudio.volume = volume;
    victoryAudio.volume = volume;

    if (magicalSound.setVolume) magicalSound.setVolume(volume);
    if (failureSound.setVolume) failureSound.setVolume(volume);
    if (winSound.setVolume) winSound.setVolume(volume);
  }, [volume, timerAudio, loseAudio, victoryAudio, isViewer]);

  // ⏸ Pause State (Remote and Local)
  const isPaused = !!sessionData?.isPaused;

  // 🕒 Timer
  useEffect(() => {
    if (!isViewer) return;
    if (gameOver || isPaused) {
      timerAudio.pause();
      return;
    }

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
  }, [gameOver, hasWon, isPaused, timerAudio, loseAudio, isViewer]);

  // 📷 Handle available camera devices registration
  const handleDevicesFound = (devices: { id: string; label: string }[]) => {
    if (!isViewer) return;
    if (isRemoteMode) {
      const currentListStr = JSON.stringify(remoteSessionData?.availableCameras || []);
      const newListStr = JSON.stringify(devices);
      if (currentListStr !== newListStr) {
        updateSession({ availableCameras: devices });
      }
    } else {
      const bc = new BroadcastChannel('viktoria-definitions-sync');
      bc.postMessage({ type: 'CAMERAS_UPDATE', availableCameras: devices });
      bc.close();
    }
  };

  // 🏁 Win detection
  useEffect(() => {
    if (!isViewer) return;
    if (!clues?.length) return;

    const allRevealed = clues.every((clue) => revealed[clue.id]);
    if (allRevealed && !hasWon) {
      setHasWon(true);
      setGameOver(true);
      timerAudio.pause();
      victoryAudio.play().catch(() => {});
      winSound.play();
      confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
    }
  }, [revealed, clues, hasWon, isViewer]);

  // 📡 Broadcast timer, score, and game over states back to the host controller
  useEffect(() => {
    if (!isViewer) return;
    const correctCount = Object.values(revealed).filter(Boolean).length;
    if (isRemoteMode) {
      updateSession({ timeLeft, gameOver, hasWon, score, correctCount });
    } else {
      const bc = new BroadcastChannel('viktoria-definitions-sync');
      bc.postMessage({ type: 'TIMER_UPDATE', timeLeft, gameOver, hasWon, score, correctCount });
      bc.close();
    }
  }, [timeLeft, gameOver, hasWon, score, revealed, isViewer, isRemoteMode]);

  // 🎯 Reveal a word
  const handleCardDoubleClick = (id: string) => {
    if (gameOver || revealed[id]) return;
    magicalSound.play();
    setRevealed((prev) => ({ ...prev, [id]: true }));
  };

  if (!isViewer) {
    return (
      <DefinitionsController
        game={game}
        sessionData={sessionData || {}}
        updateSession={updateSession}
        onExit={onExit}
        teams={teams}
      />
    );
  }

  // Active Player and Team names resolved from session or game configuration
  const activePlayerName = sessionData?.playerName !== undefined ? sessionData.playerName : gameData.playerName;
  const activePlayerTeamName = sessionData?.playerTeamName !== undefined ? sessionData.playerTeamName : gameData.playerTeamName;

  return (
    <div className="fixed inset-0 bg-[#0a0f1f] flex flex-col items-center justify-between text-white overflow-hidden p-6">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-4 px-6 py-4 bg-slate-900/60 border border-white/5 rounded-3xl premium-glass">
        <h2 className="text-5xl font-black text-white shrink-0">
          ⏱{" "}
          <span className={timeLeft <= 10 ? "text-red-500" : "text-green-400"}>
            {timeLeft}s
          </span>
        </h2>

        {/* Visual Counter */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">PROGRESO</span>
          <h3 className="text-4xl font-extrabold text-[#fca311] drop-shadow-md">
            🎯 {correctCount} / {totalClues}
          </h3>
        </div>

        <h3 className="text-4xl font-black text-yellow-400 shrink-0">Score: {score}</h3>
      </div>

      {/* Main Game Area */}
      <div className="flex flex-1 w-full items-center justify-center gap-10">
        {/* Player / Character */}
        <div className="flex-1 flex flex-col justify-center items-center gap-4">
          <WebcamFeed
            selectedDeviceId={sessionData?.selectedCameraId}
            onDevicesFound={handleDevicesFound}
            circular={true}
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

          {(activePlayerName || activePlayerTeamName) && (
            <div className="text-center space-y-1 mt-2">
              {activePlayerName && (
                <h4 className="text-3xl font-black uppercase tracking-wide text-white drop-shadow-md">
                  {activePlayerName}
                </h4>
              )}
              {activePlayerTeamName && (
                <span className="inline-block bg-[#fca311] text-black text-xs font-black uppercase px-4 py-1.5 rounded-full tracking-widest shadow-md border border-yellow-400/20">
                  {activePlayerTeamName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Definitions List */}
        <div className="flex flex-col gap-4 flex-1 max-w-md">
          {clues?.map((clue, idx) => {
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
                  backgroundColor: isRevealed ? "#15803d" : "#1e293b",
                  borderColor: isRevealed ? "#22c55e" : "#2563eb",
                }}
                transition={{ duration: 0.4 }}
                className="cursor-pointer rounded-lg p-4 text-center border-2 text-xl relative overflow-hidden"
              >
                {isRevealed ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-white text-3xl font-extrabold"
                    >
                      {clue.word.toUpperCase()}
                    </motion.span>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="text-emerald-100 italic text-sm"
                    >
                    {clue.definition}
                    </motion.p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-2">
                    <span className="text-blue-400 text-4xl font-extrabold tracking-wider">{prefix}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-6">
        <button
          onClick={() => {
            const teamId = sessionData?.playerTeamId || gameData.playerTeamId;
            if (teamId) {
              onExit({ [teamId]: score });
            } else {
              onExit();
            }
          }}
          className="bg-red-600 text-white px-8 py-4 rounded-lg text-2xl hover:bg-red-700 border-4 border-black"
        >
          Exit Game
        </button>
      </div>

      {/* 🏆 Win Overlay */}
      {hasWon && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            const teamId = sessionData?.playerTeamId || gameData.playerTeamId;
            if (teamId) {
              onExit({ [teamId]: score });
            } else {
              onExit();
            }
          }}
        >
          <div className="text-center space-y-6">
            <motion.h1
              className="text-7xl font-extrabold text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,0.4)]"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              🎉 ¡COMPLETADO! 🎉
            </motion.h1>
            <p className="text-slate-300 text-2xl font-bold uppercase tracking-wider">
              Puntuación Final: <span className="text-yellow-400 font-black">{score} pts</span>
            </p>
            <p className="text-[#fca311] text-xs font-black uppercase tracking-[0.3em] animate-pulse">
              Incluye +10.000 Puntos de Bonus
            </p>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block pt-8 animate-bounce">
              Haz clic para Salir
            </span>
          </div>
        </motion.div>
      )}

      {/* ❌ Game Over Overlay */}
      {gameOver && !hasWon && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            const teamId = sessionData?.playerTeamId || gameData.playerTeamId;
            if (teamId) {
              onExit({ [teamId]: score });
            } else {
              onExit();
            }
          }}
        >
          <div className="text-center space-y-6">
            <motion.h1
              className="text-6xl font-extrabold text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ⏰ ¡TIEMPO AGOTADO!
            </motion.h1>
            <p className="text-slate-300 text-xl font-bold uppercase tracking-wider">
              Puntuación Final: <span className="text-yellow-400 font-black">{score} pts</span>
            </p>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block pt-8 animate-bounce">
              Haz clic para Salir
            </span>
          </div>
        </motion.div>
      )}

      {/* ⏸ Pause Overlay */}
      {isPaused && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-center space-y-4">
            <motion.h1
              className="text-6xl font-extrabold text-[#fca311] tracking-wider uppercase drop-shadow-[0_0_20px_rgba(252,163,17,0.4)]"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              ⏸ JUEGO EN PAUSA
            </motion.h1>
            <p className="text-slate-400 text-sm font-black uppercase tracking-[0.3em]">
              El presentador ha detenido el cronómetro
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DefinitionsGameWrapper;

