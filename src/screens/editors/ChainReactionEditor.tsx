// src/screens/editors/ChainReactionEditor.tsx
import React, { useState } from "react";
import { Game, ChainReactionGame, ChainRound, ChainQuestion } from "@/types";
import { generateChainReactionRound } from "@services/geminiService";
import { SparklesIcon, PlusIcon, TrashIcon } from "@components/icons/IconDefs";
import Spinner from "@components/Spinner";
import { v4 as uuid } from "uuid";
import { useLanguage } from "@/context/LanguageContext";

interface ChainReactionEditorProps {
  game: ChainReactionGame;
  setGame: (game: Partial<Game>) => void;
}

const ChainReactionEditor: React.FC<ChainReactionEditorProps> = ({
  game,
  setGame,
}) => {
  const { lang } = useLanguage();

  const [isGenerating, setIsGenerating] = useState(false);
  const [theme, setTheme] = useState("");
  const [linkCount, setLinkCount] = useState(6);
  const [error, setError] = useState("");

  const translations = {
    en: {
      generateTitle: "Generate New Chain Round",
      themePlaceholder: "Theme (e.g. African Capitals)",
      linkPlaceholder: "Links",
      generating: "Generating...",
      generateButton: "Generate Chain",
      error: "Please enter a theme.",
      roundsTitle: "Rounds",
      newRound: "New Chain Round",
      addRound: "Add Round",
      roundTheme: "Round Theme",
      linkPrompt: "Link Question",
      answer: "Answer",
      hint: "Hint / Connection",
      points: "Points",
      addLink: "Add Link",
      deleteRound: "Delete Round",
      deleteLink: "Delete Link",
    },
    es: {
      generateTitle: "Generar Nueva Ronda de Cadena",
      themePlaceholder: "Tema (ej. Capitales Africanas)",
      linkPlaceholder: "Enlaces",
      generating: "Generando...",
      generateButton: "Generar Cadena",
      error: "Por favor ingresa un tema.",
      roundsTitle: "Rondas",
      newRound: "Nueva Ronda de Cadena",
      addRound: "Agregar Ronda",
      roundTheme: "Tema de la Ronda",
      linkPrompt: "Pregunta del Enlace",
      answer: "Respuesta",
      hint: "Pista / Conexión",
      points: "Puntos",
      addLink: "Agregar Enlace",
      deleteRound: "Eliminar Ronda",
      deleteLink: "Eliminar Enlace",
    },
  }[lang];

  const t = translations;

  const handleGenerate = async () => {
    if (!theme.trim()) return setError(t.error);
    setIsGenerating(true);
    setError("");
    try {
      const round = await generateChainReactionRound(theme, linkCount, lang);
      const newRound: ChainRound = { id: uuid(), ...round };
      setGame({ ...game, rounds: [...(game.rounds || []), newRound] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRoundChange = (
    roundId: string,
    questionId: string,
    field: keyof ChainQuestion,
    value: any
  ) => {
    const updatedRounds = (game.rounds || []).map((r) =>
      r.id === roundId
        ? {
            ...r,
            chain: r.chain.map((q) =>
              q.id === questionId ? { ...q, [field]: value } : q
            ),
          }
        : r
    );
    setGame({ ...game, rounds: updatedRounds });
  };

  const addManualRound = () => {
    const newRound: ChainRound = {
      id: uuid(),
      theme: t.newRound,
      chain: [
        { id: uuid(), prompt: "", answer: "", linkHint: "", points: 100 },
      ],
    };
    setGame({ ...game, rounds: [...(game.rounds || []), newRound] });
  };

  const addLink = (roundId: string) => {
    const updatedRounds = (game.rounds || []).map((r) =>
      r.id === roundId
        ? {
            ...r,
            chain: [
              ...r.chain,
              {
                id: uuid(),
                prompt: "",
                answer: "",
                linkHint: "",
                points: 100 + r.chain.length * 20,
              },
            ],
          }
        : r
    );
    setGame({ ...game, rounds: updatedRounds });
  };

  const removeLink = (roundId: string, questionId: string) => {
    const updatedRounds = (game.rounds || []).map((r) =>
      r.id === roundId
        ? { ...r, chain: r.chain.filter((q) => q.id !== questionId) }
        : r
    );
    setGame({ ...game, rounds: updatedRounds });
  };

  const removeRound = (roundId: string) => {
    setGame({
      ...game,
      rounds: (game.rounds || []).filter((r) => r.id !== roundId),
    });
  };

  return (
    <div className="space-y-6 text-white">
      <div className="bg-[#0f172a] p-6 rounded-lg shadow-lg border border-gray-700">
        <h2 className="text-2xl font-bold mb-4">{t.generateTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <input
            type="text"
            placeholder={t.themePlaceholder}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="dark-input"
          />
          <input
            type="number"
            min={3}
            max={10}
            value={linkCount}
            onChange={(e) => setLinkCount(Number(e.target.value))}
            className="dark-input"
            placeholder={t.linkPlaceholder}
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-yellow-400 text-black font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-yellow-300 transition"
          >
            {isGenerating ? (
              <>
                <Spinner /> {t.generating}
              </>
            ) : (
              <>
                <SparklesIcon /> {t.generateButton}
              </>
            )}
          </button>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      <div className="bg-[#0f172a] p-6 rounded-lg shadow-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {t.roundsTitle} ({game.rounds?.length || 0})
          </h2>
          <button
            onClick={addManualRound}
            className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            <PlusIcon className="w-5 h-5" /> {t.addRound}
          </button>
        </div>

        {(game.rounds || []).map((round, ri) => (
          <div
            key={round.id}
            className="bg-[#1e293b] p-4 rounded-lg mb-6 border border-gray-700"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-semibold">
                {t.roundsTitle} {ri + 1}
              </h3>
              <button
               aria-label={t.deleteRound}
  title={t.deleteRound}
              >
                <TrashIcon className="w-5 h-5 text-red-500" />
              </button>
            </div>

            <input
              type="text"
              value={round.theme}
              onChange={(e) =>
                setGame({
                  ...game,
                  rounds: (game.rounds || []).map((r) =>
                    r.id === round.id ? { ...r, theme: e.target.value } : r
                  ),
                })
              }
              className="dark-input mb-3"
              placeholder={t.roundTheme}
            />

            {round.chain.map((q, qi) => (
              <div
                key={q.id}
                className="bg-[#0f172a] p-3 rounded-lg mb-3 border border-gray-700"
              >
                <div className="flex justify-between items-start gap-2">
                  <textarea
                    value={q.prompt}
                    onChange={(e) =>
                      handleRoundChange(round.id, q.id, "prompt", e.target.value)
                    }
                    placeholder={`${t.linkPrompt} ${qi + 1}`}
                    className="dark-input w-full text-lg font-medium"
                    rows={2}
                  />
                  <button
                   onClick={() => removeRound(round.id)}
  className="p-2 rounded-full hover:bg-[#334155]"
  aria-label={t.deleteRound}
  title={t.deleteRound}
                  >
                    <TrashIcon className="w-5 h-5 text-red-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <input
                    type="text"
                    value={q.answer}
                    onChange={(e) =>
                      handleRoundChange(round.id, q.id, "answer", e.target.value)
                    }
                    placeholder={t.answer}
                    className="dark-input"
                  />
                  <input
                    type="text"
                    value={q.linkHint}
                    onChange={(e) =>
                      handleRoundChange(round.id, q.id, "linkHint", e.target.value)
                    }
                    placeholder={t.hint}
                    className="dark-input"
                  />
                  <input
                    type="number"
                    value={q.points}
                    onChange={(e) =>
                      handleRoundChange(
                        round.id,
                        q.id,
                        "points",
                        parseInt(e.target.value)
                      )
                    }
                    placeholder={t.points}
                    className="dark-input"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={() => addLink(round.id)}
              className="mt-2 flex items-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition"
            >
              <PlusIcon className="w-5 h-5" /> {t.addLink}
            </button>
          </div>
        ))}
      </div>

      {/* === Embedded dark-input style === */}
      <style>{`
        .dark-input {
          background-color: #1e293b !important;
          color: #f8fafc !important;
          border: 1px solid #334155 !important;
          border-radius: 0.5rem;
          padding: 0.5rem;
        }
        .dark-input::placeholder {
          color: #94a3b8 !important;
        }
        .dark-input:focus {
          outline: 2px solid #38bdf8 !important;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default ChainReactionEditor;
