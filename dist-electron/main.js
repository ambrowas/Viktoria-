"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let win = null;
// Path to store user preferences (language, etc.)
const userPrefsPath = path_1.default.join(electron_1.app.getPath("userData"), "preferences.json");
function createWindow() {
    win = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
        },
    });
    if (process.env.NODE_ENV === "development") {
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
