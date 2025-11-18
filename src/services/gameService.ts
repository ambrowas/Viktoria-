import { Game, GameType } from "@/types";
import {
  fetchGames,
  fetchGameById,
  saveGame,
  deleteGame,
  updateGame,
} from "@/services/firestoreService";

/**
 * Utility — normalize a raw Firestore value into a valid GameType.
 * Handles both strings and pre-parsed enum values safely.
 */
function normalizeGameType(raw: unknown): GameType {
  if (typeof raw === "string") {
    const upper = raw.toUpperCase();
    // Ensure it's one of our enum values
    if (Object.values(GameType).includes(upper as GameType)) {
      return upper as GameType;
    }
  }
  // If already a valid enum or something unexpected, return as-is or fallback
  return (raw as GameType) || GameType.CHAIN_REACTION;
}

/**
 * High-level wrapper around Firestore service.
 * Adds enum-safe operations and business logic normalization.
 */
export const gameService = {
  /**
   * Load all games from Firestore and normalize their types.
   */
  async getAll(): Promise<Game[]> {
    const games = await fetchGames();

    const normalized = games.map((g) => ({
      ...g,
      type: normalizeGameType(g.type),
    }));

    console.log(
      `🎮 [gameService] Loaded ${normalized.length} games with normalized types`
    );
    normalized.forEach((g) => console.log(` - ${g.name}: ${g.type}`));

    return normalized as Game[];
  },

  /**
   * Load a single game by ID and normalize its type.
   */
  async getById(id: string): Promise<Game | null> {
    const game = await fetchGameById(id);
    if (!game) return null;

    const normalized = {
      ...game,
      type: normalizeGameType(game.type),
    };

    console.log(`🎯 [gameService] Loaded game '${id}' as type ${normalized.type}`);
    return normalized as Game;
  },

  /**
   * Save a new game.
   */
  async create(game: Game): Promise<void> {
    console.log(`💾 [gameService] Saving new game: ${game.name} (${game.type})`);
    return saveGame(game);
  },

  /**
   * Update partial fields of an existing game.
   */
  async update(id: string, updates: Partial<Game>): Promise<void> {
    console.log(`🛠️ [gameService] Updating game '${id}'`);
    return updateGame(id, updates);
  },

  /**
   * Delete a game by ID.
   */
  async remove(id: string): Promise<void> {
    console.log(`🗑️ [gameService] Removing game '${id}'`);
    return deleteGame(id);
  },
};
