import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Consistent page header with title, optional subtitle/stats, and actions.
 * Features a strong pink theme with white accents.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "border-b border-pink-200/50 bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 px-4 sm:px-6 py-4 sm:py-5 shadow-lg",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">
            {title}
          </h1>
          {subtitle && (
            <div className="text-sm text-white/80 mt-1 font-medium">
              {subtitle}
            </div>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
