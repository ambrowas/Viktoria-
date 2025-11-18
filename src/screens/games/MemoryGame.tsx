// src/screens/games/MemoryGame.tsx
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { correctSound, wrongSound, timerSound } from "@/utils/sound";

interface MemoryTile {
  id: string;
  matchId: string;
  content: string;
  sourceType: "AI" | "UPLOAD";
}

interface MemoryGameProps {
  tiles: MemoryTile[];
  gridSize: number;
  onExit: () => void;
}

const MemoryGame: React.FC<MemoryGameProps> = ({ tiles, gridSize, onExit }) => {
  const [cards, setCards] = useState<
    Array<MemoryTile & { flipped: boolean; matched: boolean }>
  >([]);
  const [flippedCards, setFlippedCards] = useState<typeof cards>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Shuffle & initialize cards
  useEffect(() => {
    if (tiles && tiles.length > 0) {
      const shuffled = [...tiles];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setCards(shuffled.map((t) => ({ ...t, flipped: false, matched: false })));
    }
  }, [tiles]);

  // Timer with sound
  useEffect(() => {
    if (cards.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    audioRef.current = new Audio("/sounds/timer.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4;
    audioRef.current.play().catch(() => {});

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [cards]);

  useEffect(() => {
    if (timeLeft === 0 || allMatched) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [timeLeft]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  const handleCardClick = (card: any) => {
    if (card.flipped || card.matched || flippedCards.length === 2) return;

    const updated = cards.map((c) =>
      c.id === card.id ? { ...c, flipped: true } : c
    );
    setCards(updated);

    const newFlipped = [...flippedCards, { ...card, flipped: true }];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);

      if (newFlipped[0].matchId === newFlipped[1].matchId) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              newFlipped.some((fc) => fc.id === c.id)
                ? { ...c, matched: true }
                : c
            )
          );
          setFlippedCards([]);
          correctSound.play();
          setMatches((m) => m + 1);
          triggerConfetti();
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              newFlipped.some((fc) => fc.id === c.id)
                ? { ...c, flipped: false }
                : c
            )
          );
          setFlippedCards([]);
          wrongSound.play();
        }, 1000);
      }
    }
  };

  const getGridDimensions = (size: number) => {
    switch (size) {
      case 16: return { cols: 4, rows: 4 };
      case 20: return { cols: 5, rows: 4 };
      case 28: return { cols: 7, rows: 4 };
      default:
        return {
          cols: Math.ceil(Math.sqrt(size)),
          rows: Math.ceil(size / Math.sqrt(size)),
        };
    }
  };

  const { cols, rows } = getGridDimensions(gridSize);
  const allMatched = cards.length > 0 && cards.every((c) => c.matched);

  // Scale cards to fit
  const cardSize = Math.min(
    Math.floor(window.innerWidth / (cols * 2)),
    Math.floor(window.innerHeight / (rows * 2.2))
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 flex flex-col items-center justify-center z-50 p-6">
      {/* Stats bar */}
      <div className="flex justify-center items-center gap-8 mb-6 text-white text-xl font-bold">
        <span className="bg-blue-800 px-4 py-2 rounded-lg shadow-md">
          Moves: {moves} | Matches: {matches}/{cards.length / 2}
        </span>
        <span className={`px-4 py-2 rounded-lg shadow-md ${timeLeft <= 10 ? "bg-red-600" : "bg-green-600"}`}>
          ⏱ {timeLeft}s
        </span>
        <button
          onClick={onExit}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 shadow-md"
        >
          Exit
        </button>
      </div>

      {/* Win screen */}
      {allMatched && (
        <div className="mb-6 p-6 bg-green-200 border-2 border-green-600 text-green-900 rounded-xl text-center shadow-lg">
          <h3 className="text-3xl font-bold mb-2">🎉 You Won!</h3>
          <p className="text-lg">Finished in {moves} moves and {120 - timeLeft}s</p>
          <button
            onClick={onExit}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md"
          >
            Back to Menu
          </button>
        </div>
      )}

      {/* Game board */}
      <div
        className="grid gap-4 p-6 border-4 border-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.3)] bg-black/10"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cardSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cardSize}px)`,
        }}
      >
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            className={`relative cursor-pointer rounded-xl border-2 shadow-lg transition-all duration-300
              ${
                card.matched
                  ? "border-green-500 bg-green-700 animate-pulse"
                  : card.flipped
                  ? "border-blue-400"
                  : "border-white/60 hover:border-white"
              }`}
            onClick={() => handleCardClick(card)}
            whileHover={{ scale: card.flipped || card.matched ? 1 : 1.08 }}
            whileTap={{ scale: card.flipped || card.matched ? 1 : 0.95 }}
            style={{ width: cardSize, height: cardSize }}
          >
            <motion.div
              className="absolute w-full h-full"
              initial={false}
              animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }}
              transition={{ duration: 0.6 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Front */}
              <div
                className="absolute w-full h-full flex items-center justify-center bg-white text-black rounded-xl overflow-hidden text-3xl font-bold"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                {card.sourceType === "UPLOAD" ? (
                  <img
                    src={card.content}
                    alt=""
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span>{card.content}</span>
                )}
              </div>

              {/* Back */}
              <div
                className="absolute w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-700 to-purple-800 rounded-xl text-white font-bold text-2xl"
                style={{ backfaceVisibility: "hidden" }}
              >
                {i + 1}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MemoryGame;
