import { useEffect } from "react";

import { Chat } from "@/components/ui/shadcn-io/ai/chat";
import { actEvents, main_agent } from "@/agents/agents";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ui/shadcn-io/ai/tool";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Smile,
  Frown,
  MessageSquare,
  CheckCircleIcon,
  ClockIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToolPart = {
  type: "tool";
  id: string;
  tool: string;
  tool_input: string;
  tool_output?: string;
  tool_data?: object;
};

function parseToolInput(input: string): Record<string, unknown> {
  try {
    return JSON.parse(input);
  } catch {
    return { raw: input };
  }
}

function ToolDisplay({ part }: { part: ToolPart }) {
  const hasOutput =
    typeof part.tool_output !== "undefined" && part.tool_output !== null;
  const toolState = hasOutput ? "output-available" : "input-available";
  const input = parseToolInput(part.tool_input);

  // Custom display for invokeSubAgent
  if (part.tool === "invokeSubAgent") {
    const agentName = (input.name as string) || "unknown";
    const prompt = (input.prompt as string) || "";

    return (
      <div className="mb-4 w-full rounded-lg border bg-gradient-to-r from-primary/5 to-secondary/5 overflow-hidden">
        <div className="flex items-center gap-3 p-3 border-b bg-muted/30">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm capitalize">
                {agentName}
              </span>
              <Badge
                variant="secondary"
                className="text-xs flex items-center gap-1"
              >
                {hasOutput ? (
                  <>
                    <CheckCircleIcon className="h-3 w-3 text-green-600" />
                    Complete
                  </>
                ) : (
                  <>
                    <ClockIcon className="h-3 w-3 animate-pulse" />
                    Working...
                  </>
                )}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Sub-agent</p>
          </div>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-foreground/90">{prompt}</p>
          </div>
          {hasOutput && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Response
              </p>
              <div className="bg-muted/50 rounded-md p-2">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {part.tool_output}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Custom display for mood tools
  if (part.tool === "increaseMood" || part.tool === "decreaseMood") {
    const isIncrease = part.tool === "increaseMood";

    return (
      <div
        className={cn(
          "mb-4 w-full rounded-lg border overflow-hidden",
          isIncrease
            ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
            : "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800",
        )}
      >
        <div className="flex items-center gap-3 p-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              isIncrease
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-orange-100 dark:bg-orange-900/30",
            )}
          >
            {isIncrease ? (
              <Smile className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <Frown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            )}
          </div>
          <div className="flex-1">
            <p
              className={cn(
                "font-medium text-sm",
                isIncrease
                  ? "text-green-700 dark:text-green-300"
                  : "text-orange-700 dark:text-orange-300",
              )}
            >
              {isIncrease ? "Mood Increased" : "Mood Decreased"}
            </p>
            {hasOutput && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {part.tool_output}
              </p>
            )}
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "text-xs",
              isIncrease
                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
            )}
          >
            {hasOutput ? (
              <CheckCircleIcon className="h-3 w-3 mr-1" />
            ) : (
              <ClockIcon className="h-3 w-3 mr-1 animate-pulse" />
            )}
            {hasOutput ? "Done" : "Processing"}
          </Badge>
        </div>
      </div>
    );
  }

  // Default tool display for other tools
  return (
    <Tool className="overflow-auto">
      <ToolHeader
        type={`tool-${part.tool ?? part.id ?? "tool"}`}
        state={toolState}
      />
      <ToolContent>
        <ToolInput input={{ name: part.tool, input: input }} />
        <ToolOutput
          output={
            hasOutput ? (
              <pre className="whitespace-pre-wrap p-2 text-foreground/80">
                {String(part.tool_output)}
              </pre>
            ) : null
          }
          errorText={hasOutput ? undefined : undefined}
        />
      </ToolContent>
    </Tool>
  );
}

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
    <Chat
      agent={main_agent}
      className="h-[calc(100vh-80px)]"
      tool_display={(part) => <ToolDisplay key={part.id} part={part} />}
    />
  );
}
