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
} from "@/types";

import { motion } from "framer-motion";
import Spinner from "../components/Spinner";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/services/firebase";
import { doc, setDoc } from "firebase/firestore";
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

  // 🔧 Helper to remove nested arrays before saving
function sanitizeForFirestore(obj: any): any {
  if (Array.isArray(obj)) {
    // detect nested arrays
    if (obj.length > 0 && Array.isArray(obj[0])) {
      // convert [[...],[...]] → [{ row: [...] }, ...]
      return obj.map((row) => ({ row: sanitizeForFirestore(row) }));
    }
    // otherwise sanitize each element
    return obj.map(sanitizeForFirestore);
  } else if (obj && typeof obj === "object") {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      sanitized[k] = sanitizeForFirestore(v);
    }
    return sanitized;
  }
  return obj;
}

 const handleSave = async () => {
  if (!game?.name?.trim()) {
    alert(lang === "es" ? "Por favor, ingresa un nombre." : "Please enter a name.");
    return;
  }

  setIsSaving(true);
  try {
    const id = game.id || crypto.randomUUID();
    const createdAt = game.createdAt || new Date().toISOString();

    // ✅ Deep sanitize before writing to Firestore
    const sanitized = sanitizeForFirestore(game);

    const gameToSave = {
      ...sanitized,
      id,
      createdAt,
      type: game.type,
    };

    console.log("✅ [GameCreator] Saving sanitized data:", gameToSave);

    await setDoc(doc(db, "games", id), gameToSave);
    await onSave(gameToSave as Game);

    console.log("🎉 [GameCreator] Saved successfully:", gameToSave.type);
  } catch (err) {
    console.error("❌ Firestore Save Error:", err);
    alert(lang === "es" ? "Error guardando el juego." : "Error saving the game.");
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
      const { name, questions } = await generateJeopardyCategory(aiTopic, aiDifficulty);
      const newCategory: JeopardyCategory = {
        id: crypto.randomUUID(),
        name,
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
      const questions = await generatePyramidQuestions(aiTopic, aiDifficulty);
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
