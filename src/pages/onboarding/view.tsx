import { useState, useEffect, useId, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { initMainAgent } from "@/agents/agents";
import { OpenRouter, HTTPClient } from "@openrouter/sdk";
import type { OpenRouterModel } from "@/lib/models/openrouterv2";
import {
  model as configModel,
  talkmodel as configTalkModel,
  affirmmodel as configAffirmModel,
} from "@/config";
import { fetch } from "@tauri-apps/plugin-http";
import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import {
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  KeyIcon,
  CpuIcon,
  FileJson,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";

// Storage keys
const API_KEY_STORAGE = "openrouter_api_key";
const MODEL_STORAGE = "openrouter_model";
const TALK_MODEL_STORAGE = "openrouter_talk_model";
const AFFIRM_MODEL_STORAGE = "openrouter_affirm_model";
const ONBOARDING_COMPLETED = "onboarding_completed";
const ONBOARDING_STEP = "onboarding_current_step";

// TTS progress event type
interface TtsProgressEvent {
  job_id: string;
  message: string;
  progress: number;
  stage: string;
}

// Step definition for extensibility
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.FC<StepProps>;
  canSkip?: boolean;
}

interface StepProps {
  onComplete: () => void;
  onBack?: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

// Step 1: Download Models
function DownloadModelsStep({ onComplete }: StepProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [modelsExist, setModelsExist] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if models already exist
    const checkModels = async () => {
      try {
        const exists = await invoke<boolean>("check_tts_models");
        setModelsExist(exists);
        if (exists) {
          setCompleted(true);
          setMessage("Models already downloaded!");
          setProgress(100);
        }
      } catch (err) {
        console.error("Failed to check models:", err);
        setModelsExist(false);
      }
    };
    checkModels();
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    setProgress(0);
    setMessage("Starting download...");

    let unlisten: UnlistenFn | undefined;

    try {
      unlisten = await listen<TtsProgressEvent>("tts-progress", (event) => {
        setProgress(Math.round(event.payload.progress * 100));
        setMessage(event.payload.message);
      });

      await invoke("download_tts_models");
      setCompleted(true);
      setProgress(100);
      setMessage("All models downloaded successfully!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Download failed: ${errorMsg}`);
      setProgress(0);
    } finally {
      setDownloading(false);
      if (unlisten) {
        unlisten();
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 max-w-xl mx-auto">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center mb-6 shadow-lg">
        <Download className="w-10 h-10 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
        Download Voice Models
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        The app needs to download AI models for text-to-speech functionality.
        This is a one-time download of approximately 200MB.
      </p>

      {modelsExist === null ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Checking for existing models...</span>
        </div>
      ) : (
        <>
          {(downloading || completed) && (
            <div className="w-full mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{message}</span>
                <span className="font-medium text-pink-500">{progress}%</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30 mb-6 w-full">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {completed ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30 mb-6 w-full">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Models ready!</span>
            </div>
          ) : (
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 px-8 rounded-xl shadow-lg shadow-pink-300/30"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download Models
                </>
              )}
            </Button>
          )}
        </>
      )}

      {completed && (
        <Button
          onClick={onComplete}
          className="mt-6 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 px-8 rounded-xl shadow-lg"
        >
          Continue
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      )}
    </div>
  );
}

// Step 2: Import Config (Optional)
function ImportConfigStep({ onComplete, onBack, isFirstStep }: StepProps) {
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const handleConfigImport = async () => {
    setImporting(true);
    try {
      const clipboardText = await readText();

      let configData: unknown;
      try {
        configData = JSON.parse(clipboardText);
      } catch {
        setImportStatus({
          type: "error",
          message: "Invalid JSON in clipboard",
        });
        setImporting(false);
        return;
      }

      if (typeof configData !== "object" || configData === null) {
        setImportStatus({
          type: "error",
          message: "Config must be a JSON object",
        });
        setImporting(false);
        return;
      }

      await writeTextFile("config.json", JSON.stringify(configData, null, 2), {
        baseDir: BaseDirectory.AppConfig,
      });

      // Save onboarding progress before reload
      localStorage.setItem(ONBOARDING_STEP, "2");

      setImportStatus({
        type: "success",
        message: "Config imported! Reloading...",
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Failed to import config:", err);
      setImportStatus({
        type: "error",
        message: `Failed to import: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleLocalStorageImport = async () => {
    setImporting(true);
    try {
      const clipboardText = await readText();

      let data: Record<string, string>;
      try {
        data = JSON.parse(clipboardText);
      } catch {
        setImportStatus({
          type: "error",
          message: "Invalid JSON in clipboard",
        });
        setImporting(false);
        return;
      }

      const keyCount = Object.keys(data).length;
      if (
        !window.confirm(
          `Import ${keyCount} item(s) from clipboard? This will merge with existing data and reload the app.`,
        )
      ) {
        setImporting(false);
        return;
      }

      // Save current onboarding step
      const currentStep = localStorage.getItem(ONBOARDING_STEP);

      // Import data
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, value);
      }

      // Restore onboarding step if we're mid-onboarding
      if (currentStep) {
        localStorage.setItem(ONBOARDING_STEP, currentStep);
      }

      setImportStatus({ type: "success", message: "Imported! Reloading..." });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Failed to import localStorage:", err);
      setImportStatus({
        type: "error",
        message: "Failed to import from clipboard",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 max-w-xl mx-auto">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center mb-6 shadow-lg">
        <FileJson className="w-10 h-10 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
        Import Configuration
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        If you have an existing configuration or backup, you can import it now.
        This step is optional.
      </p>

      <div className="w-full space-y-4 mb-6">
        <Button
          onClick={handleConfigImport}
          disabled={importing}
          variant="outline"
          className="w-full justify-start border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl py-5"
        >
          <FileJson className="w-5 h-5 mr-3 text-pink-500" />
          <span className="font-medium">Import Config from Clipboard</span>
        </Button>

        <Button
          onClick={handleLocalStorageImport}
          disabled={importing}
          variant="outline"
          className="w-full justify-start border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl py-5"
        >
          <Upload className="w-5 h-5 mr-3 text-pink-500" />
          <span className="font-medium">
            Import LocalStorage from Clipboard
          </span>
        </Button>
      </div>

      {importStatus && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl mb-6 w-full ${
            importStatus.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30"
              : importStatus.type === "error"
                ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30"
                : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
          }`}
        >
          {importStatus.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{importStatus.message}</span>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        {!isFirstStep && onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            className="py-6 px-6 rounded-xl border-pink-200 dark:border-pink-500/30"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
        )}
        <Button
          onClick={onComplete}
          className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 px-8 rounded-xl shadow-lg"
        >
          {importing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
          Skip / Continue
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 3: API Key Setup
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ApiKeySetupStep({ onComplete, onBack, isFirstStep }: StepProps) {
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [talkModelName, setTalkModelName] = useState("");
  const [affirmModelName, setAffirmModelName] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const apiKeyId = useId();
  const modelId = useId();
  const talkModelId = useId();
  const affirmModelId = useId();

  // Load existing values on mount
  useEffect(() => {
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
    setStatus(null);

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

      // Set model name in config models
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

      // Mark onboarding as complete
      localStorage.setItem(ONBOARDING_COMPLETED, "true");
      localStorage.removeItem(ONBOARDING_STEP);

      setStatus({
        type: "success",
        message: "Setup complete! Launching app...",
      });

      // Reload to start the app
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err ?? "Unknown error");
      console.error("Save error:", msg);
      setStatus({ type: "error", message: `Failed to save: ${msg}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 max-w-xl mx-auto overflow-y-auto">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center mb-6 shadow-lg">
        <KeyIcon className="w-10 h-10 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
        API Configuration
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        Enter your OpenRouter API key and choose your preferred AI model.
      </p>

      <div className="w-full space-y-4 mb-6">
        <div className="space-y-2">
          <label
            htmlFor={apiKeyId}
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <KeyIcon className="w-4 h-4 text-pink-500" />
            API Key *
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
            Model String *
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
            Talk Model String (Optional)
          </label>
          <Input
            id={talkModelId}
            value={talkModelName}
            onChange={(e) => setTalkModelName(e.target.value)}
            placeholder="If empty, main model will be used"
            className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor={affirmModelId}
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <CpuIcon className="w-4 h-4 text-pink-500" />
            Affirm Model String (Optional)
          </label>
          <Input
            id={affirmModelId}
            value={affirmModelName}
            onChange={(e) => setAffirmModelName(e.target.value)}
            placeholder="If empty, main model will be used"
            className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl"
          />
        </div>
      </div>

      {status && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl mb-6 w-full ${
            status.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{status.message}</span>
        </div>
      )}

      <div className="flex gap-3">
        {!isFirstStep && onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            className="py-6 px-6 rounded-xl border-pink-200 dark:border-pink-500/30"
            disabled={saving}
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={saving || !apiKey.trim() || !modelName.trim()}
          className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 px-8 rounded-xl shadow-lg shadow-pink-300/30 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Complete Setup
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Define the onboarding steps - easily extensible
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "download-models",
    title: "Download Models",
    description: "Download AI voice models",
    component: DownloadModelsStep,
    canSkip: false,
  },
  {
    id: "import-config",
    title: "Import Config",
    description: "Import existing configuration",
    component: ImportConfigStep,
    canSkip: true,
  },
  {
    id: "api-setup",
    title: "API Setup",
    description: "Configure your API key",
    component: ApiKeySetupStep,
    canSkip: false,
  },
];

// Main Onboarding View
export default function OnboardingView() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Restore progress from localStorage on mount
  useEffect(() => {
    const savedStep = localStorage.getItem(ONBOARDING_STEP);
    if (savedStep) {
      const stepIndex = parseInt(savedStep, 10);
      if (
        !Number.isNaN(stepIndex) &&
        stepIndex >= 0 &&
        stepIndex < ONBOARDING_STEPS.length
      ) {
        setCurrentStepIndex(stepIndex);
      }
    }
  }, []);

  // Save current step to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(ONBOARDING_STEP, currentStepIndex.toString());
  }, [currentStepIndex]);

  const handleStepComplete = useCallback(() => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex]);

  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const StepComponent = currentStep.component;

  return (
    <PageLayout>
      {/* Header */}
      <div className="border-b border-pink-200/50 bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 px-4 sm:px-6 py-4 sm:py-5 shadow-lg">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm mb-2">
            Welcome! Let's Get Started
          </h1>
          <p className="text-white/80 text-sm">
            Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="px-6 py-4 bg-white/50 dark:bg-card/50 border-b border-pink-200/30">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between">
            {ONBOARDING_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
                    index < currentStepIndex
                      ? "bg-green-500 text-white"
                      : index === currentStepIndex
                        ? "bg-pink-500 text-white ring-4 ring-pink-200 dark:ring-pink-500/30"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div
                    className={`w-16 sm:w-24 h-1 mx-2 rounded-full transition-all ${
                      index < currentStepIndex
                        ? "bg-green-500"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {ONBOARDING_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`text-xs text-center w-20 ${
                  index === currentStepIndex
                    ? "text-pink-600 dark:text-pink-400 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {step.title}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <StepComponent
          onComplete={handleStepComplete}
          onBack={handleBack}
          isFirstStep={currentStepIndex === 0}
          isLastStep={currentStepIndex === ONBOARDING_STEPS.length - 1}
        />
      </div>
    </PageLayout>
  );
}

// Helper function to check if onboarding is completed
export function isOnboardingCompleted(): boolean {
  return localStorage.getItem(ONBOARDING_COMPLETED) === "true";
}

// Helper function to reset onboarding (for testing)
export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_COMPLETED);
  localStorage.removeItem(ONBOARDING_STEP);
}
