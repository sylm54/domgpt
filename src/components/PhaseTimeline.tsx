import { Check, Lock } from "lucide-react";
import type { Phase } from "@/config";

interface PhaseTimelineProps {
  phases: Phase[];
  currentIndex: number;
  completedPhases: number[];
}

export function PhaseTimeline({
  phases,
  currentIndex,
  completedPhases,
}: PhaseTimelineProps) {
  if (phases.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-max gap-2 py-4">
        {phases.map((phase, index) => {
          const isCompleted = completedPhases.includes(index);
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div key={index} className="flex items-center">
              {/* Phase Node */}
              <div className="flex flex-col items-center min-w-[120px]">
                <div
                  className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${
                      isCompleted
                        ? "bg-primary/80 border-2 border-primary shadow-lg"
                        : isCurrent
                          ? "bg-primary border-2 border-primary shadow-xl animate-pulse"
                          : "bg-muted border-2 border-border"
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6 text-primary-foreground" />
                  ) : isFuture ? (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-primary-foreground"></div>
                  )}
                </div>

                {/* Phase Title */}
                <div className="mt-2 text-center">
                  <p
                    className={`text-sm font-medium ${
                      isCurrent
                        ? "text-primary font-bold"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {phase.title}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {index < phases.length - 1 && (
                <div
                  className={`
                    h-0.5 w-16 mx-2
                    ${
                      isCompleted
                        ? "bg-primary/60"
                        : "bg-border"
                    }
                  `}
                ></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
