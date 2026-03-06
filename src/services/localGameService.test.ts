/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { getGames, saveGame, deleteGame } from './localGameService';
import type { Game, GameType } from '@/types';

// Mock the Electron API that would be on the window object in the real app
const mockElectronAPI = {
  invoke: vi.fn(),
};

// Attach the mock to the global window object before all tests run
beforeAll(() => {
  // @ts-ignore - We are intentionally modifying the window object for testing
  window.electronAPI = mockElectronAPI;
});

describe('localGameService', () => {
  // Reset mocks before each individual test to ensure isolation
  beforeEach(() => {
    mockElectronAPI.invoke.mockReset();
  });

  // ===================================
  // Tests for getGames
  // ===================================
  describe('getGames', () => {
    it('should call the "list-games-local" IPC handler and return the games', async () => {
      const mockGames: Partial<Game>[] = [
        { id: '1', name: 'Jeopardy Fun', type: 'JEOPARDY' as GameType.JEOPARDY },
        { id: '2', name: 'Family Feud Night', type: 'FAMILY_FEUD' as GameType.FAMILY_FEUD },
      ];
      mockElectronAPI.invoke.mockResolvedValue(mockGames);

      const games = await getGames();

      expect(mockElectronAPI.invoke).toHaveBeenCalledOnce();
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith('list-games-local');
      expect(games).toEqual(mockGames);
    });

    it('should return an empty array if the IPC call returns a non-array value', async () => {
      mockElectronAPI.invoke.mockResolvedValue({ error: 'not an array' }); // Simulate unexpected return
      const games = await getGames();
      expect(games).toEqual([]);
    });

    it('should return an empty array if the IPC call fails (rejects)', async () => {
      mockElectronAPI.invoke.mockRejectedValue(new Error('IPC call failed'));
      const games = await getGames();
      expect(games).toEqual([]);
      // Ensure console.error was called
      // (You might need to spy on console.error to test this robustly)
    });
  });

  // ===================================
  // Tests for saveGame
  // ===================================
  describe('saveGame', () => {
    const gameToSave: Game = {
      id: 'test-id-1',
      slug: 'test-game',
      name: 'Test Game',
      type: 'JEOPARDY' as GameType.JEOPARDY,
      createdAt: new Date().toISOString(),
      categories: [],
    };

    it('should call the "save-game-local" IPC handler with the correct payload', async () => {
      mockElectronAPI.invoke.mockResolvedValue(true);

      const result = await saveGame(gameToSave);

      expect(mockElectronAPI.invoke).toHaveBeenCalledOnce();
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith('save-game-local', {
        slug: gameToSave.slug,
        game: gameToSave,
      });
      expect(result).toBe(true);
    });

    it('should return false if the game has no slug', async () => {
      const gameWithoutSlug = { ...gameToSave, slug: undefined };
      // @ts-ignore
      const result = await saveGame(gameWithoutSlug);

      expect(mockElectronAPI.invoke).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false if the IPC call fails', async () => {
      mockElectronAPI.invoke.mockRejectedValue(new Error('IPC save failed'));
      const result = await saveGame(gameToSave);
      expect(result).toBe(false);
    });
  });

  // ===================================
  // Tests for deleteGame
  // ===================================
  describe('deleteGame', () => {
    const gameToDelete: Pick<Game, "id" | "slug"> = {
        id: 'test-id-1',
        slug: 'test-game',
    };

    it('should call the "delete-game-local" IPC handler with the correct payload', async () => {
        mockElectronAPI.invoke.mockResolvedValue(true);

        const result = await deleteGame(gameToDelete);

        expect(mockElectronAPI.invoke).toHaveBeenCalledOnce();
        expect(mockElectronAPI.invoke).toHaveBeenCalledWith('delete-game-local', {
            id: gameToDelete.id,
            slug: gameToDelete.slug,
        });
        expect(result).toBe(true);
    });

    it('should return false if the game has no id', async () => {
        const gameWithoutId = { ...gameToDelete, id: undefined };
        // @ts-ignore
        const result = await deleteGame(gameWithoutId);
        expect(mockElectronAPI.invoke).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });

    it('should return false if the IPC call fails', async () => {
        mockElectronAPI.invoke.mockRejectedValue(new Error('IPC delete failed'));
        const result = await deleteGame(gameToDelete);
        expect(result).toBe(false);
    });
  });
});
