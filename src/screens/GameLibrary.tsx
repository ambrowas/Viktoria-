import React, { useState, useMemo, useEffect } from "react";
import { Game, GameType } from "@/types";
import { Play, Edit2, Trash2, Filter, Search, PlusCircle, Zap } from "lucide-react";

interface LibraryProps {
  games: Game[];
  onPlay: (game: Game) => void;
  onQuickPlay: (game: Game, numTeams: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

const typeColors: Record<string, string> = {
  MEMORY: "#2b6cb0",
  HANGMAN: "#d69e2e",
  DEFINITIONS: "#38a169",
  JEOPARDY: "#805ad5",
  FAMILY_FEUD: "#dd6b20",
  CHAIN_REACTION: "#3182ce",
  PYRAMID: "#b7791f",
  ROSCO: "#4299e1",
  WHEEL_OF_FORTUNE: "#facc15",  // 🟡 bright yellow
  PRICE_IS_RIGHT: "#fbbf24",    // 🟠 gold tone
  LOTTERY: "#10b981",           // 🟢 emerald
  UNKNOWN: "#718096",
};

const GameLibrary: React.FC<LibraryProps> = ({
  games,
  onPlay,
  onQuickPlay,
  onEdit,
  onDelete,
  onCreateNew,
}) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | GameType>("ALL");
  const [visibleCount, setVisibleCount] = useState(9);

  // 🏁 Quick Play state
  const [quickPlayGame, setQuickPlayGame] = useState<Game | null>(null);
  const [quickPlayTeams, setQuickPlayTeams] = useState(2);

  // 🧠 Log once when games update
  useEffect(() => {
    console.log("📚 [GameLibrary] Loaded games:", games.length);
    console.table(
      games.map((g) => ({
        id: g.id,
        name: g.name,
        type: g.type || "⚠️ undefined",
        description: g.description,
      }))
    );
  }, [games]);

  // 🔍 Filtered + searched games
  const filteredGames = useMemo(() => {
    return games
      .filter((g) => (filter === "ALL" ? true : g.type === filter))
      .filter((g) => g.name?.toLowerCase().includes(search.toLowerCase()));
  }, [games, filter, search]);

  const visibleGames = filteredGames.slice(0, visibleCount);

  return (
    <div className="p-8 text-white">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-semibold tracking-wide">🎮 Colección</h1>

        <div className="flex gap-3 items-center w-full md:w-auto">
          {/* Filter dropdown */}
          <div className="flex items-center bg-[#1f2638] border border-[#2f3b57] rounded-md px-3 py-2">
            <Filter className="text-gray-400 mr-2" size={16} />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-transparent outline-none text-sm text-gray-200"
            >
              <option value="ALL">Todos</option>
              {Object.values(GameType).map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="flex items-center bg-[#1f2638] border border-[#2f3b57] rounded-md px-3 py-2 w-full md:w-64">
            <Search className="text-gray-400 mr-2" size={16} />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm text-gray-200 w-full"
            />
          </div>

          {/* New Game button */}
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-bold transition"
          >
            <PlusCircle size={18} /> Nuevo Juego
          </button>
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleGames.map((game) => {
          const safeType = game.type || "UNKNOWN";
          const accent = typeColors[safeType] || typeColors.UNKNOWN;

          return (
            <div
              key={game.id}
              className="relative bg-[#1b2132] border border-[#2f3b57] p-5 rounded-lg overflow-hidden transition-transform transform hover:-translate-y-1 hover:shadow-lg hover:shadow-[#0a0e16]/50"
              style={{ borderTop: `3px solid ${accent}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-medium truncate">
                  {game.name || "Sin título"}
                </h2>
                <span
                  className="text-xs uppercase tracking-wide font-medium"
                  style={{ color: accent }}
                >
                  {safeType.replace(/_/g, " ")}
                </span>
              </div>

              <p className="text-sm text-gray-400 mb-5 truncate">
                {game.description || "Sin descripción disponible."}
              </p>

              {/* Action buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => onPlay(game)}
                  title="Jugar"
                  className="p-2 border border-gray-600 rounded-md hover:border-[#3182ce] hover:text-[#3182ce] transition"
                >
                  <Play size={16} />
                </button>
                <button
                  onClick={() => setQuickPlayGame(game)}
                  title="Partida Rápida (con Equipos)"
                  className="p-2 border border-gray-600 rounded-md hover:border-[#facc15] hover:text-[#facc15] transition"
                >
                  <Zap size={16} />
                </button>
                <button
                  onClick={() => onEdit(game.id)}
                  title="Editar"
                  className="p-2 border border-gray-600 rounded-md hover:border-[#b7791f] hover:text-[#b7791f] transition"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDelete(game.id)}
                  title="Eliminar"
                  className="p-2 border border-gray-600 rounded-md hover:border-[#c53030] hover:text-[#c53030] transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Warning banner if data inconsistent */}
              {!game.type && (
                <div className="absolute top-0 right-0 bg-red-600 text-xs px-2 py-1 rounded-bl-lg font-bold">
                  ⚠ No type
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {visibleCount < filteredGames.length && (
        <div className="text-center mt-10">
          <button
            onClick={() => setVisibleCount((v) => v + 9)}
            className="px-6 py-2 border border-[#2f3b57] rounded-md text-sm text-gray-300 hover:bg-[#2b3247] transition"
          >
            Cargar más
          </button>
        </div>
      )}

      {/* 🏁 Quick Play Team Selection Modal */}
      {quickPlayGame && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-[#1b2132] border border-[#2f3b57] rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <h3 className="text-2xl font-bold mb-2 text-white">⚡️ Partida Rápida</h3>
            <p className="text-gray-400 text-sm mb-6">
              Selecciona cuántos equipos participarán en "{quickPlayGame.name}"
            </p>

            <div className="flex justify-center gap-4 mb-8">
              {[2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setQuickPlayTeams(num)}
                  className={`w-14 h-14 rounded-xl font-bold text-xl transition-all border-2 ${quickPlayTeams === num
                      ? "bg-yellow-400 border-yellow-300 text-black scale-110 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
                      : "bg-[#2b3247] border-[#2f3b57] text-gray-400 hover:border-gray-500"
                    }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  onQuickPlay(quickPlayGame, quickPlayTeams);
                  setQuickPlayGame(null);
                }}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl transition-colors shadow-lg"
              >
                ¡Comenzar Juego!
              </button>
              <button
                onClick={() => setQuickPlayGame(null)}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLibrary;

