import { useEffect, useState } from "react";
import {
  loadRituals,
  Ritual,
  markRitualDone,
  getTodayDateString,
  isRitualActive,
} from "./types";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  SparklesIcon,
  SunIcon,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useConfig } from "@/contexts/ConfigContext";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RitualsView() {
  const { uiText } = useConfig();
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setRituals(loadRituals());
    const interval = setInterval(() => {
      setNow(new Date());
      // Reload rituals to get latest status updates if any
      setRituals(loadRituals());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const handleMarkDone = (id: string) => {
    markRitualDone(id);
    setRituals(loadRituals());
  };

  const todayStr = getTodayDateString();

  // Count stats
  const todayRituals = rituals.filter((r) =>
    r.schedule.days.includes(now.getDay()),
  );
  const completedToday = todayRituals.filter(
    (r) => r.history[todayStr] === "done",
  ).length;

  return (
    <PageLayout>
      <PageHeader
        title={uiText.rituals?.title || "Rituals"}
        subtitle={
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <SunIcon className="w-4 h-4" />
              {completedToday} / {todayRituals.length} today
            </span>
            <span>
              {uiText.rituals?.subtitle ||
                "Build habits with scheduled routines managed by your agent."}
            </span>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-32">
        <div className="max-w-6xl mx-auto">
          {rituals.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={uiText.rituals?.no_rituals || "No Rituals Yet"}
              description={
                uiText.rituals?.no_rituals_desc ||
                'Ask your agent to create a new ritual for you. For example: "Create a morning ritual for 7am."'
              }
            />
          ) : (
            <>
              {/* Today's Progress Card */}
              {todayRituals.length > 0 && (
                <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl p-5 sm:p-6 shadow-lg shadow-pink-300/30 dark:shadow-pink-900/30 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <SparklesIcon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white">
                          {completedToday} / {todayRituals.length}
                        </h3>
                        <p className="text-white/80 text-sm mt-0.5">
                          Today's rituals completed
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${todayRituals.length > 0 ? (completedToday / todayRituals.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-white/70 text-xs mt-2 text-right">
                    {Math.round(
                      todayRituals.length > 0
                        ? (completedToday / todayRituals.length) * 100
                        : 0,
                    )}
                    % complete
                  </p>
                </div>
              )}

              {/* Rituals Grid */}
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {rituals.map((ritual, idx) => {
                  const isDone = ritual.history[todayStr] === "done";
                  const isMissed = ritual.history[todayStr] === "missed";
                  const isActive = isRitualActive(ritual, now);
                  const isToday = ritual.schedule.days.includes(now.getDay());

                  return (
                    <div
                      key={ritual.id}
                      className={cn(
                        "bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border transition-all duration-300 hover:shadow-xl relative overflow-hidden",
                        isDone
                          ? "border-green-200/50 dark:border-green-500/20"
                          : isMissed
                            ? "border-red-200/50 dark:border-red-500/20"
                            : isActive
                              ? "border-pink-400/50 dark:border-pink-400/30 shadow-pink-200/30 dark:shadow-pink-900/20"
                              : "border-pink-200/50 dark:border-pink-500/20 hover:border-pink-300/50",
                      )}
                    >
                      {/* Active indicator */}
                      {isActive && !isDone && (
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-pink-400 to-pink-500 shadow-lg shadow-pink-400/50" />
                      )}

                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0 pr-3">
                          <h3 className="font-bold text-lg text-foreground truncate">
                            {ritual.title}
                          </h3>
                          <div className="flex items-center text-sm text-muted-foreground mt-1.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/40 dark:to-pink-800/40 flex items-center justify-center mr-2">
                              <Clock className="w-4 h-4 text-pink-500" />
                            </div>
                            <span className="font-medium">
                              {ritual.schedule.start} - {ritual.schedule.end}
                            </span>
                          </div>
                        </div>

                        {/* Status indicator */}
                        <div className="flex-shrink-0">
                          {isDone ? (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center shadow-md shadow-green-300/30">
                              <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                          ) : isMissed ? (
                            <div className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-lg font-bold uppercase tracking-wide">
                              {uiText.rituals?.missed_label || "Missed"}
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl border-2 border-pink-200 dark:border-pink-500/30 flex items-center justify-center">
                              <Circle className="w-6 h-6 text-pink-300 dark:text-pink-600" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Steps */}
                      <div className="mb-4">
                        <ul className="space-y-2">
                          {ritual.steps.map((step) => (
                            <li key={step} className="text-sm flex items-start">
                              <span
                                className={cn(
                                  "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold mr-2 flex-shrink-0 mt-0.5",
                                  isDone
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                    : "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
                                )}
                              >
                                {idx + 1}
                              </span>
                              <span
                                className={cn(
                                  "leading-relaxed",
                                  isDone
                                    ? "line-through text-muted-foreground"
                                    : "text-foreground",
                                )}
                              >
                                {step}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Days and Action */}
                      <div className="mt-auto pt-4 border-t border-pink-200/50 dark:border-pink-500/20">
                        <div className="flex flex-wrap gap-1 mb-4">
                          {DAYS.map((day, idx) => (
                            <span
                              key={day}
                              className={cn(
                                "text-[10px] px-2 py-1 rounded-md font-semibold uppercase tracking-wide transition-colors",
                                ritual.schedule.days.includes(idx)
                                  ? idx === now.getDay()
                                    ? "bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-sm"
                                    : "bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400"
                                  : "bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600",
                              )}
                            >
                              {day}
                            </span>
                          ))}
                        </div>

                        {isToday && !isDone && !isMissed && (
                          <Button
                            className={cn(
                              "w-full font-semibold py-5 rounded-xl shadow-md transition-all duration-200",
                              isActive
                                ? "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-pink-300/30"
                                : "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/50",
                            )}
                            onClick={() => handleMarkDone(ritual.id)}
                            variant={isActive ? "default" : "secondary"}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {uiText.rituals?.mark_done_label || "Mark as Done"}
                          </Button>
                        )}

                        {isDone && (
                          <div className="w-full text-center py-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200/50 dark:border-green-500/20">
                            <span className="text-green-600 dark:text-green-400 font-semibold text-sm flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              Completed for today!
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Info Card */}
              <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 rounded-2xl p-5 border border-pink-200/50 dark:border-pink-500/20 mt-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      About Rituals
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Rituals are scheduled routines that help you build
                      consistent habits. Each ritual has a time window during
                      which it should be completed. Ask your AI assistant to
                      create new rituals tailored to your goals and schedule!
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
