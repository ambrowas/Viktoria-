import React from 'react';
import { useSync } from '@/context/SyncContext';
import { PriceIsRightGame } from '@/types';
import { motion } from 'framer-motion';
import { Tag, Eye, ChevronRight, DollarSign, Package } from 'lucide-react';

interface PriceIsRightControllerProps {
    game: PriceIsRightGame;
    sessionData: any;
    updateSession: (data: any) => void;
}

const PriceIsRightController: React.FC<PriceIsRightControllerProps> = ({ game, sessionData, updateSession }) => {
    const currentItemIndex = sessionData.currentPriceItemIndex || 0;
    const items = game.items || [];
    const currentItem = items[currentItemIndex];
    const isPriceRevealed = sessionData.isPriceRevealed || false;

    if (!currentItem) return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <Package size={48} className="mb-4 opacity-20" />
            <p className="font-black uppercase tracking-widest text-xs">Escaparate Completado</p>
            <button
                onClick={() => updateSession({ currentPriceItemIndex: 0, isPriceRevealed: false })}
                className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-white text-xs font-black uppercase tracking-widest"
            >
                Reiniciar
            </button>
        </div>
    );

    const handleRevealPrice = () => {
        updateSession({ isPriceRevealed: !isPriceRevealed });
    };

    const handleNextItem = () => {
        updateSession({
            currentPriceItemIndex: currentItemIndex + 1,
            isPriceRevealed: false
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#14213d]/20 p-4 rounded-3xl border border-white/5 mx-4 mt-4 premium-glass">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">El Precio Justo</span>
                    <h3 className="text-sm font-bold text-slate-100">Control del Escaparate</h3>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center">
                        PRODUCTO {currentItemIndex + 1} / {items.length}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Product Detail Card */}
                <motion.div
                    key={currentItem.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="premium-glass border border-white/5 p-8 rounded-[2.5rem] text-center space-y-8 relative overflow-hidden shadow-2xl"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fca311]/50 to-transparent" />

                    <div className="flex flex-col items-center gap-6">
                        {currentItem.imageUrl ? (
                            <div className="w-48 h-48 rounded-[2rem] overflow-hidden border-4 border-[#14213d] shadow-2xl">
                                <img src={currentItem.imageUrl} alt={currentItem.name} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-48 h-48 bg-[#14213d]/50 rounded-[2rem] flex items-center justify-center border-4 border-[#14213d]">
                                <Package size={64} className="text-slate-700" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white tracking-tight">{currentItem.name}</h2>
                            <p className="text-sm text-slate-400 max-w-xs italic line-clamp-2">"{currentItem.description}"</p>
                        </div>
                    </div>

                    <div className={`p-6 rounded-3xl border transition-all ${isPriceRevealed
                            ? 'bg-emerald-500/20 border-emerald-500/40 glow-emerald'
                            : 'bg-black/40 border-white/5'
                        }`}>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2 block">Precio Real</span>
                        <p className={`text-5xl font-black tabular-nums tracking-tighter ${isPriceRevealed ? 'text-emerald-400' : 'text-slate-800'}`}>
                            {isPriceRevealed ? `${currentItem.actualPrice}€` : '???,??€'}
                        </p>
                    </div>
                </motion.div>

                {/* Host Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleRevealPrice}
                        className={`py-8 rounded-[2rem] font-black flex flex-col items-center gap-3 transition-all border ${isPriceRevealed
                                ? 'bg-white/5 text-slate-400 border-white/10'
                                : 'bg-[#fca311] text-black border-[#fca311] shadow-[0_0_30px_rgba(252,163,17,0.3)]'
                            }`}
                    >
                        <Tag size={36} strokeWidth={2.5} />
                        <span className="text-[10px] tracking-widest uppercase">{isPriceRevealed ? 'OCULTAR PRECIO' : 'REVELAR PRECIO'}</span>
                    </button>

                    <button
                        onClick={handleNextItem}
                        className="bg-white/5 text-white border border-white/10 py-8 rounded-[2rem] font-black flex flex-col items-center gap-3 hover:bg-white/10 active:scale-95 transition-all"
                    >
                        <ChevronRight size={36} strokeWidth={3} className="text-[#fca311]" />
                        <span className="text-[10px] tracking-widest uppercase">SIGUIENTE PRODUCTO</span>
                    </button>
                </div>

                {/* Quick Info */}
                <div className="bg-[#14213d]/10 border border-white/5 p-4 rounded-2xl flex items-center gap-3 text-slate-500">
                    <DollarSign size={16} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                        Consejo: Pide a los concursantes que escriban su precio antes de revelar.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PriceIsRightController;
