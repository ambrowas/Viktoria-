import React from 'react';
import { useSync } from '@/context/SyncContext';
import { Trophy, ArrowRight, Save, LogOut } from 'lucide-react';

interface GenericControllerProps {
    game: any;
    sessionData: any;
    updateSession: (data: any) => void;
}

const GenericController: React.FC<GenericControllerProps> = ({ game, sessionData, updateSession }) => {
    return (
        <div className="flex flex-col gap-6 p-4 h-full">
            <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div>
                    <h3 className="text-xl font-bold text-yellow-500">{game.name || 'Game Control'}</h3>
                    <p className="text-sm text-slate-400">Basic scoreboard and flow control</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                <div className="w-32 h-32 bg-yellow-500/10 rounded-full flex items-center justify-center border-4 border-yellow-500/30 animate-pulse">
                    <Trophy size={64} className="text-yellow-500" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-black">{game.name} is Active</h2>
                    <p className="text-slate-400 max-w-xs mx-auto">This game doesn't have a specialized controller yet. Use the scoring panel below to manage team points.</p>
                </div>

                <div className="grid grid-cols-1 w-full gap-4 max-w-sm">
                    <button
                        onClick={() => updateSession({ hostCommand: { type: 'next_step' } })}
                        className="bg-white text-black py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                    >
                        NEXT STEP <ArrowRight strokeWidth={3} />
                    </button>

                    <button
                        onClick={() => updateSession({ hostCommand: { type: 'finish_game' } })}
                        className="bg-slate-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 border border-slate-700"
                    >
                        <Save size={20} /> FINISH & SAVE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GenericController;
