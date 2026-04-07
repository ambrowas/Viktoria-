import React from 'react';
import { useSync } from '@/context/SyncContext';
import { LotteryGame } from '@/types';
import { motion } from 'framer-motion';
import { Ticket, RotateCcw, Zap, Target, History } from 'lucide-react';

interface LotteryControllerProps {
    game: LotteryGame;
    sessionData: any;
    updateSession: (data: any) => void;
}

const LotteryController: React.FC<LotteryControllerProps> = ({ game, sessionData, updateSession }) => {
    const drawNumbers = sessionData.lotteryDrawNumbers || [];
    const tickets = game.tickets || [];
    const winners = tickets.filter(t => t.isWinner);

    const handleDraw = () => {
        updateSession({
            hostCommand: { type: 'lottery_draw', payload: {} }
        });
    };

    const handleReset = () => {
        updateSession({
            lotteryDrawNumbers: [],
            hostCommand: { type: 'lottery_reset', payload: {} }
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#14213d]/20 p-4 rounded-3xl border border-white/5 mx-4 mt-4 premium-glass">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">Lotería Viktoria</span>
                    <h3 className="text-sm font-bold text-slate-100">Control de Bombos</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="p-2 bg-white/5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center">
                        MODO: {game.mode}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Draw Results Dashboard */}
                <div className="premium-glass border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl text-center">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fca311]/50 to-transparent" />
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mb-8 block">Números Premiados</span>

                    <div className="flex flex-wrap gap-4 justify-center">
                        {drawNumbers.length > 0 ? (
                            drawNumbers.map((num: any, idx: number) => (
                                <motion.div
                                    key={idx}
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    className="w-16 h-16 bg-[#fca311] text-black rounded-full flex items-center justify-center text-2xl font-black shadow-[0_0_20px_rgba(252,163,17,0.4)] border-4 border-white"
                                >
                                    {num}
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-8 opacity-20 flex flex-col items-center gap-2">
                                <Target size={48} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Esperando Sorteo</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Draw Action */}
                <button
                    onClick={handleDraw}
                    className="w-full bg-[#fca311] text-black py-10 rounded-[3rem] font-black flex flex-col items-center gap-3 hover:bg-[#e8920a] active:scale-95 transition-all shadow-[0_0_40px_rgba(252,163,17,0.3)]"
                >
                    <Zap size={40} strokeWidth={3} className="animate-pulse" />
                    <span className="text-xs tracking-[0.3em] uppercase">¡EXTRAER BOLA!</span>
                </button>

                {/* Ticket Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="premium-glass border border-white/5 p-6 rounded-[2.5rem] flex flex-col items-center">
                        <Ticket size={24} className="text-[#fca311] mb-2" />
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Boletos Activos</span>
                        <span className="text-3xl font-black mt-1 tabular-nums">{tickets.length}</span>
                    </div>

                    <div className="premium-glass border border-emerald-500/20 bg-emerald-500/5 p-6 rounded-[2.5rem] flex flex-col items-center">
                        <History size={24} className="text-emerald-500 mb-2" />
                        <span className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest">Ganadores</span>
                        <span className="text-3xl font-black mt-1 tabular-nums text-emerald-400">{winners.length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LotteryController;
