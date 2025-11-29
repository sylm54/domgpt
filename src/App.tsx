import { FC, useCallback, useEffect, useState } from "react";
import {
  createMemoryRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Main from "./pages/main";
import { InfoPromptDialog } from "./agents/info/info-dialog";
import { InterviewDialog } from "./agents/interview/interview-dialog";
import { ProfileView } from "./pages/profile";
import AffirmView from "./pages/affirm/view";
import { ReflectionView } from "./pages/reflection";
import { RuleView } from "./pages/rule";
import { SafeView } from "./pages/safe";
import { ChallengeView } from "./pages/challenge";
import InventoryView from "./pages/inventory/view";
import RitualsView from "./pages/rituals/view";
import VoiceView from "./pages/voice/view";
import { SettingsView } from "./pages/settings";
import { WorkflowsView } from "./pages/workflows";
import { ActivityView } from "./pages/activity";
import { logActivity } from "./pages/activity";
import { loadRituals, isRitualMissed, markRitualMissed } from "./pages/rituals";
import { isInitialized, initMainAgent, pushEvent } from "./agents/agents";
import { OpenRouter, HTTPClient } from "@openrouter/sdk";
import { OpenRouterModel } from "./lib/models/openrouterv2";
import { model as configModel } from "./config";
import { fetch } from "@tauri-apps/plugin-http";
import NavHeader from "./components/NavHeader";
import { ConfigProvider } from "./contexts/ConfigContext";
import { backgroundJobs, type BackgroundJob } from "./lib/backgroundJobs";
import { OnboardingView, isOnboardingCompleted } from "./pages/onboarding";

export const API_KEY_STORAGE = "openrouter_api_key";
const MODEL_STORAGE = "openrouter_model";

const TopRouteWrapper: FC = () => {
  const [ready, setReady] = useState(false);
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const initialize = useCallback(async (key: string, modelStr: string) => {
    try {
      if (!key || !modelStr) {
        throw new Error("API key and model string are required");
      }

      // Set model name in config model before initializing agents
      try {
        (configModel as OpenRouterModel).setModelName(modelStr);
      } catch (err) {
        console.warn("setModelName failed:", err);
      }

      const openRouter = new OpenRouter({
        apiKey: key,
        httpClient: new HTTPClient({
          fetcher: fetch,
        }),
      });

      await initMainAgent(openRouter);
      setReady(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err ?? "Unknown error");
      console.error("Initialization error:", msg);
      // throw err;
    }
  }, []);

  useEffect(() => {
    // Subscribe to background job changes
    const unsubscribe = backgroundJobs.subscribe(() => {
      setJobs(backgroundJobs.getJobs());
    });

    // Initialize with current jobs
    setJobs(backgroundJobs.getJobs());

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Ritual tracking interval
    const interval = setInterval(() => {
      const rituals = loadRituals();
      const now = new Date();
      rituals.forEach((ritual) => {
        if (isRitualMissed(ritual, now)) {
          markRitualMissed(ritual.id);
          pushEvent({
            category: "ritual",
            message: `User missed ritual: ${ritual.title}`,
          });
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Log session started
    logActivity("session_started", "Session started", "App opened");
  }, []);

  useEffect(() => {
    // On mount, check if onboarding is needed first
    const onboardingComplete = isOnboardingCompleted();

    if (!onboardingComplete) {
      // Redirect to onboarding if not completed
      navigate("/onboarding");
      return;
    }

    // Attempt an automatic initialization if both values exist
    const storedKey = localStorage.getItem(API_KEY_STORAGE);
    const storedModel = localStorage.getItem(MODEL_STORAGE);

    if (isInitialized()) {
      setReady(true);
      return;
    }

    if (storedKey && storedModel) {
      // Try auto-initialize with stored values
      initialize(storedKey, storedModel).catch(() => {
        // if it fails, redirect to settings
        navigate("/settings");
      });
    } else {
      // redirect to onboarding if API key missing (even if onboarding was marked complete)
      navigate("/onboarding");
    }
  }, [initialize, navigate]);

  // Always render onboarding page even if not ready
  if (location.pathname === "/onboarding") {
    return (
      <ConfigProvider>
        <Outlet />
      </ConfigProvider>
    );
  }

  // Always render settings page even if not ready
  if (location.pathname === "/settings") {
    return (
      <ConfigProvider>
        <NavHeader />
        <Outlet />
      </ConfigProvider>
    );
  }

  if (ready || isInitialized()) {
    return (
      <ConfigProvider>
        <NavHeader />
        <Outlet />
      </ConfigProvider>
    );
  }
  // Show loading visualization while checking initialization (for non-settings pages)
  const currentJob = jobs.length > 0 ? jobs[jobs.length - 1] : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 p-8">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">
            {currentJob ? currentJob.description : "Initializing..."}
          </h2>
          {currentJob?.progress !== undefined && (
            <div className="flex flex-col items-center gap-2 mt-2">
              <p className="text-muted-foreground text-sm">
                {currentJob.progress}% complete
              </p>
              <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${currentJob.progress}%` }}
                />
              </div>
            </div>
          )}
          {!currentJob && (
            <p className="text-muted-foreground text-sm">
              Setting up your workspace
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const router = createMemoryRouter(
  createRoutesFromElements(
    <Route path="/" element={<TopRouteWrapper />}>
      <Route path="menu" element={<Main />} />
      <Route path="profile" element={<ProfileView />} />
      <Route path="reflection" element={<ReflectionView />} />
      <Route path="rule" element={<RuleView />} />
      <Route path="safe" element={<SafeView />} />
      <Route path="affirm" element={<AffirmView />} />
      <Route path="challenge" element={<ChallengeView />} />
      <Route path="inventory" element={<InventoryView />} />
      <Route path="rituals" element={<RitualsView />} />
      <Route path="voice" element={<VoiceView />} />
      <Route path="workflows" element={<WorkflowsView />} />
      <Route path="activity" element={<ActivityView />} />
      <Route path="settings" element={<SettingsView />} />
      <Route path="onboarding" element={<OnboardingView />} />
    </Route>,
  ),
  {
    initialEntries: ["/menu"],
  },
);

function App() {
  return (
    <main className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <RouterProvider router={router} />
      </div>
      <InfoPromptDialog />
      <InterviewDialog />
    </main>
  );
}

export default App;
