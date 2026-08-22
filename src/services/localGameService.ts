// src/services/localGameService.ts
import type { Game } from "@/types";

/**
 * A clean, simple, and robust wrapper around the Electron IPC bridge for
 * file-based local game storage, with a localStorage fallback for browser environments.
 */

/**
 * Retrieves all games.
 * @returns A promise that resolves to an array of Game objects.
 */
export async function getGames(): Promise<Game[]> {
  try {
    if (!window.electronAPI) {
      console.warn("getGames: electronAPI not found. Falling back to localStorage.");
      const legacyJson = window.localStorage.getItem("viktoria_games");
      const games = legacyJson ? JSON.parse(legacyJson) as Game[] : [];
      return games.map((game: any) => {
        if (game.type === "JEOPARDY") {
          return { ...game, type: "QUIZBOARD" };
        }
        return game;
      });
    }

    // One-time migration: move games from localStorage -> file system
    const migrationDone = window.localStorage.getItem("viktoria_games_migrated");
    if (!migrationDone) {
      const legacyJson = window.localStorage.getItem("viktoria_games");
      if (legacyJson) {
        const legacyGames = JSON.parse(legacyJson) as Game[];
        console.log(`Migrating ${legacyGames.length} game(s) from localStorage to file system...`);
        for (const game of legacyGames) {
          if (game?.slug) {
            await window.electronAPI.invoke("save-game-local", { slug: game.slug, game });
          }
        }
        console.log("Migration complete.");
      }
      window.localStorage.setItem("viktoria_games_migrated", "1");
    }

    const games = await window.electronAPI.invoke("list-games-local");
    if (Array.isArray(games)) {
      return games.map((game: any) => {
        if (game.type === "JEOPARDY") {
          return { ...game, type: "QUIZBOARD" };
        }
        return game;
      });
    }
    return [];
  } catch (error) {
    console.error("❌ Failed to retrieve games:", error);
    return [];
  }
}

/**
 * Saves a single game.
 * @param game The Game object to save.
 * @returns A promise that resolves to true if saving was successful, false otherwise.
 */
export async function saveGame(game: Game): Promise<boolean> {
  if (!game || !game.slug) {
    console.error("❌ saveGame failed: game object or slug is missing.");
    return false;
  }
  try {
    if (!window.electronAPI) {
      console.warn("saveGame: electronAPI not found. Falling back to localStorage.");
      const legacyJson = window.localStorage.getItem("viktoria_games");
      const games = legacyJson ? JSON.parse(legacyJson) as Game[] : [];
      const idx = games.findIndex(g => g.id === game.id);
      if (idx >= 0) games[idx] = game;
      else games.push(game);
      window.localStorage.setItem("viktoria_games", JSON.stringify(games));
      return true;
    }
    return await window.electronAPI.invoke("save-game-local", {
      slug: game.slug,
      game,
    });
  } catch (error) {
    console.error(`❌ Failed to save game for slug "${game.slug}":`, error);
    return false;
  }
}

/**
 * Deletes a single game.
 * @param game The Game object to delete.
 * @returns A promise that resolves to true if deletion was successful, false otherwise.
 */
export async function deleteGame(game: Pick<Game, "id" | "slug">): Promise<boolean> {
  if (!game || !game.id) {
    console.error("❌ deleteGame failed: game object or id is missing.");
    return false;
  }
  try {
    if (!window.electronAPI) {
      console.warn("deleteGame: electronAPI not found. Falling back to localStorage.");
      const legacyJson = window.localStorage.getItem("viktoria_games");
      if (legacyJson) {
        let games = JSON.parse(legacyJson) as Game[];
        games = games.filter(g => g.id !== game.id);
        window.localStorage.setItem("viktoria_games", JSON.stringify(games));
      }
      return true;
    }
    return await window.electronAPI.invoke("delete-game-local", {
      id: game.id,
      slug: game.slug,
    });
  } catch (error) {
    console.error(`❌ Failed to delete game for id "${game.id}":`, error);
    return false;
  }
}

