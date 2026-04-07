import React, { useState, useEffect } from 'react';
import { useSync } from '@/context/SyncContext';
import { GameType } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Users, Zap, CheckCircle, Send, Calculator } from 'lucide-react';

const PlayerInterface: React.FC = () => {
    const {
        sessionId,
        sessionData,
        participants,
        deviceRole,
        joinSession,
        registerMe,
        buzzIn
    } = useSync();

    const [pin, setPin] = useState('');
    const [name, setName] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [isRegistered, setIsRegistered] = useState(false);
    const [answerInput, setAnswerInput] = useState('');
    const [isBuzzedLocal, setIsBuzzedLocal] = useState(false);

    // Get current participant data
    const myId = localStorage.getItem('participantId');
    const me = participants.find(p => p.id === myId);

    useEffect(() => {
        if (me && !isRegistered) setIsRegistered(true);
        if (me?.isBuzzed) setIsBuzzedLocal(true);
        else setIsBuzzedLocal(false);
    }, [me]);

    const handleJoin = () => {
        if (pin.length === 6) {
            joinSession(pin, 'player');
        }
    };

    const handleRegister = async () => {
        if (name && selectedTeam) {
            await registerMe({ name, teamId: selectedTeam });
            setIsRegistered(true);
        }
    };

    const handleBuzz = async () => {
        if (!isBuzzedLocal && sessionData?.isBuzzerEnabled) {
            const success = await buzzIn();
            if (success) setIsBuzzedLocal(true);
        }
    };

    // 1. Join Screen
    if (!sessionId) {
        return (
            <div className="fixed inset-0 bg-[#000000] flex flex-col items-center justify-center p-8 text-white text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#14213d]/20 to-transparent pointer-events-none" />

                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10"
                >
                    <div className="w-24 h-24 bg-[#fca311]/10 rounded-full flex items-center justify-center mb-6 mx-auto border border-[#fca311]/20 glow-orange">
                        <Zap size={48} className="text-[#fca311]" />
                    </div>
                    <h1 className="text-4xl font-black mb-2 tracking-tighter">VIKTORIA</h1>
                    <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] mb-12">Contestant Portal</p>
                </motion.div>

                <div className="w-full max-w-xs space-y-4 relative z-10">
                    <div className="premium-glass p-1 rounded-2xl border border-white/10">
                        <input
                            type="text"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.toUpperCase())}
                            placeholder="PIN DE ACCESO"
                            className="w-full bg-transparent border-none p-5 rounded-xl text-center text-3xl font-black tracking-[0.2em] focus:ring-0 placeholder:text-slate-700"
                            maxLength={6}
                        />
                    </div>
                    <button
                        onClick={handleJoin}
                        disabled={pin.length < 6}
                        className="w-full bg-[#fca311] hover:bg-[#e8920a] disabled:opacity-30 disabled:grayscale text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 glow-orange"
                    >
                        <LogIn size={24} strokeWidth={3} /> ACCEDER
                    </button>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest pt-4">Revisa la pantalla del escenario para el PIN</p>
                </div>
            </div>
        );
    }

    // 2. Registration/Lobby Screen
    if (!isRegistered) {
        return (
            <div className="fixed inset-0 bg-[#000000] flex flex-col items-center justify-center p-8 text-white text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-[#14213d]/30 via-transparent to-transparent pointer-events-none" />

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="w-full max-w-xs space-y-6 relative z-10"
                >
                    <div className="mb-8">
                        <div className="w-20 h-20 bg-[#14213d]/50 rounded-full flex items-center justify-center mb-4 mx-auto border border-white/5 premium-glass">
                            <Users size={36} className="text-[#fca311]" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">¿LISTO PARA JUGAR?</h1>
                        <p className="text-slate-500 text-xs font-bold mt-1">Configura tu perfil de jugador</p>
                    </div>

                    <div className="space-y-4">
                        <div className="premium-glass p-1 rounded-2xl border border-white/10">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="TU NOMBRE / APODO"
                                className="w-full bg-transparent border-none p-4 rounded-xl text-center text-lg font-bold placeholder:text-slate-700"
                            />
                        </div>

                        <div className="premium-glass p-1 rounded-2xl border border-white/10">
                            <select
                                value={selectedTeam}
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                className="w-full bg-transparent border-none p-4 rounded-xl text-center text-lg font-bold appearance-none bg-none outline-none"
                            >
                                <option value="" className="bg-black text-slate-500">¿EN QUÉ EQUIPO ESTÁS?</option>
                                <option value="team-1" className="bg-black text-white">EQUIPO 1</option>
                                <option value="team-2" className="bg-black text-white">EQUIPO 2</option>
                                <option value="team-3" className="bg-black text-white">EQUIPO 3</option>
                                <option value="team-4" className="bg-black text-white">EQUIPO 4</option>
                            </select>
                        </div>

                        <button
                            onClick={handleRegister}
                            disabled={!name || !selectedTeam}
                            className="w-full bg-[#fca311] hover:bg-[#e8920a] disabled:opacity-30 text-black font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 glow-orange mt-4"
                        >
                            ¡EMPEZAR AHORA!
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // 3. Active Game Interface
    const isLocked = sessionData?.buzzerLockedBy !== null;
    const amILocked = sessionData?.buzzerLockedBy === myId;
    const buzzerActive = sessionData?.isBuzzerEnabled && !isLocked;

    const renderGameMode = () => {
        const type = sessionData?.currentGameId?.split('_')[0] as GameType;

        // Mode: Buzzer (Default for many games)
        if (buzzerActive || isLocked) {
            return (
                <div className="flex flex-col items-center justify-center h-full w-full">
                    <div className="relative">
                        <AnimatePresence>
                            {buzzerActive && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1.5, opacity: 0.1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="absolute inset-0 bg-[#fca311] rounded-full"
                                />
                            )}
                        </AnimatePresence>

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleBuzz}
                            disabled={!buzzerActive}
                            className={`w-72 h-72 rounded-full border-[12px] flex items-center justify-center text-5xl font-black transition-all shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 ${amILocked
                                ? 'bg-emerald-500 border-white text-white shadow-[0_0_40px_rgba(16,185,129,0.4)]' :
                                isLocked
                                    ? 'bg-red-950 border-white/5 text-red-900 opacity-40 shadow-none' :
                                    buzzerActive
                                        ? 'bg-[#fca311] border-white text-black glow-orange shadow-[0_0_30px_rgba(252,163,17,0.4)]' :
                                        'bg-white/5 border-white/10 text-white/10 premium-glass'
                                }`}
                        >
                            {amILocked ? '¡YA!' : isLocked ? 'STOP' : 'PULSAR'}
                        </motion.button>
                    </div>

                    <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="mt-12 text-center"
                    >
                        <p className={`text-xl font-black uppercase tracking-[0.2em] ${amILocked ? 'text-emerald-400' : isLocked ? 'text-red-900' : 'text-[#fca311]'}`}>
                            {amILocked ? "TU TURNO - ¡HABLA!" : isLocked ? "PULSADOR BLOQUEADO" : "¡SÉ EL MÁS RÁPIDO!"}
                        </p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-2">Observa la pantalla central</p>
                    </motion.div>
                </div>
            );
        }

        // Mode: Lock-in Answer (Rosco, Definitions)
        if (sessionData?.currentStep === 'question' && (type === GameType.ROSCO || type === GameType.DEFINITIONS)) {
            return (
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-[#14213d]/50 rounded-2xl flex items-center justify-center mx-auto border border-white/5 mb-4 premium-glass">
                            <Send size={28} className="text-[#fca311]" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">ESCRIBE TU RESPUESTA</h2>
                    </div>

                    <div className="premium-glass p-2 rounded-3xl border border-white/10 shadow-2xl">
                        <textarea
                            value={answerInput}
                            onChange={(e) => setAnswerInput(e.target.value)}
                            className="w-full h-40 bg-transparent border-none p-6 rounded-2xl text-2xl font-bold resize-none outline-none focus:ring-0 placeholder:text-slate-800"
                            placeholder="Escribe aquí..."
                        />
                    </div>

                    <button className="w-full bg-[#fca311] text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 glow-orange">
                        <Send size={24} strokeWidth={3} /> ENVIAR RESPUESTA
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center text-slate-700 h-96">
                <div className="relative mb-8">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="w-24 h-24 border-2 border-dashed border-[#fca311]/20 rounded-full"
                    />
                    <Zap size={32} className="absolute inset-0 m-auto opacity-20 text-[#fca311]" />
                </div>
                <p className="font-black uppercase tracking-[0.4em] text-xs">Aguardando Desafío...</p>
                <div className="mt-4 flex gap-1">
                    {[1, 2, 3].map(i => (
                        <motion.div
                            key={i}
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                            className="w-1.5 h-1.5 bg-[#fca311] rounded-full"
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-[#000000] text-white flex flex-col p-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#14213d]/10 to-transparent pointer-events-none" />

            {/* Header */}
            <header className="flex justify-between items-start mb-8 relative z-20">
                <div className="premium-glass px-4 py-2 border border-white/10 rounded-2xl flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${sessionId ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="font-black text-xs tracking-widest text-[#fca311]">{sessionId || 'OFFLINE'}</span>
                </div>
                <div className="text-right flex flex-col items-end">
                    <span className="text-lg font-black leading-none">{me?.name || '---'}</span>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        {me?.teamId || 'SIN EQUIPO'}
                    </span>
                </div>
            </header>

            {/* Main Interaction Area */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={sessionData?.currentStep + (buzzerActive ? 'buzzer' : 'idle')}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="w-full flex justify-center"
                    >
                        {renderGameMode()}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Footer / Status */}
            <footer className="mt-8 text-center relative z-10">
                <div className="h-[1px] w-12 bg-[#fca311]/20 mx-auto mb-4" />
                <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.5em]">
                    Viktoria Engine v2.0 &bull; Licensed for Public Show
                </p>
            </footer>
        </div>
    );
};

export default PlayerInterface;
