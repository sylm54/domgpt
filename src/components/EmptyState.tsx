import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Reusable empty state component with icon, title, description, and optional action.
 * Features strong pink theme with white accents.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className,
      )}
    >
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center mb-5 shadow-lg shadow-pink-300/30">
        <Icon className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
