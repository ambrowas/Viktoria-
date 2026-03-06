// src/services/localGameService.ts
import type { Game } from "@/types";

/**
 * A clean, simple, and robust wrapper around the Electron IPC bridge for
 * file-based local game storage. This service is the single source of truth
 * for all game persistence, ensuring no direct localStorage access for games.
 */

/**
 * Retrieves all games from the local filesystem.
 * @returns A promise that resolves to an array of Game objects.
 */
export async function getGames(): Promise<Game[]> {
  try {
    // The main process reads all individual game files and returns them as an array.
    const games = await window.electronAPI.invoke("list-games-local");
    return Array.isArray(games) ? games : [];
  } catch (error) {
    console.error("❌ Failed to invoke 'list-games-local' via IPC:", error);
    return [];
  }
}

/**
 * Saves a single game to the local filesystem.
 * The main process handles creating a dedicated folder and file for the game.
 * @param game The Game object to save.
 * @returns A promise that resolves to true if saving was successful, false otherwise.
 */
export async function saveGame(game: Game): Promise<boolean> {
  if (!game || !game.slug) {
    console.error("❌ saveGame failed: game object or slug is missing.");
    return false;
  }
  try {
    return await window.electronAPI.invoke("save-game-local", {
      slug: game.slug,
      game,
    });
  } catch (error) {
    console.error(`❌ Failed to invoke 'save-game-local' for slug "${game.slug}":`, error);
    return false;
  }
}

/**
 * Deletes a single game from the local filesystem.
 * @param game The Game object to delete.
 * @returns A promise that resolves to true if deletion was successful, false otherwise.
 */
export async function deleteGame(game: Pick<Game, "id" | "slug">): Promise<boolean> {
  if (!game || !game.id) {
    console.error("❌ deleteGame failed: game object or id is missing.");
    return false;
  }
  try {
    return await window.electronAPI.invoke("delete-game-local", {
      id: game.id,
      slug: game.slug,
    });
  } catch (error) {
    console.error(`❌ Failed to invoke 'delete-game-local' for id "${game.id}":`, error);
    return false;
  }
}
