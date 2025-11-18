import React, { useState, useEffect } from "react";
import Lottie from "lottie-react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { getAuth } from "firebase/auth";

import fireworksAnim from "@/assets/animations/fireworks.json";
import fireAnim from "@/assets/animations/fire.json";
import partyAnim from "@/assets/animations/party.json";
import Leaderboard from "@/screens/Leaderboard"; // ✅ Integrated leaderboard

import { LotteryGame as LotteryGameType } from "@/types";

export default function LotteryGame({ game }: { game: LotteryGameType }) {
  const [playerTicket, setPlayerTicket] = useState<number[]>([]);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [animating, setAnimating] = useState(false);
  const [drawHistory, setDrawHistory] = useState<any[]>([]);
  const [selectedDraw, setSelectedDraw] = useState<any | null>(null);
  const [celebrationType, setCelebrationType] = useState<"fireworks" | "fire" | "party" | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false); // ✅ Leaderboard toggle

  const user = getAuth().currentUser;

  /* ----------------------------
     📜 Load Draw History
  ----------------------------- */
  useEffect(() => {
    const loadDraws = async () => {
      try {
        const q = query(collection(db, "lotteryRounds"), orderBy("date", "desc"), limit(10));
        const snapshot = await getDocs(q);
        const draws = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setDrawHistory(draws);
        setSelectedDraw(draws[0] || null);
      } catch (err) {
        console.error("❌ Firestore load error:", err);
      }
    };
    loadDraws();
  }, []);

  /* ----------------------------
     🎟️ Generate & Save Ticket
  ----------------------------- */
  const generateTicket = async () => {
    const numbers: number[] = [];
    while (numbers.length < 5) {
      const n = Math.floor(Math.random() * 50) + 1;
      if (!numbers.includes(n)) numbers.push(n);
    }
    const sorted = numbers.sort((a, b) => a - b);
    setPlayerTicket(sorted);
    setResultMessage(null);
    setCelebrationType(null);
    setRevealed([]);

    if (user && selectedDraw) {
      try {
        const ticketRef = collection(db, "players", user.uid, "tickets");
        const docRef = await addDoc(ticketRef, {
          drawId: selectedDraw.id,
          numbers: sorted,
          createdAt: serverTimestamp(),
        });
        setTicketId(docRef.id);
        console.log("🎟️ Ticket saved:", docRef.id);
      } catch (err) {
        console.warn("⚠️ Could not save ticket:", err);
      }
    }
  };

  /* ----------------------------
     🧮 Compare Ticket & Save Result
  ----------------------------- */
  useEffect(() => {
    if (!selectedDraw || revealed.length < selectedDraw.drawNumbers.length) return;

    const winningSet = new Set(selectedDraw.drawNumbers);
    const matches = playerTicket.filter((n) => winningSet.has(n));
    let prizeLevel: string | null = null;

    if (matches.length === 5) {
      prizeLevel = "jackpot";
      setResultMessage("🏆 JACKPOT! All 5 matched!");
      setCelebrationType("party");
    } else if (matches.length === 4) {
      prizeLevel = "major";
      setResultMessage("🔥 You matched 4! Major win!");
      setCelebrationType("fire");
    } else if (matches.length === 3) {
      prizeLevel = "small";
      setResultMessage("🎆 You matched 3! Small prize!");
      setCelebrationType("fireworks");
    } else {
      prizeLevel = "none";
      setResultMessage(`😞 Only ${matches.length} matched. Try again.`);
      setCelebrationType(null);
    }

    if (user && ticketId) {
      const ref = doc(db, "players", user.uid, "tickets", ticketId);
      updateDoc(ref, {
        matches: matches.length,
        result: prizeLevel === "none" ? "lose" : "win",
        prizeLevel,
      }).catch((e) => console.error("❌ Failed to update result:", e));
    }
  }, [revealed]);

  /* ----------------------------
     🎬 Reveal Animation
  ----------------------------- */
  const startReveal = () => {
    if (!selectedDraw) return;
    setAnimating(true);
    setRevealed([]);
    setCelebrationType(null);
    let index = 0;
    const interval = setInterval(() => {
      setRevealed((prev) => [...prev, selectedDraw.drawNumbers[index]]);
      index++;
      if (index >= selectedDraw.drawNumbers.length) {
        clearInterval(interval);
        setTimeout(() => setAnimating(false), 800);
      }
    }, 900);
  };

  /* ----------------------------
     🎉 Celebration Animation
  ----------------------------- */
  const renderCelebration = () => {
    if (!celebrationType) return null;
    const animMap = { fireworks: fireworksAnim, fire: fireAnim, party: partyAnim };
    return (
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
        <Lottie animationData={animMap[celebrationType]} loop={false} className="w-[400px] h-[400px]" />
      </div>
    );
  };

  /* ----------------------------
     🧱 UI
  ----------------------------- */
  return (
    <div className="relative p-6 text-white overflow-hidden">
      {renderCelebration()}

      <h2 className="text-2xl font-bold mb-2">🎰 Lottery Game</h2>

      {/* Draw Selector */}
      {drawHistory.length > 1 && (
        <div className="mb-4">
          <label className="text-gray-300 mr-2">Select Draw:</label>
          <select
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1"
            onChange={(e) => {
              const draw = drawHistory.find((d) => d.id === e.target.value);
              setSelectedDraw(draw);
              setResultMessage(null);
              setRevealed([]);
              setCelebrationType(null);
            }}
            value={selectedDraw?.id || ""}
          >
            {drawHistory.map((d) => (
              <option key={d.id} value={d.id}>
                {new Date(d.date).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Draw Reveal */}
      {!selectedDraw ? (
        <p className="text-red-400">No draw available.</p>
      ) : (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <p className="text-gray-300 mb-2">
            <strong>Draw Date:</strong> {new Date(selectedDraw.date).toLocaleString()}
          </p>
          <div className="flex gap-3 justify-center mt-4 mb-2">
            {selectedDraw.drawNumbers.map((num: number, i: number) => (
              <div
                key={i}
                className={`w-12 h-12 flex items-center justify-center rounded-full text-lg font-bold transition-all ${
                  revealed.includes(num)
                    ? "bg-yellow-400 text-black scale-110"
                    : "bg-gray-700 text-gray-500"
                }`}
              >
                {revealed.includes(num) ? num : "?"}
              </div>
            ))}
          </div>
          <button
            disabled={animating}
            onClick={startReveal}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded mt-2 font-semibold disabled:opacity-60"
          >
            {animating ? "Revealing..." : "Reveal Draw"}
          </button>
        </div>
      )}

      {/* Player Ticket */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-3">🎟️ Your Ticket</h3>
        {playerTicket.length > 0 ? (
          <div className="flex gap-3 justify-center flex-wrap mb-3">
            {playerTicket.map((num, i) => (
              <div
                key={i}
                className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold ${
                  revealed.includes(num)
                    ? "bg-green-500 text-black scale-110"
                    : "bg-gray-700 text-white"
                }`}
              >
                {num}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 mb-3 italic">You don’t have a ticket yet.</p>
        )}
        <div className="flex justify-center gap-3">
          <button
            onClick={generateTicket}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold"
          >
            Generate Ticket
          </button>
        </div>
      </div>

      {/* Result */}
      {resultMessage && (
        <div
          className={`text-center text-lg font-semibold mt-4 ${
            resultMessage.includes("JACKPOT") || resultMessage.includes("win")
              ? "text-yellow-400"
              : "text-gray-400"
          }`}
        >
          {resultMessage}
        </div>
      )}

      {/* 🏆 Leaderboard Toggle */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded font-semibold"
        >
          {showLeaderboard ? "⬇️ Hide Leaderboard" : "🏆 View Leaderboard"}
        </button>
      </div>

      {showLeaderboard && (
        <div className="mt-8 border-t border-gray-700 pt-4">
          <Leaderboard game={game} />
        </div>
      )}
    </div>
  );
}
