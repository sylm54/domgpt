/**
 * Interview Agent type definitions and state management
 * 
 * This module manages the state for interactive interview sessions between
 * agents and users. It follows the same pattern as info-types.ts.
 */

export interface InterviewState {
  isOpen: boolean;
  promptMessage: string;
  result: string;
}

export interface InterviewRequest {
  promptMessage: string;
  resolve: (result: string) => void;
  reject: (reason?: unknown) => void;
}

// Global state for current interview request
let currentRequest: InterviewRequest | null = null;

// Listeners for state changes
const stateListeners = new Set<(state: InterviewState) => void>();

/**
 * Subscribe to interview state changes
 */
export function onInterviewStateChange(
  callback: (state: InterviewState) => void,
): () => void {
  stateListeners.add(callback);
  return () => {
    stateListeners.delete(callback);
  };
}

/**
 * Notify all listeners of state change
 */
function notifyListeners(state: InterviewState): void {
  stateListeners.forEach((callback) => {
    callback(state);
  });
}

/**
 * Start an interview session with the user
 * Returns a promise that resolves when the interview agent calls 'done'
 */
export function startInterview(promptMessage: string): Promise<string> {
  // Cancel any existing interview
  if (currentRequest) {
    currentRequest.reject(new Error("Interview cancelled by new interview"));
  }

  return new Promise<string>((resolve, reject) => {
    currentRequest = {
      promptMessage,
      resolve,
      reject,
    };

    // Notify UI to show interview dialog
    notifyListeners({
      isOpen: true,
      promptMessage,
      result: "",
    });
  });
}

/**
 * End the current interview session with a result
 * This is called by the Interview Agent's 'done' tool
 */
export function endInterview(result: string): void {
  if (currentRequest) {
    currentRequest.resolve(result);
    currentRequest = null;

    // Notify UI to hide dialog
    notifyListeners({
      isOpen: false,
      promptMessage: "",
      result: "",
    });
  }
}

/**
 * Cancel the current interview session
 */
export function cancelInterview(): void {
  if (currentRequest) {
    currentRequest.reject(new Error("Interview cancelled by user"));
    currentRequest = null;

    // Notify UI to hide dialog
    notifyListeners({
      isOpen: false,
      promptMessage: "",
      result: "",
    });
  }
}

/**
 * Get current interview request (for dialog to access)
 */
export function getCurrentRequest(): InterviewRequest | null {
  return currentRequest;
}
