// src/screens/editors/MemoryEditor.tsx

import React, { useState } from "react";
import type { Game, MemoryGame, MemoryTile } from "@/types";
import { generateMemoryIcons } from "@services/geminiService";
import Spinner from "@components/Spinner";
import { SparklesIcon } from "@components/icons/IconDefs";
import Modal from "@components/Modal";
import MemoryPreview from "@screens/editors/MemoryPreview";
import { uploadImageAndGetUrl } from "../../services/storage";



const GRID_SIZES = {
  Small: 16,
  Medium: 20,
  Large: 28,
} as const;
type GridSize = keyof typeof GRID_SIZES;

interface MemoryEditorProps {
  game: MemoryGame;
  setGame: React.Dispatch<React.SetStateAction<Partial<Game> | null>>;
}

const MemoryEditor: React.FC<MemoryEditorProps> = ({ game, setGame }) => {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTheme, setAiTheme] = useState("");
  const [error, setError] = useState("");

  const isValidGridSize = (size: string | undefined): size is GridSize =>
    size ? Object.keys(GRID_SIZES).includes(size) : false;

  const gridSize = isValidGridSize(game.gridSize) ? game.gridSize : "Small";
  const numTiles = GRID_SIZES[gridSize];
  const numPairs = Math.floor(numTiles / 2);

  const updateGame = (updates: Partial<MemoryGame>) => {
    setGame((prev) => ({ ...prev, ...updates }));
  };

  const handleGridSizeChange = (size: GridSize) => {
    updateGame({ gridSize: size, tiles: [] });
  };

  const handleSourceChange = (source: MemoryGame["tileSource"]) => {
    updateGame({ tileSource: source, tiles: [] });
  };

  const handleGenerate = async () => {
    if (!aiTheme.trim()) {
      setError("Please enter a theme.");
      return;
    }
    setIsGenerating(true);
    setError("");
    try {
      const icons = await generateMemoryIcons(aiTheme, numPairs);
      const newTiles: MemoryTile[] = icons.flatMap((icon) => {
        const matchId = crypto.randomUUID();
        return [
          { id: crypto.randomUUID(), matchId, content: icon, sourceType: "AI" },
          { id: crypto.randomUUID(), matchId, content: icon, sourceType: "AI" },
        ];
      });
      updateGame({ tiles: newTiles });
      setIsPreviewing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------- NEW: Handles Upload to Firebase Storage and persist URLs --------
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  if (files.length !== numPairs) {
    alert(`Please select exactly ${numPairs} images for a ${gridSize} grid.`);
    return;
  }
  setIsGenerating(true);
  setError("");
  try {
    const arrFiles = Array.from(files);
    const currGameId = game.id || crypto.randomUUID();

    const uploadResults = await Promise.all(
      arrFiles.map(async (file) => {
        const matchId = crypto.randomUUID();
        const url = await uploadImageAndGetUrl(file, currGameId, matchId);
        return [
          { id: crypto.randomUUID(), matchId, content: url, sourceType: "UPLOAD" as const },
          { id: crypto.randomUUID(), matchId, content: url, sourceType: "UPLOAD" as const },
        ];
      })
    );

    const newTiles: MemoryTile[] = uploadResults.flat();
    updateGame({ id: currGameId, tiles: newTiles });
    setIsPreviewing(true);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to upload images. Try again.");
  } finally {
    setIsGenerating(false);
  }
};

  return (
    <div className="space-y-6">
      {isPreviewing && (
        <MemoryPreview
          tiles={game.tiles}
          gridSize={numTiles}
          onClose={() => setIsPreviewing(false)}
        />
      )}

      <Modal isOpen={!!error} onClose={() => setError("")} title="Error">
        <p className="text-text-secondary">{error}</p>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setError("")}
            className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg"
            aria-label="Close error message"
            title="Close error message"
          >
            OK
          </button>
        </div>
      </Modal>

      <div className="bg-base-200 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Memory Game Setup</h2>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Grid Size</h3>
          <div className="flex gap-2">
            {(Object.keys(GRID_SIZES) as GridSize[]).map((size) => (
              <button
                key={size}
                onClick={() => handleGridSizeChange(size)}
                className={`py-2 px-4 rounded-lg font-semibold ${
                  gridSize === size ? "bg-brand-primary text-white" : "bg-base-300"
                }`}
                aria-label={`Select ${size} grid`}
                title={`Select ${size} grid`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Tile Source</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleSourceChange("AI")}
              className={`py-2 px-4 rounded-lg font-semibold flex-1 ${
                game.tileSource === "AI" ? "bg-brand-primary text-white" : "bg-base-300"
              }`}
              aria-label="Use AI-generated icons"
              title="Use AI-generated icons"
            >
              AI Icons
            </button>
            <button
              onClick={() => handleSourceChange("UPLOAD")}
              className={`py-2 px-4 rounded-lg font-semibold flex-1 ${
                game.tileSource === "UPLOAD" ? "bg-brand-primary text-white" : "bg-base-300"
              }`}
              aria-label="Upload your own images"
              title="Upload your own images"
            >
              Upload Images
            </button>
          </div>
        </div>

        {game.tileSource === "AI" ? (
          <div>
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <SparklesIcon className="w-6 h-6 text-brand-accent" />
              Generate Icons with AI
            </h3>
            <div className="flex gap-4 items-center">
              <label htmlFor="aiTheme" className="sr-only">
                AI Theme
              </label>
              <input
                id="aiTheme"
                type="text"
                placeholder="Theme (e.g., Space, Animals)"
                value={aiTheme}
                onChange={(e) => setAiTheme(e.target.value)}
                className="bg-base-300 p-3 rounded-lg w-full"
                aria-label="Enter theme for AI icons"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-secondary whitespace-nowrap"
                aria-label="Generate AI icons"
                title="Generate AI icons"
              >
                {isGenerating ? <Spinner /> : `Generate ${numPairs} Pairs`}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-bold mb-3">Upload Images</h3>
            <p className="text-text-secondary mb-3 text-sm">
              Select exactly{" "}
              <span className="font-bold text-brand-accent">{numPairs}</span>{" "}
              images.
            </p>
            <label htmlFor="fileUpload" className="sr-only">
              Upload images for memory game
            </label>
            <input
              id="fileUpload"
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              aria-label="Upload images for memory game"
              className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:font-semibold 
                         file:bg-brand-primary file:text-white hover:file:bg-brand-secondary 
                         w-full text-text-secondary"
              disabled={isGenerating}
            />
            {isGenerating && (
              <div className="mt-2 flex items-center gap-2 text-brand-primary">
                <Spinner />
                Uploading images, please wait...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryEditor;
