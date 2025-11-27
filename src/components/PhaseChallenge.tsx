import { Lock, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PhaseChallengeProps {
  challenge: {
    title: string;
    content: string;
  };
  ready: boolean;
  onComplete: () => void;
}

export function PhaseChallenge({
  challenge,
  ready,
  onComplete,
}: PhaseChallengeProps) {
  if (!ready) {
    return (
      <div className="border rounded-lg p-6 bg-muted/30">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Lock className="w-5 h-5" />
          <div>
            <h4 className="font-semibold mb-1">Challenge Locked</h4>
            <p className="text-sm">
              Your assistant will unlock this challenge when you're ready to advance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-card border-primary/30">
      <div className="flex items-start gap-3 mb-4">
        <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-lg text-primary mb-2">
            Graduation Challenge
          </h4>
          <h5 className="font-semibold mb-2">{challenge.title}</h5>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {challenge.content}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
        <Checkbox id="complete-challenge" onCheckedChange={onComplete} />
        <Label
          htmlFor="complete-challenge"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          I have completed this challenge
        </Label>
      </div>
    </div>
  );
}
