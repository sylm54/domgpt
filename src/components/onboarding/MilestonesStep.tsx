import { CheckCircle2, Loader2, Flag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Agent } from "@/lib/agent";
import { tool } from "@/lib/models";
import { useProfileStore } from "@/data/profile";
import { Chat } from "@/components/ui/shadcn-io/ai/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMileStoneSettingPrompt } from "@/prompts/coach";

interface MilestonesStepProps {
	model: any; // eslint-disable-line @typescript-eslint/no-explicit-any
	onComplete: () => void;
}

export function MilestonesStep({ model, onComplete }: MilestonesStepProps) {
	const { profile, updateProfile, getProfile } = useProfileStore();
	const [agent, setAgent] = useState<Agent | null>(null);
	const [loading, setLoading] = useState(true);
	const [completed, setCompleted] = useState(false);

	// Create agent for milestone creation
	useEffect(() => {
		// Insta finish if profile already has milestones
		const existingMilestones = profile?.data?.milestones;
		if (existingMilestones && Array.isArray(existingMilestones) && existingMilestones.length > 0) {
			setLoading(false);
			setCompleted(true);
			return;
		}

		const milestonesAgent = new Agent(model, getMileStoneSettingPrompt(profile));

		// Get the goal and profile from the profile
		const goal = profile?.data?.goal;

		const goalText = goal ? `Your goal: ${goal.description}` : "Your goal is being established.";

		milestonesAgent.addAgentMessage(
			`
Hello! I'm here to create your milestones. Based on your goal and profile, I'll design a clear path forward with meaningful milestones that mark your progress.

${goalText}

I'll create a series of milestones that:
- Break down your journey into achievable steps
- Build on your strengths
- Account for your constraints
- Help you track your progress toward your goal

Let me design your milestones now. I'll explain each one and ensure they're realistic and achievable for you.
`.trim()
		);

		setAgent(milestonesAgent);
		setLoading(false);
	}, [model, profile]);

	// Define tools for the Milestones Agent
	const tools = useMemo(
		() => [
			tool({
				name: "SetMilestones",
				description: "Create a list of milestones derived from the user's profile and goals",
				schema: {
					milestones: z
						.array(
							z.object({
								title: z.string().describe("The title of the milestone"),
								description: z.string().describe("What achieving this milestone means"),
							})
						)
						.min(3)
						.max(10)
						.describe("List of milestones (3-10 items)"),
				},
				call: async ({ milestones }) => {
					const currentProfile = getProfile();

					// Update milestones in UserData
					updateProfile({
						data: {
							...currentProfile?.data,
							milestones,
						},
					});

					setCompleted(true);
					return `Milestones created successfully! ${milestones.length} milestones established.`;
				},
			}),
		],
		[getProfile, updateProfile]
	);

	// Override act method to include tools
	useEffect(() => {
		if (!agent) return;

		const originalAct = agent.act.bind(agent);
		agent.act = async (message, _, onProgress) => {
			return originalAct(message, tools, onProgress);
		};

		return () => {
			// Cleanup if needed
		};
	}, [agent, tools]);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	if (completed) {
		const milestones = getProfile()?.data?.milestones || [];
		return (
			<div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
				<div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
					<Flag className="w-10 h-10 text-primary" />
				</div>
				<div className="space-y-2">
					<h3 className="text-xl font-semibold">Milestones Established!</h3>
					<p className="text-sm text-muted-foreground max-w-md">
						Your journey has been broken down into {milestones.length} achievable milestones based
						on your goal and profile.
					</p>
				</div>
				{milestones.length > 0 && (
					<div className="mt-4 w-full max-w-lg">
						<div className="space-y-3 text-left">
							{milestones.map((milestone, index) => (
								<div
									key={`milestone-${milestone.title}`}
									className="p-3 bg-muted/30 rounded-lg border border-border/50"
								>
									<div className="flex items-start gap-3">
										<Badge variant="outline" className="text-xs mt-0.5">
											{index + 1}
										</Badge>
										<div className="flex-1 min-w-0">
											<h4 className="text-sm font-medium mb-1">{milestone.title}</h4>
											<p className="text-xs text-muted-foreground line-clamp-2">
												{milestone.description}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
				<Button onClick={onComplete} size="lg" className="min-w-[160px]">
					Start Coaching
					<svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<title>Next arrow</title>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
					</svg>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full space-y-4">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground leading-relaxed">
					Now I'll create your milestones. Based on your goal and profile, I'll design a clear path
					forward with meaningful steps to track your progress.
				</p>
			</div>

			{agent && (
				<div className="flex-1 min-h-0 border border-border/50 rounded-lg overflow-hidden">
					<Chat
						agent={agent}
						placeholder="I'm creating your milestones now..."
						className="h-full"
						tool_display={() => (
							<Card className="bg-muted/30 border-primary/20">
								<CardContent className="py-3 px-4">
									<div className="flex items-center gap-2 text-xs">
										<Flag className="w-4 h-4 text-primary" />
										<span className="font-medium">Creating Milestones</span>
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										Designing your path to success...
									</p>
								</CardContent>
							</Card>
						)}
					/>
				</div>
			)}
		</div>
	);
}
