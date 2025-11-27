"use client";

import { Button } from "@repo/shadcn-ui/components/ui/button";
import { cn } from "@repo/shadcn-ui/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import React, { forwardRef, useCallback, useEffect } from "react";
import type { ComponentProps } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

export type ConversationProps = ComponentProps<typeof StickToBottom> & {
  /**
   * Optional numeric trigger value. When the value changes and the
   * Conversation is rendered, an internal consumer (inside the StickToBottom
   * tree) will call `scrollToBottom()` so consumers can request an imperative
   * scroll without directly accessing internals.
   */
  autoScrollTrigger?: number;
};

/**
 * Forward ref wrapper for the StickToBottom container.
 *
 * Note: we do not consume the StickToBottom context here because the provider
 * is the StickToBottom component itself. Instead, we render the children into
 * the StickToBottom provider and, if requested, render the
 * `ConversationAutoScroll` consumer inside that tree so it can safely access
 * the context and trigger scrolling.
 */
export const Conversation = forwardRef<HTMLDivElement, ConversationProps>(
  function Conversation(
    { className, autoScrollTrigger, children, ...props },
    ref,
  ) {
    return (
      <StickToBottom
        className={cn("relative flex flex-col min-h-0", className)}
        initial="smooth"
        resize="smooth"
        role="log"
        {...props}
      >
        {children as any}
        {typeof autoScrollTrigger === "number" ? (
          <ConversationAutoScroll trigger={autoScrollTrigger} />
        ) : null}
      </StickToBottom>
    );
  },
);

Conversation.displayName = "Conversation";

/**
 * A small internal consumer that uses the StickToBottom context and triggers
 * an imperative scroll whenever the `trigger` value changes. This component
 * must be rendered inside the StickToBottom tree to access its context.
 */
export const ConversationAutoScroll = ({ trigger }: { trigger: number }) => {
  const { scrollToBottom } = useStickToBottomContext();

  useEffect(() => {
    if (typeof scrollToBottom === "function") {
      scrollToBottom();
    }
  }, [trigger, scrollToBottom]);

  return null;
};

export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => (
  <StickToBottom.Content
    className={cn("flex-1 overflow-y-auto p-4 pb-24", className)}
    {...props}
  />
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    !isAtBottom && (
      <Button
        className={cn(
          "absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full",
          className,
        )}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
};
