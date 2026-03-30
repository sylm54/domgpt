import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface InitialCoachSessionStepProps {
	onComplete: () => void;
}

export function InitialCoachSessionStep({ onComplete }: InitialCoachSessionStepProps) {
	const navigate = useNavigate();

	const handleStartCoaching = () => {
		onComplete();
		navigate("/coach");
	};

	return (
		<div className="flex flex-col items-center justify-center h-full space-y-8 text-center">
			{/* Success Icon */}
			<div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
				<Sparkles className="w-12 h-12 text-primary" />
			</div>

			{/* Completion Message */}
			<div className="space-y-4 max-w-lg">
				<div>
					<h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
					<p className="text-muted-foreground leading-relaxed">
						Your personalized coaching experience has been configured. Your goal, profile, and
						milestones are ready.
					</p>
				</div>

				{/* Setup Summary */}
				<Card className="bg-muted/30 border-border/50">
					<CardContent className="pt-6">
						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<Badge variant="secondary" className="bg-primary/10 text-primary">
									✓
								</Badge>
								<div className="text-left">
									<p className="font-medium text-sm">Goal Defined</p>
									<p className="text-xs text-muted-foreground">
										Your conditioning goal has been established
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Badge variant="secondary" className="bg-primary/10 text-primary">
									✓
								</Badge>
								<div className="text-left">
									<p className="font-medium text-sm">Personas Created</p>
									<p className="text-xs text-muted-foreground">
										Coach, Reflection, and Hypno Style configured
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Badge variant="secondary" className="bg-primary/10 text-primary">
									✓
								</Badge>
								<div className="text-left">
									<p className="font-medium text-sm">Profile Established</p>
									<p className="text-xs text-muted-foreground">
										Your environment, habits, and constraints understood
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Badge variant="secondary" className="bg-primary/10 text-primary">
									✓
								</Badge>
								<div className="text-left">
									<p className="font-medium text-sm">Milestones Set</p>
									<p className="text-xs text-muted-foreground">
										Your journey path has been created
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Badge variant="secondary" className="bg-primary/10 text-primary">
									✓
								</Badge>
								<div className="text-left">
									<p className="font-medium text-sm">Hypno Profile Ready</p>
									<p className="text-xs text-muted-foreground">
										Your hypnosis style and language preferences configured
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="space-y-2">
					<p className="text-sm font-medium">Ready to begin?</p>
					<p className="text-xs text-muted-foreground">
						Start your first coaching session and begin your conditioning journey.
					</p>
				</div>
			</div>

			{/* Start Button */}
			<Button
				onClick={handleStartCoaching}
				size="lg"
				className="min-w-[200px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-200"
			>
				Start First Coach Session
				<ArrowRight className="w-4 h-4 ml-2" />
			</Button>
		</div>
	);
}
