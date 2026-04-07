import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Game, Show, Team } from "@/types";
import GameRouter from "./GameRouter";
import { useSync } from "@/context/SyncContext";
import { Trophy, Users, Play, Pause, ChevronRight, Home, LayoutList, FastForward } from "lucide-react";
import confetti from "canvas-confetti";
import { useLanguage } from "@/context/LanguageContext";
import { stopAllSounds } from "@/utils/sound";
import MasterControlPanel from "./host/MasterControlPanel";
import SessionLobby from "@/components/SessionLobby";
import TeamIcon from "@/components/TeamIcon";

interface ShowRunnerProps {
    show: Show;
    games: Game[];
    onExit: () => void;
}

type ShowStep = "intro" | "lobby" | "announcement" | "playing" | "leaderboard" | "final_results";

const TRANSLATIONS = {
    en: {
        gameStarting: "GAME IS ABOUT TO START!",
        skip: "SKIP",
        round: "ROUND",
        next: "NEXT UP",
        startingIn: "Starting in",
        startShow: "START SHOW",
    },
    es: {
        gameStarting: "¡EL JUEGO ESTÁ POR COMENZAR!",
        skip: "SALTAR",
        round: "RONDA",
        next: "A CONTINUACIÓN",
        startingIn: "Comenzando en",
        startShow: "EMPEZAR SHOW",
    }
};

const MUSIC_PATHS = {
    viktoria: "/sounds/Viktoria_Game_On_.mp3",
    show_don_start: "/sounds/Show_Don_Start.mp3",
    countdown: "/sounds/phantasticbeats-afro-countdown-109083.mp3"
};

const ShowRunner: React.FC<ShowRunnerProps> = ({ show, games, onExit }) => {
    const { lang: globalLang } = useLanguage();
    const lang = show.settings.language || (globalLang as "en" | "es");
    const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

    const [step, setStep] = useState<ShowStep>("intro");
    const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
    const [currentGameIndex, setCurrentGameIndex] = useState(0);
    const [countdown, setCountdown] = useState(20);
    const [teamScores, setTeamScores] = useState<Record<string, number>>(() => {
        return Object.fromEntries(show.teams.map((t) => [t.id, 0]));
    });
    const [isMusicPlaying, setIsMusicPlaying] = useState(true);
    const [hostControl, setHostControl] = useState<"ipad" | "manual">(show.settings.hostControl || "ipad");
    useEffect(() => { console.log("ShowRunner hostControl changed:", hostControl); }, [hostControl]);
    const [playerControl, setPlayerControl] = useState<"ipad" | "manual">(show.settings.playerControl || "ipad");

    const { isRemoteMode, updateSession, startSession, leaveSession, sessionId, sessionData } = useSync();

    const sortedRounds = useMemo(() => {
        return [...show.rounds].sort((a, b) => a.order - b.order);
    }, [show.rounds]);

    const currentRound = sortedRounds[currentRoundIndex];
    const currentGameId = currentRound?.gameIds[currentGameIndex];
    const currentGame = useMemo(() => games.find((g) => g.id === currentGameId), [games, currentGameId]);

    // Audio References
    const audioRef = React.useRef<{
        intro?: HTMLAudioElement;
        countdown?: HTMLAudioElement;
    }>({});

    useEffect(() => {
        // 🛑 STOP ALL global sounds on mount
        stopAllSounds();

        // 📡 Start Sync Session ONLY if needed
        const needsRemote = hostControl === 'ipad' || playerControl === 'ipad';

        if (needsRemote) {
            console.log("ShowRunner: Starting remote session...");
            startSession(show.id, teamScores)
                .then(id => console.log("ShowRunner: startSession SUCCESS. sessionId:", id))
                .catch(err => {
                    console.error("ShowRunner: Failed to start session:", err);
                    alert("Failed to connect to Firebase. Remote features (iPads) won't work.");
                });
        } else {
            console.log("ShowRunner: Manual mode only. Skipping remote session.");
        }

        // Initialize audio objects
        const introPath = MUSIC_PATHS[show.settings.introMusic as keyof typeof MUSIC_PATHS] || MUSIC_PATHS.viktoria;
        audioRef.current.intro = new Audio(introPath);
        audioRef.current.intro.loop = false; // 🛑 NO LOOP
        audioRef.current.countdown = new Audio(MUSIC_PATHS.countdown);

        return () => {
            audioRef.current.intro?.pause();
            audioRef.current.countdown?.pause();
            // 🎬 Mission 17: Clean up session on unmount
            leaveSession();
        };
    }, []);

    useEffect(() => {
        // Watchdog: If we are in lobby or playing, but sessionId is lost, try to restart IF needed
        const needsRemote = hostControl === 'ipad' || playerControl === 'ipad';
        if (needsRemote && (step === 'lobby' || step === 'playing') && !sessionId) {
            console.log("ShowRunner Watchdog: No session found in", step, ". Restarting...");
            startSession(show.id, teamScores).catch(e => console.error("Watchdog failed:", e));
        }
    }, [step, sessionId, show.id, startSession, hostControl, playerControl]);

    // Handle audio based on step
    useEffect(() => {
        const { intro, countdown: countdownAudio } = audioRef.current;

        if (step === "intro" || step === "leaderboard") {
            if (isMusicPlaying) {
                intro?.play().catch(e => console.warn("Intro audio blocked:", e));
            } else {
                intro?.pause();
            }
            countdownAudio?.pause();
            if (countdownAudio) countdownAudio.currentTime = 0;
        } else if (step === "announcement") {
            intro?.pause();
            countdownAudio?.play().catch(e => console.warn("Countdown audio blocked:", e));
        } else if (step === "playing") {
            // 🛑 CRITICAL: Stop EVERYTHING during game play
            intro?.pause();
            if (intro) intro.currentTime = 0;
            countdownAudio?.pause();
            if (countdownAudio) countdownAudio.currentTime = 0;
            stopAllSounds();
        } else {
            intro?.pause();
            countdownAudio?.pause();
        }
    }, [step]);

    // Countdown Logic
    useEffect(() => {
        let timer: any;
        if (step === "announcement" && countdown > 0) {
            timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        } else if (step === "announcement" && countdown === 0) {
            setStep("playing");
        }
        return () => clearTimeout(timer);
    }, [step, countdown]);

    // Sync state with Firestore
    useEffect(() => {
        if (isRemoteMode) {
            updateSession({
                currentShowId: show.id,
                currentRoundIndex,
                currentGameIndex,
                currentStep: step,
                teamScores,
                fullGameData: currentGame || null, // 📡 MISSION 29: Pass game data to Host iPad
            });
        }
    }, [step, currentRoundIndex, currentGameIndex, teamScores, isRemoteMode, show.id, updateSession]);

    // 🎬 MISSION 05: Listen for Host Commands
    const lastCommandTimestamp = React.useRef<number>(0);
    
    useEffect(() => {
        console.log("ShowRunner Status: step=", step, "sessionId=", sessionId, "isRemoteMode=", isRemoteMode);
    }, [step, sessionId, isRemoteMode]);
    
    useEffect(() => {
        if (!isRemoteMode || !sessionData?.hostCommand) return;

        const cmd = (sessionData as any).hostCommand;
        const ts = cmd.timestamp || 0;
        
        // Skip if already processed
        if (ts > 0 && ts <= lastCommandTimestamp.current) return;
        if (ts > 0) lastCommandTimestamp.current = ts;

        const { type, payload } = cmd;

        if (type === 'next_game') {
            // Only trigger if we are in a state that allows "Next"
            if (step === 'leaderboard' || step === 'intro' || step === 'lobby') {
                nextAction();
                // Clear the command to avoid loops if needed, 
                // but usually the Host clears it or it's a timestamped packet
            }
        }

        if (type === 'finish_round') {
            handleFinishGame();
        }

        if (type === 'quit_to_lobby') {
            setStep('lobby');
            setCountdown(20);
        }
    }, [isRemoteMode, sessionData?.hostCommand, step]);

    const handleFinishGame = (earnedPoints?: Record<string, number>) => {
        if (earnedPoints) {
            setTeamScores((prev) => {
                const next = { ...prev };
                Object.entries(earnedPoints).forEach(([teamId, points]) => {
                    next[teamId] = (next[teamId] || 0) + points;
                });
                return next;
            });
        }

        // Determine next step
        const isLastGameInRound = currentGameIndex === currentRound.gameIds.length - 1;
        const isLastRound = currentRoundIndex === sortedRounds.length - 1;

        if (isLastGameInRound && isLastRound) {
            setStep("final_results");
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 },
                colors: show.teams.map(t => t.color || '#fbbf24')
            });
        } else {
            setStep("leaderboard");
        }
    };

    const fadeOutIntro = (onComplete: () => void) => {
        const intro = audioRef.current.intro;
        if (!intro || intro.paused) {
            onComplete();
            return;
        }

        const startVolume = intro.volume;
        const duration = 1500; // 1.5s fade
        const interval = 50;
        const steps = duration / interval;
        const volumeStep = startVolume / steps;

        const timer = setInterval(() => {
            if (intro.volume > volumeStep) {
                intro.volume -= volumeStep;
            } else {
                intro.volume = 0;
                intro.pause();
                intro.volume = startVolume;
                clearInterval(timer);
                onComplete();
            }
        }, interval);
    };

    const handleStartShow = () => {
        fadeOutIntro(() => {
            setStep("lobby");
        });
    };

    const nextAction = () => {
        // 🎬 FIX: If we are in lobby/intro, DON'T increment. Just start first game (0,0).
        if (step === "lobby" || step === "intro") {
            setCurrentRoundIndex(0);
            setCurrentGameIndex(0);
        } else {
            const isLastGameInRound = currentGameIndex === (currentRound?.gameIds.length || 0) - 1;

            if (isLastGameInRound) {
                setCurrentRoundIndex((prev) => prev + 1);
                setCurrentGameIndex(0);
            } else {
                setCurrentGameIndex((prev) => prev + 1);
            }
        }

        setCountdown(20);
        setStep("announcement");
    };

    if (step === "playing" && currentGame) {
        return (
            <div className="flex flex-col h-screen overflow-hidden bg-black">
                {hostControl === 'manual' && <MasterControlPanel />}
                <div className="flex-1 relative">
                    <GameRouter
                        game={currentGame}
                        teams={show.teams}
                        teamScores={teamScores}
                        onScoreChange={(teamId, score) => {
                            setTeamScores((prev) => ({ ...prev, [teamId]: (prev[teamId] || 0) + score }));
                        }}
                        language={show.settings.language}
                        hostControl={hostControl}
                        playerControl={playerControl}
                        onExit={(points) => handleFinishGame(points)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#0a0a0a] text-white overflow-hidden flex flex-col items-center justify-center p-8">
            <AnimatePresence mode="wait">
                {step === "intro" && (
                    <motion.div
                        key="intro"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="text-center"
                    >
                        <h2 className="text-xl font-bold text-yellow-500 mb-2 uppercase tracking-[0.3em]">Viktoría Presents</h2>
                        <h1 className="text-8xl font-black mb-8 tracking-tighter bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                            {show.name.toUpperCase()}
                        </h1>
                        <div className="flex flex-col items-center gap-6">
                            <button
                                onClick={handleStartShow}
                                className="bg-white text-black font-black px-12 py-4 rounded-full text-2xl hover:bg-yellow-400 transition-all active:scale-95 shadow-2xl"
                            >
                                {t.startShow}
                            </button>

                            {/* Discrete Music Toggle */}
                            <button
                                onClick={() => setIsMusicPlaying(!isMusicPlaying)}
                                className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-all text-xs font-bold uppercase tracking-widest mt-4 group"
                            >
                                <div className={`w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white/40 ${isMusicPlaying ? 'bg-white/10' : ''}`}>
                                    {isMusicPlaying ? <Pause size={14} /> : <Play size={14} />}
                                </div>
                                {isMusicPlaying ? 'MUSICA ON' : 'MUSICA OFF'}
                            </button>

                            {/* Control Mode Toggles */}
                            <div className="flex gap-4 mt-8 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase text-yellow-500/50 tracking-widest text-left">Host Control</span>
                                    <div className="flex bg-black/40 p-1 rounded-xl">
                                        <button
                                            onClick={() => setHostControl("ipad")}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${hostControl === 'ipad' ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            IPAD
                                        </button>
                                        <button
                                            onClick={() => setHostControl("manual")}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${hostControl === 'manual' ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            MANUAL (PC)
                                        </button>
                                    </div>
                                </div>
                                <div className="w-[1px] bg-white/10" />
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase text-yellow-500/50 tracking-widest text-left">Player Control</span>
                                    <div className="flex bg-black/40 p-1 rounded-xl">
                                        <button
                                            onClick={() => setPlayerControl("ipad")}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${playerControl === 'ipad' ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            IPAD
                                        </button>
                                        <button
                                            onClick={() => setPlayerControl("manual")}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${playerControl === 'manual' ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            MANUAL (PC)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === "lobby" && (
                    <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                        <SessionLobby teams={show.teams} onStart={() => nextAction()} hostControl={hostControl} />
                    </motion.div>
                )}

                {step === "announcement" && currentGame && (
                    <motion.div
                        key="announcement"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        className="text-center w-full max-w-4xl"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-block px-6 py-2 bg-brand-primary/10 border border-brand-primary text-brand-primary rounded-full text-xl font-bold mb-8 uppercase tracking-widest"
                        >
                            {t.gameStarting}
                        </motion.div>

                        <h2 className="text-4xl font-bold text-text-secondary mb-2 uppercase tracking-tight">
                            {t.next}
                        </h2>
                        <h1 className="text-8xl font-black mb-12 bg-gradient-to-r from-white via-brand-primary to-white bg-clip-text text-transparent uppercase tracking-tighter">
                            {currentGame.name}
                        </h1>

                        <div className="flex flex-col items-center gap-12">
                            <div className="relative w-48 h-48 flex items-center justify-center">
                                <svg className="absolute inset-0 w-full h-full -rotate-90">
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        fill="none"
                                        stroke="white"
                                        strokeOpacity="0.1"
                                        strokeWidth="8"
                                    />
                                    <motion.circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        fill="none"
                                        stroke="var(--brand-primary)"
                                        strokeWidth="8"
                                        strokeDasharray="552.92"
                                        animate={{ strokeDashoffset: 552.92 - (552.92 * countdown) / 20 }}
                                        transition={{ duration: 1, ease: "linear" }}
                                    />
                                </svg>
                                <div className="text-7xl font-black tabular-nums">
                                    {countdown}
                                </div>
                            </div>

                            <button
                                onClick={() => setStep("playing")}
                                className="group px-8 py-3 bg-base-200 border border-base-300 rounded-xl hover:bg-base-300 transition-all flex items-center gap-3 text-lg font-bold"
                            >
                                <FastForward className="group-hover:translate-x-1 transition-transform" />
                                {t.skip}
                            </button>
                        </div>
                    </motion.div>
                )}

                {(step === "leaderboard" || step === "final_results") && (
                    <motion.div
                        key="scoreboard"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-5xl"
                    >
                        <h2 className="text-5xl font-black text-center mb-12 flex items-center justify-center gap-4">
                            <Trophy className="text-yellow-400 w-12 h-12" />
                            {step === "final_results" ? "FINAL RESULTS" : "CURRENT STANDINGS"}
                            <Trophy className="text-yellow-400 w-12 h-12" />
                        </h2>

                        <div className="space-y-4 mb-12">
                            {show.teams
                                .sort((a, b) => (teamScores[b.id] || 0) - (teamScores[a.id] || 0))
                                .map((team, index) => (
                                    <motion.div
                                        key={team.id}
                                        layoutId={team.id}
                                        className="bg-base-200 border border-base-300 p-6 rounded-2xl flex items-center gap-6"
                                    >
                                        <div className="text-4xl font-black text-text-secondary w-12">{index + 1}º</div>
                                        <div
                                            className="w-16 h-16 rounded-full flex items-center justify-center text-4xl shadow-lg border-2"
                                            style={{ borderColor: team.color, backgroundColor: `${team.color}20` }}
                                        >
                                            <TeamIcon iconName={team.emoji} className="w-10 h-10" style={{ color: team.color }} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-2xl font-bold">{team.name}</h3>
                                            <div className="flex gap-2 mt-1">
                                                {team.players.map(p => (
                                                    <span key={p.id} className="text-xs text-text-secondary bg-base-300 px-2 py-0.5 rounded">
                                                        {p.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-5xl font-black font-mono text-brand-primary">
                                            {teamScores[team.id] || 0}
                                        </div>
                                    </motion.div>
                                ))}
                        </div>

                        <div className="flex justify-center gap-6">
                            {step === "final_results" ? (
                                <button
                                    onClick={onExit}
                                    className="px-8 py-4 bg-base-200 border border-base-300 rounded-xl hover:bg-base-300 transition-colors flex items-center gap-3 text-xl font-bold"
                                >
                                    <Home /> BACK TO DASHBOARD
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={onExit}
                                        className="px-8 py-4 bg-red-600/10 text-red-400 border border-red-600/30 rounded-xl hover:bg-red-600/20 transition-colors flex items-center gap-3 font-bold"
                                    >
                                        SAVE & EXIT
                                    </button>
                                    <button
                                        onClick={nextAction}
                                        className="px-10 py-4 bg-brand-primary text-black rounded-xl hover:bg-brand-secondary transition-colors flex items-center gap-3 text-xl font-black"
                                    >
                                        NEXT GAME <ChevronRight />
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Round/Game Info bar at bottom */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/50 backdrop-blur-md border-t border-white/10 flex justify-between items-center px-12 text-sm uppercase tracking-widest text-text-secondary font-bold">
                <div className="flex items-center gap-8">
                    <span className="flex items-center gap-2">
                        <LayoutList size={16} /> ROUND {currentRoundIndex + 1} / {sortedRounds.length}
                    </span>
                    <span>{currentRound.name}</span>
                </div>
                <div className="flex items-center gap-4">
                    GAME {currentGameIndex + 1} / {currentRound.gameIds.length}
                </div>
            </div>
        </div>
    );
};

export default ShowRunner;
