import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Game, Show, Team, ShowMediaItem } from "@/types";
import GameRouter from "./GameRouter";
import { useSync } from "@/context/SyncContext";
import { Trophy, Users, Play, Pause, ChevronRight, Home, LayoutList, FastForward, ArrowLeft } from "lucide-react";
import confetti from "canvas-confetti";
import { useLanguage } from "@/context/LanguageContext";
import { stopAllSounds } from "@/utils/sound";
import MasterControlPanel from "./host/MasterControlPanel";
import SessionLobby from "@/components/SessionLobby";
import TeamIcon from "@/components/TeamIcon";
import { resolveMediaUrl } from "@/utils/media";
import { saveActiveShowRun, deleteActiveShowRun } from "@/services/localShowService";

type ShowStep = "intro" | "lobby" | "announcement" | "playing" | "leaderboard" | "final_results";

const ActiveAssetsSlideshow: React.FC<{ assets: ShowMediaItem[]; fullSize?: boolean }> = ({ assets, fullSize }) => {
    const activeAssets = useMemo(() => assets.filter(a => a.url), [assets]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (activeAssets.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % activeAssets.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [activeAssets]);

    const activeAsset = activeAssets[currentIndex];
    if (!activeAsset || !activeAsset.url) return null;

    const sizeClasses = fullSize ? {
        small: "h-[300px] max-w-[600px]",
        medium: "h-[450px] max-w-[800px]",
        large: "h-[550px] max-w-[1000px] w-full"
    } : {
        small: "h-12 max-w-[120px]",
        medium: "h-20 max-w-[200px]",
        large: "h-28 max-w-[280px]"
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={activeAsset.id}
                initial={fullSize ? { opacity: 0, scale: 0.95 } : { opacity: 0, scale: 0.85, y: 15 }}
                animate={fullSize ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: 0 }}
                exit={fullSize ? { opacity: 0, scale: 1.05 } : { opacity: 0, scale: 0.85, y: -15 }}
                transition={{ duration: 0.4 }}
                className={fullSize 
                    ? "bg-black/40 border border-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] flex items-center justify-center shadow-2xl pointer-events-auto w-full max-w-5xl h-[600px] overflow-hidden" 
                    : "bg-black/75 border border-white/10 backdrop-blur-md p-3 rounded-2xl flex items-center justify-center shadow-2xl pointer-events-auto"
                }
            >
                <img
                    src={activeAsset.url}
                    alt="Commercial Asset"
                    className={`object-contain transition-all duration-300 ${sizeClasses[activeAsset.size] || sizeClasses.medium}`}
                    style={fullSize ? { maxHeight: '100%', maxWidth: '100%' } : undefined}
                />
            </motion.div>
        </AnimatePresence>
    );
};

interface ShowRunnerProps {
    show: Show;
    games: Game[];
    onExit: () => void;
    initialState?: {
        step: ShowStep;
        currentRoundIndex: number;
        currentGameIndex: number;
        teamScores: Record<string, number>;
        eliminatedTeamIds?: string[];
        sessionId?: string;
    };
}

const TRANSLATIONS = {
    en: {
        gameStarting: "GAME IS ABOUT TO START!",
        skip: "SKIP",
        round: "ROUND",
        next: "NEXT UP",
        startingIn: "Starting in",
        startShow: "START SHOW",
        startGame: "START GAME",
    },
    es: {
        gameStarting: "¡EL JUEGO ESTÁ POR COMENZAR!",
        skip: "SALTAR",
        round: "RONDA",
        next: "A CONTINUACIÓN",
        startingIn: "Comenzando en",
        startShow: "EMPEZAR SHOW",
        startGame: "COMENZAR JUEGO",
    }
};

const MUSIC_PATHS = {
    viktoria: "/sounds/Viktoria_Game_On_.mp3",
    show_don_start: "/sounds/Show_Don_Start.mp3",
    countdown: "/sounds/phantasticbeats-afro-countdown-109083.mp3"
};

const ShowRunner: React.FC<ShowRunnerProps> = ({ show, games, onExit, initialState }) => {
    const { lang: globalLang } = useLanguage();
    const lang = show.settings.language || (globalLang as "en" | "es");
    const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

    const [step, setStep] = useState<ShowStep>(initialState?.step ?? "lobby");
    const [currentRoundIndex, setCurrentRoundIndex] = useState(initialState?.currentRoundIndex ?? 0);
    const [currentGameIndex, setCurrentGameIndex] = useState(initialState?.currentGameIndex ?? 0);
    const [countdown, setCountdown] = useState(20);
    const [teamScores, setTeamScores] = useState<Record<string, number>>(() => {
        return initialState?.teamScores ?? Object.fromEntries(show.teams.map((t) => [t.id, 0]));
    });
    const [eliminatedTeamIds, setEliminatedTeamIds] = useState<string[]>(() => {
        return initialState?.eliminatedTeamIds ?? [];
    });
    const [isMusicPlaying, setIsMusicPlaying] = useState(true);
    const [hostControl, setHostControl] = useState<"ipad" | "manual">(show.settings.hostControl || "ipad");
    useEffect(() => { console.log("ShowRunner hostControl changed:", hostControl); }, [hostControl]);
    const [playerControl, setPlayerControl] = useState<"ipad" | "manual">(show.settings.playerControl || "ipad");

    const { isRemoteMode, updateSession, startSession, joinSession, leaveSession, sessionId, sessionData, deviceRole, setDeviceRole } = useSync();

    const hasInitializedFromSession = React.useRef(false);

    const sortedRounds = useMemo(() => {
        return [...show.rounds].sort((a, b) => a.order - b.order);
    }, [show.rounds]);

    const currentRound = sortedRounds[currentRoundIndex];
    const currentGameId = currentRound?.gameIds[currentGameIndex];
    const currentGame = useMemo(() => games.find((g) => g.id === currentGameId), [games, currentGameId]);

    const activeTeams = useMemo(() => {
        return show.teams.filter(t => !eliminatedTeamIds.includes(t.id));
    }, [show.teams, eliminatedTeamIds]);

    // Audio References
    const audioRef = React.useRef<{
        intro?: HTMLAudioElement;
        countdown?: HTMLAudioElement;
    }>({});

    useEffect(() => {
        // Ensure main window is set to host role if it's not a passive viewer window
        const params = new URLSearchParams(window.location.search);
        const isViewer = params.get('role') === 'viewer';
        if (!isViewer && deviceRole !== 'host') {
            console.log("ShowRunner: Setting device role to host for main window");
            setDeviceRole('host');
        }

        // 🛑 STOP ALL global sounds on mount
        stopAllSounds();

        // 📡 Start Sync Session ONLY if needed
        const needsRemote = hostControl === 'ipad' || playerControl === 'ipad';

        if (needsRemote) {
            if (initialState?.sessionId) {
                console.log("ShowRunner: Resuming existing remote session:", initialState.sessionId);
                joinSession(initialState.sessionId, 'host');
            } else {
                console.log("ShowRunner: Starting remote session...");
                startSession({ currentGameId: show.id, teamScores })
                    .then(id => console.log("ShowRunner: startSession SUCCESS. sessionId:", id))
                    .catch(err => {
                        console.error("ShowRunner: Failed to start session:", err);
                        alert("Failed to connect to Firebase. Remote features (iPads) won't work.");
                    });
            }
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
            startSession({ currentGameId: show.id, teamScores }).catch(e => console.error("Watchdog failed:", e));
        }
    }, [step, sessionId, show.id, startSession, hostControl, playerControl]);

    // Handle audio based on step
    useEffect(() => {
        const { intro, countdown: countdownAudio } = audioRef.current;
        const isFinalRound = currentRoundIndex === sortedRounds.length - 1;

        if (step === "intro" || step === "leaderboard") {
            if (isMusicPlaying && !isFinalRound) {
                intro?.play().catch(e => console.warn("Intro audio blocked:", e));
            } else {
                intro?.pause();
            }
            countdownAudio?.pause();
            if (countdownAudio) countdownAudio.currentTime = 0;
        } else if (step === "announcement") {
            intro?.pause();
            if (!isFinalRound) {
                countdownAudio?.play().catch(e => console.warn("Countdown audio blocked:", e));
            } else {
                countdownAudio?.pause();
                if (countdownAudio) countdownAudio.currentTime = 0;
            }
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
    }, [step, currentRoundIndex, isMusicPlaying]);

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

    const fullShowGames = useMemo(() => {
        const map: Record<string, any> = {};
        show.rounds.forEach(round => {
            round.gameIds.forEach(gameId => {
                const g = games.find(x => x.id === gameId);
                if (g) {
                    map[gameId] = g;
                }
            });
        });
        return map;
    }, [show, games]);

    // Sync state with Firestore
    useEffect(() => {
        if (isRemoteMode && hasInitializedFromSession.current) {
            updateSession({
                currentShowId: show.id,
                fullShowData: show,
                currentRoundIndex,
                currentGameIndex,
                currentStep: step,
                teamScores,
                teams: show.teams,
                eliminatedTeamIds, // Sync eliminated teams
                fullGameData: currentGame || null, // 📡 MISSION 29: Pass game data to Host iPad
                fullShowGames: Array.isArray(fullShowGames) ? fullShowGames : [], // 📡 Upload all games in the show for the Council of Elders
            });
        }
    }, [step, currentRoundIndex, currentGameIndex, teamScores, show.teams, eliminatedTeamIds, isRemoteMode, show.id, updateSession, show, fullShowGames]);

    // Sync remote/local session state to local state (Catch-up & updates)
    useEffect(() => {
        if (!isRemoteMode || !sessionData) return;

        // If we haven't initialized from Firestore yet, do it now
        if (!hasInitializedFromSession.current) {
            console.log("ShowRunner: Initializing local state from sessionData:", sessionData);
            
            // Initialize host command timestamp to prevent re-running old commands
            if (sessionData.hostCommand?.timestamp) {
                lastCommandTimestamp.current = sessionData.hostCommand.timestamp;
            } else {
                lastCommandTimestamp.current = 0;
            }

            // Only catch up if the session has valid data for this show
            if (sessionData.currentShowId === show.id || sessionData.currentGameId === show.id) {
                // If the session has a valid step and it's not the initial "waiting", catch up!
                if (sessionData.currentStep && sessionData.currentStep !== 'waiting') {
                    setStep(sessionData.currentStep as ShowStep);
                } else {
                    setStep(initialState?.step ?? 'lobby');
                }
                
                if (typeof sessionData.currentRoundIndex === 'number') {
                    setCurrentRoundIndex(sessionData.currentRoundIndex);
                }
                if (typeof sessionData.currentGameIndex === 'number') {
                    setCurrentGameIndex(sessionData.currentGameIndex);
                }
                if (sessionData.teamScores) {
                    setTeamScores(sessionData.teamScores);
                }
                if (sessionData.eliminatedTeamIds) {
                    setEliminatedTeamIds(sessionData.eliminatedTeamIds);
                }
            } else {
                // If it's a new or mismatched session, initialize step to lobby/initialState
                setStep(initialState?.step ?? 'lobby');
            }
            
            hasInitializedFromSession.current = true;
            return;
        }

        // Subsequent updates: sync score and elimination changes
        if (sessionData.teamScores) {
            const different = Object.entries(sessionData.teamScores).some(
                ([teamId, score]) => teamScores[teamId] !== score
            );
            if (different) {
                setTeamScores(sessionData.teamScores);
            }
        }
        if (sessionData.eliminatedTeamIds) {
            const different = sessionData.eliminatedTeamIds.length !== eliminatedTeamIds.length ||
                sessionData.eliminatedTeamIds.some(id => !eliminatedTeamIds.includes(id));
            if (different) {
                setEliminatedTeamIds(sessionData.eliminatedTeamIds);
            }
        }

        // For passive/viewer screens, passively follow progression (step, round, game) directly from sessionData
        const isPassiveScreen = hostControl === 'ipad' || deviceRole === 'viewer';
        if (isPassiveScreen) {
            if (sessionData.currentStep && sessionData.currentStep !== 'waiting' && sessionData.currentStep !== step) {
                console.log("ShowRunner Viewer: Syncing step to", sessionData.currentStep);
                setStep(sessionData.currentStep as ShowStep);
            }
            if (typeof sessionData.currentRoundIndex === 'number' && sessionData.currentRoundIndex !== currentRoundIndex) {
                console.log("ShowRunner Viewer: Syncing round index to", sessionData.currentRoundIndex);
                setCurrentRoundIndex(sessionData.currentRoundIndex);
            }
            if (typeof sessionData.currentGameIndex === 'number' && sessionData.currentGameIndex !== currentGameIndex) {
                console.log("ShowRunner Viewer: Syncing game index to", sessionData.currentGameIndex);
                setCurrentGameIndex(sessionData.currentGameIndex);
            }
        }
    }, [sessionData, isRemoteMode, show.id, initialState, step, currentRoundIndex, currentGameIndex, hostControl, deviceRole]);

    // Auto-save active run state when step, round, game, scores, or eliminations change
    useEffect(() => {
        if (step === "final_results") {
            deleteActiveShowRun(show.id).catch((err) => {
                console.error("Failed to delete active run on final results:", err);
            });
        } else {
            const runState = {
                step,
                currentRoundIndex,
                currentGameIndex,
                teamScores,
                eliminatedTeamIds,
                sessionId, // 📡 Save the session ID to resume later!
            };
            saveActiveShowRun(show.id, runState).catch((err) => {
                console.error("Failed to auto-save active run state:", err);
            });
        }
    }, [step, currentRoundIndex, currentGameIndex, teamScores, eliminatedTeamIds, show.id, sessionId]);



    // 🎬 FIX: Listen for Host Commands
    const lastCommandTimestamp = React.useRef<number>(-1);
    
    useEffect(() => {
        console.log("ShowRunner Status: step=", step, "sessionId=", sessionId, "isRemoteMode=", isRemoteMode);
    }, [step, sessionId, isRemoteMode]);
    
    useEffect(() => {
        if (!isRemoteMode || !sessionData?.hostCommand) return;

        const cmd = (sessionData as any).hostCommand;
        const ts = cmd.timestamp || 0;
        
        // Skip if already processed or if command listener runs before catch-up initialization
        if (lastCommandTimestamp.current === -1 || ts <= lastCommandTimestamp.current) return;
        lastCommandTimestamp.current = ts;

        const { type, payload } = cmd;

        if (type === 'start_show') {
            if (step === 'lobby') {
                handleStartShow();
            }
        }

        if (type === 'next_game') {
            // Only trigger if we are in a state that allows "Next"
            if (step === 'leaderboard') {
                nextAction();
            } else if (step === 'intro') {
                handleStartGameAfterIntro();
            }
        }

        if (type === 'skip_announcement' || type === 'start_playing') {
            if (step === 'announcement') {
                setStep("playing");
            }
        }

        if (type === 'finish_round') {
            handleFinishGame();
        }

        if (type === 'quit_to_lobby') {
            setStep('lobby');
            setCountdown(20);
        }

        if (type === 'exit_show') {
            onExit();
        }
    }, [isRemoteMode, sessionData?.hostCommand, step]);

    const handleFinishGame = (earnedPoints?: Record<string, number>) => {
        let updatedScores = { ...teamScores };
        if (earnedPoints) {
            setTeamScores((prev) => {
                const next = { ...prev };
                Object.entries(earnedPoints).forEach(([teamId, points]) => {
                    next[teamId] = (next[teamId] || 0) + points;
                });
                return next;
            });
            Object.entries(earnedPoints).forEach(([teamId, points]) => {
                updatedScores[teamId] = (updatedScores[teamId] || 0) + points;
            });
        }

        // Determine next step
        const isLastGameInRound = currentGameIndex === currentRound.gameIds.length - 1;
        const isLastRound = currentRoundIndex === sortedRounds.length - 1;

        if (isLastGameInRound) {
            const nextRoundIndex = currentRoundIndex + 1;
            const isNextRoundFinal = nextRoundIndex === sortedRounds.length - 1;
            const nextEliminated = [...eliminatedTeamIds];

            // Get currently active teams
            const activeTeams = show.teams.filter(t => !nextEliminated.includes(t.id));

            if (isNextRoundFinal) {
                // If next round is final, keep only top 2 teams
                const sortedActive = [...activeTeams].sort((a, b) => (updatedScores[b.id] || 0) - (updatedScores[a.id] || 0));
                const toEliminate = sortedActive.slice(2);
                toEliminate.forEach(t => {
                    if (!nextEliminated.includes(t.id)) {
                        nextEliminated.push(t.id);
                    }
                });
            } else if (!isLastRound) {
                // Regular round: eliminate team with lowest score
                if (activeTeams.length > 2) {
                    const sortedActive = [...activeTeams].sort((a, b) => (updatedScores[a.id] || 0) - (updatedScores[b.id] || 0));
                    const lowestTeam = sortedActive[0];
                    if (lowestTeam) {
                        nextEliminated.push(lowestTeam.id);
                    }
                }
            }

            setEliminatedTeamIds(nextEliminated);
        }

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
        setStep("intro");
    };

    const handleStartGameAfterIntro = () => {
        fadeOutIntro(() => {
            nextAction();
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

        if (isRemoteMode) {
            updateSession({
                usedQuestionIds: [],
                activeQuestionId: null,
                activeCategoryId: null,
                isAnswerRevealed: false,
                wasAnsweredCorrectly: false,
                isTimerRunning: false,
                timeLeft: 0,
                buzzerLockedBy: null,
                currentBuzzedParticipant: null,
                isBuzzerEnabled: false,
                incorrectOptions: [],
                pendingReboundTeam: null,
                hasReboundAttempted: false,
                attemptedTeams: [],
                smartAzzState: null,
                currentTeamIndex: 0
            });
        }
    };

    if (sessionData?.activeTieBreaker) {
        const tb = sessionData.activeTieBreaker;
        const question = tb.question;
        const roundType = tb.roundType;
        const winnerTeam = show.teams.find(t => t.id === tb.winnerTeamId);

        return (
            <div className="fixed inset-0 bg-gradient-to-br from-[#0c1020] via-[#05070f] to-[#010204] text-white overflow-hidden flex flex-col items-center justify-center p-8 relative">
                {/* Decorative glow and grids */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(252,163,17,0.08)_0%,transparent_80%)] pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 blur-[150px] rounded-full pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-5xl space-y-12 text-center relative z-10 animate-fade-in"
                >
                    <header className="space-y-3">
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                            <span className="inline-block px-6 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full text-xl font-black uppercase tracking-[0.25em] glow-orange">
                                ⚡ SUDDEN DEATH TIE-BREAKER ⚡
                            </span>
                            {question.topic && (
                                <span className="inline-block px-5 py-2 bg-purple-500/15 border border-purple-500/35 text-purple-400 rounded-full text-lg font-black uppercase tracking-[0.15em] shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                                    Topic: {question.topic}
                                </span>
                            )}
                        </div>
                        <h2 className="text-3xl font-black text-slate-400 uppercase tracking-wide">
                            {roundType === 'round1' ? 'Round 1: Multiple-Choice Shootout' : 'Round 2: Direct/Open Challenge'}
                        </h2>
                    </header>

                    {/* Question Card */}
                    <div className="bg-[#14213d]/20 border border-white/10 rounded-3xl p-10 md:p-12 shadow-2xl relative overflow-hidden backdrop-blur-md">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#fca311]" />
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight font-display">
                            {question.questionText}
                        </h1>
                    </div>

                    {/* Options / Answer */}
                    {roundType === 'round1' && question.options && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
                            {['A', 'B', 'C'].map((letter, idx) => {
                                const isCorrect = question.correctOption === letter;
                                const isRevealed = tb.revealed;
                                
                                return (
                                    <motion.div
                                        key={letter}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.15 }}
                                        className={`p-6 md:p-8 rounded-3xl border text-xl font-black flex items-center gap-4 transition-all shadow-xl ${
                                            isRevealed
                                                ? isCorrect
                                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 scale-[1.03] shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                                                    : 'bg-black/40 border-white/5 text-slate-600 opacity-40'
                                                : 'bg-white/5 border-white/10 text-white hover:border-[#fca311]/50'
                                        }`}
                                    >
                                        <span className={`text-sm px-3 py-1 rounded-xl font-black ${
                                            isRevealed && isCorrect
                                                ? 'bg-emerald-500 text-black'
                                                : 'bg-white/10 text-slate-300'
                                        }`}>{letter}</span>
                                        <div className="text-left font-bold">{question.options![idx]}</div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {roundType === 'round2' && tb.revealed && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 max-w-xl mx-auto shadow-2xl"
                        >
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 block mb-2">Predetermined Answer</span>
                            <div className="text-3xl font-extrabold text-white uppercase tracking-wide">
                                {question.correctAnswer}
                            </div>
                        </motion.div>
                    )}

                    {/* Celebration screen */}
                    {winnerTeam && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-8 text-center"
                        >
                            <div className="space-y-6 max-w-2xl">
                                <div className="w-32 h-32 rounded-full flex items-center justify-center mx-auto shadow-2xl border-4 text-5xl animate-pulse"
                                     style={{ borderColor: winnerTeam.color, backgroundColor: `${winnerTeam.color}20` }}>
                                    🏆
                                </div>
                                <div className="space-y-2">
                                    <span className="text-red-500 font-black text-xs uppercase tracking-[0.3em] block mb-2">TIE-BREAKER CHAMPION</span>
                                    <h1 className="text-6xl md:text-7xl font-black text-white uppercase tracking-tighter" style={{ color: winnerTeam.color }}>
                                        {winnerTeam.name}
                                    </h1>
                                </div>
                                <p className="text-lg text-slate-400 max-w-md mx-auto">
                                    Defeated their opponent in Sudden Death and advanced to the next stage!
                                </p>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        );
    }

    if (step === "playing" && currentGame) {
        return (
            <div className="flex flex-col h-screen overflow-hidden bg-black">
                {hostControl === 'manual' && <MasterControlPanel />}
                <div className="flex-1 relative">
                    <GameRouter
                        game={currentGame}
                        teams={activeTeams}
                        allTeams={show.teams}
                        teamScores={teamScores}
                        onScoreChange={(teamId, score) => {
                            setTeamScores((prev) => ({ ...prev, [teamId]: (prev[teamId] || 0) + score }));
                        }}
                        language={show.settings.language}
                        hostControl={hostControl}
                        playerControl={playerControl}
                        onExit={(points) => handleFinishGame(points)}
                        isFinalRound={currentRoundIndex === sortedRounds.length - 1}
                        themeMusicPath={MUSIC_PATHS[show.settings.introMusic as keyof typeof MUSIC_PATHS] || MUSIC_PATHS.viktoria}
                        organizers={show.settings.organizers}
                        winnerTitle={show.settings.winnerTitle}
                        thankYouMessage={show.settings.thankYouMessage}
                    />

                    {/* Floating Commercial Assets slideshow during gameplay */}
                    {show.assets && show.assets.some(a => a.url) && (
                        <div className="absolute bottom-4 right-4 z-50 pointer-events-none">
                            <ActiveAssetsSlideshow assets={show.assets} />
                        </div>
                    )}
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
                        className="text-center relative w-full h-full flex flex-col items-center justify-center"
                    >
                        <button
                            onClick={onExit}
                            className="absolute top-0 left-0 bg-white/5 hover:bg-white/10 text-white p-4 rounded-2xl transition-all border border-white/10 backdrop-blur-sm flex items-center gap-2 font-bold uppercase tracking-widest text-xs"
                        >
                            <ArrowLeft size={18} /> Back to Library
                        </button>

                        {/* Sponsors Section */}
                        {show.sponsors && show.sponsors.filter(s => s.url).length > 0 && (
                            <div className="flex flex-wrap items-center justify-center gap-8 max-w-5xl w-[90vw] z-30 mb-12 mt-8">
                                {show.sponsors.filter(s => s.url).map((sponsor) => (
                                    <img
                                        key={sponsor.id}
                                        src={sponsor.url}
                                        alt="Sponsor Logo"
                                        className={`object-contain transition-all duration-300 hover:scale-105 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] ${
                                            sponsor.size === "small"
                                                ? "h-12 max-w-[120px]"
                                                : sponsor.size === "large"
                                                ? "h-28 max-w-[280px]"
                                                : "h-20 max-w-[200px]" // medium
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                        
                        <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-[0.3em]">Viktoria Presents</h2>
                        <h1 className="text-8xl font-black mb-8 tracking-tighter bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                            {show.name.toUpperCase()}
                        </h1>

                        {show.assets && show.assets.some(a => a.url) ? (
                            <div className="mt-16 flex justify-center w-full max-w-5xl z-20">
                                <ActiveAssetsSlideshow assets={show.assets} fullSize />
                            </div>
                        ) : (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="relative flex items-center justify-center w-64 h-64 mt-4"
                            >
                                {/* Radial gradient glow in background */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(252,163,17,0.15)_0%,transparent_70%)] animate-pulse pointer-events-none" />
                                <div className="absolute w-48 h-48 bg-yellow-500/5 blur-[80px] rounded-full pointer-events-none" />
                                
                                {/* Rotating background aura */}
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-500/10 via-amber-500/5 to-transparent blur-xl pointer-events-none"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                />
                                
                                {/* The Trophy Icon itself */}
                                <div className="w-40 h-40 bg-gradient-to-br from-yellow-500/10 to-amber-600/5 border border-yellow-500/20 rounded-full flex items-center justify-center shadow-2xl relative">
                                    <Trophy size={80} className="text-yellow-500 filter drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {step === "lobby" && (
                    <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                        <SessionLobby 
                            teams={show.teams} 
                            onStart={handleStartShow} 
                            hostControl={hostControl} 
                            themeImage={show.themeImage}
                            location={show.settings.location}
                            onBack={onExit}
                        />
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
                                .sort((a, b) => {
                                    const aElim = eliminatedTeamIds.includes(a.id);
                                    const bElim = eliminatedTeamIds.includes(b.id);
                                    if (aElim && !bElim) return 1;
                                    if (!aElim && bElim) return -1;
                                    return (teamScores[b.id] || 0) - (teamScores[a.id] || 0);
                                })
                                .map((team, index) => {
                                    const isEliminated = eliminatedTeamIds.includes(team.id);
                                    return (
                                        <motion.div
                                            key={team.id}
                                            layoutId={team.id}
                                            className={`bg-base-200 border border-base-300 p-6 rounded-2xl flex items-center gap-6 ${isEliminated ? 'opacity-40 select-none saturate-50' : ''}`}
                                        >
                                            <div className="text-4xl font-black text-text-secondary w-12">
                                                {isEliminated ? "—" : `${index + 1}º`}
                                            </div>
                                            <div
                                                className="w-16 h-16 rounded-full flex items-center justify-center text-4xl shadow-lg border-2"
                                                style={{ borderColor: team.color, backgroundColor: `${team.color}20` }}
                                            >
                                                <TeamIcon iconName={team.emoji} className="w-10 h-10" style={{ color: team.color }} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-2xl font-bold">{team.name}</h3>
                                                    {isEliminated && (
                                                        <span className="px-2.5 py-0.5 bg-red-950/80 border border-red-500/50 text-red-500 rounded text-xs font-black uppercase tracking-wider">
                                                            {lang === 'es' ? 'Eliminado' : 'Eliminated'}
                                                        </span>
                                                    )}
                                                </div>
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
                                    );
                                })}
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

            {/* Floating Commercial Assets slideshow on non-playing screens (e.g. lobby, leaderboard, announcement) */}
            {step !== "intro" && show.assets && show.assets.some(a => a.url) && (
                <div className="absolute bottom-16 right-6 z-50 pointer-events-none">
                    <ActiveAssetsSlideshow assets={show.assets} />
                </div>
            )}

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
