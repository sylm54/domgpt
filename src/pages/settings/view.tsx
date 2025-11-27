import { useState, useEffect, useId } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { initMainAgent } from "@/agents/agents";
import { OpenRouter, HTTPClient } from "@openrouter/sdk";
import { OpenRouterModel } from "@/lib/models/openrouterv2";
import {
  model as configModel,
  talkmodel as configTalkModel,
  affirmmodel as configAffirmModel,
} from "@/config";
import { fetch } from "@tauri-apps/plugin-http";
import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import {
  Save,
  Download,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  Settings2Icon,
  DatabaseIcon,
  KeyIcon,
  CpuIcon,
  FileJson,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { useConfig } from "@/contexts/ConfigContext";

const API_KEY_STORAGE = "openrouter_api_key";
export const MODEL_STORAGE = "openrouter_model";
export const TALK_MODEL_STORAGE = "openrouter_talk_model";
export const AFFIRM_MODEL_STORAGE = "openrouter_affirm_model";

export default function SettingsView() {
  const { uiText } = useConfig();
  const [apiKey, setApiKey] = useState<string>("");
  const [modelName, setModelName] = useState<string>("");
  const [talkModelName, setTalkModelName] = useState<string>("");
  const [affirmModelName, setAffirmModelName] = useState<string>("");

  const apiKeyId = useId();
  const modelId = useId();
  const talkModelId = useId();
  const affirmModelId = useId();

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [exportStatus, setExportStatus] = useState<string>("");
  const [importStatus, setImportStatus] = useState<string>("");
  const [configImportStatus, setConfigImportStatus] = useState<string>("");

  useEffect(() => {
    // Load existing values
    const storedKey = localStorage.getItem(API_KEY_STORAGE) || "";
    const storedModel = localStorage.getItem(MODEL_STORAGE) || "";
    const storedTalk = localStorage.getItem(TALK_MODEL_STORAGE) || "";
    const storedAffirm = localStorage.getItem(AFFIRM_MODEL_STORAGE) || "";
    setApiKey(storedKey);
    setModelName(storedModel);
    setTalkModelName(storedTalk);
    setAffirmModelName(storedAffirm);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);

    try {
      if (!apiKey.trim() || !modelName.trim()) {
        throw new Error("API key and main model string are required");
      }

      // Persist values
      localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
      localStorage.setItem(MODEL_STORAGE, modelName.trim());
      if (talkModelName.trim()) {
        localStorage.setItem(TALK_MODEL_STORAGE, talkModelName.trim());
      } else {
        localStorage.removeItem(TALK_MODEL_STORAGE);
      }
      if (affirmModelName.trim()) {
        localStorage.setItem(AFFIRM_MODEL_STORAGE, affirmModelName.trim());
      } else {
        localStorage.removeItem(AFFIRM_MODEL_STORAGE);
      }

      // Set model name in config models before initializing agents
      try {
        (configModel as OpenRouterModel).setModelName(modelName.trim());
      } catch (err) {
        console.warn("setModelName for main model failed:", err);
      }

      try {
        (configTalkModel as OpenRouterModel).setModelName(
          talkModelName.trim() || modelName.trim(),
        );
      } catch (err) {
        console.warn("setModelName for talk model failed:", err);
      }

      try {
        (configAffirmModel as OpenRouterModel).setModelName(
          affirmModelName.trim() || modelName.trim(),
        );
      } catch (err) {
        console.warn("setModelName for affirm model failed:", err);
      }

      const openRouter = new OpenRouter({
        apiKey: apiKey.trim(),
        httpClient: new HTTPClient({
          fetcher: fetch,
        }),
      });

      await initMainAgent(openRouter);

      setSaveStatus({
        type: "success",
        message: "Settings saved and initialized successfully!",
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err ?? "Unknown error");
      console.error("Save error:", msg);
      setSaveStatus({ type: "error", message: `Failed to save: ${msg}` });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    try {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || "";
        }
      }

      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setExportStatus("Exported to clipboard!");
      setTimeout(() => setExportStatus(""), 3000);
    } catch (err) {
      console.error("Failed to export localStorage:", err);
      setExportStatus("Failed to export");
      setTimeout(() => setExportStatus(""), 3000);
    }
  };

  const handleImport = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();

      let data: Record<string, string>;
      try {
        data = JSON.parse(clipboardText);
      } catch (parseErr) {
        setImportStatus("Invalid JSON in clipboard");
        setTimeout(() => setImportStatus(""), 3000);
        return;
      }

      const keyCount = Object.keys(data).length;
      if (
        !window.confirm(
          `Import ${keyCount} item(s) from clipboard? This will overwrite existing data and reload the app.`,
        )
      ) {
        return;
      }

      localStorage.clear();
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, value);
      }

      setImportStatus("Imported! Reloading...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Failed to import localStorage:", err);
      setImportStatus("Failed to import");
      setTimeout(() => setImportStatus(""), 3000);
    }
  };

  const handleClear = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all local storage? This will reset the app.",
      )
    ) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleConfigImport = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();

      // Validate JSON
      let configData: unknown;
      try {
        configData = JSON.parse(clipboardText);
      } catch (parseErr) {
        setConfigImportStatus("Invalid JSON in clipboard");
        setTimeout(() => setConfigImportStatus(""), 3000);
        return;
      }

      // Basic validation - check it's an object
      if (typeof configData !== "object" || configData === null) {
        setConfigImportStatus("Config must be a JSON object");
        setTimeout(() => setConfigImportStatus(""), 3000);
        return;
      }

      if (
        !window.confirm(
          "Import config.json from clipboard? This will overwrite the existing config file and reload the app.",
        )
      ) {
        return;
      }

      // Write to config.json in AppConfig directory
      await writeTextFile("config.json", JSON.stringify(configData, null, 2), {
        baseDir: BaseDirectory.AppConfig,
      });

      setConfigImportStatus("Config imported! Reloading...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Failed to import config:", err);
      setConfigImportStatus(
        `Failed to import config: ${err instanceof Error ? err.message : String(err)}`,
      );
      setTimeout(() => setConfigImportStatus(""), 5000);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title={uiText.settings?.title || "Settings"}
        subtitle={
          uiText.settings?.subtitle ||
          "Configure your API key, model, and manage data"
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-32">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* API Configuration */}
          <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border border-pink-200/50 dark:border-pink-500/20">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center shadow-md">
                <Settings2Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {uiText.settings?.api_config_title || "API Configuration"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {uiText.settings?.api_config_desc ||
                    "Configure your OpenRouter API key and model for AI interactions"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor={apiKeyId}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <KeyIcon className="w-4 h-4 text-pink-500" />
                  {uiText.settings?.api_key_label || "API Key"}
                </label>
                <Input
                  id={apiKeyId}
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={modelId}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <CpuIcon className="w-4 h-4 text-pink-500" />
                  {uiText.settings?.model_label || "Model String"}
                </label>
                <Input
                  id={modelId}
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g., gpt-4o-mini or x-ai/grok-4.1-fast"
                  className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={talkModelId}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <CpuIcon className="w-4 h-4 text-pink-500" />
                  {uiText.settings?.talk_model_label || "Talk Model String"}
                </label>
                <Input
                  id={talkModelId}
                  value={talkModelName}
                  onChange={(e) => setTalkModelName(e.target.value)}
                  placeholder="Optional. If empty, main model will be used."
                  className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={affirmModelId}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <CpuIcon className="w-4 h-4 text-pink-500" />
                  {uiText.settings?.affirm_model_label || "Affirm Model String"}
                </label>
                <Input
                  id={affirmModelId}
                  value={affirmModelName}
                  onChange={(e) => setAffirmModelName(e.target.value)}
                  placeholder="Optional. If empty, main model will be used."
                  className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-5 rounded-xl shadow-lg shadow-pink-300/30 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving
                  ? uiText.settings?.saving_label || "Saving..."
                  : uiText.settings?.save_label || "Save & Initialize"}
              </Button>

              {saveStatus && (
                <div
                  className={`flex items-center gap-3 p-4 rounded-xl ${
                    saveStatus.type === "success"
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30"
                      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30"
                  }`}
                >
                  {saveStatus.type === "success" ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium">
                    {saveStatus.message}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border border-pink-200/50 dark:border-pink-500/20">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center shadow-md">
                <DatabaseIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {uiText.settings?.data_management_title || "Data Management"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {uiText.settings?.data_management_desc ||
                    "Export, import, or clear your local data"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleExport}
                variant="outline"
                className="w-full justify-start border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl py-5"
              >
                <Download className="w-4 h-4 mr-3 text-pink-500" />
                <span className="font-medium">
                  {uiText.settings?.export_label ||
                    "Export LocalStorage to Clipboard"}
                </span>
              </Button>
              {exportStatus && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium pl-3">
                  {exportStatus}
                </p>
              )}

              <Button
                onClick={handleImport}
                variant="outline"
                className="w-full justify-start border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl py-5"
              >
                <Upload className="w-4 h-4 mr-3 text-pink-500" />
                <span className="font-medium">
                  {uiText.settings?.import_label ||
                    "Import LocalStorage from Clipboard"}
                </span>
              </Button>
              {importStatus && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium pl-3">
                  {importStatus}
                </p>
              )}

              <Button
                onClick={handleConfigImport}
                variant="outline"
                className="w-full justify-start border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl py-5"
              >
                <FileJson className="w-4 h-4 mr-3 text-pink-500" />
                <span className="font-medium">
                  Import Config from Clipboard
                </span>
              </Button>
              {configImportStatus && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium pl-3">
                  {configImportStatus}
                </p>
              )}

              <div className="pt-3 mt-3 border-t border-pink-200/50 dark:border-pink-500/20">
                <Button
                  onClick={handleClear}
                  variant="outline"
                  className="w-full justify-start border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-500/30 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl py-5"
                >
                  <Trash2 className="w-4 h-4 mr-3" />
                  <span className="font-medium">
                    {uiText.settings?.clear_label || "Clear All LocalStorage"}
                  </span>
                </Button>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 rounded-2xl p-5 border border-pink-200/50 dark:border-pink-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <Settings2Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  About Settings
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your API key is stored locally and never sent to our servers.
                  You can export your data for backup or transfer to another
                  device. Clearing storage will reset all your data including
                  progress, achievements, and settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
