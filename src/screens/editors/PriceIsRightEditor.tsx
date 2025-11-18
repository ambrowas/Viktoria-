import React, { useState } from "react";
import { PriceIsRightGame } from "@/types";

// -------- Image fetching with robust fallbacks & caching --------
const UNSPLASH_ACCESS_KEY = "i5m0x3TFiqwLqXpcGHKbHF6BLZtPdHIF0TAvec1VYQA";
const FALLBACK_IMG =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/480px-No_image_available.svg.png";

const memCache: Record<string, string> = {};
const LS_KEY = "pir_image_cache_v1";

function loadCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveCache(cache: Record<string, string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache));
  } catch {}
}

/** Primary: Openverse (no auth required) */
async function fromOpenverse(keyword: string): Promise<string | null> {
  const url = `https://api.openverse.engineering/v1/images/?q=${encodeURIComponent(
    keyword
  )}&page_size=1&license_type=all&extension=jpg,png`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  const item = data?.results?.[0];
  return item?.thumbnail || item?.url || null;
}

/** Secondary: Unsplash (auth header + version) */
async function fromUnsplash(keyword: string): Promise<string | null> {
  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
      keyword
    )}&orientation=squarish`,
    {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        "Accept-Version": "v1",
        Accept: "application/json",
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.urls?.small || data?.urls?.regular || null;
}

/** Public API: get a usable image URL with caching + fallbacks */
async function fetchItemImage(keywordRaw: string): Promise<string> {
  const keyword = (keywordRaw || "product").trim();
  if (memCache[keyword]) return memCache[keyword];

  const disk = loadCache();
  if (disk[keyword]) {
    memCache[keyword] = disk[keyword];
    return disk[keyword];
  }

  let url: string | null = null;
  try {
    url = await fromOpenverse(keyword);
  } catch {}
  if (!url) {
    try {
      url = await fromUnsplash(keyword);
    } catch {}
  }
  if (!url) url = FALLBACK_IMG;

  memCache[keyword] = url;
  disk[keyword] = url;
  saveCache(disk);
  return url;
}

// =======================================================
// COMPONENT
// =======================================================
interface Props {
  game: PriceIsRightGame;
  setGame: (g: PriceIsRightGame) => void;
}

export default function PriceIsRightEditor({ game, setGame }: Props) {
  const [aiTopic, setAiTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const addItem = () => {
    const newItem = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      imageUrl: "",
      actualPrice: 0,
    };
    setGame({ ...game, items: [...(game.items || []), newItem] });
  };

  const updateItem = (id: string, field: string, value: any) => {
    setGame({
      ...game,
      items: game.items.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    });
  };

  const removeItem = (id: string) => {
    setGame({ ...game, items: game.items.filter((i) => i.id !== id) });
  };

  // === AI: Generate bulk items ===
  const generateBulkItems = async () => {
    if (!aiTopic.trim()) return alert("Enter a topic first!");
    setIsGenerating(true);
    try {
      const prompt = `
Generate between 1 and 10 items (default 5) for a Price Is Right style game about "${aiTopic}".
Return ONLY JSON: 
[
  { "name": "Smart TV", "description": "55-inch 4K OLED television", "actualPrice": 899 }
]
      `;
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyA467JQH72xz6LwPsSWgjHcbGRvAQuvnnY", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = JSON.parse(
        text
          .replace(/```json/i, "")
          .replace(/```/g, "")
          .trim()
      );
      const items = Array.isArray(parsed) ? parsed.slice(0, 10) : [];
      for (const item of items) {
        item.id = crypto.randomUUID();
        item.imageUrl = await fetchItemImage(item.name);
      }
      setGame({ ...game, items });
    } catch (e) {
      console.error("AI generation error:", e);
      alert("Failed to generate items.");
    } finally {
      setIsGenerating(false);
    }
  };

  // === AI: Generate image for single item ===
  const generateSingleImage = async (id: string, name: string) => {
    const url = await fetchItemImage(name);
    updateItem(id, "imageUrl", url);
  };

  return (
    <div className="bg-base-200 p-6 rounded-lg shadow-lg space-y-4">
      <h2 className="text-2xl font-bold">💵 The Price Is Right — Items</h2>
      <p className="text-gray-500 mb-4">
        Add products contestants will guess the prices for.
      </p>

      {/* === AI Controls === */}
      <div className="flex gap-3 items-center mb-4">
        <input
          type="text"
          value={aiTopic}
          onChange={(e) => setAiTopic(e.target.value)}
          placeholder="Enter topic (e.g., tech gadgets)"
          className="p-2 rounded bg-base-100 w-full"
        />
        <button
          onClick={generateBulkItems}
          disabled={isGenerating}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {isGenerating ? "Generating..." : "Generate Items"}
        </button>
      </div>

      {game.items.map((item) => (
        <div
          key={item.id}
          className="border border-gray-700 rounded-lg p-4 bg-base-300 mb-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItem(item.id, "name", e.target.value)}
              placeholder="Item name"
              className="p-2 rounded bg-base-100 w-full"
            />
            <input
              type="number"
              value={item.actualPrice}
              onChange={(e) =>
                updateItem(item.id, "actualPrice", parseFloat(e.target.value))
              }
              placeholder="Actual price ($)"
              className="p-2 rounded bg-base-100 w-full"
            />
          </div>

          <textarea
            value={item.description}
            onChange={(e) =>
              updateItem(item.id, "description", e.target.value)
            }
            placeholder="Description"
            className="p-2 rounded bg-base-100 w-full mt-2"
          />

          {/* === Image Preview === */}
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="mt-3 w-48 h-48 object-cover rounded-lg border"
              onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
            />
          ) : (
            <div className="mt-3 w-48 h-48 flex items-center justify-center bg-gray-200 border rounded-lg text-gray-500">
              No image
            </div>
          )}

          {/* === Controls === */}
          <div className="flex gap-4 mt-3">
            <button
              onClick={() => generateSingleImage(item.id, item.name)}
              className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
            >
              🎨 Refresh Image
            </button>
            <button
              onClick={() => removeItem(item.id)}
              className="text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addItem}
        className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
      >
        + Add Item
      </button>
    </div>
  );
}
