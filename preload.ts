import { contextBridge, ipcRenderer } from "electron";



contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  send: (channel: string, data: any) => ipcRenderer.send(channel, data),
  on: (channel: string, func: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => func(...args));
  },
  onMessage: (channel: string, callback: (event: unknown, data: unknown) => void) => {
    ipcRenderer.on(channel, (_event, data) => callback(_event, data));
  },

  // 🎵 Safe sound player with fallback
  playSound: (filename: string) => {
    try {
      const audio = new Audio(`/sounds/${filename}`);
      audio.addEventListener("error", () => {
        console.warn(`⚠️ Sound file missing: /sounds/${filename}`);
      });
      audio.currentTime = 0;
      audio.play().catch(() => {
        console.warn(`⚠️ Could not play sound: /sounds/${filename}`);
      });
    } catch (err) {
      console.warn(`⚠️ Failed to initialize sound: ${filename}`, err);
    }
  },
});
