import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Game, JeopardyGame, JeopardyCategory, JeopardyQuestion, JeopardyTurnMode } from '@/types';
import { PlusIcon, TrashIcon, SaveIcon, PencilIcon } from '@components/icons/IconDefs';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { resolveMediaUrl } from '@/utils/media';



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
  const [isDragging, setIsDragging] = useState(false);

  const inferMediaTypeFromUrl = (url: string): 'IMAGE' | 'AUDIO' | 'VIDEO' | undefined => {
    if (!url) return undefined;
    const lower = url.toLowerCase();
    if (lower.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(lower)) return 'IMAGE';
    if (lower.startsWith('data:audio') || /\.(mp3|wav|ogg)$/.test(lower)) return 'AUDIO';
    if (lower.startsWith('data:video') || /\.(mp4|webm|mov)$/.test(lower)) return 'VIDEO';
    return undefined;
  };

  const inferMediaTypeFromFile = (file: File): 'IMAGE' | 'AUDIO' | 'VIDEO' | undefined => {
    if (file.type.startsWith('image')) return 'IMAGE';
    if (file.type.startsWith('audio')) return 'AUDIO';
    if (file.type.startsWith('video')) return 'VIDEO';
    return undefined;
  };

  const copyFileToAppFolder = async (file: File): Promise<string | null> => {
    const filePath = (file as any).path as string | undefined; // Electron adds `path`
    if (!filePath || !window?.electronAPI?.invoke) return null;
    try {
      const dest = await window.electronAPI.invoke("copy-media-file", filePath);
      return typeof dest === "string" ? dest : null;
    } catch (err) {
      console.warn("Failed to copy media via IPC, falling back to data URL.", err);
      return null;
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;

    const persistedPath = await copyFileToAppFolder(file);
    if (persistedPath) {
      onChangeUrl(persistedPath);
      const inferred = inferMediaTypeFromFile(file) || inferMediaTypeFromUrl(persistedPath);
      if (inferred) onChangeType(inferred);
      return;
    }

    const isImage = inferMediaTypeFromFile(file) === 'IMAGE';
    
    if (isImage) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 800;
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/webp", 0.7);
          onChangeUrl(dataUrl);
          onChangeType('IMAGE');
        }
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          onChangeUrl(dataUrl);
          onChangeType('IMAGE');
        };
        reader.readAsDataURL(file);
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onChangeUrl(dataUrl);
        const inferred = inferMediaTypeFromFile(file) || inferMediaTypeFromUrl(dataUrl);
        if (inferred) {
          onChangeType(inferred);
        } else {
          onChangeType(undefined);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Enriched handler for manual URL input
  const handleUrlChange = (url: string) => {
    onChangeUrl(url);
    if (!url) {
      onChangeType(undefined); // Clear type if URL is cleared
      return;
    }
    const inferred = inferMediaTypeFromUrl(url);
    if (inferred) {
      onChangeType(inferred);
    }
    // If no match, do not change type, allowing manual selection
  };

  // Drag-and-drop event handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
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
        onChange={(e) => handleUrlChange(e.target.value)}
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center text-sm transition-all duration-200 cursor-pointer ${
          isDragging 
            ? 'border-brand-accent bg-brand-accent/20 scale-105'
            : 'border-base-300 text-text-secondary hover:border-brand-primary'
        }`}
      >
        Click to browse, or drag & drop image/audio/video here
      </div>
      <input
        ref={fileRef}
        type="file"
        title={`${label} file input`}
        accept="image/*,audio/*,video/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
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
                src={resolveMediaUrl(value)}
                alt="Media preview"
                className="max-h-56 w-auto rounded object-contain"
              />
            )}
            {type === 'AUDIO' && (
              <audio controls src={resolveMediaUrl(value)} className="w-full">
                Your browser does not support the audio element.
              </audio>
            )}
            {type === 'VIDEO' && (
              <video controls src={resolveMediaUrl(value)} className="max-h-56 w-auto rounded">
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
  const clueInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus the clue input when the modal opens
    clueInputRef.current?.focus();
    clueInputRef.current?.select();
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  if (!question || !category) return null;

  const copyToClipboard = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await navigator.clipboard.writeText(trimmed);
    } catch (err) {
      console.warn("Clipboard copy failed", err);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      updateQuestionField(
        category.id,
        question.id,
        "question",
        text
      );
    } catch (err) {
      console.warn("Clipboard paste failed", err);
    }
  };

  const buildSmartExplanation = () => {
    const clue = question.question.trim();
    const answer = question.correctAnswer.trim();
    const options = (question.options || []).map((o) => o.trim()).filter(Boolean);

    const pieces: string[] = [];
    if (clue) {
      pieces.push(`The clue points to ${clue.toLowerCase()}.`);
    }
    if (options.length) {
      pieces.push(`Looking at the options (${options.join(", ")}), one fits best.`);
    }
    if (answer) {
      pieces.push(`The correct response is "${answer}" because it directly satisfies the prompt.`);
    }
    if (question.questionMediaType) {
      pieces.push(
        `Use the provided ${question.questionMediaType.toLowerCase()} to reinforce the association.`
      );
    }
    if (!pieces.length) {
      pieces.push("Add a brief explanation tying the clue to the correct response.");
    }
    return pieces.join(" ");
  };

  const guessCorrectAnswer = () => {
    const opts = (question.options || []).map((o) => o.trim()).filter(Boolean);
    if (opts.length) return opts[0];

    const quoted = question.question.match(/["“](.+?)["”]/);
    if (quoted?.[1]) return quoted[1];

    const afterColon = question.question.split(":")[1]?.trim();
    if (afterColon) return afterColon;

    if (question.questionMediaType) {
      return `Refer to the ${question.questionMediaType.toLowerCase()} hint`;
    }
    return "";
  };

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
              <div className="flex items-center justify-between gap-2 mb-1">
                <label
                  htmlFor="clue-input"
                  className="block text-sm font-medium text-text-secondary"
                >
                  Clue (Question)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Copy clue text"
                    className="text-xs px-2 py-1 rounded bg-base-300 hover:bg-base-100 border border-base-300"
                    onClick={() => copyToClipboard(question.question)}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    title="Paste into clue"
                    className="text-xs px-2 py-1 rounded bg-base-300 hover:bg-base-100 border border-base-300"
                    onClick={pasteFromClipboard}
                  >
                    Paste
                  </button>
                </div>
              </div>
              <textarea
                ref={clueInputRef}
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
                  <div className="flex items-center justify-between gap-2">
                    <span>Options (select correct answer)</span>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded bg-base-300 hover:bg-base-100 border border-base-300"
                      title="Magic fill based on clue, media, or options"
                      onClick={() => {
                        const guess = guessCorrectAnswer();
                        if (!guess) {
                          alert("Add a clue, media, or options first so we can suggest an answer.");
                          return;
                        }
                        updateQuestionField(
                          category.id,
                          question.id,
                          "correctAnswer",
                          guess
                        );
                      }}
                    >
                      ✨ Magic Fill
                    </button>
                  </div>
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
                  <div className="flex items-center justify-between gap-2">
                    <span>Correct Answer</span>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded bg-base-300 hover:bg-base-100 border border-base-300"
                      title="Magic fill based on clue, media, or options"
                      onClick={() => {
                        const guess = guessCorrectAnswer();
                        if (!guess) {
                          alert("Add a clue, media, or options first so we can suggest an answer.");
                          return;
                        }
                        updateQuestionField(
                          category.id,
                          question.id,
                          "correctAnswer",
                          guess
                        );
                      }}
                    >
                      ✨ Magic Fill
                    </button>
                  </div>
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
    <div className="flex gap-2">
      <button
        type="button"
        title="Generate an explanation from the clue and answer"
        className="flex items-center gap-1 text-xs bg-brand-secondary px-2 py-1 rounded hover:bg-brand-primary transition-colors border border-white/30"
        onClick={() => {
          const smart = buildSmartExplanation();
          updateQuestionField(
            category.id,
            question.id,
            "explanation",
            smart
          );
        }}
      >
        ✨ Smart Explain
      </button>
      <button
        type="button"
        title="Copy explanation text"
        className="text-xs px-2 py-1 rounded bg-base-300 hover:bg-base-100 border border-base-300"
        onClick={() => copyToClipboard(question.explanation || "")}
      >
        Copy
      </button>
      <button
        type="button"
        title="Paste into explanation"
        className="text-xs px-2 py-1 rounded bg-base-300 hover:bg-base-100 border border-base-300"
        onClick={async () => {
          const text = await navigator.clipboard.readText();
          if (!text) return;
          updateQuestionField(
            category.id,
            question.id,
            "explanation",
            text
          );
        }}
      >
        Paste
      </button>
    </div>
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

  <div className="mt-2">
    <span className="block text-sm font-medium text-text-secondary mb-1">
      Show explanation
    </span>
    <div className="flex gap-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={`explanation-placement-${question.id}`}
          className="radio radio-primary"
          value="WITH_QUESTION"
          checked={(question.explanationPlacement || "WITH_ANSWER") === "WITH_QUESTION"}
          onChange={() =>
            updateQuestionField(
              category.id,
              question.id,
              "explanationPlacement",
              "WITH_QUESTION"
            )
          }
        />
        <span>With the question</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={`explanation-placement-${question.id}`}
          className="radio radio-primary"
          value="WITH_ANSWER"
          checked={(question.explanationPlacement || "WITH_ANSWER") === "WITH_ANSWER"}
          onChange={() =>
            updateQuestionField(
              category.id,
              question.id,
              "explanationPlacement",
              "WITH_ANSWER"
            )
          }
        />
        <span>With the answer</span>
      </label>
    </div>
  </div>
</div>

          </div>

          {/* RIGHT PANEL */}
          <div className="flex-1 space-y-8">
            <MediaUpload
              label="Question Media"
              value={question.questionMediaUrl}
              type={question.questionMediaType}
              onChangeUrl={(url) =>
                updateQuestionField(
                  category.id,
                  question.id,
                  'questionMediaUrl',
                  url
                )
              }
              onChangeType={(type) =>
                updateQuestionField(
                  category.id,
                  question.id,
                  'questionMediaType',
                  type
                )
              }
              inputId="question-media-upload"
            />

            {/* Answer Media */}
            <MediaUpload
              label="Answer Media"
              value={question.answerMediaUrl}
              type={question.answerMediaType}
              onChangeUrl={(url) =>
                updateQuestionField(
                  category.id,
                  question.id,
                  'answerMediaUrl',
                  url
                )
              }
              onChangeType={(type) =>
                updateQuestionField(
                  category.id,
                  question.id,
                  'answerMediaType',
                  type
                )
              }
              inputId="answer-media-upload"
            />
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
   Category Defaults Modal
   ========================= */
interface CategoryDefaultsModalProps {
  category: JeopardyCategory;
  onApply: (categoryId: string, settings: {
    answerType: "" | "DIRECT" | "MULTIPLE_CHOICE";
    questionMediaType: "" | "IMAGE" | "AUDIO" | "VIDEO";
    answerMediaType: "" | "IMAGE" | "AUDIO" | "VIDEO";
  }) => void;
  onClose: () => void;
}

const CategoryDefaultsModal: React.FC<CategoryDefaultsModalProps> = ({
  category,
  onApply,
  onClose,
}) => {
  const [answerType, setAnswerType] = useState<"" | "DIRECT" | "MULTIPLE_CHOICE">("");
  const [questionMediaType, setQuestionMediaType] = useState<"" | "IMAGE" | "AUDIO" | "VIDEO">("");
  const [answerMediaType, setAnswerMediaType] = useState<"" | "IMAGE" | "AUDIO" | "VIDEO">("");

  const handleApply = () => {
    if (!answerType && !questionMediaType && !answerMediaType) {
      onClose();
      return;
    }
    onApply(category.id, { answerType, questionMediaType, answerMediaType });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-base-200 p-6 rounded-lg shadow-2xl w-full max-w-lg border border-base-300 space-y-4">
        <h2 className="text-xl font-bold">
          Column Defaults for{" "}
          <span className="text-brand-accent uppercase">{category.name || "Category"}</span>
        </h2>
        <p className="text-sm text-text-secondary">
          Choose settings to apply to all clues in this category. Leave a field blank to keep
          existing values.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1">
              Answer Type (all clues)
            </label>
            <select
              value={answerType}
              onChange={(e) =>
                setAnswerType(
                  e.target.value as "" | "DIRECT" | "MULTIPLE_CHOICE"
                )
              }
              className="bg-base-300 p-3 rounded-lg w-full"
            >
              <option value="">(no change)</option>
              <option value="DIRECT">Direct Answer</option>
              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1">
              Question Media Type (all clues)
            </label>
            <select
              value={questionMediaType}
              onChange={(e) =>
                setQuestionMediaType(
                  e.target.value as "" | "IMAGE" | "AUDIO" | "VIDEO"
                )
              }
              className="bg-base-300 p-3 rounded-lg w-full"
            >
              <option value="">(no change)</option>
              <option value="IMAGE">Image</option>
              <option value="AUDIO">Audio</option>
              <option value="VIDEO">Video</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1">
              Answer Media Type (all clues)
            </label>
            <select
              value={answerMediaType}
              onChange={(e) =>
                setAnswerMediaType(
                  e.target.value as "" | "IMAGE" | "AUDIO" | "VIDEO"
                )
              }
              className="bg-base-300 p-3 rounded-lg w-full"
            >
              <option value="">(no change)</option>
              <option value="IMAGE">Image</option>
              <option value="AUDIO">Audio</option>
              <option value="VIDEO">Video</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-base-300 text-text-primary hover:bg-base-300/80"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 rounded-lg bg-brand-primary text-black font-semibold hover:bg-brand-secondary"
          >
            Apply to Column
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
  const [categoryDefaultsFor, setCategoryDefaultsFor] = useState<JeopardyCategory | null>(null);

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

  const handleTeamNameChange = (index: number, name: string) => {
    setGame(prev => {
      const j = prev as JeopardyGame;
      const newTeams = [...(j.teams || ['', ''])] as [string, string];
      newTeams[index] = name;
      return { ...j, teams: newTeams };
    });
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
        explanationPlacement: 'WITH_ANSWER',
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

  const applyCategoryDefaults = (
    categoryId: string,
    settings: {
      answerType: "" | "DIRECT" | "MULTIPLE_CHOICE";
      questionMediaType: "" | "IMAGE" | "AUDIO" | "VIDEO";
      answerMediaType: "" | "IMAGE" | "AUDIO" | "VIDEO";
    }
  ) => {
    setGame((prev) => {
      if (!prev || !("categories" in prev)) return prev;
      const j = prev as JeopardyGame;
      return {
        ...j,
        categories: j.categories.map((c) => {
          if (c.id !== categoryId) return c;
          return {
            ...c,
            questions: c.questions.map((q) => {
              let next = { ...q };

              if (settings.answerType) {
                next.type = settings.answerType;
                if (settings.answerType === "MULTIPLE_CHOICE") {
                  // ensure options array exists
                  next.options = next.options && next.options.length ? [...next.options] : ["", "", ""];
                }
              }

              if (settings.questionMediaType) {
                next.questionMediaType = settings.questionMediaType;
              }

              if (settings.answerMediaType) {
                next.answerMediaType = settings.answerMediaType;
              }

              return next;
            }),
          };
        }),
      };
    });
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sourceCategoryId = source.droppableId;
    const destCategoryId = destination.droppableId;

    setGame((prev) => {
      if (!prev || !("categories" in prev)) return prev;
      const j = prev as JeopardyGame;
      const categories = [...j.categories];

      const sourceCatIndex = categories.findIndex((c) => c.id === sourceCategoryId);
      const destCatIndex = categories.findIndex((c) => c.id === destCategoryId);
      if (sourceCatIndex === -1 || destCatIndex === -1) return prev;

      const sourceCat = { ...categories[sourceCatIndex] };
      const destCat = sourceCatIndex === destCatIndex ? sourceCat : { ...categories[destCatIndex] };

      const sourceQuestions = [...sourceCat.questions];
      const destQuestions =
        sourceCatIndex === destCatIndex ? sourceQuestions : [...destCat.questions];

      const [moved] = sourceQuestions.splice(source.index, 1);
      if (!moved) return prev;

      destQuestions.splice(destination.index, 0, moved);

      // write back questions
      sourceCat.questions = sourceQuestions;
      destCat.questions = destQuestions;

      categories[sourceCatIndex] = sourceCat;
      categories[destCatIndex] = destCat;

      // Recalculate points based on row index for all categories
      const normalized = categories.map((c) => ({
        ...c,
        questions: c.questions.map((q, idx) => ({
          ...q,
          points: POINT_VALUES[idx] ?? q.points,
        })),
      }));

      return {
        ...j,
        categories: normalized,
      };
    });
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

      {categoryDefaultsFor && (
        <CategoryDefaultsModal
          category={categoryDefaultsFor}
          onApply={applyCategoryDefaults}
          onClose={() => setCategoryDefaultsFor(null)}
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

      {/* Team Names & Turn Mode */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input
          type="text"
          placeholder="Team A Name"
          value={game.teams?.[0] || ''}
          onChange={(e) => handleTeamNameChange(0, e.target.value)}
          className="bg-base-300 p-3 rounded-lg w-full"
        />
        <input
          type="text"
          placeholder="Team B Name"
          value={game.teams?.[1] || ''}
          onChange={(e) => handleTeamNameChange(1, e.target.value)}
          className="bg-base-300 p-3 rounded-lg w-full"
        />
        <div className="flex flex-col">
          <label htmlFor="turn-mode-select" className="text-sm font-medium text-text-secondary mb-1">Turn Rule</label>
          <select
            id="turn-mode-select"
            value={game.turnMode || ''}
            onChange={(e) => {
              const newTurnMode = e.target.value as JeopardyTurnMode;
              setGame(prev => {
                if (!prev) return null;
                const j = prev as JeopardyGame;
                return { ...j, turnMode: newTurnMode };
              });
            }}
            className="bg-base-300 p-3 rounded-lg w-full"
          >
            <option value={JeopardyTurnMode.CONTINUE_ON_CORRECT}>Team continues after guessing correctly</option>
            <option value={JeopardyTurnMode.ALTERNATE_AFTER_QUESTION}>Turn passes to the next team after each question</option>
          </select>
          <label className="flex items-start gap-3 mt-3">
            <input
              type="checkbox"
              className="toggle toggle-primary mt-1"
              checked={game.allowRebounds ?? true}
              onChange={(e) => {
                const enabled = e.target.checked;
                setGame((prev) => {
                  if (!prev) return null;
                  const j = prev as JeopardyGame;
                  return { ...j, allowRebounds: enabled };
                });
              }}
            />
            <div>
              <div className="font-semibold">Allow rebounds</div>
              <p className="text-sm text-text-secondary">
                When a team misses, let the other team attempt the same clue before it closes.
              </p>
            </div>
          </label>
        </div>
      </div>

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
	        <DragDropContext onDragEnd={handleDragEnd}>
	          <div
	            className="grid gap-2"
	            style={{ gridTemplateColumns: `repeat(${game.categories.length}, minmax(180px, 1fr))` }}
	          >
	            {game.categories.map((cat) => (
	              <div key={cat.id} className="flex flex-col">
	                {/* Header */}
	                <div className="bg-base-300 text-white p-2 rounded-t-lg h-24 flex flex-col justify-center items-center text-center relative group">
	                  <input
	                    aria-label={`Category ${cat.name || 'name'}`}
	                    placeholder="Enter category name"
	                    title="Category name"
	                    value={cat.name}
	                    onChange={(e) => updateCategoryName(cat.id, e.target.value)}
	                    className="bg-transparent text-center font-bold uppercase tracking-wider w-full outline-none focus:bg-base-200 rounded p-1 transition-colors text-brand-accent"
	                  />
	                  <button
	                    type="button"
	                    onClick={() => setCategoryDefaultsFor(cat)}
	                    className="mt-1 text-[11px] px-2 py-0.5 rounded-full bg-base-200 text-text-secondary hover:bg-brand-primary hover:text-black transition-colors"
	                    title="Set defaults for all clues in this category"
	                  >
	                    Column Defaults
	                  </button>
	                  <button
	                    onClick={() => removeCategory(cat.id)}
	                    aria-label={`Remove category ${cat.name || ''}`}
	                    title={`Remove category ${cat.name || ''}`}
	                    className="absolute top-1 right-1 p-1 rounded-full hover:bg-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity"
	                  >
	                    <TrashIcon className="w-4 h-4" />
	                  </button>
	                </div>

	                {/* Column cells */}
	                <Droppable droppableId={cat.id}>
	                  {(provided) => (
	                    <div
	                      ref={provided.innerRef}
	                      {...provided.droppableProps}
	                      className="space-y-2 pt-1"
	                    >
	                      {cat.questions.map((q, index) => {
	                        const labelPoints = POINT_VALUES[index] ?? q.points;
	                        const hasContent = !!(q.question.trim() || q.correctAnswer.trim());
	                        return (
	                          <Draggable key={q.id} draggableId={q.id} index={index}>
	                            {(dragProvided, snapshot) => (
	                              <button
	                                ref={dragProvided.innerRef}
	                                {...dragProvided.draggableProps}
	                                {...dragProvided.dragHandleProps}
	                                onClick={() =>
	                                  setEditing({ categoryId: cat.id, questionId: q.id })
	                                }
	                                aria-label={`Edit clue for ${cat.name}, ${labelPoints} points`}
	                                title={`Edit clue for ${cat.name}, ${labelPoints} points`}
	                                className={`relative group h-24 w-full flex items-center justify-center font-bold text-3xl rounded-b-lg transition-all duration-200 transform hover:scale-105 shadow-md ${
	                                  hasContent
	                                    ? 'bg-brand-primary text-black'
	                                    : 'bg-base-300 text-brand-accent hover:bg-brand-secondary'
	                                } ${snapshot.isDragging ? 'ring-2 ring-brand-primary' : ''}`}
	                              >
	                                ${labelPoints}
	                                {hasContent && (
	                                  <PencilIcon className="w-5 h-5 text-black absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
	                                )}
	                              </button>
	                            )}
	                          </Draggable>
	                        );
	                      })}
	                      {provided.placeholder}
	                    </div>
	                  )}
	                </Droppable>
	              </div>
	            ))}
	          </div>
	        </DragDropContext>
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
