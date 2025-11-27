import { useState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from "lucide-react";
import type { ReflectionData } from "./types";
import {
  loadReflectionData,
  saveReflectionData,
  getTodayDateString,
  formatDateString,
  saveReflectionForDate,
  getReflectionRecordForDate,
  hasReflectionForDate,
  getReflectionStreak,
  getReflectionCount,
} from "./types";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { useConfig } from "@/contexts/ConfigContext";

export default function ReflectionView() {
  const { uiText } = useConfig();
  const [data, setData] = useState<ReflectionData>({
    prompts: [],
    reflections: {},
  });
  const [responses, setResponses] = useState<string[]>(["", "", ""]);
  const [selectedDate, setSelectedDate] =
    useState<string>(getTodayDateString());
  const [isSaved, setIsSaved] = useState(false);
  const [promptsInView, setPromptsInView] = useState<string[]>([]);

  const prompt1Id = useId();
  const prompt2Id = useId();
  const prompt3Id = useId();
  const mainId = useId();

  useEffect(() => {
    const loaded = loadReflectionData();
    setData(loaded);
    setPromptsInView(loaded.prompts);
  }, []);

  useEffect(() => {
    const record = getReflectionRecordForDate(data, selectedDate);
    if (record) {
      setResponses(record.responses);
      setPromptsInView(record.prompts);
      setIsSaved(true);
    } else {
      setResponses(["", "", ""]);
      setPromptsInView(data.prompts || []);
      setIsSaved(false);
    }
  }, [selectedDate, data]);

  const handleSave = () => {
    try {
      const updated = saveReflectionForDate(data, selectedDate, responses);
      setData(updated);
      saveReflectionData(updated);
      setIsSaved(true);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to save reflection",
      );
    }
  };

  const handleResponseChange = (index: number, value: string) => {
    const newResponses = [...responses];
    newResponses[index] = value;
    setResponses(newResponses);
    setIsSaved(false);
  };

  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate + "T00:00:01");
    currentDate.setDate(currentDate.getDate());
    setSelectedDate(currentDate.toISOString().split("T")[0]);
  };

  const goToNextDay = () => {
    const today = getTodayDateString();
    if (selectedDate === today) return;
    const currentDate = new Date(selectedDate + "T00:00:01");
    currentDate.setDate(currentDate.getDate() + 2);
    setSelectedDate(currentDate.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    setSelectedDate(getTodayDateString());
  };

  const isToday = selectedDate === getTodayDateString();
  const hasContent = responses.some((r) => r.trim().length > 0);
  const canSave = hasContent && !isSaved;
  const streak = getReflectionStreak(data);
  const totalReflections = getReflectionCount(data);

  return (
    <PageLayout>
      <PageHeader
        title={uiText.reflection?.title || "Daily Reflection"}
        subtitle={
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              {totalReflections}{" "}
              {uiText.reflection?.total_label || "total reflections"}
            </span>
            <span className="flex items-center gap-1">
              <SparklesIcon className="w-4 h-4" />
              {streak} {uiText.reflection?.streak_label || "day streak"}
            </span>
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            {isSaved && (
              <span className="flex items-center gap-1 text-sm text-white/90 font-medium bg-white/20 px-3 py-1.5 rounded-lg">
                <CheckCircleIcon className="w-4 h-4" />
                {uiText.reflection?.saved_label || "Saved"}
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="bg-white text-pink-600 hover:bg-white/90 font-semibold shadow-md disabled:opacity-50"
            >
              {uiText.reflection?.save_label || "Save Reflection"}
            </Button>
          </div>
        }
      />

      {/* Date Navigation */}
      <div className="bg-white/60 dark:bg-card/60 backdrop-blur-sm border-b border-pink-200/50 dark:border-pink-500/20 px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center shadow-md">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">
                {formatDateString(selectedDate)}
              </span>
              {!isToday && (
                <span className="text-sm text-muted-foreground ml-2">
                  ({selectedDate})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousDay}
              className="border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-1" />
              {uiText.reflection?.prev_day_label || "Previous Day"}
            </Button>
            {!isToday && (
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20"
              >
                {uiText.reflection?.today_label || "Today"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextDay}
              disabled={isToday}
              className="border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 disabled:opacity-50"
            >
              {uiText.reflection?.next_day_label || "Next Day"}
              <ChevronRightIcon className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Reflection Prompts */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-32"
        id={mainId}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {promptsInView.map((prompt, index) => (
            <div
              key={`prompt-${prompt.substring(0, 20)}-${index}`}
              className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border border-pink-200/50 dark:border-pink-500/20 transition-all duration-200 hover:shadow-xl"
            >
              <label
                htmlFor={
                  index === 0 ? prompt1Id : index === 1 ? prompt2Id : prompt3Id
                }
                className="flex items-start gap-3 mb-4"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {index + 1}
                </span>
                <span className="text-lg font-semibold text-foreground leading-snug pt-0.5">
                  {prompt}
                </span>
              </label>
              <Textarea
                id={
                  index === 0 ? prompt1Id : index === 1 ? prompt2Id : prompt3Id
                }
                value={responses[index]}
                onChange={(e) => handleResponseChange(index, e.target.value)}
                placeholder={
                  uiText.reflection?.placeholder ||
                  "Write your reflection here..."
                }
                className="min-h-[140px] resize-y text-base bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl placeholder:text-muted-foreground/60"
                disabled={!isToday}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {responses[index].length} characters
                </p>
                {!isToday && (
                  <p className="text-xs text-pink-500 font-medium">
                    Past reflections are read-only
                  </p>
                )}
              </div>
            </div>
          ))}

          {!isToday && !hasReflectionForDate(data, selectedDate) && (
            <div className="bg-white/60 dark:bg-card/60 backdrop-blur-sm rounded-2xl p-8 text-center border border-pink-200/30 dark:border-pink-500/10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-200 to-pink-300 dark:from-pink-800 dark:to-pink-700 flex items-center justify-center mx-auto mb-4 shadow-md">
                <CalendarIcon className="w-8 h-8 text-pink-600 dark:text-pink-300" />
              </div>
              <p className="text-muted-foreground font-medium">
                {uiText.reflection?.no_reflection ||
                  "No reflection recorded for this day"}
              </p>
            </div>
          )}

          {/* Tip Card */}
          {isToday && (
            <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 rounded-2xl p-5 border border-pink-200/50 dark:border-pink-500/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Daily Reflection Tip
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Take a few moments to reflect deeply on each question.
                    Writing helps clarify thoughts and track your personal
                    growth over time. Your reflections are private and stored
                    locally.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
