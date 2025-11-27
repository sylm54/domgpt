import { useState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertCircleIcon,
  FlameIcon,
  ShieldCheckIcon,
  TrophyIcon,
} from "lucide-react";
import type { Rule } from "./types";
import {
  loadRules,
  logRuleBreak,
  getBreakCount,
  getStreak,
  getGlobalStreak,
  onRuleChange,
} from "./types";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useConfig } from "@/contexts/ConfigContext";

export default function RuleView() {
  const { uiText } = useConfig();
  const [rules, setRules] = useState<Rule[]>([]);
  const mainId = useId();

  useEffect(() => {
    const clearListeners = onRuleChange((rules) => {
      setRules(rules);
    });
    return clearListeners;
  }, []);

  useEffect(() => {
    const loaded = loadRules();
    setRules(loaded);
  }, []);

  const handleLogBreak = (id: string) => {
    const updated = logRuleBreak(rules, id);
    setRules(updated);
  };

  const totalCount = rules.length;
  const globalStreak = getGlobalStreak(rules);

  return (
    <PageLayout>
      <PageHeader
        title={uiText.rule?.title || "Rules"}
        subtitle={
          totalCount > 0 ? (
            <div className="flex items-center gap-2">
              <FlameIcon className="w-4 h-4" />
              <span>
                {globalStreak} {uiText.rule?.streak_label || "Day Streak"}
              </span>
            </div>
          ) : null
        }
      />

      {/* Rule List */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-32"
        id={mainId}
      >
        {rules.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <EmptyState
              icon={ShieldCheckIcon}
              title={uiText.rule?.no_rules || "No rules yet!"}
              description="Ask your AI assistant to help you create rules to track. Rules help you build discipline and accountability."
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Global Streak Card */}
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl p-5 sm:p-6 shadow-lg shadow-pink-300/30 dark:shadow-pink-900/30 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <FlameIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white">
                      {globalStreak} Day Streak
                    </h3>
                    <p className="text-white/80 text-sm mt-0.5">
                      Keep it up! You're doing great.
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                  <TrophyIcon className="w-5 h-5 text-yellow-300" />
                  <span className="text-white font-medium">
                    {rules.length} Rule{rules.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Rules Grid */}
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {rules.map((rule) => {
                const breakCount = getBreakCount(rule);
                const streak = getStreak(rule);
                const recentBreaks = rule.breaks
                  .slice(-3)
                  .reverse()
                  .map((brk) => new Date(brk.timestamp).toLocaleString());

                return (
                  <div
                    key={rule.id}
                    className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-pink-200/50 dark:border-pink-500/20 transition-all duration-200 hover:shadow-xl hover:border-pink-300/50 dark:hover:border-pink-500/30"
                  >
                    <div className="flex items-start gap-4">
                      {/* Break Button */}
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => handleLogBreak(rule.id)}
                        className="flex-shrink-0 w-12 h-12 rounded-xl border-2 border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20 transition-all duration-200"
                        title={uiText.rule?.break_label || "Log a break"}
                      >
                        <AlertCircleIcon className="w-5 h-5" />
                      </Button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-lg text-foreground">
                            {rule.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {breakCount > 0 && (
                              <span className="px-2.5 py-1 text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                                {breakCount}{" "}
                                {breakCount === 1 ? "break" : "breaks"}
                              </span>
                            )}
                            <span className="px-2.5 py-1 text-xs font-bold bg-gradient-to-r from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30 text-pink-600 dark:text-pink-400 rounded-lg flex items-center gap-1">
                              <FlameIcon className="w-3 h-3" />
                              {streak} day{streak !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                          {rule.body}
                        </p>

                        {recentBreaks.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-pink-200/50 dark:border-pink-500/20">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                              {uiText.rule?.recent_breaks_label ||
                                "Recent breaks:"}
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {recentBreaks.map((time) => (
                                <li
                                  key={time}
                                  className="flex items-center gap-2"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                  {time}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 rounded-2xl p-5 border border-pink-200/50 dark:border-pink-500/20 mt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    About Rules
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Rules help you build discipline by tracking commitments you
                    want to keep. Tap the alert icon to log when you break a
                    rule. Your streak resets when you log a break, so stay
                    motivated to keep your streak going!
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
