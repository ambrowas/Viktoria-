import React from "react";
import { JeopardyGame } from "@/types";

interface JeopardyGameProps {
  game: JeopardyGame;
  onExit: () => void;
}

const JeopardyGameScreen: React.FC<JeopardyGameProps> = ({ game, onExit }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-white">
      <h2 className="text-3xl font-bold mb-4">Jeopardy Game Placeholder</h2>
      <p className="text-gray-400 mb-6">Game ID: {game.id}</p>
      <button
        onClick={onExit}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
      >
        Back to Library
      </button>
    </div>
  );
};

export default JeopardyGameScreen;
