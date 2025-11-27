import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Chat } from "@/components/ui/shadcn-io/ai/chat";
import { Agent } from "@/lib/agent";
import { systemContext } from "@/lib/context";
import { model } from "@/config";
import { getConfig } from "@/config";
import { tool } from "@/lib/models";
import { z } from "zod";
import {
  onInterviewStateChange,
  cancelInterview,
  endInterview,
  getCurrentRequest,
  type InterviewState,
} from "./interview-types";

export function InterviewDialog() {
  const [state, setState] = useState<InterviewState>({
    isOpen: false,
    promptMessage: "",
    result: "",
  });
  const [interviewAgent, setInterviewAgent] = useState<Agent | null>(null);
  const configRef = useRef<Awaited<ReturnType<typeof getConfig>> | null>(null);

  // Load config on mount
  useEffect(() => {
    getConfig().then((cfg) => {
      configRef.current = cfg;
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onInterviewStateChange((newState) => {
      setState(newState);

      if (newState.isOpen && !interviewAgent) {
        // Create interview agent when dialog opens
        const config = configRef.current;
        const systemPrompt =
          config?.sysprompts?.interview_agent ??
          `You are an Interview Agent tasked with gathering information from the user.
You are conducting an interview on behalf of another agent.
Be conversational, friendly, and thorough in your questioning.
When you have gathered the necessary information, call the 'done' tool with a summary.`.trim();

        const doneTool = tool({
          name: "done",
          description:
            "End the interview and return the gathered information to the calling agent. Provide a concise summary of what you learned.",
          schema: {
            summary: z
              .string()
              .min(1)
              .describe(
                "A summary of the information gathered during the interview",
              ),
          },
          call: async ({ summary }) => {
            endInterview(summary);
            return "Interview ended.";
          },
        });

        const agent = new Agent(systemContext(systemPrompt), model, [doneTool]);

        // Add initial context from the calling agent
        const request = getCurrentRequest();
        if (request?.promptMessage) {
          // Use act to initialize the conversation with the prompt message
          agent.act({
            type: "user",
            content: [
              {
                type: "text",
                text: request.promptMessage,
              },
            ],
          });
        }

        setInterviewAgent(agent);
      } else if (!newState.isOpen && interviewAgent) {
        // Clean up agent when dialog closes
        setInterviewAgent(null);
      }
    });

    return unsubscribe;
  }, [interviewAgent]);

  const handleCancel = () => {
    cancelInterview();
    setInterviewAgent(null);
  };

  return (
    <Dialog
      open={state.isOpen}
      onOpenChange={(open) => !open && handleCancel()}
    >
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 border-primary/20 bg-gradient-to-b from-card to-card/95">
        <DialogHeader className="px-6 pt-6 pb-2 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-accent/5">
          <DialogTitle className="text-primary font-semibold">
            Interview Session
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            The agent is conducting an interview to gather information.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 pb-6">
          {interviewAgent ? (
            <Chat
              agent={interviewAgent}
              placeholder="Type your response..."
              className="h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full shadow-lg shadow-primary/20" />
                <span className="text-sm text-muted-foreground animate-pulse">
                  Preparing interview...
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
