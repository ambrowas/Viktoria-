"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    invoke: (channel, ...args) => electron_1.ipcRenderer.invoke(channel, ...args),
    send: (channel, data) => electron_1.ipcRenderer.send(channel, data),
    on: (channel, func) => {
        electron_1.ipcRenderer.on(channel, (_event, ...args) => func(...args));
    },
    onMessage: (channel, callback) => {
        electron_1.ipcRenderer.on(channel, (_event, data) => callback(_event, data));
    },
    // 🎵 Safe sound player with fallback
    playSound: (filename) => {
        try {
            const audio = new Audio(`/sounds/${filename}`);
            audio.addEventListener("error", () => {
                console.warn(`⚠️ Sound file missing: /sounds/${filename}`);
            });
            audio.currentTime = 0;
            audio.play().catch(() => {
                console.warn(`⚠️ Could not play sound: /sounds/${filename}`);
            });
        }
        catch (err) {
            console.warn(`⚠️ Failed to initialize sound: ${filename}`, err);
        }
    },
});
