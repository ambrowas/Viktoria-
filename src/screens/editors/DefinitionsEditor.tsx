  import React, { useState } from "react";
  import { generateDefinitionsBulk } from "@/services/geminiService";
  import { useLanguage } from "@/context/LanguageContext";
  import Spinner from "@/components/Spinner";
  import { v4 as uuid } from "uuid";
  import { GameType } from "@/types";



  interface DefinitionsEditorProps {
    game: any;
    setGame: (game: any) => void;
  }

  const DefinitionsEditor: React.FC<DefinitionsEditorProps> = ({ game, setGame }) => {
    const { lang } = useLanguage();
    const [topic, setTopic] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");

    const t = {
      es: {
        title: "Editor de Definiciones",
        subtitle: "Agrega pares de palabra y definición manualmente o genera nuevos con la IA.",
        topicPlaceholder: "Tema (por ejemplo: Ciencia, Historia, Cultura...)",
        generate: "Generar con IA",
        generating: "Generando...",
        addWord: "Agregar palabra manualmente",
        word: "Palabra",
        definition: "Definición",
        remove: "Eliminar",
        empty: "Aún no hay definiciones. ¡Agrega una o genera con la IA!",
      },
      en: {
        title: "Definitions Editor",
        subtitle: "Add word-definition pairs manually or generate new ones using AI.",
        topicPlaceholder: "Topic (e.g., Science, History, Culture...)",
        generate: "Generate with AI",
        generating: "Generating...",
        addWord: "Add Word Manually",
        word: "Word",
        definition: "Definition",
        remove: "Remove",
        empty: "No definitions yet. Add one or generate with AI!",
      },
    }[lang];

    // ✅ Unified updater to enforce type
    const updateGame = (newData: Partial<any>) => {
      setGame({ ...game, type: GameType.DEFINITIONS, ...newData });
    };

    // 🔹 Add manually
    const addDefinition = () => {
      const newDef = { id: uuid(), word: "", definition: "" };
      updateGame({ clues: [...(game.clues || []), newDef] });
    };

    // 🔹 Update word/definition
    const updateDefinition = (id: string, field: "word" | "definition", value: string) => {
      const updated = (game.clues || []).map((c: any) =>
        c.id === id ? { ...c, [field]: value } : c
      );
      updateGame({ clues: updated });
    };

    // 🔹 Remove a definition
    const removeDefinition = (id: string) => {
      const filtered = (game.clues || []).filter((c: any) => c.id !== id);
      updateGame({ clues: filtered });
    };

    // 🔹 Generate with AI
    const handleGenerateAI = async () => {
      if (!topic.trim()) {
        alert(lang === "es" ? "Por favor, introduce un tema." : "Please enter a topic.");
        return;
      }

      setIsGenerating(true);
      setError("");

      try {
        const clues = await generateDefinitionsBulk(topic, 10, lang === "es" ? "es" : "en");
        updateGame({ clues });
        setTopic("");
      } catch (err: any) {
        console.error("❌ Error generating definitions:", err);
        setError(
          lang === "es"
            ? "No se pudieron generar definiciones. Intenta de nuevo."
            : "Failed to generate definitions. Please try again."
        );
      } finally {
        setIsGenerating(false);
      }
    };

    // ===============================
    // Render
    // ===============================
    return (
      <div className="space-y-8">
        {/* Header */}
        <header>
          <h2 className="text-3xl font-bold">{t.title}</h2>
          <p className="text-gray-400">{t.subtitle}</p>
        </header>

        {/* AI Generator */}
        <div className="bg-base-200 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-3">🤖 {t.generate}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <input
              type="text"
              placeholder={t.topicPlaceholder}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-base-300 p-3 rounded-lg w-full"
            />
            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-secondary transition-colors flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <Spinner /> {t.generating}
                </>
              ) : (
                t.generate
              )}
            </button>
          </div>
          {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </div>

        {/* Definitions List */}
        <div className="bg-base-200 p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">{t.addWord}</h3>
            <button
              onClick={addDefinition}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              + {t.addWord}
            </button>
          </div>

          {game.clues?.length > 0 ? (
            <div className="space-y-4">
              {game.clues.map((c: any, idx: number) => (
                <div
                  key={c.id}
                  className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-base-300 p-4 rounded-lg"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={`${t.word} ${idx + 1}`}
                      value={c.word}
                      onChange={(e) => updateDefinition(c.id, "word", e.target.value)}
                      className="w-full bg-base-100 p-3 rounded-lg mb-2"
                    />
                    <textarea
                      placeholder={t.definition}
                      value={c.definition}
                      onChange={(e) => updateDefinition(c.id, "definition", e.target.value)}
                      className="w-full bg-base-100 p-3 rounded-lg h-24"
                    />
                  </div>
                  <button
                    onClick={() => removeDefinition(c.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md self-center"
                  >
                    {t.remove}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">{t.empty}</p>
          )}
        </div>
      </div>
    );
  };

  export default DefinitionsEditor;

