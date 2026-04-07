import React, { useState, useEffect } from 'react';
import { useSync } from '@/context/SyncContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Play, QrCode, Monitor, Tablet, Copy, Check, ShieldCheck } from 'lucide-react';
import { Team } from '@/types';
import TeamIcon from '@/components/TeamIcon';

interface SessionLobbyProps {
    teams: Team[];
    onStart: () => void;
    hostControl?: "ipad" | "manual";
}

const SessionLobby: React.FC<SessionLobbyProps> = ({ teams, onStart, hostControl }) => {
    console.log("Lobby hostControl:", hostControl);
    const { sessionId, participants, sessionData, registerParticipant } = useSync();
    useEffect(() => {
        console.log("Lobby mounted. sessionId:", sessionId);
    }, [sessionId]);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (sessionId) {
            navigator.clipboard.writeText(sessionId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getTeamParticipants = (teamId: string) => {
        return participants.filter(p => p.teamId === teamId);
    };

    const unassignedCount = participants.filter(p => !p.teamId).length;

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-12 overflow-y-auto scrollbar-hide">
            {/* Header */}
            <header className="flex justify-between items-start mb-12">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter mb-2 text-yellow-400">SESSION LOBBY</h1>
                    <p className="text-slate-400 text-xl">Waiting for players to connect and lock in teams...</p>
                </div>

                <div className="flex flex-col items-end">
                    <div
                        onClick={handleCopy}
                        className={`bg-slate-900 border-2 border-slate-800 p-6 rounded-3xl transition-all group relative active:scale-95 ${sessionId ? 'cursor-pointer hover:border-yellow-400' : 'opacity-50'}`}
                    >
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 group-hover:text-yellow-400 transition-colors">
                            {sessionId ? 'Join PIN' : 'Remote Status'}
                        </p>
                        <div className="flex items-center gap-4">
                            <span className="text-6xl font-mono font-black tracking-tighter">
                                {sessionId || 'OFFLINE'}
                            </span>
                            {sessionId && (copied ? <Check className="text-green-500" /> : <Copy className="text-slate-600 group-hover:text-slate-400" />)}
                        </div>
                    </div>
                    <p className="mt-4 text-slate-500 text-sm flex items-center gap-2">
                        <Monitor size={14} /> Host Mode &bull; <Tablet size={14} /> iPad Players
                    </p>
                </div>
            </header>

            {/* Main Content Grid */}
            <div className="flex-1 grid grid-cols-4 gap-8 mb-40">
                {teams.map((team, idx) => {
                    const members = getTeamParticipants(team.id);
                    return (
                        <motion.div
                            key={team.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-slate-900/50 border-2 border-slate-800/50 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden group"
                        >
                            {/* Decorative background color */}
                            <div
                                className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 transition-opacity group-hover:opacity-40"
                                style={{ backgroundColor: team.color || '#fbbf24' }}
                            />

                            <div className="flex items-center gap-4 mb-8">
                                <div
                                    className="w-4 h-12 rounded-full"
                                    style={{ backgroundColor: team.color || '#fbbf24' }}
                                />
                                <div>
                                    <h3 className="text-2xl font-black uppercase text-left">{team.name}</h3>
                                    <div className="flex items-center gap-3">
                                        <p className="text-slate-500 font-bold">{members.length} PLAYERS</p>
                                        {(true) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (true) {
                                                        const btn = e.currentTarget;
                                                        btn.disabled = true;
                                                        const originalText = btn.innerText;
                                                        btn.innerText = "...";
                                                        console.log("Lobby: Triggering check-in for", team.name);

                                                        registerParticipant(sessionId || 'local', {
                                                            id: `manual-${team.id}-${Date.now()}`,
                                                            name: members.length === 0 ? `${team.name} Player` : `Player ${members.length + 1}`,
                                                            teamId: team.id,
                                                            role: 'player',
                                                            isBuzzed: false
                                                        }).then(() => {
                                                            if (btn) {
                                                                btn.disabled = false;
                                                                btn.innerText = members.length > 0 ? "ADD PLAYER" : "Check In";
                                                                console.log("Lobby: Check-in complete for", team.name, ". Total now:", members.length + 1);
                                                            }
                                                        }).catch(err => {
                                                            console.error("Manual check-in failed:", err);
                                                            if (!sessionId) {
                                                                console.warn("Local check-in failed, but proceeding anyway.");
                                                            } else {
                                                                alert("Error checking in: " + err.message);
                                                            }
                                                            if (btn) {
                                                                btn.disabled = false;
                                                                btn.innerText = originalText;
                                                            }
                                                        });
                                                    }
                                                }}
                                                className="bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] font-black uppercase px-3 py-1.5 rounded-lg shadow-lg transition-transform active:scale-90"
                                            >
                                                {members.length > 0 ? "ADD PLAYER" : "Check In"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-3">
                                {members.length > 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center py-4">
                                        <motion.div
                                            initial={{ scale: 0, rotate: -20 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            className="relative mb-8"
                                        >
                                            <div
                                                className="w-32 h-32 rounded-full flex items-center justify-center shadow-2xl relative z-10"
                                                style={{ backgroundColor: `${team.color}20`, border: `4px solid ${team.color}` }}
                                            >
                                                <TeamIcon iconName={team.emoji} className="w-20 h-20" style={{ color: team.color }} />
                                            </div>
                                            <motion.div
                                                animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1] }}
                                                transition={{ repeat: Infinity, duration: 3 }}
                                                className="absolute inset-0 rounded-full blur-3xl"
                                                style={{ backgroundColor: team.color }}
                                            />
                                        </motion.div>

                                        <div className="space-y-4 text-center w-full">
                                            <p className="text-3xl font-black uppercase tracking-tighter" style={{ color: team.color }}>READY TO PLAY</p>
                                            <p className="text-slate-500 font-bold text-xs">TEAM MEMBERS:</p>
                                            <div className="flex flex-wrap justify-center gap-3">
                                                {members.map((p, pIdx) => (
                                                    <motion.div
                                                        key={p.id}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: pIdx * 0.1 }}
                                                        className="bg-white/10 px-5 py-2 rounded-2xl text-base font-bold border border-white/10 backdrop-blur-md shadow-lg"
                                                    >
                                                        {p.name}
                                                    </motion.div>
                                                ))}
                                            </div>

                                            {true && (
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        registerParticipant(sessionId || 'local', {
                                                            id: `manual-${team.id}-${Date.now()}`,
                                                            name: `Player ${members.length + 1}`,
                                                            teamId: team.id,
                                                            role: 'player',
                                                            isBuzzed: false
                                                        });
                                                    }}
                                                    className="mt-6 text-yellow-500 hover:text-yellow-400 font-black text-sm uppercase tracking-widest flex items-center gap-2 mx-auto"
                                                >
                                                    <UserPlus size={16} /> ADD PLAYER
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            if (true) {
                                                registerParticipant(sessionId || 'local', {
                                                    id: `manual-${team.id}-${Date.now()}`,
                                                    name: `${team.name} Player`,
                                                    teamId: team.id,
                                                    role: 'player',
                                                    isBuzzed: false
                                                });
                                            }
                                        }}
                                        className="h-full flex-1 flex flex-col items-center justify-center opacity-40 border-2 border-dashed border-white/20 rounded-[3rem] p-10 hover:opacity-100 hover:border-yellow-500/50 transition-all duration-500 group"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6 group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                                            <UserPlus size={40} />
                                        </div>
                                        <p className="text-center font-black tracking-[0.2em] text-sm uppercase group-hover:text-yellow-400">CLICK TO CHECK IN</p>
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Sticky Actions */}
            <footer className="sticky bottom-0 left-0 right-0 flex items-center justify-between bg-slate-900/95 backdrop-blur-2xl border-t border-white/5 p-8 -mx-12 -mb-12 z-50 mt-auto">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
                            <Users className="text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{participants.length}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-widest">Total participants</p>
                        </div>
                    </div>

                    {unassignedCount > 0 && (
                        <div className="bg-blue-500/10 border border-blue-500/20 px-6 py-2 rounded-2xl animate-pulse">
                            <p className="text-blue-400 font-bold text-sm">{unassignedCount} players joining teams...</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-4">
                    <button
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-10 py-5 rounded-[2rem] transition-all flex items-center gap-3"
                    >
                        <QrCode size={24} /> SHOW QR
                    </button>
                    <button
                        onClick={onStart}
                        disabled={participants.length === 0}
                        className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-30 disabled:grayscale text-slate-900 font-black px-16 py-5 rounded-[2rem] transition-all flex items-center gap-4 text-2xl shadow-[0_10px_40px_rgba(234,179,8,0.3)] active:scale-95"
                    >
                        <Play fill="currentColor" size={28} /> {sessionId ? 'START SHOW' : 'START LOCAL SHOW'}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default SessionLobby;
