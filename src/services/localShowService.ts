// src/services/localShowService.ts
import type { Show } from "@/types";

/**
 * A service for local file-based show storage via Electron IPC,
 * with localStorage fallback for browser/development environments.
 */

export async function getShows(): Promise<Show[]> {
  try {
    if (!window.electronAPI) {
      console.warn("getShows: electronAPI not found. Falling back to localStorage.");
      const legacyJson = window.localStorage.getItem("viktoria_shows");
      return legacyJson ? JSON.parse(legacyJson) as Show[] : [];
    }

    // One-time migration: move shows from localStorage -> file system
    const migrationDone = window.localStorage.getItem("viktoria_shows_migrated");
    if (!migrationDone) {
      const legacyJson = window.localStorage.getItem("viktoria_shows");
      if (legacyJson) {
        const legacyShows = JSON.parse(legacyJson) as Show[];
        console.log(`Migrating ${legacyShows.length} show(s) from localStorage to file system...`);
        for (const show of legacyShows) {
          if (show?.id) {
            await window.electronAPI.invoke("save-show-local", { id: show.id, show });
          }
        }
        console.log("Migration complete.");
      }
      window.localStorage.setItem("viktoria_shows_migrated", "1");
    }

    const shows = await window.electronAPI.invoke("list-shows-local");
    return Array.isArray(shows) ? shows : [];
  } catch (error) {
    console.error("❌ Failed to get shows:", error);
    return [];
  }
}


export async function saveShow(show: Show): Promise<boolean> {
  if (!show || !show.id) {
    console.error("❌ saveShow failed: show object or id is missing.");
    return false;
  }
  try {
    if (!window.electronAPI) {
      console.warn("saveShow: electronAPI not found. Falling back to localStorage.");
      const legacyJson = window.localStorage.getItem("viktoria_shows");
      const shows = legacyJson ? JSON.parse(legacyJson) as Show[] : [];
      const idx = shows.findIndex(s => s.id === show.id);
      if (idx >= 0) shows[idx] = show;
      else shows.push(show);
      window.localStorage.setItem("viktoria_shows", JSON.stringify(shows));
      return true;
    }
    return await window.electronAPI.invoke("save-show-local", {
      id: show.id,
      show,
    });
  } catch (error) {
    console.error(`❌ Failed to save show "${show.id}":`, error);
    return false;
  }
}

export async function deleteShow(showId: string): Promise<boolean> {
  if (!showId) {
    console.error("❌ deleteShow failed: showId is missing.");
    return false;
  }
  try {
    if (!window.electronAPI) {
      console.warn("deleteShow: electronAPI not found. Falling back to localStorage.");
      const legacyJson = window.localStorage.getItem("viktoria_shows");
      if (legacyJson) {
        let shows = JSON.parse(legacyJson) as Show[];
        shows = shows.filter(s => s.id !== showId);
        window.localStorage.setItem("viktoria_shows", JSON.stringify(shows));
      }
      return true;
    }
    return await window.electronAPI.invoke("delete-show-local", { id: showId });
  } catch (error) {
    console.error(`❌ Failed to delete show "${showId}":`, error);
    return false;
  }
}

export async function saveActiveShowRun(showId: string, runState: any): Promise<boolean> {
  if (!showId || !runState) {
    console.error("❌ saveActiveShowRun failed: showId or runState is missing.");
    return false;
  }
  try {
    if (!window.electronAPI) {
      console.warn("saveActiveShowRun: electronAPI not found. Falling back to localStorage.");
      window.localStorage.setItem(`viktoria_active_run_${showId}`, JSON.stringify(runState));
      return true;
    }
    return await window.electronAPI.invoke("save-active-run-local", { id: showId, runState });
  } catch (error) {
    console.error(`❌ Failed to save active show run for "${showId}":`, error);
    return false;
  }
}

export async function getActiveShowRun(showId: string): Promise<any | null> {
  if (!showId) {
    console.error("❌ getActiveShowRun failed: showId is missing.");
    return null;
  }
  try {
    if (!window.electronAPI) {
      console.warn("getActiveShowRun: electronAPI not found. Falling back to localStorage.");
      const json = window.localStorage.getItem(`viktoria_active_run_${showId}`);
      return json ? JSON.parse(json) : null;
    }
    return await window.electronAPI.invoke("load-active-run-local", { id: showId });
  } catch (error) {
    console.error(`❌ Failed to get active show run for "${showId}":`, error);
    return null;
  }
}

export async function deleteActiveShowRun(showId: string): Promise<boolean> {
  if (!showId) {
    console.error("❌ deleteActiveShowRun failed: showId is missing.");
    return false;
  }
  try {
    if (!window.electronAPI) {
      console.warn("deleteActiveShowRun: electronAPI not found. Falling back to localStorage.");
      window.localStorage.removeItem(`viktoria_active_run_${showId}`);
      return true;
    }
    return await window.electronAPI.invoke("delete-active-run-local", { id: showId });
  } catch (error) {
    console.error(`❌ Failed to delete active show run for "${showId}":`, error);
    return false;
  }
}

