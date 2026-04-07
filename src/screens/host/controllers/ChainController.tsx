import React from 'react';
import { useSync } from '@/context/SyncContext';
import { ChainReactionGame } from '@/types';
import { motion } from 'framer-motion';
import { Link, Eye, ChevronRight, Zap, List, Sparkles } from 'lucide-react';

interface ChainControllerProps {
    game: ChainReactionGame;
    sessionData: any;
    updateSession: (data: any) => void;
}

const ChainController: React.FC<ChainControllerProps> = ({ game, sessionData, updateSession }) => {
    const currentRoundIndex = sessionData.currentChainRound || 0;
    const currentRound = game.rounds[currentRoundIndex];
    const revealedIndices = new Set(sessionData.revealedChainIndices || [0]); // First one usually visible

    if (!currentRound) return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <List size={48} className="mb-4 opacity-20" />
            <p className="font-black uppercase tracking-widest text-xs">No hay rondas configuradas</p>
        </div>
    );

    const handleRevealNext = () => {
        const nextIdx = revealedIndices.size;
        if (nextIdx < currentRound.chain.length) {
            const newRevealed = new Set(revealedIndices);
            newRevealed.add(nextIdx);
            updateSession({
                revealedChainIndices: Array.from(newRevealed),
                hostCommand: { type: 'chain_reveal', payload: { index: nextIdx } }
            });
        }
    };

    const handleReset = () => {
        updateSession({ revealedChainIndices: [0] });
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#14213d]/20 p-4 rounded-3xl border border-white/5 mx-4 mt-4 premium-glass">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">Reacción en Cadena</span>
                    <h3 className="text-sm font-bold text-slate-100">{currentRound.theme}</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="p-2 bg-white/5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all"
                    >
                        <Link size={18} />
                    </button>
                    <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center">
                        RONDA {currentRoundIndex + 1}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Chain Visualization */}
                <div className="space-y-3">
                    {currentRound.chain.map((item, idx) => {
                        const isRevealed = revealedIndices.has(idx);
                        const isNext = idx === revealedIndices.size;

                        return (
                            <motion.div
                                key={item.id || idx}
                                layout
                                className={`p-5 rounded-3xl border transition-all flex justify-between items-center ${isRevealed
                                    ? 'bg-[#14213d]/40 border-[#fca311]/30 premium-glass'
                                    : isNext
                                        ? 'bg-white/5 border-dashed border-[#fca311]/50 shadow-[0_0_15px_rgba(252,163,17,0.1)]'
                                        : 'bg-[#0a0a0a] border-white/5 opacity-40'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isRevealed ? 'bg-[#fca311] text-black' : 'bg-white/10 text-slate-500'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex flex-col">
                                        <p className={`font-black uppercase tracking-widest ${isRevealed ? 'text-white' : 'text-slate-600'}`}>
                                            {isRevealed ? item.answer : '??????'}
                                        </p>
                                        {isRevealed && (
                                            <p className="text-[10px] text-slate-500 font-bold">{item.prompt}</p>
                                        )}
                                        {isNext && item.linkHint && (
                                            <p className="text-[10px] text-[#fca311]/60 font-bold flex items-center gap-1">
                                                <Zap size={10} /> PISTA: {item.linkHint}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {isRevealed ? (
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-emerald-400 tabular-nums">+{item.points}</span>
                                    </div>
                                ) : isNext ? (
                                    <button
                                        onClick={handleRevealNext}
                                        className="p-3 bg-[#fca311] text-black rounded-xl hover:bg-[#e8920a] transition-all glow-orange"
                                    >
                                        <ChevronRight size={18} strokeWidth={3} />
                                    </button>
                                ) : null}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Global Controls */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleRevealNext}
                        disabled={revealedIndices.size >= currentRound.chain.length}
                        className="bg-[#fca311] text-black py-8 rounded-[2rem] font-black flex flex-col items-center gap-3 hover:bg-[#e8920a] disabled:opacity-30 active:scale-95 transition-all shadow-[0_0_30px_rgba(252,163,17,0.3)]"
                    >
                        <Eye size={40} strokeWidth={3} />
                        <span className="text-xs tracking-[0.2em] uppercase">Revelar Eslabón</span>
                    </button>

                    <button
                        onClick={() => updateSession({ hostCommand: { type: 'chain_reveal_all' } })}
                        className="bg-white/5 text-white border border-white/10 py-8 rounded-[2.5rem] font-black flex flex-col items-center gap-3 hover:bg-white/10 active:scale-95 transition-all shadow-xl"
                    >
                        <Sparkles size={32} className="text-[#fca311]" />
                        <span className="text-[10px] tracking-widest uppercase">Revelar Cadena</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChainController;
