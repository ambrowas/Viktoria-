import React from "react";
import type { Game, Show } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface ShowPlayerProps {
  shows: Show[];
  games: Game[];
  onPlayGame: (game: Game) => void;
  onStartShow: (show: Show, initialState?: any) => void;
  setScreen: (screen: "dashboard" | "library" | "creator" | "shows" | "play") => void;
}

const findFirstGameInShow = (show: Show, games: Game[]): Game | null => {
  for (const round of show.rounds) {
    for (const gameId of round.gameIds) {
      const game = games.find((g) => g.id === gameId);
      if (game) return game;
    }
  }
  return null;
};

const ShowPlayer: React.FC<ShowPlayerProps> = ({ shows, games, onPlayGame, onStartShow, setScreen }) => {
  const { lang } = useLanguage();

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Play a Show</h1>
          <p className="text-text-secondary">
            Pick a configured show and jump straight into the first game.
          </p>
        </div>
        <button
          onClick={() => setScreen("shows")}
          className="px-4 py-2 rounded-lg border border-base-300 bg-base-200 text-sm"
        >
          Manage Shows
        </button>
      </header>

      {shows.length === 0 ? (
        <div className="bg-base-200 border border-base-300 rounded-xl p-6 text-text-secondary">
          No shows configured yet. Create one in the Show Manager first.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shows.map((show) => {
            const firstGame = findFirstGameInShow(show, games);
            const totalGames = show.rounds.reduce((acc, round) => acc + round.gameIds.length, 0);

            // Check for saved show state
            const savedStateStr = window.localStorage.getItem(`viktoria-show-resume-${show.id}`);
            let savedState = null;
            if (savedStateStr) {
              try {
                savedState = JSON.parse(savedStateStr);
              } catch (e) {
                console.error("Failed to parse saved show state", e);
              }
            }

            return (
              <div
                key={show.id}
                className="bg-base-200 border border-base-300 rounded-xl p-4 flex flex-col gap-3"
              >
                <div>
                  <h2 className="text-xl font-semibold">{show.name || "Untitled Show"}</h2>
                  <p className="text-xs text-text-secondary mt-1">
                    {show.description || "No description provided."}
                  </p>
                </div>
                <div className="flex gap-4 text-xs text-text-secondary">
                  <span>{show.settings.numTeams} teams</span>
                  <span>{show.settings.totalRounds} rounds</span>
                  <span>{totalGames} games</span>
                </div>
                <div className="flex justify-between items-center mt-auto gap-4">
                  <span className="text-xs text-text-secondary truncate">
                    {firstGame ? `Starts with: ${firstGame.name}` : "No games assigned"}
                  </span>
                  <div className="flex gap-2 flex-shrink-0">
                    {savedState && (
                      <button
                        onClick={() => onStartShow(show, savedState)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        {lang === "es" ? "Continuar Show" : "Continue Show"}
                      </button>
                    )}
                    <button
                      onClick={() => onStartShow(show)}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-brand-primary text-black hover:bg-brand-secondary transition-colors"
                    >
                      {lang === "es" ? "Iniciar Show" : "Play Show"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShowPlayer;

