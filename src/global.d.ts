export {};

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      ping: () => Promise<any>;
      sendMessage: (channel: string, data: unknown) => void;
      onMessage: (channel: string, callback: (event: unknown, data: unknown) => void) => void;
      playSound: (filename: string) => void; // ✅ new
      // Local game helpers
      // channels: save-game-local, save-game-media, list-games-local, delete-game-local
    };
  }
}
