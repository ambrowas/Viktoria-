import React, { useState } from "react";
import type { Game, MemoryGame, MemoryTile } from "@/types";
import { generateMemoryIcons } from "@services/geminiService";
import { useLanguage } from "@/context/LanguageContext";
import Spinner from "@components/Spinner";
import { SparklesIcon } from "@components/icons/IconDefs";
import Modal from "@components/Modal";
import MemoryPreview from "@screens/editors/MemoryPreview";



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
  const { lang } = useLanguage();
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
    setGame((prev: any) => ({ ...prev, ...updates }));
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
      const result = await generateMemoryIcons(aiTheme, numPairs, lang);
      if (result.error && result.error.includes("GEMINI_QUOTA_EXCEEDED")) {
        setError("AI quota reached. Using diverse fallback emojis so you can keep creating!");
      } else if (result.error) {
        throw new Error(result.error);
      }

      const icons = result.data || [];
      const newTiles: MemoryTile[] = icons.flatMap((icon) => {
        const matchId = crypto.randomUUID();
        return [
          { id: crypto.randomUUID(), matchId, content: icon, sourceType: "AI" },
          { id: crypto.randomUUID(), matchId, content: icon, sourceType: "AI" },
        ];
      });
      updateGame({ tiles: newTiles });
      setIsPreviewing(true);
    } catch (err: any) {
      if (err.message?.includes("GEMINI_QUOTA_EXCEEDED")) {
        setError("Has superado la cuota de la IA. ¡No te preocupes! Hemos usado un set de iconos de emergencia para tu juego.");
      } else {
        setError(err instanceof Error ? err.message : "Error desconocido al generar iconos.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Get unique image pairs from current tiles
  const uploadedPairs = React.useMemo(() => {
    if (!game.tiles) return [];
    const grouped = new Map<string, string>();
    game.tiles.forEach((tile) => {
      if (tile.sourceType === "UPLOAD" && tile.matchId && tile.content) {
        grouped.set(tile.matchId, tile.content);
      }
    });
    return Array.from(grouped.entries()).map(([matchId, content]) => ({
      matchId,
      content,
    }));
  }, [game.tiles]);

  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void processImageFiles(e.dataTransfer.files);
    }
  };

  const processImageFiles = async (files: FileList | File[]) => {
    const arrFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (arrFiles.length === 0) return;

    const currentCount = uploadedPairs.length;
    const remainingCount = numPairs - currentCount;

    if (remainingCount <= 0) {
      alert(lang === "es"
        ? `Ya has completado las ${numPairs} parejas necesarias.`
        : `You have already completed the required ${numPairs} pairs.`
      );
      return;
    }

    let filesToProcess = arrFiles;
    if (arrFiles.length > remainingCount) {
      alert(lang === "es"
        ? `Solo se añadirán las primeras ${remainingCount} imágenes para no superar las ${numPairs} parejas necesarias.`
        : `Only the first ${remainingCount} images will be added to not exceed the required ${numPairs} pairs.`
      );
      filesToProcess = arrFiles.slice(0, remainingCount);
    }

    setIsGenerating(true);
    setError("");
    try {
      const currGameId = game.id || crypto.randomUUID();

      const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const MAX_SIZE = 256;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_SIZE) {
                  height *= MAX_SIZE / width;
                  width = MAX_SIZE;
                }
              } else {
                if (height > MAX_SIZE) {
                  width *= MAX_SIZE / height;
                  height = MAX_SIZE;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (!ctx) return resolve(e.target?.result as string);

              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/webp", 0.6));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const uploadResults = await Promise.all(
        filesToProcess.map(async (file) => {
          const matchId = crypto.randomUUID();
          const url = await compressImage(file);
          return [
            { id: crypto.randomUUID(), matchId, content: url, sourceType: "UPLOAD" as const },
            { id: crypto.randomUUID(), matchId, content: url, sourceType: "UPLOAD" as const },
          ];
        })
      );

      const existingTiles = game.tiles || [];
      const newTiles = [...existingTiles, ...uploadResults.flat()];
      updateGame({ id: currGameId, tiles: newTiles });

      if (newTiles.length === numTiles) {
        setIsPreviewing(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load images. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeletePair = (matchId: string) => {
    const updatedTiles = (game.tiles || []).filter((t) => t.matchId !== matchId);
    updateGame({ tiles: updatedTiles });
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
                className={`py-2 px-4 rounded-lg font-semibold ${gridSize === size ? "bg-brand-primary text-white" : "bg-base-300"
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
              className={`py-2 px-4 rounded-lg font-semibold flex-1 ${game.tileSource === "AI" ? "bg-brand-primary text-white" : "bg-base-300"
                }`}
              aria-label="Use AI-generated icons"
              title="Use AI-generated icons"
            >
              AI Icons
            </button>
            <button
              onClick={() => handleSourceChange("UPLOAD")}
              className={`py-2 px-4 rounded-lg font-semibold flex-1 ${game.tileSource === "UPLOAD" ? "bg-brand-primary text-white" : "bg-base-300"
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
          <div className="space-y-6">
            <h3 className="text-xl font-bold">
              {lang === "es" ? "Subir imágenes para el juego" : "Upload images for memory game"}
            </h3>
            
            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 relative ${
                isDragActive
                  ? "border-brand-primary bg-brand-primary/10 scale-[1.02]"
                  : "border-base-300 bg-base-300/40 hover:bg-base-300/60"
              }`}
              onClick={() => document.getElementById("fileUpload")?.click()}
            >
              <input
                id="fileUpload"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) void processImageFiles(e.target.files);
                }}
                className="hidden"
                disabled={isGenerating}
              />
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="p-4 bg-base-200 rounded-full text-brand-primary shadow-inner">
                  <svg
                    className="w-8 h-8 animate-bounce"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {lang === "es"
                      ? "Arrastra tus imágenes aquí o haz clic para buscarlas"
                      : "Drag & drop your images here or click to browse"}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    {lang === "es"
                      ? `Se necesitan ${numPairs} parejas de imágenes. Formatos: PNG, JPG, WEBP.`
                      : `Requires ${numPairs} image pairs. Formats: PNG, JPG, WEBP.`}
                  </p>
                </div>
              </div>
            </div>

            {isGenerating && (
              <div className="flex items-center gap-2 text-brand-primary">
                <Spinner />
                {lang === "es" ? "Procesando imágenes, por favor espera..." : "Processing images, please wait..."}
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span>
                  {lang === "es" ? "Imágenes cargadas" : "Uploaded images"}: {uploadedPairs.length} / {numPairs}
                </span>
                <span className={uploadedPairs.length === numPairs ? "text-green-500 font-bold" : "text-brand-accent animate-pulse"}>
                  {uploadedPairs.length === numPairs
                    ? (lang === "es" ? "¡Tablero completo! 🎉" : "Board complete! 🎉")
                    : (lang === "es" ? `Faltan ${numPairs - uploadedPairs.length} parejas` : `${numPairs - uploadedPairs.length} pairs remaining`)}
                </span>
              </div>
              <div className="w-full bg-base-300 h-3 rounded-full overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-brand-primary to-brand-accent h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(uploadedPairs.length / numPairs) * 100}%` }}
                />
              </div>
            </div>

            {/* Uploaded pairs preview grid */}
            {uploadedPairs.length > 0 && (
              <div className="pt-4">
                <h4 className="text-lg font-bold mb-4">
                  {lang === "es" ? "Imágenes cargadas" : "Uploaded Images"}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {uploadedPairs.map((pair, idx) => (
                    <div
                      key={pair.matchId}
                      className="group relative bg-base-300/50 border border-base-300 p-2 rounded-xl flex flex-col items-center justify-center shadow-lg hover:scale-105 transition-all duration-300"
                    >
                      <img
                        src={pair.content}
                        alt={`Pair ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg shadow-inner bg-base-200"
                      />
                      <span className="text-xs text-text-secondary mt-2 font-mono">
                        {lang === "es" ? "Pareja" : "Pair"} #{idx + 1}
                      </span>
                      <button
                        onClick={() => handleDeletePair(pair.matchId)}
                        className="absolute top-1 right-1 p-1.5 bg-red-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-700 shadow-md"
                        title={lang === "es" ? "Eliminar pareja" : "Delete pair"}
                        aria-label={lang === "es" ? "Eliminar pareja" : "Delete pair"}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Button */}
        {game.tiles && game.tiles.length === numTiles && (
          <div className="mt-6 pt-4 border-t border-base-300">
            <button
              onClick={() => setIsPreviewing(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/20 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {lang === "es" ? "Previsualizar Juego" : "Preview Game"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryEditor;
