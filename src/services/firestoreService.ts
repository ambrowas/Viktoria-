// Deprecated Firestore service; kept as a stub to avoid crashes if imported.
// All game data is now stored locally via Electron IPC.
import { Game, GameType } from "@/types";

const noOp = async (..._args: any[]) => {
  console.warn("Firestore service is deprecated; no-op called.");
  return undefined;
};

/**
 * Safely normalize any Firestore value into a clean uppercase string.
 */
function toPlainString(value: any): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toString" in value)
    return value.toString();
  return String(value || "");
}

/**
 * Converts any Firestore doc value into a valid GameType.
 * Case-insensitive and tolerant to unexpected values.
 */
function normalizeFirestoreType(raw: any): GameType {
  const upper = toPlainString(raw).toUpperCase();

  // Case-insensitive match against GameType enum
  const match = Object.values(GameType).find(
    (v) => v.toUpperCase() === upper
  ) as GameType | undefined;

  if (match) return match;

  console.warn(`⚠️ Unknown game type '${raw}', defaulting to CHAIN_REACTION`);
  return GameType.CHAIN_REACTION;
}

/**
 * Fetch all games from Firestore.
 */
export async function fetchGames(): Promise<Game[]> {
  console.warn("fetchGames called on deprecated Firestore service. Returning empty list.");
  return [];
}

/**
 * Fetch a single game by ID.
 */
export const fetchGameById = noOp;

/**
 * Save or overwrite a game in Firestore.
 */
export const saveGame = noOp;

/**
 * Update a subset of fields in an existing game.
 */
export const updateGame = noOp;

/**
 * Delete a game by ID.
 */
export const deleteGame = noOp;
