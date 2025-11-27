import { logActivity } from "@/pages/activity";

export const RITUALS_STORAGE_KEY = "rituals_data";
export const MAX_RITUALS = 5;

export interface Ritual {
  id: string;
  title: string;
  schedule: {
    start: string; // "HH:MM"
    end: string; // "HH:MM"
    days: number[]; // 0-6 (Sun-Sat)
  };
  steps: string[];
  // History tracks the status of the ritual for specific dates
  // Key is YYYY-MM-DD
  history: Record<string, "done" | "missed">;
  createdAt: number; // timestamp when ritual was created
}

export function loadRituals(): Ritual[] {
  const stored = localStorage.getItem(RITUALS_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse rituals", e);
    return [];
  }
}

export function saveRituals(rituals: Ritual[]) {
  localStorage.setItem(RITUALS_STORAGE_KEY, JSON.stringify(rituals));
}

export function addRitual(
  title: string,
  schedule: Ritual["schedule"],
  steps: string[],
): Ritual {
  const rituals = loadRituals();
  if (rituals.length >= MAX_RITUALS) {
    throw new Error(`Cannot have more than ${MAX_RITUALS} rituals`);
  }

  const newRitual: Ritual = {
    id: crypto.randomUUID(),
    title,
    schedule,
    steps,
    history: {},
    createdAt: Date.now(),
  };

  rituals.push(newRitual);
  saveRituals(rituals);
  logActivity(
    "ritual_added",
    `Added ritual: ${title}`,
    `Scheduled: ${schedule.start} - ${schedule.end}`,
    { ritualId: newRitual.id, steps },
  );
  return newRitual;
}

export function removeRitual(id: string) {
  const rituals = loadRituals();
  const ritual = rituals.find((r) => r.id === id);
  const filtered = rituals.filter((r) => r.id !== id);
  saveRituals(filtered);
  if (ritual) {
    logActivity(
      "ritual_removed",
      `Removed ritual: ${ritual.title}`,
      undefined,
      { ritualId: id },
    );
  }
}

export function getRitualById(id: string): Ritual | undefined {
  const rituals = loadRituals();
  return rituals.find((r) => r.id === id);
}

export function markRitualDone(
  id: string,
  date: string = getTodayDateString(),
) {
  const rituals = loadRituals();
  const ritual = rituals.find((r) => r.id === id);
  if (ritual) {
    ritual.history[date] = "done";
    saveRituals(rituals);
    logActivity(
      "ritual_completed",
      `Completed ritual: ${ritual.title}`,
      `Completed for ${date}`,
      { ritualId: id, date },
    );
  }
}

export function markRitualMissed(
  id: string,
  date: string = getTodayDateString(),
) {
  const rituals = loadRituals();
  const ritual = rituals.find((r) => r.id === id);
  if (ritual) {
    ritual.history[date] = "missed";
    saveRituals(rituals);
    logActivity(
      "ritual_missed",
      `Missed ritual: ${ritual.title}`,
      `Missed for ${date}`,
      { ritualId: id, date },
    );
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Checks if a ritual is currently active (within time window and on correct day)
 */
export function isRitualActive(
  ritual: Ritual,
  now: Date = new Date(),
): boolean {
  const day = now.getDay();
  if (!ritual.schedule.days.includes(day)) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = ritual.schedule.start.split(":").map(Number);
  const [endH, endM] = ritual.schedule.end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Checks if a ritual has passed its end time for today without being done
 */
export function isRitualMissed(
  ritual: Ritual,
  now: Date = new Date(),
): boolean {
  const dateStr = getTodayDateString();
  // If already marked done or missed, it's not "currently becoming missed"
  if (ritual.history[dateStr]) return false;

  const day = now.getDay();
  if (!ritual.schedule.days.includes(day)) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [endH, endM] = ritual.schedule.end.split(":").map(Number);
  const endMinutes = endH * 60 + endM;

  // If current time hasn't passed the end time, not missed yet
  if (currentMinutes <= endMinutes) return false;

  // Check if ritual was created today after the end time
  // In that case, don't mark as missed since user never had a chance
  if (ritual.createdAt) {
    const createdDate = new Date(ritual.createdAt);
    const createdDateStr = createdDate.toISOString().split("T")[0];

    if (createdDateStr === dateStr) {
      // Ritual was created today - check if it was created after the end time
      const createdMinutes =
        createdDate.getHours() * 60 + createdDate.getMinutes();
      if (createdMinutes > endMinutes) {
        // Created after end time today, don't consider it missed
        return false;
      }
    }
  }

  return true;
}
