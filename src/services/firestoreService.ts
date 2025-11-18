import { db } from "@/services/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { Game, GameType } from "@/types";

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
  try {
    const snapshot = await getDocs(collection(db, "games"));
    return snapshot.docs.map((d) => {
      const data = JSON.parse(JSON.stringify(d.data())); // strip Firestore proxies

      return {
        id: d.id,
        ...data,
        type: normalizeFirestoreType(data.type),
      } as Game;
    });
  } catch (error) {
    console.error("❌ [FirestoreService] Error fetching games:", error);
    return [];
  }
}

/**
 * Fetch a single game by ID.
 */
export async function fetchGameById(id: string): Promise<Game | null> {
  try {
    const ref = doc(db, "games", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = JSON.parse(JSON.stringify(snap.data())); // plain JSON
    return {
      id: snap.id,
      ...data,
      type: normalizeFirestoreType(data.type),
    } as Game;
  } catch (error) {
    console.error("❌ [FirestoreService] Error fetching game:", error);
    return null;
  }
}

/**
 * Save or overwrite a game in Firestore.
 */
export async function saveGame(game: Game): Promise<void> {
  try {
    const id = game.id || crypto.randomUUID();
    await setDoc(doc(db, "games", id), {
      ...game,
      id,
      type: game.type,
    });
    console.log("💾 [FirestoreService] Saved game:", id, game.type);
  } catch (error) {
    console.error("❌ [FirestoreService] Error saving game:", error);
    throw error;
  }
}

/**
 * Update a subset of fields in an existing game.
 */
export async function updateGame(id: string, updates: Partial<Game>): Promise<void> {
  try {
    const ref = doc(db, "games", id);
    await updateDoc(ref, updates);
    console.log("✏️ [FirestoreService] Updated game:", id, updates);
  } catch (error) {
    console.error("❌ [FirestoreService] Error updating game:", error);
    throw error;
  }
}

/**
 * Delete a game by ID.
 */
export async function deleteGame(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "games", id));
    console.log("🗑️ [FirestoreService] Deleted game:", id);
  } catch (error) {
    console.error("❌ [FirestoreService] Error deleting game:", error);
    throw error;
  }
}
