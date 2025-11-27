/**
 * Info Agent type definitions and storage utilities
 */

export interface InfoMemory {
  key: string;
  value: string;
  createdAt: number;
  updatedAt: number;
}

export interface InfoMemoryStore {
  memories: Record<string, InfoMemory>;
}

export interface SearchResult {
  id: string;
  type:
    | "challenge"
    | "rule"
    | "reflection"
    | "profile"
    | "achievement"
    | "memory";
  title: string;
  snippet: string;
  metadata?: Record<string, unknown>;
}

export const INFO_MEMORY_STORAGE_KEY = "info-agent-memory";

/**
 * Load info memory store from localStorage
 */
export function loadInfoMemory(): InfoMemoryStore {
  try {
    const stored = localStorage.getItem(INFO_MEMORY_STORAGE_KEY);
    if (!stored) {
      return { memories: {} };
    }
    return JSON.parse(stored) as InfoMemoryStore;
  } catch (error) {
    console.error("Failed to load info memory:", error);
    return { memories: {} };
  }
}

/**
 * Save info memory store to localStorage
 */
export function saveInfoMemory(store: InfoMemoryStore): void {
  try {
    localStorage.setItem(INFO_MEMORY_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Failed to save info memory:", error);
  }
}

/**
 * Write or update a memory
 */
export function writeMemory(key: string, value: string): void {
  const store = loadInfoMemory();
  const now = Date.now();

  store.memories[key] = {
    key,
    value,
    createdAt: store.memories[key]?.createdAt ?? now,
    updatedAt: now,
  };

  saveInfoMemory(store);
}

/**
 * Get a memory by key
 */
export function getMemory(key: string): InfoMemory | null {
  const store = loadInfoMemory();
  return store.memories[key] ?? null;
}

/**
 * Delete a memory by key
 */
export function deleteMemory(key: string): boolean {
  const store = loadInfoMemory();
  if (!store.memories[key]) {
    return false;
  }
  delete store.memories[key];
  saveInfoMemory(store);
  return true;
}

/**
 * List all memory keys
 */
export function listMemoryKeys(): string[] {
  const store = loadInfoMemory();
  return Object.keys(store.memories).sort();
}

/**
 * Get all memories
 */
export function getAllMemories(): InfoMemory[] {
  const store = loadInfoMemory();
  return Object.values(store.memories).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}

/**
 * Search through memories
 */
export function searchMemories(query: string): InfoMemory[] {
  const store = loadInfoMemory();
  const lowerQuery = query.toLowerCase();

  return Object.values(store.memories).filter(
    (memory) =>
      memory.key.toLowerCase().includes(lowerQuery) ||
      memory.value.toLowerCase().includes(lowerQuery),
  );
}

// Global promise resolver for user prompts
let currentPromptResolver: ((value: string) => void) | null = null;
let currentPromptRejecter: ((reason?: unknown) => void) | null = null;

export interface UserPromptState {
  isOpen: boolean;
  message: string;
  response: string;
}

const promptListeners = new Set<(state: UserPromptState) => void>();

/**
 * Subscribe to prompt state changes
 */
export function onPromptStateChange(
  callback: (state: UserPromptState) => void,
): () => void {
  promptListeners.add(callback);
  return () => {
    promptListeners.delete(callback);
  };
}

/**
 * Notify all listeners of prompt state change
 */
function notifyPromptListeners(state: UserPromptState): void {
  promptListeners.forEach((callback) => {
    callback(state);
  });
}

/**
 * Show a prompt to the user and wait for response
 */
export function promptUser(message: string): Promise<string> {
  // Cancel any existing prompt
  if (currentPromptRejecter) {
    currentPromptRejecter(new Error("Prompt cancelled by new prompt"));
  }

  return new Promise<string>((resolve, reject) => {
    currentPromptResolver = resolve;
    currentPromptRejecter = reject;

    // Notify UI to show prompt
    notifyPromptListeners({
      isOpen: true,
      message,
      response: "",
    });
  });
}

/**
 * Submit a response to the current prompt
 */
export function submitPromptResponse(response: string): void {
  if (currentPromptResolver) {
    currentPromptResolver(response);
    currentPromptResolver = null;
    currentPromptRejecter = null;

    // Notify UI to hide prompt
    notifyPromptListeners({
      isOpen: false,
      message: "",
      response: "",
    });
  }
}

/**
 * Cancel the current prompt
 */
export function cancelPrompt(): void {
  if (currentPromptRejecter) {
    currentPromptRejecter(new Error("Prompt cancelled by user"));
    currentPromptResolver = null;
    currentPromptRejecter = null;

    // Notify UI to hide prompt
    notifyPromptListeners({
      isOpen: false,
      message: "",
      response: "",
    });
  }
}
