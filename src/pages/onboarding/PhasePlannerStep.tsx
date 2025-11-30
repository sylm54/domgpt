import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Chat } from "@/components/ui/shadcn-io/ai/chat";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Trash2,
  Loader2,
  MessageSquare,
  ListChecks,
} from "lucide-react";
import { createPhasePlannerAgent } from "@/agents/phase-planner";
import { usePhases, clearPhases } from "@/lib/phase";
import type { Phase } from "@/config";
import { cn } from "@/lib/utils";

// Storage key for onboarding completion
const ONBOARDING_COMPLETED = "onboarding_completed";

interface StepProps {
  onComplete: () => void;
  onBack?: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

// Phase card component for displaying individual phases
function PhaseCard({
  phase,
  index,
  isLast,
}: {
  phase: Phase;
  index: number;
  isLast: boolean;
}) {
  return (
    <div className="relative">
      <div className="bg-white/80 dark:bg-card/80 rounded-xl p-4 border border-pink-200/50 dark:border-pink-500/20 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground text-sm truncate">
              {phase.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {phase.user_description}
            </p>
            <div className="mt-2 pt-2 border-t border-pink-100 dark:border-pink-500/10">
              <p className="text-xs text-pink-600 dark:text-pink-400 font-medium">
                Challenge: {phase.graduation_challenge.title}
              </p>
            </div>
          </div>
        </div>
      </div>
      {!isLast && (
        <div className="absolute left-7 top-full w-0.5 h-3 bg-pink-200 dark:bg-pink-500/30" />
      )}
    </div>
  );
}

// Phases display panel
function PhasesPanel({ phases }: { phases: Phase[] }) {
  if (phases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-pink-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Phases Yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Chat with the assistant to create your personalized journey phases.
          They'll appear here as you create them.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">
          Your Journey ({phases.length} phase{phases.length !== 1 ? "s" : ""})
        </h3>
      </div>
      {phases.map((phase, index) => (
        <PhaseCard
          key={`phase-${index}-${phase.title}`}
          phase={phase}
          index={index}
          isLast={index === phases.length - 1}
        />
      ))}
    </div>
  );
}

// Mobile tab type
type MobileTab = "chat" | "phases";

export default function PhasePlannerStep({ onBack, isFirstStep }: StepProps) {
  const phases = usePhases();
  const [completing, setCompleting] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");

  // Create agent using system prompt from config
  const agent = useMemo(() => {
    return createPhasePlannerAgent();
  }, []);

  const handleClearPhases = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to clear all phases? This cannot be undone.",
      )
    ) {
      clearPhases();
    }
  }, []);

  const handleComplete = useCallback(() => {
    setCompleting(true);
    // Mark onboarding as completed
    localStorage.setItem(ONBOARDING_COMPLETED, "true");
    // Reload the app to start with the new configuration
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, []);

  const canContinue = phases.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-pink-200/50 dark:border-pink-500/20 bg-white/50 dark:bg-card/50">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
              Plan Your Journey
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Chat with the AI to create your personalized phases
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearPhases}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 sm:px-3"
            disabled={phases.length === 0}
          >
            <Trash2 className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border-b border-pink-200/50 dark:border-pink-500/20 bg-white/30 dark:bg-card/30">
        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
            mobileTab === "chat"
              ? "text-pink-600 dark:text-pink-400 border-b-2 border-pink-500"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("phases")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative",
            mobileTab === "phases"
              ? "text-pink-600 dark:text-pink-400 border-b-2 border-pink-500"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ListChecks className="w-4 h-4" />
          Phases
          {phases.length > 0 && (
            <span className="absolute top-2 right-[calc(50%-2rem)] w-5 h-5 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">
              {phases.length}
            </span>
          )}
        </button>
      </div>

      {/* Main content: Chat + Phases panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat section - hidden on mobile when viewing phases */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0",
            mobileTab === "phases" ? "hidden md:flex" : "flex",
          )}
        >
          <Chat
            agent={agent}
            className="flex-1"
            placeholder="Tell me about your goals and what you'd like to achieve..."
          />
        </div>

        {/* Phases panel - full width on mobile, fixed width on desktop */}
        <div
          className={cn(
            "bg-gradient-to-b from-pink-50/50 to-white dark:from-pink-950/10 dark:to-card flex flex-col",
            "md:w-80 md:border-l md:border-pink-200/50 md:dark:border-pink-500/20",
            mobileTab === "chat" ? "hidden md:flex" : "flex-1 md:flex-none",
          )}
        >
          <div className="flex-1 overflow-hidden">
            <PhasesPanel phases={phases} />
          </div>
        </div>
      </div>

      {/* Footer with navigation */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t border-pink-200/50 dark:border-pink-500/20 bg-white/50 dark:bg-card/50 gap-2">
        <div className="flex-shrink-0">
          {!isFirstStep && onBack && (
            <Button
              onClick={onBack}
              variant="outline"
              className="py-4 sm:py-5 px-3 sm:px-5 rounded-xl border-pink-200 dark:border-pink-500/30"
            >
              <ChevronLeft className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {!canContinue && (
            <p className="text-xs sm:text-sm text-muted-foreground hidden xs:block truncate">
              Create at least one phase to continue
            </p>
          )}
          <Button
            onClick={handleComplete}
            disabled={!canContinue || completing}
            className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-4 sm:py-5 px-4 sm:px-6 rounded-xl shadow-lg shadow-pink-300/30 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {completing ? (
              <>
                <Loader2 className="w-5 h-5 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Starting...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Complete Setup</span>
                <span className="sm:hidden">Complete</span>
                <ChevronRight className="w-5 h-5 sm:ml-2 hidden sm:block" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
