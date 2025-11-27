import { logActivity } from "@/pages/activity";

export type VoiceAssignment = {
  id: string;
  phrase: string;
  targetPitch?: string; // e.g. "High", "Medium", "Low" or Hz range
  targetTone?: string; // e.g. "Soft", "Breathy"
  completed: boolean;
};

export type VoiceScore = {
  id: string;
  date: string; // ISO string
  assignmentId: string;
  overallScore: number; // 0-100
  breakdown: {
    pitch: number;
    intonation: number;
    resonance: number;
    naturalness: number;
  };
};

export const STORAGE_KEY_ASSIGNMENTS = "voice_assignments";
export const STORAGE_KEY_SCORES = "voice_scores";

export function loadAssignments(): VoiceAssignment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveAssignments(assignments: VoiceAssignment[]) {
  localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
}

export function loadScores(): VoiceScore[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SCORES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveScores(scores: VoiceScore[]) {
  localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(scores));
}

/**
 * Log when a voice assignment is added
 */
export function logVoiceAssignmentAdded(assignment: VoiceAssignment) {
  logActivity(
    "voice_assignment_added",
    `Added voice assignment: ${assignment.phrase.slice(0, 50)}${assignment.phrase.length > 50 ? "..." : ""}`,
    assignment.targetPitch
      ? `Target pitch: ${assignment.targetPitch}`
      : undefined,
    { assignmentId: assignment.id },
  );
}

/**
 * Log when a voice assignment is completed with a score
 */
export function logVoiceAssignmentCompleted(
  assignment: VoiceAssignment,
  score: VoiceScore,
) {
  logActivity(
    "voice_assignment_completed",
    `Completed voice practice: ${assignment.phrase.slice(0, 50)}${assignment.phrase.length > 50 ? "..." : ""}`,
    `Score: ${score.overallScore}/100`,
    {
      assignmentId: assignment.id,
      scoreId: score.id,
      overallScore: score.overallScore,
      breakdown: score.breakdown,
    },
  );
}
