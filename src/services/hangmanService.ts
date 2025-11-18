import { db } from "./firebase";
import { collection, doc, setDoc, getDoc, getDocs } from "firebase/firestore";
import { HangmanGame } from "@/types";

/**
 * Save a Hangman game (create or update).
 */
export async function saveHangmanGame(game: HangmanGame): Promise<void> {
  if (!game.id) {
    throw new Error("Game must have an ID before saving.");
  }

  const gameRef = doc(db, "games", game.id);
  await setDoc(gameRef, game, { merge: true });
}

/**
 * Get a single Hangman game by ID.
 */
export async function getHangmanGame(id: string): Promise<HangmanGame | null> {
  const gameRef = doc(db, "games", id);
  const snap = await getDoc(gameRef);

  if (!snap.exists()) return null;
  return snap.data() as HangmanGame;
}

/**
 * Get all Hangman games.
 */
export async function getAllHangmanGames(): Promise<HangmanGame[]> {
  const querySnap = await getDocs(collection(db, "games"));
  return querySnap.docs
    .map(doc => doc.data() as HangmanGame)
    .filter(g => g.type === "HANGMAN");
}
