import React from 'react';
import { useSync } from '@/context/SyncContext';
import { BingoGame } from '@/types';
import { motion } from 'framer-motion';
import { Grid, RotateCcw, Zap, Layout, List } from 'lucide-react';

interface BingoControllerProps {
    game: BingoGame;
    sessionData: any;
    updateSession: (data: any) => void;
}

const BingoController: React.FC<BingoControllerProps> = ({ game, sessionData, updateSession }) => {
    const drawBalls = sessionData.bingoDrawBalls || [];
    const mode = game.round?.mode || "CLASSIC";

    const handleDraw = () => {
        updateSession({
            hostCommand: { type: 'bingo_draw', payload: {} }
        });
    };

    const handleReset = () => {
        updateSession({
            bingoDrawBalls: [],
            hostCommand: { type: 'bingo_reset', payload: {} }
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#14213d]/20 p-4 rounded-3xl border border-white/5 mx-4 mt-4 premium-glass">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">Bingo Viktoria</span>
                    <h3 className="text-sm font-bold text-slate-100">Cante de Números</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="p-2 bg-white/5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center">
                        MODO: {mode}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Last Ball Drawn */}
                <div className="premium-glass border border-white/5 p-10 rounded-[3rem] relative overflow-hidden shadow-2xl text-center">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fca311]/50 to-transparent" />
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mb-4 block">Última Bola Extraída</span>

                    {drawBalls.length > 0 ? (
                        <motion.div
                            key={drawBalls[drawBalls.length - 1]}
                            initial={{ scale: 0.5, y: 50, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            className="w-32 h-32 bg-[#fca311] text-black rounded-full flex flex-col items-center justify-center mx-auto shadow-[0_0_50px_rgba(252,163,17,0.4)] border-[8px] border-white ring-4 ring-[#fca311]/30"
                        >
                            <span className="text-5xl font-black">{drawBalls[drawBalls.length - 1]}</span>
                        </motion.div>
                    ) : (
                        <div className="py-12 opacity-10 flex flex-col items-center gap-2">
                            <Grid size={64} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Bombo Vacío</span>
                        </div>
                    )}
                </div>

                {/* Draw Action */}
                <button
                    onClick={handleDraw}
                    className="w-full bg-[#fca311] text-black py-10 rounded-[3.5rem] font-black flex flex-col items-center gap-3 hover:bg-[#e8920a] active:scale-95 transition-all shadow-[0_0_40px_rgba(252,163,17,0.3)]"
                >
                    <Zap size={40} strokeWidth={3} className="animate-pulse" />
                    <span className="text-xs tracking-[0.4em] uppercase">¡SACAR BOLA!</span>
                </button>

                {/* Drawn History Grid */}
                <div className="premium-glass p-6 rounded-[2.5rem] border border-white/5">
                    <div className="flex items-center gap-3 mb-4 text-slate-500">
                        <List size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Historial de Bolas</span>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {Array.from({ length: mode === "90BALL" ? 90 : 75 }, (_, i) => i + 1).map(num => {
                            const isDrawn = drawBalls.includes(num);
                            return (
                                <div
                                    key={num}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-all border ${isDrawn
                                            ? 'bg-emerald-500 border-emerald-400 text-white'
                                            : 'bg-white/5 border-white/5 text-slate-800'
                                        }`}
                                >
                                    {num}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BingoController;
