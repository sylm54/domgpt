import { useEffect, useState } from "react";
import { useMood } from "@/lib/mood";
import { getConfig } from "@/config";
import { SmileIcon, FrownIcon, MehIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MoodDisplay({ className }: { className?: string }) {
  const mood = useMood();
  const [stages, setStages] = useState<Record<string, string>>({});

  useEffect(() => {
    getConfig().then((config) => {
      if (config.mood_stages) {
        setStages(config.mood_stages);
      }
    });
  }, []);

  const getMoodIcon = (level: number) => {
    if (level >= 8) return <SmileIcon className="w-5 h-5 text-pink-300" />;
    if (level >= 4) return <MehIcon className="w-5 h-5 text-pink-400" />;
    return <FrownIcon className="w-5 h-5 text-pink-600" />;
  };

  const getMoodColor = (level: number) => {
    // High mood - lighter, more vibrant pink
    if (level >= 8)
      return "bg-pink-100/80 border-pink-300 text-pink-700 dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-300";
    // Medium mood - standard pink
    if (level >= 4)
      return "bg-pink-200/60 border-pink-400 text-pink-800 dark:bg-pink-800/30 dark:border-pink-600 dark:text-pink-400";
    // Low mood - deeper, more saturated pink
    return "bg-pink-300/50 border-pink-500 text-pink-900 dark:bg-pink-700/30 dark:border-pink-500 dark:text-pink-500";
  };

  const getBarColor = (level: number, index: number) => {
    const isActive = index < level;
    if (!isActive) return "bg-pink-300/30 dark:bg-pink-700/30";

    // Gradient effect - bars get more intense as they go up
    if (level >= 8) return "bg-pink-400 dark:bg-pink-400";
    if (level >= 4) return "bg-pink-500 dark:bg-pink-500";
    return "bg-pink-600 dark:bg-pink-600";
  };

  const stageName = stages[mood.toString()] || `Level ${mood}`;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-full border transition-colors backdrop-blur-sm",
        getMoodColor(mood),
        className,
      )}
    >
      {getMoodIcon(mood)}
      <div className="flex flex-col">
        <span className="text-xs font-medium uppercase tracking-wider opacity-70">
          Mood
        </span>
        <span className="text-sm font-bold leading-none">{stageName}</span>
      </div>
      <div className="flex gap-0.5 h-3 items-end ml-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-300",
              getBarColor(mood, i),
              i < mood ? "h-full" : "h-1/2 opacity-40",
            )}
          />
        ))}
      </div>
    </div>
  );
}
