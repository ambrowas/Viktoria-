import React, { useState } from "react";
import { Game, HangmanGame, HangmanPhrase } from "@/types";
import { generateHangmanPhrases } from "@services/geminiService";
import Spinner from "@components/Spinner";
import { SparklesIcon } from "@components/icons/IconDefs";
import Modal from "@components/Modal";

/* ============================================================
   🎮 HANGMAN EDITOR COMPONENT
============================================================ */
interface HangmanEditorProps {
  game: HangmanGame;
  setGame: React.Dispatch<React.SetStateAction<Partial<Game> | null>>;
}

const HangmanEditor: React.FC<HangmanEditorProps> = ({ game, setGame }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTheme, setAiTheme] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("Medium");
  const [error, setError] = useState("");
  const [newPhrase, setNewPhrase] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newHint, setNewHint] = useState("");

  // ✅ Default language, consistent with other editors
  const language = game.language || "es";

  // ✅ Safe updater – avoids union type conflicts
  const updateGame = (updates: Partial<HangmanGame>) => {
    setGame((prev) => {
      const safePrev = (prev || {}) as Partial<HangmanGame>;
      return { ...safePrev, ...updates } as Partial<Game>;
    });
  };

  /* ============================================================
     ⚙️ GENERATE PHRASES WITH AI
  ============================================================ */
  const handleGenerate = async () => {
    if (!aiTheme.trim()) {
      setError("Por favor ingresa un tema.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const aiResponse = await generateHangmanPhrases(aiTheme, aiDifficulty, 5, language);
      const raw = aiResponse.trim();

      // 🧠 Try to parse AI response robustly
      let phrases: HangmanPhrase[] = [];
      if (raw.startsWith("[") || raw.startsWith("{")) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          phrases = parsed.map((p) => ({
            id: crypto.randomUUID(),
            text: (p.text || p).toString().toUpperCase(),
            category: p.category || "General",
            hint: p.hint || "",
            difficulty: aiDifficulty as "Easy" | "Medium" | "Hard",
          }));
        }
      } else {
        phrases = raw
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => ({
            id: crypto.randomUUID(),
            text: line.toUpperCase(),
            category: "General",
            hint: "",
            difficulty: aiDifficulty as "Easy" | "Medium" | "Hard",
          }));
      }

      const current = game.phrases || [];
      updateGame({ phrases: [...current, ...phrases] });
    } catch (err) {
      console.error("❌ Error generating phrases:", err);
      setError("No se pudo generar las frases. Intenta de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  /* ============================================================
     ➕ ADD & REMOVE MANUAL PHRASES
  ============================================================ */
  const handleAddManual = () => {
    if (!newPhrase.trim()) {
      setError("Por favor escribe una frase.");
      return;
    }

    const phrase: HangmanPhrase = {
      id: crypto.randomUUID(),
      text: newPhrase.toUpperCase(),
      category: newCategory || "Personalizado",
      hint: newHint,
      difficulty: "Custom",
    };

    const current = game.phrases || [];
    updateGame({ phrases: [...current, phrase] });

    setNewPhrase("");
    setNewCategory("");
    setNewHint("");
  };

  const handleRemovePhrase = (id: string) => {
    const current = game.phrases || [];
    updateGame({ phrases: current.filter((p) => p.id !== id) });
  };

  const handleDifficultyChange = (difficulty: string) => {
    updateGame({ difficulty: difficulty as HangmanGame["difficulty"] });
  };

  const handleMaxAttemptsChange = (attempts: number) => {
    updateGame({ maxAttempts: attempts });
  };

  /* ============================================================
     🎨 RENDER
  ============================================================ */
  return (
    <div className="space-y-6">
      {/* Error Modal */}
      <Modal isOpen={!!error} onClose={() => setError("")} title="Error">
        <p className="text-text-secondary">{error}</p>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setError("")}
            className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg"
          >
            OK
          </button>
        </div>
      </Modal>

      {/* Game Settings */}
      <div className="bg-base-200 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Configuración del Ahorcado</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Nivel de Dificultad</h3>
            <div className="flex gap-2">
              {["Easy", "Medium", "Hard"].map((level) => (
                <button
                  key={level}
                  onClick={() => handleDifficultyChange(level)}
                  className={`py-2 px-4 rounded-lg font-semibold ${
                    game.difficulty === level
                      ? "bg-brand-primary text-white"
                      : "bg-base-300"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Intentos Máximos</h3>
            <div className="flex gap-2">
              {[6, 8, 10].map((attempts) => (
                <button
                  key={attempts}
                  onClick={() => handleMaxAttemptsChange(attempts)}
                  className={`py-2 px-4 rounded-lg font-semibold ${
                    game.maxAttempts === attempts
                      ? "bg-brand-primary text-white"
                      : "bg-base-300"
                  }`}
                >
                  {attempts}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Generation */}
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-brand-accent" />
            Generar Frases con IA
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Tema</label>
              <input
                type="text"
                placeholder="Ej: Películas, Deportes..."
                value={aiTheme}
                onChange={(e) => setAiTheme(e.target.value)}
                className="bg-base-300 p-3 rounded-lg w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dificultad</label>
              <select
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value)}
                className="bg-base-300 p-3 rounded-lg w-full"
              >
                <option value="Easy">Fácil</option>
                <option value="Medium">Media</option>
                <option value="Hard">Difícil</option>
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-secondary"
            >
              {isGenerating ? <Spinner /> : "Generar 5 Frases"}
            </button>
          </div>
        </div>

        {/* Manual Addition */}
        <div>
          <h3 className="text-xl font-bold mb-3">Agregar Frase Manualmente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Frase*</label>
              <input
                type="text"
                placeholder="Escribe la frase..."
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                className="bg-base-300 p-3 rounded-lg w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Categoría</label>
              <input
                type="text"
                placeholder="Ej: Películas"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="bg-base-300 p-3 rounded-lg w-full"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Pista (Opcional)</label>
            <input
              type="text"
              placeholder="Pista útil para el jugador"
              value={newHint}
              onChange={(e) => setNewHint(e.target.value)}
              className="bg-base-300 p-3 rounded-lg w-full"
            />
          </div>

          <button
            onClick={handleAddManual}
            className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700"
          >
            Agregar Frase
          </button>
        </div>
      </div>

      {/* Phrase List */}
      <div className="bg-base-200 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Frases del Juego</h2>

        {!game.phrases || game.phrases.length === 0 ? (
          <p className="text-text-secondary text-center py-8">
            Aún no se han agregado frases. Genera con IA o agrega manualmente.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {game.phrases.map((phrase) => (
              <div
                key={phrase.id}
                className="bg-base-300 p-4 rounded-lg flex justify-between items-start"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-brand-primary text-white text-sm font-bold px-2 py-1 rounded">
                      {phrase.difficulty}
                    </span>
                    <span className="bg-blue-600 text-white text-sm font-bold px-2 py-1 rounded">
                      {phrase.category}
                    </span>
                  </div>
                  <p className="text-lg font-semibold mb-1">{phrase.text}</p>
                  {phrase.hint && (
                    <p className="text-text-secondary text-sm">Pista: {phrase.hint}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemovePhrase(phrase.id)}
                  className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 ml-4"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HangmanEditor;
