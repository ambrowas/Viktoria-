import React, { useState } from "react";
import { Game, Team, Player } from "@/types";
import GameRouter from "@/screens/GameRouter";
import { Minus, Plus, X, Users, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QuickPlayWrapperProps {
    game: Game;
    numTeams: number;
    onExit: () => void;
}

const TEAM_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#14b8a6"];
const TEAM_EMOJIS = ["🔥", "⚡️", "🌟", "🧠", "🚀", "🎯", "🎵", "🎮", "🦊", "🐼"];

export default function QuickPlayWrapper({ game, numTeams, onExit }: QuickPlayWrapperProps) {
    const [teams, setTeams] = useState<Team[]>(() =>
        Array.from({ length: numTeams }, (_, i) => ({
            id: crypto.randomUUID(),
            name: `Equipo ${i + 1}`,
            score: 0,
            color: TEAM_COLORS[i % TEAM_COLORS.length],
            emoji: TEAM_EMOJIS[i % TEAM_EMOJIS.length],
            players: []
        }))
    );

    const [showScoreboard, setShowScoreboard] = useState(true);

    const updateScore = (teamId: string, delta: number) => {
        setTeams(prev => prev.map(t =>
            t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t
        ));
    };

    const updateTeamName = (teamId: string, name: string) => {
        setTeams(prev => prev.map(t =>
            t.id === teamId ? { ...t, name } : t
        ));
    };

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black">
            {/* 🎮 The Game Itself */}
            <div className="h-full w-full">
                <GameRouter game={game} onExit={onExit} />
            </div>

            {/* 🏆 Quick Scoreboard Container */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center pointer-events-none">
                <button
                    onClick={() => setShowScoreboard(!showScoreboard)}
                    className="pointer-events-auto bg-gray-900/80 backdrop-blur-md border border-white/10 px-4 py-1 rounded-full text-xs font-bold text-gray-400 hover:text-white transition-all shadow-xl mb-2"
                >
                    {showScoreboard ? "Ocultar Marcador" : "Mostrar Marcador"}
                </button>

                <AnimatePresence>
                    {showScoreboard && (
                        <motion.div
                            initial={{ y: -100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -100, opacity: 0 }}
                            className="pointer-events-auto flex gap-4 p-4 bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                        >
                            {teams.map((team, idx) => (
                                <div
                                    key={team.id}
                                    className="relative flex flex-col items-center min-w-[140px] p-3 rounded-xl bg-black/40 border border-white/5"
                                    style={{ borderTop: `4px solid ${team.color}` }}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{team.emoji}</span>
                                        <input
                                            type="text"
                                            value={team.name}
                                            onChange={(e) => updateTeamName(team.id, e.target.value)}
                                            className="bg-transparent border-none text-center font-bold text-sm w-24 focus:ring-0 p-0 text-white/90"
                                        />
                                    </div>

                                    <div className="text-4xl font-black text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                        {team.score}
                                    </div>

                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => updateScore(team.id, -10)}
                                            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <button
                                            onClick={() => updateScore(team.id, 10)}
                                            className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/40 text-green-400 transition-colors"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>

                                    {/* Indicator for whose turn it might be (visual only for now) */}
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-white/20" />
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 🚪 Emergency Exit if GameRouter onExit fails or we want a forced one */}
            <button
                onClick={onExit}
                className="fixed top-4 right-4 z-[70] p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-full transition-all group"
                title="Forzar Salida"
            >
                <X size={24} className="group-hover:rotate-90 transition-transform" />
            </button>
        </div>
    );
}
