import React, { useState, useEffect } from "react";
import {
  Game,
  GameType,
  JeopardyGame,
  FamilyFeudGame,
  JeopardyCategory,
  MemoryGame,
  HangmanGame,
  RoscoGame,
  ChainReactionGame,
  GenericGame,
  PyramidGame,
  DefinitionsGame,
  PriceIsRightGame,
  WheelOfFortuneGame,
  LotteryGame,
  JeopardyTurnMode,
} from "@/types";

import { motion } from "framer-motion";
import Spinner from "../components/Spinner";
import { useLanguage } from "@/context/LanguageContext";
// import { doc, setDoc } from "firebase/firestore";
// import { ref, uploadString, getDownloadURL } from "firebase/storage";
// import { storage } from "@/utils/firebase";
import {
  generateJeopardyCategory,
  generatePyramidQuestions,
} from "../services/geminiService";

// Editors
import ChainReactionEditor from "@/screens/editors/ChainReactionEditor";
import JeopardyEditor from "./editors/JeopardyEditor";
import FamilyFeudEditor from "./editors/FamilyFeudEditor";
import MemoryEditor from "./editors/MemoryEditor";
import HangmanEditor from "./editors/HangmanEditor";
import RoscoEditor from "./editors/RoscoEditor";
import PyramidEditor from "./editors/PyramidEditor";
import DefinitionsEditor from "./editors/DefinitionsEditor";
import PriceIsRightEditor from "./editors/PriceIsRightEditor";
import WheelOfFortuneEditor from "./editors/WheelOfFortuneEditor";
import LotteryEditor from "./editors/LotteryEditor";
import BingoEditor from "./editors/BingoEditor"; // ✅ added

// ============================
// Game Creator Component
// ============================
interface GameCreatorProps {
  onSave: (game: Game) => Promise<void>;
  existingGame: Game | null;
  onCreateSample: () => Promise<void>;
}

const GameCreator: React.FC<GameCreatorProps> = ({
  onSave,
  existingGame,
  onCreateSample,
}) => {
  const { lang } = useLanguage();
  const [game, setGame] = useState<GenericGame | null>(
    existingGame ? { ...existingGame } : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("Medium");
  const [error, setError] = useState("");

  // Placeholder for storage reference since we removed the import
  const storage = null;

  const uploadDataUrlToStorage = async (dataUrl: string) => {
    // Firebase storage is not configured.
    // We rely on local persistence via Electron IPC in persistDataUrlsForGame.
    return null;
  };

  // ============================
  // Logging
  // ============================
  useEffect(() => {
    console.log("🎬 [GameCreator] Mounted with game:", game);
  }, []);

  useEffect(() => {
    console.log("📘 [GameCreator] Game updated:", game?.type, game);
  }, [game]);

  // ============================
  // Base Builder
  // ============================
  const createBaseGame = (type: GameType): GenericGame => ({
    id: "",
    name: "",
    description: "",
    createdAt: new Date().toISOString(),
    type,
  });

  // ============================
  // Type Selector Logic
  // ============================
  const selectGameType = (type: GameType) => {
    console.log("🧩 [GameCreator] Selecting type:", type);
    const base = createBaseGame(type);

    switch (type) {
      case GameType.CHAIN_REACTION:
        setGame({ ...base, type, rounds: [] });
        break;
      case GameType.PYRAMID:
        setGame({ ...base, type, metadata: { questions: [] } });
        break;
      case GameType.JEOPARDY:
        setGame({ ...base, type, categories: [] });
        break;
      case GameType.FAMILY_FEUD:
        setGame({ ...base, type, rounds: [] });
        break;
      case GameType.MEMORY:
        setGame({ ...base, type, gridSize: "Medium", tiles: [], tileSource: "AI" });
        break;
      case GameType.HANGMAN:
        setGame({
          ...base,
          type,
          phrases: [],
          difficulty: "Medium",
          maxAttempts: 8,
        });
        break;
      case GameType.ROSCO:
        setGame({ ...base, type, clues: [] });
        break;
      case GameType.DEFINITIONS:
        setGame({ ...base, type, clues: [] });
        break;
      case GameType.PRICE_IS_RIGHT:
        setGame({ ...base, type, items: [] });
        break;
      case GameType.WHEEL_OF_FORTUNE:
        setGame({ ...base, type, rounds: [] });
        break;
      case GameType.LOTTERY:
        setGame({ ...base, type, tickets: [], draws: [] });
        break;
      case GameType.BINGO:
        setGame({ ...base, type, round: null }); // ✅ new
        break;
      default:
        setGame(base);
    }
  };

  // ============================
  // Firestore Save
  // ============================

  const persistDataUrlsForGame = async (currentGame: GenericGame | null) => {
    if (!currentGame) return { game: currentGame, failed: [] as string[], trimmed: [] as string[] };

    const cache = new Map<string, string>();
    const failed: string[] = [];
    const trimmed: string[] = [];

    const persistUrl = async (url?: string) => {
      if (!url || !url.startsWith("data:")) return url;
      if (cache.has(url)) return cache.get(url)!;
      try {
        // Primary: upload to Firebase Storage to avoid bloating Firestore docs
        const cdnUrl = await uploadDataUrlToStorage(url);
        if (cdnUrl) {
          cache.set(url, cdnUrl);
          return cdnUrl;
        }

        // Fallback: persist to local app images folder via Electron IPC
        if (window?.electronAPI?.invoke) {
          const saved = await window.electronAPI.invoke("save-data-url", url);
          if (typeof saved === "string" && saved.length > 0) {
            cache.set(url, saved);
            return saved;
          }
        } else {
          console.warn("Electron IPC not available; cannot persist media data URLs.");
        }
      } catch (err) {
        console.warn("Failed to persist data URL:", err);
      }
      failed.push(url.slice(0, 64)); // record a short prefix for debugging
      return null; // signal we could not persist
    };

    if (currentGame.type === GameType.JEOPARDY) {
      const game = currentGame as JeopardyGame;
      const categories = await Promise.all(
        (game.categories || []).map(async (cat) => {
          const questions = await Promise.all(
            (cat.questions || []).map(async (q) => {
              const questionMediaUrl = await persistUrl(q.questionMediaUrl);
              const answerMediaUrl = await persistUrl(q.answerMediaUrl);
              if (q.questionMediaUrl && q.questionMediaUrl.startsWith("data:") && !questionMediaUrl) {
                trimmed.push(q.questionMediaUrl.slice(0, 64));
              }
              if (q.answerMediaUrl && q.answerMediaUrl.startsWith("data:") && !answerMediaUrl) {
                trimmed.push(q.answerMediaUrl.slice(0, 64));
              }
              return {
                ...q,
                questionMediaUrl: questionMediaUrl ?? undefined,
                answerMediaUrl: answerMediaUrl ?? undefined,
              };
            })
          );
          return { ...cat, questions };
        })
      );
      return { game: { ...game, categories }, failed, trimmed };
    }

    return { game: currentGame, failed, trimmed };
  };

  // 🔧 Helper to remove Firestore‑unsupported values before saving
  function sanitizeForFirestore(obj: any): any {
    // Arrays (including potential nested arrays)
    if (Array.isArray(obj)) {
      const containsArray = obj.some((item) => Array.isArray(item));
      if (containsArray) {
        // convert any nested array element into an object wrapper to comply with Firestore rules
        return obj.map((item) =>
          Array.isArray(item) ? { row: sanitizeForFirestore(item) } : sanitizeForFirestore(item)
        );
      }
      return obj
        .map((item) => sanitizeForFirestore(item))
        .filter((item) => item !== undefined); // drop undefined slots
    }

    // Sets → Arrays
    if (obj instanceof Set) {
      return Array.from(obj).map((item) => sanitizeForFirestore(item));
    }

    // Plain objects: drop undefined / functions, sanitize nested structures
    if (obj && typeof obj === "object") {
      const sanitized: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || typeof v === "function") continue; // Firestore does not allow undefined/functions
        sanitized[k] = sanitizeForFirestore(v);
      }
      return sanitized;
    }

    // primitives (string/number/boolean/null) pass through
    return obj;
  }

  const handleSave = async () => {
    if (!game?.name?.trim()) {
      alert(lang === "es" ? "Por favor, ingresa un nombre." : "Please enter a name.");
      return;
    }

    setIsSaving(true);
    try {
      // The logic to persist data URLs and sanitize the game object is complex
      // and critical. It remains here to ensure the game object is fully prepared
      // before being passed up to the parent for saving.
      const { game: mediaSafeGame, failed } = await persistDataUrlsForGame(game);
      if (failed.length) {
        alert(
          lang === "es"
            ? "No se pudo guardar uno o más archivos multimedia. Vuelve a seleccionarlos e inténtalo de nuevo."
            : "One or more media files could not be saved. Please re-select them and try again."
        );
        setIsSaving(false);
        return;
      }

      const id = game.id || crypto.randomUUID();
      const createdAt = game.createdAt || new Date().toISOString();
      const slug = game.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || id;

      const rawToSave = { ...(mediaSafeGame || game), id, createdAt, slug, type: (mediaSafeGame || game)?.type };
      const gameToSave = sanitizeForFirestore(rawToSave);

      // The sole responsibility is now to pass the prepared game object to the parent.
      // The parent component (`App.tsx`) will handle the actual saving via the service.
      await onSave(gameToSave as Game);

      console.log("🎉 [GameCreator] Sent save request to parent for:", gameToSave.type);
    } catch (err) {
      console.error("❌ GameCreator Save Prep Error:", err);
      alert(lang === "es" ? "Error preparando el juego para guardar." : "Error preparing the game for saving.");
    } finally {
      setIsSaving(false);
    }
  };


  // ============================
  // AI Generators
  // ============================
  const handleGenerateJeopardyCategory = async () => {
    if (!aiTopic.trim()) return setError("Please enter a topic.");
    if (game?.type !== GameType.JEOPARDY) return;
    setIsGenerating(true);

    try {
      const response = await generateJeopardyCategory(aiTopic, aiDifficulty);

      if (response.error) {
        throw new Error(response.error);
      }

      const { name, questions } = response.data || { name: "", questions: [] };
      if (!questions.length) throw new Error("No category generated.");

      const newCategory: JeopardyCategory = {
        id: crypto.randomUUID(),
        name: name || aiTopic,
        questions: questions.map((q) => ({ ...q, id: crypto.randomUUID() })),
      };
      const current = (game as JeopardyGame).categories || [];
      setGame({
        ...game,
        type: GameType.JEOPARDY,
        categories: [...current, newCategory],
      });
      setAiTopic("");
    } catch (err: any) {
      setError(err.message || "AI error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePyramidQuestions = async () => {
    if (!aiTopic.trim()) return setError("Please enter a topic.");
    if (game?.type !== GameType.PYRAMID) return;
    setIsGenerating(true);

    try {
      const response = await generatePyramidQuestions(aiTopic, aiDifficulty);

      if (response.error) {
        throw new Error(response.error);
      }

      const questions = response.data || [];
      if (!questions.length) throw new Error("No questions generated.");

      setGame({ ...game, type: GameType.PYRAMID, metadata: { questions } });
      setAiTopic("");
    } catch (err: any) {
      setError(err.message || "AI error.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================
  // Editor Loader
  // ============================
  if (!game) {
    return <GameTypeSelector onSelect={selectGameType} onCreateSample={onCreateSample} />;
  }

  const renderEditor = () => {
    switch (game.type) {
      case GameType.CHAIN_REACTION:
        return <ChainReactionEditor game={game as ChainReactionGame} setGame={setGame} />;
      case GameType.JEOPARDY:
        return <JeopardyEditor game={game as JeopardyGame} setGame={setGame} />;
      case GameType.FAMILY_FEUD:
        return <FamilyFeudEditor game={game as FamilyFeudGame} setGame={setGame} />;
      case GameType.MEMORY:
        return <MemoryEditor game={game as MemoryGame} setGame={setGame} />;
      case GameType.HANGMAN:
        return <HangmanEditor game={game as HangmanGame} setGame={setGame} />;
      case GameType.ROSCO:
        return <RoscoEditor game={game as RoscoGame} setGame={setGame} />;
      case GameType.PYRAMID:
        return <PyramidEditor game={game as PyramidGame} setGame={setGame} />;
      case GameType.DEFINITIONS:
        return <DefinitionsEditor game={game as DefinitionsGame} setGame={setGame} />;
      case GameType.PRICE_IS_RIGHT:
        return <PriceIsRightEditor game={game as PriceIsRightGame} setGame={setGame} />;
      case GameType.WHEEL_OF_FORTUNE:
        return <WheelOfFortuneEditor game={game as WheelOfFortuneGame} setGame={setGame} />;
      case GameType.LOTTERY:
        return <LotteryEditor game={game as LotteryGame} setGame={setGame} />;
      case GameType.BINGO:
        return <BingoEditor game={game as any} setGame={setGame} />;
      default:
        return null;
    }
  };

  // ============================
  // Page Layout
  // ============================
  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <header>
        <h1 className="text-4xl font-bold capitalize">
          {existingGame
            ? `Edit ${game.type?.toLowerCase().replace(/_/g, " ")}`
            : `Create ${game.type?.toLowerCase().replace(/_/g, " ")}`}
        </h1>
        <p className="text-text-secondary mt-1">
          Design your quiz, add questions manually, or let AI do the work.
        </p>
      </header>

      {/* Basic Info */}
      <div className="bg-base-200 p-6 rounded-lg shadow-lg space-y-4">
        <h2 className="text-2xl font-bold">Game Details</h2>
        <input
          type="text"
          value={game.name || ""}
          onChange={(e) => setGame({ ...game, name: e.target.value })}
          placeholder="Enter a name..."
          className="bg-base-300 p-3 rounded-lg w-full"
        />
        <textarea
          value={game.description || ""}
          onChange={(e) => setGame({ ...game, description: e.target.value })}
          placeholder="Briefly describe the game..."
          className="bg-base-300 p-3 rounded-lg w-full min-h-[100px]"
        />
      </div>

      {/* Editor */}
      <div>{renderEditor()}</div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-green-600 text-white font-bold py-4 px-4 rounded-lg hover:bg-green-700"
      >
        {isSaving ? "Saving..." : "Save Game"}
      </button>
    </div>
  );
};

export default GameCreator;

// ============================
// Game Type Selector
// ============================
interface GameTypeSelectorProps {
  onSelect: (type: GameType) => void;
  onCreateSample: () => Promise<void>;
}

const GameTypeSelector: React.FC<GameTypeSelectorProps> = ({
  onSelect,
  onCreateSample,
}) => {
  const { lang } = useLanguage();
  const gameTypes: Array<{ type: GameType; label: string }> = [
    { type: GameType.MEMORY, label: "Memory" },
    { type: GameType.HANGMAN, label: "Hangman" },
    { type: GameType.ROSCO, label: "Rosco" },
    { type: GameType.JEOPARDY, label: "Jeopardy" },
    { type: GameType.CHAIN_REACTION, label: "Chain Reaction" },
    { type: GameType.FAMILY_FEUD, label: "Family Feud" },
    { type: GameType.PYRAMID, label: "Pyramid" },
    { type: GameType.DEFINITIONS, label: "Definitions" },
    { type: GameType.PRICE_IS_RIGHT, label: "Price Is Right" },
    { type: GameType.WHEEL_OF_FORTUNE, label: "Wheel of Fortune" },
    { type: GameType.LOTTERY, label: "Lottery" },
    { type: GameType.BINGO, label: "Bingo" }, // ✅ added
  ];

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold">Choose a Game Type</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {gameTypes.map((g) => (
          <button
            key={g.type}
            onClick={() => onSelect(g.type)}
            className="bg-base-200 p-6 rounded-lg shadow-lg hover:bg-base-300 text-center"
          >
            <h3 className="text-xl font-semibold">{g.label}</h3>
          </button>
        ))}
      </div>
      <div className="text-center">
        <button
          onClick={onCreateSample}
          className="bg-brand-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-secondary"
        >
          Create Sample Game
        </button>
      </div>
    </div>
  );
};
