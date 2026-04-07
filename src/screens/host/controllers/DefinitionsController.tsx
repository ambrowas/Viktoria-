import React from 'react';
import { useSync } from '@/context/SyncContext';
import { DefinitionsGame } from '@/types';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, XCircle, ChevronRight, Timer, HelpCircle } from 'lucide-react';

interface DefinitionsControllerProps {
    game: DefinitionsGame;
    sessionData: any;
    updateSession: (data: any) => void;
}

const DefinitionsController: React.FC<DefinitionsControllerProps> = ({ game, sessionData, updateSession }) => {
    const currentClueIndex = sessionData.currentDefinitionIndex || 0;
    const clues = game.clues || [];
    const currentClue = clues[currentClueIndex];

    if (!currentClue) return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <BookOpen size={48} className="mb-4 opacity-20" />
            <p className="font-black uppercase tracking-widest text-xs">Diccionario Completado</p>
            <button
                onClick={() => updateSession({ currentDefinitionIndex: 0 })}
                className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-white text-xs font-black uppercase tracking-widest"
            >
                Reiniciar
            </button>
        </div>
    );

    const handleAction = (correct: boolean) => {
        const nextIdx = currentClueIndex + 1;
        updateSession({
            currentDefinitionIndex: nextIdx,
            hostCommand: {
                type: correct ? 'definition_correct' : 'definition_wrong',
                payload: { index: currentClueIndex }
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#14213d]/20 p-4 rounded-3xl border border-white/5 mx-4 mt-4 premium-glass">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">Diccionario de Viktoria</span>
                    <h3 className="text-sm font-bold text-slate-100">Panel de Verificación</h3>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center">
                        PALABRA {currentClueIndex + 1} / {clues.length}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Word & Definition Dashboard */}
                <motion.div
                    key={currentClueIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-glass border border-white/5 p-10 rounded-[2.5rem] text-center space-y-10 relative overflow-hidden shadow-2xl"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fca311]/50 to-transparent" />

                    <div className="space-y-4">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">La Palabra es:</span>
                        <h2 className="text-5xl font-black text-white tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                            {currentClue.word}
                        </h2>
                    </div>

                    <div className="h-[2px] w-12 bg-[#fca311]/20 mx-auto" />

                    <div className="space-y-3">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Definición del Autor</span>
                        <p className="text-xl font-medium text-slate-300 leading-relaxed italic">
                            "{currentClue.definition}"
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[#fca311] pt-4">
                        <Timer size={16} />
                        <span className="text-xs font-black uppercase tracking-widest">Ritmo de Competición</span>
                    </div>
                </motion.div>

                {/* Verification Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleAction(false)}
                        className="bg-red-500/10 text-red-500 border border-red-500/20 py-10 rounded-[3rem] font-black flex flex-col items-center gap-3 hover:bg-red-500/20 active:scale-95 transition-all shadow-xl"
                    >
                        <XCircle size={40} strokeWidth={2.5} />
                        <span className="text-[10px] tracking-[0.2em] uppercase">RESPUESTA INVÁLIDA</span>
                    </button>
                    <button
                        onClick={() => handleAction(true)}
                        className="bg-emerald-500 text-black py-10 rounded-[3rem] font-black flex flex-col items-center gap-3 hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                    >
                        <CheckCircle size={40} strokeWidth={3} />
                        <span className="text-[10px] tracking-[0.2em] uppercase">PALABRA CORRECTA</span>
                    </button>
                </div>

                {/* Quick Skip */}
                <button
                    onClick={() => updateSession({ currentDefinitionIndex: currentClueIndex + 1 })}
                    className="w-full premium-glass border border-white/5 py-5 rounded-2xl text-slate-500 font-black text-[10px] tracking-[0.4em] uppercase flex items-center justify-center gap-3 hover:text-white transition-all mb-4"
                >
                    PASA DE PALABRA <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default DefinitionsController;
