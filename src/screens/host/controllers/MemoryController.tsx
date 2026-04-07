import React, { useState } from 'react';
import { useSync } from '@/context/SyncContext';
import { MemoryGame } from '@/types';
import { motion } from 'framer-motion';
import { LayoutGrid, RotateCcw, Eye, EyeOff, Brain } from 'lucide-react';

const getCols = (size: any) => {
    const num = Number(size);
    switch (num) {
        case 16: return 4;
        case 20: return 5;
        case 28: return 7;
        default: return Math.ceil(Math.sqrt(num || 16));
    }
};

interface MemoryControllerProps {
    game: MemoryGame;
    sessionData: any;
    updateSession: (data: any) => void;
}

const MemoryController: React.FC<MemoryControllerProps> = ({ game, sessionData, updateSession }) => {
    const [isPeekMode, setIsPeekMode] = useState(false);
    const flippedIndices = sessionData.flippedIndices || [];
    const matchedPairs = sessionData.matchedPairs || [];
    const deck = sessionData.shuffledIndices?.length > 0 
        ? sessionData.shuffledIndices.map((idx: number) => game.tiles?.[idx] || { content: '?' }) 
        : (game.tiles || []);

    const handleReset = () => {
        updateSession({
            flippedIndices: [],
            matchedPairs: [],
            hostCommand: { type: 'memory_reset', payload: {}, timestamp: Date.now() }
        });
    };

    const handleForceFlip = (index: number) => {
        updateSession({ hostCommand: { type: 'memory_force_flip', payload: { index }, timestamp: Date.now() }});
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#14213d]/20 p-4 rounded-3xl border border-white/5 mx-4 mt-4 premium-glass">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">Memoria Cósmica</span>
                    <h3 className="text-sm font-bold text-slate-100">Panel de Control Mental</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="p-2 bg-white/5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all"
                        title="Reset Board"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center">
                        MODO: {game.gridSize}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Board Preview (God Mode) */}
                <div className="premium-glass border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fca311]/50 to-transparent" />
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Vista de Administrador</span>
                        <button 
                            onClick={() => setIsPeekMode(!isPeekMode)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${isPeekMode ? 'bg-[#fca311]/20 text-[#fca311] border border-[#fca311]/50' : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'}`}
                        >
                            {isPeekMode ? <Eye size={14} /> : <EyeOff size={14} />}
                            {isPeekMode ? 'MODO OJOS ABIERTOS' : 'MODO CERRADO'}
                        </button>
                    </div>

                    <div className={`grid gap-1 sm:gap-2 mx-auto w-full max-w-[55vh] md:max-w-[65vh] lg:max-w-[70vh] xl:max-w-[800px]`} style={{
                        gridTemplateColumns: `repeat(${getCols(deck.length)}, minmax(0, 1fr))`
                    }}>
                        {deck.map((tile: any, idx: number) => {
                            const isFlipped = flippedIndices.includes(idx);
                            const isMatched = matchedPairs.includes(tile.matchId);

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleForceFlip(idx)}
                                    className={`aspect-square rounded-xl flex items-center justify-center text-lg md:text-xl lg:text-2xl transition-all border ${isMatched
                                            ? 'bg-emerald-500 text-black border-emerald-400 opacity-40'
                                            : isFlipped
                                                ? 'bg-[#fca311] text-black border-[#fca311] shadow-[0_0_15px_rgba(252,163,17,0.4)]'
                                                : 'bg-[#14213d]/50 text-white/80 border-white/10'
                                        }`}
                                >
                                    {(!isFlipped && !isMatched && !isPeekMode) ? (
                                        <span className="font-black text-white/40">{idx + 1}</span>
                                    ) : tile.sourceType === 'UPLOAD' || tile.content.startsWith('http') || tile.content.startsWith('data:image') ? (
                                        <img src={tile.content} alt="" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        tile.content
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Score & Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="premium-glass border border-white/5 p-6 rounded-[2.5rem] flex flex-col items-center">
                        <Brain size={24} className="text-[#fca311] mb-2" />
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Parejas Encontradas</span>
                        <span className="text-3xl font-black mt-1 tabular-nums">{matchedPairs.length} / {deck.length / 2}</span>
                    </div>

                    <div className="grid grid-rows-2 gap-4">
                        <button
                            onClick={() => updateSession({ hostCommand: { type: 'memory_reveal_all', timestamp: Date.now() } })}
                            className="bg-white/5 text-white border border-white/10 rounded-3xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 active:scale-95 transition-all"
                        >
                            <Eye size={18} className="text-[#fca311]" /> REVELAR TODO
                        </button>
                        <button
                            onClick={() => updateSession({ hostCommand: { type: 'memory_shuffle', timestamp: Date.now() } })}
                            className="bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-3xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-purple-500/20 active:scale-95 transition-all shadow-xl"
                        >
                            <LayoutGrid size={18} /> RE-MEZCLAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemoryController;
