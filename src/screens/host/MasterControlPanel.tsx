import React, { useState } from 'react';
import { useSync } from '@/context/SyncContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import {
    Music,
    Volume2,
    PlusCircle,
    MinusCircle,
    ChevronRight,
    AlertTriangle,
    Settings,
    RotateCcw,
    Clapperboard,
    VolumeX,
    CheckCircle,
    Users,
    Pause,
    Play,
    Home,
    WifiOff,
    LogOut
} from 'lucide-react';

const MasterControlPanel: React.FC = () => {
    const { lang } = useLanguage();
    const {
        sessionData,
        updateSession,
        triggerAudio,
        applyPoints,
        triggerTransition,
        emergencyMute,
        deviceRole,
        sessionId,
        leaveSession,
        isRemoteMode
    } = useSync();

    const [showOverride, setShowOverride] = useState(false);

    if (!sessionData) return null;

    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [showRestartConfirm, setShowRestartConfirm] = useState(false);
    const [showReturnConfirm, setShowReturnConfirm] = useState(false);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

    const teamScores = sessionData.teamScores || {};

    const handleNextGame = () => {
        updateSession({ hostCommand: { type: 'next_game', payload: {}, timestamp: Date.now() } });
    };

    const handleFinishRound = () => {
        updateSession({ hostCommand: { type: 'finish_round', payload: {}, timestamp: Date.now() } });
    };

    const handleActionTransition = () => {
        const title = sessionData.currentStep === 'lobby' ? 'Viktoria Game On!' : 'Let\'s Go!';
        triggerTransition(title);
    };

    return (
        <div className="bg-[#050505] border-b border-white/5 p-4 sticky top-0 z-40 flex items-center justify-between gap-4 shadow-2xl backdrop-blur-md bg-opacity-95">
            {/* Left: Quick Audio & Global Info */}
            <div className="flex items-center gap-6">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">Host Master</span>
                    <span className="text-sm font-bold text-slate-100 truncate max-w-[150px]">
                        {sessionData.currentShowId 
                            ? sessionData.currentShowId 
                            : sessionData.currentGameId 
                                ? `Quick Play` 
                                : 'No Show'}
                    </span>
                </div>

                <div className="h-8 w-[1px] bg-white/5" />

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const isPlaying = sessionData.isMusicPlaying;
                            updateSession({
                                isMusicPlaying: !isPlaying,
                                hostCommand: {
                                    type: isPlaying ? 'pause_bg_music' : 'play_bg_music',
                                    payload: { soundId: 'viktoria' },
                                    timestamp: Date.now()
                                }
                            });
                        }}
                        className={`p-3 rounded-xl border transition-all shadow-lg active:scale-90 ${sessionData.isMusicPlaying
                                ? 'bg-[#fca311] text-black border-[#fca311] glow-orange'
                                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                            }`}
                        title={sessionData.isMusicPlaying ? "Pause Music" : "Play Music"}
                    >
                        {sessionData.isMusicPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button
                        onClick={() => triggerAudio('wrong')}
                        className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all"
                        title="Play Wrong Sound"
                    >
                        <Volume2 size={20} />
                    </button>
                </div>
            </div>

            {/* Center: Team Quick Scores & ACTION BUTTON */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                    {Object.entries(teamScores).map(([id, score]) => (
                        <div key={id} className="flex items-center gap-3 bg-[#14213d]/40 px-4 py-2 rounded-2xl border border-white/10 premium-glass">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-[#fca311]/60 tracking-wider leading-none mb-1">{id.slice(0, 3)}</span>
                                <span className="text-xl font-black text-white tabular-nums leading-none">{score as number}</span>
                            </div>
                            <div className="flex flex-col gap-1 ml-1 border-l border-white/10 pl-2">
                                <button onClick={() => applyPoints(id, 100)} className="text-emerald-500 hover:text-emerald-400">
                                    <PlusCircle size={16} />
                                </button>
                                <button onClick={() => applyPoints(id, -100)} className="text-red-500 hover:text-red-400">
                                    <MinusCircle size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="h-10 w-[1px] bg-white/10" />

                <button
                    onClick={handleActionTransition}
                    disabled={sessionData.transitionState?.isActive}
                    className={`px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-3 transition-all shadow-xl active:scale-95 ${sessionData.transitionState?.isActive
                        ? 'bg-[#14213d] text-slate-500 cursor-not-allowed border border-white/5'
                        : 'bg-[#fca311] text-black hover:bg-[#e8920a] glow-orange-active'
                        }`}
                >
                    <Clapperboard size={20} />
                    {sessionData.transitionState?.isActive ? 'EN ESCENA' : '🎬 ACCIÓN'}
                </button>
            </div>

            {/* Right: Flow Controls & Settings */}
            <div className="flex items-center gap-3">
                {isRemoteMode && (
                    <button
                        onClick={() => setShowDisconnectConfirm(true)}
                        className="p-3 bg-slate-800 text-slate-400 rounded-xl border border-white/5 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/20 transition-all shadow-xl active:scale-95"
                        title={lang === 'es' ? "Desconectar iPad" : "Disconnect iPad (Stop Sync)"}
                    >
                        <WifiOff size={22} />
                    </button>
                )}
                
                <button
                    onClick={() => setShowRestartConfirm(true)}
                    className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 hover:bg-amber-500/20 transition-all shadow-xl active:scale-95"
                    title={lang === 'es' ? "Reiniciar Juego" : "Restart Current Game"}
                >
                    <RotateCcw size={22} />
                </button>

                <button
                    onClick={() => setShowReturnConfirm(true)}
                    className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-all shadow-xl active:scale-95"
                    title={lang === 'es' ? "Volver al Menú Principal" : "Return to Main Menu"}
                >
                    <LogOut size={22} />
                </button>

                <button
                    onClick={() => setShowQuitConfirm(true)}
                    className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all shadow-xl active:scale-95"
                    title={lang === 'es' ? "Volver al Lobby" : "Quit to Lobby / Exit Quick Play"}
                >
                    <Home size={22} />
                </button>

                <button
                    onClick={() => setShowOverride(!showOverride)}
                    className={`p-3 rounded-xl transition-all border ${showOverride ? 'bg-[#fca311] text-black border-[#fca311] shadow-[0_0_20px_rgba(252,163,17,0.4)]' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                >
                    <Settings size={22} />
                </button>

                <div className="h-8 w-[1px] bg-white/10" />

                {sessionData.currentShowId && (
                    <button
                        onClick={handleNextGame}
                        className="bg-white text-black px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-[#fca311] transition-all shadow-xl active:scale-95 border border-white"
                    >
                        NEXT <ChevronRight size={18} strokeWidth={3} />
                    </button>
                )}
            </div>



            {/* Manual Override Tray */}
            <AnimatePresence>
                {showOverride && (
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="absolute top-full left-0 right-0 bg-[#0a0a0a] border-b border-[#fca311]/30 p-6 shadow-2xl flex flex-col gap-5 backdrop-blur-2xl"
                    >
                        <div className="flex items-center gap-3 text-[#fca311]">
                            <AlertTriangle size={18} />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">Manual Overrides Engine</span>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <button
                                onClick={() => updateSession({ isBuzzerEnabled: !sessionData.isBuzzerEnabled })}
                                className="bg-[#14213d]/20 p-4 rounded-2xl border border-white/5 text-left hover:bg-[#14213d]/40 transition-all premium-glass"
                            >
                                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Buzzer Logic</div>
                                <div className={`font-bold text-lg ${sessionData.isBuzzerEnabled ? 'text-[#fca311]' : 'text-slate-400'}`}>
                                    {sessionData.isBuzzerEnabled ? 'SYSTEM ACTIVE' : 'SYSTEM OFFLINE'}
                                </div>
                            </button>
                            <button
                                onClick={() => updateSession({ currentBuzzedParticipant: null })}
                                className="bg-[#14213d]/20 p-4 rounded-2xl border border-white/5 text-left hover:bg-[#14213d]/40 transition-all premium-glass"
                            >
                                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Queue Management</div>
                                <div className="font-bold flex items-center gap-2 text-lg">
                                    <RotateCcw size={16} className="text-[#fca311]" /> CLEAR QUEUE
                                </div>
                            </button>
                            <button
                                onClick={emergencyMute}
                                className="bg-red-500/5 text-red-500 p-4 rounded-2xl border border-red-500/20 text-left hover:bg-red-500/10 transition-all"
                            >
                                <div className="text-[10px] uppercase font-black tracking-widest mb-1 opacity-60">Master Kill Switch</div>
                                <div className="font-bold flex items-center gap-2 text-lg">
                                    <VolumeX size={18} /> MUTE PC
                                </div>
                            </button>
                            <button
                                onClick={handleFinishRound}
                                className="bg-[#14213d]/40 text-white p-4 rounded-2xl border border-white/10 text-left hover:bg-white/5 transition-all"
                            >
                                <div className="text-[10px] uppercase font-black tracking-widest mb-1 opacity-40">Flow Automation</div>
                                <div className="font-bold text-lg">FINISH CHAPTER</div>
                            </button>
                        </div>

                        {/* 🔊 MISSION 09: Universal Soundboard Integration */}
                        <div className="mt-2 space-y-3">
                            <div className="flex items-center gap-3 text-slate-500">
                                <Volume2 size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Universal Soundboard & SFX</span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { label: 'APLAUSOS', icon: <Users size={16} />, audio: 'applause', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                                    { label: 'RISAS', icon: <PlusCircle size={16} />, audio: 'laugh', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                                    { label: 'TENSIÓN', icon: <Music size={16} />, audio: 'tension', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                                    { label: 'ERROR', icon: <VolumeX size={16} />, audio: 'wrong', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
                                    { label: 'ACIERTO', icon: <CheckCircle size={16} />, audio: 'correct', color: 'bg-yellow-500/10 text-[#fca311] border-[#fca311]/20' }
                                ].map((sfx) => (
                                    <button
                                        key={sfx.label}
                                        onClick={() => triggerAudio(sfx.audio)}
                                        className={`px-5 py-4 rounded-2xl border font-black text-[10px] flex items-center gap-3 hover:scale-105 active:scale-90 transition-all shadow-lg ${sfx.color}`}
                                    >
                                        {sfx.icon}
                                        {sfx.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Quit Confirmation Modal (fixes PWA window.confirm block) */}
            <AnimatePresence>
                {showQuitConfirm && (
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
                            <Home className="text-red-500 w-16 h-16 mx-auto mb-4" />
                            <h2 className="text-2xl font-black text-white mb-2">
                                {lang === "es" ? "¿Estás seguro?" : "Are you sure?"}
                            </h2>
                            <p className="text-slate-300 mb-8 text-sm">
                                {lang === "es"
                                    ? "¿Deseas salir del juego actual y volver al lobby de la sesión?"
                                    : "Do you want to quit the current game and return to the lobby?"}
                            </p>
                            
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowQuitConfirm(false)}
                                    className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
                                >
                                    {lang === "es" ? "Cancelar" : "Cancel"}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowQuitConfirm(false);
                                        updateSession({ hostCommand: { type: 'quit_to_lobby', payload: {}, timestamp: Date.now() } });
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                                >
                                    {lang === "es" ? "Salir" : "Quit"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Restart Confirmation Modal */}
            <AnimatePresence>
                {showRestartConfirm && (
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
                            className="bg-slate-900 border border-amber-500/40 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
                        >
                            <RotateCcw className="text-amber-500 w-16 h-16 mx-auto mb-4" />
                            <h2 className="text-2xl font-black text-white mb-2">
                                {lang === "es" ? "¿Reiniciar Juego?" : "Restart Game?"}
                            </h2>
                            <p className="text-slate-300 mb-8 text-sm">
                                {lang === "es"
                                    ? "¿Estás seguro de que quieres reiniciar el juego actual? Esto restablecerá todas las preguntas y puntuaciones para esta partida."
                                    : "Are you sure you want to restart the current game? This will reset all questions and scores for this match."}
                            </p>
                            
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowRestartConfirm(false)}
                                    className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
                                >
                                    {lang === "es" ? "Cancelar" : "Cancel"}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowRestartConfirm(false);
                                        updateSession({
                                            hostCommand: {
                                                type: 'restart_game',
                                                payload: {},
                                                timestamp: Date.now()
                                            }
                                        });
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-500 transition shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                                >
                                    {lang === "es" ? "Reiniciar" : "Restart"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Return to Menu Confirmation Modal */}
            <AnimatePresence>
                {showReturnConfirm && (
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
                            className="bg-slate-900 border border-blue-500/40 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
                        >
                            <LogOut className="text-blue-400 w-16 h-16 mx-auto mb-4" />
                            <h2 className="text-2xl font-black text-white mb-2">
                                {lang === "es" ? "¿Volver al Menú?" : "Return to Menu?"}
                            </h2>
                            <p className="text-slate-300 mb-8 text-sm">
                                {lang === "es"
                                    ? "¿Seguro que quieres guardar el progreso actual y volver al menú principal?"
                                    : "Are you sure you want to save current progress and return to the main menu?"}
                            </p>
                            
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowReturnConfirm(false)}
                                    className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
                                >
                                    {lang === "es" ? "Cancelar" : "Cancel"}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowReturnConfirm(false);
                                        updateSession({
                                            hostCommand: {
                                                type: 'return_to_menu',
                                                payload: {},
                                                timestamp: Date.now()
                                            }
                                        });
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                >
                                    {lang === "es" ? "Salir" : "Exit"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Disconnect Confirmation Modal */}
            <AnimatePresence>
                {showDisconnectConfirm && (
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
                            className="bg-slate-900 border border-slate-500/40 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
                        >
                            <WifiOff className="text-slate-400 w-16 h-16 mx-auto mb-4" />
                            <h2 className="text-2xl font-black text-white mb-2">
                                {lang === "es" ? "¿Desconectar?" : "Disconnect iPad?"}
                            </h2>
                            <p className="text-slate-300 mb-8 text-sm">
                                {lang === "es"
                                    ? "¿Seguro que quieres desconectar el iPad de esta partida? El juego continuará en la PC."
                                    : "Are you sure you want to disconnect the iPad from this game? The match will continue on the PC."}
                            </p>
                            
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowDisconnectConfirm(false)}
                                    className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
                                >
                                    {lang === "es" ? "Cancelar" : "Cancel"}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDisconnectConfirm(false);
                                        leaveSession();
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-slate-600 text-white font-bold hover:bg-slate-500 transition shadow-[0_0_20px_rgba(148,163,184,0.4)]"
                                >
                                    {lang === "es" ? "Desconectar" : "Disconnect"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MasterControlPanel;
