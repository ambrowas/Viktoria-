import React, { useState } from 'react';
import { useSync } from '@/context/SyncContext';
import type { Show } from '@/types';
import { 
    Play, 
    RotateCcw, 
    FastForward, 
    Trophy, 
    Users, 
    ChevronRight, 
    LayoutList, 
    ArrowRightLeft,
    Save,
    Home,
    AlertTriangle,
    LogOut
} from 'lucide-react';
import SessionLobby from '@/components/SessionLobby';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ShowHostControllerProps {
    show: Show;
}

const ShowHostController: React.FC<ShowHostControllerProps> = ({ show }) => {
    const { lang } = useLanguage();
    const {
        sessionData,
        updateSession,
        applyPoints,
        participants
    } = useSync();

    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showCancelTieBreakerConfirm, setShowCancelTieBreakerConfirm] = useState(false);

    const renderModals = () => {
        return (
            <>
                {/* Custom Exit Confirmation Modal */}
                <AnimatePresence>
                    {showExitConfirm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-slate-900 border border-red-500/40 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
                            >
                                <LogOut className="text-red-500 w-16 h-16 mx-auto mb-4" />
                                <h2 className="text-2xl font-black text-white mb-2">
                                    {lang === "es" ? "¿Salir del Show?" : "Exit Show?"}
                                </h2>
                                <p className="text-slate-300 mb-8 text-sm">
                                    {lang === "es"
                                        ? "¿Estás seguro de que quieres guardar y salir del show?"
                                        : "Are you sure you want to save and exit the show?"}
                                </p>
                                
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowExitConfirm(false)}
                                        className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
                                    >
                                        {lang === "es" ? "Cancelar" : "Cancel"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowExitConfirm(false);
                                            updateSession({ hostCommand: { type: 'exit_show', payload: {}, timestamp: Date.now() } });
                                        }}
                                        className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                                    >
                                        {lang === "es" ? "Salir" : "Exit"}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Custom Cancel Tie-breaker Confirmation Modal */}
                <AnimatePresence>
                    {showCancelTieBreakerConfirm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-slate-900 border border-red-500/40 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
                            >
                                <AlertTriangle className="text-red-500 w-16 h-16 mx-auto mb-4" />
                                <h2 className="text-2xl font-black text-white mb-2">
                                    {lang === "es" ? "¿Cancelar Desempate?" : "Cancel Tie-Breaker?"}
                                </h2>
                                <p className="text-slate-300 mb-8 text-sm">
                                    {lang === "es"
                                        ? "¿Seguro que quieres CANCELAR el desempate? La pregunta activa se eliminará."
                                        : "Are you sure you want to CANCEL the tie-breaker? The active question will be deleted."}
                                </p>
                                
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowCancelTieBreakerConfirm(false)}
                                        className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
                                    >
                                        {lang === "es" ? "Cancelar" : "Cancel"}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setShowCancelTieBreakerConfirm(false);
                                            await updateSession({ activeTieBreaker: null });
                                        }}
                                        className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                                    >
                                        {lang === "es" ? "Confirmar" : "Confirm"}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        );
    };

    if (!sessionData) return null;

    const currentStep = sessionData.currentStep || 'lobby';
    const currentRoundIndex = sessionData.currentRoundIndex ?? 0;
    const currentGameIndex = sessionData.currentGameIndex ?? 0;
    const teamScores = sessionData.teamScores || {};

    // Commands to control progression
    const handleStartShow = () => {
        updateSession({ hostCommand: { type: 'start_show', payload: {}, timestamp: Date.now() } });
    };

    const handleExitShow = () => {
        setShowExitConfirm(true);
    };

    if (currentStep === 'lobby') {
        return (
            <>
                <SessionLobby
                    teams={show.teams}
                    onStart={handleStartShow}
                    onBack={handleExitShow}
                    location={show.settings?.location}
                />
                {renderModals()}
            </>
        );
    }

    // Get sorted rounds
    const sortedRounds = [...(show.rounds || [])].sort((a, b) => a.order - b.order);
    const currentRound = sortedRounds[currentRoundIndex];
    const currentGameId = currentRound?.gameIds?.[currentGameIndex];

    // Find all games listed in this show round to count progress
    const totalGamesInShow = sortedRounds.reduce((acc, r) => acc + (r.gameIds?.length || 0), 0);
    
    const handleNextGame = () => {
        updateSession({ hostCommand: { type: 'next_game', payload: {}, timestamp: Date.now() } });
    };

    const handleSkipAnnouncement = () => {
        updateSession({ hostCommand: { type: 'skip_announcement', payload: {}, timestamp: Date.now() } });
    };

    const eliminatedIds = sessionData.eliminatedTeamIds || [];
    const activeTeams = show.teams.filter(t => !eliminatedIds.includes(t.id));
    const activeScores = activeTeams.map(t => teamScores[t.id] || 0);
    const hasTie = activeScores.length > 1 && activeScores.some((score, idx) => activeScores.indexOf(score) !== idx);
    const isLastGameInRound = currentRound ? (currentGameIndex === currentRound.gameIds.length - 1) : false;

    const handleFinishRound = () => {
        updateSession({ hostCommand: { type: 'finish_round', payload: {}, timestamp: Date.now() } });
    };

    // Group participants by team
    const playersByTeam = show.teams.reduce((acc, team) => {
        acc[team.id] = participants.filter(p => p.teamId === team.id || p.teamId === `team-${team.id}`);
        return acc;
    }, {} as Record<string, typeof participants>);

    // Render central status & action panel based on current step
    const renderActionPanel = () => {
        switch (currentStep) {
            case 'intro':
                return (
                    <div className="bg-[#14213d]/10 border border-white/10 rounded-3xl p-8 text-center space-y-6 premium-glass">
                        <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center mx-auto glow-orange">
                            <Play size={40} className="text-yellow-500 ml-1" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black uppercase tracking-tight">Show is on Intro Screen</h3>
                            <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                The main screen is showing the intro splash, sponsors, and playing intro music. Tap below to start the first game.
                            </p>
                        </div>
                        <button
                            onClick={handleNextGame}
                            className="px-12 py-5 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black rounded-2xl hover:from-yellow-400 hover:to-amber-500 shadow-xl transition-all duration-300 transform active:scale-95 text-lg"
                        >
                            🎮 START GAME 1
                        </button>
                    </div>
                );

            case 'lobby':
                return (
                    <div className="bg-[#14213d]/10 border border-white/10 rounded-3xl p-8 text-center space-y-6 premium-glass">
                        <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                            <Users size={40} className="text-blue-400" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black uppercase tracking-tight">Show is in Lobby</h3>
                            <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                Contestants are checking in. Once teams are ready, open the intro splash screen to play the theme music and show sponsors.
                            </p>
                        </div>
                        <button
                            onClick={handleStartShow}
                            className="px-12 py-5 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black rounded-2xl hover:from-yellow-400 hover:to-amber-500 shadow-xl transition-all duration-300 transform active:scale-95 text-lg"
                        >
                            🎬 START INTRO
                        </button>
                    </div>
                );

            case 'announcement':
                return (
                    <div className="bg-[#14213d]/10 border border-white/10 rounded-3xl p-8 text-center space-y-6 premium-glass">
                        <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <RotateCcw size={40} className="text-yellow-500 animate-spin" style={{ animationDuration: '8s' }} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black uppercase tracking-tight">Game Announcement</h3>
                            <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                The main screen is counting down to announce the next game. Skip the timer to begin playing immediately.
                            </p>
                        </div>
                        <button
                            onClick={handleSkipAnnouncement}
                            className="px-12 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-2xl hover:from-emerald-400 hover:to-teal-500 shadow-xl transition-all duration-300 transform active:scale-95 text-lg flex items-center justify-center gap-2 mx-auto"
                        >
                            <FastForward size={20} />
                            ⚡ SKIP COUNTDOWN
                        </button>
                    </div>
                );

            case 'leaderboard':
                return (
                    <div className="bg-[#14213d]/10 border border-white/10 rounded-3xl p-8 text-center space-y-6 premium-glass">
                        <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(252,163,17,0.2)]">
                            <Trophy size={40} className="text-yellow-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black uppercase tracking-tight">Standings Displayed</h3>
                            <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                Standings are shown on screen. Advance to the next game or save and pause the show.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={handleExitShow}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl shadow-xl transition-all duration-300 transform active:scale-95 text-sm flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                💾 SAVE & EXIT
                            </button>
                            <button
                                onClick={handleNextGame}
                                disabled={hasTie && (currentRoundIndex === 0 || currentRoundIndex === 1)}
                                className={`px-10 py-4 font-black rounded-2xl shadow-xl transition-all duration-300 transform active:scale-95 text-sm flex items-center justify-center gap-2 ${
                                    hasTie && (currentRoundIndex === 0 || currentRoundIndex === 1)
                                        ? 'bg-slate-800 text-slate-600 border border-white/5 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black hover:from-yellow-400 hover:to-amber-500'
                                }`}
                            >
                                NEXT ROUND / GAME
                                <ChevronRight size={18} strokeWidth={3} />
                            </button>
                        </div>

                        {hasTie && (currentRoundIndex === 0 || currentRoundIndex === 1) && (
                            <div className="mt-8 border-t border-white/10 pt-8 space-y-4 max-w-md mx-auto">
                                <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-left flex items-start gap-3">
                                    <AlertTriangle className="text-red-500 w-8 h-8 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-extrabold text-[#fca311] uppercase text-xs tracking-wider">TIE-BREAKER ACTION REQUIRED</h4>
                                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                            The active teams are tied in points. To resolve this elimination round and advance, you must execute a Sudden Death Tie-Breaker.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        const roundType = currentRoundIndex === 0 ? 'round1' : 'round2';
                                        const reserveList = sessionData.reserveQuestions?.filter(q => q.roundType === roundType) || [];
                                        if (reserveList.length === 0) {
                                            alert(`No reserve questions available for ${roundType === 'round1' ? 'Round 1' : 'Round 2'}! The Council of Elders must submit a reserve question on their portal first.`);
                                            return;
                                        }
                                        const randQ = reserveList[Math.floor(Math.random() * reserveList.length)];
                                        await updateSession({
                                            activeTieBreaker: {
                                                roundType,
                                                question: randQ,
                                                revealed: false,
                                                winnerTeamId: null,
                                                loserTeamId: null
                                            }
                                        });
                                    }}
                                    className="w-full py-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]"
                                >
                                    ⚡ TRIGGER SUDDEN DEATH TIE-BREAKER
                                </button>
                            </div>
                        )}
                    </div>
                );

            case 'final_results':
                return (
                    <div className="bg-[#14213d]/10 border border-white/10 rounded-3xl p-8 text-center space-y-6 premium-glass animate-bounce-slow">
                        <div className="w-24 h-24 bg-yellow-500/20 border border-yellow-500/40 rounded-full flex items-center justify-center mx-auto glow-orange">
                            <Trophy size={48} className="text-yellow-400 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-yellow-400 via-white to-yellow-400 bg-clip-text text-transparent">Final Trophy Stage</h3>
                            <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                The show is finished and the champions are crowned. Close the game show session.
                            </p>
                        </div>
                        <button
                            onClick={handleExitShow}
                            className="px-12 py-5 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black rounded-2xl hover:from-yellow-400 hover:to-amber-500 shadow-xl transition-all duration-300 transform active:scale-95 text-lg flex items-center justify-center gap-2 mx-auto"
                        >
                            <Home size={20} />
                            🏆 CLOSE GAME SHOW
                        </button>
                    </div>
                );

            default:
                return (
                    <div className="p-8 text-center text-slate-500 font-mono text-sm">
                        Orchestrating... PC master handles state machine.
                    </div>
                );
        }
    };

    if (sessionData.activeTieBreaker) {
        const tb = sessionData.activeTieBreaker;
        const question = tb.question;
        const roundType = tb.roundType;

        const handleWinner = async (winnerTeamId: string) => {
            const loser = activeTeams.find(t => t.id !== winnerTeamId);
            const newScores = {
                ...teamScores,
                [winnerTeamId]: (teamScores[winnerTeamId] || 0) + 1
            };
            await updateSession({
                teamScores: newScores,
                activeTieBreaker: {
                    ...tb,
                    revealed: true,
                    winnerTeamId,
                    loserTeamId: loser?.id || null
                }
            });
        };

        const handleLoser = async (loserTeamId: string) => {
            const winner = activeTeams.find(t => t.id !== loserTeamId);
            if (!winner) return;
            const newScores = {
                ...teamScores,
                [winner.id]: (teamScores[winner.id] || 0) + 1
            };
            await updateSession({
                teamScores: newScores,
                activeTieBreaker: {
                    ...tb,
                    revealed: true,
                    winnerTeamId: winner.id,
                    loserTeamId
                }
            });
        };

        const handleResolve = async () => {
            await updateSession({
                activeTieBreaker: null
            });
            handleFinishRound();
        };

        return (
            <>
                <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-8 pb-12">
                    <div className="bg-[#14213d]/10 border border-[#fca311]/40 rounded-3xl p-8 space-y-6 premium-glass relative overflow-hidden text-left">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-[#fca311] to-emerald-500" />
                        
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">Sudden Death Panel</span>
                                <h2 className="text-2xl font-black uppercase text-white tracking-tight">Active Tie-Breaker Controls</h2>
                                {question.topic && (
                                    <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded bg-purple-600/20 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-wider">
                                        Topic: {question.topic}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setShowCancelTieBreakerConfirm(true)}
                                className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-xs font-black uppercase transition-colors"
                            >
                                {lang === 'es' ? 'Cancelar Desempate' : 'Cancel Tie-Breaker'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="text-slate-400 text-xs uppercase font-black tracking-widest">Question Text</div>
                            <p className="text-xl font-bold text-white leading-relaxed">{question.questionText}</p>

                            {roundType === 'round1' && question.options && (
                                <div className="space-y-2 pt-2">
                                    <div className="text-slate-400 text-xs uppercase font-black tracking-widest mb-1">Options (Correct in Green)</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {['A', 'B', 'C'].map((letter, idx) => {
                                            const isCorrect = question.correctOption === letter;
                                            return (
                                                <div
                                                    key={letter}
                                                    className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 ${
                                                        isCorrect
                                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                            : 'bg-black/30 border-white/5 text-slate-400'
                                                    }`}
                                                >
                                                    <span className="text-xs px-2 py-0.5 rounded bg-black/40 text-slate-400">{letter}</span>
                                                    {question.options![idx]}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {roundType === 'round2' && (
                                <div className="space-y-2 pt-2">
                                    <div className="text-slate-400 text-xs uppercase font-black tracking-widest mb-1">Predetermined Answer</div>
                                    <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-bold">
                                        {question.correctAnswer}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-white/10 pt-6 space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#fca311] mb-2">Evaluate Team Responses</h3>
                            
                            {!tb.winnerTeamId ? (
                                <div className="grid md:grid-cols-2 gap-4">
                                    {activeTeams.map((team) => (
                                        <div key={team.id} className="bg-black/30 border border-white/5 p-5 rounded-3xl flex flex-col gap-4 items-center text-center">
                                            <h4 className="font-extrabold text-lg" style={{ color: team.color }}>{team.name}</h4>
                                            <div className="flex gap-2 w-full">
                                                <button
                                                    onClick={() => handleWinner(team.id)}
                                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md"
                                                >
                                                    Correct (Wins)
                                                </button>
                                                <button
                                                    onClick={() => handleLoser(team.id)}
                                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md"
                                                >
                                                    Incorrect (Loses)
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 text-center space-y-4">
                                    <div className="text-xs font-black text-emerald-400 uppercase tracking-widest">Tie-breaker Resolved!</div>
                                    <h4 className="text-3xl font-black text-white uppercase tracking-tight">
                                        🏆 {activeTeams.find(t => t.id === tb.winnerTeamId)?.name} wins the match!
                                    </h4>
                                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                        The system has automatically updated the scores (+1 to winner). Press below to execute round eliminations.
                                    </p>
                                    <button
                                        onClick={handleResolve}
                                        className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-wider rounded-2xl transition-all active:scale-95 shadow-lg flex items-center gap-2 mx-auto"
                                    >
                                        Resolve Round & Continue
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {renderModals()}
            </>
        );
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-8 pb-12">
                {/* Show Header metadata */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 border border-white/5 rounded-2xl p-6 premium-glass">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-yellow-500 tracking-[0.2em]">Active Show Run</span>
                        <h2 className="text-3xl font-black tracking-tight uppercase">{show.name}</h2>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-md">{show.description || "No description provided."}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="bg-[#14213d]/60 px-4 py-2 border border-white/10 rounded-xl text-center">
                            <div className="text-[9px] font-black tracking-wider uppercase text-slate-500">Step</div>
                            <div className="text-sm font-black text-yellow-500 uppercase tracking-widest">{currentStep}</div>
                        </div>
                        <div className="bg-[#14213d]/60 px-4 py-2 border border-white/10 rounded-xl text-center flex items-center gap-3">
                            <div>
                                <div className="text-[9px] font-black tracking-wider uppercase text-slate-500">Round</div>
                                <div className="text-sm font-black text-white">{currentRoundIndex + 1}/{sortedRounds.length}</div>
                            </div>
                            <div className="w-[1px] h-6 bg-white/10" />
                            <div>
                                <div className="text-[9px] font-black tracking-wider uppercase text-slate-500">Game</div>
                                <div className="text-sm font-black text-white">{currentGameIndex + 1}/{(currentRound?.gameIds?.length || 1)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Central Controls Panel */}
                {renderActionPanel()}

                {/* Stands & Scoreboards Adjustments */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Team Standings & Score Adjustments */}
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 premium-glass space-y-4">
                        <h3 className="text-lg font-black tracking-widest uppercase text-yellow-500/70 flex items-center gap-2 mb-2">
                            <Trophy size={18} />
                            Team Leaderboard & Adjustments
                        </h3>
                        <div className="space-y-3">
                            {[...show.teams]
                                .sort((a, b) => (teamScores[b.id] || 0) - (teamScores[a.id] || 0))
                                .map((team, index) => {
                                    const score = teamScores[team.id] || 0;
                                    const players = playersByTeam[team.id] || [];

                                    return (
                                        <div key={team.id} className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-white/10 transition-all duration-300">
                                            <div className="text-xl font-mono font-black text-slate-500 w-6">{index + 1}º</div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold truncate" style={{ color: team.color }}>{team.name}</h4>
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mt-0.5">
                                                    {players.length} registered
                                                </span>
                                            </div>
                                            
                                            <div className="text-2xl font-black text-[#fca311] tabular-nums mr-2">{score}</div>
                                            
                                            <div className="flex gap-1.5 border-l border-white/10 pl-3">
                                                <button 
                                                    onClick={() => applyPoints(team.id, -100)} 
                                                    className="px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black rounded-lg border border-red-500/20 transition-all active:scale-90"
                                                >
                                                    -100
                                                </button>
                                                <button 
                                                    onClick={() => applyPoints(team.id, 100)} 
                                                    className="px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-black rounded-lg border border-emerald-500/20 transition-all active:scale-90"
                                                >
                                                    +100
                                                </button>
                                                <button 
                                                    onClick={() => applyPoints(team.id, 500)} 
                                                    className="px-2 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-500/30 transition-all active:scale-90"
                                                >
                                                    +500
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Connected players registry list */}
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 premium-glass space-y-4">
                        <h3 className="text-lg font-black tracking-widest uppercase text-yellow-500/70 flex items-center gap-2 mb-2">
                            <Users size={18} />
                            Connected Players ({participants.length})
                        </h3>
                        
                        {participants.length === 0 ? (
                            <div className="h-48 border border-dashed border-white/5 rounded-2xl flex items-center justify-center text-xs text-slate-600 uppercase tracking-widest">
                                No contestants connected
                            </div>
                        ) : (
                            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                                {participants.map((player) => {
                                    const playerTeam = show.teams.find(t => t.id === player.teamId || `team-${t.id}` === player.teamId);
                                    
                                    return (
                                        <div key={player.id} className="bg-black/30 border border-white/5 p-3 rounded-xl flex items-center justify-between gap-3 text-sm">
                                            <div className="font-bold text-slate-100 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                {player.name}
                                            </div>
                                            <div 
                                                className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-right border"
                                                style={{ 
                                                    borderColor: playerTeam?.color ? `${playerTeam.color}30` : 'rgba(255,255,255,0.1)', 
                                                    backgroundColor: playerTeam?.color ? `${playerTeam.color}10` : 'transparent',
                                                    color: playerTeam?.color || '#94a3b8'
                                                }}
                                            >
                                                {playerTeam?.name || "Lobby"}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {renderModals()}
        </>
    );
};

export default ShowHostController;
