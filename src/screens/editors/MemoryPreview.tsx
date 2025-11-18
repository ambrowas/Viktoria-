// src/screens/editors/MemoryPreview.tsx
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { correctSound, wrongSound } from "@/utils/sound";

interface MemoryTile {
  id: string;
  matchId: string;
  content: string;
  sourceType: "AI" | "UPLOAD";
}

interface MemoryPreviewProps {
  tiles: MemoryTile[];
  gridSize: number;
  onClose: () => void;
}

const AUTO_REVEAL_DURATION = 2000;

const MemoryPreview: React.FC<MemoryPreviewProps> = ({
  tiles,
  gridSize,
  onClose,
}) => {
  const [cards, setCards] = useState<
    Array<MemoryTile & { flipped: boolean; matched: boolean }>
  >([]);
  const [flippedCards, setFlippedCards] = useState<typeof cards>([]);
  const [isAutoRevealing, setIsAutoRevealing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Shuffle and initialize cards
  useEffect(() => {
    if (tiles && tiles.length > 0) {
      const shuffledTiles = [...tiles];
      for (let i = shuffledTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTiles[i], shuffledTiles[j]] = [
          shuffledTiles[j],
          shuffledTiles[i],
        ];
      }
      const initializedCards = shuffledTiles.map((tile) => ({
        ...tile,
        flipped: true,
        matched: false,
      }));

      setCards(initializedCards);
      setFlippedCards([]);
      setIsAutoRevealing(true);

      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }

      revealTimeoutRef.current = setTimeout(() => {
        setCards((prev) =>
          prev.map((card) => ({
            ...card,
            flipped: card.matched,
          }))
        );
        setIsAutoRevealing(false);
        revealTimeoutRef.current = null;
      }, AUTO_REVEAL_DURATION);
    }
    return () => {
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
    };
  }, [tiles]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#22c55e", "#3b82f6", "#facc15"],
    });
  };

  const handleCardClick = (card: any) => {
    if (
      isAutoRevealing ||
      card.flipped ||
      card.matched ||
      flippedCards.length === 2
    )
      return;

    const updatedCards = cards.map((c) =>
      c.id === card.id ? { ...c, flipped: true } : c
    );
    setCards(updatedCards);

    const newFlipped = [...flippedCards, { ...card, flipped: true }];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      if (newFlipped[0].matchId === newFlipped[1].matchId) {
        // ✅ Match
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
          triggerConfetti();
        }, 500);
      } else {
        // ❌ Mismatch
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

  const gridColumns = Math.sqrt(gridSize);

  const getCardSize = () => {
    if (gridSize <= 16) return "w-20 h-28 sm:w-24 sm:h-32"; // small grid
    if (gridSize <= 20) return "w-16 h-24 sm:w-20 sm:h-28"; // medium
    return "w-14 h-20 sm:w-16 sm:h-24"; // large
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex flex-col items-center justify-center z-[100] p-4">
      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-4xl mb-4">
        <h2 className="text-3xl font-bold text-white">Memory Game</h2>
        <button
          onClick={onClose}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 border-2 border-white"
        >
          Exit
        </button>
      </div>

      {/* Board */}
      <div
        ref={containerRef}
        className="flex flex-wrap justify-center gap-3 p-6 rounded-xl shadow-2xl border-4 border-white bg-gradient-to-br from-slate-800 to-slate-900"
        style={{
          maxWidth: `${gridColumns * 100}px`,
        }}
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            className={`${getCardSize()} cursor-pointer rounded-xl border-2 border-white transition-all duration-300 ${
              card.matched
                ? "bg-green-700 text-white"
                : "bg-blue-700 text-white"
            }`}
            onClick={() => handleCardClick(card)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="relative w-full h-full"
              initial={false}
              animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }}
              transition={{ duration: 0.6 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 w-full h-full flex items-center justify-center bg-white text-black rounded-xl overflow-hidden"
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
                  <span className="text-2xl font-bold">{card.content}</span>
                )}
              </div>

              {/* Back → number reference */}
              <div
                className="absolute inset-0 w-full h-full flex items-center justify-center bg-blue-900 rounded-xl text-white"
                style={{ backfaceVisibility: "hidden" }}
              >
                <span className="text-xl sm:text-2xl font-bold">
                  {index + 1}
                </span>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MemoryPreview;
