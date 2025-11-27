import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Standard page layout component providing consistent structure across all pages.
 * Features a strong pink gradient background with subtle patterns.
 */
export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div
      className={cn(
        "flex flex-col h-screen overflow-hidden",
        "bg-gradient-to-br from-pink-50 via-pink-100/80 to-pink-200/60",
        "dark:from-pink-950 dark:via-pink-900/80 dark:to-pink-800/60",
        className,
      )}
    >
      {/* Subtle decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-300/30 dark:bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-400/20 dark:bg-pink-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/10 dark:bg-pink-400/5 rounded-full blur-3xl" />
      </div>

      {/* Main content with relative positioning to appear above decorative elements */}
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
