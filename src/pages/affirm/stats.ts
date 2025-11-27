export type AffirmStats = {
  fileStats: Record<
    string,
    {
      listenCount: number;
      lastListened: number; // timestamp
    }
  >;
  global: {
    streak: number;
    lastStreakDate: string; // YYYY-MM-DD
  };
};

const STATS_KEY = "affirm-stats";

export function loadStats(): AffirmStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load stats", e);
  }
  return {
    fileStats: {},
    global: {
      streak: 0,
      lastStreakDate: "",
    },
  };
}

export function saveStats(stats: AffirmStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error("Failed to save stats", e);
  }
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function recordListen(filename: string): AffirmStats {
  const stats = loadStats();
  const now = Date.now();
  const today = getTodayDateString();

  // Update file stats
  if (!stats.fileStats[filename]) {
    stats.fileStats[filename] = {
      listenCount: 0,
      lastListened: 0,
    };
  }
  stats.fileStats[filename].listenCount += 1;
  stats.fileStats[filename].lastListened = now;

  // Update global streak
  const lastDate = stats.global.lastStreakDate;

  if (lastDate === today) {
    // Already listened today, streak maintained but not incremented
  } else {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const yesterdayString = `${year}-${month}-${day}`;

    if (lastDate === yesterdayString) {
      // Listened yesterday, increment streak
      stats.global.streak += 1;
    } else {
      // Missed a day (or first time), reset/start streak
      stats.global.streak = 1;
    }
    stats.global.lastStreakDate = today;
  }

  saveStats(stats);
  return stats;
}
