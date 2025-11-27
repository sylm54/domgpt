import { useState, useEffect, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  onPromptStateChange,
  submitPromptResponse,
  cancelPrompt,
  type UserPromptState,
} from "./info-types";

export function InfoPromptDialog() {
  const [state, setState] = useState<UserPromptState>({
    isOpen: false,
    message: "",
    response: "",
  });
  const [userResponse, setUserResponse] = useState("");
  const responseId = useId();

  useEffect(() => {
    const unsubscribe = onPromptStateChange((newState) => {
      setState(newState);
      if (newState.isOpen) {
        setUserResponse("");
      }
    });

    return unsubscribe;
  }, []);

  const handleSubmit = () => {
    if (userResponse.trim()) {
      submitPromptResponse(userResponse);
      setUserResponse("");
    }
  };

  const handleCancel = () => {
    cancelPrompt();
    setUserResponse("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog
      open={state.isOpen}
      onOpenChange={(open) => !open && handleCancel()}
    >
      <DialogContent className="sm:max-w-[500px] border-primary/20 bg-card shadow-xl shadow-primary/10">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-primary to-pink-400 bg-clip-text text-transparent">
            Info Agent Question
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            The Info Agent needs your input to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                {state.message}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={responseId}
              className="text-sm font-medium text-foreground"
            >
              Your Response
            </label>
            <Textarea
              id={responseId}
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response here..."
              className="min-h-[120px] resize-y border-primary/20 bg-background focus:border-primary focus:ring-primary/30 transition-colors"
              autoFocus
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                Ctrl
              </kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                Enter
              </kbd>
              <span className="ml-1">to submit quickly</span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!userResponse.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
