import React, {
  forwardRef,
  type ComponentPropsWithRef,
  useRef,
  useId,
  useEffect,
} from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { Chat } from "@/components/ui/shadcn-io/ai/chat";
import { Button } from "@/components/ui/button";
import { model } from "@/config";
import { Agent } from "@/lib/agent";
import { Context } from "@/lib/context";
import { cn } from "@/lib/utils";
import NavHeader from "@/components/NavHeader";
import { actEvents, main_agent } from "@/agents/agents";
// NavButton moved to the shared NavHeader component (src/components/NavHeader.tsx)

/**
 * Main page with an accessible navigation menu linking to all routes defined in App.tsx
 *
 * Accessibility fixes:
 * - Use `useId` to generate a unique id for the main content landmark.
 * - Remove interactive roles from non-interactive elements (no `role="menubar"` on `ul`).
 * - Keep `nav` with `aria-label` and ensure links expose `aria-current` via NavLink.
 */
export default function Main() {

  useEffect(() => {
    actEvents();
  }, []);

  return (
    <Chat agent={main_agent} className="h-[calc(100vh-80px)]" />
  );
}
