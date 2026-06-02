import React, { useState, useEffect, useMemo } from 'react';
import { useSync } from '@/context/SyncContext';
import { Game } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertCircle, BookOpen, Layers, Award, Crown, X
} from 'lucide-react';
import { resolveMediaUrl } from '@/utils/media';
import GameRouter from '@/screens/GameRouter';
import { getGames } from '@/services/localGameService';
import { getShows } from '@/services/localShowService';
const DEFAULT_SHOW_TEAMS = [
    { id: "5b78e550-2b96-4743-b401-7035051cdc0f", name: "Shongai", score: 0, color: "#ef4444", emoji: "Mask1", players: [] },
    { id: "d5eb1687-6a66-4221-8a61-982674921d9e", name: "Johns Hopkins", score: 0, color: "#3b82f6", emoji: "Mask2", players: [] },
    { id: "3c7389d3-7438-4087-919e-b34904e4fdfc", name: "Wakanda 4Ever", score: 0, color: "#22c55e", emoji: "Mask3", players: [] },
    { id: "730965ee-bc69-43f0-8f7b-9e2a61117572", name: "Howard U", score: 0, color: "#a855f7", emoji: "Mask4", players: [] }
];
import { fallbackGames } from '@/data/fallbackGames';

interface AfricaDayLandingPageProps {
    activeTab?: 'dashboard' | 'briefing' | 'round-1' | 'round-2' | 'round-3' | 'credits';
    setActiveTab?: (tab: any) => void;
    isUnlocked?: boolean;
    setIsUnlocked?: (val: boolean) => void;
    unlockedElderName?: string;
    setUnlockedElderName?: (name: string) => void;
}

const AfricaDayLandingPage: React.FC<AfricaDayLandingPageProps> = ({
    activeTab = 'dashboard',
    setActiveTab,
    isUnlocked = false,
    setIsUnlocked,
    unlockedElderName = '',
    setUnlockedElderName
}) => {
    const {
        sessionId,
        sessionData,
        joinSession,
        leaveSession
    } = useSync();

    const [savedShowTeams, setSavedShowTeams] = useState<any[]>([]);
    const [currentShow, setCurrentShow] = useState<any>(null);

    useEffect(() => {
        getShows().then(shows => {
            if (shows && shows.length > 0) {
                const show = shows.find(s => s.name?.toLowerCase().includes('africa')) || shows[0];
                if (show) {
                    setCurrentShow(show);
                    if (show.teams && show.teams.length > 0) {
                        setSavedShowTeams(show.teams);
                    }
                }
            }
        }).catch(err => {
            console.error("Failed to load saved shows:", err);
        });
    }, []);

    const activeTeams = useMemo(() => {
        if (savedShowTeams && savedShowTeams.length > 0) {
            return savedShowTeams;
        }
        if (sessionData?.fullShowData?.teams && sessionData.fullShowData.teams.length > 0) {
            return sessionData.fullShowData.teams;
        }
        if (sessionData?.teams && sessionData.teams.length > 0) {
            const firstTeamName = sessionData.teams[0]?.name?.toLowerCase();
            if (firstTeamName !== 'pathfind' && firstTeamName !== 'team 1') {
                return sessionData.teams;
            }
        }
        return DEFAULT_SHOW_TEAMS;
    }, [savedShowTeams, sessionData?.fullShowData?.teams, sessionData?.teams]);

    const activeShow = useMemo(() => {
        const rawShow = sessionData?.fullShowData || currentShow;
        if (!rawShow) {
            return {
                name: "THE AFRICA DAY TRIVIA CHALLENGE",
                settings: {
                    language: "en",
                    organizers: [
                        { role: "Host and Game Director", name: "The Master Host" }
                    ],
                    thankYouMessage: "THANK YOU FOR PLAYING!"
                },
                teams: activeTeams
            };
        }
        return {
            ...rawShow,
            settings: {
                language: rawShow.settings?.language || "en",
                organizers: rawShow.settings?.organizers || [
                    { role: "Host and Game Director", name: "The Master Host" }
                ],
                thankYouMessage: rawShow.settings?.thankYouMessage || "THANK YOU FOR PLAYING!"
            },
            teams: rawShow.teams || activeTeams
        };
    }, [sessionData?.fullShowData, currentShow, activeTeams]);

    const [localTrigger, setLocalTrigger] = useState(0);

    const allObservations = useMemo(() => {
        const local = JSON.parse(localStorage.getItem('viktoria_observations') || '[]');
        const remote = sessionData?.observations || [];
        const merged = [...local, ...remote];
        const unique = merged.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        return unique.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [sessionData?.observations, activeTab, localTrigger]);

    const handleClearLocalObservations = () => {
        localStorage.removeItem('viktoria_observations');
        setLocalTrigger(prev => prev + 1);
    };

    const [sessionPin, setSessionPin] = useState(sessionId || '');
    const [errorMsg, setErrorMsg] = useState('');
    const [localGames, setLocalGames] = useState<Game[]>([]);
    const [activeBriefingModal, setActiveBriefingModal] = useState<'role' | 'round1' | 'round2' | 'round3' | null>(null);

    useEffect(() => {
        getGames().then(games => {
            setLocalGames(games || []);
        }).catch(err => {
            console.error("Failed to load local games:", err);
        });
    }, []);

    const [selectedRole, setSelectedRole] = useState<'judge' | 'host' | null>(null);
    const [selectedJudgeName, setSelectedJudgeName] = useState<string | null>(null);
    const [passcodeInput, setPasscodeInput] = useState('');
    const [passcodeError, setPasscodeError] = useState('');

    const [hostPinInput, setHostPinInput] = useState('');
    const [hostError, setHostError] = useState('');

    const handleHostClick = () => {
        setSelectedRole('host');
        setSelectedJudgeName(null);
        setHostPinInput(sessionId || '');
        setHostError('');
    };

    const handleJudgeClick = (name: string) => {
        setSelectedRole('judge');
        setSelectedJudgeName(name);
        setPasscodeInput('');
        setPasscodeError('');
    };

    const handlePasscodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            verifyPasscode();
        }
    };

    const verifyPasscode = () => {
        if (passcodeInput === '2026') {
            if (setIsUnlocked) setIsUnlocked(true);
            if (setUnlockedElderName) setUnlockedElderName(selectedJudgeName || '');
            localStorage.setItem('viktoria_elder_unlocked', 'true');
            localStorage.setItem('viktoria_elder_name', selectedJudgeName || '');
            
            // Navigate directly to Briefing screen
            if (setActiveTab) setActiveTab('briefing');
        } else {
            setPasscodeError('Código de acceso incorrecto.');
        }
    };

    const handleHostPinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            verifyHostPin();
        }
    };

    const verifyHostPin = () => {
        if (hostPinInput.length === 6) {
            joinSession(hostPinInput.toUpperCase(), 'host');
            setSelectedRole(null);
        } else {
            setHostError('Por favor ingrese un PIN de sesión válido de 6 caracteres.');
        }
    };

    useEffect(() => {
        if (sessionId) {
            setSessionPin(sessionId);
        }
    }, [sessionId]);

    // Automatically join the session when a valid 6-char session PIN is typed/present
    useEffect(() => {
        if (sessionPin.length === 6 && !sessionId) {
            joinSession(sessionPin.toUpperCase(), 'judge');
        }
    }, [sessionPin, sessionId, joinSession]);

    // Helper to resolve specific round game payload
    const getRoundGame = (roundIdx: number) => {
        if (!sessionData) return null;
        const rounds = sessionData.fullShowData?.rounds || [];
        if (rounds.length <= roundIdx) return null;
        
        const round = rounds[roundIdx];
        const gameId = round?.gameIds?.[0];
        if (!gameId) return null;

        const gamesMap = (sessionData as any).fullShowGames || {};
        return gamesMap[gameId] as Game | null;
    };

    const round1Game = useMemo(() => {
        const allGames = [...localGames, ...fallbackGames];
        const jeopardyGames = allGames.filter(g => g.type === 'JEOPARDY');
        const round1Match = jeopardyGames.find(g => 
            g.name?.toLowerCase().includes('round 1') || 
            g.name?.toLowerCase().includes('ronda 1') ||
            g.name?.toLowerCase().includes('round i') ||
            g.name?.toLowerCase().includes('ronda i') ||
            g.name?.toLowerCase().includes('africa')
        );
        return round1Match || fallbackGames[0] || null;
    }, [localGames]);

    const round2Game = useMemo(() => {
        const allGames = [...localGames, ...fallbackGames];
        const jeopardyGames = allGames.filter(g => g.type === 'JEOPARDY');
        const round2Match = jeopardyGames.find(g => 
            g.name?.toLowerCase().includes('round 2') || 
            g.name?.toLowerCase().includes('ronda 2') ||
            g.name?.toLowerCase().includes('round ii') ||
            g.name?.toLowerCase().includes('ronda ii')
        );
        return round2Match || fallbackGames[1] || null;
    }, [localGames]);

    const round3Game = useMemo(() => {
        const allGames = [...localGames, ...fallbackGames];
        const round3Match = allGames.find(g => 
            g.name?.toLowerCase().includes('round 3') || 
            g.name?.toLowerCase().includes('ronda 3') ||
            g.name?.toLowerCase().includes('face off') ||
            g.type === 'SMART_AZZ'
        );
        return round3Match || fallbackGames[2] || null;
    }, [localGames]);

    return (
        <div className="w-full h-full bg-gradient-to-br from-[#141b35] via-[#0a0e1c] to-[#04060b] text-white flex flex-col relative overflow-y-auto min-h-0 select-none">
            {/* Background ambient spots */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(252,163,17,0.08)_0%,transparent_80%)] pointer-events-none" />

            <AnimatePresence mode="wait">
                {/* HOME TAB RENDER */}
                {(activeTab === 'dashboard' || activeTab === 'home') && (
                    <motion.div
                        key="tab-home"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full space-y-8 py-10"
                    >
                        {/* Logo Banner (No Logo Image, Just Text) */}
                        <div className="flex flex-col items-center text-center space-y-1">
                            <h1 className="text-4xl font-black tracking-tight text-[#fca311] font-display uppercase leading-none">
                                THE AFRICA DAY
                            </h1>
                            <p className="text-white font-extrabold tracking-[0.25em] text-xl uppercase">
                                TRIVIA CHALLENGE
                            </p>
                        </div>
                        {/* Judges & Host Roster - Floating Layout */}
                        <div className="w-full space-y-12">
                            {/* Host (Centered) */}
                            <div className="flex flex-col items-center justify-center pb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#fca311] mb-3">Host</span>
                                <button 
                                    onClick={handleHostClick}
                                    className="flex flex-col items-center gap-2.5 group cursor-pointer active:scale-95 transition-transform border border-transparent focus:outline-none"
                                >
                                    {/* Photo Icon Placeholder */}
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#14213d] to-black flex items-center justify-center border border-[#fca311]/35 shadow-inner group-hover:border-[#fca311] transition-all">
                                        <Crown size={40} className="text-[#fca311]" />
                                    </div>
                                    <span className="text-sm font-black uppercase tracking-wider text-white group-hover:text-[#fca311] transition-all">
                                        THE MASTER HOST
                                    </span>
                                </button>
                            </div>

                            {/* Judges (4 columns grid) */}
                            <div className="space-y-6 pt-2">
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#fca311]">Panel of elders</span>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    {[
                                        { name: "MELVIN FOOTE", initials: "MF", color: "from-amber-600 to-amber-800", photo: "Melvin_Foote.jpg" },
                                        { name: "YAO GUEVARA", initials: "YG", color: "from-[#6b211f] to-[#b83227]", photo: "Yao_Guevara.jpg" },
                                        { name: "VIVIENNE SEQUEIRA", initials: "VS", color: "from-[#18392b] to-[#2e644c]", photo: "Vivienne_Sequeira.jpeg" },
                                        { name: "BIBIANA INE-RYAN", initials: "BI", color: "from-amber-700 to-amber-900" }
                                    ].map((judge) => {
                                        const isActiveJudge = isUnlocked && unlockedElderName === judge.name;
                                        return (
                                            <button 
                                                key={judge.name} 
                                                onClick={() => handleJudgeClick(judge.name)}
                                                className="flex flex-col items-center text-center gap-2.5 group cursor-pointer active:scale-95 transition-transform border border-transparent focus:outline-none"
                                            >
                                                {/* Photo Icon Placeholder / Actual Photo */}
                                                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${judge.color} flex items-center justify-center border ${isActiveJudge ? 'border-emerald-500' : 'border-white/10 group-hover:border-[#fca311]'} text-white font-black text-lg shadow-inner overflow-hidden transition-all`}>
                                                    {judge.photo ? (
                                                        <img 
                                                            src={resolveMediaUrl(`images/${judge.photo}`)} 
                                                            alt={judge.name} 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        judge.initials
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${isActiveJudge ? 'text-emerald-400' : 'text-slate-300 group-hover:text-white'} leading-snug transition-all`}>
                                                    {judge.name.split(' ')[0]} <br /> {judge.name.split(' ')[1] || ''}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* DYNAMIC PASSCODE / PIN INPUT FIELD */}
                            {selectedRole === 'judge' && selectedJudgeName && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-full max-w-md mx-auto premium-card border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl animate-fade-in text-left relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#fca311]" />
                                    <div className="flex items-center justify-between pl-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-[#fca311]">
                                            CÓDIGO DE ACCESO ELDER: {selectedJudgeName}
                                        </span>
                                        <button 
                                            onClick={() => setSelectedRole(null)}
                                            className="text-[9px] font-bold text-slate-500 hover:text-white uppercase tracking-widest border border-transparent focus:outline-none"
                                        >
                                            CANCEL
                                        </button>
                                    </div>
                                    <div className="relative pl-2">
                                        <input
                                            type="password"
                                            value={passcodeInput}
                                            onChange={(e) => {
                                                setPasscodeInput(e.target.value);
                                                setPasscodeError('');
                                            }}
                                            onKeyDown={handlePasscodeKeyDown}
                                            placeholder="••••"
                                            className="w-full bg-black/60 border border-[#fca311]/30 rounded-2xl p-4 text-center font-mono tracking-[0.5em] text-2xl font-black focus:border-[#fca311] focus:ring-1 focus:ring-[#fca311] outline-none transition-all placeholder:text-slate-700 text-white"
                                            maxLength={4}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="pl-2 pt-2">
                                        <button
                                            onClick={verifyPasscode}
                                            disabled={passcodeInput.length < 4}
                                            className="w-full bg-[#fca311] hover:bg-[#e8920a] disabled:opacity-30 disabled:grayscale text-black font-black py-4 rounded-2xl transition-all shadow-xl active:scale-[0.98] glow-orange"
                                        >
                                            VERIFICAR ACCESO
                                        </button>
                                    </div>
                                    {passcodeError && (
                                        <p className="text-xs font-bold text-[#e85a4f] text-center">{passcodeError}</p>
                                    )}
                                </motion.div>
                            )}

                            {selectedRole === 'host' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-full max-w-md mx-auto premium-card border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl animate-fade-in text-left relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#fca311]" />
                                    <div className="flex items-center justify-between pl-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-[#fca311]">
                                            ACCESO HOST (PIN DE SESIÓN)
                                        </span>
                                        <button 
                                            onClick={() => setSelectedRole(null)}
                                            className="text-[9px] font-bold text-slate-500 hover:text-white uppercase tracking-widest border border-transparent focus:outline-none"
                                        >
                                            CANCEL
                                        </button>
                                    </div>
                                    <div className="relative pl-2">
                                        <input
                                            type="text"
                                            value={hostPinInput}
                                            onChange={(e) => {
                                                setHostPinInput(e.target.value.toUpperCase());
                                                setHostError('');
                                            }}
                                            onKeyDown={handleHostPinKeyDown}
                                            placeholder="------"
                                            className="w-full bg-black/60 border border-[#fca311]/30 rounded-2xl p-4 text-center font-mono tracking-[0.5em] text-2xl font-black focus:border-[#fca311] focus:ring-1 focus:ring-[#fca311] outline-none transition-all placeholder:text-slate-700 text-white"
                                            maxLength={6}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="pl-2 pt-2">
                                        <button
                                            onClick={verifyHostPin}
                                            disabled={hostPinInput.length < 6}
                                            className="w-full bg-[#fca311] hover:bg-[#e8920a] disabled:opacity-30 disabled:grayscale text-black font-black py-4 rounded-2xl transition-all shadow-xl active:scale-[0.98] glow-orange"
                                        >
                                            CONECTAR
                                        </button>
                                    </div>
                                    {hostError && (
                                        <p className="text-xs font-bold text-[#e85a4f] text-center">{hostError}</p>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* BRIEFING TAB RENDER */}
                {activeTab === 'briefing' && (
                    <motion.div
                        key="tab-briefing"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="flex-1 p-6 max-w-3xl mx-auto w-full py-10 space-y-6"
                    >
                        <div className="border-b border-white/5 pb-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#fca311]">
                                Judge "{unlockedElderName || localStorage.getItem('viktoria_elder_name') || 'Judge'}", Member of the Elders Council
                            </span>
                            <h2 className="text-3xl font-black uppercase text-white tracking-tight">
                                Show Briefing & Guidelines
                            </h2>
                        </div>

                        <div className="premium-card p-8 rounded-3xl space-y-6 text-slate-300 leading-relaxed text-sm shadow-2xl">
                            <div className="space-y-2">
                                <h3 className="text-base font-extrabold text-[#fca311] uppercase">
                                    Welcome {(unlockedElderName || localStorage.getItem('viktoria_elder_name') || 'Judge').split(' ')[0]}.
                                </h3>
                                <p>
                                    This portal provides you with an independent, local view of the active QuizBoards. 
                                    You can browse active questions and correct answers for verification purposes without interfering with the live TV screen.
                                </p>
                            </div>

                            <div className="space-y-2 border-t border-white/5 pt-4">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest">Observe-Only Rules</h3>
                                <ul className="list-disc list-inside pl-2 space-y-2 text-slate-400">
                                    <li>You can select any clue card to open the clue locally and see the answer.</li>
                                    <li>Your interactions **do not** affect the master host console or TV screens.</li>
                                    <li>You can toggle between Points, Questions, and Answers views at the bottom of each round board.</li>
                                    <li>For Round 3 (The Face Off): You can view all eligible answers for the active category and manually cross them out locally to track the progress of the players.</li>
                                </ul>
                            </div>

                            {/* Guidelines & Rounds Info Buttons */}
                            <div className="space-y-3 border-t border-white/5 pt-4">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-1">Detailed Information</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { id: 'role', label: 'YOUR ROLE', color: 'from-[#fca311] to-[#d68502]' },
                                        { id: 'round1', label: 'ROUND 1', color: 'from-amber-600 to-amber-800' },
                                        { id: 'round2', label: 'ROUND 2', color: 'from-red-700 to-red-900' },
                                        { id: 'round3', label: 'ROUND 3', color: 'from-emerald-700 to-emerald-900' },
                                    ].map((btn) => (
                                        <button
                                            key={btn.id}
                                            onClick={() => setActiveBriefingModal(btn.id as any)}
                                            className="relative group overflow-hidden rounded-2xl p-4 bg-black/40 border border-white/5 shadow-md transition-all hover:scale-[1.03] active:scale-[0.97] hover:border-[#fca311]/40 text-center"
                                        >
                                            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${btn.color}`} />
                                            <span className="text-xs font-black tracking-widest text-[#fca311] group-hover:text-white transition-colors uppercase block">
                                                {btn.label}
                                            </span>
                                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">
                                                {btn.id === 'role' ? 'Read Guidelines' : 'View Rules'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ROUND 1 TAB RENDER */}
                {activeTab === 'round-1' && (
                    <motion.div
                        key="tab-round-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col relative"
                    >
                        {round1Game ? (
                            <GameRouter
                                game={round1Game}
                                teams={activeTeams}
                                teamScores={sessionData?.teamScores || {}}
                                onScoreChange={() => {}}
                                onExit={() => setActiveTab?.('dashboard')}
                                isObserveOnly={true}
                                isPreview={true}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                                <AlertCircle size={40} className="text-[#6b211f] mb-3 animate-pulse" />
                                <h3 className="text-lg font-bold text-slate-400">Round 1 Game Not Available</h3>
                                <p className="text-xs text-slate-600 mt-1 max-w-sm">Ensure the session PIN is correct and the Host has started the show runner on the master PC.</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ROUND 2 TAB RENDER */}
                {activeTab === 'round-2' && (
                    <motion.div
                        key="tab-round-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col relative"
                    >
                        {round2Game ? (
                            <GameRouter
                                game={round2Game}
                                teams={activeTeams}
                                teamScores={sessionData?.teamScores || {}}
                                onScoreChange={() => {}}
                                onExit={() => setActiveTab?.('dashboard')}
                                isObserveOnly={true}
                                isPreview={true}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                                <AlertCircle size={40} className="text-[#6b211f] mb-3 animate-pulse" />
                                <h3 className="text-lg font-bold text-slate-400">Round 2 Game Not Available</h3>
                                <p className="text-xs text-slate-600 mt-1 max-w-sm">Ensure the session PIN is correct and the Host has started the show runner on the master PC.</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ROUND 3 TAB RENDER */}
                {activeTab === 'round-3' && (
                    <motion.div
                        key="tab-round-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col relative"
                    >
                        {round3Game ? (
                            <GameRouter
                                game={round3Game}
                                teams={activeTeams}
                                teamScores={sessionData?.teamScores || {}}
                                onScoreChange={() => {}}
                                onExit={() => setActiveTab?.('dashboard')}
                                isObserveOnly={true}
                                isPreview={true}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                                <AlertCircle size={40} className="text-[#6b211f] mb-3 animate-pulse" />
                                <h3 className="text-lg font-bold text-slate-400">Round 3 Game Not Available</h3>
                                <p className="text-xs text-slate-600 mt-1 max-w-sm">Ensure the session PIN is correct and the Host has started the show runner on the master PC.</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* OBSERVATIONS TAB RENDER */}
                {activeTab === 'observations' && (
                    <motion.div
                        key="tab-observations"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="flex-1 p-6 max-w-3xl mx-auto w-full py-10 flex flex-col gap-6"
                    >
                        <div className="border-b border-white/5 pb-4 flex justify-between items-end">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-[#fca311]">
                                    Judge "{unlockedElderName || localStorage.getItem('viktoria_elder_name') || 'Judge'}", Member of the Elders Council
                                </span>
                                <h2 className="text-3xl font-black uppercase text-white tracking-tight">
                                    Submitted Observations
                                </h2>
                            </div>
                            {allObservations.length > 0 && (
                                <button
                                    onClick={handleClearLocalObservations}
                                    className="px-4 py-2 bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 text-red-400 text-xs font-black uppercase rounded-xl transition-all active:scale-95"
                                >
                                    Clear Local Logs
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[70vh]">
                            {allObservations.length === 0 ? (
                                <div className="bg-white/5 border border-white/5 rounded-3xl p-12 text-center text-slate-500">
                                    <BookOpen size={36} className="mx-auto text-slate-700 mb-3 animate-pulse" />
                                    <p className="text-sm font-bold">No observations submitted yet.</p>
                                    <p className="text-xs text-slate-600 mt-1">Observations submitted inside the clue inspection cards will be catalogued and synced here.</p>
                                </div>
                            ) : (
                                allObservations.map((obs: any) => (
                                    <div key={obs.id} className="premium-card p-6 rounded-3xl border border-white/10 shadow-lg relative overflow-hidden flex flex-col gap-3">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#fca311]" />
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-[#fca311]">
                                                    {obs.categoryName}
                                                </span>
                                                <h4 className="text-sm font-extrabold text-white mt-0.5">
                                                    Q: {obs.questionText}
                                                </h4>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="block text-xs font-black text-slate-300">
                                                    {obs.judgeName}
                                                </span>
                                                <span className="block text-[9px] text-slate-500 mt-0.5">
                                                    {new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-black/30 border border-white/5 p-4 rounded-2xl text-slate-300 text-sm italic font-medium">
                                            "{obs.comment}"
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}

                {/* CREDITS TAB RENDER */}
                {activeTab === 'credits' && (
                    <motion.div
                        key="tab-credits"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="flex-1 flex flex-col items-center justify-start p-6 text-center select-none overflow-hidden relative animate-fade-in animate-[fadeIn_0.5s_ease-out]"
                    >
                        <style>{`
                            @keyframes scrollCredits {
                                0% { transform: translateY(60vh); }
                                100% { transform: translateY(-110%); }
                            }
                            .credits-scroll-element {
                                animation: scrollCredits 45s linear forwards;
                            }
                        `}</style>

                        <div className="credits-scroll-element max-w-xl flex flex-col items-center text-center px-6 py-10 gap-12 select-none pointer-events-none text-slate-400">
                            <div>
                                <h1 className="text-4xl font-black tracking-widest text-[#fca311] uppercase mb-3 drop-shadow-[0_0_15px_rgba(252,163,17,0.3)] font-display">
                                    {activeShow.name || "Untitled Show"}
                                </h1>
                                <p className="text-base text-slate-400 font-bold uppercase tracking-widest">
                                    {activeShow.settings.language === "es" ? "La Gran Final" : "The Grand Finale"}
                                </p>
                            </div>

                            <div className="w-12 h-[1px] bg-[#fca311]/30" />

                            {/* Organizers Section */}
                            <div className="flex flex-col gap-4">
                                <h2 className="text-[10px] font-black tracking-[0.4em] text-[#fca311]/50 uppercase">
                                    {activeShow.settings.language === "es" ? "Organizadores" : "Organizers"}
                                </h2>
                                {(activeShow.settings.organizers || []).map((org: any, index: number) => (
                                    <div key={index} className="flex flex-col gap-0.5 mt-2">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{org.role}</span>
                                        {org.name.split(/[,;]/).map((n: string) => n.trim()).filter(Boolean).map((n: string, i: number) => (
                                            <span key={i} className="text-xl font-black text-white uppercase tracking-wider">{n}</span>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            <div className="w-12 h-[1px] bg-[#fca311]/30" />

                            {/* Teams / Contestants Section */}
                            <div className="flex flex-col gap-6">
                                <h2 className="text-[10px] font-black tracking-[0.4em] text-[#fca311]/50 uppercase">
                                    {activeShow.settings.language === "es" ? "Participantes e Integrantes" : "Participants & Contestants"}
                                </h2>
                                {activeShow.teams.map((team: any, idx: number) => (
                                    <div key={team.id || idx} className="flex flex-col gap-2">
                                        <span className="text-base font-black uppercase tracking-widest" style={{ color: team.color || "#e2e8f0" }}>
                                            {team.name}
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            {(team.players || []).map((p: any) => (
                                                <span key={p.id} className="text-xl font-bold text-white uppercase tracking-wider">
                                                    {p.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="w-12 h-[1px] bg-[#fca311]/30" />

                            {/* Outro thank you message */}
                            <div className="pt-10 pb-20">
                                <h2 className="text-3xl font-black tracking-widest text-[#fca311] uppercase drop-shadow-[0_0_15px_rgba(252,163,17,0.3)] animate-pulse font-display">
                                    {activeShow.settings.thankYouMessage ||
                                        (activeShow.settings.language === "es" ? "¡GRACIAS POR JUGAR!" : "THANK YOU FOR PLAYING!")}
                                </h2>
                                <p className="text-slate-500 text-[10px] mt-3 uppercase tracking-[0.3em] font-bold">
                                    © {new Date().getFullYear()} Viktoria Productions. All Rights Reserved.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Informational Modals */}
            <AnimatePresence>
            {activeBriefingModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 15 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 15 }}
                        className="bg-[#0f172a] border border-[#fca311]/35 rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[85vh] flex flex-col gap-6 shadow-[0_0_50px_rgba(252,163,17,0.15)] relative overflow-hidden text-left"
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#fca311] to-[#e8920a]" />
                        <header className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#fca311]">
                                    {activeBriefingModal === 'role' 
                                        ? `Judge "${unlockedElderName || localStorage.getItem('viktoria_elder_name') || 'Judge'}", Member of the Elders Council` 
                                        : 'Game Rules & Mechanics'}
                                </span>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                    {activeBriefingModal === 'role' && 'Your Role'}
                                    {activeBriefingModal === 'round1' && 'Round 1: Africa Day Trivia Challenge I'}
                                    {activeBriefingModal === 'round2' && 'Round 2: Africa Day Trivia Challenge II'}
                                    {activeBriefingModal === 'round3' && 'Round 3: The Face Off'}
                                </h2>
                            </div>
                            <button
                                onClick={() => setActiveBriefingModal(null)}
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-slate-400 border border-white/5 transition-all active:scale-95 flex items-center justify-center"
                            >
                                <X size={18} />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto pr-2 text-slate-300 leading-relaxed text-sm space-y-4">
                            {activeBriefingModal === 'role' && (
                                <>
                                    <p className="font-extrabold text-[#fca311] text-base mb-2">Welcome to the Africa Day Trivia Challenge!</p>
                                    <p>We are honored to have you join us as part of the <strong>"Council of Elders"</strong>. While our central system handles the technical scoring behind the screen, you are the visible, authoritative faces of this competition. Your role is to support the Host, champion the official system answers, and engage dynamically with the teams and the audience. Through this web app portal, you will have direct access to the predetermined answers and contexts, allowing you to seamlessly validate the flow of the game with prestige and elegance.</p>
                                    <p>Crucially, you are also the official <strong>Lifelines</strong> for the competitors. During each of the first two elimination rounds, every team has the right to call on you up to three times for assistance. When a team triggers a lifeline, they will look to you for a clue. Using the information displayed on your digital portal combined with your own experience, it will be up to you to craft and deliver a helpful hint to guide them toward the correct answer before their 15-second clock runs out. When you explore the rounds further down, you will notice that we have enabled an input button on every question that will allow you to save a hint in advance, in case you are called upon on that specific one. Also, you will find an input for comments and observations regarding the specific questions; we value your feedback and will definitely take it into consideration.</p>
                                    <p>Ultimately, your presence elevates this game show into a grand, interactive celebration of heritage and knowledge. We expect you to bring your energy, authority, and wit to the table, making the lifelines an exciting highlight of the night. Thank you for your leadership and for partnering with us to make this an unforgettable experience! We hope this is the first but not the last that we do something like this together, only better.</p>
                                    <div className="flex flex-col items-start mt-6 border-t border-white/5 pt-4 text-left">
                                        <p className="text-slate-400 text-xs italic">Truly yours,</p>
                                        <div className="relative my-1 h-14 flex items-center justify-start">
                                            <img 
                                                src={resolveMediaUrl("images/firmaVMEE.png")} 
                                                alt="Victor Ele Ela Signature" 
                                                className="h-14 w-auto object-contain"
                                                style={{ filter: 'invert(1)' }}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[#fca311] font-black text-sm tracking-wide">Victor Ele Ela</p>
                                            <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-0.5">Executive Producer</p>
                                        </div>
                                    </div>
                                </>
                            )}
                            {activeBriefingModal === 'round1' && (
                                <>
                                    <p className="font-extrabold text-[#fca311] text-base mb-2">Round 1 (Africa Day Trivia Challenge Round I)</p>
                                    <p>Round 1 consists of a Jeopardy-style board named <strong>Africa Day Round I</strong>. Key rules and mechanics include:</p>
                                    <ul className="list-disc list-inside space-y-2 pl-2">
                                        <li>The board contains 5 categories with questions ranging in value from <strong>$100 to $500</strong>.</li>
                                        <li>Teams take turns picking categories and point values.</li>
                                        <li><strong>Direct Questions</strong>: In this round, questions are open-ended without multiple-choice options.</li>
                                        <li><strong>Rebounds Enabled</strong>: If a team answers incorrectly, other teams have a chance to steal points.</li>
                                        <li><strong>Lifelines</strong>: Each team can ask the judges for assistance up to 2 times during the round. You should provide a helpful clue from your portal without giving away the direct answer.</li>
                                    </ul>
                                </>
                            )}
                            {activeBriefingModal === 'round2' && (
                                <>
                                    <p className="font-extrabold text-[#fca311] text-base mb-2">Round 2 (Africa Day Trivia Challenge Round II)</p>
                                    <p>Round 2 consists of a Jeopardy-style board named <strong>Africa Day Round II</strong>. Key rules and mechanics include:</p>
                                    <ul className="list-disc list-inside space-y-2 pl-2">
                                        <li>The board contains 5 categories with questions ranging in value from <strong>$100 to $500</strong>.</li>
                                        <li>Teams take turns picking categories and point values.</li>
                                        <li><strong>Multiple Choice</strong>: In this round, questions have multiple-choice options.</li>
                                        <li><strong>Rebounds Disabled</strong>: If a team answers incorrectly, the turn passes and no rebound attempts are allowed.</li>
                                        <li><strong>Lifelines</strong>: Each team can ask the judges for assistance up to 2 times during the round. You should provide a helpful clue from your portal without giving away the direct answer.</li>
                                    </ul>
                                </>
                            )}
                            {activeBriefingModal === 'round3' && (
                                <>
                                    <p className="font-extrabold text-[#fca311] text-base mb-2">Round 3 (The Face Off / Smart Azz)</p>
                                    <p>Round 3 is the final battle named <strong>The Face Off</strong>. Key rules and mechanics include:</p>
                                    <ul className="list-disc list-inside space-y-2 pl-2">
                                        <li>Categories are revealed. Teams pick a judge to pick a topic for them, starting from the winning team.</li>
                                        <li>Each team selects a player to go forward and battle out the topic.</li>
                                        <li>Players will take turns to name concepts that belong to the category chosen (e.g. naming African capitals or Michael Jackson albums).</li>
                                        <li>They will have <strong>10 seconds each</strong> to provide a correct answer.</li>
                                        <li>The moment they answer incorrectly with a concept that is not in the list or if the timer runs out, that player will be eliminated.</li>
                                        <li>We return to the Face Off screen, another topic is selected, new players face off, until one team wins 4 battles, concluding the show.</li>
                                    </ul>
                                </>
                            )}
                        </div>

                        <footer className="border-t border-white/10 pt-4 flex justify-end">
                            <button
                                onClick={() => setActiveBriefingModal(null)}
                                className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-extrabold text-xs uppercase tracking-wider transition-all border border-white/5 active:scale-95"
                            >
                                Close Guidelines
                            </button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        </div>
    );
};

export default AfricaDayLandingPage;
