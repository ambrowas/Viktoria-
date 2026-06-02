import React, { useState, useCallback, useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";
import type { Game, Screen, Show, Team } from "@/types";
import { GameType } from "@/types";
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
import ShowHostController from "@screens/host/ShowHostController";
import QuickPlayWrapper from "@components/QuickPlayWrapper";
import Modal from "@components/Modal";
import { getGames, saveGame, deleteGame } from "@services/localGameService";
import { getShows, saveShow, deleteShow } from "@services/localShowService";
import { useLanguage } from "@/context/LanguageContext";
import { useSync } from "@/context/SyncContext";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Settings, X, Shield, Gamepad2, Monitor } from "lucide-react";
import Lottie from "lottie-react";
import puzzleAnimation from "@/assets/animations/puzzle.json";

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
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [shows, setShows] = useState<Show[]>([]);
  const [isLoadingShows, setIsLoadingShows] = useState(true);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameIdToDelete, setGameIdToDelete] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [activeQuickPlay, setActiveQuickPlay] = useState<{ game: Game; teams: Team[] } | null>(null);
  const [activeShow, setActiveShow] = useState<Show | null>(null);
  const [activeShowInitialState, setActiveShowInitialState] = useState<any | null>(null);
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

  const [isDualScreenActive, setIsDualScreenActive] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('localSync') === 'true') return false;
    return localStorage.getItem('viktoria_isDualScreen') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('viktoria_isDualScreen', isDualScreenActive ? 'true' : 'false');
  }, [isDualScreenActive]);

  // ── DUAL SCREEN: BroadcastChannel local sync ────────────────────────────
  // The PC broadcasts state to the TV window via BroadcastChannel.
  // No Firebase involved — pure local, zero latency.
  const dualScreenChannel = React.useRef<BroadcastChannel | null>(null);
  const params = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const isLocalSyncViewer = params.get('localSync') === 'true';

  // PC: open/close the BroadcastChannel when dual screen toggles
  useEffect(() => {
    if (isDualScreenActive && window.electronAPI && !isLocalSyncViewer) {
      dualScreenChannel.current = new BroadcastChannel('viktoria-dual-screen');
    } else if (!isDualScreenActive && dualScreenChannel.current) {
      dualScreenChannel.current.close();
      dualScreenChannel.current = null;
    }
  }, [isDualScreenActive, isLocalSyncViewer]);

  // PC: broadcast state whenever activeShow or activeGame changes
  useEffect(() => {
    if (!isDualScreenActive || isLocalSyncViewer || !dualScreenChannel.current) return;
    dualScreenChannel.current.postMessage({
      type: 'STATE_UPDATE',
      activeShow: activeShow ?? null,
      activeGame: activeGame ?? null,
    });
  }, [isDualScreenActive, isLocalSyncViewer, activeShow, activeGame]);

  // TV: receive state from PC via BroadcastChannel
  useEffect(() => {
    if (!isLocalSyncViewer) return;
    const bc = new BroadcastChannel('viktoria-dual-screen');
    bc.onmessage = (event) => {
      const { type, activeShow: show, activeGame: game } = event.data;
      if (type === 'STATE_UPDATE') {
        setActiveShow(show);
        setActiveGame(game);
      }
    };
    return () => bc.close();
  }, [isLocalSyncViewer]);

  // PC: notify when TV window is closed by user (Electron IPC event)
  useEffect(() => {
    if (!window.electronAPI) return;
    (window.electronAPI as any).on('viewer-window-closed', () => {
      console.log('App: Viewer window was closed by the user.');
      setIsDualScreenActive(false);
    });
  }, []);

  const handleToggleDualScreen = async () => {
    if (isDualScreenActive) {
      setIsDualScreenActive(false);
      if (window.electronAPI) {
        await window.electronAPI.invoke('close-viewer-window');
      }
    } else {
      setIsDualScreenActive(true);
      if (window.electronAPI) {
        await window.electronAPI.invoke('open-viewer-window', '/?localSync=true');
      }
    }
  };

  const lastAppCommandTimestamp = React.useRef<number>(-1);
  const hasInitializedAppCommand = React.useRef<boolean>(false);

  useEffect(() => {
    if (isRemoteMode && sessionData && !hasInitializedAppCommand.current) {
      if (sessionData.hostCommand?.timestamp) {
        lastAppCommandTimestamp.current = sessionData.hostCommand.timestamp;
      } else {
        lastAppCommandTimestamp.current = 0;
      }
      hasInitializedAppCommand.current = true;
    }
  }, [isRemoteMode, sessionData]);

  useEffect(() => {
    if (!sessionId) {
      hasInitializedAppCommand.current = false;
      lastAppCommandTimestamp.current = -1;
    }
  }, [sessionId]);

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

      // Skip if already processed or if listener runs before initialization
      if (lastAppCommandTimestamp.current === -1 || (ts > 0 && ts <= lastAppCommandTimestamp.current)) return;
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
    setIsLoadingGames(true);
    try {
      const localGames = await getGames();

      // MIGRATION: Restore legacy games from localStorage & Firestore
      try {
        let migratedAny = false;

        // 1. Recover from Local Storage (most likely location for recent games)
        const legacyGamesJson = window.localStorage.getItem("gameshow-games");
        if (legacyGamesJson) {
          const legacyGames = JSON.parse(legacyGamesJson) as Game[];
          for (const lg of legacyGames) {
            if (!localGames.some((g) => g.id === lg.id)) {
              await saveGame(lg);
              migratedAny = true;
            }
          }
          if (migratedAny) {
             console.log("✅ Recovered games from LocalStorage!");
          }
        }

        // 2. Recover from Firebase Firestore (older games) - ONLY ONCE
        const hasMigratedFirestore = window.localStorage.getItem("viktoria-firestore-migrated") === "true";
        if (!hasMigratedFirestore) {
          try {
            const firebaseConfig = {
              apiKey: "AIzaSyCfNNcIK2WR3ONNnlEDvolCw4Fn4-uheD0",
              authDomain: "viktoria-226cf.firebaseapp.com",
              projectId: "viktoria-226cf",
            };
            const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
            const db = getFirestore(app);
            const q = query(collection(db, "games"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            
            for (const docSnap of snap.docs) {
              const raw = docSnap.data();
              const id = docSnap.id;
              if (!localGames.some((g) => g.id === id)) {
                const lg = raw as Game;
                lg.id = id;
                lg.slug = lg.slug || lg.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || id;
                await saveGame(lg);
                migratedAny = true;
              }
            }
            if (snap.docs.length > 0) {
               console.log("✅ Checked Firestore for legacy games.");
            }
            window.localStorage.setItem("viktoria-firestore-migrated", "true");
          } catch (e) {
            console.error("Firestore migration skipped or failed:", e);
          }
        }

      if (migratedAny) {
         const refreshedGames = await getGames();
         setGames(refreshedGames);
         setIsLoadingGames(false);
         return;
      }
    } catch (err) {
      console.error("Migration failed:", err);
    }

    setGames(localGames);
  } catch (error) {
    console.error("Failed to load games:", error);
    alert(lang === "es" ? "Error al cargar los juegos locales." : "Error loading local games.");
  } finally {
    setIsLoadingGames(false);
  }
}, [lang]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const fetchShows = useCallback(async () => {
    setIsLoadingShows(true);
    try {
      const localShows = await getShows();

      // MIGRATION: Restore legacy shows from localStorage
      try {
        let migratedAny = false;
        const legacyShowsJson = window.localStorage.getItem("gameshow-shows");
        if (legacyShowsJson) {
          const legacyShows = JSON.parse(legacyShowsJson) as Show[];
          for (const ls of legacyShows) {
            if (!localShows.some((s) => s.id === ls.id)) {
              await saveShow(ls);
              migratedAny = true;
            }
          }
          if (migratedAny) {
             console.log("✅ Recovered shows from LocalStorage!");
          }
        }

        if (migratedAny) {
          const refreshedShows = await getShows();
          setShows(refreshedShows);
          setIsLoadingShows(false);
          return;
        }
      } catch (err) {
        console.error("Show migration failed:", err);
      }

      setShows(localShows);
    } catch (error) {
      console.error("Failed to load shows:", error);
    } finally {
      setIsLoadingShows(false);
    }
  }, []);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  const handleSaveGame = useCallback(
    async (gameToSave: Game, silent?: boolean): Promise<void> => {
      try {
        const success = await saveGame(gameToSave);
        if (success) {
          await fetchGames(); // Refresh the list from the source of truth
          if (!silent) {
            setEditingGame(null);
            setScreen("library");
          }
        } else {
          throw new Error("Save operation returned false.");
        }
      } catch (error) {
        console.error("Save failed:", error);
        if (!silent) {
          alert(lang === "es" ? "No se pudo guardar el juego localmente." : "Could not save the game locally.");
        }
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
      try {
        const normalized: Show = {
          ...showToSave,
          id: showToSave.id || crypto.randomUUID(),
          createdAt: showToSave.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const success = await saveShow(normalized);
        if (success) {
          await fetchShows();
        } else {
          throw new Error("Save show operation returned false.");
        }
      } catch (error) {
        console.error("Save show failed:", error);
        alert(lang === "es" ? "No se pudo guardar el show localmente." : "Could not save the show locally.");
      }
    },
    [fetchShows, lang]
  );

  const handleDeleteShow = useCallback(
    async (showId: string): Promise<void> => {
      try {
        const success = await deleteShow(showId);
        if (success) {
          await fetchShows();
        } else {
          throw new Error("Delete show operation returned false.");
        }
      } catch (error) {
        console.error("Delete show failed:", error);
        alert(lang === "es" ? "No se pudo eliminar el show localmente." : "Could not delete the show locally.");
      }
    },
    [fetchShows, lang]
  );

  // ==============================================================
  // GAME LAUNCH TRANSITION
  // ==============================================================
  const handlePlayGame = (g: Game) => {
    const label = lang === "es" ? TRANSLATIONS.es.gameStarting : TRANSLATIONS.en.gameStarting;
    setTransitionLabel(label);
    setIsTransitioning(true);
    if (g.type !== GameType.SMART_AZZ) {
      transitionSound.play();
      magicalSound.play();
    }

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
    if (g.type !== GameType.SMART_AZZ) {
      transitionSound.play();
      magicalSound.play();
    }

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

  const handleStartShow = (s: Show, initialState?: any) => {
    const label = lang === "es" ? TRANSLATIONS.es.showStarting : TRANSLATIONS.en.showStarting;
    setTransitionLabel(label);
    setIsTransitioning(true);
    transitionSound.play();
    magicalSound.play();

    setTimeout(() => {
      setActiveShowInitialState(initialState || null);
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
      setActiveShowInitialState(null);
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
    const params = new URLSearchParams(window.location.search);
    const isLocalSyncViewer = params.get('localSync') === 'true';

    if (isLocalSyncViewer && !activeGame && !activeShow) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0f1d] text-white p-8 relative overflow-hidden select-none">
          {/* Decorative background grid and glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(49,130,206,0.1)_0%,transparent_70%)] animate-pulse pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
          
          {/* Floating Puzzle Lottie Animation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: [0, -12, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
            className="w-[220px] mb-8 relative"
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-600 via-pink-500 to-amber-400 blur-3xl pointer-events-none"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.25 }}
            />
            <Lottie
              animationData={puzzleAnimation}
              loop
              autoplay
              style={{
                filter: "drop-shadow(0 0 12px rgba(255, 255, 255, 0.15))"
              }}
            />
          </motion.div>

          {/* Casing matches branding "QuizBoard" */}
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 font-display bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
            Viktoria GameShow
          </h1>
          <p className="text-blue-400/80 font-semibold tracking-widest text-xs uppercase mb-8">
            QuizBoard Presentation Screen
          </p>

          <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-medium text-blue-300">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>{lang === "es" ? "Esperando al anfitrión..." : "Waiting for Host..."}</span>
          </div>
        </div>
      );
    }


    // 📱 iPad Host/Player UI — only on non-Electron web clients (actual iPad/phone)
    if (!window.electronAPI && deviceRole === 'host') {
      if (!sessionData) {
        return (
          <div className="h-screen flex flex-col items-center justify-center p-8 text-center space-y-6 bg-[#0a0a0a]">
            <div className="w-20 h-20 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-3xl font-black text-yellow-500 uppercase tracking-tighter">
              {lang === 'es' ? 'CONECTANDO...' : 'CONNECTING...'}
            </h2>
            <p className="text-text-secondary max-w-xs mx-auto text-sm leading-relaxed">
              {lang === 'es'
                ? 'Sincronizando con el PC maestro.'
                : 'Synchronizing with the master PC.'}
            </p>
            <button onClick={() => leaveSession()} className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase">
              {lang === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        );
      }
      const showData = sessionData?.fullShowData as Show;
      const currentStep = sessionData?.currentStep;
      const gameToController = activeGame || (sessionData?.fullGameData as Game);
      return (
        <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
          <MasterControlPanel />
          {showData && currentStep && currentStep !== 'playing' ? (
            <ShowHostController show={showData} />
          ) : gameToController ? (
            <HostAdaptiveFactory currentGame={gameToController} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Esperando partida...
            </div>
          )}
        </div>
      );
    }

    // 📱 Player Role (iPad/mobile)
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
          initialState={activeShowInitialState || undefined}
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
            startNewGame={() => {
              setEditingGame(null);
              setScreen("creator");
            }}
          />
        );

      case "library":
        return (
          <GameLibrary
            games={games}
            isLoading={isLoadingGames}
            onPlay={handlePlayGame}
            onQuickPlay={handleQuickPlay}
            onEdit={handleEditGame}
            onDelete={setGameIdToDelete}
            onCreateNew={() => {
              setEditingGame(null);
              setScreen("creator");
            }}
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
            startNewGame={() => {
              setEditingGame(null);
              setScreen("creator");
            }}
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
      {/* 🟦 Sidebar — Hidden During Active Game, Host Mode, or Dual Screen TV Window */}
      {!activeGame && !activeQuickPlay && !activeShow && !isTransitioning && (deviceRole === 'viewer' || (deviceRole === 'host' && window.electronAPI)) && !window.location.search.includes("localSync=true") && (
        <aside className="transition-opacity duration-700 ease-in-out">
          <Sidebar 
             currentScreen={screen} 
             setScreen={(s) => {
               if (s === "creator" && screen !== "creator") {
                 setEditingGame(null);
               }
               setScreen(s);
             }} 
          />
        </aside>
      )}

      {/* 🎮 Main Area */}
      <main
        className={`flex-1 transition-all duration-700 relative ${activeGame || activeQuickPlay || activeShow || (deviceRole !== 'viewer' && !window.electronAPI) ? "p-0 h-full flex flex-col min-h-0" : "overflow-y-auto p-4 sm:p-6 md:p-8"
          }`}
      >
        {/* 📡 Sync Status & Dual Screen Indicators (Floating) */}
        {!isTransitioning && (
          <div className="absolute top-4 right-4 z-[100] flex items-center gap-2">
            {window.electronAPI && !window.location.search.includes("localSync=true") && (
              <button
                onClick={handleToggleDualScreen}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg ${isDualScreenActive
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                  : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700"
                  }`}
              >
                <Monitor size={14} />
                {isDualScreenActive ? (lang === 'es' ? 'PANTALLA DUAL: ACTIVO' : 'DUAL SCREEN: ACTIVE') : (lang === 'es' ? 'PANTALLA DUAL' : 'DUAL SCREEN')}
              </button>
            )}

            {!isDualScreenActive && (
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
            )}
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
