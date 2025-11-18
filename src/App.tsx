import React, { useState, useCallback, useEffect } from "react";
import type { Game, Screen, Show } from "@/types";
import { flipSound, transitionSound, magicalSound } from "@/utils/sound";
import useLocalStorage from "@hooks/useLocalStorage";
import Sidebar from "@components/Sidebar";
import Dashboard from "@screens/Dashboard";
import GameLibrary from "@screens/GameLibrary";
import GameCreator from "@screens/GameCreator";
import ShowManager from "@screens/ShowManager";
import GameRouter from "@screens/GameRouter";
import Modal from "@components/Modal";
import {
  saveGame as saveGameToFirebase,
  deleteGame as deleteGameFromFirebase,
  loadGames,
} from "@services/firebaseService";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

const App: React.FC = () => {
  // ==============================================================
  // STATE MANAGEMENT
  // ==============================================================
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [games, setGames] = useLocalStorage<Game[]>("gameshow-games", []);
  const [shows, setShows] = useLocalStorage<Show[]>("gameshow-shows", []);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameIdToDelete, setGameIdToDelete] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { lang } = useLanguage();

  // ==============================================================
  // LOAD GAMES FROM FIREBASE
  // ==============================================================
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const firebaseGames = await loadGames();
        setGames(firebaseGames);
      } catch (error) {
        console.error("Failed to load games:", error);
        alert(
          lang === "es"
            ? "Error al cargar los juegos desde Firebase."
            : "Error loading games from Firebase."
        );
      }
    };
    fetchGames();
  }, [setGames, lang]);

  // ==============================================================
  // SAVE HANDLER
  // ==============================================================
  const handleSaveGame = useCallback(
    async (gameToSave: Game): Promise<void> => {
      try {
        await saveGameToFirebase(gameToSave);
        setGames((prevGames) =>
          prevGames.some((g) => g.id === gameToSave.id)
            ? prevGames.map((g) => (g.id === gameToSave.id ? gameToSave : g))
            : [...prevGames, gameToSave]
        );
        setEditingGame(null);
        setScreen("library");
      } catch (error) {
        console.error("Save failed:", error);
        alert(
          lang === "es"
            ? "No se pudo guardar el juego. Inténtalo de nuevo."
            : "Could not save the game. Try again."
        );
      }
    },
    [setGames, lang]
  );

  // ==============================================================
  // DELETE HANDLER
  // ==============================================================
  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!gameIdToDelete) return;
    try {
      await deleteGameFromFirebase(gameIdToDelete);
      setGames((prev) => prev.filter((g) => g.id !== gameIdToDelete));
      setGameIdToDelete(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        lang === "es"
          ? "No se pudo eliminar el juego. Inténtalo de nuevo."
          : "Could not delete the game. Try again."
      );
    }
  }, [gameIdToDelete, setGames, lang]);

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
    setIsTransitioning(true);
    transitionSound.play();
    magicalSound.play();

    setTimeout(() => {
      setActiveGame(g);
      setIsTransitioning(false);
    }, 1500); // transition duration
  };

  const handleExitGame = () => {
    flipSound.play();
    setIsTransitioning(true);

    setTimeout(() => {
      setActiveGame(null);
      setScreen("library");
      setIsTransitioning(false);
    }, 1200);
  };

  // ==============================================================
  // RENDER SCREEN
  // ==============================================================
  const renderScreen = (): JSX.Element | null => {
    if (activeGame) {
      return <GameRouter game={activeGame} onExit={handleExitGame} />;
    }

    switch (screen) {
      case "dashboard":
        return (
          <Dashboard
            games={games}
            shows={shows}
            setScreen={setScreen}
            startNewGame={() => setScreen("creator")}
          />
        );

      case "library":
        return (
          <GameLibrary
            games={games}
            onPlay={handlePlayGame}
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
            onCreateSample={async () => {}}
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

      default:
        return (
          <Dashboard
            games={games}
            shows={shows}
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
      className={`dark flex h-screen bg-gradient-to-b from-[#0a0a0a] to-[#111827] text-text-primary transition-all duration-700 ${
        activeGame ? "overflow-hidden" : ""
      }`}
    >
      {/* 🟦 Sidebar — Hidden During Active Game */}
      {!activeGame && !isTransitioning && (
        <aside className="transition-opacity duration-700 ease-in-out">
          <Sidebar currentScreen={screen} setScreen={setScreen} />
        </aside>
      )}

      {/* 🎮 Main Area */}
      <main
        className={`flex-1 transition-all duration-700 ${
          activeGame ? "p-0" : "overflow-y-auto p-4 sm:p-6 md:p-8"
        }`}
      >
        <AnimatePresence>
          {isTransitioning && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center bg-black z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            >
              <h1 className="text-6xl text-yellow-400 font-bold animate-pulse drop-shadow-lg">
                🎬 ¡El Juego Comienza!
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
    </div>
  );
};

export default App;
