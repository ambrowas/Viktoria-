import React from 'react';
import { useSync } from '@/context/SyncContext';
import { JeopardyGame, JeopardyCategory, JeopardyQuestion } from '@/types';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, Eye, Music } from 'lucide-react';

interface JeopardyControllerProps {
    game: JeopardyGame;
    sessionData: any;
    updateSession: (data: any) => void;
}

const JeopardyController: React.FC<JeopardyControllerProps> = ({ game, sessionData, updateSession }) => {
    const { sessionState } = sessionData;
    const usedIds = new Set<string>(sessionData.usedQuestionIds || []);
    const activeQuestionId = sessionData.activeQuestionId;

    const categories = game.categories || [];

    // Find active question details if any
    let activeQuestion: JeopardyQuestion | null = null;
    let activeCategory: JeopardyCategory | null = null;

    if (activeQuestionId) {
        for (const cat of categories) {
            const q = cat.questions.find(qq => qq.id === activeQuestionId);
            if (q) {
                activeQuestion = q as JeopardyQuestion;
                activeCategory = cat;
                break;
            }
        }
    }

    const handleSelectQuestion = (catId: string, qId: string) => {
        updateSession({
            activeQuestionId: qId,
            activeCategoryId: catId,
            isAnswerRevealed: false,
            isTimerRunning: true,
            timeLeft: 30
        });
    };

    const handleAction = (action: 'correct' | 'wrong' | 'show_answer') => {
        // These will be picked up by the PC as commands or state changes
        updateSession({
            hostCommand: {
                type: action,
                payload: { teamIndex: sessionData.currentTeamIndex }
            },
            // If revealing, update state
            ...(action === 'show_answer' ? { isAnswerRevealed: true } : {})
        });
    };

    const handleAdjustScore = (teamIndex: number, amount: number) => {
        if (!sessionData.teamScores) return;
        const teams = Object.keys(sessionData.teamScores).sort();
        const teamId = teams[teamIndex];
        if (!teamId) return;

        updateSession({
            teamScores: {
                ...sessionData.teamScores,
                [teamId]: (sessionData.teamScores[teamId] || 0) + amount
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            {activeQuestion ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 flex flex-col p-6 overflow-auto bg-gradient-to-b from-[#14213d]/20 to-[#0a0a0a]"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">{activeCategory?.name}</span>
                            <h2 className="text-3xl font-black text-white">${(activeQuestion as JeopardyQuestion).points}</h2>
                        </div>
                        <button
                            onClick={() => updateSession({ activeQuestionId: null, isAnswerRevealed: false })}
                            className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-white/10 transition-colors"
                        >
                            ← SALIR
                        </button>
                    </div>

                    {/* 🎬 MISSION 06: Premium Media Preview Section */}
                    {(activeQuestion as JeopardyQuestion).questionMediaUrl && (
                        <div className="relative w-full h-48 md:h-64 bg-black rounded-3xl overflow-hidden mb-6 border border-white/10 shadow-2xl premium-card">
                            {(activeQuestion as JeopardyQuestion).questionMediaType === 'IMAGE' ? (
                                <img
                                    src={`/api/media?path=${encodeURIComponent((activeQuestion as JeopardyQuestion).questionMediaUrl || '')}`}
                                    alt="Question Preview"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#14213d] to-black p-8">
                                    <div className="p-6 rounded-full bg-white/5 border border-white/10 mb-4 glow-orange">
                                        {(activeQuestion as JeopardyQuestion).questionMediaType === 'VIDEO' ? <Eye size={48} className="text-[#fca311]" /> :
                                            <Music size={48} className="text-[#fca311]" />}
                                    </div>
                                    <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Media Active on Stage</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex-1 space-y-4">
                        <div className="premium-glass p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
                            <h3 className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Clue / Question</h3>
                            <p className="text-2xl font-bold leading-tight relative z-10">{(activeQuestion as JeopardyQuestion).question}</p>
                        </div>

                        <div className="bg-[#14213d]/40 p-8 rounded-3xl border border-[#fca311]/20 glow-orange">
                            <h3 className="text-[10px] text-[#fca311] font-black uppercase tracking-widest mb-2">Host Key: Correct Answer</h3>
                            <p className="text-2xl font-black text-white">{(activeQuestion as JeopardyQuestion).correctAnswer}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-4">
                            <button
                                onClick={() => handleAction('wrong')}
                                className="bg-red-500/10 text-red-500 border border-red-500/30 p-6 rounded-2xl font-black flex flex-col items-center gap-3 hover:bg-red-500/20 active:scale-95 transition-all"
                            >
                                <XCircle size={32} /> FAIL
                            </button>
                            <button
                                onClick={() => handleAction('show_answer')}
                                className={`p-6 rounded-2xl font-black flex flex-col items-center gap-3 active:scale-95 transition-all border ${sessionData.isAnswerRevealed
                                    ? 'bg-[#fca311] text-black border-[#fca311] glow-orange-active'
                                    : 'bg-white/5 text-[#fca311] border-[#fca311]/30 hover:bg-white/10'
                                    }`}
                            >
                                <Eye size={32} /> {sessionData.isAnswerRevealed ? 'REVEALED' : 'REVEAL'}
                            </button>
                            <button
                                onClick={() => handleAction('correct')}
                                className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 p-6 rounded-2xl font-black flex flex-col items-center gap-3 hover:bg-emerald-500/20 active:scale-95 transition-all"
                            >
                                <CheckCircle size={32} /> SUCCESS
                            </button>
                        </div>

                        {/* Team Selection Glow */}
                        <div className="flex gap-4 p-4 bg-white/5 rounded-3xl border border-white/5">
                            {[0, 1].map((idx) => {
                                const teamKey = idx === 0 ? 'A' : 'B';
                                const isBuzzed = sessionData.buzzedTeam === teamKey;
                                return (
                                    <div key={idx} className={`flex-1 p-4 rounded-2xl border transition-all ${isBuzzed ? 'bg-emerald-500/20 border-emerald-400 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-black/40 border-white/5'}`}>
                                        <p className="text-[10px] font-black uppercase text-slate-500 mb-2 text-center tracking-widest">Team {teamKey}</p>
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => handleAdjustScore(idx, -(activeQuestion?.points || 100))}
                                                className="px-3 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-black border border-red-500/20"
                                            >
                                                -{activeQuestion?.points}
                                            </button>
                                            <button
                                                onClick={() => handleAdjustScore(idx, activeQuestion?.points || 100)}
                                                className="px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-black border border-emerald-500/20"
                                            >
                                                +{activeQuestion?.points}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className="flex-1 overflow-auto p-4 space-y-8 pb-12">
                    {categories.map((cat) => (
                        <div key={cat.id} className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-4 w-1 bg-[#fca311] rounded-full" />
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">{cat.name}</h3>
                            </div>
                            <div className="grid grid-cols-5 gap-3">
                                {cat.questions.sort((a, b) => a.points - b.points).map((q) => {
                                    const isUsed = usedIds.has(q.id);
                                    return (
                                        <button
                                            key={q.id}
                                            disabled={isUsed}
                                            onClick={() => handleSelectQuestion(cat.id, q.id)}
                                            className={`aspect-square md:aspect-video rounded-2xl border font-black text-xl flex items-center justify-center transition-all ${isUsed
                                                ? 'bg-black/20 border-white/5 text-slate-800'
                                                : 'bg-[#14213d]/30 border-white/10 text-white hover:border-[#fca311] hover:bg-[#14213d]/50 active:scale-90 premium-glass'
                                                }`}
                                        >
                                            {q.points}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default JeopardyController;
