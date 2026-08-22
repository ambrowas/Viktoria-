import React from 'react';
import { useSync } from '@/context/SyncContext';
import { DefinitionsGame } from '@/types';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, XCircle, ChevronRight, Timer, HelpCircle, Play, Pause } from 'lucide-react';

interface DefinitionsControllerProps {
    game: DefinitionsGame;
    sessionData: any;
    updateSession: (data: any) => void;
    onExit?: () => void;
    teams?: any[];
}

const DefinitionsController: React.FC<DefinitionsControllerProps> = ({ game, sessionData: remoteSessionData, updateSession, onExit, teams }) => {
    const { isRemoteMode } = useSync();
    const [localSession, setLocalSession] = React.useState<any>({
        currentDefinitionIndex: 0,
        isPaused: false,
        gameVolume: 0.5,
        selectedCameraId: '',
        availableCameras: []
    });

    React.useEffect(() => {
        if (isRemoteMode && remoteSessionData) {
            setLocalSession(remoteSessionData);
        }
    }, [remoteSessionData, isRemoteMode]);

    const sessionData = isRemoteMode ? remoteSessionData : localSession;
    const clues = sessionData?.shuffledClues || game.clues || [];
    const currentClueIndex = sessionData.currentDefinitionIndex || 0;
    const currentClue = clues[currentClueIndex];
    const gameOver = !!sessionData.gameOver;
    const hasWon = !!sessionData.hasWon;
    const score = sessionData.score || 0;
    const correctCount = sessionData.correctCount || 0;

    React.useEffect(() => {
        if (sessionData && !sessionData.shuffledClues && game.clues?.length) {
            const shuffled = [...game.clues].sort(() => Math.random() - 0.5);
            updateState({ shuffledClues: shuffled });
        }
    }, [game.clues, sessionData]);

    const bcRef = React.useRef<BroadcastChannel | null>(null);
    React.useEffect(() => {
        const bc = new BroadcastChannel('viktoria-definitions-sync');
        bcRef.current = bc;
        bc.onmessage = (event) => {
            if (event.data?.type === 'CAMERAS_UPDATE') {
                setLocalSession((prev: any) => ({
                    ...prev,
                    availableCameras: event.data.availableCameras
                }));
            } else if (event.data?.type === 'TIMER_UPDATE') {
                setLocalSession((prev: any) => ({
                    ...prev,
                    timeLeft: event.data.timeLeft,
                    gameOver: event.data.gameOver,
                    hasWon: event.data.hasWon,
                    score: event.data.score,
                    correctCount: event.data.correctCount
                }));
            }
        };
        return () => {
            bc.close();
            bcRef.current = null;
        };
    }, []);

    const broadcastState = (stateChanges: any) => {
        if (bcRef.current) {
            bcRef.current.postMessage({ type: 'STATE_UPDATE', ...stateChanges });
        }
    };

    const updateState = (data: any) => {
        if (isRemoteMode) {
            updateSession(data);
        } else {
            setLocalSession((prev: any) => {
                const next = { ...prev, ...data };
                broadcastState(next);
                return next;
            });
        }
    };

    const handleRestart = () => {
        if (!game.clues?.length) return;
        const shuffled = [...game.clues].sort(() => Math.random() - 0.5);
        updateState({
            shuffledClues: shuffled,
            currentDefinitionIndex: 0,
            isPaused: false,
            resetTrigger: Date.now(),
            gameOver: false,
            hasWon: false,
            timeLeft: GAME_TIME,
            score: 0,
            correctCount: 0,
            hostCommand: {
                type: 'reset_game',
                timestamp: Date.now()
            }
        });
    };

    const handleAction = (correct: boolean) => {
        if (!currentClue) return;
        const nextIdx = currentClueIndex + 1;
        updateState({
            currentDefinitionIndex: nextIdx,
            hostCommand: {
                type: correct ? 'definition_correct' : 'definition_wrong',
                payload: { index: currentClueIndex },
                timestamp: Date.now()
            }
        });
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0a] text-white p-4 gap-3">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#14213d]/20 p-4 rounded-3xl border border-white/5 premium-glass shrink-0">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fca311]">Diccionario de Viktoria</span>
                    <h3 className="text-sm font-bold text-slate-100">Panel de Verificación</h3>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center">
                        PALABRA {currentClueIndex + 1} / {clues.length}
                    </div>
                    {onExit && (
                        <button
                            onClick={onExit}
                            className="px-4 py-1 rounded-full bg-red-600 hover:bg-red-700 text-[10px] font-black uppercase tracking-widest border border-red-500 transition-all active:scale-95 flex items-center justify-center font-bold"
                        >
                            Salir
                        </button>
                    )}
                </div>
            </div>

            {/* Split Screen Grid Layout */}
            <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
                {/* Left Column: Active controls and Clue Panel */}
                <div className="col-span-7 flex flex-col gap-3 overflow-hidden h-full">
                    {/* Contestant Config & System Controls Card */}
                    <div className="bg-[#14213d]/10 border border-white/5 p-4 rounded-3xl space-y-3 shrink-0">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Contestant Name */}
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Nombre Jugador</label>
                                <input
                                    type="text"
                                    value={sessionData?.playerName !== undefined ? sessionData.playerName : (game.playerName || '')}
                                    onChange={(e) => updateState({ playerName: e.target.value })}
                                    placeholder="Nombre del Concursante"
                                    className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-[#fca311] w-full"
                                />
                            </div>
                            {/* Contestant Team */}
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Equipo Representado</label>
                                <select
                                    value={sessionData?.playerTeamId || ''}
                                    onChange={(e) => {
                                        const selectedId = e.target.value;
                                        const selectedTeam = teams?.find(t => t.id === selectedId);
                                        updateState({
                                            playerTeamId: selectedId,
                                            playerTeamName: selectedTeam ? selectedTeam.name : ''
                                        });
                                    }}
                                    className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-[#fca311] w-full"
                                >
                                    <option value="">Ninguno</option>
                                    {teams?.map((team: any) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Controls Grid */}
                        <div className="grid grid-cols-3 gap-3 pt-1 border-t border-white/5">
                            {/* Pause Button */}
                            <button
                                onClick={() => updateState({ isPaused: !sessionData?.isPaused })}
                                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border ${
                                    sessionData?.isPaused
                                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                                        : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                                }`}
                            >
                                {sessionData?.isPaused ? (
                                    <>
                                        <Play size={12} fill="currentColor" /> Reanudar
                                    </>
                                ) : (
                                    <>
                                        <Pause size={12} fill="currentColor" /> Pausar
                                    </>
                                )}
                            </button>

                            {/* Volume Control */}
                            <div className="flex flex-col justify-center px-1">
                                <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-500 tracking-wider mb-0.5">
                                    <span>Volumen</span>
                                    <span>{Math.round((sessionData?.gameVolume !== undefined ? sessionData.gameVolume : 0.5) * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={sessionData?.gameVolume !== undefined ? sessionData.gameVolume : 0.5}
                                    onChange={(e) => updateState({ gameVolume: parseFloat(e.target.value) })}
                                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#fca311]"
                                />
                            </div>

                            {/* Camera Selection */}
                            <div className="flex flex-col justify-center">
                                <select
                                     value={sessionData?.selectedCameraId || ''}
                                     onChange={(e) => updateState({ selectedCameraId: e.target.value })}
                                     className="bg-black/80 border border-white/10 rounded-xl px-2 py-1 text-[9px] text-white font-bold outline-none focus:border-[#fca311] w-full"
                                >
                                    <option value="">Cámara TV: Defecto</option>
                                    {sessionData?.availableCameras?.map((cam: any) => (
                                        <option key={cam.id} value={cam.id}>
                                            {cam.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Clue and Verification actions */}
                    <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
                        {gameOver && !hasWon ? (
                            /* Time's Up Screen on Presenter Dashboard */
                            <div className="flex-1 bg-red-950/20 border border-red-500/20 p-6 rounded-3xl text-center flex flex-col justify-center items-center space-y-4 premium-glass relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                                <Timer size={40} className="text-red-500 animate-pulse" />
                                <h3 className="text-xl font-black uppercase tracking-widest text-red-500">¡TIEMPO AGOTADO!</h3>
                                <p className="text-slate-300 text-xs">
                                    El concursante ha conseguido <span className="text-yellow-400 font-black">{score} puntos</span> (🎯 {correctCount} aciertos).
                                </p>
                                
                                <div className="w-full h-[1px] bg-white/10 my-1" />
                                
                                {/* Edit Player/Team for the new round */}
                                <div className="w-full text-left space-y-2 bg-black/40 p-4 rounded-2xl border border-white/5">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Siguiente Concursante</span>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[8px] font-black uppercase text-slate-500 tracking-wider mb-1">Nombre</label>
                                            <input
                                                type="text"
                                                value={sessionData?.playerName !== undefined ? sessionData.playerName : (game.playerName || '')}
                                                onChange={(e) => updateState({ playerName: e.target.value })}
                                                placeholder="Ej: Ana Gómez"
                                                className="bg-black/60 border border-white/10 rounded-xl px-3 py-1 text-xs text-white font-bold outline-none focus:border-[#fca311] w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black uppercase text-slate-500 tracking-wider mb-1">Equipo</label>
                                            <select
                                                value={sessionData?.playerTeamId || ''}
                                                onChange={(e) => {
                                                    const selectedId = e.target.value;
                                                    const selectedTeam = teams?.find(t => t.id === selectedId);
                                                    updateState({
                                                        playerTeamId: selectedId,
                                                        playerTeamName: selectedTeam ? selectedTeam.name : ''
                                                    });
                                                }}
                                                className="bg-black/60 border border-white/10 rounded-xl px-3 py-1 text-xs text-white font-bold outline-none focus:border-[#fca311] w-full"
                                            >
                                                <option value="">Ninguno</option>
                                                {teams?.map((team: any) => (
                                                    <option key={team.id} value={team.id}>
                                                        {team.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 w-full pt-1">
                                    <button
                                        onClick={handleRestart}
                                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg"
                                    >
                                        Guardar y Reiniciar
                                    </button>
                                </div>
                            </div>
                        ) : currentClue ? (
                            <>
                                {/* Active Clue Panel */}
                                <motion.div
                                    key={currentClueIndex}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex-1 premium-glass border border-white/5 p-6 rounded-3xl text-center flex flex-col justify-center space-y-4 relative overflow-hidden shadow-2xl min-h-0"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fca311]/50 to-transparent" />

                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.4em] block">La Palabra es:</span>
                                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                                            {currentClue.word}
                                        </h2>
                                    </div>

                                    <div className="h-[1px] w-8 bg-[#fca311]/20 mx-auto" />

                                    <div className="space-y-2 overflow-y-auto max-h-[50%] px-2">
                                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.4em] block">Definición del Presentador</span>
                                        <p className="text-base font-semibold text-slate-300 leading-relaxed italic">
                                            "{currentClue.definition}"
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Verification Actions Row */}
                                <div className="grid grid-cols-2 gap-3 shrink-0">
                                    <button
                                        onClick={() => handleAction(false)}
                                        className="bg-red-500/10 text-red-500 border border-red-500/20 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-500/20 active:scale-95 transition-all shadow-xl text-xs tracking-wider"
                                    >
                                        <XCircle size={18} strokeWidth={2.5} />
                                        <span>RESPUESTA INVÁLIDA</span>
                                    </button>
                                    <button
                                        onClick={() => handleAction(true)}
                                        className="bg-emerald-500 text-black py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] text-xs tracking-wider"
                                    >
                                        <CheckCircle size={18} strokeWidth={3} />
                                        <span>PALABRA CORRECTA</span>
                                    </button>
                                </div>

                                {/* Quick Skip Button */}
                                <button
                                    onClick={() => updateState({ currentDefinitionIndex: currentClueIndex + 1 })}
                                    className="w-full premium-glass border border-white/5 py-3 rounded-2xl text-slate-500 font-black text-[9px] tracking-[0.3em] uppercase flex items-center justify-center gap-2 hover:text-white transition-all shrink-0"
                                >
                                    PASA DE PALABRA <ChevronRight size={14} />
                                </button>
                            </>
                        ) : (
                            <div className="flex-1 bg-[#14213d]/20 border border-white/5 p-6 rounded-3xl text-center flex flex-col justify-center items-center space-y-3 premium-glass">
                                <BookOpen size={36} className="opacity-20 text-slate-400 animate-pulse" />
                                <h3 className="text-lg font-black uppercase tracking-widest text-[#fca311]">Diccionario Completado</h3>
                                <p className="text-slate-400 text-xs">¡Has revisado todas las definiciones de esta partida!</p>
                                <button
                                    onClick={handleRestart}
                                    className="px-5 py-2 bg-[#fca311] text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-yellow-400 transition-all active:scale-95 shadow-lg"
                                >
                                    Reiniciar Diccionario
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Full Dictionary Reference List */}
                <div className="col-span-5 bg-[#14213d]/10 border border-white/5 rounded-3xl p-4 flex flex-col overflow-hidden h-full">
                    <span className="text-[10px] text-[#fca311] font-black uppercase tracking-[0.2em] block mb-3 shrink-0">Diccionario del Concurso (Referencia)</span>
                    
                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
                        {clues.map((clue, idx) => (
                            <div 
                                key={clue.id} 
                                className={`flex flex-col text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                                    idx === currentClueIndex 
                                        ? 'bg-[#fca311]/15 border-[#fca311]/50 text-white font-semibold shadow-[0_0_15px_rgba(252,163,17,0.1)]' 
                                        : idx < currentClueIndex 
                                            ? 'bg-[#10b981]/5 border-[#10b981]/25 text-[#10b981]/80' 
                                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                                onClick={() => updateState({ currentDefinitionIndex: idx })}
                            >
                                <div className="flex justify-between items-center text-xs mb-1">
                                    <span className="font-black uppercase tracking-wider">
                                        {idx + 1}. {clue.word}
                                    </span>
                                    <span className="text-[8px] uppercase tracking-widest font-black opacity-80">
                                        {idx === currentClueIndex ? '🎯 ACTIVA' : idx < currentClueIndex ? '✅ ACERTADA' : '⏳ PENDIENTE'}
                                    </span>
                                </div>
                                <p className="text-[11px] leading-relaxed italic opacity-90">
                                    "{clue.definition}"
                                </p>
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DefinitionsController;
