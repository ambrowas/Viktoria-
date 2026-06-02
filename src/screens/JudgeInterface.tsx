import React, { useState, useEffect, useMemo } from 'react';
import { useSync } from '@/context/SyncContext';
import { Game } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Scale, Eye, ArrowLeft, LogOut, Wifi, Tv, Play, ChevronRight, Activity } from 'lucide-react';
import GameRouter from './GameRouter';

const JudgeInterface: React.FC = () => {
    const {
        sessionId,
        sessionData,
        syncStatus,
        joinSession,
        leaveSession,
        registerMe
    } = useSync();

    const [pin, setPin] = useState('');
    const [name, setName] = useState(() => localStorage.getItem('viktoria_judgeName') || '');
    const [isRegistered, setIsRegistered] = useState(false);
    const [isBoardOpen, setIsBoardOpen] = useState(false);
    const [autoFollow, setAutoFollow] = useState(true);
    const [localGame, setLocalGame] = useState<Game | null>(null);

    const activeGame = sessionData?.fullGameData as Game | null;

    // Track when the host changes the game payload
    useEffect(() => {
        if (activeGame) {
            if (autoFollow || !localGame) {
                setLocalGame(activeGame);
            }
        } else {
            setLocalGame(null);
            setIsBoardOpen(false);
        }
    }, [activeGame, autoFollow]);

    // Handle initial registration automatically once connected
    useEffect(() => {
        if (sessionId && name && !isRegistered) {
            registerMe({ name, role: 'judge' });
            localStorage.setItem('viktoria_judgeName', name);
            setIsRegistered(true);
        }
    }, [sessionId, name, isRegistered, registerMe]);

    const handleJoin = () => {
        if (pin.length === 6 && name.trim()) {
            joinSession(pin, 'judge');
        }
    };

    const activeTeams = useMemo(() => {
        if (sessionData?.fullShowData?.teams && sessionData.fullShowData.teams.length > 0) {
            return sessionData.fullShowData.teams;
        }
        if (sessionData?.teams && sessionData.teams.length > 0) {
            const firstTeamName = sessionData.teams[0]?.name?.toLowerCase();
            if (firstTeamName !== 'pathfind' && firstTeamName !== 'team 1') {
                return sessionData.teams;
            }
        }
        // Use default fallback teams matching AfricaDayLandingPage's default
        return [
            { id: "5b78e550-2b96-4743-b401-7035051cdc0f", name: "Shongai", score: 0, color: "#ef4444", emoji: "Mask1", players: [] },
            { id: "d5eb1687-6a66-4221-8a61-982674921d9e", name: "Johns Hopkins", score: 0, color: "#3b82f6", emoji: "Mask2", players: [] },
            { id: "3c7389d3-7438-4087-919e-b34904e4fdfc", name: "Wakanda 4Ever", score: 0, color: "#22c55e", emoji: "Mask3", players: [] },
            { id: "730965ee-bc69-43f0-8f7b-9e2a61117572", name: "Howard U", score: 0, color: "#a855f7", emoji: "Mask4", players: [] }
        ];
    }, [sessionData?.fullShowData?.teams, sessionData?.teams]);

    const hasNewGameAvailable = activeGame && localGame && activeGame.id !== localGame.id;

    // 1. PIN & Name Lobby
    if (!sessionId || !isRegistered) {
        return (
            <div className="fixed inset-0 bg-[#07070a] flex flex-col items-center justify-center p-6 text-white text-center overflow-y-auto">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.1)_0%,transparent_75%)] pointer-events-none" />
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-violet-600/5 blur-[80px] rounded-full pointer-events-none" />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10 w-full max-w-sm"
                >
                    <div className="w-20 h-20 bg-violet-600/10 rounded-3xl flex items-center justify-center mb-6 mx-auto border border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                        <Scale size={40} className="text-violet-400" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-1 font-display">
                        VIKTORIA
                    </h1>
                    <p className="text-violet-400/80 font-black tracking-[0.3em] text-xs uppercase mb-10">
                        Portal del Juez
                    </p>

                    <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl text-left space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
                                Nombre del Juez
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Escribe tu nombre..."
                                className="w-full bg-black/40 border border-slate-800 rounded-2xl px-4 py-3.5 font-bold focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
                                PIN de la Sesión
                            </label>
                            <input
                                type="text"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.toUpperCase())}
                                placeholder="CÓDIGO"
                                className="w-full bg-black/40 border border-slate-800 rounded-2xl p-4 text-center font-mono tracking-[0.25em] text-2xl font-black focus:border-violet-500 outline-none transition-all"
                                maxLength={6}
                            />
                        </div>

                        <button
                            onClick={handleJoin}
                            disabled={pin.length < 6 || !name.trim()}
                            className="w-full mt-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg shadow-violet-950/50 border border-violet-500/20"
                        >
                            <LogIn size={20} strokeWidth={2.5} />
                            <span>CONECTAR COMO JUEZ</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // 2. Active Game Board Inspector
    if (isBoardOpen && localGame) {
        const show = sessionData?.fullShowData;
        return (
            <div className="fixed inset-0 bg-[#050508] z-50 flex flex-col overflow-hidden">
                {/* Float navigation bar */}
                <header className="h-16 shrink-0 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-4 flex items-center justify-between z-50">
                    <button
                        onClick={() => setIsBoardOpen(false)}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft size={16} />
                        <span>Volver al Panel</span>
                    </button>

                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                            Inspección Local (Juez)
                        </span>
                        <h2 className="text-sm font-bold text-white truncate max-w-xs">
                            {localGame.name || "Sin Nombre"}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono tracking-widest text-slate-400">
                            PIN: {sessionId}
                        </span>
                    </div>
                </header>

                {/* Local game runner container */}
                <div className="flex-1 min-h-0 relative">
                    <GameRouter
                        game={localGame}
                        teams={activeTeams}
                        teamScores={sessionData?.teamScores || {}}
                        onScoreChange={() => {}}
                        onExit={() => setIsBoardOpen(false)}
                        isObserveOnly={true}
                    />
                </div>
            </div>
        );
    }

    // 3. Judge Dashboard Interface
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#141b35] via-[#0a0e1c] to-[#04060b] text-white flex flex-col font-sans select-none">
            {/* Top Navigation */}
            <header className="h-16 shrink-0 bg-slate-950 border-b border-white/5 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-violet-600/10 rounded-xl flex items-center justify-center border border-violet-500/20">
                        <Scale size={18} className="text-violet-400" />
                    </div>
                    <div>
                        <h1 className="font-extrabold text-sm tracking-tight leading-none">VIKTORIA</h1>
                        <span className="text-[9px] font-black tracking-[0.2em] text-violet-400/80 uppercase">Panel de Juez</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-900 border border-white/5 rounded-full px-3 py-1.5 text-xs text-slate-300">
                        <Wifi size={12} className="text-emerald-400 animate-pulse" />
                        <span className="font-mono tracking-widest font-semibold">{sessionId}</span>
                    </div>

                    <button
                        onClick={leaveSession}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Leave Session"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Dashboard Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">
                {/* Session & Stage Status Card */}
                <div className="bg-slate-950/40 rounded-3xl border border-white/5 p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-transparent" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <Activity size={10} className="text-violet-400 animate-pulse" />
                                ESTADO DEL SHOW EN VIVO
                            </span>
                            <h2 className="text-2xl font-black uppercase text-white">
                                {sessionData?.fullShowData?.name || "Sin Show Activo"}
                            </h2>
                            <p className="text-xs text-slate-400 font-medium">
                                {sessionData?.currentStep ? (
                                    <>Etapa actual: <span className="text-violet-400 font-bold uppercase">{sessionData.currentStep}</span></>
                                ) : "Esperando al anfitrión..."}
                            </p>
                        </div>

                        {/* Connection indicators */}
                        <div className="grid grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 shrink-0">
                            <div>
                                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Estado</span>
                                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">Conectado</span>
                            </div>
                            <div>
                                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Rol</span>
                                <span className="text-xs font-black text-violet-400 uppercase tracking-wider">Juez</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Game Section */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">
                        Juego Activo en Pantalla
                    </h3>

                    {localGame ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-6 relative overflow-hidden group">
                            {/* Accent Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-2xl rounded-full group-hover:scale-125 transition-transform" />

                            <div className="flex items-start justify-between gap-4 relative z-10">
                                <div className="space-y-1">
                                    <span className="inline-block bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">
                                        {localGame.type.replace(/_/g, " ")}
                                    </span>
                                    <h4 className="text-xl font-extrabold text-white">
                                        {localGame.name || "Juego sin Título"}
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                        {localGame.description || "Sin descripción proporcionada."}
                                    </p>
                                </div>

                                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-400 shrink-0">
                                    <Tv size={22} />
                                </div>
                            </div>

                            {/* Options Control bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800 pt-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={autoFollow}
                                            onChange={(e) => setAutoFollow(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-violet-500 focus:ring-violet-500 focus:ring-offset-0 focus:ring-0"
                                        />
                                        <span>Seguir Juego del Anfitrión</span>
                                    </label>
                                </div>

                                <button
                                    onClick={() => setIsBoardOpen(true)}
                                    className="px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-violet-950/20 transition-all hover:scale-102 active:scale-98"
                                >
                                    <Eye size={16} />
                                    <span>INSPECCIONAR TABLERO</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-12 text-center text-slate-500">
                            <Tv size={36} className="mx-auto text-slate-700 mb-3 animate-pulse" />
                            <p className="text-sm font-bold">Esperando que el anfitrión inicie un juego...</p>
                            <p className="text-xs text-slate-600 mt-1">El tablero aparecerá automáticamente una vez seleccionado en la pantalla principal.</p>
                        </div>
                    )}
                </div>

                {/* Out of Sync Warning Banner */}
                {hasNewGameAvailable && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in">
                        <div className="text-xs">
                            <span className="font-extrabold text-amber-400 block mb-0.5">NUEVO JUEGO DISPONIBLE</span>
                            <span className="text-slate-400 font-medium">El anfitrión está jugando <strong className="text-slate-200">{activeGame?.name}</strong>.</span>
                        </div>
                        <button
                            onClick={() => setLocalGame(activeGame)}
                            className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-4 py-2 rounded-xl text-xs uppercase transition-all active:scale-95"
                        >
                            Cambiar Ahora
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default JudgeInterface;
