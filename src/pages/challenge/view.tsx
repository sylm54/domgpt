import { useState, useEffect, useId } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, TargetIcon, TrophyIcon } from "lucide-react";
import type { Challenge } from "./types";
import {
  loadChallenges,
  toggleChallengeCompletion,
  onChallengeChange,
} from "./types";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useConfig } from "@/contexts/ConfigContext";

export default function ChallengeView() {
  const { uiText } = useConfig();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const mainId = useId();

  useEffect(() => {
    const clearListeners = onChallengeChange((rules) => {
      setChallenges(rules);
    });
    return clearListeners;
  }, []);

  // Load challenges on mount
  useEffect(() => {
    const loaded = loadChallenges();
    setChallenges(loaded);
  }, []);

  const handleToggleComplete = (id: string) => {
    const updated = toggleChallengeCompletion(challenges, id);
    setChallenges(updated);
  };

  const completedCount = challenges.filter((c) => c.completed).length;
  const totalCount = challenges.length;

  return (
    <PageLayout>
      <PageHeader
        title={uiText.challenge?.title || "Challenges"}
        subtitle={
          totalCount > 0 ? (
            <div className="flex items-center gap-2">
              <TrophyIcon className="w-4 h-4" />
              <span>
                {completedCount} / {totalCount}{" "}
                {uiText.challenge?.completed_label || "Completed"}
              </span>
            </div>
          ) : null
        }
      />

      {/* Challenge List */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-32"
        id={mainId}
      >
        {challenges.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <EmptyState
              icon={TargetIcon}
              title={uiText.challenge?.no_challenges || "No challenges yet"}
              description={
                uiText.challenge?.no_challenges_desc ||
                "Add your first challenge to get started on your self-improvement journey"
              }
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Progress Card */}
            {totalCount > 0 && (
              <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl p-5 sm:p-6 shadow-lg shadow-pink-300/30 dark:shadow-pink-900/30 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <TrophyIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-white">
                        {completedCount} / {totalCount}
                      </h3>
                      <p className="text-white/80 text-sm mt-0.5">
                        Challenges completed
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="text-white/70 text-xs mt-2 text-right">
                  {Math.round(
                    totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
                  )}
                  % complete
                </p>
              </div>
            )}

            {/* Challenges Grid */}
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className={cn(
                    "bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border transition-all duration-200 hover:shadow-xl",
                    challenge.completed
                      ? "border-green-200/50 dark:border-green-500/20 bg-green-50/50 dark:bg-green-900/10"
                      : "border-pink-200/50 dark:border-pink-500/20 hover:border-pink-300/50 dark:hover:border-pink-500/30",
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(challenge.id)}
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-xl border-2 transition-all duration-200 flex items-center justify-center",
                        "focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:ring-offset-2",
                        challenge.completed
                          ? "bg-gradient-to-br from-green-400 to-green-500 border-green-400 text-white shadow-md shadow-green-300/30"
                          : "border-pink-300 dark:border-pink-500/50 hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20",
                      )}
                    >
                      {challenge.completed && <CheckIcon className="w-5 h-5" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={cn(
                          "font-bold text-lg mb-1 transition-colors",
                          challenge.completed
                            ? "line-through text-muted-foreground"
                            : "text-foreground",
                        )}
                      >
                        {challenge.title}
                      </h3>
                      <p
                        className={cn(
                          "text-sm whitespace-pre-wrap break-words leading-relaxed",
                          challenge.completed
                            ? "line-through text-muted-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {challenge.body}
                      </p>
                      {challenge.completed && challenge.completedAt && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-green-200/50 dark:border-green-500/20">
                          <TrophyIcon className="w-4 h-4 text-green-500" />
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Completed{" "}
                            {new Date(challenge.completedAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 rounded-2xl p-5 border border-pink-200/50 dark:border-pink-500/20 mt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <TargetIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    About Challenges
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Challenges are goals or tasks that push you to grow. Tap the
                    checkbox to mark a challenge as complete. Ask your AI
                    assistant to add new challenges tailored to your journey!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
