import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Agent } from "@/lib/agent";
import { tool } from "@/lib/models";
import { useProfileStore } from "@/data/profile";
import { Chat } from "@/components/ui/shadcn-io/ai/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getGoalSettingPrompt } from "@/prompts/coach";
import { isDebugMode } from "@/types/user";

interface GoalSettingStepProps {
	model: any;
	onComplete: () => void;
}

export function GoalSettingStep({ model, onComplete }: GoalSettingStepProps) {
	const { updateProfile, getProfile } = useProfileStore();
	const [agent, setAgent] = useState<Agent | null>(null);
	const [loading, setLoading] = useState(true);
	const [completed, setCompleted] = useState(false);

	useEffect(() => {
		const profile = getProfile();
		if (profile?.data?.goal && profile?.data?.goal.description !== "") {
			setCompleted(true);
			setLoading(false);
			return;
		}

		const goalSettingAgent = new Agent(model, getGoalSettingPrompt());

		goalSettingAgent.addAgentMessage(
			`
Hello! I'm your Coach, and I'm here to help you establish your conditioning goals.

Let's start by understanding what you want to achieve. I'll ask you some questions to help you define:
- What specific outcome you're looking for
- Why this goal matters to you
- Who you want to become through this process

Once we've established a clear goal, I'll set it and we can move forward with designing your personalized coaching experience.

So, tell me: what brings you here today? What would you like to achieve?
`.trim()
		);

		setAgent(goalSettingAgent);
		setLoading(false);
	}, [model]);

	// Create agent for goal setting
	useEffect(() => {
		const goalSettingAgent = new Agent(model, getGoalSettingPrompt());

		goalSettingAgent.addAgentMessage(
			`
Hello! I'm your Coach, and I'm here to help you establish your conditioning goals.

Let's start by understanding what you want to achieve. I'll ask you some questions to help you define:
- What specific outcome you're looking for
- Why this goal matters to you
- Who you want to become through this process

Once we've established a clear goal, I'll set it and we can move forward with designing your personalized coaching experience.

So, tell me: what brings you here today? What would you like to achieve?
`.trim()
		);

		setAgent(goalSettingAgent);
		setLoading(false);
	}, [model]);

	// Define tools for the Goal Setting Agent
	const tools = useMemo(
		() => [
			tool({
				name: "SetGoal",
				description: "Set the user's goal for conditioning training",
				schema: {
					description: z.string().describe("The main goal description"),
					motivation: z.string().describe("Why this goal matters to the user"),
					targetIdentity: z.string().describe("Who the user wants to become"),
				} as any,
				call: async ({ description, motivation, targetIdentity }: any) => {
					const profile = getProfile();
					updateProfile({
						data: {
							...profile?.data,
							goal: {
								description,
								motivation,
								targetIdentity,
							},
						},
					});
					setCompleted(true);
					return `Goal set successfully! You want to: ${description}`;
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
		return (
			<div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
				<div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
					<CheckCircle2 className="w-10 h-10 text-primary" />
				</div>
				<div className="space-y-2">
					<h3 className="text-xl font-semibold">Goal Established!</h3>
					<p className="text-sm text-muted-foreground max-w-md">
						Your conditioning goal has been set. We'll use this to design your personalized personas
						and coaching experience.
					</p>
				</div>
				<Button onClick={onComplete} size="lg" className="min-w-[160px]">
					Continue to Persona Design
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
					Let's establish your conditioning goals. I'll ask you some questions to understand what
					you want to achieve and why it matters to you.
				</p>
			</div>
			{isDebugMode === true && (
				<Card className="bg-red-50 border-red-200">
					<CardContent>
						<p className="text-red-700 text-sm">
							Debug Mode is ON - you may see additional information in the console.
						</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-2"
							onClick={() => {
								updateProfile({
									data: {
										...getProfile()?.data,
										goal: {
											description:
												"Transform my overall fitness by building strength, improving cardiovascular endurance, and increasing flexibility over the next 6 months. I want to be able to run a 5k without stopping, complete a set of 10 pull-ups, and touch my toes comfortably.",
											motivation:
												"I want to feel healthier, more confident, and capable in my daily life. Achieving these milestones will help me prove to myself that I can commit to long-term goals and see real progress.",
											targetIdentity:
												"A strong, resilient, and active person who embraces challenges and inspires others to pursue their own fitness journeys.",
										},
									},
								});
								setCompleted(true);
							}}
						>
							Skip with generic goal (Debug)
						</Button>
					</CardContent>
				</Card>
			)}

			{agent && (
				<div className="flex-1 min-h-0 border border-border/50 rounded-lg overflow-hidden">
					<Chat
						agent={agent}
						placeholder="Tell me about your goals..."
						className="h-full"
						tool_display={() => (
							<Card className="bg-muted/30 border-primary/20">
								<CardContent className="py-3 px-4">
									<div className="flex items-center gap-2 text-xs">
										<CheckCircle2 className="w-4 h-4 text-primary" />
										<span className="font-medium">Goal Setting Progress</span>
									</div>
									<p className="text-xs text-muted-foreground mt-1">Establishing your goal...</p>
								</CardContent>
							</Card>
						)}
					/>
				</div>
			)}
		</div>
	);
}
