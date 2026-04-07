import React from 'react';
import { useSync } from '@/context/SyncContext';
import { RoscoGame } from '@/types';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ChevronRight, HelpCircle } from 'lucide-react';

interface RoscoControllerProps {
    game: RoscoGame;
    sessionData: any;
    updateSession: (data: any) => void;
}

const RoscoController: React.FC<RoscoControllerProps> = ({ game, sessionData, updateSession }) => {
    const { sessionState } = sessionData;
    const currentLetter = sessionData.currentLetter || "A";
    const answers = sessionData.roscoAnswers || {};

    const currentClue = game.clues.find(c => c.letter === currentLetter);

    const handleAction = (action: 'correct' | 'wrong' | 'skip') => {
        updateSession({
            hostCommand: {
                type: `rosco_${action}`,
                payload: { letter: currentLetter }
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            <div className="flex items-center justify-between bg-[#14213d]/20 p-4 rounded-3xl border border-white/5 mx-4 mt-4 premium-glass">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">El Rosco</span>
                    <h3 className="text-sm font-bold text-slate-100">Master Control Panel</h3>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-widest">
                        LETRA: {currentLetter}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col p-4 gap-6 overflow-auto">
                {/* Current Letter Detail */}
                <motion.div
                    key={currentLetter}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="premium-glass border border-white/5 p-8 rounded-[2.5rem] text-center space-y-8 relative overflow-hidden shadow-2xl"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fca311]/50 to-transparent" />

                    <div className="relative">
                        <div className="w-28 h-28 bg-[#14213d] rounded-full flex items-center justify-center text-6xl font-black mx-auto shadow-[0_0_30px_rgba(20,33,61,0.5)] border-[6px] border-[#fca311] glow-orange">
                            {currentLetter}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Definición / Pista</span>
                        <p className="text-2xl font-bold text-white leading-tight min-h-[4rem] flex items-center justify-center italic">
                            "{currentClue?.definition}"
                        </p>
                    </div>

                    <div className="bg-[#14213d]/40 p-6 rounded-3xl border border-[#fca311]/20 glow-orange">
                        <span className="text-[10px] text-[#fca311] font-black uppercase tracking-[0.3em] mb-2 block">Palabra Secreta</span>
                        <p className="text-4xl font-black text-white tracking-tighter uppercase">{currentClue?.answer}</p>
                    </div>
                </motion.div>

                {/* Quick Controls */}
                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => handleAction('wrong')}
                        className="bg-red-500/10 text-red-500 border border-red-500/20 py-8 rounded-3xl font-black flex flex-col items-center gap-3 hover:bg-red-500/20 active:scale-95 transition-all"
                    >
                        <XCircle size={36} strokeWidth={2.5} />
                        <span className="text-[10px] tracking-widest uppercase">ERROR</span>
                    </button>
                    <button
                        onClick={() => handleAction('skip')}
                        className="bg-white/5 text-white border border-white/10 py-8 rounded-3xl font-black flex flex-col items-center gap-3 hover:bg-white/10 active:scale-95 transition-all premium-glass shadow-xl"
                    >
                        <ChevronRight size={36} strokeWidth={2.5} className="text-[#fca311]" />
                        <span className="text-[10px] tracking-widest uppercase">PASAPALABRA</span>
                    </button>
                    <button
                        onClick={() => handleAction('correct')}
                        className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-8 rounded-3xl font-black flex flex-col items-center gap-3 hover:bg-emerald-500/20 active:scale-95 transition-all"
                    >
                        <CheckCircle size={36} strokeWidth={2.5} />
                        <span className="text-[10px] tracking-widest uppercase">ACIERTO</span>
                    </button>
                </div>

                {/* Letter Grid */}
                <div className="premium-glass p-6 rounded-[2rem] border border-white/5">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {game.clues.map(c => {
                            const status = answers[c.letter];
                            const isActive = c.letter === currentLetter;
                            return (
                                <button
                                    key={c.letter}
                                    onClick={() => updateSession({ currentLetter: c.letter })}
                                    className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-xs transition-all ${isActive
                                            ? 'bg-[#fca311] text-black scale-125 z-10 shadow-[0_0_20px_rgba(252,163,17,0.5)]' :
                                            status === 'correct'
                                                ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                                                status === 'wrong'
                                                    ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]' :
                                                    'bg-[#14213d]/50 text-slate-500 border border-white/5'
                                        }`}
                                >
                                    {c.letter}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoscoController;
