import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import { BingoGame, BingoRound, BingoCard } from "@/types";
import { generateBingoData } from "@/services/geminiService";
import { useLanguage } from "@/context/LanguageContext";

/* ----------------------------
   🎨 COMPONENT
----------------------------- */
interface Props {
  game: BingoGame;
  setGame: (g: BingoGame) => void;
}

const BingoEditor: React.FC<Props> = ({ game, setGame }) => {
  const { lang } = useLanguage();
  const [topic, setTopic] = useState(game.description || "");
  const [mode, setMode] = useState<"CLASSIC" | "90BALL" | "CONCEPTUAL">("CLASSIC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ----------------------------
     🤖 GENERATE CARDS (AI OR MOCK)
  ----------------------------- */
  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await generateBingoData(topic, mode, lang);

      if (response.error) {
        throw new Error(response.error);
      }

      const result = response.data;
      if (!result) throw new Error("No Bingo data generated.");

      console.log("🎯 Bingo data received:", result);

      const cards: BingoCard[] =
        (result.cards || [])
          .filter((grid: any) => Array.isArray(grid)) // Defensive check
          .map((grid: (string | number)[][]) => ({
            id: uuid(),
            // ✅ wrap each row as an object instead of nested arrays
            grid: grid.map((row) =>
              Array.isArray(row)
                ? row.map((n) => (isNaN(Number(n)) ? n : Number(n)))
                : []
            ),
            hasFreeSpace: true,
          }));

      const newRound: BingoRound = {
        id: uuid(),
        topic,
        mode,
        cards,
        createdAt: new Date().toISOString(),
      };

      const updatedGame: BingoGame = {
        ...game,
        description: topic,
        round: newRound,
      };

      setGame(updatedGame);

      // Local-only: no remote save
      console.log("✅ Generated Bingo round (local only):", newRound);
    } catch (err: any) {
      console.error("❌ Bingo generation failed:", err);
      setError("Error generating Bingo cards. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------
     🧱 UI LAYOUT
  ----------------------------- */
  return (
    <div className="p-6 bg-base-200 rounded-lg shadow-lg space-y-6 text-white">
      <h2 className="text-2xl font-bold">🎯 Bingo Game Editor</h2>
      <p className="text-gray-400 mb-2">
        Create a Bingo game — classic (75-ball), 90-ball, or conceptual (words, ideas, trivia categories).
      </p>

      {/* Topic / Theme */}
      <div>
        <label className="block text-gray-300 mb-1">Topic / Theme</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., African Capitals, Inventions, Proverbs..."
          className="w-full p-2 rounded bg-base-100 border border-gray-700"
        />
      </div>

      {/* Mode Selector */}
      <div>
        <label className="block text-gray-300 mb-1">Mode</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "CLASSIC" | "90BALL" | "CONCEPTUAL")}
          className="w-full p-2 rounded bg-base-100 border border-gray-700"
        >
          <option value="CLASSIC">Classic 75-Ball</option>
          <option value="90BALL">90-Ball (UK Style)</option>
          <option value="CONCEPTUAL">Conceptual (words or categories)</option>
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded font-bold"
      >
        {loading ? "Generating..." : "🎲 Generate Bingo Cards"}
      </button>

      {/* Error Message */}
      {error && <p className="text-red-500 font-semibold">{error}</p>}

      {/* Cards Preview */}
      {game.round?.cards?.length ? (
        <div className="mt-6 space-y-6">
          <h3 className="text-xl font-semibold mb-2">
            🎟️ Generated Cards ({game.round.cards.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {game.round.cards.map((card) => (
              <div
                key={card.id}
                className="bg-base-300 border border-gray-700 rounded-lg p-3 shadow"
              >
                <table className="w-full text-center border-collapse">
                  <tbody>
                    {card.grid.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((num, cIdx) => (
                          <td
                            key={cIdx}
                            className={`w-10 h-10 border border-gray-600 ${num === 0 ? "bg-yellow-600 text-black font-bold" : "bg-gray-800"
                              }`}
                          >
                            {num === 0 ? "★" : num}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-400 italic mt-4">
          No cards generated yet. Click “Generate Bingo Cards” to begin.
        </p>
      )}
    </div>
  );
};

export default BingoEditor;
