import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getConfig, type Config, type UIText } from "@/config";

// Default UI text fallbacks
const defaultUIText: UIText = {
  profile: {
    title: "Profile",
    achievements_label: "Achievements",
    journey_label: "Your Journey",
    no_achievements: "No achievements yet",
    no_achievements_desc: "Achievements will be added by your AI assistant as you make progress",
  },
  rituals: {
    title: "Rituals",
    subtitle: "Build habits with scheduled routines managed by your agent.",
    mark_done_label: "Mark as Done",
    no_rituals: "No Rituals Yet",
    no_rituals_desc: 'Ask your agent to create a new ritual for you. For example: "Create a morning ritual for 7am."',
    missed_label: "Missed",
  },
  affirm: {
    title: "Affirmations",
    streak_label: "Day Streak",
    prompt_agent_label: "Prompt Agent",
    no_audio: "No affirmation audio configured yet.",
    play_label: "Play in Player",
    download_label: "Download",
  },
  reflection: {
    title: "Daily Reflection",
    save_label: "Save Reflection",
    saved_label: "Saved",
    streak_label: "day streak",
    total_label: "total reflections",
    prev_day_label: "← Previous Day",
    next_day_label: "Next Day →",
    today_label: "Today",
    no_reflection: "No reflection recorded for this day",
    placeholder: "Write your reflection here...",
  },
  rule: {
    title: "Rules",
    streak_label: "Day Streak",
    no_rules: "No rules yet!",
    break_label: "Log a break",
    recent_breaks_label: "Recent breaks:",
  },
  safe: {
    title: "Safe",
    locked_subtitle: "Locked - Only AI can unlock",
    unlocked_subtitle: "Unlocked",
    locked_desc: "Your key is safely locked. Only the AI assistant can unlock it.",
    unlocked_desc: "You can lock a key in the safe. Once locked, only the AI assistant can retrieve it.",
    lock_label: "Lock Safe",
    locked_duration_label: "Locked Duration",
    enter_key_label: "Enter Key to Lock",
    placeholder: "Enter your key here (e.g., password, secret, code)...",
  },
  challenge: {
    title: "Challenges",
    no_challenges: "No challenges yet",
    no_challenges_desc: "Add your first challenge to get started on your self-improvement journey",
    completed_label: "Completed",
  },
  inventory: {
    title: "Inventory",
    no_items: "No items yet",
    no_items_desc: "Start adding items to your inventory",
    upload_label: "Upload",
    camera_label: "Camera",
  },
  voice: {
    title: "Voice Training",
    subtitle: "Practice and analyze your voice",
    record_label: "Record",
    stop_label: "Stop",
    analyze_label: "Analyze",
    dry_run_label: "Dry Run",
  },
  settings: {
    title: "Settings",
    subtitle: "Configure your API key, model, and manage data",
    api_config_title: "API Configuration",
    api_config_desc: "Configure your OpenRouter API key and model for AI interactions",
    api_key_label: "API Key",
    model_label: "Model String",
    save_label: "Save & Initialize",
    saving_label: "Saving...",
    data_management_title: "Data Management",
    data_management_desc: "Export, import, or clear your local data",
    export_label: "Export LocalStorage to Clipboard",
    import_label: "Import LocalStorage from Clipboard",
    clear_label: "Clear All LocalStorage",
  },
  common: {
    loading: "Loading...",
    error: "An error occurred",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
  },
};

type ConfigContextType = {
  config: Config | null;
  uiText: UIText;
  loading: boolean;
};

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  uiText: defaultUIText,
  loading: true,
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConfig()
      .then((cfg) => {
        setConfig(cfg);
      })
      .catch((err) => {
        console.warn("Failed to load config, using defaults:", err);
        setConfig(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Merge config UI text with defaults
  const uiText: UIText = {
    profile: { ...defaultUIText.profile, ...config?.ui_text?.profile },
    rituals: { ...defaultUIText.rituals, ...config?.ui_text?.rituals },
    affirm: { ...defaultUIText.affirm, ...config?.ui_text?.affirm },
    reflection: { ...defaultUIText.reflection, ...config?.ui_text?.reflection },
    rule: { ...defaultUIText.rule, ...config?.ui_text?.rule },
    safe: { ...defaultUIText.safe, ...config?.ui_text?.safe },
    challenge: { ...defaultUIText.challenge, ...config?.ui_text?.challenge },
    inventory: { ...defaultUIText.inventory, ...config?.ui_text?.inventory },
    voice: { ...defaultUIText.voice, ...config?.ui_text?.voice },
    settings: { ...defaultUIText.settings, ...config?.ui_text?.settings },
    common: { ...defaultUIText.common, ...config?.ui_text?.common },
  };

  return (
    <ConfigContext.Provider value={{ config, uiText, loading }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within ConfigProvider");
  }
  return context;
}
