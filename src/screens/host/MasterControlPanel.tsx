import React, { useState } from 'react';
import { useSync } from '@/context/SyncContext';
import { motion, AnimatePresence } from 'framer-motion';
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
    WifiOff
} from 'lucide-react';

const MasterControlPanel: React.FC = () => {
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
                        onClick={() => {
                            if (window.confirm("¿Seguro que quieres DESCONECTAR el iPad de esta partida? El juego continuará en la PC.")) {
                                leaveSession();
                            }
                        }}
                        className="p-3 bg-slate-800 text-slate-400 rounded-xl border border-white/5 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/20 transition-all shadow-xl active:scale-95"
                        title="Disconnect iPad (Stop Sync)"
                    >
                        <WifiOff size={22} />
                    </button>
                )}
                
                <button
                    onClick={() => setShowQuitConfirm(true)}
                    className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all shadow-xl active:scale-95"
                    title="Quit to Lobby / Exit Quick Play"
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
                            <h2 className="text-2xl font-black text-white mb-2">Are you sure?</h2>
                            <p className="text-slate-300 mb-8">Do you want to quit the current game and return to the lobby?</p>
                            
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowQuitConfirm(false)}
                                    className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowQuitConfirm(false);
                                        updateSession({ hostCommand: { type: 'quit_to_lobby', payload: {}, timestamp: Date.now() } });
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                                >
                                    Quit
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
