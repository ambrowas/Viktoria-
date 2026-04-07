import React from 'react';
import { useSync } from '@/context/SyncContext';
import { PyramidGame } from '@/types';
import { motion } from 'framer-motion';
import { Trophy, ArrowUp, XCircle, CheckCircle, HelpCircle } from 'lucide-react';

interface PyramidControllerProps {
    game: PyramidGame;
    sessionData: any;
    updateSession: (data: any) => void;
}

const PyramidController: React.FC<PyramidControllerProps> = ({ game, sessionData, updateSession }) => {
    const currentQuestionIndex = sessionData.currentPyramidIndex || 0;
    const questions = game.metadata.questions || [];
    const currentQuestion = questions[currentQuestionIndex];
    const completedIndices = sessionData.completedIndices || [];

    if (!currentQuestion) return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <Trophy size={48} className="mb-4 opacity-20" />
            <p className="font-black uppercase tracking-widest text-xs">Juego Completado</p>
            <button
                onClick={() => updateSession({ currentPyramidIndex: 0, completedIndices: [] })}
                className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-white text-xs font-black uppercase tracking-widest"
            >
                Reiniciar
            </button>
        </div>
    );

    const handleAnswerResult = (correct: boolean) => {
        if (correct) {
            const nextIdx = currentQuestionIndex + 1;
            updateSession({
                currentPyramidIndex: nextIdx,
                completedIndices: [...completedIndices, currentQuestionIndex],
                hostCommand: { type: 'pyramid_correct', payload: { index: currentQuestionIndex } }
            });
        } else {
            updateSession({
                hostCommand: { type: 'pyramid_wrong', payload: { index: currentQuestionIndex } }
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#14213d]/20 p-4 rounded-3xl border border-white/5 mx-4 mt-4 premium-glass">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">La Pirámide</span>
                    <h3 className="text-sm font-bold text-slate-100">Control de Ascenso</h3>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                        NIVEL {currentQuestion.level}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Pyramid Structure Preview */}
                <div className="flex flex-col-reverse gap-2 items-center py-4 bg-[#14213d]/10 rounded-[2rem] border border-white/5">
                    {[1, 2, 3, 4, 5, 6, 7].map(level => {
                        const isCurrentLevel = currentQuestion.level === level;
                        const isCompleted = questions.some((q, idx) => q.level === level && completedIndices.includes(idx));
                        return (
                            <div
                                key={level}
                                className={`h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-all border ${isCurrentLevel
                                        ? 'bg-[#fca311] text-black border-[#fca311] shadow-[0_0_15px_rgba(252,163,17,0.4)] scale-110 z-10'
                                        : isCompleted
                                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500'
                                            : 'bg-white/5 border-white/5 text-slate-700'
                                    }`}
                                style={{ width: `${60 + (level * 20)}px` }}
                            >
                                NIVEL {level}
                            </div>
                        );
                    })}
                </div>

                {/* active Question Display */}
                <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="premium-glass border border-white/5 p-8 rounded-[2.5rem] text-center space-y-8 relative overflow-hidden shadow-2xl"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fca311]/50 to-transparent" />

                    <div className="space-y-3">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Pregunta Virtual</span>
                        <p className="text-2xl font-bold text-white leading-tight min-h-[4rem] flex items-center justify-center">
                            {currentQuestion.question}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-left">
                        {Object.entries(currentQuestion.options).map(([key, text]) => {
                            const isCorrect = key === currentQuestion.correct;
                            return (
                                <div
                                    key={key}
                                    className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${isCorrect
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                                            : 'bg-white/5 border-white/10 text-slate-400'
                                        }`}
                                >
                                    <div className="flex gap-4 items-center">
                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${isCorrect ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'}`}>
                                            {key.toUpperCase()}
                                        </span>
                                        <span className="font-bold">{text}</span>
                                    </div>
                                    {isCorrect && <CheckCircle size={18} className="text-emerald-500" />}
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Host Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleAnswerResult(false)}
                        className="bg-red-500/10 text-red-500 border border-red-500/20 py-8 rounded-[2rem] font-black flex flex-col items-center gap-3 hover:bg-red-500/20 active:scale-95 transition-all"
                    >
                        <XCircle size={36} strokeWidth={2.5} />
                        <span className="text-[10px] tracking-widest uppercase">FALLO</span>
                    </button>
                    <button
                        onClick={() => handleAnswerResult(true)}
                        className="bg-emerald-500 text-black py-8 rounded-[2rem] font-black flex flex-col items-center gap-3 hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                    >
                        <ArrowUp size={36} strokeWidth={3} />
                        <span className="text-[10px] tracking-widest uppercase">CORRECTO - SUBIR</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PyramidController;
