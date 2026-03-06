// Stubbed Firebase service — all game data is handled locally via Electron IPC.
import {
  Game,
  GameType,
  ChainReactionGame,
  JeopardyGame,
  FamilyFeudGame,
  MemoryGame,
  HangmanGame,
  RoscoGame,
  PyramidGame,
  DefinitionsGame,
  PriceIsRightGame,
  WheelOfFortuneGame,
  LotteryGame,
  BingoGame,
} from "@/types";

export const db = undefined as any;
export const storage = undefined as any;

// ---------------------------------------------
// Normalize raw Firestore data -> strict Game
// ---------------------------------------------
function normalizeType(raw: any): GameType {
  const upper = String(raw ?? "").toUpperCase();
  if (upper === "TRIVIA") return GameType.CHAIN_REACTION;
  const values = Object.values(GameType);
  return values.includes(upper as GameType)
    ? (upper as GameType)
    : GameType.CHAIN_REACTION;
}

/**
 * Strictly constructs a typed Game object from raw Firestore data.
 * Each branch sets `type: GameType.X` literally (no widened variable)
 */
export function coerceGame(raw: any, idFromDoc?: string): Game {
  const t = normalizeType(raw?.type);
  const base = {
    id: idFromDoc ?? raw?.id ?? crypto.randomUUID(),
    name: raw?.name ?? "",
    description: raw?.description ?? "",
    createdAt: raw?.createdAt ?? new Date().toISOString(),
  };

  switch (t) {
    // -----------------------------
    // Chain Reaction
    // -----------------------------
    case GameType.CHAIN_REACTION: {
      const g: ChainReactionGame = {
        ...base,
        type: GameType.CHAIN_REACTION,
        title: raw?.title ?? (raw?.name || "Chain Reaction"),
        rounds: Array.isArray(raw?.rounds) ? raw.rounds : [],
      };
      return g;
    }

    // -----------------------------
    // Jeopardy
    // -----------------------------
    case GameType.JEOPARDY: {
      const g: JeopardyGame = {
        ...base,
        type: GameType.JEOPARDY,
        categories: Array.isArray(raw?.categories) ? raw.categories : [],
      };
      return g;
    }

    // -----------------------------
    // Family Feud
    // -----------------------------
    case GameType.FAMILY_FEUD: {
      const g: FamilyFeudGame = {
        ...base,
        type: GameType.FAMILY_FEUD,
        rounds: Array.isArray(raw?.rounds) ? raw.rounds : [],
      };
      return g;
    }

    // -----------------------------
    // Memory
    // -----------------------------
    case GameType.MEMORY: {
      const g: MemoryGame = {
        ...base,
        type: GameType.MEMORY,
        gridSize: raw?.gridSize ?? "Medium",
        tileSource: raw?.tileSource ?? "AI",
        tiles: Array.isArray(raw?.tiles) ? raw.tiles : [],
      };
      return g;
    }

    // -----------------------------
    // Hangman
    // -----------------------------
    case GameType.HANGMAN: {
      const g: HangmanGame = {
        ...base,
        type: GameType.HANGMAN,
        phrases: Array.isArray(raw?.phrases) ? raw.phrases : [],
        difficulty: raw?.difficulty ?? "Medium",
        maxAttempts: raw?.maxAttempts ?? 8,
      };
      return g;
    }

    // -----------------------------
    // Rosco
    // -----------------------------
    case GameType.ROSCO: {
      const g: RoscoGame = {
        ...base,
        type: GameType.ROSCO,
        clues: Array.isArray(raw?.clues) ? raw.clues : [],
      };
      return g;
    }

    // -----------------------------
    // Pyramid
    // -----------------------------
    case GameType.PYRAMID: {
      const g: PyramidGame = {
        ...base,
        type: GameType.PYRAMID,
        metadata: raw?.metadata ?? {},
      };
      return g;
    }

    // -----------------------------
    // Definitions
    // -----------------------------
    case GameType.DEFINITIONS: {
      const g: DefinitionsGame = {
        ...base,
        type: GameType.DEFINITIONS,
        clues: Array.isArray(raw?.clues) ? raw.clues : [],
      };
      return g;
    }

    // -----------------------------
    // Price Is Right
    // -----------------------------
    case GameType.PRICE_IS_RIGHT: {
      const g: PriceIsRightGame = {
        ...base,
        type: GameType.PRICE_IS_RIGHT,
        items: Array.isArray(raw?.items) ? raw.items : [],
      };
      return g;
    }

    // -----------------------------
    // Wheel of Fortune
    // -----------------------------
    case GameType.WHEEL_OF_FORTUNE: {
      const g: WheelOfFortuneGame = {
        ...base,
        type: GameType.WHEEL_OF_FORTUNE,
        rounds: Array.isArray(raw?.rounds) ? raw.rounds : [],
      };
      return g;
    }

    // -----------------------------
    // Lottery
    // -----------------------------
    case GameType.LOTTERY: {
      const g: LotteryGame = {
        ...base,
        type: GameType.LOTTERY,
        tickets: Array.isArray(raw?.tickets) ? raw.tickets : [],
        draws: Array.isArray(raw?.draws) ? raw.draws : [],
      };
      return g;
    }
 // -----------------------------
    // Bingo
    // -----------------------------
    case GameType.BINGO: {
      const g: BingoGame = {
        ...base,
        type: GameType.BINGO,
        round: raw?.round ?? null,
      };
      return g;
    }



    // -----------------------------
    // Default fallback
    // -----------------------------
    default: {
      console.warn(`⚠️ Unknown game type "${t}", defaulting to Chain Reaction.`);
      const g: ChainReactionGame = {
        ...base,
        type: GameType.CHAIN_REACTION,
        title: raw?.title ?? (raw?.name || "Chain Reaction"),
        rounds: Array.isArray(raw?.rounds) ? raw.rounds : [],
      };
      return g;
    }
  }
}

// ---------------------------------------------
// CRUD
// ---------------------------------------------
// Deprecated Firebase methods — now routed to local disk via Electron IPC.
// Kept for compatibility with existing callers, but no Firestore traffic.

export const saveGame = async (game: Game): Promise<void> => {
  if (window?.electronAPI?.invoke) {
    await window.electronAPI.invoke("save-game-local", {
      slug: game.slug || game.id || "game",
      game,
    });
    return;
  }
  // Fallback: no-op to avoid crashes when Electron IPC not available
  console.warn("Electron IPC unavailable; saveGame is a no-op.");
};

export const deleteGame = async (gameId: string): Promise<void> => {
  if (window?.electronAPI?.invoke) {
    await window.electronAPI.invoke("delete-game-local", { id: gameId });
    return;
  }
  console.warn("Electron IPC unavailable; deleteGame is a no-op.");
};

export const loadGames = async (): Promise<Game[]> => {
  if (window?.electronAPI?.invoke) {
    const games = await window.electronAPI.invoke("list-games-local");
    return Array.isArray(games) ? games.map((g: any) => coerceGame(g, g.id)) : [];
  }
  console.warn("Electron IPC unavailable; loadGames returning empty list.");
  return [];
};
