import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ChainQuestion,
  JeopardyQuestion,
  JeopardyPointValue,
  FamilyFeudRound,
  ChainRound,
  PyramidQuestion,
} from "@/types";
import { JEOPARDY_POINT_VALUES } from "@/types";
import { v4 as uuid } from "uuid";

// 🔑 API Key
const apiKey = "AIzaSyA467JQH72xz6LwPsSWgjHcbGRvAQuvnnY";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// =====================================================
// Helpers
// =====================================================

// ✅ Extract plain text from Gemini result
async function extractText(res: any): Promise<string> {
  try {
    return (await res.response.text())?.trim() || "";
  } catch {
    console.warn("⚠️ [extractText] Could not extract text");
    return "";
  }
}

// ✅ Safe JSON Parsing Helper
function safeJson<T = any>(text: string): T | null {
  try {
    const cleaned = text
      .trim()
      .replace(/^[`]+json/i, "")
      .replace(/[`]+$/g, "")
      .replace(/```/g, "")
      .replace(/,\s*([\]}])/g, "$1");
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("❌ [safeJson] Failed to parse JSON:", err, "\nRaw text:\n", text);
    return null;
  }
}

// ✅ Translation helper (ES fallback)
async function translateToSpanish(texts: string[]): Promise<string[]> {
  const prompt = `
Traduce al español estos textos manteniendo el significado y el estilo.
Devuelve SOLO JSON: { "items": ["...", "...", "..."] }

Textos:
${JSON.stringify(texts)}
`;

  const res = await model.generateContent(prompt);
  const text = await extractText(res);
  const parsed = safeJson(text);
  if (!parsed?.items || !Array.isArray(parsed.items)) throw new Error("Translation failed.");
  return parsed.items.map((s: any) => String(s));
}

// =====================================================
// Generators
// =====================================================

// 🧩 Chain Reaction
export async function generateChainReactionRound(
  theme: string,
  linkCount = 6,
  language: "en" | "es" = "en"
): Promise<Omit<ChainRound, "id">> {
  const prompt =
    language === "es"
      ? `
Crea una ronda de "Chain Reaction Trivia" sobre "${theme}" con ${linkCount} eslabones.
Devuelve SOLO JSON:
{
  "theme": "string",
  "timePerQuestion": number,
  "chain": [
    { "prompt": "string", "answer": "string", "linkHint": "string", "points": number }
  ]
}`
      : `
Create a "Chain Reaction Trivia" round about "${theme}" with ${linkCount} links.
Return ONLY valid JSON:
{
  "theme": "string",
  "timePerQuestion": number,
  "chain": [
    { "prompt": "string", "answer": "string", "linkHint": "string", "points": number }
  ]
}`;

  const res = await model.generateContent(prompt);
  const text = await extractText(res);
  const parsed = safeJson(text);

  if (!parsed?.chain || !Array.isArray(parsed.chain)) throw new Error("Invalid chain data.");

  const chain = parsed.chain.map((c: any, idx: number) => ({
    id: uuid(),
    prompt: String(c.prompt ?? `Link ${idx + 1}`),
    answer: String(c.answer ?? "").trim(),
    linkHint: c.linkHint ? String(c.linkHint) : idx === 0 ? "" : "Related to previous",
    points: Number.isFinite(c.points) ? c.points : 100 + idx * 20,
  }));

  return {
    theme: parsed.theme || theme,
    timePerQuestion: Number.isFinite(parsed.timePerQuestion)
      ? parsed.timePerQuestion
      : 20,
    chain,
  };
}

// 👪 Family Feud
export const generateFamilyFeudRound = async (
  topic: string,
  language: "en" | "es" = "en"
): Promise<Omit<FamilyFeudRound, "id">> => {
  const prompt =
    language === "es"
      ? `Genera una ronda de "Cien Mexicanos Dijeron" sobre "${topic}".`
      : `Generate a Family Feud round about "${topic}".`;

  const res = await model.generateContent(prompt);
  const text = await extractText(res);
  const parsed = safeJson(text);
  if (!parsed?.answers || !Array.isArray(parsed.answers))
    throw new Error("Invalid Family Feud format.");
  return parsed;
};

// 🎮 Memory
export const generateMemoryIcons = async (
  theme: string,
  count: number,
  language: "en" | "es" = "en"
): Promise<string[]> => {
  const prompt =
    language === "es"
      ? `Genera ${count} emojis únicos sobre "${theme}". Devuelve JSON: { "icons": ["⚽","🏀"] }`
      : `Generate ${count} unique emojis about "${theme}". Return JSON: { "icons": ["⚽","🏀"] }`;

  const res = await model.generateContent(prompt);
  const text = await extractText(res);
  const result = safeJson(text);
  if (!result?.icons || !Array.isArray(result.icons))
    throw new Error("Invalid Memory icons format.");
  return result.icons.slice(0, count);
};

// 💡 Jeopardy
export const generateJeopardyCategory = async (
  topic: string,
  difficulty: string,
  language: "en" | "es" = "en"
): Promise<{ name: string; questions: Omit<JeopardyQuestion, "id">[] }> => {
  const prompt =
    language === "es"
      ? `Genera una categoría de Jeopardy sobre "${topic}".`
      : `Generate a Jeopardy category about "${topic}".`;

  const res = await model.generateContent(prompt);
  const text = await extractText(res);
  const result = safeJson(text);
  return result;
};

export async function generateHangmanPhrases(
  theme: string,
  difficulty: string = "Medium",
  count: number = 5,
  language: "en" | "es" = "en"
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // 🎨 Build contextual prompt
    const prompt =
      language === "es"
        ? `
        Genera ${count} frases para un juego de AHORCADO.
        Tema: "${theme}".
        Nivel de dificultad: ${difficulty}.
        Formato: una lista simple (una frase por línea, sin numerar).
        No uses comillas ni formato Markdown.
        Ejemplo:
        LUPITA NYONGO
        CHOCOLATE AFRICANO
        LAS PIRÁMIDES DE EGIPTO
        `
        : `
        Generate ${count} phrases for a HANGMAN game.
        Theme: "${theme}".
        Difficulty: ${difficulty}.
        Format: plain list (one phrase per line, no quotes or Markdown).
        Example:
        LUPITA NYONGO
        AFRICAN CHOCOLATE
        THE PYRAMIDS OF EGYPT
        `;

    // 🚀 Call Gemini
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // ✅ Clean Markdown & formatting noise
    const cleaned = responseText
      .replace(/[*#`\-]/g, "")
      .replace(/\d+\./g, "") // remove numbered lists
      .replace(/\n{2,}/g, "\n") // compress newlines
      .trim();

    // ✅ Return raw string (to be parsed later)
    return cleaned;
  } catch (error) {
    console.error("❌ [Gemini] Hangman phrase generation failed:", error);
    throw new Error("Failed to generate hangman phrases from Gemini.");
  }
}


// 📘 Definitions
export async function generateDefinitionsBulk(
  theme: string,
  count: number,
  language: "en" | "es" = "en"
) {
  const topic = theme.trim() || "random";
  const prompt =
    language === "es"
      ? `Genera ${count} pares palabra-definición sobre "${topic}".`
      : `Generate ${count} word-definition pairs about "${topic}".`;

  const res = await model.generateContent(prompt);
  const text = await extractText(res);
  return safeJson(text);
}

// 🔺 Pyramid
const PYRAMID_VALUES = [100, 200, 300, 500, 750, 1000, 2000, 3000, 5000, 10000];
export async function generatePyramidQuestions(
  topic: string,
  difficulty = "Medium",
  language: "en" | "es" = "en"
): Promise<PyramidQuestion[]> {
  const prompt =
    language === "es"
      ? `Genera 10 preguntas para "Pyramid" sobre "${topic}".`
      : `Generate 10 questions for "Pyramid" about "${topic}".`;

  const res = await model.generateContent(prompt);
  const text = await extractText(res);
  const parsed = safeJson(text);
  if (!Array.isArray(parsed)) throw new Error("Invalid Pyramid output.");
  return parsed;
}

// 💰 Price Is Right — AI Generator (bilingual + robust image handling)
export async function generatePriceIsRightItems(
  theme: string,
  count = 5,
  language: "en" | "es" = "en"
) {
  const topic = theme?.trim() || "productos variados";

  const prompt =
    language === "es"
      ? `
Genera ${count} productos o artículos realistas relacionados con "${topic}" para el juego "El Precio Justo".
Devuelve SOLO un JSON válido:
[
  {
    "name": "string (nombre del producto)",
    "description": "string (breve descripción, menos de 20 palabras)",
    "imageUrl": "string (URL ilustrativa o de dominio público)",
    "actualPrice": number (precio estimado en USD, sin símbolo $)
  }
]

Reglas:
- Los precios deben ser realistas (entre 5 y 10,000 dólares).
- Usa productos reconocibles o genéricos (electrodomésticos, herramientas, muebles, etc.).
- Si no conoces una URL, usa "https://example.com/item.jpg".
- NO incluyas texto fuera del JSON.
`
      : `
Generate ${count} realistic consumer products related to "${topic}" for "The Price Is Right".
Return ONLY valid JSON array:
[
  {
    "name": "string (product name)",
    "description": "string (short, <20 words)",
    "imageUrl": "string (example or public domain image URL)",
    "actualPrice": number (estimated USD price, no $ sign)
  }
]

Rules:
- Prices must be realistic (between $5 and $10,000).
- Include recognizable everyday items (electronics, furniture, tools, etc.).
- If no real image is known, use "https://example.com/item.jpg".
- Output JSON only — no explanations or text.
`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const parsed = safeJson(text);
    if (!Array.isArray(parsed)) throw new Error("Invalid Price Is Right output.");

    // ✅ Predefined working Unsplash placeholders
    const placeholderImages = [
      "https://images.unsplash.com/photo-1581291519195-ef11498d1cf5",
      "https://images.unsplash.com/photo-1512499617640-c2f9990983e3",
      "https://images.unsplash.com/photo-1503602642458-232111445657",
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
      "https://images.unsplash.com/photo-1567016543924-7f63ebdb5432",
    ];

    // ✅ Validate or repair image URLs
    function validateImageUrl(url?: string): string {
      if (!url || !url.startsWith("http")) {
        return `https://source.unsplash.com/600x400/?${encodeURIComponent(topic)}`;
      }
      // Many Gemini Unsplash URLs are invalid — detect & replace
      if (url.includes("unsplash.com/photo-")) {
        return placeholderImages[Math.floor(Math.random() * placeholderImages.length)];
      }
      return url;
    }

    // ✅ Normalize items
    let items = parsed.map((i, idx) => ({
      id: uuid(),
      name: String(i.name || `Item ${idx + 1}`),
      description: String(i.description || "Sin descripción."),
      imageUrl:
        validateImageUrl(i.imageUrl) ||
        `https://source.unsplash.com/600x400/?${encodeURIComponent(topic)}`,
      actualPrice:
        typeof i.actualPrice === "number"
          ? i.actualPrice
          : parseFloat(i.actualPrice) || Math.floor(Math.random() * 500 + 10),
    }));

    // 🌐 Auto-translate English → Spanish if Gemini slipped into English
    if (language === "es") {
      const englishWords = items
        .map((i) => `${i.name} ${i.description}`)
        .join(" ")
        .match(
          /\b(the|with|of|in|for|and|smart|blender|car|furniture|laptop|tv|toaster|speaker|coffee)\b/i
        );

      if (englishWords) {
        console.log("🌍 Detected English content — translating to Spanish...");
        const toTranslate = items.flatMap((i) => [i.name, i.description]);
        const translated = await translateToSpanish(toTranslate);
        let index = 0;
        items = items.map((i) => ({
          ...i,
          name: translated[index++] ?? i.name,
          description: translated[index++] ?? i.description,
        }));
      }
    }

    return items;
  } catch (err) {
    console.error("❌ Error generating Price Is Right items:", err);
    throw new Error("Failed to generate Price Is Right items.");
  }
}

export async function refineDescriptionsAI(
  items: { id: string; name: string; description: string }[],
  language: "en" | "es" = "en"
) {
  const prompt =
    language === "es"
      ? `Reescribe las siguientes descripciones con un tono alegre y de programa de concursos.
Devuelve SOLO JSON: { "items": [ { "id": "string", "description": "string" } ] }

Ejemplo:
- Original: "Licuadora de cocina básica"
- Mejorado: "¡Una potente licuadora lista para batir tus mejores smoothies y ganar premios!" 

Elementos:
${JSON.stringify(items)}`
      : `Rewrite the following item descriptions in a fun, game-show tone for "The Price Is Right."
Return ONLY JSON: { "items": [ { "id": "string", "description": "string" } ] }

Example:
- Original: "Basic kitchen blender"
- Improved: "A powerful blender ready to whip up your winning smoothies and spin the prize wheel!"

Items:
${JSON.stringify(items)}`;

  const res = await model.generateContent(prompt);
  const text = await extractText(res);
  const parsed = safeJson(text);
  if (!parsed?.items || !Array.isArray(parsed.items))
    throw new Error("Invalid AI refine response.");
  return parsed.items;
}

export async function generateWheelOfFortuneRounds(
  category: string,
  count: number = 5,
  language: string = "en"
): Promise<
  { category: string; puzzle: string; prizeValue: number }[]
> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
You are a Wheel of Fortune round generator. 
Respond ONLY with a valid JSON array, nothing else.
Each object must follow this exact schema:
[
  {
    "category": "string",
    "puzzle": "string",
    "prizeValue": number
  }
]

Generate ${count} creative puzzles in the category "${category}".
Do not include markdown, explanations, or extra text.
Make sure the puzzles are all-uppercase and suitable for a TV game show.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // --- Robust JSON extraction ---
    const jsonMatch = text.match(/\[([\s\S]*)\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;

    const data = JSON.parse(jsonString);
    if (!Array.isArray(data)) throw new Error("Invalid JSON structure");

    return data.map((r) => ({
      category: r.category || category,
      puzzle: (r.puzzle || "").toUpperCase(),
      prizeValue:
        typeof r.prizeValue === "number"
          ? r.prizeValue
          : Math.floor(Math.random() * 900) + 100,
    }));
  } catch (err) {
    console.error("❌ Error parsing AI output:", err);
    return [
      {
        category: category,
        puzzle: "DEFAULT PUZZLE",
        prizeValue: 500,
      },
    ];
  }
}


// 🎟️ Lottery (fixed — now uses Gemini directly)
export async function generateLotteryData(
  topic: string = "general",
  mode: "TRADITIONAL" | "CONCEPTUAL" = "TRADITIONAL",
  language: "en" | "es" = "en"
): Promise<{ draws: (string | number)[]; tickets: (string | number)[][] }> {
  const prompt =
    mode === "TRADITIONAL"
      ? language === "es"
        ? `Genera una lotería tradicional con 10 boletos.
Cada boleto tiene 5 números únicos entre 1 y 50.
Devuelve SOLO JSON válido: { "draws": [1,2,3,4,5], "tickets": [[...],[...]] }`
        : `Generate a traditional lottery with 10 tickets.
Each ticket has 5 unique numbers between 1 and 50.
Return ONLY JSON: { "draws": [1,2,3,4,5], "tickets": [[...],[...]] }`
      : language === "es"
      ? `Genera una lotería conceptual sobre el tema "${topic}".
Cada boleto tiene 5 palabras o conceptos únicos relacionados con el tema.
Devuelve SOLO JSON válido: { "draws": ["..."], "tickets": [["..."],["..."]] }`
      : `Generate a concept-based lottery about "${topic}".
Each ticket has 5 unique words or phrases related to that theme.
Return ONLY JSON: { "draws": ["..."], "tickets": [["..."],["..."]] }`;

  try {
    // ✅ Direct Gemini API call (no fetch)
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const parsed = safeJson<{ draws: any[]; tickets: any[][] }>(text);

    if (!parsed?.draws || !parsed?.tickets)
      throw new Error("Invalid Gemini output format");

    return parsed;
  } catch (err) {
    console.error("❌ [generateLotteryData] Failed:", err);
    throw new Error("Failed to generate lottery data.");
  }
}

// 🧩 Bingo (AI-based generator)
export async function generateBingoData(
  topic: string = "general knowledge",
  mode: "CLASSIC" | "90BALL" | "CONCEPTUAL" = "CLASSIC",
  language: "en" | "es" = "en"
): Promise<{ cards: number[][][] }> {
  const prompt =
    mode === "CLASSIC"
      ? language === "es"
        ? `
Genera 5 tarjetas de Bingo de 5x5 (modo clásico de 75 bolas).
Cada tarjeta debe ser un arreglo de 5 filas x 5 columnas con números únicos del 1 al 75.
El espacio central debe ser 0 (para representar "FREE").
Devuelve SOLO JSON válido: { "cards": [[[...],[...],[...],[...],[...]], ...] }
`
        : `
Generate 5 Bingo cards (classic 75-ball style).
Each card must be a 5x5 array with unique numbers from 1 to 75.
The center cell should be 0 to represent "FREE".
Return ONLY JSON: { "cards": [[[...],[...],[...],[...],[...]], ...] }
`
      : mode === "90BALL"
      ? language === "es"
        ? `
Genera 5 tarjetas de Bingo en formato británico (90 bolas).
Cada tarjeta tiene 3 filas y 9 columnas con números entre 1 y 90, con algunos espacios vacíos.
Devuelve SOLO JSON válido: { "cards": [[[...],[...],[...]], ...] }
`
        : `
Generate 5 Bingo cards in 90-ball UK format.
Each card has 3 rows and 9 columns with numbers between 1 and 90, some cells empty.
Return ONLY JSON: { "cards": [[[...],[...],[...]], ...] }
`
      : language === "es"
      ? `
Genera 5 tarjetas de Bingo conceptuales sobre el tema "${topic}".
Cada tarjeta debe ser una matriz 5x5 con palabras o conceptos únicos relacionados con el tema.
El centro debe ser "FREE".
Devuelve SOLO JSON válido: { "cards": [[[...],[...],[...],[...],[...]], ...] }
`
      : `
Generate 5 conceptual Bingo cards about the theme "${topic}".
Each card must be a 5x5 array with unique words or concepts related to that theme.
The center cell should be "FREE".
Return ONLY JSON: { "cards": [[[...],[...],[...],[...],[...]], ...] }
`;

  try {
    const res = await model.generateContent(prompt);
    const text = await extractText(res);
    const parsed = safeJson<{ cards: number[][][] | string[][][] }>(text);

    if (!parsed?.cards || !Array.isArray(parsed.cards))
      throw new Error("Invalid Bingo data format from Gemini");

    // ✅ Normalize structure
    return {
      cards: parsed.cards.map((card) =>
        card.map((row) =>
          row.map((val) => {
            if (typeof val === "string" && val.toLowerCase() === "free") return 0;
            const n = parseInt(val as any, 10);
            return Number.isNaN(n) ? 0 : n;
          })
        )
      ),
    };
  } catch (err) {
    console.error("❌ [generateBingoData] Failed:", err);
    throw new Error("Failed to generate Bingo cards.");
  }
}
