import React from 'react';
import { useSync } from '@/context/SyncContext';
import { GameType, Game } from '@/types';
import JeopardyController from './controllers/JeopardyController';
import RoscoController from './controllers/RoscoController';
import FeudController from './controllers/FeudController';
import WheelOfFortuneController from './controllers/WheelOfFortuneController';
import HangmanController from './controllers/HangmanController';
import PyramidController from './controllers/PyramidController';
import ChainController from './controllers/ChainController';
import MemoryController from './controllers/MemoryController';
import DefinitionsController from './controllers/DefinitionsController';
import PriceIsRightController from './controllers/PriceIsRightController';
import LotteryController from './controllers/LotteryController';
import BingoController from './controllers/BingoController';
import GenericController from './controllers/GenericController';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Clapperboard } from 'lucide-react';

interface HostAdaptiveFactoryProps {
    currentGame: Game | null;
}

const HostAdaptiveFactory: React.FC<HostAdaptiveFactoryProps> = ({ currentGame }) => {
    const { sessionData, updateSession } = useSync();

    const renderController = () => {
        if (!currentGame) return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 animate-pulse">
                <div className="w-16 h-1 bg-slate-800 rounded-full mb-4" />
                <p className="font-black uppercase tracking-widest text-[10px]">Waiting for Session State...</p>
            </div>
        );

        const props = {
            game: currentGame as any,
            sessionData,
            updateSession
        };

        switch (currentGame.type) {
            case GameType.JEOPARDY:
                return <JeopardyController {...props} />;
            case GameType.ROSCO:
                return <RoscoController {...props} />;
            case GameType.FAMILY_FEUD:
                return <FeudController {...props} />;
            case GameType.WHEEL_OF_FORTUNE:
                return <WheelOfFortuneController {...props} />;
            case GameType.HANGMAN:
                return <HangmanController {...props} />;
            case GameType.PYRAMID:
                return <PyramidController {...props} />;
            case GameType.CHAIN_REACTION:
                return <ChainController {...props} />;
            case GameType.MEMORY:
                return <MemoryController {...props} />;
            case GameType.DEFINITIONS:
                return <DefinitionsController {...props} />;
            case GameType.PRICE_IS_RIGHT:
                return <PriceIsRightController {...props} />;
            case GameType.LOTTERY:
                return <LotteryController {...props} />;
            case GameType.BINGO:
                return <BingoController {...props} />;
            default:
                return <GenericController {...props} />;
        }
    };

    return (
        <div className="flex-1 min-h-0 bg-[#0a0a0a] relative">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentGame?.id || 'empty'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                >
                    {renderController()}
                </motion.div>
            </AnimatePresence>

            {/* 🎬 MISSION 05: Transition Feedback Overlay */}
            <AnimatePresence>
                {sessionData?.transitionState?.isActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
                    >
                        <motion.div
                            animate={{ rotate: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="bg-emerald-500 text-black p-4 rounded-full mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                        >
                            <Clapperboard size={48} />
                        </motion.div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Cargando en el Escenario...</h2>
                        <p className="text-slate-400 font-bold mb-8">El PC está mostrando: "{sessionData.transitionState.label}"</p>

                        <div className="flex items-center gap-3 text-emerald-500 font-black text-xs uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                            <Loader2 size={16} className="animate-spin" />
                            Preparando el siguiente acto
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HostAdaptiveFactory;
