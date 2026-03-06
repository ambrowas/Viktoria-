import React, { useState, useEffect } from "react";
import { PyramidGame, PyramidQuestion } from "@/types";
import { Trash2, Sparkles } from "lucide-react";
import { generatePyramidQuestions } from "@/services/geminiService";

interface PyramidEditorProps {
  game: PyramidGame;
  setGame: React.Dispatch<React.SetStateAction<Partial<PyramidGame> | null>>;
}

const VALUES = [100, 200, 300, 500, 750, 1000, 2000, 3000, 5000, 10000];

const PyramidEditor: React.FC<PyramidEditorProps> = ({ game, setGame }) => {
  const [questions, setQuestions] = useState<PyramidQuestion[]>(() => {
    const stored = (game.metadata?.questions as PyramidQuestion[]) || [];
    if (stored.length) return stored;

    return VALUES.map((v, i) => ({
      id: crypto.randomUUID(),
      level: i + 1,
      value: v,
      question: "",
      options: { a: "", b: "", c: "" },
      correct: "a",
    }));
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("General Knowledge");
  const [aiDifficulty, setAiDifficulty] = useState("Medium");

  // Sync to game metadata
  useEffect(() => {
    setGame((prev) => ({
      ...prev,
      metadata: { ...prev?.metadata, questions },
    }));
  }, [questions]);

  // --------------------------
  // Question modification logic
  // --------------------------
  const updateQuestion = (
    id: string,
    field: keyof Omit<PyramidQuestion, "options" | "id" | "level" | "value">,
    value: any
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (id: string, key: "a" | "b" | "c", value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, options: { ...(q.options || { a: "", b: "", c: "" }), [key]: value } } : q
      )
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // --------------------------
  // AI: Generate all or single
  // --------------------------
  const handleGenerateAll = async () => {
    try {
      setAiLoading(true);
      const response = await generatePyramidQuestions(aiTopic, aiDifficulty);

      if (response.error) {
        throw new Error(response.error);
      }

      const generated = response.data || [];

      // auto-assign ids, fallback to defaults if needed
      const merged = generated.map((q, i) => ({
        ...q,
        id: crypto.randomUUID(),
        value: VALUES[i] || q.value,
        level: i + 1,
      }));

      setQuestions(merged);
    } catch (err) {
      console.error("❌ Error generating Pyramid questions:", err);
      alert(err instanceof Error ? err.message : "Error generating Pyramid questions. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateOne = async (level: number) => {
    try {
      setAiLoading(true);
      const response = await generatePyramidQuestions(aiTopic, aiDifficulty);

      if (response.error) {
        throw new Error(response.error);
      }

      const generated = response.data || [];
      const newQ =
        generated.find((q) => q.level === level) || generated[level - 1];

      if (!newQ) throw new Error("AI did not return a question for that level.");

      // replace that level
      setQuestions((prev) =>
        prev.map((q) =>
          q.level === level
            ? {
              ...newQ,
              id: q.id,
              value: q.value,
              options: newQ.options,
              correct: (newQ as any).correct, // Ensure type safety
            }
            : q
        )
      );
    } catch (err) {
      console.error("❌ Error generating single question:", err);
      alert(err instanceof Error ? err.message : "Error generating single question. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // --------------------------
  // Render
  // --------------------------
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">🧗 Pyramid Question Editor</h2>
          <p className="text-gray-400 text-sm">
            Define or generate the 10 levels of the pyramid. Each level gets harder and more valuable.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Nombre del juego:</label>
          <input
            type="text"
            placeholder="Ej. Pirámide del Conocimiento"
            value={game.name || ""}
            onChange={(e) => setGame((prev) => ({ ...prev, name: e.target.value }))}
            className="bg-[#151a27] border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 flex-1"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Topic (e.g. Science)"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            className="bg-[#151a27] border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 w-40"
          />
          <select
            value={aiDifficulty}
            onChange={(e) => setAiDifficulty(e.target.value)}
            className="bg-[#151a27] border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <button
            onClick={handleGenerateAll}
            disabled={aiLoading}
            className="flex items-center gap-2 bg-blue-600 text-white font-bold px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            <Sparkles size={16} />
            {aiLoading ? "Generating..." : "Generate All (10)"}
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {questions.map((q) => (
          <div
            key={q.id}
            className="bg-[#1b2132] border border-[#2f3b57] rounded-lg p-5"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">
                Level {q.level} — {q.value} pts
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerateOne(q.level)}
                  disabled={aiLoading}
                  className="text-blue-400 hover:text-blue-500 text-sm"
                  title="Generate this question with AI"
                >
                  <Sparkles size={18} />
                </button>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="Eliminar pregunta"
                    title="Eliminar pregunta"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
            <textarea
              placeholder="Enter the question..."
              value={q.question}
              onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
              className="w-full bg-[#151a27] border border-gray-700 rounded-md p-3 text-sm text-gray-200 mb-3 resize-none"
              rows={2}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["a", "b", "c"] as const).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correct === key}
                    onChange={() => updateQuestion(q.id, "correct", key)}
                    className="accent-blue-500"
                  />
                  <input
                    type="text"
                    placeholder={`Option ${key.toUpperCase()}`}
                    value={q.options?.[key] || ""}
                    onChange={(e) => updateOption(q.id, key, e.target.value)}
                    className={`flex-1 bg-[#151a27] border ${q.correct === key ? "border-blue-500" : "border-gray-700"
                      } rounded-md px-3 py-2 text-sm text-gray-200`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default PyramidEditor;
