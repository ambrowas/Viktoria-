import React, { useEffect, useMemo, useState } from "react";
import type { RoscoGame, RoscoClue } from "@/types";
import { generateRoscoBulk } from "@/services/geminiService";
import { useLanguage } from "@/context/LanguageContext";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

interface RoscoEditorProps {
  game: RoscoGame;
  setGame: Setter<Partial<RoscoGame> | null>;
}

const LETTERS_ES = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K",
  "L", "M", "N", "Ñ", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
] as const;

function makeTemplate(): RoscoClue[] {
  return LETTERS_ES.map((letter) => ({
    letter,
    answer: "",
    definition: "",
  }));
}

export default function RoscoEditor({ game, setGame }: RoscoEditorProps) {
  const { lang } = useLanguage();
  // seed from game or template
  const initial = useMemo<RoscoClue[]>(
    () => (Array.isArray(game?.clues) && game.clues.length ? game.clues : makeTemplate()),
    [game?.clues]
  );

  const [clues, setClues] = useState<RoscoClue[]>(initial);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // propagate up
  useEffect(() => {
    setGame((prev) => ({
      ...(prev ?? {}),
      clues,
    }));
  }, [clues, setGame]);

  const onChangeField = (
    idx: number,
    field: keyof Omit<RoscoClue, "letter">,
    value: string
  ) => {
    setClues((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const resetAZ = () => setClues(makeTemplate());
  const clearAll = () =>
    setClues((prev) => prev.map((c) => ({ ...c, answer: "", definition: "" })));

  const handleGenerateAI = async () => {
    const promptMsg = lang === "es"
      ? "Tema o categoría para el rosco (por ejemplo, 'cultura general', 'países de África', etc.):"
      : "Theme or category for the Rosco (e.g., 'general knowledge', 'African countries', etc.):";

    const defaultTheme = lang === "es" ? "cultura general" : "general knowledge";

    const theme = window.prompt(promptMsg, defaultTheme);
    if (theme === null) return;

    try {
      setIsGenerating(true);
      const response = await generateRoscoBulk(theme, lang);

      if (response.error) {
        throw new Error(response.error);
      }

      const text = response.data || "";
      setBulkText(text);
      setShowBulk(true);
    } catch (err: any) {
      console.error(err);
      alert(
        err.message || "No se pudo generar el rosco automáticamente. Intenta de nuevo o revisa tu conexión."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const applyBulk = () => {
    // Expect lines like:  A; Árbol; Planta leñosa...
    // Letter & answer are trimmed, definition keeps inner punctuation.
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (!lines.length) {
      setShowBulk(false);
      return;
    }

    const next = [...clues];
    let applied = 0;

    for (const line of lines) {
      const parts = line.split(";").map((p) => p.trim());
      if (parts.length < 3) continue;

      const [rawLetter, rawAnswer, ...rest] = parts;
      const letter = rawLetter.toUpperCase();
      const definition = rest.join(";").trim();

      const idx = next.findIndex((c) => c.letter === letter);
      if (idx >= 0) {
        next[idx] = {
          letter,
          answer: rawAnswer,
          definition,
        };
        applied++;
      }
    }

    setClues(next);
    setShowBulk(false);
    setBulkText("");
    if (applied === 0) {
      alert(
        "No se aplicaron cambios. Asegúrate de usar el formato:\n\nA; RESPUESTA; Definición…"
      );
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">🅁 Rosco / Rondo Editor</h2>
          <p className="text-gray-400 text-sm">
            Completa una respuesta y una definición para cada letra. La respuesta debe
            comenzar con la letra indicada (o contenerla, según regla de juego).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowBulk(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md"
            title="Pegado masivo"
          >
            Pegado masivo
          </button>
          <button
            type="button"
            onClick={handleGenerateAI}
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-2 rounded-md"
            title="Generar automáticamente con Gemini"
          >
            {isGenerating ? "Generando..." : "IA (Gemini)"}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-md"
            title="Vaciar respuestas/definiciones"
          >
            Vaciar
          </button>
          <button
            type="button"
            onClick={resetAZ}
            className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 rounded-md"
            title="Restaurar plantilla A–Z"
          >
            Restablecer A–Z
          </button>
        </div>
      </header>

      {/* Grid of letters */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clues.map((c, i) => (
          <div
            key={c.letter}
            className="bg-[#1b2132] border border-[#2f3b57] rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-bold">
                {c.letter}
              </span>
              <span className="text-xs text-gray-400">
                {(c.answer || c.definition) ? "Completado parcialmente" : "Vacío"}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Respuesta (empieza por “{c.letter}”)
                </label>
                <input
                  type="text"
                  value={c.answer}
                  onChange={(e) => onChangeField(i, "answer", e.target.value)}
                  className="w-full bg-[#151a27] border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
                  placeholder={`Ej.: ${c.letter}...`}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Definición
                </label>
                <textarea
                  value={c.definition}
                  onChange={(e) => onChangeField(i, "definition", e.target.value)}
                  className="w-full bg-[#151a27] border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 resize-none"
                  rows={3}
                  placeholder="Pista/definición breve y clara…"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk paste modal */}
      {showBulk && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#121826] border border-[#2f3b57] rounded-lg p-5 w-full max-w-3xl">
            <h3 className="text-xl font-semibold mb-3">Pegado masivo</h3>
            <p className="text-sm text-gray-400 mb-3">
              Pega líneas con el formato: <br />
              <code className="text-gray-300">
                A; ÁRBOL; Planta leñosa de tronco ramificado…
              </code>
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              className="w-full bg-[#151a27] border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
              placeholder={`A; ÁRBOL; Planta leñosa de tronco...\nB; BARCO; Embarcación que navega...\nÑ; ÑANDÚ; Ave corredora sudamericana...`}
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulk(false)}
                className="px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-800 text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyBulk}
                className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
