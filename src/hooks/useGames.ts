// src/hooks/useGames.ts
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { Game, GameType } from "@/types";

/**
 * Enables offline persistence (caching Firestore data locally).
 * Firestore automatically syncs when back online.
 */
async function enableOfflineCache() {
  try {
    await enableIndexedDbPersistence(db);
    console.log("✅ Firestore offline persistence enabled");
  } catch (err: any) {
    if (err.code === "failed-precondition") {
      console.warn(
        "⚠️ Offline persistence failed: multiple tabs open. Using online mode only."
      );
    } else if (err.code === "unimplemented") {
      console.warn("⚠️ Offline persistence not supported in this browser.");
    } else {
      console.error("❌ Error enabling offline persistence:", err);
    }
  }
}

/**
 * Real-time hook for listening to all games.
 * Includes Firestore offline caching for instant loading and sync recovery.
 */
export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ✅ Activate offline caching once
    enableOfflineCache();

    console.log("👂 [useGames] Listening to Firestore 'games' collection...");

    const unsubscribe = onSnapshot(
      collection(db, "games"),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const loadedGames: Game[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          const type = (data.type as string)?.toUpperCase() as GameType;
          return { id: doc.id, ...data, type } as Game;
        });

        setGames(loadedGames);
        setLoading(false);

        console.log(`📡 [useGames] ${loadedGames.length} games loaded`);
      },
      (err) => {
        console.error("❌ [useGames] Snapshot error:", err);
        setError(err.message || "Error loading games");
        setLoading(false);
      }
    );

    // Cleanup
    return () => {
      console.log("🛑 [useGames] Unsubscribed from listener");
      unsubscribe();
    };
  }, []);

  return { games, loading, error };
}
