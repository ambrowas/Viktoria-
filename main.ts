import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";

let win: BrowserWindow | null = null;

// Path to store user preferences (language, etc.)
const userPrefsPath = path.join(app.getPath("userData"), "preferences.json");

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {


      
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

/* ----------------------------
   IPC HANDLERS (Main <-> Renderer)
----------------------------- */

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
