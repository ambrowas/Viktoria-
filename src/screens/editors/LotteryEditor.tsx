import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import { GameType, GameBase } from "@/types";
import { generateLotteryData } from "@/services/geminiService";
import { db } from "@/services/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

/* ----------------------------
   🎟️ TYPE DEFINITIONS
----------------------------- */
export interface LotteryDraw {
  id: string;
  drawNumbers: number[]; // ✅ strictly numeric
  date: string;
}

export interface LotteryTicket {
  id: string;
  numbers: number[]; // ✅ strictly numeric
  owner?: string;
  isWinner?: boolean;
}

export interface LotteryGame extends GameBase {
  type: GameType.LOTTERY;
  mode: "TRADITIONAL" | "CONCEPTUAL";
  draw: LotteryDraw | null;
  tickets: LotteryTicket[];
}

/* ----------------------------
   🎨 COMPONENT
----------------------------- */
interface Props {
  game: LotteryGame;
  setGame: (g: LotteryGame) => void;
}

export default function LotteryEditor({ game, setGame }: Props) {
  const [topic, setTopic] = useState(game.description || "");
  const [mode, setMode] = useState<"TRADITIONAL" | "CONCEPTUAL">(
    game.mode || "TRADITIONAL"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ----------------------------
     🤖 HANDLE AI GENERATION
  ----------------------------- */
  const handleGenerate = async () => {
  setLoading(true);
  setError(null);

  try {
    // ✅ Accept that Gemini may return strings or numbers
    const result: {
      draws: (string | number)[];
      tickets: (string | number)[][];
    } = await generateLotteryData(topic, mode, "en");

    console.log("🎟️ Lottery data received:", result);

    // ✅ Normalize draws to numbers
    const drawNumbers = (result.draws || [])
      .map((n) => Number(n))
      .filter((n) => !isNaN(n));

    const draw: LotteryDraw = {
      id: uuid(),
      drawNumbers,
      date: new Date().toISOString(),
    };

    // ✅ Prepare winning set
    const winningSet = new Set(drawNumbers);

    // ✅ Normalize tickets
    const tickets: LotteryTicket[] =
      (result.tickets || []).map((ticket) => {
        const numbers = ticket
          .map((n) => Number(n))
          .filter((n) => !isNaN(n));
        const matches = numbers.filter((n) => winningSet.has(n)).length;
        return {
          id: uuid(),
          numbers,
          isWinner: matches >= 3,
        };
      }) || [];

    // ✅ Update local state
    const updatedGame: LotteryGame = {
      ...game,
      description: topic,
      mode,
      draw,
      tickets,
    };

    setGame(updatedGame);

    // ✅ Publish to Firestore only if valid
    if (drawNumbers.length > 0) {
      await addDoc(collection(db, "lotteryRounds"), {
        id: draw.id,
        date: draw.date,
        drawNumbers,
        createdAt: serverTimestamp(),
      });
      console.log("✅ Published draw to Firestore:", drawNumbers);
    } else {
      console.warn("⚠️ No valid drawNumbers found, skipping Firestore sync.");
    }
  } catch (err: any) {
    console.error("❌ Lottery generation failed:", err);
    setError("Error generating lottery data. Try again.");
  } finally {
    setLoading(false);
  }
};


  /* ----------------------------
     🧱 UI LAYOUT
  ----------------------------- */
  return (
    <div className="p-6 bg-base-200 rounded-lg shadow-lg space-y-5 text-white">
      <h2 className="text-2xl font-bold">🎰 Lottery Game Editor</h2>
      <p className="text-gray-400 mb-2">
        Create a traditional number lottery or a concept-based version about any
        topic (e.g., “African Capitals,” “Inventions,” etc.).
      </p>

      {/* Topic / Theme */}
      <div>
        <label className="block text-gray-300 mb-1">Topic / Theme</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., African Capitals"
          className="w-full p-2 rounded bg-base-100 border border-gray-700"
        />
      </div>

      {/* Mode Selector */}
      <div>
        <label className="block text-gray-300 mb-1">Mode</label>
        <select
          value={mode}
          onChange={(e) =>
            setMode(e.target.value as "TRADITIONAL" | "CONCEPTUAL")
          }
          className="w-full p-2 rounded bg-base-100 border border-gray-700"
        >
          <option value="TRADITIONAL">Traditional (Numbers)</option>
          <option value="CONCEPTUAL">Concept-Based (Words)</option>
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded font-bold"
      >
        {loading ? "Generating..." : "🎲 Generate Lottery"}
      </button>

      {/* Error Display */}
      {error && <p className="text-red-500 font-semibold">{error}</p>}

      {/* Draw Preview */}
      {game.draw && (
        <div className="mt-6 bg-base-300 p-4 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Current Draw</h3>
          <p className="text-sm text-gray-400 mb-2">
            {new Date(game.draw.date).toLocaleString()}
          </p>
          <div className="flex flex-wrap gap-2">
            {game.draw.drawNumbers.map((num, i) => (
              <span
                key={i}
                className="bg-green-700 text-white px-3 py-1 rounded-full text-lg"
              >
                {num}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ticket Preview */}
      {game.tickets?.length > 0 && (
        <div className="mt-6 bg-base-300 p-4 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Tickets</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {game.tickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`p-3 border rounded ${
                  ticket.isWinner
                    ? "border-yellow-400 bg-yellow-900/20"
                    : "border-gray-600"
                }`}
              >
                <div className="flex flex-wrap gap-2">
                  {ticket.numbers.map((n, i) => (
                    <span
                      key={i}
                      className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
                    >
                      {n}
                    </span>
                  ))}
                </div>
                {ticket.isWinner && (
                  <p className="text-yellow-400 text-sm mt-1 font-semibold">
                    ⭐ Winner!
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
