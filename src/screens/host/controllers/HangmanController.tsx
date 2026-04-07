import React from 'react';
import { useSync } from '@/context/SyncContext';
import { HangmanGame } from '@/types';
import { motion } from 'framer-motion';
import { Skull, RotateCcw, HelpCircle, Eye, AlertCircle } from 'lucide-react';

interface HangmanControllerProps {
    game: HangmanGame;
    sessionData: any;
    updateSession: (data: any) => void;
}

const HangmanController: React.FC<HangmanControllerProps> = ({ game, sessionData, updateSession }) => {
    const currentPhraseIndex = sessionData.currentHangmanPhrase || 0;
    const currentPhrase = game.phrases[currentPhraseIndex];
    const revealedLetters = new Set(sessionData.revealedLetters || []);
    const errorCount = sessionData.hangmanErrors || 0;

    if (!currentPhrase) return <div>No phrase data</div>;

    const handleRevealLetter = (char: string) => {
        updateSession({ hostCommand: { type: 'hangman_toggle_letter', payload: { char }, timestamp: Date.now() } });
    };

    const handleAddError = () => {
        updateSession({ hostCommand: { type: 'hangman_add_error', timestamp: Date.now() } });
    };

    const handleRemoveError = () => {
        updateSession({ hostCommand: { type: 'hangman_remove_error', timestamp: Date.now() } });
    };

    const renderPhrasePreview = () => {
        const words = currentPhrase.text.split(' ');
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
                                    className={`w-9 h-11 rounded-lg flex items-center justify-center font-black text-lg transition-all border ${!isLetter ? 'bg-transparent border-transparent text-white/20' :
                                            isRevealed
                                                ? 'bg-[#fca311] text-black border-[#fca311]'
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
            <div className="flex items-center justify-between bg-[#14213d]/20 p-4 rounded-3xl border border-white/5 mx-4 mt-4 premium-glass">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">El Ahorcado</span>
                    <h3 className="text-sm font-bold text-slate-100">{currentPhrase.category}</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => updateSession({ hostCommand: { type: 'hangman_reset', timestamp: Date.now() } })}
                        className="p-2 bg-white/5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center">
                        MODO: {currentPhrase.difficulty}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Phrase Preview */}
                <div className="premium-glass border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fca311]/50 to-transparent" />
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mb-6 block text-center">Frase Oculta</span>
                    {renderPhrasePreview()}

                    {currentPhrase.hint && (
                        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center">
                            <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] mb-2">Pista del Autor</span>
                            <p className="text-sm italic text-slate-400">"{currentPhrase.hint}"</p>
                        </div>
                    )}
                </div>

                {/* Error & Kill Switch Controls */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="premium-glass border border-white/5 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-4">
                        <span className="text-[10px] text-red-500 font-black uppercase tracking-[0.3em]">Estado del Reo</span>
                        <div className="flex items-center gap-6">
                            <button
                                onClick={handleRemoveError}
                                className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-white"
                            >
                                -
                            </button>
                            <div className="flex flex-col items-center">
                                <Skull size={32} className={`${errorCount > 0 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`} />
                                <span className="text-2xl font-black mt-1 tabular-nums">{errorCount}/{game.maxAttempts}</span>
                            </div>
                            <button
                                onClick={handleAddError}
                                className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30 text-red-500"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-rows-2 gap-4">
                        <button
                            onClick={() => updateSession({ hostCommand: { type: 'hangman_send_hint' } })}
                            className="bg-white/5 text-white border border-white/10 rounded-3xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 active:scale-95 transition-all"
                        >
                            <HelpCircle size={20} className="text-[#fca311]" /> ENVIAR PISTA
                        </button>
                        <button
                            onClick={() => updateSession({ hostCommand: { type: 'hangman_reveal_all' } })}
                            className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-3xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-500/20 active:scale-95 transition-all"
                        >
                            <Eye size={20} /> REVELAR TODO
                        </button>
                    </div>
                </div>

                {/* Keyboard Access */}
                <div className="premium-glass p-6 rounded-[2rem] border border-white/5">
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] mb-4 block text-center">Control de Letras</span>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {"ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split('').map(char => {
                            const isRevealed = revealedLetters.has(char);
                            const isInPhrase = currentPhrase.text.toUpperCase().includes(char);
                            return (
                                <button
                                    key={char}
                                    onClick={() => handleRevealLetter(char)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all border ${isRevealed
                                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                                            isInPhrase
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

export default HangmanController;
