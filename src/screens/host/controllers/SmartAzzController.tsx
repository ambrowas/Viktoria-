import React, { useState, useEffect } from 'react';
import { SmartAzzGame, SmartAzzCategory } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Check, X, AlertTriangle, ArrowRight, RefreshCw, Trophy } from 'lucide-react';

interface SmartAzzControllerProps {
    game: SmartAzzGame;
    sessionData: any;
    updateSession: (data: any) => void;
}

const SmartAzzController: React.FC<SmartAzzControllerProps> = ({ game, sessionData, updateSession }) => {
    const state = sessionData?.smartAzzState || {
        activeCategoryId: null,
        usedCategories: [],
        scores: [0, 0],
        victories: [0, 0],
        activeTeam: 0,
        shotClock: game.turnTimer ?? 10,
        isRunning: false,
        guessedAnswers: [],
        roundEnded: false,
        winnerScreen: null,
        showCredits: false,
        isDraw: false,
        guessedBy: {},
        eliminationReason: null,
    };

    const isFinalRound = sessionData?.currentRoundIndex === ((sessionData?.fullShowData?.rounds?.length || 0) - 1);
    const activeTeams = sessionData?.teams || [];
    const lang = sessionData?.fullShowData?.settings?.language || sessionData?.settings?.language || 'en';
    const [searchQuery, setSearchQuery] = useState("");

    const teamLabel = (index: number) => {
        if (activeTeams && activeTeams[index]) {
            return activeTeams[index].name;
        }
        return index === 0 ? "Team A" : "Team B";
    };

    const syncState = (updates: any) => {
        updateSession({
            smartAzzState: {
                ...state,
                ...updates
            }
        });
    };

    // Timer interval runner on Host device (iPad)
    useEffect(() => {
        if (!state.isRunning) return;

        const interval = setInterval(() => {
            const nextShot = state.shotClock - 1;

            if (nextShot <= 0) {
                clearInterval(interval);
                handleTeamFail(state.activeTeam, 'timeout');
                return;
            }

            syncState({
                shotClock: nextShot,
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [state.isRunning, state.shotClock, state.activeTeam]);

    const handleSelectCategory = (catId: string) => {
        syncState({
            activeCategoryId: catId,
            usedCategories: [...(state.usedCategories || []), catId],
            guessedAnswers: [],
            shotClock: game.turnTimer ?? 10,
            isRunning: false,
            roundEnded: false,
            isDraw: false,
            guessedBy: {},
        });
    };

    const handleCorrectAnswer = (answer: string) => {
        const guessed = state.guessedAnswers || [];
        if (guessed.includes(answer)) return;
        
        const nextGuessed = [...guessed, answer];
        const newScores = [...(state.scores || [0, 0])];
        const nextGuessedBy = { ...(state.guessedBy || {}), [answer]: state.activeTeam };

        const cat = game.categories.find(c => 
            c.id === state.activeCategoryId || 
            c.name?.toLowerCase() === state.activeCategoryId?.toLowerCase()
        );
        if (cat) {
            const pts = cat.pointValue || 100;
            newScores[state.activeTeam] += pts;

            // Only update main teamScores record directly if NOT the final round
            if (!isFinalRound) {
                const activeTeamObj = activeTeams[state.activeTeam];
                if (activeTeamObj) {
                    const updatedTeamScores = { ...(sessionData.teamScores || {}) };
                    updatedTeamScores[activeTeamObj.id] = (updatedTeamScores[activeTeamObj.id] || 0) + pts;
                    
                    const allGuessed = nextGuessed.length === (cat.validAnswers || []).length;
                    updateSession({
                        teamScores: updatedTeamScores,
                        smartAzzState: {
                            ...state,
                            guessedAnswers: nextGuessed,
                            scores: newScores,
                            isRunning: !allGuessed,
                            roundEnded: allGuessed,
                            isDraw: allGuessed,
                            activeTeam: allGuessed ? state.activeTeam : (state.activeTeam === 0 ? 1 : 0),
                            shotClock: game.turnTimer ?? 10,
                            guessedBy: nextGuessedBy,
                        }
                    });
                    setSearchQuery("");
                    return;
                }
            }
        }

        const allGuessed = cat && nextGuessed.length === (cat.validAnswers || []).length;

        syncState({
            guessedAnswers: nextGuessed,
            scores: newScores,
            isRunning: !allGuessed,
            roundEnded: allGuessed,
            isDraw: allGuessed,
            activeTeam: allGuessed ? state.activeTeam : (state.activeTeam === 0 ? 1 : 0),
            shotClock: game.turnTimer ?? 10,
            guessedBy: nextGuessedBy,
        });
        setSearchQuery("");
    };

    const handleTeamFail = (failingTeamIndex: 0 | 1, reason: 'timeout' | 'wrong') => {
        const winningTeamIndex = failingTeamIndex === 0 ? 1 : 0;
        const newVictories = [...(state.victories || [0, 0])];
        newVictories[winningTeamIndex] += 1;

        syncState({
            victories: newVictories,
            isRunning: false,
            roundEnded: true,
            isDraw: false,
            eliminationReason: reason,
            activeTeam: failingTeamIndex,
        });
    };

    const checkWinnerAndContinue = () => {
        if (state.victories[0] >= 4) {
            syncState({ winnerScreen: `${teamLabel(0)} Wins!` });
        } else if (state.victories[1] >= 4) {
            syncState({ winnerScreen: `${teamLabel(1)} Wins!` });
        } else {
            syncState({ activeCategoryId: null, isDraw: false });
        }
    };

    const handleEarlyEndGame = () => {
        const vics = state.victories || [0, 0];
        const scs = state.scores || [0, 0];
        const winnerIdx = vics[0] > vics[1] ? 0 : vics[1] > vics[0] ? 1 : (scs[0] >= scs[1] ? 0 : 1);
        syncState({
            earlyEndWinnerIndex: winnerIdx,
            winnerScreen: `${teamLabel(winnerIdx)} Wins!`,
            roundEnded: true,
            isRunning: false,
        });
    };

    const handleContinueToCredits = () => {
        syncState({ showCredits: true });
    };

    const handleFinishShow = () => {
        if (isFinalRound) {
            const updatedTeamScores = { ...(sessionData.teamScores || {}) };
            activeTeams.forEach((team: any, index: number) => {
                const pts = state.scores[index] || 0;
                updatedTeamScores[team.id] = (updatedTeamScores[team.id] || 0) + pts;
            });
            updateSession({
                teamScores: updatedTeamScores,
                hostCommand: {
                    type: 'finish_round',
                    timestamp: Date.now()
                }
            });
        } else {
            updateSession({
                hostCommand: {
                    type: 'finish_round',
                    timestamp: Date.now()
                }
            });
        }
    };

    // 1. CHAMPION/WINNER SCREEN VIEW
    if (state.winnerScreen) {
        if (isFinalRound) {
            if (state.showCredits) {
                return (
                    <div className="flex flex-col items-center justify-center p-8 h-full bg-[#0a0a0a] text-center space-y-6">
                        <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center border-2 border-yellow-500/20 mb-4">
                            <Trophy size={48} className="text-yellow-500" />
                        </div>
                        <h2 className="text-2xl font-black uppercase text-yellow-500">Credits Screen Active</h2>
                        <p className="text-slate-400 max-w-xs">The cinematic credits scroll is playing on the viewer TV screen.</p>
                        <button
                            onClick={handleFinishShow}
                            className="w-full max-w-xs py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-black uppercase tracking-wider text-white shadow-lg active:scale-95 transition-transform"
                        >
                            FINISH SHOW ➔
                        </button>
                    </div>
                );
            }

            const winningTeamIndex = state.victories[0] >= 4 ? 0 : 1;
            const winnerTeam = activeTeams[winningTeamIndex];
            const previousScore = sessionData.teamScores?.[winnerTeam?.id] || 0;
            const faceOffScore = state.scores[winningTeamIndex] || 0;
            const totalScore = previousScore + faceOffScore;

            return (
                <div className="flex flex-col items-center justify-center p-8 h-full bg-[#0a0a0a] text-center space-y-6">
                    <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center border-2 border-yellow-500/20 mb-4 animate-pulse">
                        <Trophy size={48} className="text-yellow-500" />
                    </div>
                    <h2 className="text-3xl font-black uppercase text-yellow-500 tracking-tight">Champion Crowned</h2>
                    <p className="text-white text-xl font-bold">{state.winnerScreen}</p>
                    
                    <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl max-w-xs w-full text-xs text-slate-300 font-bold space-y-1.5 mx-auto">
                        <div className="flex justify-between">
                            <span>Accumulated Score:</span>
                            <span className="text-white">${previousScore}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Guesses Score:</span>
                            <span className="text-white">+ ${faceOffScore}</span>
                        </div>
                        <div className="h-[1px] bg-slate-800 my-1" />
                        <div className="flex justify-between text-yellow-500 font-black text-sm">
                            <span>FINAL SCORE:</span>
                            <span>${totalScore}</span>
                        </div>
                    </div>

                    <p className="text-slate-400 max-w-xs text-sm">Congratulations overlay is active on the TV screen. Press below to display movie credits.</p>
                    <button
                        onClick={handleContinueToCredits}
                        className="w-full max-w-xs py-4 bg-yellow-500 hover:bg-yellow-400 rounded-2xl font-black uppercase tracking-wider text-black shadow-lg active:scale-95 transition-transform"
                    >
                        CONTINUE TO CREDITS ➔
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center p-8 h-full bg-[#0a0a0a] text-center space-y-6">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border-2 border-red-500/20 mb-4">
                    <Trophy size={48} className="text-red-500" />
                </div>
                <h2 className="text-3xl font-black uppercase text-red-500">Round Ended</h2>
                <p className="text-white text-xl font-bold">{state.winnerScreen}</p>
                <button
                    onClick={handleFinishShow}
                    className="w-full max-w-xs py-4 bg-white text-black rounded-2xl font-black uppercase tracking-wider shadow-lg active:scale-95 transition-transform"
                >
                    EXIT GAME ➔
                </button>
            </div>
        );
    }

    // 2. CATEGORIES BOARD VIEW
    if (!state.activeCategoryId) {
        return (
            <div className="flex flex-col h-full bg-[#0a0a0a] p-4 text-white">
                <div className="mb-4 bg-slate-800/40 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black uppercase text-yellow-500 tracking-wider">Face Off</span>
                    <h3 className="text-lg font-bold">Select Active Topic</h3>
                </div>
                <div className="flex-1 overflow-auto">
                    <div className="grid grid-cols-2 gap-4">
                        {game.categories.map((cat) => {
                            const isUsed = (state.usedCategories || []).includes(cat.id);
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => !isUsed && handleSelectCategory(cat.id)}
                                    disabled={isUsed}
                                    className={`p-6 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all ${
                                        isUsed
                                            ? 'bg-slate-900/40 border-slate-800 text-slate-600'
                                            : 'bg-slate-800/60 border-slate-700 hover:border-yellow-500 text-white active:scale-95'
                                    }`}
                                >
                                    <span className="text-lg font-black uppercase tracking-tight">{cat.name}</span>
                                    <span className="text-yellow-500 text-xs font-bold">${cat.pointValue || 100} / Correct</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // 3. ACTIVE ROUND CONTROLLER VIEW
    const activeCategory = game.categories.find(c => 
        c.id === state.activeCategoryId || 
        c.name?.toLowerCase() === state.activeCategoryId?.toLowerCase()
    ) || game.categories[0];
    const answersList = activeCategory?.validAnswers || [];

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-4 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5 mb-4 flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-black uppercase text-yellow-500 tracking-wider">ACTIVE TOPIC</span>
                    <h3 className="text-lg font-bold uppercase tracking-tight">{activeCategory?.name}</h3>
                </div>
                <div className="flex gap-2">
                    <div 
                        className="px-3 py-1 rounded text-xs font-bold border"
                        style={{
                            backgroundColor: `${activeTeams[0]?.color || '#22c55e'}20`,
                            color: activeTeams[0]?.color || '#22c55e',
                            borderColor: `${activeTeams[0]?.color || '#22c55e'}30`,
                        }}
                    >
                        {teamLabel(0)}: {state.victories[0]} W
                    </div>
                    <div 
                        className="px-3 py-1 rounded text-xs font-bold border"
                        style={{
                            backgroundColor: `${activeTeams[1]?.color || '#3b82f6'}20`,
                            color: activeTeams[1]?.color || '#3b82f6',
                            borderColor: `${activeTeams[1]?.color || '#3b82f6'}30`,
                        }}
                    >
                        {teamLabel(1)}: {state.victories[1]} W
                    </div>
                </div>
            </div>

            {/* Timer & Turn Panel */}
            <div className="grid grid-cols-3 gap-4 mb-4 items-center bg-slate-900/60 border border-white/5 p-4 rounded-2xl">
                {/* Team Turn A */}
                <button
                    onClick={() => syncState({ activeTeam: 0, shotClock: game.turnTimer ?? 10 })}
                    className={`py-4 rounded-xl border font-black text-xs uppercase tracking-wider transition-all ${
                        state.activeTeam === 0
                            ? 'text-white'
                            : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}
                    style={state.activeTeam === 0 ? {
                        backgroundColor: activeTeams[0]?.color || '#22c55e',
                        borderColor: activeTeams[0]?.color || '#22c55e',
                        boxShadow: `0 0 15px ${(activeTeams[0]?.color || '#22c55e')}60`,
                    } : {}}
                >
                    {teamLabel(0)} TURN
                </button>

                {/* Central Timer Controls */}
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-mono font-black tracking-tight">{state.shotClock}s</span>
                    <div className="flex gap-2 mt-1.5">
                        <button
                            onClick={() => syncState({ isRunning: !state.isRunning })}
                            className={`p-2 rounded-full border transition-all ${
                                state.isRunning
                                    ? 'bg-slate-700 border-slate-600 text-white'
                                    : 'bg-emerald-600 border-emerald-500 text-black font-bold'
                            }`}
                        >
                            {state.isRunning ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button
                            onClick={() => syncState({ shotClock: game.turnTimer ?? 10 })}
                            className="p-2 rounded-full border bg-slate-800 border-slate-700 text-white"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>

                {/* Team Turn B */}
                <button
                    onClick={() => syncState({ activeTeam: 1, shotClock: game.turnTimer ?? 10 })}
                    className={`py-4 rounded-xl border font-black text-xs uppercase tracking-wider transition-all ${
                        state.activeTeam === 1
                            ? 'text-white'
                            : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}
                    style={state.activeTeam === 1 ? {
                        backgroundColor: activeTeams[1]?.color || '#3b82f6',
                        borderColor: activeTeams[1]?.color || '#3b82f6',
                        boxShadow: `0 0 15px ${(activeTeams[1]?.color || '#3b82f6')}60`,
                    } : {}}
                >
                    {teamLabel(1)} TURN
                </button>
            </div>

            {/* Answer Control Dashboard */}
            <div className="flex-1 flex gap-4 overflow-hidden mb-4 min-h-0">
                {/* Valid Answers Picker */}
                <div className="flex-1 flex flex-col bg-slate-900/40 border border-white/5 rounded-2xl p-3 overflow-hidden">
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Type manual guess..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 text-sm focus:outline-none focus:border-yellow-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => handleCorrectAnswer(searchQuery)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs"
                            >
                                + Add
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-auto grid grid-cols-2 gap-2 pr-1">
                        {[...answersList]
                            .sort((a, b) => a.localeCompare(b))
                            .filter((ans: string) => ans.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((ans: string, i: number) => {
                                const isGuessed = (state.guessedAnswers || []).includes(ans);
                                const guessingTeamIdx = state.guessedBy?.[ans];
                                const defaultColor = guessingTeamIdx === 0 ? '#22c55e' : guessingTeamIdx === 1 ? '#3b82f6' : '#10b981';
                                const teamColor = guessingTeamIdx !== undefined && activeTeams[guessingTeamIdx]?.color 
                                    ? activeTeams[guessingTeamIdx].color 
                                    : defaultColor;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => !isGuessed && handleCorrectAnswer(ans)}
                                        disabled={isGuessed}
                                        style={isGuessed ? {
                                            backgroundColor: `${teamColor}15`,
                                            borderColor: `${teamColor}30`,
                                            color: teamColor,
                                            opacity: 0.7,
                                        } : {}}
                                        className={`p-3 rounded-xl text-left text-xs font-black transition-all border ${
                                            isGuessed
                                                ? 'cursor-not-allowed'
                                                : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 active:scale-95'
                                        }`}
                                    >
                                        {ans}
                                    </button>
                                );
                            })}
                    </div>
                </div>

                {/* Guessed Answers Tracker */}
                <div className="w-1/3 bg-slate-900/60 border border-white/5 rounded-2xl p-3 flex flex-col overflow-hidden">
                    <h4 className="text-xs font-black uppercase text-slate-400 mb-2">Guessed ({state.guessedAnswers?.length || 0})</h4>
                    <div className="flex-1 overflow-auto space-y-1.5 pr-1">
                        {(state.guessedAnswers || []).map((ans: string, i: number) => {
                            const guessingTeamIdx = state.guessedBy?.[ans];
                            const defaultColor = guessingTeamIdx === 0 ? '#22c55e' : guessingTeamIdx === 1 ? '#3b82f6' : '#10b981';
                            const teamColor = guessingTeamIdx !== undefined && activeTeams[guessingTeamIdx]?.color 
                                ? activeTeams[guessingTeamIdx].color 
                                : defaultColor;
                            
                            return (
                                <div 
                                    key={i} 
                                    className="px-3 py-1.5 rounded-lg text-xs font-black flex items-center justify-between border"
                                    style={{
                                        backgroundColor: `${teamColor}15`,
                                        borderColor: `${teamColor}30`,
                                        color: teamColor,
                                    }}
                                >
                                    <span className="truncate">{ans}</span>
                                    <Check size={12} style={{ color: teamColor }} />
                                </div>
                            );
                        })}
                        {(!state.guessedAnswers || state.guessedAnswers.length === 0) && (
                            <div className="text-slate-600 italic text-xs p-4 text-center">No correct guesses yet.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="bg-slate-900/60 border border-white/5 p-3 rounded-2xl flex gap-3">
                {!state.roundEnded ? (
                    <button
                        onClick={() => handleTeamFail(state.activeTeam, 'wrong')}
                        className="w-full py-5 rounded-xl bg-red-650 hover:bg-red-550 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md border border-red-500/20"
                    >
                        <X size={18} strokeWidth={3} /> {lang === 'es' ? `NO EN LA LISTA - ELIMINAR JUGADOR (${teamLabel(state.activeTeam)})` : `NOT IN THE LIST - ELIMINATE PLAYER (${teamLabel(state.activeTeam)})`}
                    </button>
                ) : (
                    <div className="flex flex-col gap-2 w-full">
                        <button
                            onClick={checkWinnerAndContinue}
                            className="w-full bg-yellow-500 text-black py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(250,204,21,0.3)] active:scale-95 transition-all"
                        >
                            {state.isDraw ? "CONTINUE (DRAW / TIE)" : "CONTINUE ROUND"} <ArrowRight size={14} strokeWidth={3} />
                        </button>
                        <button
                            onClick={handleEarlyEndGame}
                            className="w-full bg-red-950/60 border border-red-500/40 text-red-500 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-red-950 active:scale-95 transition-all"
                        >
                            <X size={12} /> END GAME EARLY
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartAzzController;
