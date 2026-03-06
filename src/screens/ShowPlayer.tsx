import React from "react";
import type { Game, Show } from "@/types";

interface ShowPlayerProps {
  shows: Show[];
  games: Game[];
  onPlayGame: (game: Game) => void;
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

const ShowPlayer: React.FC<ShowPlayerProps> = ({ shows, games, onPlayGame, setScreen }) => {
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
                <div className="flex justify-between items-center mt-auto">
                  <span className="text-xs text-text-secondary">
                    {firstGame ? `Starts with: ${firstGame.name}` : "No games assigned"}
                  </span>
                  <button
                    disabled={!firstGame}
                    onClick={() => firstGame && onPlayGame(firstGame)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      firstGame
                        ? "bg-brand-primary text-black hover:bg-brand-secondary"
                        : "bg-base-300 text-text-secondary cursor-not-allowed"
                    }`}
                  >
                    Play
                  </button>
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

