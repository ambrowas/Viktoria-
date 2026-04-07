// src/screens/games/MemoryGame.tsx
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { correctSound, wrongSound, timerSound } from "@/utils/sound";
import { useSync } from "@/context/SyncContext";

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
    Array<MemoryTile & { flipped: boolean; matched: boolean; originalIndex: number }>
  >([]);
  const [flippedCards, setFlippedCards] = useState<typeof cards>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isHoveringGrid, setIsHoveringGrid] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [pendingRemoteClick, setPendingRemoteClick] = useState<number | null>(null);

  const { sessionData, isRemoteMode, updateSession } = useSync();
  const lastCommandRef = useRef<number>(Date.now());

  // 📡 Broadcast game state to Host
  useEffect(() => {
    if (!isRemoteMode) return;
    updateSession({
      flippedIndices: cards.map((c, i) => c.flipped || c.matched ? i : -1).filter(i => i !== -1),
      matchedPairs: cards.filter(c => c.matched).map(c => c.matchId),
      shuffledIndices: cards.map(c => c.originalIndex)
    } as any);
  }, [cards, isRemoteMode, updateSession]);

  // 🎧 Listen for Host Commands
  useEffect(() => {
    if (!isRemoteMode || !sessionData?.hostCommand) return;
    const cmd = sessionData.hostCommand as any;
    
    const ts = cmd.timestamp || 0;
    if (ts > 0 && ts <= lastCommandRef.current) return;
    if (ts > 0) lastCommandRef.current = ts;

    if (cmd.type === 'memory_reset' || cmd.type === 'memory_shuffle') {
      setFlippedCards([]);
      if (cmd.type === 'memory_reset') {
        setMoves(0);
        setMatches(0);
        setTimeLeft(120);
      }
      setCards(prev => {
        const next = cmd.type === 'memory_reset' 
            ? prev.map(c => ({ ...c, flipped: false, matched: false }))
            : [...prev];

        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [next[i], next[j]] = [next[j], next[i]];
        }
        return next;
      });
    }

    if (cmd.type === 'memory_reveal_all') {
      setCards(prev => prev.map(c => ({ ...c, flipped: true })));
    }

    if (cmd.type === 'memory_force_flip') {
       const index = cmd.payload?.index;
       if (typeof index === 'number') {
           setPendingRemoteClick(index);
       }
    }
  }, [sessionData?.hostCommand, isRemoteMode]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Shuffle & initialize cards
  useEffect(() => {
    if (tiles && tiles.length > 0) {
      // Create objects with their original index to guarantee perfect syncing
      const deck = tiles.map((t, index) => ({ ...t, flipped: false, matched: false, originalIndex: index }));
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      setCards(deck);
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

  // Execute remote clicks using fresh state closures via useEffect
  useEffect(() => {
    if (pendingRemoteClick !== null) {
      console.log("[MemoryGame] Remote click received for index:", pendingRemoteClick);
      console.log("[MemoryGame] Card at index:", cards[pendingRemoteClick]);
      if (cards[pendingRemoteClick]) {
          handleCardClick(cards[pendingRemoteClick]);
      } else {
          console.warn("[MemoryGame] No card found at index", pendingRemoteClick);
      }
      setPendingRemoteClick(null);
    }
  }, [pendingRemoteClick, cards]);

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

  // Scale cards to fit (accounting for gaps and padding mathematically)
  // Maximize the usage of space.
  const GAP_SIZE = 16;
  const PADDING_WIDTH = 120; // 64 for outer padding/border, 56 safe edge
  const PADDING_HEIGHT = 160; // Extra room for the top stats bar and paddings
  
  const cardSize = Math.max(
    80,
    Math.min(
      Math.floor((dimensions.width - PADDING_WIDTH - (cols - 1) * GAP_SIZE) / cols),
      Math.floor((dimensions.height - PADDING_HEIGHT - (rows - 1) * GAP_SIZE) / rows)
    )
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 flex flex-col items-center justify-center z-50 p-6">
      {/* Stats bar */}
      <div 
        className={`flex justify-center items-center gap-8 mb-6 text-white text-xl font-bold transition-opacity duration-300 ${
          isHoveringGrid ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
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
        onMouseEnter={() => setIsHoveringGrid(true)}
        onMouseLeave={() => setIsHoveringGrid(false)}
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
