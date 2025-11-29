import { BaseDirectory, readFile, readTextFile } from "@tauri-apps/plugin-fs";
import { appConfigDir } from "@tauri-apps/api/path";
import { HTTPClient, OpenRouter } from "@openrouter/sdk";
import { Model } from "./lib/models";
import { OpenRouterModel } from "./lib/models/openrouterv2";
import { fetch } from "@tauri-apps/plugin-http";
import { createTauriFetcher } from "./lib/http";
import {
  AFFIRM_MODEL_STORAGE,
  MODEL_STORAGE,
  TALK_MODEL_STORAGE,
} from "./pages/settings/view";

// const openRouter = new OpenRouter({
//   apiKey: key,
//   debugLogger: console,
//   httpClient: new HTTPClient({
//     fetcher: fetch,
//   }),
// });
export const model = new OpenRouterModel(
  undefined,
  localStorage.getItem(MODEL_STORAGE) || "x-ai/grok-4.1-fast",
);
export const talkmodel = new OpenRouterModel(
  undefined,
  localStorage.getItem(TALK_MODEL_STORAGE) || "x-ai/grok-4.1-fast",
);
export const affirmmodel = new OpenRouterModel(
  undefined,
  localStorage.getItem(AFFIRM_MODEL_STORAGE) || "x-ai/grok-4.1-fast",
);
const CONFIG_NAME = "config.json";
const CONFIG_BASE_DIR = BaseDirectory.AppConfig;
export const config = await getConfig();
/**
 * Application configuration (what to put in the config.json file)
 *
 * Purpose
 * - This comment explains the JSON configuration file used by the app so people
 *   outside the codebase (end users or integrators) can create and edit it.
 *
 * Where to place the file
 * - File name: config.json (value of CONFIG_NAME)
 * - Location: platform-specific application config directory (Tauri's AppConfig).
 *   The app resolves this directory with appConfigDir() and reads the file via
 *   readTextFile(CONFIG_NAME, { baseDir: BaseDirectory.AppConfig }).
 *
 * Format (JSON)
 * - The file should contain a single JSON object with the following properties.
 *   Fields marked "optional" may be omitted; the application will use sensible
 *   defaults where appropriate.
 *
 * {
 *   "main_system_prompt": "Optional top-level system prompt string",
 *   "sysprompts": {
 *     "info_agent": "Optional system prompt for the info agent",
 *     "challenge_agent": "Optional system prompt for the challenge agent",
 *     "profile_agent": "Optional system prompt for the profile agent",
 *     "rule_agent": "Optional system prompt for the rule agent",
 *     "reflection_agent": "Optional system prompt for the reflection agent",
 *     "safe_agent": "Optional system prompt for the safe agent",
 *     "affirm_agent": "Optional system prompt for the affirm agent",
 *     "inventory_agent": "Optional system prompt for the inventory agent",
 *     "tag_agent": "Optional system prompt for the tag agent"
 *   },
 *   "agent_names": {
 *     "info_agent": "Human name for the info agent",
 *     "challenge_agent": "Human name for the challenge agent",
 *     "...": "...",
 *     "inventory_agent": "Human name for the inventory agent",
 *     "tag_agent": "Human name for the tag agent"
 *   },
 *   "agent_descriptions": {
 *     "info_agent": "Short description for the info agent",
 *     "challenge_agent": "Short description for the challenge agent",
 *     "...": "..."
 *   }
 * }
 *
 * Field details
 * - main_system_prompt (string, optional)
 *   - A top-level system prompt used by the app's "main" coordinating agent.
 *   - If omitted, the application uses a default like "You are the main coordinating agent."
 *
 * - sysprompts (object of optional strings)
 *   - Per-agent system prompts that override the agent's built-in defaults.
 *   - Keys are agent identifiers (see examples above). Any missing key falls back
 *     to the built-in prompt for that agent.
 *
 * - agent_names (object of optional strings)
 *   - Human-friendly names shown to users for each agent.
 *   - If a name is omitted the app will use a reasonable default name.
 *
 * - agent_descriptions (object of optional strings)
 *   - Short descriptions for each agent used in prompts and UIs.
 *   - Omitted descriptions fall back to built-in defaults.
 *
 * Important notes and tips
 * - There is no strict schema validation at runtime: the file is parsed as JSON
 *   and cast to the expected shape. If you accidentally omit fields the app will
 *   still run, using default values where needed.
 * - If the file is missing or cannot be read, the readTextFile call will throw.
 *   Ensure config.json exists and is valid JSON before starting the app.
 * - The project uses the key name "challenge_agent" (including the underscore).
 *   Keep that exact key name if you want to override the challenge agent's prompt,
 *   even though it may look like a typo.
 *
 * Extending the configuration
 * - To add a new agent you should:
 *   1) Add matching entries under sysprompts, agent_names, and agent_descriptions,
 *      e.g. "my_new_agent": "..." for each object.
 *   2) Update the application's agent registry (in the source) to recognize
 *      your new agent key so it becomes available to the system.
 *
 * Example minimal config
 * {
 *   "main_system_prompt": "You are the main coordinating agent.",
 *   "agent_names": { "info_agent": "Info" },
 *   "agent_descriptions": { "info_agent": "Finds and summarizes information." }
 * }
 *
 * Example usage in code
 * - The app commonly uses fallback expressions such as:
 *     const mainPrompt = cfg.main_system_prompt ?? "You are the main coordinating agent.";
 *
 */
export type UIText = {
  profile?: {
    title?: string;
    achievements_label?: string;
    journey_label?: string;
    no_achievements?: string;
    no_achievements_desc?: string;
  };
  rituals?: {
    title?: string;
    subtitle?: string;
    mark_done_label?: string;
    no_rituals?: string;
    no_rituals_desc?: string;
    missed_label?: string;
  };
  affirm?: {
    title?: string;
    streak_label?: string;
    prompt_agent_label?: string;
    no_audio?: string;
    play_label?: string;
    download_label?: string;
  };
  reflection?: {
    title?: string;
    save_label?: string;
    saved_label?: string;
    streak_label?: string;
    total_label?: string;
    prev_day_label?: string;
    next_day_label?: string;
    today_label?: string;
    no_reflection?: string;
    placeholder?: string;
  };
  rule?: {
    title?: string;
    streak_label?: string;
    no_rules?: string;
    break_label?: string;
    recent_breaks_label?: string;
  };
  safe?: {
    title?: string;
    locked_subtitle?: string;
    unlocked_subtitle?: string;
    locked_desc?: string;
    unlocked_desc?: string;
    lock_label?: string;
    locked_duration_label?: string;
    enter_key_label?: string;
    placeholder?: string;
  };
  challenge?: {
    title?: string;
    no_challenges?: string;
    no_challenges_desc?: string;
    completed_label?: string;
  };
  inventory?: {
    title?: string;
    no_items?: string;
    no_items_desc?: string;
    upload_label?: string;
    camera_label?: string;
  };
  voice?: {
    title?: string;
    subtitle?: string;
    record_label?: string;
    stop_label?: string;
    analyze_label?: string;
    dry_run_label?: string;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    api_config_title?: string;
    api_config_desc?: string;
    api_key_label?: string;
    model_label?: string;
    talk_model_label?: string;
    affirm_model_label?: string;
    save_label?: string;
    saving_label?: string;
    data_management_title?: string;
    data_management_desc?: string;
    export_label?: string;
    import_label?: string;
    clear_label?: string;
  };
  common?: {
    loading?: string;
    error?: string;
    save?: string;
    cancel?: string;
    close?: string;
    delete?: string;
  };
};

export type Phase = {
  title: string;
  user_description: string;
  agent_prompt: string;
  graduation_challenge: {
    title: string;
    content: string;
  };
};

export type Config = {
  main_system_prompt: string;
  re_agent: string;
  prompts: {
    affirm_summary?: string;
  };
  sysprompts: {
    planner_agent?: string;
    info_agent?: string;
    interview_agent?: string;
    challenge_agent?: string;
    profile_agent?: string;
    rule_agent?: string;
    reflection_agent?: string;
    safe_agent?: string;
    affirm_agent?: string;
    affirm_writer_agent?: string;
    inventory_agent?: string;
    rituals_agent?: string;
    tag_agent?: string;
    voice_agent?: string;
    activity_agent?: string;
  };
  agent_names: {
    info_agent?: string;
    interview_agent?: string;
    challenge_agent?: string;
    profile_agent?: string;
    rule_agent?: string;
    reflection_agent?: string;
    safe_agent?: string;
    affirm_agent?: string;
    inventory_agent?: string;
    rituals_agent?: string;
    tag_agent?: string;
    voice_agent?: string;
    activity_agent?: string;
  };
  agent_descriptions: {
    info_agent?: string;
    interview_agent?: string;
    challenge_agent?: string;
    profile_agent?: string;
    rule_agent?: string;
    reflection_agent?: string;
    safe_agent?: string;
    affirm_agent?: string;
    inventory_agent?: string;
    rituals_agent?: string;
    tag_agent?: string;
    voice_agent?: string;
    activity_agent?: string;
  };
  profile_fields?: string[];
  mood_stages?: Record<string, string>;
  phases?: Phase[];
  ui_text?: UIText;
};

/**
 * Load and parse the configuration file from the platform-specific app config directory.
 *
 * Behavior:
 * - Resolves the application config directory using `appConfigDir()` and logs it to
 *   the console for debugging (`"Config directory (AppConfig):", configDir`).
 * - Reads the file named by `CONFIG_NAME` (default: `"config.json"`) from the
 *   Tauri `BaseDirectory.AppConfig` location via `readTextFile(...)`.
 * - Parses the file contents as JSON and returns the value typed as `Config`.
 *
 * Important details and caveats:
 * - The function returns the raw parsed object cast to `Config`. There is no
 *   runtime schema validation, so malformed or missing fields will not be caught
 *   here. Callers rely on optional chaining and default fallbacks when consuming
 *   the configuration (see `src/agents/agents.ts`).
 * - If the config file cannot be found or read, `readTextFile` will throw an
 *   exception. Call sites that call `getConfig()` (for example at app startup)
 *   should handle that error or ensure the config file exists.
 * - Because the codebase uses `??` fallback expressions when reading config
 *   values, individual fields (including `main_system_prompt`) may be omitted
 *   from the JSON and the application will continue to operate with defaults.
 *
 * Example usage:
 * const cfg = await getConfig();
 * const mainPrompt = cfg.main_system_prompt ?? "You are the main coordinating agent.";
 *
 * Returns:
 * - Promise<Config> resolving to the parsed configuration object.
 */
export async function getConfig(): Promise<Config> {
  let configDir: string | null = null;
  configDir = await appConfigDir();
  console.log("Config directory (AppConfig):", configDir);
  try {
    const contents = await readTextFile(CONFIG_NAME, {
      baseDir: CONFIG_BASE_DIR,
    });
    return JSON.parse(contents);
  } catch (error) {
    console.log("Config file not found or unreadable, using defaults:", error);
    // Return a default empty config when the file doesn't exist
    return {
      main_system_prompt: "",
      re_agent: "",
      prompts: {},
      sysprompts: {},
      agent_names: {},
      agent_descriptions: {},
    };
  }
}
