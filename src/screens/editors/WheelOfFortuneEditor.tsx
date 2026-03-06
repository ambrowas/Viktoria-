import React, { useState } from "react";
import { WheelOfFortuneGame, WheelRound } from "@/types";
import { generateWheelOfFortuneRounds } from "@/services/geminiService";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  game: WheelOfFortuneGame;
  setGame: (g: WheelOfFortuneGame) => void;
}

export default function WheelOfFortuneEditor({ game, setGame }: Props) {
  const { lang } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [categoryInput, setCategoryInput] = useState("");
  const [roundCount, setRoundCount] = useState(5);

  // ============================
  // ADD / UPDATE / REMOVE ROUNDS
  // ============================
  const addRound = () => {
    const newRound: WheelRound = {
      id: crypto.randomUUID(),
      category: "",
      puzzle: "",
      prizeValue: 0,
    };
    setGame({ ...game, rounds: [...(game.rounds || []), newRound] });
  };

  const removeRound = (id: string) => {
    setGame({ ...game, rounds: game.rounds.filter((r) => r.id !== id) });
  };

  const updateRound = (id: string, field: keyof WheelRound, value: any) => {
    setGame({
      ...game,
      rounds: game.rounds.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    });
  };

  // ============================
  // AI: BULK GENERATION
  // ============================
  const handleBulkGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const response = await generateWheelOfFortuneRounds(
        categoryInput || "General Knowledge",
        Math.min(Math.max(roundCount, 1), 10),
        lang
      );

      if (response.error) {
        throw new Error(response.error);
      }

      const generatedRounds = response.data || [];

      setGame({
        ...game,
        rounds: generatedRounds.map((r: any) => ({
          id: crypto.randomUUID(),
          category: r.category || categoryInput || "General",
          puzzle: r.puzzle || "Untitled Puzzle",
          prizeValue: r.prizeValue || Math.floor(Math.random() * 900) + 100,
        })),
      });
    } catch (err: any) {
      console.error("❌ Error generating rounds:", err);
      alert(err.message || "AI generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================
  // AI: SINGLE ROUND GENERATION
  // ============================
  const handleGenerateSingle = async (id: string, category: string) => {
    console.log("🎡 [WheelOfFortuneEditor] handleGenerateSingle called", { id, category });
    setIsGenerating(true);
    try {
      const response = await generateWheelOfFortuneRounds(
        category || "General",
        1,
        lang
      );

      console.log("🎡 [WheelOfFortuneEditor] AI Response:", response);

      if (response.error) {
        throw new Error(response.error);
      }

      const [r] = response.data || [];
      if (!r) {
        console.warn("🎡 [WheelOfFortuneEditor] No puzzle returned in data");
        throw new Error("No puzzle generated.");
      }

      console.log("🎡 [WheelOfFortuneEditor] Updating round with:", r);

      // ✅ Atomic update to prevent React state race conditions
      setGame({
        ...game,
        rounds: game.rounds.map((round) =>
          round.id === id
            ? {
              ...round,
              category: r.category || category,
              puzzle: r.puzzle,
              prizeValue: r.prizeValue || Math.floor(Math.random() * 900) + 100,
            }
            : round
        ),
      });
    } catch (err: any) {
      console.error("❌ [WheelOfFortuneEditor] Error generating single puzzle:", err);
      alert(err.message || "Could not generate puzzle for this round.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================
  // RENDER
  // ============================
  return (
    <div className="bg-base-200 p-6 rounded-lg shadow-lg space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-yellow-400 mb-1">
            🎡 Wheel of Fortune — Editor
          </h2>
          <p className="text-gray-400">
            Create puzzles, assign categories, and define prize values.
          </p>
        </div>

        {/* AI Bulk Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            placeholder="Category (e.g. Movies, Animals)"
            className="p-2 rounded bg-base-100 w-48"
          />
          <input
            type="number"
            value={roundCount}
            onChange={(e) => setRoundCount(parseInt(e.target.value))}
            min={1}
            max={10}
            className="p-2 rounded bg-base-100 w-20"
          />
          <button
            onClick={handleBulkGenerate}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-lg font-bold text-white ${isGenerating ? "bg-gray-600" : "bg-green-600 hover:bg-green-700"
              }`}
          >
            {isGenerating ? "Generating..." : "✨ Generate Rounds"}
          </button>
        </div>
      </div>

      {/* Rounds */}
      <div className="space-y-4">
        {game.rounds.map((round) => (
          <div
            key={round.id}
            className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-md"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-xl text-white">
                Round {game.rounds.indexOf(round) + 1}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerateSingle(round.id, round.category)}
                  className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700"
                >
                  🎯 Generate Puzzle
                </button>
                <button
                  onClick={() => removeRound(round.id)}
                  className="bg-red-600 text-white text-sm px-3 py-1 rounded hover:bg-red-700"
                >
                  🗑 Remove
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <input
                type="text"
                value={round.category}
                onChange={(e) =>
                  updateRound(round.id, "category", e.target.value)
                }
                placeholder="Category"
                className="p-2 rounded bg-base-100 w-full"
              />
              <input
                type="text"
                value={round.puzzle}
                onChange={(e) =>
                  updateRound(round.id, "puzzle", e.target.value)
                }
                placeholder="Puzzle Phrase"
                className="p-2 rounded bg-base-100 w-full font-mono tracking-widest uppercase"
              />
              <input
                type="number"
                value={round.prizeValue}
                onChange={(e) =>
                  updateRound(round.id, "prizeValue", parseInt(e.target.value))
                }
                placeholder="Prize Value"
                className="p-2 rounded bg-base-100 w-full"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add Round Button */}
      <div className="text-center pt-4">
        <button
          onClick={addRound}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg"
        >
          ➕ Add Round
        </button>
      </div>
    </div>
  );
}
