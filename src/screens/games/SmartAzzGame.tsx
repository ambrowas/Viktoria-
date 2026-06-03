import React, { useState, useEffect, useRef } from 'react';
import { SmartAzzGame, SmartAzzCategory } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useSync } from "@/context/SyncContext";
import { resolveMediaUrl } from '@/utils/media';
import { useLanguage } from '@/context/LanguageContext';
import confetti from 'canvas-confetti';
import { X } from 'lucide-react';

// 🗓️ Single digit split-flap component
const FlipDigit: React.FC<{ digit: string }> = ({ digit }) => {
  return (
    <div className="relative w-20 h-28 bg-slate-900 border border-slate-700/60 rounded-2xl flex flex-col items-center justify-center shadow-2xl overflow-hidden select-none">
      {/* Top half background */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-slate-950 border-b border-black/40" />
      {/* Bottom half background */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-slate-900 border-t border-black/40" />

      {/* Changing Digit with Animation */}
      <AnimatePresence mode="popLayout">
        <motion.span
          key={digit}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 z-10 leading-none select-none"
        >
          {digit}
        </motion.span>
      </AnimatePresence>

      {/* Horizontal Split Line */}
      <div className="absolute inset-x-0 top-1/2 h-[2px] bg-black/80 z-20 shadow-[0_1px_1px_rgba(0,0,0,0.6)]" />
    </div>
  );
};

// ⏱️ 2-Digit Split-Flap Flip Timer
const FlipTimer: React.FC<{ value: number }> = ({ value }) => {
  const digits = value.toString().padStart(2, '0').split('');
  return (
    <div className="flex gap-2.5">
      {digits.map((digit, idx) => (
        <FlipDigit key={idx} digit={digit} />
      ))}
    </div>
  );
};

interface SmartAzzGameProps {
  game: SmartAzzGame;
  teams?: any[];
  teamScores?: Record<string, number>;
  onScoreChange?: (teamId: string, score: number) => void;
  onExit: (points?: Record<string, number>) => void;
  isFinalRound?: boolean;
  themeMusicPath?: string;
  allTeams?: any[];
  organizers?: Array<{ role: string; name: string }>;
  isPreview?: boolean;
  isViewer?: boolean;
}

const SmartAzzGameScreen: React.FC<SmartAzzGameProps> = ({ 
  game, 
  teams, 
  teamScores: teamScoresProp, 
  onScoreChange, 
  onExit,
  isFinalRound = false,
  themeMusicPath,
  allTeams,
  organizers,
  isPreview = false,
  isViewer: isViewerProp = false
}) => {
  const { sessionData, updateSession, isRemoteMode, deviceRole } = useSync();
  const { lang: globalLang } = useLanguage();
  const isHost = isPreview ? true : (deviceRole === 'host');
  const isViewer = isPreview ? false : isViewerProp;
  const isSyncActive = isPreview ? false : (isRemoteMode && sessionData);
  const lang = globalLang || 'en';

  const [usedCategories, setUsedCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<SmartAzzCategory | null>(null);
  
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [victories, setVictories] = useState<[number, number]>([0, 0]);
  const [activeTeam, setActiveTeam] = useState<0 | 1>(0);

  const [isDraw, setIsDraw] = useState(false);
  const [guessedBy, setGuessedBy] = useState<Record<string, number>>({});
  const [shotClock, setShotClock] = useState(game.turnTimer ?? 10);
  const [isRunning, setIsRunning] = useState(false);
  const [guessedAnswers, setGuessedAnswers] = useState<string[]>([]);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [hostSearchQuery, setHostSearchQuery] = useState("");
  const [roundEnded, setRoundEnded] = useState(false);
  const [winnerScreen, setWinnerScreen] = useState<string | null>(null);
  const [showCredits, setShowCredits] = useState(false);
  const [earlyEndWinnerIndex, setEarlyEndWinnerIndex] = useState<number | null>(null);
  const [eliminationReason, setEliminationReason] = useState<'timeout' | 'wrong' | null>(null);

  const themeMusicRef = useRef<HTMLAudioElement | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const shotClockRef = useRef(shotClock);
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
    shotClockRef.current = shotClock;
    isRunningRef.current = isRunning;
  }, [shotClock, isRunning]);

  const teamLabel = (index: number) => {
    if (teams && teams[index]) {
      return teams[index].name;
    }
    return index === 0 ? "Team A" : "Team B";
  };

  // master sync state helper
  const syncState = (updates: {
    activeCategoryId?: string | null;
    usedCategories?: string[];
    scores?: number[];
    victories?: number[];
    activeTeam?: number;
    shotClock?: number;
    isRunning?: boolean;
    guessedAnswers?: string[];
    roundEnded?: boolean;
    winnerScreen?: string | null;
    showCredits?: boolean;
    isDraw?: boolean;
    guessedBy?: Record<string, number>;
    earlyEndWinnerIndex?: number | null;
    eliminationReason?: 'timeout' | 'wrong' | null;
  }) => {
    if (updates.activeCategoryId !== undefined) {
      const cat = game.categories.find(c => 
        c.id === updates.activeCategoryId || 
        c.name?.toLowerCase() === updates.activeCategoryId?.toLowerCase()
      ) || null;
      setActiveCategory(cat);
    }
    if (updates.usedCategories !== undefined) setUsedCategories(updates.usedCategories);
    if (updates.scores !== undefined) setScores(updates.scores as [number, number]);
    if (updates.victories !== undefined) setVictories(updates.victories as [number, number]);
    if (updates.activeTeam !== undefined) setActiveTeam(updates.activeTeam as 0 | 1);
    if (updates.shotClock !== undefined) setShotClock(updates.shotClock);
    if (updates.isRunning !== undefined) setIsRunning(updates.isRunning);
    if (updates.guessedAnswers !== undefined) setGuessedAnswers(updates.guessedAnswers);
    if (updates.roundEnded !== undefined) setRoundEnded(updates.roundEnded);
    if (updates.winnerScreen !== undefined) setWinnerScreen(updates.winnerScreen);
    if (updates.showCredits !== undefined) setShowCredits(updates.showCredits);
    if (updates.isDraw !== undefined) setIsDraw(updates.isDraw);
    if (updates.guessedBy !== undefined) setGuessedBy(updates.guessedBy);
    if (updates.earlyEndWinnerIndex !== undefined) setEarlyEndWinnerIndex(updates.earlyEndWinnerIndex);
    if (updates.eliminationReason !== undefined) setEliminationReason(updates.eliminationReason);

    if (isSyncActive && isHost) {
      const fullState = {
        activeCategoryId: updates.activeCategoryId !== undefined ? updates.activeCategoryId : (activeCategory?.id || null),
        usedCategories: updates.usedCategories !== undefined ? updates.usedCategories : usedCategories,
        scores: updates.scores !== undefined ? updates.scores : scores,
        victories: updates.victories !== undefined ? updates.victories : victories,
        activeTeam: updates.activeTeam !== undefined ? updates.activeTeam : activeTeam,
        globalTime: 0,
        shotClock: updates.shotClock !== undefined ? updates.shotClock : shotClock,
        isRunning: updates.isRunning !== undefined ? updates.isRunning : isRunning,
        guessedAnswers: updates.guessedAnswers !== undefined ? updates.guessedAnswers : guessedAnswers,
        roundEnded: updates.roundEnded !== undefined ? updates.roundEnded : roundEnded,
        winnerScreen: updates.winnerScreen !== undefined ? updates.winnerScreen : winnerScreen,
        showCredits: updates.showCredits !== undefined ? updates.showCredits : showCredits,
        isDraw: updates.isDraw !== undefined ? updates.isDraw : isDraw,
        guessedBy: updates.guessedBy !== undefined ? updates.guessedBy : guessedBy,
        earlyEndWinnerIndex: updates.earlyEndWinnerIndex !== undefined ? updates.earlyEndWinnerIndex : earlyEndWinnerIndex,
        eliminationReason: updates.eliminationReason !== undefined ? updates.eliminationReason : eliminationReason,
      };
      updateSession({ smartAzzState: fullState }).catch(err => {
        console.error("SmartAzz: Failed to sync state", err);
      });
    }
  };

  // Host mounts and initializes session state if missing
  useEffect(() => {
    if (isSyncActive && isHost && sessionData && !sessionData.smartAzzState) {
      syncState({
        activeCategoryId: null,
        usedCategories: [],
        scores: [0, 0],
        victories: [0, 0],
        activeTeam: 0,
        shotClock: game.turnTimer ?? 10,
        isRunning: false,
        guessedAnswers: [],
        roundEnded: false,
        winnerScreen: null,
        showCredits: false,
        isDraw: false,
        guessedBy: {},
        earlyEndWinnerIndex: null,
      });
    }
  }, [isSyncActive, isHost]);

  // Viewer mounts and listens to session updates
  useEffect(() => {
    if (!isSyncActive || !isViewer || !sessionData?.smartAzzState) return;
    const state = sessionData.smartAzzState;
    const cat = game.categories.find(c => 
      c.id === state.activeCategoryId || 
      c.name?.toLowerCase() === state.activeCategoryId?.toLowerCase()
    ) || null;
    setActiveCategory(cat);
    setUsedCategories(state.usedCategories || []);
    setScores(state.scores as [number, number] || [0, 0]);
    setVictories(state.victories as [number, number] || [0, 0]);
    setActiveTeam(state.activeTeam as 0 | 1 || 0);
    setShotClock(state.shotClock);
    setIsRunning(state.isRunning);
    setGuessedAnswers(state.guessedAnswers || []);
    setRoundEnded(state.roundEnded);
    setWinnerScreen(state.winnerScreen);
    setShowCredits(state.showCredits || false);
    setIsDraw(state.isDraw || false);
    setGuessedBy(state.guessedBy || {});
    setEarlyEndWinnerIndex(state.earlyEndWinnerIndex !== undefined ? state.earlyEndWinnerIndex : null);
    setEliminationReason(state.eliminationReason || null);
  }, [sessionData?.smartAzzState, isSyncActive, isViewer, game.categories]);

  // Host/Offline timer execution
  useEffect(() => {
    const shouldRunTimer = isRunning && (!isSyncActive || isHost);
    if (!shouldRunTimer) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const nextShot = shotClockRef.current - 1;
      
      let updatedIsRunning = isRunningRef.current;
      let finalShot = nextShot;

      if (nextShot <= 0) {
        clearInterval(timerRef.current!);
        handleTeamFail(activeTeam, 'timeout');
        return;
      }

      syncState({
        shotClock: finalShot,
        isRunning: updatedIsRunning,
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isSyncActive, isHost, activeTeam]);

  // 🎵 Play correct and catastrophic sounds on Viewer / Offline screens
  const prevGuessedCountRef = useRef(guessedAnswers.length);
  const prevRoundEndedRef = useRef(roundEnded);

  useEffect(() => {
    const shouldPlaySound = isViewer || !isSyncActive;
    if (shouldPlaySound) {
      // Correct answer sound
      if (guessedAnswers.length > prevGuessedCountRef.current) {
        const audio = new Audio('/sounds/correct.mp3');
        audio.play().catch(() => {});
      }
      
      // Catastrophic sound on elimination (only if not a draw)
      if (roundEnded && !prevRoundEndedRef.current && !isDraw) {
        const audio = new Audio('/sounds/wrong.mp3');
        audio.play().catch(() => {});
      }
    }
    prevGuessedCountRef.current = guessedAnswers.length;
    prevRoundEndedRef.current = roundEnded;
  }, [guessedAnswers.length, roundEnded, isViewer, isSyncActive, isDraw]);

  function handleStartCategory(cat: SmartAzzCategory) {
    syncState({
      activeCategoryId: cat.id,
      usedCategories: [...usedCategories, cat.id],
      guessedAnswers: [],
      shotClock: game.turnTimer ?? 10,
      isRunning: false,
      roundEnded: false,
      isDraw: false,
      guessedBy: {},
    });
  }

  function handleSwitchTurn() {
    syncState({
      activeTeam: activeTeam === 0 ? 1 : 0,
      shotClock: game.turnTimer ?? 10,
    });
  }

  function handleCorrectAnswer(answer: string) {
    if (guessedAnswers.includes(answer)) return;
    const nextGuessed = [...guessedAnswers, answer];
    const newScores = [...scores] as [number, number];
    const nextGuessedBy = { ...guessedBy, [answer]: activeTeam };
    
    if (activeCategory) {
      const pts = activeCategory.pointValue || 100;
      newScores[activeTeam] += pts;
      if (!isFinalRound && teams && teams[activeTeam] && onScoreChange) {
        onScoreChange(teams[activeTeam].id, pts);
      }
    }
    
    setHostSearchQuery(""); // Clear search bar locally on host
    
    const allGuessed = activeCategory && nextGuessed.length === (activeCategory.validAnswers || []).length;
    
    if (allGuessed) {
      syncState({
        guessedAnswers: nextGuessed,
        scores: newScores,
        isRunning: false,
        roundEnded: true,
        isDraw: true,
        guessedBy: nextGuessedBy,
      });
    } else {
      syncState({
        guessedAnswers: nextGuessed,
        scores: newScores,
        activeTeam: activeTeam === 0 ? 1 : 0,
        shotClock: game.turnTimer ?? 10,
        guessedBy: nextGuessedBy,
      });
    }
  }

  function handleTeamFail(failingTeamIndex: 0 | 1, reason: 'timeout' | 'wrong') {
    const winningTeamIndex = failingTeamIndex === 0 ? 1 : 0;
    const newVictories = [...victories] as [number, number];
    newVictories[winningTeamIndex] += 1;

    syncState({
      victories: newVictories,
      isRunning: false,
      roundEnded: true,
      isDraw: false,
      eliminationReason: reason,
      activeTeam: failingTeamIndex,
    });
  }

  function checkWinnerAndContinue() {
    if (victories[0] >= 4) {
      syncState({ winnerScreen: `${teamLabel(0)} Wins!` });
    } else if (victories[1] >= 4) {
      syncState({ winnerScreen: `${teamLabel(1)} Wins!` });
    } else {
      syncState({ activeCategoryId: null, isDraw: false });
    }
  }

  function handleEarlyEndGame() {
    const winnerIdx = victories[0] > victories[1] ? 0 : victories[1] > victories[0] ? 1 : (scores[0] >= scores[1] ? 0 : 1);
    syncState({
      earlyEndWinnerIndex: winnerIdx,
      winnerScreen: `${teamLabel(winnerIdx)} Wins!`,
      roundEnded: true,
      isRunning: false
    });
  }

  const hasWinner = victories[0] >= 4 || victories[1] >= 4 || (earlyEndWinnerIndex !== null && earlyEndWinnerIndex !== undefined);
  const winningTeamIndex = victories[0] >= 4 ? 0 : victories[1] >= 4 ? 1 : (earlyEndWinnerIndex !== null && earlyEndWinnerIndex !== undefined ? earlyEndWinnerIndex : null);

  // Real-time confetti explosion on mount of Congratulations Screen
  useEffect(() => {
    if (hasWinner && isFinalRound && !showCredits) {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [hasWinner, isFinalRound, showCredits]);

  // Synchronized theme music loop for credits screen (muted on host, audible on viewer)
  useEffect(() => {
    if (isFinalRound && hasWinner && showCredits) {
      const musicPath = themeMusicPath || "/sounds/Viktoria_Game_On_.mp3";
      if (!themeMusicRef.current) {
        themeMusicRef.current = new Audio(musicPath);
        themeMusicRef.current.loop = true;
        themeMusicRef.current.volume = 0.5;
      }
      themeMusicRef.current.play().catch(err => {
        console.warn("Theme music failed to play:", err);
      });
    } else {
      if (themeMusicRef.current) {
        themeMusicRef.current.pause();
        themeMusicRef.current = null;
      }
    }

    return () => {
      if (themeMusicRef.current) {
        themeMusicRef.current.pause();
        themeMusicRef.current = null;
      }
    };
  }, [showCredits, hasWinner, isFinalRound, themeMusicPath]);

  const handleContinueToCredits = () => {
    syncState({ showCredits: true });
  };

  if (isFinalRound && hasWinner) {
    if (showCredits) {
      return (
        <div className="fixed inset-0 bg-[#020202] text-white flex flex-col justify-start items-center overflow-hidden z-50">
          <style>{`
            @keyframes scrollCredits {
              0% {
                transform: translateY(100vh);
              }
              100% {
                transform: translateY(-110%);
              }
            }
            .credits-scroll {
              animation: scrollCredits 25s linear forwards;
            }
          `}</style>

          {/* Content wrapper */}
          <div className="credits-scroll flex flex-col items-center text-center max-w-2xl px-6 py-20 gap-16 select-none pointer-events-none">
            <div>
              <h1 className="text-5xl font-black tracking-widest text-yellow-500 uppercase mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                {game.name}
              </h1>
              <p className="text-xl text-slate-400 font-bold uppercase tracking-widest">
                {lang === 'es' ? 'La Gran Final' : 'The Grand Finale'}
              </p>
            </div>

            <div className="w-16 h-[2px] bg-yellow-500/30" />

            {/* Organizers Section */}
            <div className="flex flex-col gap-6">
              <h2 className="text-xs font-black tracking-[0.4em] text-yellow-500/50 uppercase">
                {lang === 'es' ? 'Organizadores' : 'Organizers'}
              </h2>
              {organizers && organizers.length > 0 ? (
                organizers.map((org, index) => (
                  <div key={index} className="flex flex-col gap-2 mt-2">
                    <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">{org.role}</span>
                    <span className="text-2xl font-black text-white uppercase tracking-wider">{org.name}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">{lang === 'es' ? 'Productor Ejecutivo' : 'Executive Producer'}</span>
                    <span className="text-2xl font-black text-white uppercase tracking-wider">Viktoria Game Show Team</span>
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">{lang === 'es' ? 'Director del Juego y Host' : 'Game Master & Host'}</span>
                    <span className="text-2xl font-black text-white uppercase tracking-wider">The Host</span>
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">{lang === 'es' ? 'Directores Técnicos' : 'Technical Directors'}</span>
                    <span className="text-2xl font-black text-white uppercase tracking-wider">Antigravity AI Engineers</span>
                  </div>
                </>
              )}
            </div>

            <div className="w-16 h-[2px] bg-yellow-500/30" />

            {/* Participants Section */}
            <div className="flex flex-col gap-8">
              <h2 className="text-xs font-black tracking-[0.4em] text-yellow-500/50 uppercase">
                {lang === 'es' ? 'Participantes e Integrantes' : 'Participants & Contestants'}
              </h2>
              {(allTeams || teams || []).map((team, idx) => (
                <div key={team.id || idx} className="flex flex-col gap-3">
                  <span className="text-lg font-black uppercase tracking-widest" style={{ color: team.color || '#e2e8f0' }}>
                    {team.name}
                  </span>
                  <div className="flex flex-col gap-1">
                    {(team.players || []).map((p: any) => (
                      <span key={p.id} className="text-2xl font-bold text-white uppercase tracking-wider">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="w-16 h-[2px] bg-yellow-500/30" />

            {/* Closing screen */}
            <div className="pt-20 pb-40">
              <h2 className="text-4xl font-black tracking-widest text-yellow-500 uppercase drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] animate-pulse">
                {lang === 'es' ? '¡GRACIAS POR JUGAR!' : 'THANK YOU FOR PLAYING!'}
              </h2>
              <p className="text-slate-500 text-xs mt-4 uppercase tracking-[0.3em] font-bold">
                © {new Date().getFullYear()} Viktoria Productions. All Rights Reserved.
              </p>
            </div>
          </div>

          {/* Host Controls: Float overlay at bottom */}
          {!isViewer && (
            <div className="absolute bottom-8 right-8 z-50 pointer-events-auto">
              <button
                onClick={() => onExit(isFinalRound && teams ? { [teams[0].id]: scores[0], [teams[1].id]: scores[1] } : undefined)}
                className="bg-red-600 hover:bg-red-500 text-white font-black px-8 py-3 rounded-full text-lg shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all transform hover:scale-105 active:scale-95"
              >
                {lang === 'es' ? 'TERMINAR SHOW ➔' : 'FINISH SHOW ➔'}
              </button>
            </div>
          )}
        </div>
      );
    }

    const winnerTeam = teams?.[winningTeamIndex!];
    const previousScore = winnerTeam ? (teamScoresProp?.[winnerTeam.id] || 0) : 0;
    const faceOffScore = winningTeamIndex !== null ? scores[winningTeamIndex] : 0;
    const totalScore = previousScore + faceOffScore;

    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#110e05] via-[#050401] to-black text-white flex flex-col justify-center items-center p-8 text-center overflow-hidden z-50 select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(253,224,71,0.12)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
        
        {/* Glow Spotlight Behind Trophy */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.h2
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-2xl font-black tracking-[0.4em] text-yellow-500 uppercase mb-2 drop-shadow-[0_0_10px_rgba(250,204,21,0.2)]"
        >
          {lang === 'es' ? 'CAMPEÓN DEL SHOW' : 'SHOW CHAMPION'}
        </motion.h2>

        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
          className="text-7xl md:text-8xl font-black mb-8 uppercase tracking-tighter"
          style={{
            color: winnerTeam?.color || '#fbbf24',
            textShadow: `0 0 40px ${(winnerTeam?.color || '#fbbf24')}40`
          }}
        >
          {winnerTeam?.name || "Winner"}
        </motion.h1>

        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 80, damping: 12 }}
          className="relative mb-6"
        >
          {/* Custom Golden Mask Trophy Image */}
          <img
            src={resolveMediaUrl("images/golden_mask_trophy.jpg")}
            alt="Golden Mask Trophy"
            className="w-56 h-56 md:w-64 md:h-64 object-contain drop-shadow-[0_10px_50px_rgba(253,224,71,0.4)]"
          />
        </motion.div>

        {/* Score Addition Display */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="bg-yellow-500/5 border border-yellow-500/20 backdrop-blur-md rounded-3xl p-6 max-w-md w-full mb-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mb-3">
            {lang === 'es' ? 'CÁLCULO DEL PUNTAJE FINAL' : 'FINAL SCORE CALCULATION'}
          </h3>
          <div className="flex flex-col gap-2 font-bold text-sm text-slate-300">
            <div className="flex justify-between items-center px-2">
              <span>{lang === 'es' ? 'Puntaje Acumulado:' : 'Accumulated Score:'}</span>
              <span className="text-white">${previousScore}</span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span>{lang === 'es' ? 'Puntaje de Cara a Cara:' : 'Face Off Guesses:'}</span>
              <span className="text-white">+ ${faceOffScore}</span>
            </div>
            <div className="h-[1px] bg-slate-800 my-1.5" />
            <div className="flex justify-between items-center px-2 text-xl font-black text-yellow-400">
              <span>{lang === 'es' ? 'PUNTAJE FINAL:' : 'FINAL SCORE:'}</span>
              <span className="drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]">${totalScore}</span>
            </div>
          </div>
        </motion.div>

        {/* Player Names List */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="flex flex-col gap-2 mb-8"
        >
          <span className="text-slate-400 text-xs font-black uppercase tracking-[0.3em]">{lang === 'es' ? 'INTEGRANTES' : 'MEMBERS'}</span>
          <div className="flex gap-4 justify-center flex-wrap">
            {(winnerTeam?.players || []).map((p: any) => (
              <span key={p.id} className="text-xl font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm shadow-md">
                {p.name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Host Controls */}
        {!isViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="z-50"
          >
            <button
              onClick={handleContinueToCredits}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-12 py-4 rounded-full text-2xl shadow-[0_0_35px_rgba(250,204,21,0.5)] transition-all transform hover:scale-105 active:scale-95 animate-pulse"
            >
              {lang === 'es' ? 'VER CRÉDITOS ➔' : 'CONTINUE TO CREDITS ➔'}
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  if (winnerScreen) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-red-900 to-black text-white items-center justify-center p-8 text-center relative overflow-hidden">
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 mb-8 animate-pulse">
          {winnerScreen}
        </h1>
        <div className="flex gap-16 mb-12">
          <div className="text-center">
            <h2 className="text-3xl text-red-400 mb-4">{teamLabel(0)}</h2>
            <div className="text-6xl font-bold mb-2">{victories[0]} <span className="text-2xl text-slate-400">Wins</span></div>
            <div className="text-4xl text-yellow-500">${scores[0]}</div>
          </div>
          <div className="text-center">
            <h2 className="text-3xl text-blue-400 mb-4">{teamLabel(1)}</h2>
            <div className="text-6xl font-bold mb-2">{victories[1]} <span className="text-2xl text-slate-400">Wins</span></div>
            <div className="text-4xl text-yellow-500">${scores[1]}</div>
          </div>
        </div>
        {!isViewer && (
          <button
            onClick={() => onExit(isFinalRound && teams ? { [teams[0].id]: scores[0], [teams[1].id]: scores[1] } : undefined)}
            className="bg-white text-black font-bold py-4 px-12 rounded-full text-2xl hover:scale-105 transition-transform"
          >
            Exit Game
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 to-black text-white relative">
      <header className="flex justify-between items-center p-4 border-b border-white/10 z-20">
        {!isViewer ? (
          <button onClick={() => onExit(isFinalRound && teams ? { [teams[0].id]: scores[0], [teams[1].id]: scores[1] } : undefined)} className="text-xl font-bold text-slate-400 hover:text-white">
            ← Exit
          </button>
        ) : (
          <div className="w-16" />
        )}
        <div className="flex items-center gap-8 font-bold">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: teams?.[0]?.color || '#22c55e' }}>{teamLabel(0)}</span>
            <span className="text-3xl" style={{ color: teams?.[0]?.color || '#22c55e' }}>{victories[0]} <span className="text-sm">Wins</span></span>
            <span className="text-yellow-500 text-xl">${scores[0]}</span>
          </div>
          <span className="text-white tracking-widest uppercase text-4xl mx-4">Face Off</span>
          <div className="flex flex-col items-start">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: teams?.[1]?.color || '#3b82f6' }}>{teamLabel(1)}</span>
            <span className="text-3xl" style={{ color: teams?.[1]?.color || '#3b82f6' }}>{victories[1]} <span className="text-sm">Wins</span></span>
            <span className="text-yellow-500 text-xl">${scores[1]}</span>
          </div>
        </div>
        {!isViewer ? (
          <button 
            onClick={() => setShowHostPanel(!showHostPanel)}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${showHostPanel ? 'bg-brand-primary text-black' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
          >
            Host Panel {showHostPanel ? 'ON' : 'OFF'}
          </button>
        ) : (
          <div className="w-24" />
        )}
      </header>

      <main className="flex-1 flex flex-col p-6 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!activeCategory ? (
            <motion.div
              key="board"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <h2 className="text-4xl font-bold mb-12 text-yellow-400 tracking-wide text-center">
                Select a Topic
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-6xl">
                {game.categories.map((cat) => {
                  const isUsed = usedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => !isUsed && !isViewer && handleStartCategory(cat)}
                      disabled={isUsed || isViewer}
                      className={`relative overflow-hidden rounded-2xl h-48 flex flex-col items-center justify-center p-4 text-center transition-all duration-300 transform ${
                        isUsed
                          ? "bg-slate-800/50 text-slate-600 scale-95"
                          : isViewer
                            ? "bg-gradient-to-br from-red-600 to-red-900 border border-red-400/30 cursor-default"
                            : "bg-gradient-to-br from-red-600 to-red-900 hover:scale-105 hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] border border-red-400/30 cursor-pointer"
                      }`}
                    >
                      <span className={`text-2xl font-black uppercase mb-2 ${isUsed ? "opacity-30" : "opacity-100"} z-10`}>
                        {cat.name}
                      </span>
                      <span className={`text-yellow-400 font-bold ${isUsed ? "opacity-30" : "opacity-100"} z-10`}>
                        ${cat.pointValue || 100} / ea
                      </span>
                      {!isUsed && (
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="active-round"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="flex-1 flex flex-col items-center justify-start w-full relative"
            >
              <h2 className="text-4xl md:text-5xl font-black uppercase text-center mb-2 text-yellow-400 drop-shadow-lg">
                {activeCategory.name}
              </h2>
              <p className="text-xl text-slate-300 mb-6 font-bold">${activeCategory.pointValue || 100} per correct answer</p>

              {roundEnded && isDraw && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-yellow-500/10 border-2 border-yellow-500 p-4 rounded-2xl mb-6 max-w-2xl text-center"
                >
                  <p className="text-2xl font-black text-yellow-400 uppercase tracking-widest animate-pulse">
                    {lang === 'es' ? '¡EMPATE! Ambos equipos contestaron todo bien' : 'TIE! Both teams got everything right'}
                  </p>
                </motion.div>
              )}

              {roundEnded && activeCategory.explanation && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-brand-secondary/20 border-2 border-brand-primary p-6 rounded-2xl mb-8 max-w-3xl"
                >
                  <p className="text-2xl font-bold text-white text-center">
                    {activeCategory.explanation}
                  </p>
                </motion.div>
              )}

              <div className="flex gap-12 items-center justify-center mb-8 w-full max-w-5xl">
                {/* Team A Side */}
                <div className={`flex flex-col items-center transition-all ${activeTeam === 0 ? 'scale-110 opacity-100' : 'scale-90 opacity-40'} w-1/3`}>
                  <h3 className="text-3xl font-bold mb-4" style={{ color: teams?.[0]?.color || '#22c55e' }}>{teamLabel(0)}</h3>
                  {!isViewer && (
                    <button
                      onClick={() => handleTeamFail(0, 'wrong')}
                      className="border-2 px-6 py-3 rounded-xl font-bold transition-colors shadow-lg active:scale-95 bg-white/5 hover:bg-white/10"
                      style={{
                        borderColor: teams?.[0]?.color || '#22c55e',
                        color: teams?.[0]?.color || '#22c55e',
                      }}
                    >
                      {lang === 'es' ? 'Eliminar Jugador' : 'Eliminate Player'}
                    </button>
                  )}
                  {/* Team A Guessed Answers List */}
                  <div className="flex flex-col gap-2.5 w-full max-w-xs mt-6 overflow-y-auto max-h-[35vh] pr-1">
                    {guessedAnswers
                      .filter(ans => guessedBy[ans] === 0)
                      .map((ans, i) => (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          key={i}
                          className="font-bold px-4 py-2.5 rounded-xl text-center border text-sm uppercase tracking-wide shadow-md"
                          style={{
                            backgroundColor: `${teams?.[0]?.color || '#22c55e'}15`,
                            borderColor: teams?.[0]?.color || '#22c55e',
                            color: teams?.[0]?.color || '#22c55e',
                            boxShadow: `0 0 10px ${(teams?.[0]?.color || '#22c55e')}25`,
                          }}
                        >
                          {ans}
                        </motion.div>
                      ))}
                  </div>
                </div>

                {/* Timers or Next Button */}
                <div className="relative z-10 min-w-[220px] flex flex-col items-center self-start pt-4">
                  {!roundEnded ? (
                    <>
                      {/* 3D Spin Container when turn changes */}
                      <motion.div
                        key={activeTeam}
                        initial={{ rotateY: -180, opacity: 0.3 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 120, damping: 14 }}
                        className="flex flex-col items-center"
                        style={{ backfaceVisibility: "visible" }}
                      >
                        <FlipTimer value={shotClock} />
                      </motion.div>

                      {!isViewer && (
                        <div className="mt-6 flex gap-4">
                          <button
                            onClick={() => syncState({ isRunning: !isRunning })}
                            className={`px-8 py-3 rounded-full font-bold text-base uppercase tracking-widest transition-transform hover:scale-105 border border-black shadow-lg ${
                              isRunning ? "bg-slate-700 text-white hover:bg-slate-650" : "bg-emerald-500 text-black hover:bg-emerald-400"
                            }`}
                          >
                            {isRunning ? "Pause" : "Start"}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    !isViewer ? (
                      <div className="flex flex-col gap-3 items-center">
                        <button
                          onClick={checkWinnerAndContinue}
                          className="w-full bg-brand-primary text-black font-black text-xl px-8 py-3.5 rounded-full shadow-[0_0_30px_rgba(252,211,77,0.4)] hover:scale-105 transition-transform"
                        >
                          {lang === 'es' ? 'CONTINUAR RONDA ➔' : 'CONTINUE ROUND ➔'}
                        </button>
                        <button
                          onClick={handleEarlyEndGame}
                          className="w-full bg-red-650 hover:bg-red-550 text-white font-black text-sm px-6 py-2.5 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-105 transition-transform uppercase tracking-wider"
                        >
                          {lang === 'es' ? 'Terminar Juego' : 'End Game'}
                        </button>
                      </div>
                    ) : (
                      <div className="text-yellow-400 font-black text-2xl animate-pulse tracking-wide bg-yellow-400/10 border border-yellow-400/30 px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(250,204,21,0.1)]">
                        WAITING FOR HOST...
                      </div>
                    )
                  )}
                </div>

                {/* Team B Side */}
                <div className={`flex flex-col items-center transition-all ${activeTeam === 1 ? 'scale-110 opacity-100' : 'scale-90 opacity-40'} w-1/3`}>
                  <h3 className="text-3xl font-bold mb-4" style={{ color: teams?.[1]?.color || '#3b82f6' }}>{teamLabel(1)}</h3>
                  {!isViewer && (
                    <button
                      onClick={() => handleTeamFail(1, 'wrong')}
                      className="border-2 px-6 py-3 rounded-xl font-bold transition-colors shadow-lg active:scale-95 bg-white/5 hover:bg-white/10"
                      style={{
                        borderColor: teams?.[1]?.color || '#3b82f6',
                        color: teams?.[1]?.color || '#3b82f6',
                      }}
                    >
                      {lang === 'es' ? 'Eliminar Jugador' : 'Eliminate Player'}
                    </button>
                  )}
                  {/* Team B Guessed Answers List */}
                  <div className="flex flex-col gap-2.5 w-full max-w-xs mt-6 overflow-y-auto max-h-[35vh] pr-1">
                    {guessedAnswers
                      .filter(ans => guessedBy[ans] === 1)
                      .map((ans, i) => (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          key={i}
                          className="font-bold px-4 py-2.5 rounded-xl text-center border text-sm uppercase tracking-wide shadow-md"
                          style={{
                            backgroundColor: `${teams?.[1]?.color || '#3b82f6'}15`,
                            borderColor: teams?.[1]?.color || '#3b82f6',
                            color: teams?.[1]?.color || '#3b82f6',
                            boxShadow: `0 0 10px ${(teams?.[1]?.color || '#3b82f6')}25`,
                          }}
                        >
                          {ans}
                        </motion.div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Elimination Overlay */}
              {roundEnded && !isDraw && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#050505]/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 z-30"
                >
                  <motion.div
                    initial={{ scale: 0.3, rotate: -30 }}
                    animate={{ scale: 1.1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    className="w-36 h-36 bg-red-500/10 rounded-full flex items-center justify-center border-4 border-red-500 mb-8 shadow-[0_0_50px_rgba(239,68,68,0.4)]"
                  >
                    <X size={72} className="text-red-500 font-bold" strokeWidth={4.5} />
                  </motion.div>

                  <h1 className="text-6xl md:text-8xl font-black text-red-500 uppercase tracking-tighter mb-4 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                    {eliminationReason === 'timeout' 
                      ? (lang === 'es' ? "TIEMPO AGOTADO" : "TIME IS UP") 
                      : (lang === 'es' ? "INCORRECTO" : "INCORRECT")}
                  </h1>

                  <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider mb-8">
                    {teamLabel(activeTeam)} - {lang === 'es' ? "JUGADOR ELIMINADO" : "PLAYER ELIMINATED"}
                  </h2>

                  {activeCategory.explanation && (
                    <p className="text-lg md:text-2xl text-slate-300 max-w-3xl italic leading-relaxed bg-white/5 border border-white/10 p-6 rounded-2xl mb-8">
                      {activeCategory.explanation}
                    </p>
                  )}

                  {!isViewer && (
                    <button
                      onClick={checkWinnerAndContinue}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl px-12 py-4 rounded-full shadow-[0_0_30px_rgba(252,211,77,0.4)] transition-all transform hover:scale-105 active:scale-95"
                    >
                      {lang === 'es' ? 'CONTINUAR ➔' : 'CONTINUE ➔'}
                    </button>
                  )}
                </motion.div>
              )}

              {/* Host Control Panel Overlay */}
              {showHostPanel && !isViewer && (
                <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 p-6 z-30 shadow-2xl rounded-t-2xl max-h-[50vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-brand-primary hidden md:block">Host Panel</h3>
                    <div className="flex gap-2 items-center flex-1 max-w-xl mx-4">
                      <input
                        type="text"
                        value={hostSearchQuery}
                        onChange={(e) => setHostSearchQuery(e.target.value)}
                        placeholder="Search answer or type manual override..."
                        className="flex-1 bg-slate-800 border border-slate-600 rounded p-3 text-white outline-none focus:border-brand-primary font-bold text-lg"
                        autoFocus
                      />
                      {hostSearchQuery && (
                        <button
                          onClick={() => handleCorrectAnswer(hostSearchQuery)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 rounded whitespace-nowrap shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
                        >
                          + Manual Correct
                        </button>
                      )}
                    </div>
                    <button onClick={() => setShowHostPanel(false)} className="text-slate-400 hover:text-white font-bold">Close</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 overflow-y-auto pr-2 pb-4">
                    {([...(activeCategory.validAnswers || [])])
                      .sort((a, b) => a.localeCompare(b))
                      .filter(ans => ans.toLowerCase().includes(hostSearchQuery.toLowerCase()))
                      .map((ans, i) => {
                      const isGuessed = guessedAnswers.includes(ans);
                      return (
                        <button
                          key={i}
                          onClick={() => handleCorrectAnswer(ans)}
                          disabled={isGuessed}
                          className={`p-3 rounded-lg text-left font-bold transition-all ${
                            isGuessed 
                              ? 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed' 
                              : 'bg-slate-800 hover:bg-slate-700 text-white hover:text-brand-primary border border-slate-700 hover:border-brand-primary'
                          }`}
                        >
                          {ans}
                        </button>
                      );
                    })}
                    {hostSearchQuery && !(activeCategory.validAnswers || []).some(a => a.toLowerCase().includes(hostSearchQuery.toLowerCase())) && (
                      <div className="col-span-full text-center text-slate-500 py-4 italic">
                        No matches found. Use the "+ Manual Correct" button above to force this answer.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default SmartAzzGameScreen;
