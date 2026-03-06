import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { Game, Player, Show, ShowRound, Team } from "@/types";
import { GameType } from "@/types";

interface ShowManagerProps {
  shows: Show[];
  games: Game[];
  onSaveShow: (show: Show) => Promise<void>;
  onDeleteShow: (showId: string) => Promise<void>;
}

type WizardStep = 0 | 1 | 2 | 3;

const STEP_LABELS = ["Basics", "Teams", "Rounds", "Review"] as const;
const TEAM_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#14b8a6"];
const TEAM_EMOJIS = ["🔥", "⚡️", "🌟", "🧠", "🚀", "🎯", "🎵", "🎮", "🦊", "🐼"];
const GAME_TYPE_FILTERS: Array<"ALL" | GameType> = ["ALL", ...Object.values(GameType)] as Array<
  "ALL" | GameType
>;

const DEFAULT_SETTINGS = {
  numTeams: 2,
  playersPerTeam: 3,
  totalRounds: 3,
  notes: "",
};

const uuid = () => crypto.randomUUID();

const createPlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, index) => ({
    id: uuid(),
    name: `Player ${index + 1}`,
  }));

const createTeam = (index: number, playersPerTeam: number): Team => ({
  id: uuid(),
  name: `Team ${index + 1}`,
  score: 0,
  color: TEAM_COLORS[index % TEAM_COLORS.length],
  emoji: TEAM_EMOJIS[index % TEAM_EMOJIS.length],
  players: createPlayers(playersPerTeam),
});

const createRound = (index: number): ShowRound => ({
  id: uuid(),
  name: `Round ${index + 1}`,
  theme: "",
  order: index,
  gameIds: [],
});

const createEmptyShow = (): Show => ({
  id: uuid(),
  name: "",
  description: "",
  createdAt: new Date().toISOString(),
  settings: { ...DEFAULT_SETTINGS },
  teams: Array.from({ length: DEFAULT_SETTINGS.numTeams }, (_, index) =>
    createTeam(index, DEFAULT_SETTINGS.playersPerTeam)
  ),
  rounds: Array.from({ length: DEFAULT_SETTINGS.totalRounds }, (_, index) => createRound(index)),
});

const ensureTeams = (teams: Team[], numTeams: number, playersPerTeam: number): Team[] => {
  const next = [...teams];
  while (next.length < numTeams) next.push(createTeam(next.length, playersPerTeam));
  if (next.length > numTeams) next.splice(numTeams);
  return next.map((team, index) => {
    const players = [...team.players];
    while (players.length < playersPerTeam) {
      players.push({ id: uuid(), name: `Player ${players.length + 1}` });
    }
    if (players.length > playersPerTeam) players.splice(playersPerTeam);
    return { ...team, name: team.name || `Team ${index + 1}`, players };
  });
};

const ensureRounds = (rounds: ShowRound[], totalRounds: number): ShowRound[] => {
  const next = [...rounds];
  while (next.length < totalRounds) next.push(createRound(next.length));
  if (next.length > totalRounds) next.splice(totalRounds);
  return next.map((round, index) => ({ ...round, name: round.name || `Round ${index + 1}`, order: index }));
};

const computeAvailableGames = (rounds: ShowRound[], games: Game[]) => {
  const assigned = new Set(rounds.flatMap((round) => round.gameIds));
  return games.filter((game) => !assigned.has(game.id)).map((game) => game.id);
};

const ShowManager: React.FC<ShowManagerProps> = ({ shows, games, onSaveShow, onDeleteShow }) => {
  const [step, setStep] = useState<WizardStep>(0);
  const [selectedShowId, setSelectedShowId] = useState<string>(() => shows[0]?.id ?? "new");
  const [showDraft, setShowDraft] = useState<Show>(() => createEmptyShow());
  const [unassignedGameIds, setUnassignedGameIds] = useState<string[]>(() =>
    computeAvailableGames(createEmptyShow().rounds, games)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<"ALL" | GameType>("ALL");
  const [librarySearch, setLibrarySearch] = useState("");

  const selectedShow = useMemo(
    () => shows.find((show) => show.id === selectedShowId),
    [shows, selectedShowId]
  );

  useEffect(() => {
    if (selectedShowId !== "new" && !shows.some((show) => show.id === selectedShowId)) {
      setSelectedShowId(shows[0]?.id ?? "new");
    }
  }, [shows, selectedShowId]);

  useEffect(() => {
    if (selectedShowId === "new") {
      setShowDraft(createEmptyShow());
      setStep(0);
      return;
    }
    if (selectedShow) {
      const sanitizedTeams = ensureTeams(
        selectedShow.teams || [],
        selectedShow.settings?.numTeams || DEFAULT_SETTINGS.numTeams,
        selectedShow.settings?.playersPerTeam || DEFAULT_SETTINGS.playersPerTeam
      );
      const sanitizedRounds = ensureRounds(
        selectedShow.rounds || [],
        selectedShow.settings?.totalRounds || DEFAULT_SETTINGS.totalRounds
      );
      const hydrated: Show = {
        ...selectedShow,
        settings: {
          ...DEFAULT_SETTINGS,
          ...selectedShow.settings,
        },
        teams: sanitizedTeams,
        rounds: sanitizedRounds,
      };
      setShowDraft(hydrated);
      setStep(0);
    }
  }, [selectedShowId, selectedShow]);

  useEffect(() => {
    setUnassignedGameIds((prev) => {
      const available = computeAvailableGames(showDraft.rounds, games);
      const preserved = prev.filter((id) => available.includes(id));
      const remaining = available.filter((id) => !preserved.includes(id));
      return [...preserved, ...remaining];
    });
  }, [games, showDraft.rounds]);

  const gamesMap = useMemo(() => {
    const map = new Map<string, Game>();
    games.forEach((game) => map.set(game.id, game));
    return map;
  }, [games]);

  const filteredUnassignedGameIds = useMemo(() => {
    const term = librarySearch.trim().toLowerCase();
    return unassignedGameIds.filter((id) => {
      const game = gamesMap.get(id);
      if (!game) return false;
      if (libraryFilter !== "ALL" && game.type !== libraryFilter) return false;
      if (
        term &&
        !game.name.toLowerCase().includes(term) &&
        !(game.description || "").toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [unassignedGameIds, libraryFilter, librarySearch, gamesMap]);

  const updateSettings = (updates: Partial<Show["settings"]>) => {
    setShowDraft((prev) => {
      const settings = { ...prev.settings, ...updates };
      return {
        ...prev,
        settings,
        teams: ensureTeams(prev.teams, settings.numTeams, settings.playersPerTeam),
        rounds: ensureRounds(prev.rounds, settings.totalRounds),
      };
    });
  };

  const updateTeam = (teamIndex: number, updates: Partial<Team>) => {
    setShowDraft((prev) => {
      const teams = [...prev.teams];
      teams[teamIndex] = { ...teams[teamIndex], ...updates };
      return { ...prev, teams };
    });
  };

  const updatePlayer = (teamIndex: number, playerIndex: number, name: string) => {
    setShowDraft((prev) => {
      const teams = [...prev.teams];
      const players = [...teams[teamIndex].players];
      players[playerIndex] = { ...players[playerIndex], name };
      teams[teamIndex] = { ...teams[teamIndex], players };
      return { ...prev, teams };
    });
  };

  const updateRound = (roundIndex: number, updates: Partial<ShowRound>) => {
    setShowDraft((prev) => {
      const rounds = [...prev.rounds];
      rounds[roundIndex] = { ...rounds[roundIndex], ...updates };
      return { ...prev, rounds };
    });
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;

    const sourceBucket = source.droppableId;
    const destBucket = destination.droppableId;
    if (sourceBucket === destBucket) {
      if (sourceBucket === "pool") {
        setUnassignedGameIds((prev) => {
          const reordered = [...prev];
          const [removed] = reordered.splice(source.index, 1);
          reordered.splice(destination.index, 0, removed);
          return reordered;
        });
      } else if (sourceBucket.startsWith("round-")) {
        const roundIndex = parseInt(sourceBucket.replace("round-", ""), 10);
        setShowDraft((prev) => {
          const rounds = [...prev.rounds];
          const gamesInRound = [...rounds[roundIndex].gameIds];
          const [removed] = gamesInRound.splice(source.index, 1);
          gamesInRound.splice(destination.index, 0, removed);
          rounds[roundIndex] = { ...rounds[roundIndex], gameIds: gamesInRound };
          return { ...prev, rounds };
        });
      }
      return;
    }

    if (sourceBucket === "pool" && destBucket.startsWith("round-")) {
      const destinationRound = parseInt(destBucket.replace("round-", ""), 10);
      const movedGameId = unassignedGameIds[source.index];
      setUnassignedGameIds((prev) => {
        const next = [...prev];
        next.splice(source.index, 1);
        return next;
      });
      setShowDraft((prev) => {
        const rounds = [...prev.rounds];
        const gamesInRound = [...rounds[destinationRound].gameIds];
        gamesInRound.splice(destination.index, 0, movedGameId);
        rounds[destinationRound] = { ...rounds[destinationRound], gameIds: gamesInRound };
        return { ...prev, rounds };
      });
      return;
    }

    if (destBucket === "pool" && sourceBucket.startsWith("round-")) {
      const sourceRound = parseInt(sourceBucket.replace("round-", ""), 10);
      let removedId = "";
      setShowDraft((prev) => {
        const rounds = [...prev.rounds];
        const gamesInRound = [...rounds[sourceRound].gameIds];
        [removedId] = gamesInRound.splice(source.index, 1);
        rounds[sourceRound] = { ...rounds[sourceRound], gameIds: gamesInRound };
        return { ...prev, rounds };
      });
      if (removedId) {
        setUnassignedGameIds((prev) => {
          const next = [...prev];
          next.splice(destination.index, 0, removedId);
          return next;
        });
      }
      return;
    }

    if (sourceBucket.startsWith("round-") && destBucket.startsWith("round-")) {
      const sourceRound = parseInt(sourceBucket.replace("round-", ""), 10);
      const destinationRound = parseInt(destBucket.replace("round-", ""), 10);
      setShowDraft((prev) => {
        const rounds = [...prev.rounds];
        const fromGames = [...rounds[sourceRound].gameIds];
        const [moved] = fromGames.splice(source.index, 1);
        const toGames = [...rounds[destinationRound].gameIds];
        toGames.splice(destination.index, 0, moved);
        rounds[sourceRound] = { ...rounds[sourceRound], gameIds: fromGames };
        rounds[destinationRound] = { ...rounds[destinationRound], gameIds: toGames };
        return { ...prev, rounds };
      });
    }
  };

  const renderLibraryGame = (gameId: string, index: number) => {
    const game = gamesMap.get(gameId);
    if (!game) return null;

    return (
      <Draggable draggableId={gameId} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`rounded-lg border p-3 bg-base-100 flex flex-col gap-1 cursor-move transition ${
              snapshot.isDragging
                ? "border-brand-primary bg-brand-primary/10 shadow-lg"
                : "border-base-300 hover:border-brand-primary/70"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm">{game.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-text-secondary">
                {game.type.replace(/_/g, " ")}
              </span>
            </div>
            {game.description && (
              <p className="text-xs text-text-secondary">{game.description}</p>
            )}
          </div>
        )}
      </Draggable>
    );
  };

  const renderRoundGame = (gameId: string, index: number) => {
    const game = gamesMap.get(gameId);
    if (!game) return null;

    return (
      <Draggable draggableId={gameId} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`rounded-lg border p-3 bg-base-100 flex items-start justify-between gap-2 cursor-move transition ${
              snapshot.isDragging
                ? "border-brand-primary bg-brand-primary/10 shadow-lg"
                : "border-base-300 hover:border-brand-primary/70"
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {index + 1}. {game.name}
              </p>
              {game.description && (
                <p className="text-xs text-text-secondary mt-1">{game.description}</p>
              )}
            </div>
            <span className="text-[10px] uppercase tracking-wide text-text-secondary whitespace-nowrap">
              {game.type.replace(/_/g, " ")}
            </span>
          </div>
        )}
      </Draggable>
    );
  };

  const handleSaveShowInternal = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const payload: Show = { ...showDraft, updatedAt: new Date().toISOString() };
      await onSaveShow(payload);
      setStatusMessage("Show saved!");
      setSelectedShowId(payload.id);
    } catch (error) {
      console.error(error);
      setStatusMessage("Failed to save show. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShowInternal = async (showId: string) => {
    if (!window.confirm("Delete this show permanently?")) return;
    await onDeleteShow(showId);
    if (selectedShowId === showId) setSelectedShowId("new");
  };

  const goToStep = (value: WizardStep) => setStep(value);
  const goNext = () => setStep(Math.min(3, (step + 1)) as WizardStep);
  const goBack = () => setStep(Math.max(0, (step - 1)) as WizardStep);

  const currentStepValid = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(showDraft.name.trim());
      case 1:
        return showDraft.teams.every(
          (team) =>
            team.name.trim().length > 0 &&
            team.players.every((player) => player.name.trim().length > 0)
        );
      case 2:
        return showDraft.rounds.every((round) => round.name.trim().length > 0);
      case 3:
      default:
        return true;
    }
  }, [step, showDraft]);

  const renderBasicsStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block font-semibold mb-2">Show Name</label>
        <input
          type="text"
          value={showDraft.name}
          onChange={(e) => setShowDraft({ ...showDraft, name: e.target.value })}
          className="w-full rounded-lg p-3 bg-base-200 border border-base-300"
          placeholder="Saturday Night Spectacular"
        />
      </div>
      <div>
        <label className="block font-semibold mb-2">Description</label>
        <textarea
          value={showDraft.description || ""}
          onChange={(e) => setShowDraft({ ...showDraft, description: e.target.value })}
          className="w-full rounded-lg p-3 bg-base-200 border border-base-300"
          placeholder="Share a quick overview for hosts or producers."
          rows={3}
        />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block font-semibold mb-1">Number of Teams</label>
          <input
            type="number"
            min={1}
            max={6}
            value={showDraft.settings.numTeams}
            onChange={(e) =>
              updateSettings({ numTeams: Math.max(1, Math.min(6, Number(e.target.value))) })
            }
            className="w-full rounded-lg p-3 bg-base-200 border border-base-300"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Players per Team</label>
          <input
            type="number"
            min={1}
            max={6}
            value={showDraft.settings.playersPerTeam}
            onChange={(e) =>
              updateSettings({ playersPerTeam: Math.max(1, Math.min(6, Number(e.target.value))) })
            }
            className="w-full rounded-lg p-3 bg-base-200 border border-base-300"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Number of Rounds</label>
          <input
            type="number"
            min={1}
            max={10}
            value={showDraft.settings.totalRounds}
            onChange={(e) =>
              updateSettings({ totalRounds: Math.max(1, Math.min(10, Number(e.target.value))) })
            }
            className="w-full rounded-lg p-3 bg-base-200 border border-base-300"
          />
        </div>
      </div>
      <div>
        <label className="block font-semibold mb-2">Notes</label>
        <textarea
          value={showDraft.settings.notes || ""}
          onChange={(e) => updateSettings({ notes: e.target.value })}
          className="w-full rounded-lg p-3 bg-base-200 border border-base-300"
          placeholder="Add reminders or pacing notes."
          rows={3}
        />
      </div>
    </div>
  );

  const renderTeamsStep = () => (
    <div className="grid gap-4">
      {showDraft.teams.map((team, teamIndex) => (
        <div key={team.id} className="bg-base-200 rounded-xl p-4 space-y-4 border border-base-300">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[220px]">
              <label className="block font-semibold mb-1">Team Name</label>
              <input
                type="text"
                value={team.name}
                onChange={(e) => updateTeam(teamIndex, { name: e.target.value })}
                className="w-full rounded-lg p-3 bg-base-100 border border-base-300"
              />
            </div>
            <div className="min-w-[160px]">
              <label className="block font-semibold mb-1">Emoji</label>
              <input
                type="text"
                maxLength={2}
                value={team.emoji || ""}
                onChange={(e) => updateTeam(teamIndex, { emoji: e.target.value })}
                className="w-full rounded-lg p-3 bg-base-100 border border-base-300 text-center"
                placeholder="Type emoji"
              />
              <p className="text-xs text-text-secondary mt-2 uppercase tracking-wide">Quick Picks</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {TEAM_EMOJIS.map((emoji) => (
                  <button
                    key={`${team.id}-emoji-${emoji}`}
                    type="button"
                    aria-label={`Select emoji ${emoji}`}
                    className={`h-9 w-9 rounded-full border bg-base-100 text-lg flex items-center justify-center transition ${
                      team.emoji === emoji
                        ? "border-brand-primary text-brand-primary shadow-md"
                        : "border-base-300 hover:border-brand-primary/60"
                    }`}
                    onClick={() => updateTeam(teamIndex, { emoji })}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Clear emoji"
                  className="px-3 py-1 rounded-full border border-dashed border-base-300 text-xs text-text-secondary hover:text-brand-primary"
                  onClick={() => updateTeam(teamIndex, { emoji: "" })}
                >
                  Clear
                </button>
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Color</label>
              <input
                type="color"
                value={team.color || "#ffffff"}
                onChange={(e) => updateTeam(teamIndex, { color: e.target.value })}
                className="w-20 h-12 p-1 rounded-lg bg-base-100 border border-base-300"
              />
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2 text-sm uppercase tracking-wide text-text-secondary">
              Players
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {team.players.map((player, playerIndex) => (
                <input
                  key={player.id}
                  type="text"
                  value={player.name}
                  onChange={(e) => updatePlayer(teamIndex, playerIndex, e.target.value)}
                  className="rounded-lg p-3 bg-base-100 border border-base-300"
                  placeholder={`Player ${playerIndex + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderRoundsLibrary = () => {
    const emptyMessage =
      unassignedGameIds.length === 0
        ? "All available games have been scheduled."
        : "No games match your filters.";

    return (
      <div className="bg-base-200 border border-base-300 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Game Library</h2>
            <p className="text-xs text-text-secondary">Drag games into rounds.</p>
          </div>
          <span className="text-[11px] uppercase tracking-wide text-text-secondary bg-base-100 px-2 py-1 rounded-lg">
            {filteredUnassignedGameIds.length} ready
          </span>
        </div>
        <div className="space-y-2">
          <label className="block text-xs uppercase font-semibold text-text-secondary">Category</label>
          <select
            value={libraryFilter}
            onChange={(e) => setLibraryFilter(e.target.value as "ALL" | GameType)}
            className="w-full rounded-lg p-2.5 bg-base-100 border border-base-300 text-sm"
          >
            {GAME_TYPE_FILTERS.map((type) => (
              <option key={`filter-${type}`} value={type}>
                {type === "ALL" ? "All Types" : type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-xs uppercase font-semibold text-text-secondary">Search</label>
          <input
            type="text"
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            placeholder="Search games..."
            className="w-full rounded-lg p-2.5 bg-base-100 border border-base-300 text-sm"
          />
        </div>
        <Droppable droppableId="pool">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-2 min-h-[220px] rounded-lg p-3 transition ${
                snapshot.isDraggingOver ? "bg-base-100/80" : "bg-base-100"
              }`}
            >
              {filteredUnassignedGameIds.length === 0 ? (
                <div className="text-sm text-text-secondary text-center py-6">{emptyMessage}</div>
              ) : (
                filteredUnassignedGameIds.map((gameId, index) => renderLibraryGame(gameId, index))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  const renderRoundsStep = () => (
    <div className="grid lg:grid-cols-[320px,1fr] gap-5">
      {renderRoundsLibrary()}
      <div className="space-y-4">
        {showDraft.rounds.map((round, roundIndex) => (
          <div key={round.id} className="bg-base-200 rounded-xl p-4 border border-base-300 space-y-3">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block font-semibold mb-1">Round Name</label>
                <input
                  type="text"
                  value={round.name}
                  onChange={(e) => updateRound(roundIndex, { name: e.target.value })}
                  className="w-full rounded-lg p-3 bg-base-100 border border-base-300"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block font-semibold mb-1">Theme / Notes</label>
                <input
                  type="text"
                  value={round.theme || ""}
                  onChange={(e) => updateRound(roundIndex, { theme: e.target.value })}
                  className="w-full rounded-lg p-3 bg-base-100 border border-base-300"
                />
              </div>
            </div>

            <Droppable droppableId={`round-${roundIndex}`}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[120px] rounded-lg border-2 border-dashed ${
                    snapshot.isDraggingOver ? "border-brand-primary bg-brand-primary/5" : "border-base-300"
                  } p-3 space-y-2`}
                >
                  {round.gameIds.length === 0 && (
                    <div className="text-sm text-text-secondary text-center py-6">Drop games here.</div>
                  )}
                  {round.gameIds.map((gameId, index) => renderRoundGame(gameId, index))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="bg-base-200 rounded-xl p-4 border border-base-300">
        <h3 className="text-xl font-semibold mb-3">Show Summary</h3>
        <p className="text-text-secondary">{showDraft.description || "No description provided."}</p>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="p-3 rounded-lg bg-base-100 border border-base-300">
            <p className="text-sm text-text-secondary uppercase">Teams</p>
            <p className="text-2xl font-bold">{showDraft.settings.numTeams}</p>
          </div>
          <div className="p-3 rounded-lg bg-base-100 border border-base-300">
            <p className="text-sm text-text-secondary uppercase">Players / Team</p>
            <p className="text-2xl font-bold">{showDraft.settings.playersPerTeam}</p>
          </div>
          <div className="p-3 rounded-lg bg-base-100 border border-base-300">
            <p className="text-sm text-text-secondary uppercase">Rounds</p>
            <p className="text-2xl font-bold">{showDraft.settings.totalRounds}</p>
          </div>
        </div>
      </div>
      <div className="bg-base-200 rounded-xl p-4 border border-base-300 space-y-2">
        <h3 className="text-lg font-semibold">Teams & Players</h3>
        {showDraft.teams.map((team) => (
          <div key={team.id} className="flex flex-col gap-1 border border-base-300 rounded-lg p-3 bg-base-100">
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                {team.emoji ? `${team.emoji} ` : ""}
                {team.name}
              </p>
              {team.color && (
                <span className="inline-flex items-center gap-2 text-xs text-text-secondary">
                  Color
                  <span className="h-4 w-4 rounded-full border border-white" style={{ backgroundColor: team.color }} />
                </span>
              )}
            </div>
            <p className="text-sm text-text-secondary">
              Players: {team.players.map((player) => player.name).join(", ")}
            </p>
          </div>
        ))}
      </div>
      <div className="bg-base-200 rounded-xl p-4 border border-base-300 space-y-3">
        <h3 className="text-lg font-semibold">Round Schedule</h3>
        {showDraft.rounds.map((round) => (
          <div key={round.id} className="border border-base-300 rounded-lg p-3 bg-base-100">
            <p className="font-semibold text-brand-primary">{round.name}</p>
            {round.theme && <p className="text-sm text-text-secondary mb-2">{round.theme}</p>}
            {round.gameIds.length === 0 ? (
              <p className="text-sm text-text-secondary">No games assigned.</p>
            ) : (
              <ul className="list-disc list-inside text-sm text-text-secondary">
                {round.gameIds.map((id) => {
                  const game = gamesMap.get(id);
                  return <li key={id}>{game ? game.name : "Removed game"}</li>;
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return renderBasicsStep();
      case 1:
        return renderTeamsStep();
      case 2:
        return renderRoundsStep();
      case 3:
      default:
        return renderReviewStep();
    }
  };

  const renderShowSidebar = () => (
    <aside className="bg-base-200 border border-base-300 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Shows</h2>
        <button
          className="text-sm text-brand-primary font-semibold"
          onClick={() => setSelectedShowId("new")}
        >
          + New
        </button>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {shows.length === 0 && (
          <div className="text-sm text-text-secondary">No shows yet. Create one to begin.</div>
        )}
        {shows.map((show) => (
          <div
            key={show.id}
            className={`p-3 rounded-lg border flex items-start justify-between gap-2 ${
              selectedShowId === show.id ? "border-brand-primary bg-brand-primary/10" : "border-base-300"
            }`}
          >
            <button onClick={() => setSelectedShowId(show.id)} className="text-left flex-1">
              <p className="font-semibold">{show.name || "Untitled show"}</p>
              <p className="text-xs text-text-secondary">
                {show.teams.length} teams · {show.rounds.length} rounds
              </p>
            </button>
            <button
              className="text-xs text-red-400"
              onClick={() => handleDeleteShowInternal(show.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </aside>
  );

  const stepContent =
    step === 2 ? (
      <DragDropContext onDragEnd={handleDragEnd}>{renderRoundsStep()}</DragDropContext>
    ) : (
      renderStep()
    );

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Show Manager</h1>
          <p className="text-text-secondary">
            Build the perfect run-of-show by tailoring teams, rounds, and games.
          </p>
        </div>
        {statusMessage && <span className="text-sm text-brand-primary">{statusMessage}</span>}
      </header>

      <div className="grid lg:grid-cols-[300px,1fr] gap-6">
        {renderShowSidebar()}

        <section className="bg-base-200 border border-base-300 rounded-xl p-6 space-y-6">
          <div className="flex gap-3 flex-wrap">
            {STEP_LABELS.map((label, index) => (
              <button
                key={label}
                onClick={() => goToStep(index as WizardStep)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                  step === index
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-base-100 border-base-300 text-text-secondary"
                }`}
              >
                <span className="font-semibold">{index + 1}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div>{stepContent}</div>

          <div className="flex justify-between items-center pt-4 border-t border-base-300">
            <button
              onClick={goBack}
              disabled={step === 0}
              className={`px-4 py-2 rounded-lg border ${
                step === 0 ? "opacity-50 cursor-not-allowed" : "border-base-300"
              }`}
            >
              Back
            </button>
            {step < 3 ? (
              <button
                onClick={goNext}
                disabled={!currentStepValid}
                className={`px-6 py-2 rounded-lg font-semibold ${
                  currentStepValid
                    ? "bg-brand-primary text-white"
                    : "bg-base-300 text-text-secondary cursor-not-allowed"
                }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSaveShowInternal}
                disabled={isSaving || !currentStepValid}
                className={`px-6 py-2 rounded-lg font-semibold ${
                  !isSaving && currentStepValid
                    ? "bg-brand-primary text-white"
                    : "bg-base-300 text-text-secondary cursor-not-allowed"
                }`}
              >
                {isSaving ? "Saving..." : "Save Show"}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ShowManager;
