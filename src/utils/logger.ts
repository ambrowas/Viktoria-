// src/utils/logger.ts

/**
 * Utility function to write logs to both the browser console
 * and a persistent runtime log file on the user's Desktop.
 */
export function logStep(message: string) {
  try {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[Viktoria-Log] [${timestamp}] ${message}`);
    
    if (
      typeof window !== "undefined" &&
      window.electronAPI &&
      typeof window.electronAPI.invoke === "function"
    ) {
      window.electronAPI.invoke("write-log", message).catch((err) => {
        console.warn("Failed to write to desktop log file:", err);
      });
    }
  } catch (err) {
    console.error("Error writing log step:", err);
  }
}
