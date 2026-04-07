import React, { useEffect, useState } from "react";
import {
  Game,
  GameType,
  HangmanGame,
  MemoryGame as MemoryGameType,
} from "@/types";

// --- Type-only imports to avoid name conflicts ---
import type { WheelOfFortuneGame as WheelOfFortuneGameType } from "@/types";

// --- Game components ---
import HangmanGameWrapper from "./games/HangmanGame";
import MemoryGame from "./games/MemoryGame";
import RoscoGameWrapper from "./games/RoscoGame";
import FamilyFeudGameScreen from "./games/FamilyFeudGame";
import JeopardyGameScreen from "./games/JeopardyGame";
import PyramidGameScreen from "./games/PyramidGame";
import ChainReactionGameScreen from "./games/ChainReactionGame";
import DefinitionsGameWrapper from "./games/DefinitionsGameWrapper";
import PriceIsRightGame from "./games/PriceIsRightGame";
import WheelOfFortuneGame from "./games/WheelOfFortuneGame";
import LotteryGame from "./games/LotteryGame";
import BingoGame from "./games/BingoGame"; // ✅ NEW

// --- Sounds ---
import { transitionSound, magicalSound, stopAllSounds } from "@/utils/sound";
import { useLanguage } from "@/context/LanguageContext";

// --- Game Map ---
const gameComponents: Record<GameType, React.FC<any>> = {
  [GameType.HANGMAN]: HangmanGameWrapper,
  [GameType.MEMORY]: MemoryGame,
  [GameType.ROSCO]: RoscoGameWrapper,
  [GameType.FAMILY_FEUD]: FamilyFeudGameScreen,
  [GameType.CHAIN_REACTION]: ChainReactionGameScreen,
  [GameType.JEOPARDY]: JeopardyGameScreen,
  [GameType.PYRAMID]: PyramidGameScreen,
  [GameType.DEFINITIONS]: DefinitionsGameWrapper,
  [GameType.PRICE_IS_RIGHT]: PriceIsRightGame,
  [GameType.WHEEL_OF_FORTUNE]: WheelOfFortuneGame,
  [GameType.LOTTERY]: LotteryGame,
  [GameType.BINGO]: BingoGame, // ✅ Added here
};

import type { Team } from "@/types";

interface GameRouterProps {
  game: Game;
  teams: Team[];
  teamScores: Record<string, number>;
  onScoreChange: (teamId: string, score: number) => void;
  onExit: (points?: Record<string, number>) => void;
  language?: "en" | "es";
  hostControl?: "ipad" | "manual";
  playerControl?: "ipad" | "manual";
}

const GameRouter: React.FC<GameRouterProps> = ({
  game,
  teams,
  teamScores,
  onScoreChange,
  onExit,
  language,
  hostControl = 'ipad',
  playerControl = 'ipad'
}) => {
  const { lang: globalLang } = useLanguage();
  const lang = language || globalLang;

  const [isTransitioning, setIsTransitioning] = useState(true);

  useEffect(() => {
    // 🎵 Play transition sounds
    // transitionSound.play();
    // magicalSound.play();

    // ⏳ Show transition for ~2 seconds
    const timer = setTimeout(() => setIsTransitioning(false), 2000);
    return () => {
      clearTimeout(timer);
      stopAllSounds();
    };
  }, []);

  const Component = gameComponents[game.type as GameType];

  if (isTransitioning) {
    const text = lang === "en" ? "🎬 Let's Go!" : "🎬 ¡El Juego Comienza!";
    const loadingText = lang === "en" ? "Loading game..." : "Cargando juego...";

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="animate-pulse text-center">
          <h1 className="text-6xl font-bold text-yellow-400 drop-shadow-lg mb-6 animate-bounce">
            {text}
          </h1>
          <p className="text-lg text-gray-300 animate-fade">
            {game.name || loadingText}
          </p>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Game Type Not Supported Yet</h2>
          <p className="text-gray-600 mb-6">
            The {(game as any)?.type?.toLowerCase().replace(/_/g, " ")} game
            player is still under development.
          </p>
          <button
            onClick={() => onExit()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  // 🧠 Handle Memory game separately (needs grid size)
  if (game.type === GameType.MEMORY) {
    const gridSize =
      (game as MemoryGameType).gridSize === "Small"
        ? 16
        : (game as MemoryGameType).gridSize === "Medium"
          ? 20
          : 28;

    return (
      <Component
        tiles={(game as MemoryGameType).tiles || []}
        gridSize={gridSize}
        onExit={onExit}
      />
    );
  }

  // ✅ Default for all other games (including Bingo)
  return (
    <Component
      game={game as any}
      round={(game as any).round} // For Bingo 
      teams={teams}
      teamScores={teamScores}
      onScoreChange={onScoreChange}
      onExit={onExit}
      hostControl={hostControl}
      playerControl={playerControl}
    />
  );
};

export default GameRouter;
