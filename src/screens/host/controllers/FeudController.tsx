import React from 'react';
import { useSync } from '@/context/SyncContext';
import { FamilyFeudRound } from '@/types';
import { motion } from 'framer-motion';
import { Eye, XCircle, AlertCircle, ChevronRight, Users } from 'lucide-react';

interface FeudControllerProps {
    game: { rounds: FamilyFeudRound[] };
    sessionData: any;
    updateSession: (data: any) => void;
}

const FeudController: React.FC<FeudControllerProps> = ({ game, sessionData, updateSession }) => {
    const roundIndex = sessionData.currentRoundIndex || 0;
    const currentRound = game.rounds[roundIndex];
    const revealed = sessionData.revealedAnswers || [];
    const strikes = sessionData.strikes || 0;
    const activeTeam = sessionData.activeTeam || "A";

    const handleAction = (action: string, payload?: any) => {
        const update: any = {
            hostCommand: {
                type: `feud_${action}`,
                payload: payload || {}
            }
        };

        if (action === 'reveal' && payload?.text) {
            update.revealedAnswers = [...revealed, payload.text];
        } else if (action === 'strike') {
            update.strikes = Math.min(3, strikes + 1);
        } else if (action === 'switch_team') {
            update.activeTeam = activeTeam === 'A' ? 'B' : 'A';
        } else if (action === 'next_round') {
            update.currentRoundIndex = (sessionData.currentRoundIndex || 0) + 1;
            update.revealedAnswers = [];
            update.strikes = 0;
        }

        updateSession(update);
    };

    if (!currentRound) return null;

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            <div className="flex items-center justify-between bg-[#14213d]/20 p-4 rounded-3xl border border-white/5 mx-4 mt-4 premium-glass">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">Family Feud</span>
                    <h3 className="text-sm font-bold text-slate-100">Round {roundIndex + 1} Control</h3>
                </div>
                <div className={`px-4 py-1 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg ${activeTeam === 'A' ? 'bg-[#14213d] border-sky-500 text-sky-400 shadow-sky-500/20' : 'bg-[#14213d] border-pink-500 text-pink-400 shadow-pink-500/20'}`}>
                    TURNO: EQUIPO {activeTeam}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                <div className="premium-glass p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Users size={120} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2 block">Question</span>
                    <p className="text-2xl font-bold leading-tight relative z-10">{currentRound.question}</p>
                </div>

                <div className="space-y-3">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] pl-4">Panel de Respuestas</span>
                    <div className="grid grid-cols-1 gap-3">
                        {currentRound.answers.map((ans, i) => {
                            const isRevealed = revealed.includes(ans.text);
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleAction('reveal', { text: ans.text })}
                                    className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isRevealed
                                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 glow-orange-active grayscale-0'
                                        : 'bg-[#14213d]/30 border-white/10 text-slate-300 hover:border-[#fca311] premium-glass'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${isRevealed ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-500'}`}>
                                            {i + 1}
                                        </div>
                                        <span className={`text-lg transition-all ${isRevealed ? 'font-black' : 'font-medium'}`}>{ans.text}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className="font-black text-2xl tabular-nums">{ans.points}</span>
                                        {!isRevealed && <Eye size={20} className="text-slate-600 hover:text-[#fca311] transition-colors" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                    <button
                        onClick={() => handleAction('strike')}
                        className="bg-red-500/5 text-red-500 border border-red-500/30 py-8 rounded-3xl font-black flex flex-col items-center gap-4 hover:bg-red-500/10 active:scale-95 transition-all"
                    >
                        <div className="flex gap-3">
                            {[1, 2, 3].map(s => (
                                <XCircle key={s} fill={strikes >= s ? "currentColor" : "none"} strokeWidth={3} size={32} />
                            ))}
                        </div>
                        <span className="tracking-[0.2em] text-xs">¡STRIKE DE GRUPOS!</span>
                    </button>
                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={() => handleAction('switch_team')}
                            className="bg-[#14213d]/60 text-white border border-white/10 p-5 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-white/10 active:scale-95 transition-all premium-glass shadow-xl"
                        >
                            <Users size={24} className="text-[#fca311]" /> CAMBIAR EQUIPO
                        </button>
                        <button
                            onClick={() => handleAction('next_round')}
                            className="bg-[#fca311] text-black p-5 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-[#e8920a] active:scale-95 transition-all shadow-xl glow-orange"
                        >
                            SIGUIENTE RONDA <ChevronRight size={24} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                {/* 💰 MISSION 07: Manual Score Adjustment & Face-off Feedback */}
                <div className="flex gap-4 p-4 bg-white/5 rounded-3xl border border-white/5">
                    {[0, 1].map((idx) => {
                        const teamKey = idx === 0 ? 'A' : 'B';
                        const isBuzzed = sessionData.buzzedTeam === teamKey;
                        return (
                            <div key={idx} className={`flex-1 p-4 rounded-2xl border transition-all ${isBuzzed ? 'bg-emerald-500/20 border-emerald-400 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-black/40 border-white/5'}`}>
                                <p className="text-[10px] font-black uppercase text-slate-500 mb-3 text-center tracking-widest">Team {teamKey}</p>
                                <div className="flex gap-3 items-center justify-center">
                                    <button
                                        onClick={() => {
                                            const teamId = Object.keys(sessionData.teamScores || {}).sort()[idx];
                                            if (teamId) updateSession({ teamScores: { ...sessionData.teamScores, [teamId]: (sessionData.teamScores[teamId] || 0) - 10 } });
                                        }}
                                        className="w-12 h-10 bg-red-500/10 text-red-500 rounded-xl text-xs font-black border border-red-500/20"
                                    >
                                        -10
                                    </button>
                                    <button
                                        onClick={() => {
                                            const teamId = Object.keys(sessionData.teamScores || {}).sort()[idx];
                                            if (teamId) updateSession({ teamScores: { ...sessionData.teamScores, [teamId]: (sessionData.teamScores[teamId] || 0) + 10 } });
                                        }}
                                        className="w-12 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-black border border-emerald-500/20"
                                    >
                                        +10
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FeudController;
