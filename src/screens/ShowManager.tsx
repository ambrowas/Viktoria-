import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { Game, Player, Show, ShowRound, Team } from "@/types";
import { GameType } from "@/types";
import { X, GripVertical, Trash2, Plus, Upload, Image as ImageIcon } from "lucide-react";
import TeamIcon from "@/components/TeamIcon";

interface ShowManagerProps {
  shows: Show[];
  games: Game[];
  onSaveShow: (show: Show) => Promise<void>;
  onDeleteShow: (showId: string) => Promise<void>;
}

type WizardStep = 0 | 1 | 2 | 3 | 4;

const STEP_LABELS = ["Basics", "Teams", "Rounds", "Sponsors & Credits", "Review"] as const;
const TEAM_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#14b8a6"];
const TEAM_ICONS = ["flame", "zap", "star", "brain", "rocket", "target", "music", "gamepad", "trophy", "crown", "Mask1", "Mask2", "Mask3", "Mask4"];
const GAME_TYPE_FILTERS: Array<"ALL" | GameType> = ["ALL", ...Object.values(GameType)] as Array<
  "ALL" | GameType
>;

const DEFAULT_SETTINGS = {
  numTeams: 2,
  playersPerTeam: 3,
  totalRounds: 3,
  notes: "",
  introMusic: "viktoria" as const,
  language: "es" as const,
  hostControl: "ipad" as const,
  playerControl: "ipad" as const,
  location: "",
  winnerTitle: "",
  thankYouMessage: "",
  organizers: [
    { id: "default-org-1", role: "Executive Producer", name: "Victor M. Ele Ela" },
    { id: "default-org-2", role: "Game Master & Host", name: "Nidmyake Mwakalyeye" },
    { id: "default-org-3", role: "Technical Director", name: "Antigravity AI Engineers" }
  ],
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
  emoji: TEAM_ICONS[index % TEAM_ICONS.length],
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
  sponsors: [],
  assets: [],
  themeImage: "",
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
          organizers: selectedShow.settings?.organizers || DEFAULT_SETTINGS.organizers,
        },
        teams: sanitizedTeams,
        rounds: sanitizedRounds,
        sponsors: selectedShow.sponsors || [],
        assets: selectedShow.assets || [],
        themeImage: selectedShow.themeImage || "",
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
    const { destination, source, type } = result;
    if (!destination) return;

    if (type === 'ROUND') {
      setShowDraft((prev) => {
        const rounds = [...prev.rounds];
        const [removed] = rounds.splice(source.index, 1);
        rounds.splice(destination.index, 0, removed);
        // Recalculate order indices
        return {
          ...prev,
          rounds: rounds.map((r, i) => ({ ...r, order: i }))
        };
      });
      return;
    }

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

  const removeGameFromRound = (roundIndex: number, gameIndex: number) => {
    setShowDraft((prev) => {
      const rounds = [...prev.rounds];
      const gamesInRound = [...rounds[roundIndex].gameIds];
      const [removedId] = gamesInRound.splice(gameIndex, 1);
      rounds[roundIndex] = { ...rounds[roundIndex], gameIds: gamesInRound };

      if (removedId) {
        setUnassignedGameIds((prevPool) => [removedId, ...prevPool]);
      }
      return { ...prev, rounds };
    });
  };

  const renderLibraryGame = (gameId: string, index: number) => {
    const game = gamesMap.get(gameId);
    if (!game) return null;

    return (
      <Draggable key={gameId} draggableId={gameId} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`rounded-lg border p-3 bg-base-100 flex flex-col gap-1 cursor-move transition ${snapshot.isDragging
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

  const renderRoundGame = (gameId: string, index: number, roundIndex: number) => {
    const game = gamesMap.get(gameId);
    if (!game) return null;

    return (
      <Draggable key={gameId} draggableId={gameId} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`rounded-lg border p-3 bg-base-100 flex items-start justify-between gap-2 cursor-move transition ${snapshot.isDragging
              ? "border-brand-primary bg-brand-primary/10 shadow-lg"
              : "border-base-300 hover:border-brand-primary/70"
              }`}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {game.name}
              </p>
              {game.description && (
                <p className="text-xs text-text-secondary mt-1">{game.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <span className="text-[10px] uppercase tracking-wide text-text-secondary whitespace-nowrap bg-base-200 px-1.5 py-0.5 rounded">
                {game.type.replace(/_/g, " ")}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeGameFromRound(roundIndex, index);
                }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors"
                title="Remove game from round"
              >
                <X size={14} />
              </button>
            </div>
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
  const goNext = () => setStep(Math.min(4, (step + 1)) as WizardStep);
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
      case 4:
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
          <label className="block font-semibold mb-1">Language</label>
          <select
            value={showDraft.settings.language || "es"}
            onChange={(e) => updateSettings({ language: e.target.value as any })}
            className="w-full rounded-lg p-3 bg-base-200 border border-base-300"
          >
            <option value="es">Español 🇬🇶</option>
            <option value="en">English 🇺🇸</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold mb-1">Host Mode</label>
          <select
            value={showDraft.settings.hostControl || "ipad"}
            onChange={(e) => updateSettings({ hostControl: e.target.value as any })}
            className="w-full rounded-lg p-3 bg-base-200 border border-base-300"
          >
            <option value="ipad">iPad Mode</option>
            <option value="manual">Manual Mode (PC)</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Player Mode</label>
          <select
            value={showDraft.settings.playerControl || "ipad"}
            onChange={(e) => updateSettings({ playerControl: e.target.value as any })}
            className="w-full rounded-lg p-3 bg-base-200 border border-base-300"
          >
            <option value="ipad">iPad Mode (Remote)</option>
            <option value="manual">Manual Mode (PC)</option>
          </select>
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

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold mb-2">📍 Location</label>
          <input
            type="text"
            value={showDraft.settings.location || ""}
            onChange={(e) => updateSettings({ location: e.target.value })}
            className="w-full rounded-lg p-3 bg-base-200 border border-base-300"
            placeholder="e.g. Malabo Conference Room A"
          />
          <p className="text-xs text-text-secondary mt-1">Shown in the Session Lobby instead of Remote Session.</p>
        </div>
        <div className="flex flex-col justify-center gap-3 bg-base-200 rounded-lg p-4 border border-base-300">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-semibold">🎵 Music in Lobby</p>
              <p className="text-xs text-text-secondary">Keep intro music playing during the Session Lobby.</p>
            </div>
            <div
              onClick={() => updateSettings({ musicInLobby: !(showDraft.settings.musicInLobby ?? true) })}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${(showDraft.settings.musicInLobby ?? true) ? "bg-brand-primary" : "bg-base-300"}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${(showDraft.settings.musicInLobby ?? true) ? "left-7" : "left-1"}`} />
            </div>
          </label>
        </div>
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
                {TEAM_ICONS.map((icon) => (
                  <button
                    key={`${team.id}-icon-${icon}`}
                    type="button"
                    aria-label={`Select icon ${icon}`}
                    className={`h-9 w-9 rounded-xl border bg-base-100 flex items-center justify-center transition ${team.emoji === icon
                      ? "border-brand-primary text-brand-primary shadow-md bg-brand-primary/10"
                      : "border-base-300 hover:border-brand-primary/60"
                      }`}
                    onClick={() => updateTeam(teamIndex, { emoji: icon })}
                  >
                    <TeamIcon iconName={icon} className="w-5 h-5" />
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
              className={`space-y-2 min-h-[220px] rounded-lg p-3 transition ${snapshot.isDraggingOver ? "bg-base-100/80" : "bg-base-100"
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
      <Droppable droppableId="rounds-list" type="ROUND">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
            {showDraft.rounds.map((round, roundIndex) => (
              <Draggable key={round.id} draggableId={round.id} index={roundIndex}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`bg-base-200 rounded-xl p-4 border border-base-300 space-y-3 relative ${snapshot.isDragging ? "shadow-2xl ring-2 ring-brand-primary z-50 bg-base-300" : ""
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Drag Handle */}
                      <div
                        {...provided.dragHandleProps}
                        className="mt-1 p-1 hover:bg-base-100 rounded cursor-grab active:cursor-grabbing text-text-secondary"
                      >
                        <GripVertical size={20} />
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap gap-4">
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs uppercase font-extrabold text-text-secondary mb-1">Round Name</label>
                            <input
                              type="text"
                              value={round.name}
                              onChange={(e) => updateRound(roundIndex, { name: e.target.value })}
                              className="w-full rounded-lg p-2.5 bg-base-100 border border-base-300 font-bold"
                            />
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs uppercase font-extrabold text-text-secondary mb-1">Theme / Notes</label>
                            <input
                              type="text"
                              value={round.theme || ""}
                              onChange={(e) => updateRound(roundIndex, { theme: e.target.value })}
                              className="w-full rounded-lg p-2.5 bg-base-100 border border-base-300"
                            />
                          </div>
                        </div>

                        <Droppable droppableId={`round-${roundIndex}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`min-h-[100px] rounded-lg border-2 border-dashed ${snapshot.isDraggingOver ? "border-brand-primary bg-brand-primary/5" : "border-base-300"
                                } p-3 space-y-2 transition-colors`}
                            >
                              {round.gameIds.length === 0 && (
                                <div className="text-sm text-text-secondary text-center py-6">Drop games here.</div>
                              )}
                              {round.gameIds.map((gameId, index) => renderRoundGame(gameId, index, roundIndex))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (path: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        if (window.electronAPI) {
          const relativePath = await window.electronAPI.invoke("save-data-url", base64);
          if (relativePath) {
            callback(relativePath);
            return;
          }
        }
      } catch (err) {
        console.error("Electron save-data-url failed, using data-url fallback:", err);
      }
      callback(base64);
    };
    reader.readAsDataURL(file);
  };

  const addSponsor = () => {
    const newSponsor = {
      id: uuid(),
      name: "",
      url: "",
      size: "medium" as const,
      placement: "header" as const,
      screen: "both" as const,
    };
    setShowDraft(prev => ({
      ...prev,
      sponsors: [...(prev.sponsors || []), newSponsor]
    }));
  };

  const updateSponsor = (id: string, updates: Partial<any>) => {
    setShowDraft(prev => ({
      ...prev,
      sponsors: (prev.sponsors || []).map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const removeSponsor = (id: string) => {
    setShowDraft(prev => ({
      ...prev,
      sponsors: (prev.sponsors || []).filter(s => s.id !== id)
    }));
  };

  const addAsset = () => {
    const newAsset = {
      id: uuid(),
      name: "",
      url: "",
      size: "medium" as const,
      placement: "commercial" as const,
      screen: "tv" as const,
    };
    setShowDraft(prev => ({
      ...prev,
      assets: [...(prev.assets || []), newAsset]
    }));
  };

  const updateAsset = (id: string, updates: Partial<any>) => {
    setShowDraft(prev => ({
      ...prev,
      assets: (prev.assets || []).map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  };

  const removeAsset = (id: string) => {
    setShowDraft(prev => ({
      ...prev,
      assets: (prev.assets || []).filter(a => a.id !== id)
    }));
  };

  const addOrganizer = () => {
    const newOrg = { id: uuid(), role: "", name: "" };
    updateSettings({
      organizers: [...(showDraft.settings.organizers || []), newOrg]
    });
  };

  const updateOrganizer = (id: string, role: string, name: string) => {
    updateSettings({
      organizers: (showDraft.settings.organizers || []).map(o => o.id === id ? { ...o, role, name } : o)
    });
  };

  const removeOrganizer = (id: string) => {
    updateSettings({
      organizers: (showDraft.settings.organizers || []).filter(o => o.id !== id)
    });
  };

  const renderSponsorsCreditsStep = () => {
    return (
      <div className="space-y-8">
        {/* Lobby & Location Details */}
        <div className="bg-base-300 p-6 rounded-xl border border-base-300 space-y-4">
          <h3 className="text-lg font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2">
            <ImageIcon size={20} />
            Lobby & Location Settings
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-text-secondary">Location / Venue (Lugar del Evento)</label>
              <input
                type="text"
                value={showDraft.settings.location || ""}
                onChange={(e) => updateSettings({ location: e.target.value })}
                className="w-full rounded-lg p-3 bg-base-100 border border-base-300"
                placeholder="e.g. Centro Cultural de España en Malabo"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-text-secondary">Lobby Background Image (Fondo de Pantalla)</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, (path) => setShowDraft({ ...showDraft, themeImage: path }))}
                  className="hidden"
                  id="theme-upload"
                />
                <label
                  htmlFor="theme-upload"
                  className="px-4 py-2.5 bg-brand-primary text-white rounded-lg cursor-pointer font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <Upload size={16} />
                  Choose Image
                </label>
                {showDraft.themeImage && (
                  <div className="flex items-center gap-2 bg-base-100 p-2 rounded-lg border border-base-300 max-w-[250px]">
                    {showDraft.themeImage.startsWith("data:") ? (
                      <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-base-200">
                        <img src={showDraft.themeImage} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <ImageIcon size={16} className="text-text-secondary flex-shrink-0" />
                    )}
                    <span className="text-xs text-text-secondary truncate flex-1">
                      {showDraft.themeImage.startsWith("data:") ? "Custom background uploaded" : showDraft.themeImage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDraft({ ...showDraft, themeImage: "" })}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sponsors Section */}
        <div className="bg-base-300 p-6 rounded-xl border border-base-300 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2">
              <ImageIcon size={20} />
              Sponsor Logos (Logos de Patrocinadores)
            </h3>
            <button
              type="button"
              onClick={addSponsor}
              className="text-sm bg-brand-primary text-white px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-all flex items-center gap-1.5"
            >
              <Plus size={16} />
              Add Sponsor
            </button>
          </div>

          {(showDraft.sponsors || []).length === 0 ? (
            <p className="text-sm text-text-secondary italic">No sponsors added yet. Click "+ Add Sponsor" to customize.</p>
          ) : (
            <div className="space-y-4">
              {(showDraft.sponsors || []).map((sponsor, index) => (
                <div key={sponsor.id} className="flex flex-col lg:flex-row gap-4 p-4 bg-base-100 border border-base-300 rounded-lg items-stretch lg:items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-500">#{index + 1}</span>
                    {sponsor.url ? (
                      <div className="w-14 h-14 rounded border border-base-300 overflow-hidden flex items-center justify-center bg-base-200">
                        <img src={sponsor.url} alt="Sponsor preview" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded border-2 border-dashed border-base-300 flex items-center justify-center text-text-secondary bg-base-200">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Sponsor Name */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1 uppercase font-bold">Sponsor Name (Nombre)</label>
                      <input
                        type="text"
                        value={sponsor.name || ""}
                        onChange={(e) => updateSponsor(sponsor.id, { name: e.target.value })}
                        className="rounded-lg p-2 bg-base-200 border border-base-300 text-xs w-full font-semibold text-text-primary"
                        placeholder="e.g. Red Bull"
                      />
                    </div>

                    {/* File Upload */}
                    <div className="flex flex-col justify-center">
                      <label className="block text-xs text-text-secondary mb-1 uppercase font-bold">Logo Image</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, (path) => updateSponsor(sponsor.id, { url: path }))}
                          className="hidden"
                          id={`sponsor-${sponsor.id}`}
                        />
                        <label
                          htmlFor={`sponsor-${sponsor.id}`}
                          className="px-3 py-1.5 bg-slate-800 text-white rounded-lg cursor-pointer font-semibold text-xs border border-slate-700 hover:bg-slate-700 transition-all flex items-center gap-1"
                        >
                          <Upload size={12} />
                          Upload Logo
                        </label>
                        <span className="text-[10px] text-text-secondary truncate max-w-[120px]">
                          {sponsor.url ? (sponsor.url.startsWith("data:") ? "Uploaded" : sponsor.url) : "No file"}
                        </span>
                      </div>
                    </div>

                    {/* Placement Choice */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1 uppercase font-bold">Placement (Ubicación)</label>
                      <select
                        value={sponsor.placement}
                        onChange={(e) => updateSponsor(sponsor.id, { placement: e.target.value as any })}
                        className="rounded-lg p-2 bg-base-200 border border-base-300 text-xs w-full font-semibold"
                      >
                        <option value="lobby">Lobby (Session Lobby)</option>
                        <option value="header">Top Header (Cabecera)</option>
                        <option value="footer">Bottom Footer (Pie de página)</option>
                        <option value="sidebar">Sidebar (Barra Lateral)</option>
                        <option value="credits">Ending Credits (Créditos Finales)</option>
                      </select>
                    </div>

                    {/* Target Screen */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1 uppercase font-bold">Target Screen (Pantalla)</label>
                      <select
                        value={sponsor.screen}
                        onChange={(e) => updateSponsor(sponsor.id, { screen: e.target.value as any })}
                        className="rounded-lg p-2 bg-base-200 border border-base-300 text-xs w-full font-semibold"
                      >
                        <option value="tv">TV Screen Only (Público)</option>
                        <option value="host">Host Screen Only (Presentador)</option>
                        <option value="both">Both Screens (Ambas)</option>
                      </select>
                    </div>

                    {/* Sizing Choice */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1 uppercase font-bold">Display Size (Tamaño)</label>
                      <select
                        value={sponsor.size}
                        onChange={(e) => updateSponsor(sponsor.id, { size: e.target.value as any })}
                        className="rounded-lg p-2 bg-base-200 border border-base-300 text-xs w-full font-semibold"
                      >
                        <option value="small">Small (Pequeño)</option>
                        <option value="medium">Medium (Mediano)</option>
                        <option value="large">Large (Grande)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => removeSponsor(sponsor.id)}
                      className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove Sponsor"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commercial Slides Section */}
        <div className="bg-base-300 p-6 rounded-xl border border-base-300 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2">
              <ImageIcon size={20} />
              Commercial slideshow Assets (Pausas Publicitarias)
            </h3>
            <button
              type="button"
              onClick={addAsset}
              className="text-sm bg-brand-primary text-white px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-all flex items-center gap-1.5"
            >
              <Plus size={16} />
              Add Commercial Asset
            </button>
          </div>

          {(showDraft.assets || []).length === 0 ? (
            <p className="text-sm text-text-secondary italic">No commercial slideshow assets added yet.</p>
          ) : (
            <div className="space-y-4">
              {(showDraft.assets || []).map((asset, index) => (
                <div key={asset.id} className="flex flex-col lg:flex-row gap-4 p-4 bg-base-100 border border-base-300 rounded-lg items-stretch lg:items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-500">#{index + 1}</span>
                    {asset.url ? (
                      <div className="w-14 h-14 rounded border border-base-300 overflow-hidden flex items-center justify-center bg-base-200">
                        <img src={asset.url} alt="Asset preview" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded border-2 border-dashed border-base-300 flex items-center justify-center text-text-secondary bg-base-200">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Asset Name */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1 uppercase font-bold">Asset Name (Nombre)</label>
                      <input
                        type="text"
                        value={asset.name || ""}
                        onChange={(e) => updateAsset(asset.id, { name: e.target.value })}
                        className="rounded-lg p-2 bg-base-200 border border-base-300 text-xs w-full font-semibold text-text-primary"
                        placeholder="e.g. Coca-Cola Slide 1"
                      />
                    </div>

                    {/* File Upload */}
                    <div className="flex flex-col justify-center">
                      <label className="block text-xs text-text-secondary mb-1 uppercase font-bold">Asset Image</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, (path) => updateAsset(asset.id, { url: path }))}
                          className="hidden"
                          id={`asset-${asset.id}`}
                        />
                        <label
                          htmlFor={`asset-${asset.id}`}
                          className="px-3 py-1.5 bg-slate-800 text-white rounded-lg cursor-pointer font-semibold text-xs border border-slate-700 hover:bg-slate-700 transition-all flex items-center gap-1"
                        >
                          <Upload size={12} />
                          Upload Image
                        </label>
                        <span className="text-[10px] text-text-secondary truncate max-w-[120px]">
                          {asset.url ? (asset.url.startsWith("data:") ? "Uploaded" : asset.url) : "No file"}
                        </span>
                      </div>
                    </div>

                    {/* Placement Choice */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1 uppercase font-bold">Placement</label>
                      <select
                        value={asset.placement}
                        onChange={(e) => updateAsset(asset.id, { placement: e.target.value as any })}
                        className="rounded-lg p-2 bg-base-200 border border-base-300 text-xs w-full font-semibold"
                      >
                        <option value="commercial">Commercial Break (Intermedio)</option>
                        <option value="lobby">Lobby Background (Fondo de Lobby)</option>
                      </select>
                    </div>

                    {/* Target Screen */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1 uppercase font-bold">Target Screen</label>
                      <select
                        value={asset.screen}
                        onChange={(e) => updateAsset(asset.id, { screen: e.target.value as any })}
                        className="rounded-lg p-2 bg-base-200 border border-base-300 text-xs w-full font-semibold"
                      >
                        <option value="tv">TV Screen Only (Público)</option>
                        <option value="host">Host Screen Only (Presentador)</option>
                        <option value="both">Both Screens (Ambas)</option>
                      </select>
                    </div>

                    {/* Sizing Choice */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1 uppercase font-bold">Display Size</label>
                      <select
                        value={asset.size}
                        onChange={(e) => updateAsset(asset.id, { size: e.target.value as any })}
                        className="rounded-lg p-2 bg-base-200 border border-base-300 text-xs w-full font-semibold"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => removeAsset(asset.id)}
                      className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove Asset"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ending Credits & Messages */}
        <div className="bg-base-300 p-6 rounded-xl border border-base-300 space-y-6">
          <h3 className="text-lg font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2">
            <ImageIcon size={20} />
            Ending Credits & Ceremony Messages (Créditos Finales)
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-text-secondary">Winner Ceremony Title (Mensaje Ganador)</label>
              <input
                type="text"
                value={showDraft.settings.winnerTitle || ""}
                onChange={(e) => updateSettings({ winnerTitle: e.target.value })}
                className="w-full rounded-lg p-3 bg-base-100 border border-base-300"
                placeholder="e.g. ¡FELICIDADES AL EQUIPO GANADOR!"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-text-secondary">Thank You Message (Agradecimientos)</label>
              <input
                type="text"
                value={showDraft.settings.thankYouMessage || ""}
                onChange={(e) => updateSettings({ thankYouMessage: e.target.value })}
                className="w-full rounded-lg p-3 bg-base-100 border border-base-300"
                placeholder="e.g. Gracias por acompañarnos en Viktoria Trivia Show."
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-base-300">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-text-secondary">Production Team Credits (Equipo de Producción)</label>
              <button
                type="button"
                onClick={addOrganizer}
                className="text-xs bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-700 transition-all flex items-center gap-1"
              >
                <Plus size={12} />
                Add Credit Row
              </button>
            </div>

            {(showDraft.settings.organizers || []).length === 0 ? (
              <p className="text-sm text-text-secondary italic">No organizers listed. Default production credits will be shown.</p>
            ) : (
              <div className="space-y-3">
                {(showDraft.settings.organizers || []).map((org) => (
                  <div key={org.id} className="flex gap-4 items-center bg-base-100 p-3 rounded-lg border border-base-300">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={org.role}
                        onChange={(e) => updateOrganizer(org.id, e.target.value, org.name)}
                        className="rounded-lg p-2.5 bg-base-200 border border-base-300 text-xs font-semibold"
                        placeholder="Role (e.g. Executive Producer)"
                      />
                      <input
                        type="text"
                        value={org.name}
                        onChange={(e) => updateOrganizer(org.id, org.role, e.target.value)}
                        className="rounded-lg p-2.5 bg-base-200 border border-base-300 text-xs"
                        placeholder="Name (e.g. Victor M. Ele Ela)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOrganizer(org.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderReviewStep = () => (
    <div className="space-y-6 font-sans">
      <div className="bg-base-200 rounded-xl p-4 border border-base-300">
        <h3 className="text-xl font-semibold mb-3 text-brand-primary">Show Summary</h3>
        <p className="text-text-secondary">{showDraft.description || "No description provided."}</p>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="p-3 rounded-lg bg-base-100 border border-base-300">
            <p className="text-sm text-text-secondary uppercase font-bold text-xs">Teams</p>
            <p className="text-2xl font-bold">{showDraft.settings.numTeams}</p>
          </div>
          <div className="p-3 rounded-lg bg-base-100 border border-base-300">
            <p className="text-sm text-text-secondary uppercase font-bold text-xs">Players / Team</p>
            <p className="text-2xl font-bold">{showDraft.settings.playersPerTeam}</p>
          </div>
          <div className="p-3 rounded-lg bg-base-100 border border-base-300">
            <p className="text-sm text-text-secondary uppercase font-bold text-xs">Rounds</p>
            <p className="text-2xl font-bold">{showDraft.settings.totalRounds}</p>
          </div>
        </div>
      </div>

      <div className="bg-base-200 rounded-xl p-4 border border-base-300 space-y-2">
        <h3 className="text-lg font-semibold text-brand-primary">Teams & Players</h3>
        {showDraft.teams.map((team) => (
          <div key={team.id} className="flex flex-col gap-1 border border-base-300 rounded-lg p-3 bg-base-100 animate-in fade-in">
            <div className="flex items-center justify-between">
              <p className="font-semibold flex items-center gap-2">
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
        <h3 className="text-lg font-semibold text-brand-primary">Round Schedule</h3>
        {showDraft.rounds.map((round) => (
          <div key={round.id} className="border border-base-300 rounded-lg p-3 bg-base-100">
            <p className="font-semibold text-brand-primary">{round.name}</p>
            {round.theme && <p className="text-sm text-text-secondary mb-2">{round.theme}</p>}
            {round.gameIds.length === 0 ? (
              <p className="text-sm text-text-secondary">No games assigned.</p>
            ) : (
              <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                {round.gameIds.map((id) => {
                  const game = gamesMap.get(id);
                  return <li key={id}>{game ? game.name : "Removed game"}</li>;
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Commercial & Sponsor customization summary */}
      <div className="bg-base-200 rounded-xl p-4 border border-base-300 space-y-4">
        <h3 className="text-lg font-semibold text-brand-primary">Sponsors & Credits Summary</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Lobby & Venue Settings</p>
            <p><strong>Location:</strong> {showDraft.settings.location || "Not configured"}</p>
            <p><strong>Theme Background:</strong> {showDraft.themeImage ? "Uploaded (Custom Image)" : "Default Theme"}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Ending Credits & Ceremony</p>
            <p><strong>Winner Ceremony Title:</strong> {showDraft.settings.winnerTitle || "Not configured"}</p>
            <p><strong>Thank You Message:</strong> {showDraft.settings.thankYouMessage || "Not configured"}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6 pt-3 border-t border-base-300 text-sm">
          <div>
            <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-2">Sponsor Logos ({ (showDraft.sponsors || []).length })</p>
            { (showDraft.sponsors || []).length === 0 ? (
              <p className="text-xs text-text-secondary italic">No sponsors configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                { (showDraft.sponsors || []).map(s => (
                  <span key={s.id} className="px-2.5 py-1 bg-base-100 rounded border border-base-300 text-xs truncate max-w-[200px]" title={s.name || "Sponsor Logo"}>
                    <strong>{s.name || "Sponsor"}</strong>: {s.url ? "Logo ready" : "No Logo"} ({s.size}) · {s.placement} ({s.screen})
                  </span>
                )) }
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-2">Commercial Break Slides ({ (showDraft.assets || []).length })</p>
            { (showDraft.assets || []).length === 0 ? (
              <p className="text-xs text-text-secondary italic">No commercial slideshow assets configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                { (showDraft.assets || []).map(a => (
                  <span key={a.id} className="px-2.5 py-1 bg-base-100 rounded border border-base-300 text-xs truncate max-w-[200px]" title={a.name || "Commercial Slide"}>
                    <strong>{a.name || "Asset"}</strong>: {a.url ? "Slide ready" : "No Image"} ({a.size}) · {a.placement} ({a.screen})
                  </span>
                )) }
              </div>
            )}
          </div>
        </div>
        { (showDraft.settings.organizers || []).length > 0 && (
          <div className="pt-3 border-t border-base-300 text-sm animate-in fade-in">
            <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-2">Production Team Credits</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              { (showDraft.settings.organizers || []).map(o => (
                <div key={o.id} className="bg-base-100 border border-base-300 p-2.5 rounded text-xs">
                  <p className="font-bold text-brand-primary">{o.role || "TBD Role"}</p>
                  <p className="text-text-secondary font-medium">{o.name || "TBD Name"}</p>
                </div>
              )) }
            </div>
          </div>
        ) }
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
        return renderSponsorsCreditsStep();
      case 4:
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
            className={`p-3 rounded-lg border flex items-start justify-between gap-2 ${selectedShowId === show.id ? "border-brand-primary bg-brand-primary/10" : "border-base-300"
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
                className={`flex items-center gap-2 px-4 py-2 rounded-full border ${step === index
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
              className={`px-4 py-2 rounded-lg border ${step === 0 ? "opacity-50 cursor-not-allowed" : "border-base-300"
                }`}
            >
              Back
            </button>
            {step < 3 ? (
              <button
                onClick={goNext}
                disabled={!currentStepValid}
                className={`px-6 py-2 rounded-lg font-semibold ${currentStepValid
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
                className={`px-6 py-2 rounded-lg font-semibold ${!isSaving && currentStepValid
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
