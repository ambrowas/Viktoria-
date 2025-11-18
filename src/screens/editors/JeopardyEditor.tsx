import React, { useMemo, useRef, useState } from 'react';
import { Game, JeopardyGame, JeopardyCategory, JeopardyQuestion } from '@/types';
import { PlusIcon, TrashIcon, SaveIcon, PencilIcon } from '@components/icons/IconDefs';



interface JeopardyEditorProps {
  game: JeopardyGame;
  setGame: React.Dispatch<React.SetStateAction<Partial<Game> | null>>;
}

const POINT_VALUES = [100, 200, 300, 400, 500] as const;

// Fields we update via a single setter; options handled separately
type UpdatableJeopardyQuestionFields = Omit<
  JeopardyQuestion,
  'id' | 'points' | 'options'
>;

/* =========================
   Unified Media Upload
   ========================= */
interface MediaUploadProps {
  label: string;
  placeholder?: string;
  value: string | undefined;
  type: 'IMAGE' | 'AUDIO' | 'VIDEO' | undefined;
  onChangeUrl: (url: string) => void;
  onChangeType: (t: 'IMAGE' | 'AUDIO' | 'VIDEO' | undefined) => void;
  inputId: string; // for label association
}

const MediaUpload: React.FC<MediaUploadProps> = ({
  label,
  placeholder = 'https://example.com/media',
  value,
  type,
  onChangeUrl,
  onChangeType,
  inputId,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file?: File) => {
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    onChangeUrl(localUrl);
    if (file.type.startsWith('image')) onChangeType('IMAGE');
    else if (file.type.startsWith('audio')) onChangeType('AUDIO');
    else if (file.type.startsWith('video')) onChangeType('VIDEO');
  };

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
        {label}
      </label>

      {/* URL input */}
      <input
        id={inputId}
        type="text"
        title={`${label} URL`}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChangeUrl(e.target.value)}
        className="bg-base-300 p-3 rounded-lg w-full"
      />

      {/* Combined dropzone + click-to-browse */}
      <div
        role="button"
        title={`${label} — click to choose a file or drag & drop`}
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className="border-2 border-dashed border-base-300 rounded-lg p-6 text-center text-sm text-text-secondary hover:border-brand-primary transition cursor-pointer"
      >
        Click to browse, or drag & drop image/audio/video here
      </div>
      <input
        ref={fileRef}
        type="file"
        title={`${label} file input`}
        accept="image/*,audio/*,video/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Media type */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Media Type
        </label>
        <select
          title={`${label} type select`}
          value={type || ''}
          onChange={(e) => {
            const v = e.target.value as '' | 'IMAGE' | 'AUDIO' | 'VIDEO';
            onChangeType(v === '' ? undefined : v);
          }}
          className="bg-base-300 p-3 rounded-lg w-full"
        >
          <option value="">None</option>
          <option value="IMAGE">Image</option>
          <option value="AUDIO">Audio</option>
          <option value="VIDEO">Video</option>
        </select>
      </div>

      {/* Preview */}
      {value && type && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Preview
          </label>
          <div className="bg-base-300 p-2 rounded-lg flex justify-center items-center max-h-60 overflow-hidden">
            {type === 'IMAGE' && (
              <img
                src={value}
                alt="Media preview"
                className="max-h-56 w-auto rounded object-contain"
              />
            )}
            {type === 'AUDIO' && (
              <audio controls src={value} className="w-full">
                Your browser does not support the audio element.
              </audio>
            )}
            {type === 'VIDEO' && (
              <video controls src={value} className="max-h-56 w-auto rounded">
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================
   Question Modal (a11y-fixed)
   ========================= */
interface QuestionModalProps {
  category: JeopardyCategory | null;
  question: JeopardyQuestion | null;
  onClose: () => void;
  updateQuestionField: <K extends keyof UpdatableJeopardyQuestionFields>(
    categoryId: string,
    questionId: string,
    field: K,
    value: UpdatableJeopardyQuestionFields[K]
  ) => void;
  handleOptionChange: (
    categoryId: string,
    questionId: string,
    optionIndex: number,
    value: string
  ) => void;
  onSaveAndNext: () => void;
  isLastInCategory: boolean;
  isBoardLast: boolean;
}

const QuestionModal: React.FC<QuestionModalProps> = ({
  category,
  question,
  onClose,
  updateQuestionField,
  handleOptionChange,
  onSaveAndNext,
  isLastInCategory,
  isBoardLast,
}) => {
  if (!question || !category) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-base-200 p-6 rounded-lg shadow-2xl w-full max-w-6xl flex flex-col gap-6 border-4 border-white">
        {/* CONTENT ROW: Landscape (two columns side by side) */}
        <div className="flex flex-row gap-8 flex-1 overflow-y-auto">
          {/* LEFT PANEL */}
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold">
              Edit Clue for{" "}
              <span className="text-brand-accent">
                {category.name} - ${question.points}
              </span>
            </h2>

            {/* Clue */}
            <div>
              <label
                htmlFor="clue-input"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Clue (Question)
              </label>
              <textarea
                id="clue-input"
                title="Clue (Question)"
                placeholder="Enter the clue"
                value={question.question}
                onChange={(e) =>
                  updateQuestionField(
                    category.id,
                    question.id,
                    "question",
                    e.target.value
                  )
                }
                className="bg-base-300 p-3 rounded-lg w-full text-lg h-24 resize-none"
              />
            </div>

            {/* Answer Type */}
            <div>
              <span className="block text-sm font-medium text-text-secondary mb-2">
                Answer Type
              </span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`q-type-${question.id}`}
                    className="radio radio-primary"
                    title="Direct Answer"
                    checked={question.type === "DIRECT" || !question.type}
                    onChange={() =>
                      updateQuestionField(
                        category.id,
                        question.id,
                        "type",
                        "DIRECT"
                      )
                    }
                  />
                  <span>Direct Answer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`q-type-${question.id}`}
                    className="radio radio-primary"
                    title="Multiple Choice"
                    checked={question.type === "MULTIPLE_CHOICE"}
                    onChange={() =>
                      updateQuestionField(
                        category.id,
                        question.id,
                        "type",
                        "MULTIPLE_CHOICE"
                      )
                    }
                  />
                  <span>Multiple Choice</span>
                </label>
              </div>
            </div>

            {/* Answer Section */}
            {question.type === "MULTIPLE_CHOICE" ? (
              <div>
                <span className="block text-sm font-medium text-text-secondary mb-1">
                  Options (select correct answer)
                </span>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => {
                    const opt = question.options?.[index] ?? "";
                    const isCorrect =
                      question.correctAnswer === opt && opt !== "";
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-answer-${question.id}`}
                          className="radio radio-primary"
                          title={`Mark option ${index + 1} as correct`}
                          checked={isCorrect}
                          onChange={() =>
                            updateQuestionField(
                              category.id,
                              question.id,
                              "correctAnswer",
                              opt
                            )
                          }
                          aria-label={`Set option ${index + 1} as correct`}
                        />
                        <input
                          title={`Option ${index + 1}`}
                          placeholder={`Option ${index + 1}`}
                          value={opt}
                          onChange={(e) =>
                            handleOptionChange(
                              category.id,
                              question.id,
                              index,
                              e.target.value
                            )
                          }
                          className={`bg-base-300 p-3 rounded-lg w-full text-lg ${
                            isCorrect ? "ring-2 ring-green-500" : ""
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="answer-input"
                  className="block text-sm font-medium text-text-secondary mb-1"
                >
                  Correct Answer
                </label>
                <input
                  id="answer-input"
                  type="text"
                  title="Correct Answer"
                  placeholder="Enter the correct answer"
                  value={question.correctAnswer}
                  onChange={(e) =>
                    updateQuestionField(
                      category.id,
                      question.id,
                      "correctAnswer",
                      e.target.value
                    )
                  }
                  className="bg-base-300 p-3 rounded-lg w-full text-lg"
                />
              </div>
            )}

           {/* Explanation with AI helper */}
<div>
  <div className="flex justify-between items-center mb-1">
    <label
      htmlFor="explanation-input"
      className="block text-sm font-medium text-text-secondary"
    >
      Explanation (Optional)
    </label>
    <button
      type="button"
      title="Generate concise explanation from clue"
      className="flex items-center gap-1 text-xs bg-brand-secondary px-2 py-1 rounded hover:bg-brand-primary transition-colors border border-white/30"
      onClick={() => {
        // Example: generate from clue
        const clue = question.question.trim();
        if (!clue) return alert("Please enter a clue first!");
        
        // For now, just generate a placeholder explanation.
        // Later you can replace with API call (OpenAI, Gemini, etc.)
        const autoExplanation = `This clue refers to ${clue.toLowerCase()}, providing historical or contextual significance.`;
        
        updateQuestionField(
          category.id,
          question.id,
          "explanation",
          autoExplanation
        );
      }}
    >
      ✨ Auto
    </button>
  </div>
  
  <textarea
    id="explanation-input"
    title="Answer Explanation"
    placeholder="Provide additional context for the answer"
    value={question.explanation || ""}
    onChange={(e) =>
      updateQuestionField(
        category.id,
        question.id,
        "explanation",
        e.target.value
      )
    }
    className="bg-base-300 p-3 rounded-lg w-full h-24 resize-none"
  />
</div>

          </div>

          {/* RIGHT PANEL */}
          <div className="flex-1 space-y-8">
            {/* Question Media */}
            <div className="space-y-3">
              <label
                htmlFor="question-media-type"
                className="block text-lg font-bold text-text-secondary"
              >
                Question Media
              </label>

              {/* Media Type */}
              <label
                htmlFor="question-media-type"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Media Type (Question)
              </label>
              <select
                id="question-media-type"
                title="Select media type for question"
                value={question.questionMediaType || ""}
                onChange={(e) =>
                  updateQuestionField(
                    category.id,
                    question.id,
                    "questionMediaType",
                    e.target.value as JeopardyQuestion["questionMediaType"]
                  )
                }
                className="bg-base-300 p-3 rounded-lg w-full"
              >
                <option value="">None</option>
                <option value="IMAGE">Image</option>
                <option value="AUDIO">Audio</option>
                <option value="VIDEO">Video</option>
              </select>

              {/* File Input with drag/drop */}
              <div
                role="button"
                tabIndex={0}
                title="Click or drop a file for question media"
                aria-label="Click or drop a file for question media"
                onClick={(e) =>
                  (e.currentTarget.querySelector(
                    "input[type=file]"
                  ) as HTMLInputElement)?.click()
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    (e.currentTarget.querySelector(
                      "input[type=file]"
                    ) as HTMLInputElement)?.click();
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const localUrl = URL.createObjectURL(file);
                    updateQuestionField(
                      category.id,
                      question.id,
                      "questionMediaUrl",
                      localUrl
                    );
                  }
                }}
                className="border-2 border-dashed border-base-300 rounded-lg p-4 text-center cursor-pointer hover:border-brand-primary transition"
              >
                Click or drop a file here
                <input
                  type="file"
                  aria-label="Question media file input"
                  title="Question media file input"
                  accept={
                    question.questionMediaType === "IMAGE"
                      ? "image/*"
                      : question.questionMediaType === "AUDIO"
                      ? "audio/*"
                      : question.questionMediaType === "VIDEO"
                      ? "video/*"
                      : "image/*,audio/*,video/*"
                  }
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const localUrl = URL.createObjectURL(file);
                      updateQuestionField(
                        category.id,
                        question.id,
                        "questionMediaUrl",
                        localUrl
                      );
                    }
                  }}
                />
              </div>

              {/* Preview */}
              {question.questionMediaUrl && question.questionMediaType && (
                <div className="mt-2">
                  {question.questionMediaType === "IMAGE" && (
                    <img
                      src={question.questionMediaUrl}
                      alt="Question media preview"
                      className="max-h-40 rounded"
                    />
                  )}
                  {question.questionMediaType === "AUDIO" && (
                    <audio
                      controls
                      src={question.questionMediaUrl}
                      className="w-full"
                    />
                  )}
                  {question.questionMediaType === "VIDEO" && (
                    <video
                      controls
                      src={question.questionMediaUrl}
                      className="max-h-40 rounded"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Answer Media */}
            <div className="space-y-3">
              <label
                htmlFor="answer-media-type"
                className="block text-lg font-bold text-text-secondary"
              >
                Answer Media
              </label>

              {/* Media Type */}
              <label
                htmlFor="answer-media-type"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Media Type (Answer)
              </label>
              <select
                id="answer-media-type"
                title="Select media type for answer"
                value={question.answerMediaType || ""}
                onChange={(e) =>
                  updateQuestionField(
                    category.id,
                    question.id,
                    "answerMediaType",
                    e.target.value as JeopardyQuestion["answerMediaType"]
                  )
                }
                className="bg-base-300 p-3 rounded-lg w-full"
              >
                <option value="">None</option>
                <option value="IMAGE">Image</option>
                <option value="AUDIO">Audio</option>
                <option value="VIDEO">Video</option>
              </select>

              {/* File Input with drag/drop */}
              <div
                role="button"
                tabIndex={0}
                title="Click or drop a file for answer media"
                aria-label="Click or drop a file for answer media"
                onClick={(e) =>
                  (e.currentTarget.querySelector(
                    "input[type=file]"
                  ) as HTMLInputElement)?.click()
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    (e.currentTarget.querySelector(
                      "input[type=file]"
                    ) as HTMLInputElement)?.click();
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const localUrl = URL.createObjectURL(file);
                    updateQuestionField(
                      category.id,
                      question.id,
                      "answerMediaUrl",
                      localUrl
                    );
                  }
                }}
                className="border-2 border-dashed border-base-300 rounded-lg p-4 text-center cursor-pointer hover:border-brand-primary transition"
              >
                Click or drop a file here
                <input
                  type="file"
                  aria-label="Answer media file input"
                  title="Answer media file input"
                  accept={
                    question.answerMediaType === "IMAGE"
                      ? "image/*"
                      : question.answerMediaType === "AUDIO"
                      ? "audio/*"
                      : question.answerMediaType === "VIDEO"
                      ? "video/*"
                      : "image/*,audio/*,video/*"
                  }
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const localUrl = URL.createObjectURL(file);
                      updateQuestionField(
                        category.id,
                        question.id,
                        "answerMediaUrl",
                        localUrl
                      );
                    }
                  }}
                />
              </div>

              {/* Preview */}
              {question.answerMediaUrl && question.answerMediaType && (
                <div className="mt-2">
                  {question.answerMediaType === "IMAGE" && (
                    <img
                      src={question.answerMediaUrl}
                      alt="Answer media preview"
                      className="max-h-40 rounded"
                    />
                  )}
                  {question.answerMediaType === "AUDIO" && (
                    <audio
                      controls
                      src={question.answerMediaUrl}
                      className="w-full"
                    />
                  )}
                  {question.answerMediaType === "VIDEO" && (
                    <video
                      controls
                      src={question.answerMediaUrl}
                      className="max-h-40 rounded"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER BUTTONS */}
        <div className="flex justify-between gap-4">
          <button
            onClick={onSaveAndNext}
            className="flex-1 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700"
            title={
              isBoardLast
                ? "Board complete"
                : isLastInCategory
                ? "Finish category"
                : "Save and go to next clue"
            }
          >
            {isBoardLast
              ? "BOARD COMPLETE"
              : isLastInCategory
              ? "Finish Category"
              : "Save & Next Clue"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700"
            title="Done editing"
          >
            <SaveIcon /> Done
          </button>
        </div>
      </div>
    </div>
  );
};


/* =========================
   Preview Modal
   ========================= */
const PreviewModal: React.FC<{ game: JeopardyGame; onClose: () => void; onOpenClue: (catId: string, qId: string) => void; }> = ({
  game,
  onClose,
  onOpenClue,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
    <div className="bg-base-100 p-8 rounded-lg shadow-2xl w-full max-w-6xl overflow-y-auto">
      <h2 className="text-3xl font-bold mb-4">Preview Mode</h2>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${game.categories.length}, minmax(180px, 1fr))` }}
      >
        {game.categories.map((cat) => (
          <div key={cat.id}>
            <div className="bg-base-300 text-white p-2 rounded-t-lg text-center font-bold uppercase">
              {cat.name}
            </div>
            {cat.questions.map((q) => (
              <button
                key={q.id}
                onClick={() => onOpenClue(cat.id, q.id)}
                title={`Open ${cat.name} — $${q.points}`}
                className="bg-brand-primary text-black h-20 w-full font-bold text-2xl m-1 rounded-lg hover:brightness-95"
              >
                ${q.points}
              </button>
            ))}
          </div>
        ))}
      </div>
      <button
        onClick={onClose}
        title="Exit preview"
        className="mt-6 w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700"
      >
        Exit Preview
      </button>
    </div>
  </div>
);

/* =========================
   Main Editor
   ========================= */
const JeopardyEditor: React.FC<JeopardyEditorProps> = ({ game, setGame }) => {
  const [editing, setEditing] = useState<{ categoryId: string; questionId: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const getQuestion = (categoryId: string, points: number) =>
    game.categories.find((c) => c.id === categoryId)?.questions.find((q) => q.points === points);

  // Derived positions for Save & Next
  const indices = useMemo(() => {
    if (!editing) return null;
    const catIdx = game.categories.findIndex((c) => c.id === editing.categoryId);
    if (catIdx < 0) return null;
    const qIdx = game.categories[catIdx].questions.findIndex((q) => q.id === editing.questionId);
    if (qIdx < 0) return null;
    return { catIdx, qIdx };
  }, [editing, game.categories]);

  const isLastInCategory = !!indices && indices.qIdx === game.categories[indices.catIdx].questions.length - 1;
  const isBoardLast =
    !!indices &&
    indices.catIdx === game.categories.length - 1 &&
    indices.qIdx === game.categories[indices.catIdx].questions.length - 1;

  const openFirstClue = (catId: string) => {
    const cat = game.categories.find((c) => c.id === catId);
    if (!cat || cat.questions.length === 0) return;
    setEditing({ categoryId: catId, questionId: cat.questions[0].id });
  };

  const onSaveAndNext = () => {
    if (!indices) return;
    const { catIdx, qIdx } = indices;
    const cat = game.categories[catIdx];

    if (qIdx < cat.questions.length - 1) {
      // next in same category
      setEditing({ categoryId: cat.id, questionId: cat.questions[qIdx + 1].id });
      return;
    }

    // at end of category
    if (catIdx < game.categories.length - 1) {
      const nextCat = game.categories[catIdx + 1];
      setEditing({ categoryId: nextCat.id, questionId: nextCat.questions[0].id });
      return;
    }

    // end of board
    alert('BOARD COMPLETE');
    setEditing(null);
  };

  /* ---------- Mutators (functional updaters to avoid focus loss) ---------- */
  const addCategory = () => {
    const newCategory: JeopardyCategory = {
      id: crypto.randomUUID(),
      name: `Category ${game.categories.length + 1}`,
      questions: POINT_VALUES.map((points) => ({
        id: crypto.randomUUID(),
        question: '',
        correctAnswer: '',
        points,
        type: 'DIRECT',
        options: ['', '', ''],
        explanation: '',
        questionMediaUrl: '',
        questionMediaType: undefined,
        answerMediaUrl: '',
        answerMediaType: undefined,
      })),
    };
    setGame((prev) => {
      if (!prev || !('categories' in prev)) return prev;
      const j = prev as JeopardyGame;
      return { ...j, categories: [...j.categories, newCategory] };
    });
  };

  const updateCategoryName = (categoryId: string, name: string) => {
    setGame((prev) => {
      if (!prev || !('categories' in prev)) return prev;
      const j = prev as JeopardyGame;
      return {
        ...j,
        categories: j.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)),
      };
    });
  };

  const removeCategory = (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this entire category?')) return;
    setGame((prev) => {
      if (!prev || !('categories' in prev)) return prev;
      const j = prev as JeopardyGame;
      return { ...j, categories: j.categories.filter((c) => c.id !== categoryId) };
    });
    // If we deleted the category currently being edited, close the modal
    setEditing((curr) => (curr?.categoryId === categoryId ? null : curr));
  };

  const updateQuestionField = <K extends keyof UpdatableJeopardyQuestionFields>(
    categoryId: string,
    questionId: string,
    field: K,
    value: UpdatableJeopardyQuestionFields[K]
  ) => {
    setGame((prev) => {
      if (!prev || !('categories' in prev)) return prev;
      const j = prev as JeopardyGame;
      return {
        ...j,
        categories: j.categories.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                questions: c.questions.map((q) =>
                  q.id === questionId ? { ...q, [field]: value } : q
                ),
              }
            : c
        ),
      };
    });
  };

  const handleOptionChange = (
    categoryId: string,
    questionId: string,
    optionIndex: number,
    value: string
  ) => {
    setGame((prev) => {
      if (!prev || !('categories' in prev)) return prev;
      const j = prev as JeopardyGame;
      return {
        ...j,
        categories: j.categories.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                questions: c.questions.map((q) => {
                  if (q.id !== questionId) return q;
                  const newOptions = [...(q.options || ['', '', ''])];
                  const oldVal = newOptions[optionIndex];
                  newOptions[optionIndex] = value;
                  // keep correctAnswer synced if it pointed to the old value
                  const newCorrect =
                    q.correctAnswer === oldVal ? value : q.correctAnswer;
                  return { ...q, options: newOptions, correctAnswer: newCorrect };
                }),
              }
            : c
        ),
      };
    });
  };

  /* ---------- Modal derived data ---------- */
  const categoryToEdit = editing
    ? game.categories.find((c) => c.id === editing.categoryId) || null
    : null;

  const questionToEdit =
    categoryToEdit && editing
      ? categoryToEdit.questions.find((q) => q.id === editing.questionId) || null
      : null;

  return (
    <div className="bg-base-200 p-6 rounded-lg shadow-lg overflow-x-auto">
      {/* Modals */}
      {editing && (
        <QuestionModal
          category={categoryToEdit}
          question={questionToEdit}
          onClose={() => setEditing(null)}
          updateQuestionField={updateQuestionField}
          handleOptionChange={handleOptionChange}
          onSaveAndNext={onSaveAndNext}
          isLastInCategory={!!isLastInCategory}
          isBoardLast={!!isBoardLast}
        />
      )}

      {showPreview && (
        <PreviewModal
          game={game}
          onClose={() => setShowPreview(false)}
          onOpenClue={(catId, qId) => {
            setShowPreview(false);
            setEditing({ categoryId: catId, questionId: qId });
          }}
        />
      )}

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Jeopardy Board</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(true)}
            aria-label="Open preview"
            title="Open preview"
            className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Preview
          </button>
          <button
            onClick={addCategory}
            aria-label="Add category"
            title="Add category"
            className="flex items-center gap-2 bg-brand-secondary text-black font-bold py-2 px-4 rounded-lg hover:bg-brand-primary transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Category
          </button>
        </div>
      </div>

      {/* Board */}
      {game.categories.length > 0 ? (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${game.categories.length}, minmax(180px, 1fr))` }}
        >
          {/* Headers */}
          {game.categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-base-300 text-white p-2 rounded-t-lg h-24 flex flex-col justify-center items-center text-center relative group"
            >
              <input
                aria-label={`Category ${cat.name || 'name'}`}
                placeholder="Enter category name"
                title="Category name"
                value={cat.name}
                onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                className="bg-transparent text-center font-bold uppercase tracking-wider w-full outline-none focus:bg-base-200 rounded p-1 transition-colors text-brand-accent"
              />
              <button
                onClick={() => removeCategory(cat.id)}
                aria-label={`Remove category ${cat.name || ''}`}
                title={`Remove category ${cat.name || ''}`}
                className="absolute top-1 right-1 p-1 rounded-full hover:bg-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Cells */}
          {POINT_VALUES.map((points) =>
            game.categories.map((cat) => {
              const q = getQuestion(cat.id, points);
              const hasContent = !!q && !!(q.question.trim() || q.correctAnswer.trim());
              return (
                <button
                  key={`${cat.id}-${points}`}
                  onClick={() => q && setEditing({ categoryId: cat.id, questionId: q.id })}
                  aria-label={`Edit clue for ${cat.name}, ${points} points`}
                  title={`Edit clue for ${cat.name}, ${points} points`}
                  className={`relative group h-24 flex items-center justify-center font-bold text-3xl rounded-b-lg transition-all duration-200 transform hover:scale-105 shadow-md ${
                    hasContent
                      ? 'bg-brand-primary text-black'
                      : 'bg-base-300 text-brand-accent hover:bg-brand-secondary'
                  }`}
                >
                  ${points}
                  {hasContent && (
                    <PencilIcon className="w-5 h-5 text-black absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })
          )}
        </div>
      ) : (
        <div className="text-center text-text-secondary py-8 flex flex-col items-center justify-center bg-base-300 rounded-lg">
          <h3 className="text-xl font-semibold text-text-primary">Your Board is Empty</h3>
          <p className="mt-2 text-sm">
            Click <span className="font-bold text-brand-accent">Add Category</span> to start.
          </p>
        </div>
      )}
    </div>
  );
};

export default JeopardyEditor;
