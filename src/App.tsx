import React, { useState, useCallback, useEffect } from "react";
import type { Game, Screen, Show, Team } from "@/types";
import { flipSound, transitionSound, magicalSound, stopAllSounds } from "@/utils/sound";
import useLocalStorage from "@hooks/useLocalStorage";
import Sidebar from "@components/Sidebar";
import Dashboard from "@screens/Dashboard";
import GameLibrary from "@screens/GameLibrary";
import GameCreator from "@screens/GameCreator";
import ShowManager from "@screens/ShowManager";
import GameRouter from "@screens/GameRouter";
import ShowPlayer from "@screens/ShowPlayer";
import ShowRunner from "@screens/ShowRunner";
import PlayerInterface from "@screens/PlayerInterface";
import MasterControlPanel from "@screens/host/MasterControlPanel";
import HostAdaptiveFactory from "@screens/host/HostAdaptiveFactory";
import QuickPlayWrapper from "@components/QuickPlayWrapper";
import Modal from "@components/Modal";
import { getGames, saveGame, deleteGame } from "@services/localGameService";
import { useLanguage } from "@/context/LanguageContext";
import { useSync } from "@/context/SyncContext";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Settings, X, Shield, Gamepad2 } from "lucide-react";

const TRANSLATIONS = {
  en: {
    gameStarting: "🎬 Let's Go!",
    gameExiting: "🎬 Returning to Library...",
    showStarting: "🎬 Show starts now!",
    showExiting: "🎬 Returning to Menu...",
  },
  es: {
    gameStarting: "🎬 ¡El Juego Comienza!",
    gameExiting: "🎬 Abandonando el Juego...",
    showStarting: "🎬 ¡El Show Comienza!",
    showExiting: "🎬 Regresando al Menú...",
  }
};

const App: React.FC = () => {
  // ==============================================================
  // STATE MANAGEMENT
  // ==============================================================
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [games, setGames] = useState<Game[]>([]);
  const [shows, setShows] = useLocalStorage<Show[]>("gameshow-shows", []);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameIdToDelete, setGameIdToDelete] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [activeQuickPlay, setActiveQuickPlay] = useState<{ game: Game; teams: Team[] } | null>(null);
  const [activeShow, setActiveShow] = useState<Show | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState("");
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [inputSessionId, setInputSessionId] = useState("");
  const [selectedRole, setSelectedRole] = useState<'host' | 'player'>('player');
  const { lang } = useLanguage();
  const {
    sessionId,
    sessionData,
    isRemoteMode,
    startSession,
    joinSession,
    leaveSession,
    updateSession,
    deviceRole,
    setDeviceRole,
    version,
    syncStatus
  } = useSync();

  const lastAppCommandTimestamp = React.useRef<number>(Date.now());

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Sync state with Firebase when in active game and remote mode is ON
  useEffect(() => {
    if (isRemoteMode && activeGame) {
      updateSession({
        currentGameId: activeGame.id,
        currentStep: activeGame.type.toLowerCase(), // basic sync
        fullGameData: activeGame,
      });
    }
  }, [isRemoteMode, activeGame, updateSession]);

  // Sync state with Firebase when in active Quick Play game
  useEffect(() => {
    if (isRemoteMode && activeQuickPlay) {
      updateSession({
        currentGameId: activeQuickPlay.game.id,
        currentStep: activeQuickPlay.game.type.toLowerCase(),
        fullGameData: activeQuickPlay.game,
      });
    }
  }, [isRemoteMode, activeQuickPlay, updateSession]);

  // Sync state with Firebase when in active show
  useEffect(() => {
    if (isRemoteMode && activeShow) {
      updateSession({
        currentShowId: activeShow.id,
        teams: activeShow.teams,
        fullShowData: activeShow,
      });
    }
  }, [isRemoteMode, activeShow, updateSession]);

  // Removed auto-sync of activeGame from sessionData because it causes race conditions on exit.
  // The PC is the source of truth for library selections.

  // 🎬 REMOTE TRANSITION & AUDIO COMMANDS
  useEffect(() => {
    if (!isRemoteMode || !sessionData) return;

    // Listen for transitionState triggers (from iPad)
    if (sessionData.transitionState?.isActive) {
      const label = sessionData.transitionState.label;
      setTransitionLabel(label);
      setIsTransitioning(true);
      transitionSound.play();
      magicalSound.play();

      // The local timeout will clear it locally on the PC
      setTimeout(() => {
        setIsTransitioning(false);
      }, 1500);
    }

    // Listen for Host Commands (Audio fixes, etc)
    if (sessionData.hostCommand) {
      const { type, payload } = (sessionData as any).hostCommand;
      const ts = (sessionData as any).hostCommand.timestamp || 0;

      // Skip if already processed
      if (ts > 0 && ts <= lastAppCommandTimestamp.current) return;
      if (ts > 0) lastAppCommandTimestamp.current = ts;

      if (type === 'quit_to_lobby') {
        const label = lang === "es" ? TRANSLATIONS.es.gameExiting : TRANSLATIONS.en.gameExiting;
        setTransitionLabel(label);
        stopAllSounds();
        flipSound.play();
        setIsTransitioning(true);

        setTimeout(() => {
          setActiveGame(null);
          setActiveShow(null);
          setActiveQuickPlay(null);
          setScreen("library");
          setIsTransitioning(false);
          // Only the Host should clear the session data
          if (deviceRole === 'host') {
            updateSession({ currentGameId: null, currentShowId: null, fullGameData: null, fullShowData: null });
          }
        }, 1200);
      }

      if (type === 'play_audio') {
        // Re-trigger global sounds if requested
        if (payload?.soundId === 'viktoria') {
          (magicalSound as any).loop = false;
          magicalSound.play();
        }
      }

      if (type === 'play_bg_music') {
        if (payload?.soundId === 'viktoria') {
          (magicalSound as any).loop = false;
          magicalSound.play();
        }
      }

      if (type === 'pause_bg_music') {
        magicalSound.pause();
      }

      if (type === 'emergency_mute') {
        stopAllSounds();
      }
    }
  }, [isRemoteMode, sessionData, lang, deviceRole, updateSession]);

  // ==============================================================
  // DATA FETCHING & PERSISTENCE
  // ==============================================================

  const fetchGames = useCallback(async () => {
    try {
      const localGames = await getGames();
      setGames(localGames);
    } catch (error) {
      console.error("Failed to load games:", error);
      alert(lang === "es" ? "Error al cargar los juegos locales." : "Error loading local games.");
    }
  }, [lang]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleSaveGame = useCallback(
    async (gameToSave: Game): Promise<void> => {
      try {
        const success = await saveGame(gameToSave);
        if (success) {
          await fetchGames(); // Refresh the list from the source of truth
          setEditingGame(null);
          setScreen("library");
        } else {
          throw new Error("Save operation returned false.");
        }
      } catch (error) {
        console.error("Save failed:", error);
        alert(lang === "es" ? "No se pudo guardar el juego localmente." : "Could not save the game locally.");
      }
    },
    [fetchGames, lang]
  );

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    const gameToDelete = games.find(g => g.id === gameIdToDelete);
    if (!gameToDelete) return;
    try {
      const success = await deleteGame(gameToDelete);
      if (success) {
        await fetchGames(); // Refresh the list from the source of truth
        setGameIdToDelete(null);
      } else {
        throw new Error("Delete operation returned false.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert(lang === "es" ? "No se pudo eliminar el juego local." : "Could not delete the local game.");
    }
  }, [gameIdToDelete, games, fetchGames, lang]);

  // ==============================================================
  // EDIT HANDLER
  // ==============================================================
  const handleEditGame = (id: string): void => {
    const g = games.find((game) => game.id === id);
    if (g) {
      setEditingGame(g);
      setScreen("creator");
    }
  };

  const handleSaveShow = useCallback(
    async (showToSave: Show): Promise<void> => {
      setShows((prev) => {
        const exists = prev.some((show) => show.id === showToSave.id);
        const normalized: Show = {
          ...showToSave,
          id: showToSave.id || crypto.randomUUID(),
          createdAt: showToSave.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return exists
          ? prev.map((show) => (show.id === normalized.id ? normalized : show))
          : [...prev, normalized];
      });
    },
    [setShows]
  );

  const handleDeleteShow = useCallback(
    async (showId: string): Promise<void> => {
      setShows((prev) => prev.filter((show) => show.id !== showId));
    },
    [setShows]
  );

  // ==============================================================
  // GAME LAUNCH TRANSITION
  // ==============================================================
  const handlePlayGame = (g: Game) => {
    const label = lang === "es" ? TRANSLATIONS.es.gameStarting : TRANSLATIONS.en.gameStarting;
    setTransitionLabel(label);
    setIsTransitioning(true);
    transitionSound.play();
    magicalSound.play();

    setTimeout(() => {
      setActiveGame(g);
      setIsTransitioning(false);
      // We don't force 'host' here, only if they sync.
    }, 1500); // transition duration
  };

  const handleExitGame = () => {
    const label = lang === "es" ? TRANSLATIONS.es.gameExiting : TRANSLATIONS.en.gameExiting;
    setTransitionLabel(label);
    stopAllSounds();
    flipSound.play();
    setIsTransitioning(true);

    setTimeout(() => {
      setActiveGame(null);
      setScreen("library");
      setIsTransitioning(false);
      if (isRemoteMode) {
        updateSession({ currentGameId: null, currentShowId: null, fullGameData: null, fullShowData: null });
      }
    }, 1200);
  };

  const handleQuickPlay = (g: Game, teams: Team[]) => {
    const label = lang === "es" ? TRANSLATIONS.es.gameStarting : TRANSLATIONS.en.gameStarting;
    setTransitionLabel(label);
    setIsTransitioning(true);
    transitionSound.play();
    magicalSound.play();

    setTimeout(() => {
      setActiveQuickPlay({ game: g, teams });
      setIsTransitioning(false);
    }, 1500);
  };

  const handleExitQuickPlay = () => {
    const label = lang === "es" ? TRANSLATIONS.es.gameExiting : TRANSLATIONS.en.gameExiting;
    setTransitionLabel(label);
    stopAllSounds();
    flipSound.play();
    setIsTransitioning(true);

    setTimeout(() => {
      setActiveQuickPlay(null);
      setActiveGame(null); // IMPORTANT: Prevents activeGame fallback bug
      setScreen("library");
      setIsTransitioning(false);
      if (isRemoteMode) {
        updateSession({ currentGameId: null, currentShowId: null, fullGameData: null, fullShowData: null });
      }
    }, 1200);
  };

  const handleStartShow = (s: Show) => {
    const label = lang === "es" ? TRANSLATIONS.es.showStarting : TRANSLATIONS.en.showStarting;
    setTransitionLabel(label);
    setIsTransitioning(true);
    transitionSound.play();
    magicalSound.play();

    setTimeout(() => {
      setActiveShow(s);
      setIsTransitioning(false);
    }, 1500);
  };

  const handleExitShow = () => {
    const label = lang === "es" ? TRANSLATIONS.es.showExiting : TRANSLATIONS.en.showExiting;
    setTransitionLabel(label);
    stopAllSounds();
    flipSound.play();
    setIsTransitioning(true);

    setTimeout(() => {
      setActiveShow(null);
      setScreen("library");
      setIsTransitioning(false);
      if (isRemoteMode) {
        updateSession({ currentGameId: null, currentShowId: null, fullGameData: null, fullShowData: null });
      }
    }, 1200);
  };

  // ==============================================================
  // RENDER SCREEN
  // ==============================================================
  const renderScreen = (): JSX.Element | null => {
    // 📱 Support Host Role (iPad)
    if (deviceRole === 'host') {
      // If we are on the PC, we ONLY want to render HostAdaptiveFactory 
      // if we explicitly have an activeGame (user clicked it in the Library).
      // We don't want to auto-resume from stale Firebase data.
      if (window.electronAPI && !activeGame) {
        // Fall through to regular PC rendering (Library, etc)
      } else if (!window.electronAPI && !sessionData) {
        return (
          <div className="h-screen flex flex-col items-center justify-center p-8 text-center space-y-6 bg-[#0a0a0a]">
            <div className="w-20 h-20 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-3xl font-black text-yellow-500 uppercase tracking-tighter">
              {lang === 'es' ? 'CONECTANDO...' : 'CONNECTING...'}
            </h2>
            <p className="text-text-secondary max-w-xs mx-auto text-sm leading-relaxed">
              {lang === 'es'
                ? 'Sincronizando con el PC maestro. Asegúrate de que el código es correcto.'
                : 'Synchronizing with the master PC. Ensure your code is correct.'}
            </p>

            {/* 🛠️ PWA DIAGNOSTICS */}
            <div className="flex flex-col items-center gap-2 py-4 border-y border-white/5 w-full max-w-xs">
              <div className="text-[10px] font-mono opacity-50 uppercase tracking-widest flex justify-between w-full">
                <span>Status:</span>
                <span className="text-yellow-500 font-bold">{syncStatus}</span>
              </div>
              <div className="text-[10px] font-mono opacity-50 uppercase tracking-widest flex justify-between w-full">
                <span>Version:</span>
                <span className="text-white">v{version}</span>
              </div>
              {syncStatus === 'error_missing_session' && (
                <div className="text-red-500 text-[10px] font-bold mt-2 animate-pulse">
                  {lang === 'es' ? '¡SESIÓN NO ENCONTRADA!' : 'SESSION NOT FOUND!'}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs pt-4">
              <button
                onClick={() => leaveSession()}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all active:scale-95"
              >
                {lang === 'es' ? 'Cancelar y Salir' : 'Cancel & Exit'}
              </button>

              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full py-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] text-red-400 font-black uppercase tracking-[0.2em] hover:bg-red-500/20"
              >
                {lang === 'es' ? 'FORZAR LOGIN (HARD RESET)' : 'FORCE LOGIN (HARD RESET)'}
              </button>
            </div>
          </div>
        );
      } else {
        const gameToController = activeGame || (sessionData?.fullGameData as Game);

        try {
          return (
            <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
              <MasterControlPanel />
              {gameToController ? (
                <HostAdaptiveFactory currentGame={gameToController} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-4 p-8 text-center bg-[#0a0a0a]">
                  <p className="text-lg font-bold text-slate-300">Waiting for PC to broadcast game payload...</p>
                  <pre className="text-left bg-black/60 p-6 border border-white/10 rounded-xl overflow-auto w-full max-w-lg shadow-2xl">
                    <span className="text-yellow-500 font-bold block mb-2">DEBUG STATE INFO (iPad Host):</span>
                    {'\n'}Session Active: <span className={sessionData ? 'text-green-400' : 'text-red-400'}>{sessionData ? 'YES' : 'NO'}</span>
                    {'\n'}Current Game ID: <span className="text-blue-400">{sessionData?.currentGameId || 'null'}</span>
                    {'\n'}Full Game Payload: <span className={sessionData?.fullGameData ? 'text-green-400' : 'text-red-400'}>{sessionData?.fullGameData ? 'RECEIVED ✓' : 'MISSING ❌'}</span>
                    {'\n'}Payload Type: <span className="text-purple-400">{(sessionData?.fullGameData as any)?.type || 'N/A'}</span>
                    {'\n'}Local activeGame: <span className="text-orange-400">{(activeGame as any)?.type || 'null'}</span>
                  </pre>
                </div>
              )}
              <div className="bg-black/50 border-t border-white/5 p-2 px-6 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                <div>Viktoria Gameshow v{version} • HOST MODE</div>
                <div>Session: {sessionId}</div>
              </div>
            </div>
          );
        } catch (e) {
          console.error("App: Host Controller Crash", e);
          return (
            <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-[#0a0a0a]">
              <h2 className="text-xl font-bold text-red-500 mb-4">Error de Interfaz</h2>
              <button
                onClick={() => window.location.reload()}
                className="bg-white/10 px-6 py-2 rounded-lg text-sm"
              >
                REINTENTAR
              </button>
            </div>
          );
        }
      }
    }

    // 📱 Support Player Role (iPad)
    if (deviceRole === 'player') {
      return <PlayerInterface />;
    }

    if (activeQuickPlay) {
      return (
        <QuickPlayWrapper
          game={activeQuickPlay.game}
          teams={activeQuickPlay.teams}
          onExit={handleExitQuickPlay}
        />
      );
    }

    if (activeShow) {
      return (
        <ShowRunner
          show={activeShow}
          games={games}
          onExit={handleExitShow}
        />
      );
    }

    if (activeGame) {
      return (
        <GameRouter
          game={activeGame}
          onExit={handleExitGame}
          teams={[]}
          teamScores={{}}
          onScoreChange={() => { }}
        />
      );
    }

    switch (screen) {
      case "dashboard":
        return (
          <Dashboard
            games={games}
            shows={shows}
            isDark={isDark}
            toggleTheme={toggleTheme}
            setScreen={setScreen}
            startNewGame={() => setScreen("creator")}
          />
        );

      case "library":
        return (
          <GameLibrary
            games={games}
            onPlay={handlePlayGame}
            onQuickPlay={handleQuickPlay}
            onEdit={handleEditGame}
            onDelete={setGameIdToDelete}
            onCreateNew={() => setScreen("creator")}
          />
        );

      case "creator":
        return (
          <GameCreator
            onSave={handleSaveGame}
            existingGame={editingGame}
            onCreateSample={async () => { }}
          />
        );

      case "shows":
        return (
          <ShowManager
            shows={shows}
            games={games}
            onSaveShow={handleSaveShow}
            onDeleteShow={handleDeleteShow}
          />
        );
      case "play":
        return (
          <ShowPlayer
            shows={shows}
            games={games}
            onPlayGame={handlePlayGame}
            onStartShow={handleStartShow}
            setScreen={setScreen}
          />
        );

      default:
        return (
          <Dashboard
            games={games}
            shows={shows}
            isDark={isDark}
            toggleTheme={toggleTheme}
            setScreen={setScreen}
            startNewGame={() => setScreen("creator")}
          />
        );
    }
  };

  // ==============================================================
  // LAYOUT
  // ==============================================================
  return (
    <div
      className={`${isDark ? "dark" : ""} flex h-screen bg-gradient-to-b from-[#0a0a0a] to-[#111827] text-text-primary transition-all duration-700 ${activeGame || activeQuickPlay ? "overflow-hidden" : ""
        }`}
    >
      {/* 🟦 Sidebar — Hidden During Active Game or Host Mode */}
      {!activeGame && !activeQuickPlay && !activeShow && !isTransitioning && deviceRole === 'viewer' && (
        <aside className="transition-opacity duration-700 ease-in-out">
          <Sidebar currentScreen={screen} setScreen={setScreen} />
        </aside>
      )}

      {/* 🎮 Main Area */}
      <main
        className={`flex-1 transition-all duration-700 relative ${activeGame || activeQuickPlay || activeShow || deviceRole !== 'viewer' ? "p-0" : "overflow-y-auto p-4 sm:p-6 md:p-8"
          }`}
      >
        {/* 📡 Sync Status Indicator (Floating) */}
        {!isTransitioning && (
          <div className="absolute top-4 right-4 z-[100] flex items-center gap-2">
            <button
              onClick={() => setShowSyncModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg ${isRemoteMode
                ? "bg-green-500/20 text-green-400 border border-green-500/50"
                : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700"
                }`}
            >
              {isRemoteMode ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isRemoteMode ? `SESSION: ${sessionId}` : (lang === 'es' ? 'SINCRONIZAR' : 'SYNC')}
            </button>
          </div>
        )}

        <AnimatePresence>
          {isTransitioning && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center bg-black z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            >
              <h1 className="text-6xl text-yellow-400 font-bold animate-pulse drop-shadow-lg text-center px-4">
                {transitionLabel}
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        {renderScreen()}
      </main>

      {/* ⚠️ Delete Confirmation Modal */}
      <Modal
        isOpen={!!gameIdToDelete}
        onClose={() => setGameIdToDelete(null)}
        title={lang === "es" ? "Confirmar Eliminación" : "Confirm Deletion"}
      >
        <p className="text-text-secondary">
          {lang === "es"
            ? "¿Seguro que quieres eliminar este juego? Esta acción no se puede deshacer."
            : "Are you sure you want to delete this game? This action cannot be undone."}
        </p>
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={() => setGameIdToDelete(null)}
            className="bg-base-300 text-text-primary font-bold py-2 px-4 rounded-lg hover:bg-slate-600"
          >
            {lang === "es" ? "Cancelar" : "Cancel"}
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700"
          >
            {lang === "es" ? "Eliminar" : "Delete"}
          </button>
        </div>
      </Modal>

      {/* 📡 Sync Management Modal */}
      <Modal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        title={lang === "es" ? "Sincronización Remota (iPad)" : "Remote Sync (iPad)"}
      >
        <div className="space-y-6">
          {isRemoteMode ? (
            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Wifi className="text-green-400" />
                <span className="font-bold text-green-400">
                  {lang === 'es' ? 'Sesión Activa' : 'Session Active'}
                </span>
              </div>
              <p className="text-2xl font-mono tracking-widest text-center py-4 bg-black/40 rounded-lg border border-white/10">
                {sessionId}
              </p>
              <p className="text-xs text-text-secondary mt-4">
                {lang === 'es'
                  ? 'Ingresa este código en tu iPad para controlar la partida.'
                  : 'Enter this code on your iPad to control the game.'}
              </p>
              <button
                onClick={() => {
                  leaveSession();
                  setShowSyncModal(false);
                }}
                className="w-full mt-6 bg-red-600/20 text-red-400 border border-red-600/50 py-2 rounded-lg hover:bg-red-600/30 transition-colors"
              >
                {lang === 'es' ? 'Cerrar Sesión' : 'Close Session'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h3 className="font-bold mb-2">
                  {lang === 'es' ? 'Crear Nueva Sesión' : 'Create New Session'}
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  {lang === 'es'
                    ? 'Inicia una sesión para que un iPad pueda controlar este PC.'
                    : 'Start a session so an iPad can control this PC.'}
                </p>
                <button
                  onClick={async () => {
                    const newSessionId = await startSession({
                      currentGameId: activeGame?.id || activeShow?.id || activeQuickPlay?.game.id || 'manual',
                      currentShowId: activeShow?.id || null,
                      fullGameData: activeGame || activeQuickPlay?.game || null,
                      fullShowData: activeShow || null,
                    });
                    setShowSyncModal(false);
                  }}
                  className="w-full bg-yellow-500 text-black font-bold py-2 rounded-lg hover:bg-yellow-400 transition-colors"
                >
                  {lang === 'es' ? 'Generar Código' : 'Generate Code'}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-700"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#1a1a1a] px-2 text-slate-500">{lang === 'es' ? 'O UNIRSE A UNA' : 'OR JOIN ONE'}</span></div>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <input
                  type="text"
                  placeholder={lang === 'es' ? 'CÓDIGO DE SESIÓN' : 'SESSION CODE'}
                  value={inputSessionId}
                  onChange={(e) => setInputSessionId(e.target.value.toUpperCase())}
                  className="w-full bg-black/40 border border-slate-700 rounded-lg px-4 py-2 mb-6 text-center font-mono tracking-widest focus:border-yellow-500 outline-none text-xl"
                  maxLength={6}
                />

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => setSelectedRole('host')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${selectedRole === 'host'
                      ? "bg-[#fca311]/20 border-[#fca311] text-[#fca311]"
                      : "bg-black/20 border-white/5 text-slate-500 hover:border-white/20"
                      }`}
                  >
                    <Shield size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Host</span>
                  </button>
                  <button
                    onClick={() => setSelectedRole('player')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${selectedRole === 'player'
                      ? "bg-blue-500/20 border-blue-500 text-blue-400"
                      : "bg-black/20 border-white/5 text-slate-500 hover:border-white/20"
                      }`}
                  >
                    <Gamepad2 size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Player</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (inputSessionId.length === 6) {
                      joinSession(inputSessionId, selectedRole);
                      setShowSyncModal(false);
                      setInputSessionId("");
                    }
                  }}
                  disabled={inputSessionId.length !== 6}
                  className="w-full bg-yellow-500 text-black font-black py-4 rounded-xl hover:bg-yellow-400 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm"
                >
                  {lang === 'es' ? 'Unirse a Sesión' : 'Join Session'}
                </button>

                <div className="flex flex-col items-center gap-3 pt-8 border-t border-white/5 mt-8">
                  <div className="text-[10px] font-mono opacity-40 uppercase tracking-[0.3em]">
                    System Info: v{version}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(lang === 'es' ? '¿Borrar memoria del iPad?' : 'Clear iPad cache?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="text-[9px] font-black text-red-500/40 hover:text-red-500 uppercase tracking-widest border border-red-500/10 hover:border-red-500/50 px-4 py-2 rounded-lg transition-all"
                  >
                    {lang === 'es' ? 'Resetear App (Hard Reset)' : 'Reset App (Hard Reset)'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default App;
