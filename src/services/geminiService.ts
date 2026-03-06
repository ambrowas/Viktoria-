import type {
  ChainQuestion,
  JeopardyQuestion,
  FamilyFeudRound,
  ChainRound,
  PyramidQuestion,
  PriceItem,
} from "@/types";
import { v4 as uuid } from "uuid";

// =================================================================
// Gemini IPC bridge (renderer -> main)
// =================================================================

/**
 * Represents the standardized response from a service function.
 * @template T The expected data type on success.
 */
export type ServiceResponse<T> = {
  data: T | null;
  error: string | null;
};

let model: any = null;
const MODEL_ERROR =
  "Gemini backend not available. Make sure the Electron app is running and GEMINI_API_KEY is set.";

const createIpcModel = () => ({
  generateContent: async (prompt: string) => {
    if (!window?.electronAPI?.invoke) {
      throw new Error(MODEL_ERROR);
    }
    const text = await window.electronAPI.invoke("gemini:generate-text", { prompt });
    return {
      response: {
        text: async () => String(text ?? ""),
      },
    };
  },
});

const ensureModel = () => {
  if (model) return model;
  if (typeof window === "undefined") return null;
  if (!window?.electronAPI?.invoke) return null;
  model = createIpcModel();
  return model;
};

async function checkModel(): Promise<string | null> {
  if (!ensureModel()) return MODEL_ERROR;
  return null;
}

// =====================================================
// Helpers
// =====================================================

async function extractText(res: any): Promise<string> {
  try {
    return (await res.response.text())?.trim() || "";
  } catch {
    console.warn("⚠️ [extractText] Could not extract text");
    return "";
  }
}

function safeJson<T = any>(text: string): T | null {
  try {
    // 1. Try to find JSON block in markdown backticks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    let candidate = codeBlockMatch ? codeBlockMatch[1] : text;

    // 2. If no backticks, or they didn't contain valid JSON, try finding first/last brackets
    const opener = candidate.match(/[\[{]/);
    if (opener) {
      const startIdx = opener.index!;
      const closer = opener[0] === "[" ? "]" : "}";
      const endIdx = candidate.lastIndexOf(closer);
      if (endIdx !== -1) {
        candidate = candidate.substring(startIdx, endIdx + 1);
      }
    }

    const cleaned = candidate
      .trim()
      .replace(/,\s*([\]}])/g, "$1"); // remove trailing commas

    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("❌ [safeJson] Failed to parse JSON:", err, "\nRaw text snippet:\n", text.slice(0, 200));
    return null;
  }
}

// =====================================================
// Generators
// =====================================================

// 🧩 Chain Reaction
export async function generateChainReactionRound(
  theme: string,
  linkCount = 6,
  language: "en" | "es" = "en"
): Promise<ServiceResponse<Omit<ChainRound, "id">>> {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const prompt =
    language === "es"
      ? `Crea una ronda de "Chain Reaction Trivia" sobre "${theme}" con ${linkCount} eslabones. Devuelve SOLO JSON con la estructura: { "theme": "...", "timePerQuestion": ..., "chain": [{ "prompt": "...", "answer": "...", "linkHint": "...", "points": ... }] }`
      : `Create a "Chain Reaction Trivia" round about "${theme}" with ${linkCount} links. Return ONLY JSON with the structure: { "theme": "...", "timePerQuestion": ..., "chain": [{ "prompt": "...", "answer": "...", "linkHint": "...", "points": ... }] }`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const parsed = safeJson<any>(text);

    if (!parsed?.chain || !Array.isArray(parsed.chain)) {
      return { data: null, error: "AI failed to generate a valid chain. The response was malformed." };
    }

    const chain = parsed.chain.map((c: any, idx: number) => ({
      id: uuid(),
      prompt: String(c.prompt ?? `Link ${idx + 1}`),
      answer: String(c.answer ?? "").trim(),
      linkHint: c.linkHint ? String(c.linkHint) : idx === 0 ? "" : "Related to previous",
      points: Number.isFinite(c.points) ? c.points : 100 + idx * 20,
    }));

    const data = {
      theme: parsed.theme || theme,
      timePerQuestion: Number.isFinite(parsed.timePerQuestion) ? parsed.timePerQuestion : 20,
      chain,
    };

    return { data, error: null };
  } catch (err) {
    console.error("❌ [generateChainReactionRound] Failed:", err);
    return { data: null, error: err instanceof Error ? err.message : "An unknown error occurred during generation." };
  }
}

// 👪 Family Feud
export const generateFamilyFeudRound = async (
  topic: string,
  language: "en" | "es" = "en"
): Promise<ServiceResponse<Omit<FamilyFeudRound, "id">>> => {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const prompt =
    language === "es"
      ? `Genera una ronda de "Cien Mexicanos Dijeron" sobre "${topic}". Devuelve solo JSON.`
      : `Generate a Family Feud round about "${topic}". Return JSON only.`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const parsed = safeJson<Omit<FamilyFeudRound, "id">>(text);

    if (!parsed?.answers || !Array.isArray(parsed.answers)) {
      return { data: null, error: "AI response for Family Feud was not in the expected format." };
    }
    return { data: parsed, error: null };
  } catch (err) {
    console.error("❌ [generateFamilyFeudRound] Failed:", err);
    return { data: null, error: err instanceof Error ? err.message : "An unknown error occurred." };
  }
};

// 🎮 Memory
const FALLBACK_EMOJIS = [
  "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🏒", "🏑", "🏏", "⛳",
  "🍎", "🍌", "🍒", "🍇", "🍉", "🍓", "🍍", "🥝", "🥑", "🥦", "🥕", "🌽", "🌶️", "🍕", "🍔",
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐘", "🦁", "🐯", "🦓", "🦄", "🐧", "🦋",
  "🚀", "✈️", "🚗", "🚲", "🚢", "🚁", "🚂", "🚜", "🛸", "⛵", "🚒", "🚑", "🏎️", "🚜", "🛴",
  "⭐", "🌙", "☀️", "☁️", "🌈", "🔥", "❄️", "🌊", "🌵", "🌴", "🍀", "💎", "🎨", "🎸", "🎮"
];

function getRandomEmojis(count: number): string[] {
  const shuffled = [...FALLBACK_EMOJIS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export const generateMemoryIcons = async (
  theme: string,
  count: number,
  language: "en" | "es" = "en"
): Promise<ServiceResponse<string[]>> => {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const prompt =
    language === "es"
      ? `Genera ${count} emojis únicos sobre "${theme}". Devuelve JSON: { "icons": ["⚽","🏀"] }`
      : `Generate ${count} unique emojis about "${theme}". Return JSON: { "icons": ["⚽","🏀"] }`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const result = safeJson<{ icons: string[] }>(text);

    if (!result?.icons || !Array.isArray(result.icons)) {
      console.warn("⚠️ [generateMemoryIcons] Invalid AI response, falling back to emojis.");
      return { data: getRandomEmojis(count), error: null };
    }
    return { data: result.icons.slice(0, count), error: null };
  } catch (err: any) {
    console.warn("❌ [generateMemoryIcons] AI failed, falling back to emojis:", err);
    // If it's a quota error or any other failure, we provide the fallback
    return { data: getRandomEmojis(count), error: null };
  }
};

// 💡 Jeopardy
export const generateJeopardyCategory = async (
  topic: string,
  difficulty: string,
  language: "en" | "es" = "en"
): Promise<ServiceResponse<{ name: string; questions: Omit<JeopardyQuestion, "id">[] }>> => {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const prompt =
    language === "es"
      ? `Genera una categoría de Jeopardy sobre "${topic}". Devuelve solo JSON.`
      : `Generate a Jeopardy category about "${topic}". Return JSON only.`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const result = safeJson<any>(text);
    if (!result || !result.name || !Array.isArray(result.questions)) {
      return { data: null, error: "Invalid Jeopardy data structure from AI." };
    }
    return { data: result, error: null };
  } catch (err) {
    console.error("❌ [generateJeopardyCategory] Failed:", err);
    return { data: null, error: "Failed to generate Jeopardy category." };
  }
};

// 🔤 Hangman
export async function generateHangmanPhrases(
  theme: string,
  difficulty: string = "Medium",
  count: number = 5,
  language: "en" | "es" = "en"
): Promise<ServiceResponse<string>> {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const prompt =
    language === "es"
      ? `Genera ${count} frases para AHORCADO. Tema: "${theme}". Dificultad: ${difficulty}. Formato: lista simple, una frase por línea. Sin comillas ni Markdown.`
      : `Generate ${count} phrases for HANGMAN. Theme: "${theme}". Difficulty: ${difficulty}. Format: plain list, one phrase per line. No quotes or Markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const cleaned = responseText.replace(/[*#`\-]/g, "").replace(/\d+\./g, "").replace(/\n{2,}/g, "\n").trim();
    return { data: cleaned, error: null };
  } catch (error) {
    console.error("❌ [Gemini] Hangman phrase generation failed:", error);
    return { data: null, error: "Failed to generate hangman phrases from Gemini." };
  }
}

// 📘 Definitions
export async function generateDefinitionsBulk(
  theme: string,
  count: number,
  language: "en" | "es" = "en"
): Promise<ServiceResponse<any>> {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const topic = theme.trim() || "random";
  const prompt =
    language === "es"
      ? `Genera una lista JSON de ${count} pares palabra-definición sobre "${topic}". 
      Cada objeto debe tener exactamente este formato: {"word": "palabra", "definition": "descripción corta"}.`
      : `Generate a JSON list of ${count} word-definition pairs about "${topic}". 
      Each object must follow this exact format: {"word": "word", "definition": "short description"}.`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const data = safeJson<any[]>(text);
    if (!data || !Array.isArray(data)) {
      return { data: null, error: "Could not parse definitions from AI." };
    }

    // ✅ Normalization: handle potential field name variations from AI
    const normalized = data.map((item) => ({
      id: uuid(),
      word: String(item.word || item.term || item.palabra || ""),
      definition: String(item.definition || item.meaning || item.definicion || ""),
    }));

    return { data: normalized, error: null };
  } catch (err) {
    console.error("❌ [generateDefinitionsBulk] Failed:", err);
    return { data: null, error: "Failed to generate definitions." };
  }
}

// 🔺 Pyramid
export async function generatePyramidQuestions(
  topic: string,
  difficulty = "Medium",
  language: "en" | "es" = "en"
): Promise<ServiceResponse<PyramidQuestion[]>> {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const prompt =
    language === "es"
      ? `Genera un JSON con 10 preguntas para un juego de "Pyramid" (pirámide de trivia). 
      Tema: "${topic}". Dificultad: ${difficulty}.
      Cada objeto de la lista debe tener EXACTAMENTE este formato:
      {
        "level": número (1-10),
        "value": número (puntos),
        "question": "texto de la pregunta",
        "options": { "a": "opción 1", "b": "opción 2", "c": "opción 3" },
        "correct": "a", "b" o "c"
      }`
      : `Generate a JSON array of 10 questions for a "Pyramid" trivia game.
      Topic: "${topic}". Difficulty: ${difficulty}.
      Each object MUST follow this EXACT schema:
      {
        "level": number (1-10),
        "value": number (points),
        "question": "question text",
        "options": { "a": "option 1", "b": "option 2", "c": "option 3" },
        "correct": "a", "b" or "c"
      }`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const parsed = safeJson<any[]>(text);
    if (!Array.isArray(parsed)) {
      return { data: null, error: "Invalid Pyramid output from AI." };
    }

    // ✅ Normalización y Validación
    const validated: PyramidQuestion[] = parsed.map((q, idx) => ({
      id: crypto.randomUUID(),
      level: Number(q.level) || idx + 1,
      value: Number(q.value) || 100 * (idx + 1),
      question: String(q.question || ""),
      options: {
        a: String(q.options?.a || ""),
        b: String(q.options?.b || ""),
        c: String(q.options?.c || ""),
      },
      correct: (["a", "b", "c"].includes(q.correct) ? q.correct : "a") as "a" | "b" | "c",
    }));

    return { data: validated, error: null };
  } catch (err) {
    console.error("❌ [generatePyramidQuestions] Failed:", err);
    return { data: null, error: "Failed to generate Pyramid questions." };
  }
}

// 💰 Price Is Right
export async function generatePriceIsRightItems(
  theme: string,
  count = 5,
  language: "en" | "es" = "en"
): Promise<ServiceResponse<PriceItem[]>> {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const prompt =
    language === "es"
      ? `Genera ${count} artículos JSON para "El Precio es Correcto" sobre "${theme}".
      Responde con este formato exacto:
      [
        {"name": "nombre", "description": "descripción", "actualPrice": número},
        ...
      ]`
      : `Generate ${count} JSON items for "The Price Is Right" about "${theme}".
      Return this exact format:
      [
        {"name": "name", "description": "description", "actualPrice": number},
        ...
      ]`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const parsed = safeJson<any[]>(text);

    if (!Array.isArray(parsed)) {
      return { data: null, error: "Invalid Price Is Right output from AI." };
    }

    const items: PriceItem[] = parsed.map((i, idx) => ({
      id: uuid(),
      name: String(i.name || `Item ${idx + 1}`),
      description: String(i.description || "No description provided."),
      imageUrl: (i.imageUrl && i.imageUrl.startsWith('http')) ? i.imageUrl : `https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(i.name || 'Price+Is+Right')}`,
      actualPrice: typeof i.actualPrice === "number" ? i.actualPrice : parseFloat(i.actualPrice) || Math.floor(Math.random() * 500 + 10),
    }));

    return { data: items, error: null };
  } catch (err) {
    console.error("❌ Error generating Price Is Right items:", err);
    return { data: null, error: "Failed to generate Price Is Right items." };
  }
}

// ✨ Refine Descriptions
export async function refineDescriptionsAI(
  items: { id: string; name: string; description: string }[],
  language: "en" | "es" = "en"
): Promise<ServiceResponse<{ id: string; description: string }[]>> {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const prompt = `Rewrite these item descriptions in a fun, game-show tone. Return ONLY JSON: { "items": [ { "id": "...", "description": "..." } ] }. Items: ${JSON.stringify(items)}`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const parsed = safeJson<{ items: { id: string; description: string }[] }>(text);

    if (!parsed?.items || !Array.isArray(parsed.items)) {
      return { data: null, error: "Invalid AI refine response." };
    }
    return { data: parsed.items, error: null };
  } catch (err) {
    console.error("❌ [refineDescriptionsAI] Failed:", err);
    return { data: null, error: "Failed to refine descriptions." };
  }
}

// 🎡 Wheel Of Fortune
export async function generateWheelOfFortuneRounds(
  category: string,
  count: number = 5,
  language: string = "en"
): Promise<ServiceResponse<{ category: string; puzzle: string; prizeValue: number }[]>> {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const prompt =
    language === "es"
      ? `Genera ${count} acertijos para "Wheel of Fortune" (Rueda de la Fortuna). Categoría: "${category}". 
      Responde con un arreglo JSON de objetos con "category", "puzzle" (frase o palabra común) y "prizeValue" (número).`
      : `Generate ${count} Wheel of Fortune puzzles. Category: "${category}". 
      Return a JSON array of objects with "category", "puzzle" (common phrase or word), and "prizeValue" (number).`;

  try {
    const result = await model.generateContent(prompt);
    const text = await extractText(result);
    const data = safeJson<any[]>(text);

    if (!Array.isArray(data)) {
      return { data: null, error: "Invalid JSON structure from AI." };
    }

    const rounds = data.map((r: any) => ({
      category: r.category || category,
      puzzle: (r.puzzle || "").toUpperCase(),
      prizeValue: typeof r.prizeValue === "number" ? r.prizeValue : Math.floor(Math.random() * 900) + 100,
    }));
    return { data: rounds, error: null };
  } catch (err) {
    console.error("❌ Error parsing AI output for Wheel of Fortune:", err);
    return { data: null, error: "Failed to generate Wheel of Fortune puzzles." };
  }
}

// 🎟️ Lottery
export async function generateLotteryData(
  topic: string = "general",
  mode: "TRADITIONAL" | "CONCEPTUAL" = "TRADITIONAL",
  language: "en" | "es" = "en"
): Promise<ServiceResponse<{ draws: (string | number)[]; tickets: (string | number)[][] }>> {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const prompt =
    language === "es"
      ? `Genera datos JSON para un sorteo de LOTERÍA. Tema: "${topic}". Modo: ${mode}.
      Responde con este formato exacto:
      {
        "draws": [número, número, número, número, número],
        "tickets": [[n,n,n,n,n], [n,n,n,n,n], ...] (genera 10 boletos)
      }`
      : `Generate JSON data for a LOTTERY draw. Topic: "${topic}". Mode: ${mode}.
      Return this exact format:
      {
        "draws": [number, number, number, number, number],
        "tickets": [[n,n,n,n,n], [n,n,n,n,n], ...] (generate 10 tickets)
      }`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const parsed = safeJson<{ draws: any[]; tickets: any[][] }>(text);

    if (!parsed?.draws || !parsed?.tickets) {
      return { data: null, error: "Invalid Gemini output format for Lottery." };
    }
    return { data: parsed, error: null };
  } catch (err) {
    console.error("❌ [generateLotteryData] Failed:", err);
    return { data: null, error: "Failed to generate lottery data." };
  }
}

// 🧩 Bingo
export async function generateBingoData(
  topic: string = "general knowledge",
  mode: "CLASSIC" | "90BALL" | "CONCEPTUAL" = "CLASSIC",
  language: "en" | "es" = "en"
): Promise<ServiceResponse<{ cards: (string | number)[][][] }>> {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const prompt =
    language === "es"
      ? `Genera datos JSON para BINGO (5x5). Tema: "${topic}". Modo: ${mode}.
      Responde con este formato exacto:
      {
        "cards": [ [[n,n,n,n,n],...], [[n,n,n,n,n],...], [[n,n,n,n,n],...] ] (3 cartones 5x5)
      }`
      : `Generate JSON data for BINGO (5x5). Topic: "${topic}". Mode: ${mode}.
      Return this exact format:
      {
        "cards": [ [[n,n,n,n,n],...], [[n,n,n,n,n],...], [[n,n,n,n,n],...] ] (3 5x5 cards)
      }`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const parsed = safeJson<{ cards: any[][][] }>(text);

    if (!parsed?.cards || !Array.isArray(parsed.cards)) {
      return { data: null, error: "Invalid Bingo data format from Gemini." };
    }

    const cards = parsed.cards.map(card =>
      card.map(row =>
        row.map(val => {
          if (typeof val === 'string' && val.toLowerCase() === 'free') return 0;
          if (mode !== 'CONCEPTUAL') {
            const n = parseInt(val as any, 10);
            return Number.isNaN(n) ? 0 : n;
          }
          return String(val);
        })
      )
    );

    return { data: { cards }, error: null };
  } catch (err) {
    console.error("❌ [generateBingoData] Failed:", err);
    return { data: null, error: "Failed to generate Bingo cards." };
  }
}


// 🔤 Rosco / Rondo
export async function generateRoscoBulk(
  topic: string = "cultura general",
  language: "en" | "es" = "es"
): Promise<ServiceResponse<string>> {
  const modelError = await checkModel();
  if (modelError) return { data: null, error: modelError };

  const theme = topic.trim() || "cultura general";
  const prompt = `Create a Spanish-style ROSCO quiz. Theme: "${theme}". For each letter A-Z, provide one line in "LETTER; ANSWER; Definition" format. Plain text only.`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    if (!text) {
      return { data: null, error: "AI returned an empty response for Rosco." };
    }
    return { data: text, error: null };
  } catch (err) {
    console.error("❌ [generateRoscoBulk] Failed:", err);
    return { data: null, error: "Failed to generate Rosco clues with Gemini." };
  }
}
