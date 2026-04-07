import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

let win: BrowserWindow | null = null;

dotenv.config();

// Gemini configuration
let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: any = null;
let geminiKeyInUse: string | null = null;

const getGeminiApiKey = (): string => {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_API_KEY || process.env.API_KEY;
  return key?.trim() || "";
};

const getGeminiModel = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Set GEMINI_API_KEY in your .env file.");
  }

  let modelName = process.env.GEMINI_MODEL || process.env.MODEL_NAME || "gemini-1.5-flash";
  if (!modelName.startsWith("models/")) {
    modelName = `models/${modelName}`;
  }

  if (!geminiModel || geminiKeyInUse !== apiKey) {
    geminiClient = new GoogleGenerativeAI(apiKey);
    geminiModel = geminiClient.getGenerativeModel({ model: modelName });
    geminiKeyInUse = apiKey;
    console.log(`[Gemini] Model initialized: ${modelName}`);
  }

  return geminiModel;
};

// Path to store user preferences (language, etc.)
const userPrefsPath = path.join(app.getPath("userData"), "preferences.json");

// Disable GPU to avoid EGL driver issues that can freeze the UI on some Macs/VMs
app.disableHardwareAcceleration();

function createWindow() {
  const isDev = process.env.NODE_ENV === "development" || !fs.existsSync(path.join(__dirname, "../dist/index.html"));
  const iconPath = isDev
    ? path.join(app.getAppPath(), "public", "icon.png")
    : path.join(__dirname, "..", "dist", "icon.png");

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

/* ----------------------------
   IPC HANDLERS (Main <-> Renderer)
----------------------------- */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

ipcMain.handle("gemini:generate-text", async (_event, payload: { prompt?: string }) => {
  const prompt = typeof payload?.prompt === "string" ? payload.prompt.trim() : "";
  if (!prompt) {
    throw new Error("Gemini prompt is required.");
  }

  const maxRetries = 3;
  let delay = 1000; // start with 1 second

  for (let i = 0; i < maxRetries; i++) {
    try {
      const model = getGeminiModel();
      const result = await model.generateContent(prompt);
      const text = await result.response.text();
      return text?.trim() || "";
    } catch (error: any) {
      // Check if it's a rate limit error (status 429)
      const isQuotaError = error?.status === 429 || error?.message?.includes("quota") || error?.message?.includes("429");

      if (isQuotaError && i < maxRetries - 1) {
        console.warn(`[Gemini] Rate limited/Quota exceeded. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
        await sleep(delay);
        delay *= 2; // Exponential backoff
      } else {
        console.error("Gemini generate-text failed:", error);
        if (isQuotaError) {
          throw new Error("GEMINI_QUOTA_EXCEEDED: You have exceeded your current quota. Please wait a minute or check your billing details.");
        }
        // Re-throw the error to be caught by the renderer
        throw error instanceof Error ? error : new Error("An unknown error occurred during Gemini request.");
      }
    }
  }
  // This part should ideally not be reached, but as a fallback:
  throw new Error("Gemini request failed after multiple retries.");
});

ipcMain.handle("copy-media-file", async (_event, sourcePath: string) => {
  if (!sourcePath) {
    console.error("No source path provided for media copy.");
    return null;
  }

  try {
    // Define the destination for our uploads
    const isDev = process.env.NODE_ENV === "development";
    // In dev, we write to the public folder directly so Vite picks it up.
    // In prod, assets are in `dist`, which is a sibling to `dist-electron`.
    const targetDir = isDev
      ? path.join(app.getAppPath(), "public", "images", "uploads")
      : path.join(__dirname, "..", "dist", "images", "uploads");

    // Ensure the target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`Created directory: ${targetDir}`);
    }

    // Create a unique filename to prevent overwrites
    const uniqueName = `${crypto.randomUUID()}${path.extname(sourcePath)}`;
    const destPath = path.join(targetDir, uniqueName);

    // Copy the file
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied media from ${sourcePath} to ${destPath}`);

    // Return the relative path for the renderer to use in `src` attributes
    const relativePath = `images/uploads/${uniqueName}`;
    return relativePath;
  } catch (error) {
    console.error("Error copying media file:", error);
    return null;
  }
});

ipcMain.handle("save-data-url", async (_event, dataUrl: string) => {
  if (!dataUrl?.startsWith("data:")) {
    console.error("save-data-url invoked without a data URI");
    return null;
  }

  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      console.error("Invalid data URI format");
      return null;
    }

    const [, mimeType, base64Data] = match;
    const buffer = Buffer.from(base64Data, "base64");

    const extensionMap: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "audio/mpeg": ".mp3",
      "audio/mp3": ".mp3",
      "audio/wav": ".wav",
      "audio/ogg": ".ogg",
      "video/mp4": ".mp4",
      "video/webm": ".webm",
      "video/quicktime": ".mov",
    };

    const ext = extensionMap[mimeType] || "";
    const isDev = process.env.NODE_ENV === "development";
    const targetDir = isDev
      ? path.join(app.getAppPath(), "public", "images", "uploads")
      : path.join(__dirname, "..", "dist", "images", "uploads");

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`Created directory: ${targetDir}`);
    }

    const uniqueName = `${crypto.randomUUID()}${ext}`;
    const destPath = path.join(targetDir, uniqueName);

    fs.writeFileSync(destPath, buffer);
    console.log(`Saved data URI to ${destPath}`);

    return `images/uploads/${uniqueName}`;
  } catch (error) {
    console.error("Error saving data URI:", error);
    return null;
  }
});

const slugToDir = (slug: string) =>
  path.join(app.getPath("userData"), "games", slug || "game");

const listLocalGames = () => {
  const gamesDir = path.join(app.getPath("userData"), "games");
  if (!fs.existsSync(gamesDir)) return [];
  const entries = fs.readdirSync(gamesDir, { withFileTypes: true });
  const games: any[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const gamePath = path.join(gamesDir, entry.name, "game.json");
    if (!fs.existsSync(gamePath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(gamePath, "utf8"));
      games.push({ ...data, slug: entry.name });
    } catch (err) {
      console.warn("Failed to read game.json for", entry.name, err);
    }
  }
  return games;
};

ipcMain.handle(
  "save-game-media",
  async (_event, payload: { slug: string; dataUrl: string }) => {
    const { slug, dataUrl } = payload || {};
    if (!dataUrl?.startsWith("data:")) {
      console.error("save-game-media invoked without a data URI");
      return null;
    }
    const baseDir = path.join(slugToDir(slug), "media");

    try {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        console.error("Invalid data URI format");
        return null;
      }

      const [, mimeType, base64Data] = match;
      const buffer = Buffer.from(base64Data, "base64");

      const extensionMap: Record<string, string> = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/wav": ".wav",
        "audio/ogg": ".ogg",
        "video/mp4": ".mp4",
        "video/webm": ".webm",
        "video/quicktime": ".mov",
      };

      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      const ext = extensionMap[mimeType] || "";
      const uniqueName = `${crypto.randomUUID()}${ext}`;
      const destPath = path.join(baseDir, uniqueName);

      fs.writeFileSync(destPath, buffer);
      console.log(`Saved game media to ${destPath}`);

      return destPath;
    } catch (error) {
      console.error("Error saving game media:", error);
      return null;
    }
  }
);

ipcMain.handle(
  "save-game-local",
  async (_event, payload: { slug: string; game: any }) => {
    const { slug, game } = payload || {};
    if (!slug || !game) {
      console.error("save-game-local requires slug and game payload");
      return false;
    }

    try {
      const dir = slugToDir(slug);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const filePath = path.join(dir, "game.json");
      fs.writeFileSync(filePath, JSON.stringify(game, null, 2), "utf8");
      console.log(`Saved game data to ${filePath}`);
      return true;
    } catch (error) {
      console.error("Error saving game locally:", error);
      return false;
    }
  }
);

ipcMain.handle("list-games-local", async () => {
  try {
    return listLocalGames();
  } catch (error) {
    console.error("Error listing local games:", error);
    return [];
  }
});

ipcMain.handle(
  "delete-game-local",
  async (_event, payload: { slug?: string; id?: string }) => {
    try {
      const gamesDir = path.join(app.getPath("userData"), "games");
      if (!fs.existsSync(gamesDir)) return true;

      let targetDir: string | null = null;
      if (payload?.slug) {
        targetDir = path.join(gamesDir, payload.slug);
      } else if (payload?.id) {
        for (const entry of fs.readdirSync(gamesDir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const gamePath = path.join(gamesDir, entry.name, "game.json");
          if (!fs.existsSync(gamePath)) continue;
          try {
            const data = JSON.parse(fs.readFileSync(gamePath, "utf8"));
            if (data.id === payload.id) {
              targetDir = path.join(gamesDir, entry.name);
              break;
            }
          } catch {
            // ignore
          }
        }
      }

      if (targetDir && fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        console.log(`Deleted local game at ${targetDir}`);
      }
      return true;
    } catch (error) {
      console.error("Error deleting local game:", error);
      return false;
    }
  }
);
// Simple ping example
ipcMain.handle("ping", async () => {
  console.log("Ping received from renderer");
  return "pong from main 🚀";
});

// Language preference handlers
ipcMain.handle("get-language", async () => {
  try {
    if (fs.existsSync(userPrefsPath)) {
      const data = JSON.parse(fs.readFileSync(userPrefsPath, "utf8"));
      return data.language || "en";
    }
    return "en";
  } catch (error) {
    console.error("Error reading preferences:", error);
    return "en";
  }
});

ipcMain.handle("set-language", async (_event, lang: string) => {
  try {
    const prefs = fs.existsSync(userPrefsPath)
      ? JSON.parse(fs.readFileSync(userPrefsPath, "utf8"))
      : {};
    prefs.language = lang;
    fs.writeFileSync(userPrefsPath, JSON.stringify(prefs, null, 2));
    console.log("✅ Language preference saved:", lang);
    return true;
  } catch (error) {
    console.error("Error saving language preference:", error);
    return false;
  }
});

// Generic message handler
ipcMain.on("message", (event, data) => {
  console.log("📩 Received message from renderer:", data);
  event.sender.send("message", { reply: "Hello from main process 👋" });
});

/* ----------------------------
   APP LIFECYCLE
----------------------------- */

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ✅ Log static assets path
app.on("ready", () => {
  console.log("Static sounds path:", path.resolve(__dirname, "../dist/sounds"));
});
