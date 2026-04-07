import React, { useState, useMemo, useEffect } from "react";
import { Game, GameType, Team } from "@/types";
import { Play, Edit2, Trash2, Filter, Search, PlusCircle, Zap } from "lucide-react";
import TeamIcon from "@/components/TeamIcon";

interface LibraryProps {
  games: Game[];
  onPlay: (game: Game) => void;
  onQuickPlay: (game: Game, teams: Team[]) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

const TEAM_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#14b8a6"];
const TEAM_ICONS = ["flame", "zap", "star", "brain", "rocket", "target", "music", "gamepad", "trophy", "crown"];

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
  const [quickPlayStep, setQuickPlayStep] = useState<1 | 2>(1);
  const [quickPlayTeams, setQuickPlayTeams] = useState(2);
  const [draftTeams, setDraftTeams] = useState<Team[]>([]);

  const handleOpenQuickPlay = (game: Game) => {
    setQuickPlayGame(game);
    setQuickPlayStep(1);
    setQuickPlayTeams(2);
    setDraftTeams(generateTeams(2));
  };

  const generateTeams = (count: number): Team[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: crypto.randomUUID(),
      name: `Equipo ${i + 1}`,
      score: 0,
      color: TEAM_COLORS[i % TEAM_COLORS.length],
      emoji: TEAM_ICONS[i % TEAM_ICONS.length],
      players: [],
    }));
  };

  const handleSetQuickPlayTeams = (num: number) => {
    setQuickPlayTeams(num);
    setDraftTeams(generateTeams(num));
  };

  const updateDraftTeam = (index: number, updates: Partial<Team>) => {
    setDraftTeams((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

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
                  onClick={() => handleOpenQuickPlay(game)}
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
          <div className="bg-[#1b2132] border border-[#2f3b57] rounded-2xl shadow-2xl p-8 max-w-lg w-full">
            
            {quickPlayStep === 1 ? (
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2 text-white">⚡️ Partida Rápida</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Selecciona cuántos equipos participarán en "{quickPlayGame.name}"
                </p>

                <div className="flex justify-center gap-4 mb-8">
                  {[2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleSetQuickPlayTeams(num)}
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
                    onClick={() => setQuickPlayStep(2)}
                    className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl transition-colors shadow-lg"
                  >
                    Siguiente
                  </button>
                  <button
                    onClick={() => setQuickPlayGame(null)}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-left">
                <h3 className="text-xl font-bold mb-1 text-white">Configurar Equipos</h3>
                <p className="text-gray-400 text-xs mb-4">Personaliza los nombres, colores e iconos de los equipos.</p>
                
                <div className="flex flex-col gap-3 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {draftTeams.map((team, idx) => (
                    <div key={team.id} className="bg-[#2b3247] border border-[#2f3b57] p-3 rounded-xl flex items-center gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <div 
                          className="w-8 h-8 rounded flex items-center justify-center shrink-0 border"
                          style={{ borderColor: team.color, color: team.color, backgroundColor: `${team.color}15` }}
                        >
                          <TeamIcon iconName={team.emoji} className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          value={team.name}
                          onChange={(e) => updateDraftTeam(idx, { name: e.target.value })}
                          className="w-full bg-[#1b2132] border border-[#2f3b57] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gray-400"
                          placeholder={`Equipo ${idx + 1}`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={team.emoji || ""}
                          onChange={(e) => updateDraftTeam(idx, { emoji: e.target.value })}
                          className="w-10 bg-[#1b2132] border border-[#2f3b57] rounded-lg px-1 py-1.5 text-xs text-center text-white focus:outline-none appearance-none"
                          style={{ textAlignLast: 'center' }}
                        >
                          {TEAM_ICONS.map((icon) => (
                            <option key={`${team.id}-icon-${icon}`} value={icon}>
                              {icon}
                            </option>
                          ))}
                        </select>
                        <input
                          type="color"
                          value={team.color || "#ffffff"}
                          onChange={(e) => updateDraftTeam(idx, { color: e.target.value })}
                          className="w-8 h-8 p-0 rounded-lg bg-transparent border-none cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setQuickPlayStep(1)}
                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors font-bold text-sm"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={() => {
                      onQuickPlay(quickPlayGame, draftTeams);
                      setQuickPlayGame(null);
                    }}
                    className="w-2/3 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl transition-colors shadow-lg"
                  >
                    ¡Comenzar Juego!
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLibrary;

