import React, {
  forwardRef,
  useEffect,
  useRef,
  useState,
  FormEvent,
} from "react";
import { cn } from "@repo/shadcn-ui/lib/utils";
import type { ChatMessage, MessagePart } from "../../../../lib/models";
import { Agent } from "../../../../lib/agent";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./conversation";
import { Message, MessageContent, MessageAvatar } from "./message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputSubmit,
} from "./prompt-input";
import { Response } from "./response";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "./reasoning";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "./tool";
import { Loader } from "./loader";

type ChatProps = {
  agent: Agent;
  className?: string;
  /**
   * Optional avatar URLs for user and assistant
   */
  userAvatarSrc?: string;
  assistantAvatarSrc?: string;
  /**
   * Placeholder text for the prompt box
   */
  placeholder?: string;
};

/**
 * Chat component that binds to an Agent instance and renders conversation.
 *
 * Layout notes:
 * - The Chat root is `relative` so we can absolutely position the prompt within it.
 * - The Conversation (StickToBottom) is the flex child that grows and scrolls.
 * - ConversationContent already includes bottom padding to ensure the last messages
 *   are not hidden beneath the absolutely-positioned prompt.
 */
export const Chat = forwardRef<HTMLDivElement, ChatProps>(function Chat(
  {
    agent,
    className,
    userAvatarSrc,
    assistantAvatarSrc,
    placeholder = "What would you like to know?",
  },
  ref,
) {
  // Local snapshot of conversation and in-progress message for rendering
  const [conversation, setConversation] = useState<readonly ChatMessage[]>(
    () => agent.context.conversation,
  );
  const [inProgress, setInProgress] = useState<ChatMessage | undefined>(
    () => agent.context.in_progress,
  );
  // System messages read-only drawer state
  const [systemMessages, setSystemMessages] = useState<readonly ChatMessage[]>(
    () => agent.context.system,
  );
  const [isSystemOpen, setIsSystemOpen] = useState(false);
  const drawerCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  // UI submit status derived from context + local actions
  const [status, setStatus] = useState<
    "idle" | "submitted" | "streaming" | "error"
  >("idle");

  // Trigger value to tell the Conversation (StickToBottom tree) to auto-scroll
  const [autoScrollTrigger, setAutoScrollTrigger] = useState(0);

  // Refs for form control and live region
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to context notifications
  useEffect(() => {
    const unsubscribe = agent.context.listen((ctx) => {
      setConversation([...ctx.conversation]);
      setInProgress(ctx.in_progress);
      setSystemMessages([...ctx.system]);

      // Update status: streaming if in_progress present; otherwise idle
      setStatus((prev) =>
        ctx.in_progress
          ? "streaming"
          : prev === "submitted"
            ? "submitted"
            : "idle",
      );
    });

    return () => {
      unsubscribe();
    };
  }, [agent]);

  // When conversation or in-progress updates, bump the auto-scroll trigger so
  // the consumer inside the StickToBottom tree can call scrollToBottom().
  useEffect(() => {
    const t = setTimeout(() => setAutoScrollTrigger((n) => n + 1), 50);
    return () => clearTimeout(t);
  }, [conversation, inProgress]);

  // Manage drawer focus & keyboard accessibility
  useEffect(() => {
    if (!isSystemOpen) return;

    // save last focused element to restore on close
    lastFocusedElementRef.current =
      document.activeElement as HTMLElement | null;

    // focus the close button when opening
    drawerCloseButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSystemOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // restore focus
      lastFocusedElementRef.current?.focus();
    };
  }, [isSystemOpen]);

  // Announce status changes for screen readers
  useEffect(() => {
    if (!liveRegionRef.current) return;
    const el = liveRegionRef.current;
    if (status === "submitted") {
      el.textContent = "Message submitted.";
    } else if (status === "streaming") {
      el.textContent = "Assistant is thinking.";
    } else if (status === "error") {
      el.textContent = "There was an error sending your message.";
    } else {
      el.textContent = "";
    }
  }, [status]);

  // Build a user ChatMessage from a string
  const buildUserMessage = (text: string): ChatMessage => ({
    type: "user",
    content: [{ type: "text", text }],
  });

  // Handler for form submit
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const text = (formData.get("message") as string | null) ?? "";
    const trimmed = text.trim();
    if (!trimmed) return;
    // Clear textarea after grabbing value (uncontrolled fallback)
    if (textareaRef.current) {
      textareaRef.current.value = "";
    }

    const message = buildUserMessage(trimmed);
    setStatus("submitted");

    try {
      // Call agent.act which will update context and stream in_progress
      await agent.act(message);
      // agent.act will add final assistant message to conversation and clear in_progress
      setStatus("idle");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Agent act error", err);
      setStatus("error");
    }
  };

  // Helper to render MessagePart arrays
  const renderMessageParts = (
    parts: MessagePart[],
    role: ChatMessage["type"],
    isStreaming = false,
  ) => {
    return parts.map((part, idx) => {
      if (part.type === "text") {
        return <Response key={idx}>{part.text}</Response>;
      }

      if (part.type === "thinking") {
        // Show reasoning UI; streaming flag controls auto-open and spinner state
        return (
          <Reasoning
            key={idx}
            isStreaming={isStreaming}
            defaultOpen={isStreaming}
          >
            <ReasoningTrigger />
            <ReasoningContent>{part.text}</ReasoningContent>
          </Reasoning>
        );
      }

      if (part.type === "tool") {
        // Determine tool state
        const hasOutput =
          typeof part.tool_output !== "undefined" && part.tool_output !== null;
        const toolState = hasOutput ? "output-available" : "input-available";
        const headerType = part.tool ?? part.id ?? "tool";

        return (
          <Tool key={idx} className="overflow-auto">
            <ToolHeader type={`tool-${headerType}`} state={toolState} />
            <ToolContent>
              <ToolInput input={{ name: part.tool, input: part.tool_input }} />
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

      return null;
    });
  };

  // Render a chat message wrapper
  const renderChatMessage = (
    msg: ChatMessage,
    index: number,
    streaming = false,
  ) => {
    const from =
      msg.type === "user"
        ? "user"
        : msg.type === "event"
          ? "event"
          : "assistant";
    const avatarSrc =
      msg.type === "user"
        ? userAvatarSrc
        : msg.type === "event"
          ? undefined
          : assistantAvatarSrc;

    return (
      <article
        key={`${msg.type}-${index}-${streaming ? "stream" : "final"}`}
        role="article"
        aria-label={`${msg.type} message`}
        className="w-full"
      >
        {from === "event" ? (
          <Tool className="overflow-auto border-primary/20">
            <ToolHeader type="tool-event" state="output-available" />
            <ToolContent>
              <div className="flex flex-col gap-2">
                {msg.content.map((part, idx) => {
                  if (part.type === "text") {
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"
                      >
                        <div className="flex items-center gap-2 font-medium text-primary">
                          <span className="i-lucide-bell h-4 w-4" />
                          Event
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-foreground/80">
                          {part.text}
                        </div>
                      </div>
                    );
                  }

                  // For non-text event parts, show a JSON-like inspector
                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"
                    >
                      <div className="flex items-center gap-2 font-medium text-primary">
                        <span className="i-lucide-code h-4 w-4" />
                        Event Data
                      </div>
                      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap p-2 text-xs text-foreground/70">
                        {JSON.stringify(part, null, 2)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </ToolContent>
          </Tool>
        ) : (
          <Message from={from}>
            {avatarSrc && <MessageAvatar src={avatarSrc} name={msg.type} />}
            <MessageContent>
              {msg.type === "event" ? (
                <div className="flex flex-col gap-2">
                  {msg.content.map((part, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground/80"
                    >
                      <div className="flex items-center gap-2 font-medium text-primary">
                        <span className="i-lucide-info h-4 w-4" />
                        Event
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">
                        {part.type === "text"
                          ? part.text
                          : JSON.stringify(part)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2">
                  {renderMessageParts(msg.content, msg.type, streaming)}
                  {/* Stats */}
                  {"stats" in msg && msg.stats ? (
                    <div
                      className="text-xs text-muted-foreground mt-1"
                      aria-hidden
                    >
                      {typeof msg.stats.intokens === "number" && (
                        <span className="mr-2">in: {msg.stats.intokens}</span>
                      )}
                      {typeof msg.stats.outtokens === "number" && (
                        <span>out: {msg.stats.outtokens}</span>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </MessageContent>
          </Message>
        )}
      </article>
    );
  };

  // Prompt height assumptions:
  // ConversationContent already uses pb-24 by default, but we keep prompt height small
  // and absolutely position it to ensure visibility. If you change the prompt's
  // vertical size, update conversation padding accordingly.
  return (
    <div
      ref={ref}
      className={cn("relative flex h-full flex-col min-h-0 flex-1", className)}
    >
      {/* Live region for status announcements */}
      <div ref={liveRegionRef} aria-live="polite" className="sr-only" />

      {/* System messages drawer toggle */}
      <div className="absolute top-2 right-2 z-20">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isSystemOpen}
          aria-controls="system-drawer"
          onClick={() => setIsSystemOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm text-primary shadow-sm transition-all hover:bg-primary/20 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        >
          <span className="i-lucide-info h-4 w-4" aria-hidden />
          <span className="sr-only">Open system messages</span>
          <span className="font-medium">System</span>
        </button>
      </div>

      {/* Drawer Panel */}
      <div
        id="system-drawer"
        role="dialog"
        aria-label="System messages"
        aria-modal="false"
        className={cn(
          "fixed inset-y-0 right-0 z-30 w-full max-w-md transform bg-card shadow-2xl transition-transform duration-200 ease-in-out border-l border-primary/20",
          isSystemOpen ? "translate-x-0" : "translate-x-full",
        )}
        style={{ willChange: "transform" }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-primary/20 bg-primary/5 px-4 py-3 mt-20">
            <h2 className="text-sm font-semibold text-primary">
              System Messages
            </h2>
            <div className="flex items-center gap-2">
              <button
                ref={drawerCloseButtonRef}
                type="button"
                onClick={() => setIsSystemOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                aria-label="Close system messages"
              >
                Close
              </button>
            </div>
          </div>

          <div className="overflow-auto p-4 bg-background/50" tabIndex={-1}>
            {systemMessages && systemMessages.length > 0 ? (
              systemMessages.map((msg, i) => renderChatMessage(msg, i, false))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                No system messages.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversation area */}
      <Conversation
        className="min-h-0 flex-1"
        autoScrollTrigger={autoScrollTrigger}
      >
        <ConversationContent>
          {/* Conversation history */}
          {conversation.map((msg, i) => renderChatMessage(msg, i, false))}

          {/* In progress streaming message if present */}
          {inProgress
            ? renderChatMessage(inProgress, conversation.length, true)
            : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Prompt area (normal document flow, not absolutely positioned) */}
      <div className="px-3 pb-4 pt-2">
        <PromptInput
          onSubmit={handleSubmit}
          className="z-10 bg-card/95 backdrop-blur-sm rounded-2xl shadow-lg border border-primary/20 ring-1 ring-primary/10"
          aria-label="Send a message"
        >
          <div className="px-3 py-3">
            <PromptInputTextarea
              ref={textareaRef}
              name="message"
              placeholder={placeholder}
              aria-label="Message"
              minHeight={48}
              maxHeight={164}
              className="resize-none text-foreground placeholder:text-muted-foreground/70"
            />
          </div>
          <PromptInputToolbar className="border-t border-primary/10 bg-primary/5 rounded-b-2xl">
            <PromptInputTools>
              {/* Add any additional toolbar items here in future */}
            </PromptInputTools>
            <div className="flex items-center gap-2 pr-3">
              <div aria-hidden>
                {status === "streaming" ? <Loader /> : null}
              </div>
              <PromptInputSubmit
                status={
                  status === "streaming"
                    ? "streaming"
                    : status === "submitted"
                      ? "submitted"
                      : undefined
                }
                aria-label="Send message"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors"
              />
            </div>
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
});
