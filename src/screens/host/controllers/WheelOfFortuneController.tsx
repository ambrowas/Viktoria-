import React from 'react';
import { useSync } from '@/context/SyncContext';
import { WheelOfFortuneGame } from '@/types';
import { motion } from 'framer-motion';
import { RotateCcw, Type, Eye, Sparkles } from 'lucide-react';

interface WheelOfFortuneControllerProps {
    game: WheelOfFortuneGame;
    sessionData: any;
    updateSession: (data: any) => void;
}

const WheelOfFortuneController: React.FC<WheelOfFortuneControllerProps> = ({ game, sessionData, updateSession }) => {
    const currentRoundIndex = sessionData.currentWheelRound || 0;
    const currentRound = game.rounds[currentRoundIndex];
    const revealedLetters = new Set(sessionData.revealedLetters || []);

    if (!currentRound) return <div>No round data</div>;

    const handleSpin = () => {
        updateSession({
            hostCommand: { type: 'wheel_spin', payload: {} }
        });
    };

    const handleRevealLetter = (char: string) => {
        const newRevealed = new Set(revealedLetters);
        if (newRevealed.has(char)) {
            newRevealed.delete(char);
        } else {
            newRevealed.add(char);
        }
        updateSession({ revealedLetters: Array.from(newRevealed) });
    };

    const renderPuzzleGrid = () => {
        const words = currentRound.puzzle.split(' ');
        return (
            <div className="flex flex-wrap gap-4 justify-center">
                {words.map((word, wIdx) => (
                    <div key={wIdx} className="flex gap-1">
                        {word.split('').map((char, cIdx) => {
                            const isLetter = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(char);
                            const isRevealed = revealedLetters.has(char.toUpperCase()) || !isLetter;
                            return (
                                <button
                                    key={cIdx}
                                    onClick={() => isLetter && handleRevealLetter(char.toUpperCase())}
                                    className={`w-10 h-12 rounded-lg flex items-center justify-center font-black text-xl transition-all border ${!isLetter ? 'bg-transparent border-transparent text-white/20' :
                                            isRevealed
                                                ? 'bg-[#fca311] text-black border-[#fca311] shadow-[0_0_15px_rgba(252,163,17,0.4)]'
                                                : 'bg-[#14213d]/50 text-white/30 border-white/10'
                                        }`}
                                >
                                    {char.toUpperCase()}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#14213d]/20 p-4 rounded-3xl border border-white/5 mx-4 mt-4 premium-glass">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">La Ruleta</span>
                    <h3 className="text-sm font-bold text-slate-100">{currentRound.category}</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => updateSession({ revealedLetters: [] })}
                        className="p-2 bg-white/5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center">
                        RONDA {currentRoundIndex + 1}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Puzzle Preview */}
                <div className="premium-glass border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fca311]/50 to-transparent" />
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mb-6 block text-center">Panel del Puzzle</span>
                    {renderPuzzleGrid()}
                </div>

                {/* Main Controls */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleSpin}
                        className="bg-[#fca311] text-black py-8 rounded-[2rem] font-black flex flex-col items-center gap-3 hover:bg-[#e8920a] active:scale-95 transition-all shadow-[0_0_30px_rgba(252,163,17,0.3)]"
                    >
                        <RotateCcw size={40} strokeWidth={3} className="animate-spin-slow" />
                        <span className="text-xs tracking-[0.2em] uppercase">Girar Ruleta</span>
                    </button>

                    <div className="grid grid-rows-2 gap-4">
                        <button
                            onClick={() => updateSession({ hostCommand: { type: 'wheel_reveal_all' } })}
                            className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-3xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-500/20 active:scale-95 transition-all"
                        >
                            <Eye size={20} /> REVELAR TODO
                        </button>
                        <button
                            className="bg-white/5 text-white border border-white/10 rounded-3xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 active:scale-95 transition-all"
                        >
                            <Sparkles size={20} className="text-[#fca311]" /> BONO PREMIO
                        </button>
                    </div>
                </div>

                {/* Alphabet Access */}
                <div className="premium-glass p-6 rounded-[2rem] border border-white/5">
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] mb-4 block text-center">Teclado de Revelación</span>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {"ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split('').map(char => {
                            const isRevealed = revealedLetters.has(char);
                            const isInPuzzle = currentRound.puzzle.toUpperCase().includes(char);
                            return (
                                <button
                                    key={char}
                                    onClick={() => handleRevealLetter(char)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all border ${isRevealed
                                            ? 'bg-emerald-500 border-emerald-400 text-white' :
                                            isInPuzzle
                                                ? 'bg-[#14213d] border-[#fca311]/50 text-white' :
                                                'bg-white/5 border-white/5 text-slate-600'
                                        }`}
                                >
                                    {char}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WheelOfFortuneController;
