import React, {
  forwardRef,
  useEffect,
  useState,
  type ComponentPropsWithRef,
} from "react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MoodDisplay } from "@/components/MoodDisplay";
import { backgroundJobs, type BackgroundJob } from "@/lib/backgroundJobs";
import { Menu, X } from "lucide-react";

/**
 * Accessible navigation button that composes the shadcn `Button` with a React Router `NavLink`.
 * Uses `asChild` on `Button` so the NavLink receives the button styling and keyboard behavior.
 *
 * ForwardRef is implemented so callers can focus the underlying anchor element.
 */
export type NavButtonProps = {
  to: string;
  children: React.ReactNode;
  "aria-label"?: string;
  onClick?: () => void;
} & Omit<ComponentPropsWithRef<"a">, "href">;

export const NavButton = forwardRef<HTMLAnchorElement, NavButtonProps>(
  ({ to, children, "aria-label": ariaLabel, onClick, ...rest }, ref) => {
    return (
      <Button
        asChild
        size="sm"
        variant="ghost"
        className="px-3 py-2"
        aria-label={ariaLabel}
      >
        <NavLink
          to={to}
          ref={ref}
          aria-label={ariaLabel}
          onClick={onClick}
          className={({ isActive }) =>
            cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
              isActive
                ? "bg-white text-pink-600 shadow-md"
                : "text-white/90 hover:bg-white/20 hover:text-white",
            )
          }
          {...rest}
        >
          {children}
        </NavLink>
      </Button>
    );
  },
);
NavButton.displayName = "NavButton";

type NavHeaderProps = {
  /**
   * Optional id to use for a "skip to content" anchor link.
   * If provided, a visually-hidden skip link will be rendered above the header.
   */
  skipToId?: string;
};

/**
 * Reusable header + navigation component with pink theme and mobile hamburger menu.
 */
export default function NavHeader({ skipToId }: NavHeaderProps) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Subscribe to job changes
    const unsubscribe = backgroundJobs.subscribe(() => {
      setJobs(backgroundJobs.getJobs());
    });

    // Initialize with current jobs
    setJobs(backgroundJobs.getJobs());

    return unsubscribe;
  }, []);

  const navItems: { label: string; to: string; aria?: string }[] = [
    { label: "Chat", to: "/menu", aria: "Open Chat" },
    { label: "Profile", to: "/profile", aria: "View profile" },
    { label: "Reflection", to: "/reflection", aria: "Open reflection view" },
    { label: "Rules", to: "/rule", aria: "Open rule view" },
    { label: "Safe", to: "/safe", aria: "Open safe view" },
    { label: "Affirm", to: "/affirm", aria: "Open affirm view" },
    { label: "Challenge", to: "/challenge", aria: "Open challenge view" },
    { label: "Inventory", to: "/inventory", aria: "Open inventory view" },
    { label: "Rituals", to: "/rituals", aria: "Open ritual view" },
    { label: "Voice", to: "/voice", aria: "Open voice training" },
    { label: "Activity", to: "/activity", aria: "View activity log" },
    { label: "Settings", to: "/settings", aria: "Open settings" },
    { label: "Workflows", to: "/workflows", aria: "Open workflows view" },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const currentJob = jobs.length > 0 ? jobs[jobs.length - 1] : null;

  return (
    <>
      <header className="bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 sticky top-0 z-50 shadow-lg">
        {skipToId ? (
          <a
            href={`#${skipToId}`}
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-pink-600 focus:px-3 focus:py-2 focus:rounded-md focus:shadow-md"
          >
            Skip to content
          </a>
        ) : null}

        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {/* Desktop navigation */}
            <nav aria-label="Primary" className="hidden lg:block flex-1">
              <ul className="flex items-center gap-1 flex-wrap">
                {navItems.map((item) => (
                  <li key={item.to}>
                    <NavButton to={item.to} aria-label={item.aria}>
                      {item.label}
                    </NavButton>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Secondary controls */}
            <div className="flex items-center gap-3">
              {/* Job indicator - desktop shows full info, mobile shows compact with progress */}
              {currentJob && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-sm">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full flex-shrink-0" />
                  {/* Desktop: full description and progress */}
                  <div className="hidden sm:flex flex-col">
                    <span className="font-medium text-white text-xs">
                      {currentJob.description}
                    </span>
                    {currentJob.progress !== undefined && (
                      <span className="text-xs text-white/70">
                        {currentJob.progress}%
                      </span>
                    )}
                  </div>
                  {/* Mobile: compact progress indicator */}
                  <div className="flex sm:hidden items-center gap-2">
                    {currentJob.progress !== undefined ? (
                      <>
                        <div className="w-16 h-1.5 bg-white/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full transition-all duration-300"
                            style={{ width: `${currentJob.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-white min-w-[2rem]">
                          {currentJob.progress}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-white truncate max-w-[80px]">
                        {currentJob.description}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* MoodDisplay - visible on all screen sizes */}
              <MoodDisplay className="flex" />
            </div>
          </div>
        </div>

        {/* Mobile navigation menu */}
        <div
          className={cn(
            "lg:hidden overflow-hidden transition-all duration-300 ease-in-out",
            mobileMenuOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <nav
            aria-label="Mobile navigation"
            className="px-4 pb-4 bg-gradient-to-b from-transparent to-pink-600/20"
          >
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      cn(
                        "block px-4 py-3 rounded-xl text-sm font-medium text-center transition-all duration-200",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                        isActive
                          ? "bg-white text-pink-600 shadow-md"
                          : "bg-white/10 text-white hover:bg-white/25",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
    </>
  );
}
