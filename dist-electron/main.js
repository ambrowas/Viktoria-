"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const generative_ai_1 = require("@google/generative-ai");
let win = null;
dotenv_1.default.config();
// Gemini configuration
let geminiClient = null;
let geminiModel = null;
let geminiKeyInUse = null;
const getGeminiApiKey = () => {
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
        geminiClient = new generative_ai_1.GoogleGenerativeAI(apiKey);
        geminiModel = geminiClient.getGenerativeModel({ model: modelName });
        geminiKeyInUse = apiKey;
        console.log(`[Gemini] Model initialized: ${modelName}`);
    }
    return geminiModel;
};
// Path to store user preferences (language, etc.)
const userPrefsPath = path_1.default.join(electron_1.app.getPath("userData"), "preferences.json");
// Disable GPU to avoid EGL driver issues that can freeze the UI on some Macs/VMs
electron_1.app.disableHardwareAcceleration();
function createWindow() {
    win = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            preload: path_1.default.join(__dirname, "preload.js"),
        },
    });
    const isDev = process.env.NODE_ENV === "development" || !fs_1.default.existsSync(path_1.default.join(__dirname, "../dist/index.html"));
    if (isDev) {
        win.loadURL("http://localhost:5173");
        win.webContents.openDevTools();
    }
    else {
        win.loadFile(path_1.default.join(__dirname, "../dist/index.html"));
    }
}
/* ----------------------------
   IPC HANDLERS (Main <-> Renderer)
----------------------------- */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
electron_1.ipcMain.handle("gemini:generate-text", async (_event, payload) => {
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
        }
        catch (error) {
            // Check if it's a rate limit error (status 429)
            const isQuotaError = error?.status === 429 || error?.message?.includes("quota") || error?.message?.includes("429");
            if (isQuotaError && i < maxRetries - 1) {
                console.warn(`[Gemini] Rate limited/Quota exceeded. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
                await sleep(delay);
                delay *= 2; // Exponential backoff
            }
            else {
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
electron_1.ipcMain.handle("copy-media-file", async (_event, sourcePath) => {
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
            ? path_1.default.join(electron_1.app.getAppPath(), "public", "images", "uploads")
            : path_1.default.join(__dirname, "..", "dist", "images", "uploads");
        // Ensure the target directory exists
        if (!fs_1.default.existsSync(targetDir)) {
            fs_1.default.mkdirSync(targetDir, { recursive: true });
            console.log(`Created directory: ${targetDir}`);
        }
        // Create a unique filename to prevent overwrites
        const uniqueName = `${crypto_1.default.randomUUID()}${path_1.default.extname(sourcePath)}`;
        const destPath = path_1.default.join(targetDir, uniqueName);
        // Copy the file
        fs_1.default.copyFileSync(sourcePath, destPath);
        console.log(`Copied media from ${sourcePath} to ${destPath}`);
        // Return the relative path for the renderer to use in `src` attributes
        const relativePath = `images/uploads/${uniqueName}`;
        return relativePath;
    }
    catch (error) {
        console.error("Error copying media file:", error);
        return null;
    }
});
electron_1.ipcMain.handle("save-data-url", async (_event, dataUrl) => {
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
        const extensionMap = {
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
            ? path_1.default.join(electron_1.app.getAppPath(), "public", "images", "uploads")
            : path_1.default.join(__dirname, "..", "dist", "images", "uploads");
        if (!fs_1.default.existsSync(targetDir)) {
            fs_1.default.mkdirSync(targetDir, { recursive: true });
            console.log(`Created directory: ${targetDir}`);
        }
        const uniqueName = `${crypto_1.default.randomUUID()}${ext}`;
        const destPath = path_1.default.join(targetDir, uniqueName);
        fs_1.default.writeFileSync(destPath, buffer);
        console.log(`Saved data URI to ${destPath}`);
        return `images/uploads/${uniqueName}`;
    }
    catch (error) {
        console.error("Error saving data URI:", error);
        return null;
    }
});
const slugToDir = (slug) => path_1.default.join(electron_1.app.getPath("userData"), "games", slug || "game");
const listLocalGames = () => {
    const gamesDir = path_1.default.join(electron_1.app.getPath("userData"), "games");
    if (!fs_1.default.existsSync(gamesDir))
        return [];
    const entries = fs_1.default.readdirSync(gamesDir, { withFileTypes: true });
    const games = [];
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        const gamePath = path_1.default.join(gamesDir, entry.name, "game.json");
        if (!fs_1.default.existsSync(gamePath))
            continue;
        try {
            const data = JSON.parse(fs_1.default.readFileSync(gamePath, "utf8"));
            games.push({ ...data, slug: entry.name });
        }
        catch (err) {
            console.warn("Failed to read game.json for", entry.name, err);
        }
    }
    return games;
};
electron_1.ipcMain.handle("save-game-media", async (_event, payload) => {
    const { slug, dataUrl } = payload || {};
    if (!dataUrl?.startsWith("data:")) {
        console.error("save-game-media invoked without a data URI");
        return null;
    }
    const baseDir = path_1.default.join(slugToDir(slug), "media");
    try {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
            console.error("Invalid data URI format");
            return null;
        }
        const [, mimeType, base64Data] = match;
        const buffer = Buffer.from(base64Data, "base64");
        const extensionMap = {
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
        if (!fs_1.default.existsSync(baseDir)) {
            fs_1.default.mkdirSync(baseDir, { recursive: true });
        }
        const ext = extensionMap[mimeType] || "";
        const uniqueName = `${crypto_1.default.randomUUID()}${ext}`;
        const destPath = path_1.default.join(baseDir, uniqueName);
        fs_1.default.writeFileSync(destPath, buffer);
        console.log(`Saved game media to ${destPath}`);
        return destPath;
    }
    catch (error) {
        console.error("Error saving game media:", error);
        return null;
    }
});
electron_1.ipcMain.handle("save-game-local", async (_event, payload) => {
    const { slug, game } = payload || {};
    if (!slug || !game) {
        console.error("save-game-local requires slug and game payload");
        return false;
    }
    try {
        const dir = slugToDir(slug);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        const filePath = path_1.default.join(dir, "game.json");
        fs_1.default.writeFileSync(filePath, JSON.stringify(game, null, 2), "utf8");
        console.log(`Saved game data to ${filePath}`);
        return true;
    }
    catch (error) {
        console.error("Error saving game locally:", error);
        return false;
    }
});
electron_1.ipcMain.handle("list-games-local", async () => {
    try {
        return listLocalGames();
    }
    catch (error) {
        console.error("Error listing local games:", error);
        return [];
    }
});
electron_1.ipcMain.handle("delete-game-local", async (_event, payload) => {
    try {
        const gamesDir = path_1.default.join(electron_1.app.getPath("userData"), "games");
        if (!fs_1.default.existsSync(gamesDir))
            return true;
        let targetDir = null;
        if (payload?.slug) {
            targetDir = path_1.default.join(gamesDir, payload.slug);
        }
        else if (payload?.id) {
            for (const entry of fs_1.default.readdirSync(gamesDir, { withFileTypes: true })) {
                if (!entry.isDirectory())
                    continue;
                const gamePath = path_1.default.join(gamesDir, entry.name, "game.json");
                if (!fs_1.default.existsSync(gamePath))
                    continue;
                try {
                    const data = JSON.parse(fs_1.default.readFileSync(gamePath, "utf8"));
                    if (data.id === payload.id) {
                        targetDir = path_1.default.join(gamesDir, entry.name);
                        break;
                    }
                }
                catch {
                    // ignore
                }
            }
        }
        if (targetDir && fs_1.default.existsSync(targetDir)) {
            fs_1.default.rmSync(targetDir, { recursive: true, force: true });
            console.log(`Deleted local game at ${targetDir}`);
        }
        return true;
    }
    catch (error) {
        console.error("Error deleting local game:", error);
        return false;
    }
});
// Simple ping example
electron_1.ipcMain.handle("ping", async () => {
    console.log("Ping received from renderer");
    return "pong from main 🚀";
});
// Language preference handlers
electron_1.ipcMain.handle("get-language", async () => {
    try {
        if (fs_1.default.existsSync(userPrefsPath)) {
            const data = JSON.parse(fs_1.default.readFileSync(userPrefsPath, "utf8"));
            return data.language || "en";
        }
        return "en";
    }
    catch (error) {
        console.error("Error reading preferences:", error);
        return "en";
    }
});
electron_1.ipcMain.handle("set-language", async (_event, lang) => {
    try {
        const prefs = fs_1.default.existsSync(userPrefsPath)
            ? JSON.parse(fs_1.default.readFileSync(userPrefsPath, "utf8"))
            : {};
        prefs.language = lang;
        fs_1.default.writeFileSync(userPrefsPath, JSON.stringify(prefs, null, 2));
        console.log("✅ Language preference saved:", lang);
        return true;
    }
    catch (error) {
        console.error("Error saving language preference:", error);
        return false;
    }
});
// Generic message handler
electron_1.ipcMain.on("message", (event, data) => {
    console.log("📩 Received message from renderer:", data);
    event.sender.send("message", { reply: "Hello from main process 👋" });
});
/* ----------------------------
   APP LIFECYCLE
----------------------------- */
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
// ✅ Log static assets path
electron_1.app.on("ready", () => {
    console.log("Static sounds path:", path_1.default.resolve(__dirname, "../dist/sounds"));
});
