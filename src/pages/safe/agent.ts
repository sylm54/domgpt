import { tool } from "@/lib/models";
import { loadSafeData, saveSafeData, unlockSafe } from "./types";

export const safe_tools = [
  tool({
    name: "Unlock",
    description: "Unlock the key",
    schema: {},
    call: async () => {
      let data = loadSafeData();
      data = unlockSafe(data);
      saveSafeData(data);
      return "The key is unlocked";
    },
  }),
  tool({
    name: "CheckLock",
    description: "Check if the safe is locked and how long it has been locked",
    schema: {},
    call: async () => {
      const data = loadSafeData();
      if (!data.isLocked) {
        return "The safe is not locked";
      }
      if (!data.lockedAt) {
        return "The safe is locked (duration unknown)";
      }

      const ms = Date.now() - data.lockedAt;
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      let formatted: string;
      if (days > 0) {
        formatted = `${days} day${days !== 1 ? "s" : ""}, ${hours % 24} hour${hours % 24 !== 1 ? "s" : ""}`;
      } else if (hours > 0) {
        formatted = `${hours} hour${hours !== 1 ? "s" : ""}, ${minutes % 60} minute${minutes % 60 !== 1 ? "s" : ""}`;
      } else if (minutes > 0) {
        formatted = `${minutes} minute${minutes !== 1 ? "s" : ""}, ${seconds % 60} second${seconds % 60 !== 1 ? "s" : ""}`;
      } else {
        formatted = `${seconds} second${seconds !== 1 ? "s" : ""}`;
      }

      return `The safe has been locked for ${formatted}`;
    },
  }),
];
