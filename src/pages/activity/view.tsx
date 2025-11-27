import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Activity as ActivityIcon,
  Trophy,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  Lock,
  Unlock,
  Mic,
  Scroll,
  User,
  Award,
  Volume2,
  Package,
  TrendingUp,
  TrendingDown,
  Play,
  Filter,
  Trash2,
} from "lucide-react";
import type { Activity, ActivityType } from "./types";
import {
  loadActivities,
  onActivityChange,
  formatRelativeTime,
  getActivityTypeLabel,
  getActivityStats,
  clearActivities,
} from "./types";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  Lock,
  Unlock,
  Mic,
  Scroll,
  User,
  Award,
  Volume2,
  Package,
  TrendingUp,
  TrendingDown,
  Play,
  Activity: ActivityIcon,
};

const activityTypeToIcon: Record<ActivityType, string> = {
  challenge_completed: "Trophy",
  challenge_added: "Target",
  ritual_completed: "CheckCircle",
  ritual_missed: "XCircle",
  ritual_added: "Clock",
  ritual_removed: "Clock",
  reflection_saved: "BookOpen",
  safe_locked: "Lock",
  safe_unlocked: "Unlock",
  voice_assignment_completed: "Mic",
  voice_assignment_added: "Mic",
  rule_added: "Scroll",
  rule_removed: "Scroll",
  rule_updated: "Scroll",
  profile_updated: "User",
  achievement_added: "Award",
  affirm_generated: "Volume2",
  inventory_item_added: "Package",
  inventory_item_removed: "Package",
  mood_increased: "TrendingUp",
  mood_decreased: "TrendingDown",
  session_started: "Play",
  custom: "Activity",
};

const activityTypeColors: Record<ActivityType, string> = {
  challenge_completed: "from-yellow-400 to-yellow-500",
  challenge_added: "from-blue-400 to-blue-500",
  ritual_completed: "from-green-400 to-green-500",
  ritual_missed: "from-red-400 to-red-500",
  ritual_added: "from-purple-400 to-purple-500",
  ritual_removed: "from-gray-400 to-gray-500",
  reflection_saved: "from-indigo-400 to-indigo-500",
  safe_locked: "from-rose-400 to-rose-500",
  safe_unlocked: "from-emerald-400 to-emerald-500",
  voice_assignment_completed: "from-cyan-400 to-cyan-500",
  voice_assignment_added: "from-sky-400 to-sky-500",
  rule_added: "from-amber-400 to-amber-500",
  rule_removed: "from-orange-400 to-orange-500",
  rule_updated: "from-lime-400 to-lime-500",
  profile_updated: "from-violet-400 to-violet-500",
  achievement_added: "from-fuchsia-400 to-fuchsia-500",
  affirm_generated: "from-teal-400 to-teal-500",
  inventory_item_added: "from-slate-400 to-slate-500",
  inventory_item_removed: "from-zinc-400 to-zinc-500",
  mood_increased: "from-green-400 to-emerald-500",
  mood_decreased: "from-red-400 to-rose-500",
  session_started: "from-pink-400 to-pink-500",
  custom: "from-gray-400 to-gray-500",
};

type FilterOption = "all" | "today" | "week" | "month";

export default function ActivityView() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");

  useEffect(() => {
    const clearListener = onActivityChange((updated) => {
      setActivities(updated);
    });
    return clearListener;
  }, []);

  useEffect(() => {
    const loaded = loadActivities();
    setActivities(loaded);
  }, []);

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all activity history?")) {
      clearActivities();
      setActivities([]);
    }
  };

  // Apply filters
  const filteredActivities = activities
    .filter((activity) => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const oneWeekMs = 7 * oneDayMs;
      const oneMonthMs = 30 * oneDayMs;

      switch (filter) {
        case "today":
          return now - activity.timestamp < oneDayMs;
        case "week":
          return now - activity.timestamp < oneWeekMs;
        case "month":
          return now - activity.timestamp < oneMonthMs;
        default:
          return true;
      }
    })
    .filter((activity) => {
      if (typeFilter === "all") return true;
      return activity.type === typeFilter;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  const stats = getActivityStats(activities);

  // Get unique activity types for filter dropdown
  const uniqueTypes = Array.from(new Set(activities.map((a) => a.type)));

  return (
    <PageLayout>
      <PageHeader
        title="Activity"
        subtitle={
          <div className="flex items-center gap-2">
            <ActivityIcon className="w-4 h-4" />
            <span>{activities.length} total activities logged</span>
          </div>
        }
        action={
          activities.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-white/80 hover:text-white hover:bg-white/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-32">
        {activities.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <EmptyState
              icon={ActivityIcon}
              title="No activity yet"
              description="Your activity will appear here as you use the app. Complete challenges, save reflections, and more to see your progress!"
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-pink-200/50 dark:border-pink-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.challengesCompleted}
                    </p>
                    <p className="text-xs text-muted-foreground">Challenges</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-pink-200/50 dark:border-pink-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.ritualsCompleted}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rituals Done
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-pink-200/50 dark:border-pink-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-500 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.reflectionsSaved}
                    </p>
                    <p className="text-xs text-muted-foreground">Reflections</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-pink-200/50 dark:border-pink-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.voiceAssignmentsCompleted}
                    </p>
                    <p className="text-xs text-muted-foreground">Voice Done</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter:</span>
              </div>

              <div className="flex gap-2">
                {(["all", "today", "week", "month"] as FilterOption[]).map(
                  (option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => setFilter(option)}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-lg transition-all",
                        filter === option
                          ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md"
                          : "bg-white/60 dark:bg-card/60 text-muted-foreground hover:bg-white dark:hover:bg-card",
                      )}
                    >
                      {option === "all"
                        ? "All Time"
                        : option.charAt(0).toUpperCase() + option.slice(1)}
                    </button>
                  ),
                )}
              </div>

              {uniqueTypes.length > 1 && (
                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as ActivityType | "all")
                  }
                  className="px-3 py-1.5 text-sm rounded-lg bg-white/60 dark:bg-card/60 border border-pink-200/50 dark:border-pink-500/20 text-foreground"
                >
                  <option value="all">All Types</option>
                  {uniqueTypes.map((type) => (
                    <option key={type} value={type}>
                      {getActivityTypeLabel(type)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Activity List */}
            <div className="space-y-3">
              {filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activities match your filters
                </div>
              ) : (
                filteredActivities.map((activity) => {
                  const iconName =
                    activityTypeToIcon[activity.type] || "Activity";
                  const IconComponent = iconMap[iconName] || ActivityIcon;
                  const colorClass =
                    activityTypeColors[activity.type] ||
                    "from-gray-400 to-gray-500";

                  return (
                    <div
                      key={activity.id}
                      className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-pink-200/50 dark:border-pink-500/20 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                            colorClass,
                          )}
                        >
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {activity.title}
                              </h3>
                              <p className="text-xs text-pink-500 dark:text-pink-400 font-medium">
                                {getActivityTypeLabel(activity.type)}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatRelativeTime(activity.timestamp)}
                            </span>
                          </div>

                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {activity.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 rounded-2xl p-5 border border-pink-200/50 dark:border-pink-500/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <ActivityIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    About Activity Log
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This page shows all your actions in the app. Track your
                    progress, see patterns, and stay motivated by reviewing your
                    journey. Activities are automatically logged as you use
                    different features.
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
