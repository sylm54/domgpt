import { z } from "zod";
import {
  writeMemory,
  getMemory,
  deleteMemory,
  getAllMemories,
  searchMemories,
  promptUser,
  type SearchResult,
} from "./info-types";

// Import data loaders from other modules
import { loadChallenges } from "@/pages/challenge/types";
import { loadProfileData } from "@/pages/profile/types";
import { loadReflectionData, formatDateString } from "@/pages/reflection/types";
import { loadRules } from "@/pages/rule/types";
import { tool } from "@/lib/models";

/**
 * Search through all data sources for information
 */
function performSearch(query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  // Search challenges
  const challenges = loadChallenges();
  challenges.forEach((challenge) => {
    const matchInTitle = challenge.title.toLowerCase().includes(lowerQuery);
    const matchInBody = challenge.body.toLowerCase().includes(lowerQuery);

    if (matchInTitle || matchInBody) {
      const snippet =
        challenge.body.length > 150
          ? challenge.body.substring(0, 150) + "..."
          : challenge.body;

      results.push({
        id: `challenge:${challenge.id}`,
        type: "challenge",
        title: challenge.title,
        snippet,
        metadata: {
          completed: challenge.completed,
          createdAt: challenge.createdAt,
          completedAt: challenge.completedAt,
        },
      });
    }
  });

  // Search rules
  const rules = loadRules();
  rules.forEach((rule) => {
    const matchInTitle = rule.title.toLowerCase().includes(lowerQuery);
    const matchInBody = rule.body.toLowerCase().includes(lowerQuery);

    if (matchInTitle || matchInBody) {
      const snippet =
        rule.body.length > 150
          ? rule.body.substring(0, 150) + "..."
          : rule.body;

      results.push({
        id: `rule:${rule.id}`,
        type: "rule",
        title: rule.title,
        snippet,
        metadata: {
          breakCount: rule.breaks.length,
          createdAt: rule.createdAt,
        },
      });
    }
  });

  // Search profile
  const profile = loadProfileData();
  const matchInProfileTitle = profile.title.toLowerCase().includes(lowerQuery);
  const matchInProfileDesc = profile.description
    .toLowerCase()
    .includes(lowerQuery);

  if (
    matchInProfileTitle ||
    matchInProfileDesc ||
    query.toLowerCase().includes("profile")
  ) {
    const snippet =
      profile.description.length > 150
        ? profile.description.substring(0, 150) + "..."
        : profile.description;

    results.push({
      id: "profile:main",
      type: "profile",
      title: profile.title,
      snippet,
      metadata: {
        achievementCount: profile.achievements.length,
      },
    });
  }

  // Search achievements
  profile.achievements.forEach((achievement) => {
    const matchInTitle = achievement.title.toLowerCase().includes(lowerQuery);
    const matchInDesc = achievement.description
      .toLowerCase()
      .includes(lowerQuery);

    if (matchInTitle || matchInDesc) {
      const snippet =
        achievement.description.length > 150
          ? achievement.description.substring(0, 150) + "..."
          : achievement.description;

      results.push({
        id: `achievement:${achievement.id}`,
        type: "achievement",
        title: achievement.title,
        snippet,
        metadata: {
          createdAt: achievement.createdAt,
        },
      });
    }
  });

  // Search reflections
  const reflectionData = loadReflectionData();
  Object.entries(reflectionData.reflections).forEach(([date, responses]) => {
    const combinedText = responses.responses.join(" ").toLowerCase();
    if (combinedText.includes(lowerQuery)) {
      const snippet =
        responses.responses[0].length > 150
          ? responses.responses[0].substring(0, 150) + "..."
          : responses.responses[0];

      results.push({
        id: `reflection:${date}`,
        type: "reflection",
        title: `Reflection for ${formatDateString(date)}`,
        snippet,
        metadata: {
          date,
          responseCount: responses.responses.filter((r) => r.trim().length > 0)
            .length,
        },
      });
    }
  });

  // Search memories
  const memories = searchMemories(query);
  memories.forEach((memory) => {
    const snippet =
      memory.value.length > 150
        ? memory.value.substring(0, 150) + "..."
        : memory.value;

    results.push({
      id: `memory:${memory.key}`,
      type: "memory",
      title: `Memory: ${memory.key}`,
      snippet,
      metadata: {
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
      },
    });
  });

  return results;
}

/**
 * Get full entry by ID
 */
function inspectEntry(id: string): string {
  const [type, ...idParts] = id.split(":");
  const actualId = idParts.join(":");

  switch (type) {
    case "challenge": {
      const challenges = loadChallenges();
      const challenge = challenges.find((c) => c.id === actualId);
      if (!challenge) return `Challenge not found with ID: ${actualId}`;

      return `CHALLENGE
ID: ${challenge.id}
Title: ${challenge.title}
Status: ${challenge.completed ? "✓ Completed" : "○ Not Completed"}
Created: ${new Date(challenge.createdAt).toLocaleString()}
${challenge.completedAt ? `Completed: ${new Date(challenge.completedAt).toLocaleString()}` : ""}

Description:
${challenge.body}`;
    }

    case "rule": {
      const rules = loadRules();
      const rule = rules.find((r) => r.id === actualId);
      if (!rule) return `Rule not found with ID: ${actualId}`;

      const recentBreaks = rule.breaks
        .slice(-10)
        .reverse()
        .map((b) => `  - ${new Date(b.timestamp).toLocaleString()}`)
        .join("\n");

      return `RULE
ID: ${rule.id}
Title: ${rule.title}
Total Breaks: ${rule.breaks.length}
Created: ${new Date(rule.createdAt).toLocaleString()}

Description:
${rule.body}

${rule.breaks.length > 0 ? `Recent Breaks (last 10):\n${recentBreaks}` : "No breaks recorded"}`;
    }

    case "profile": {
      const profile = loadProfileData();
      return `PROFILE
Title: ${profile.title}
Achievements: ${profile.achievements.length}

Description:
${profile.description}

Recent Achievements:
${
  profile.achievements
    .slice(-5)
    .reverse()
    .map(
      (a) => `  - ${a.title} (${new Date(a.createdAt).toLocaleDateString()})`,
    )
    .join("\n") || "No achievements yet"
}`;
    }

    case "achievement": {
      const profile = loadProfileData();
      const achievement = profile.achievements.find((a) => a.id === actualId);
      if (!achievement) return `Achievement not found with ID: ${actualId}`;

      return `ACHIEVEMENT
ID: ${achievement.id}
Title: ${achievement.title}
Earned: ${new Date(achievement.createdAt).toLocaleString()}

Description:
${achievement.description}`;
    }

    case "reflection": {
      const reflectionData = loadReflectionData();
      const date = actualId;
      const responses = reflectionData.reflections[date];
      if (!responses) return `Reflection not found for date: ${date}`;

      const prompts = reflectionData.prompts;
      const formattedResponses = prompts
        .map(
          (prompt, idx) =>
            `${idx + 1}. ${prompt}\n   ${responses.responses[idx] || "(No response)"}`,
        )
        .join("\n\n");

      return `DAILY REFLECTION
Date: ${formatDateString(date)} (${date})

${formattedResponses}`;
    }

    case "memory": {
      const memory = getMemory(actualId);
      if (!memory) return `Memory not found with key: ${actualId}`;

      return `MEMORY
Key: ${memory.key}
Created: ${new Date(memory.createdAt).toLocaleString()}
Last Updated: ${new Date(memory.updatedAt).toLocaleString()}

Value:
${memory.value}`;
    }

    default:
      return `Unknown entry type: ${type}`;
  }
}

/**
 * Tool provider for Info Agent
 */
export const infotools = [
  tool({
    name: "search",
    description:
      "Search through all data sources (challenges, rules, profile, achievements, reflections, and memories) for information. Returns snippets with IDs that can be inspected for full details.",
    schema: {
      query: z
        .string()
        .min(1)
        .describe("The search query to find relevant information"),
    },
    call: async ({ query }) => {
      const results = performSearch(query);

      if (results.length === 0) {
        return `No results found for query: "${query}"`;
      }

      const grouped = results.reduce(
        (acc, result) => {
          if (!acc[result.type]) {
            acc[result.type] = [];
          }
          acc[result.type].push(result);
          return acc;
        },
        {} as Record<string, SearchResult[]>,
      );

      const sections = Object.entries(grouped).map(([type, items]) => {
        const typeLabel = type.toUpperCase() + "S";
        const itemList = items
          .map((item) => `  [${item.id}]\n  ${item.title}\n  ${item.snippet}\n`)
          .join("\n");
        return `${typeLabel} (${items.length}):\n${itemList}`;
      });

      return `Found ${results.length} result(s) for "${query}":\n\n${sections.join("\n")}\n\nUse inspect(id) to view full details of any entry.`;
    },
  }),

  tool({
    name: "inspect",
    description:
      "Display the full entry for a search result based on its ID. The ID is returned from the search tool.",
    schema: {
      id: z
        .string()
        .min(1)
        .describe(
          "The ID of the entry to inspect (e.g., 'challenge:uuid', 'rule:uuid', 'reflection:2024-01-01', 'memory:key')",
        ),
    },
    call: async ({ id }) => {
      return inspectEntry(id);
    },
  }),

  tool({
    name: "prompt",
    description:
      "Send a message to the user and wait for their response. A dialog will appear on screen for the user to answer. This is useful when you need specific information from the user.",
    schema: {
      message: z
        .string()
        .min(1)
        .describe("The message/question to show to the user"),
    },
    call: async ({ message }) => {
      try {
        const response = await promptUser(message);
        return `User responded: "${response}"`;
      } catch (error) {
        return `Failed to get user response: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  }),

  tool({
    name: "writememory",
    description:
      "Write or update a memory entry. Memories persist across sessions and can be used to store important information learned from the user.",
    schema: {
      key: z
        .string()
        .min(1)
        .max(100)
        .describe("The key/name for this memory (max 100 characters)"),
      message: z
        .string()
        .min(1)
        .describe("The content/value to store in this memory"),
    },
    call: async ({ key, message }) => {
      try {
        const existing = getMemory(key);
        writeMemory(key, message);

        if (existing) {
          return `Successfully updated memory "${key}"\nPrevious value: "${existing.value.substring(0, 100)}${existing.value.length > 100 ? "..." : ""}"\nNew value: "${message.substring(0, 100)}${message.length > 100 ? "..." : ""}"`;
        } else {
          return `Successfully created new memory "${key}"\nValue: "${message.substring(0, 100)}${message.length > 100 ? "..." : ""}"`;
        }
      } catch (error) {
        return `Failed to write memory: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  }),

  tool({
    name: "getmemory",
    description:
      "Retrieve a specific memory by its key. Returns the full content of the memory.",
    schema: {
      key: z.string().min(1).describe("The key of the memory to retrieve"),
    },
    call: async ({ key }) => {
      const memory = getMemory(key);

      if (!memory) {
        return `No memory found with key: "${key}"\n\nUse listmemory to see all available memory keys.`;
      }

      return `Memory: ${memory.key}
Created: ${new Date(memory.createdAt).toLocaleString()}
Last Updated: ${new Date(memory.updatedAt).toLocaleString()}

Value:
${memory.value}`;
    },
  }),

  tool({
    name: "deletememory",
    description:
      "Delete a memory by its key. This permanently removes the memory.",
    schema: {
      key: z.string().min(1).describe("The key of the memory to delete"),
    },
    call: async ({ key }) => {
      const success = deleteMemory(key);

      if (success) {
        return `Successfully deleted memory: "${key}"`;
      } else {
        return `No memory found with key: "${key}"`;
      }
    },
  }),

  tool({
    name: "listmemory",
    description:
      "List all memory keys with their update timestamps. Use getmemory to retrieve the full content of any memory.",
    schema: {},
    call: async () => {
      const memories = getAllMemories();

      if (memories.length === 0) {
        return "No memories stored yet. Use writememory to create new memories.";
      }

      const memoryList = memories
        .map(
          (m) =>
            `  - ${m.key}\n    Updated: ${new Date(m.updatedAt).toLocaleString()}\n    Preview: ${m.value.substring(0, 80)}${m.value.length > 80 ? "..." : ""}`,
        )
        .join("\n\n");

      return `Stored Memories (${memories.length}):\n\n${memoryList}\n\nUse getmemory(key) to view full content.`;
    },
  }),
];
