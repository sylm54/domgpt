import { Loader2, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Agent } from "@/lib/agent";
import { tool } from "@/lib/models";
import { useProfileStore } from "@/data/profile";
import { Chat } from "@/components/ui/shadcn-io/ai/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProfileSettingPrompt } from "@/prompts/coach";

interface ProfileStepProps {
	model: any; // eslint-disable-line @typescript-eslint/no-explicit-any
	onComplete: () => void;
}

export function ProfileStep({ model, onComplete }: ProfileStepProps) {
	const { profile, updateProfile, getProfile } = useProfileStore();
	const [agent, setAgent] = useState<Agent | null>(null);
	const [loading, setLoading] = useState(true);
	const [completed, setCompleted] = useState(false);

	// Create agent for profile establishment
	useEffect(() => {
		if (profile?.data?.profile?.environment) {
			setLoading(false);
			setCompleted(true);
			return;
		}

		const profileAgent = new Agent(model, getProfileSettingPrompt(profile));

		// Get the goal from the profile
		const goal = profile?.data?.goal;

		profileAgent.addAgentMessage(
			`
Hello! I'm here to help establish your profile. This will help us understand your current situation and create a personalized coaching experience for you.

Your goal: ${goal.description}

I'll gather information about:
- Your environment and daily context
- Your habits and routines
- Your strengths and weaknesses
- Your beliefs and identity
- Any constraints you face
- Resources available to you

Let's start building your profile together. Have you tried working toward this goal before? Tell me a bit about your past experiences with it.
`.trim()
		);

		setAgent(profileAgent);
		setLoading(false);
	}, [model, profile]);

	// Define tools for the Profile Establishment Agent
	const tools = useMemo(
		() => [
			tool({
				name: "SetProfile",
				description: "Set the user's profile information",
				schema: {
					environment: z.string().describe("The user's living/work environment"),
					habits: z.array(z.string()).describe("Current habits and routines"),
					strengths: z.array(z.string()).describe("The user's strengths and positive attributes"),
					weaknesses: z.array(z.string()).describe("Areas for improvement"),
					beliefs: z.array(z.string()).describe("The user's beliefs and mindset"),
					identity: z.string().describe("How the user sees themselves"),
					constraints: z.array(z.string()).describe("Limitations or obstacles"),
					resources: z
						.array(
							z.object({
								name: z.string(),
								description: z.string(),
								tags: z.array(z.string()),
							})
						)
						.describe("Available resources and assets"),
					currentMilestone: z.number().describe("Current progress milestone (0-based index)"),
				},
				call: async ({
					environment,
					habits,
					strengths,
					weaknesses,
					beliefs,
					identity,
					constraints,
					resources,
					currentMilestone,
				}) => {
					const currentProfile = getProfile();
					updateProfile({
						data: {
							...currentProfile?.data,
							profile: {
								environment,
								habits,
								strengths,
								weaknesses,
								beliefs,
								identity,
								constraints,
								resources,
								currentMilestone,
							},
						},
					});
					setCompleted(true);
					return `Profile established successfully! You see yourself as: ${identity}`;
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
		const profileData = getProfile()?.data?.profile;
		console.log("Established Profile Data:", profileData);
		return (
			<div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
				<div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
					<User className="w-10 h-10 text-primary" />
				</div>
				<div className="space-y-2">
					<h3 className="text-xl font-semibold">Profile Established!</h3>
					<p className="text-sm text-muted-foreground max-w-md">
						Your profile has been created. We now understand your environment, habits, strengths,
						and constraints to provide personalized coaching.
					</p>
				</div>
				{profileData && (
					<div className="mt-4 space-y-3 text-left max-w-lg mx-auto">
						<div className="p-3 bg-muted/30 rounded-lg border border-border/50">
							<div className="flex items-center gap-2 mb-2">
								<User className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium">Identity</span>
							</div>
							<p className="text-xs text-muted-foreground">{profileData.identity}</p>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="p-3 bg-muted/30 rounded-lg border border-border/50">
								<span className="text-xs font-medium text-muted-foreground block mb-1">
									Strengths
								</span>
								<div className="flex flex-wrap gap-1">
									{profileData.strengths.slice(0, 3).map((strength, i) => (
										<span
											key={`strength-${strength}`}
											className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
										>
											{strength}
										</span>
									))}
									{profileData.strengths.length > 3 && (
										<span className="text-xs text-muted-foreground">
											+{profileData.strengths.length - 3} more
										</span>
									)}
								</div>
							</div>
							<div className="p-3 bg-muted/30 rounded-lg border border-border/50">
								<span className="text-xs font-medium text-muted-foreground block mb-1">Habits</span>
								<div className="flex flex-wrap gap-1">
									{profileData.habits.slice(0, 3).map((habit, i) => (
										<span
											key={`habit-${habit}`}
											className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
										>
											{habit}
										</span>
									))}
									{profileData.habits.length > 3 && (
										<span className="text-xs text-muted-foreground">
											+{profileData.habits.length - 3} more
										</span>
									)}
								</div>
							</div>
						</div>
					</div>
				)}
				<Button onClick={onComplete} size="lg" className="min-w-[160px]">
					Continue to Milestones
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
					Let's establish your profile. I'll ask you questions about your environment, habits,
					strengths, and constraints to understand your current situation better.
				</p>
			</div>

			{agent && (
				<div className="flex-1 min-h-0 border border-border/50 rounded-lg overflow-hidden">
					<Chat
						agent={agent}
						placeholder="Tell me about yourself..."
						className="h-full"
						tool_display={() => (
							<Card className="bg-muted/30 border-primary/20">
								<CardContent className="py-3 px-4">
									<div className="flex items-center gap-2 text-xs">
										<User className="w-4 h-4 text-primary" />
										<span className="font-medium">Building Profile</span>
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										Gathering information about your situation...
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
