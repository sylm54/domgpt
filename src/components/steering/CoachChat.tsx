import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useAddInfo } from "@/data/info";
import { CoachAgent } from "../../lib/agent";
import type { Model } from "../../lib/models";
import { tool } from "../../lib/models";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Chat } from "../ui/shadcn-io/ai/chat";
import { useSettingsStore } from "@/data/settings";
import { getCoachPrompt } from "@/prompts/coach";
import { useProfileStore } from "@/data/profile";

interface CoachChatProps {
	model: Model;
	isOnboarding?: boolean;
	onOnboardingComplete?: () => void;
}

export function CoachChat({ model, isOnboarding = false, onOnboardingComplete }: CoachChatProps) {
	const [agent, setAgent] = useState<CoachAgent | null>(null);
	const [showCompleteButton, setShowCompleteButton] = useState(false);
	const { profile, setProfile, updateProfile } = useProfileStore();
	const { settings } = useSettingsStore();
	const addInfo = useAddInfo();

	useEffect(() => {
		if (!isOnboarding) return;
		if (profile) return;
		setProfile({
			goal: "",
			plan: { hypno: "", challenges: "", user: "" },
			profile: "",
			created_at: new Date(),
		});
	}, [isOnboarding, profile, setProfile]);

	useEffect(() => {
		const coachAgent = new CoachAgent(model);
		setAgent(coachAgent);
	}, [model]);

	// Define tools for the Coach Agent - memoized to prevent unnecessary re-renders
	const tools = useMemo(
		() => [
			tool({
				name: "SetData",
				description: "Set user profile or goal data.",
				schema: {
					aspect: z.enum(["profile", "goal"]),
					content: z.string().describe("string of the data to set"),
				},
				call: async ({ aspect, content }) => {
					console.log("Profile:", profile);
					switch (aspect) {
						case "profile": {
							updateProfile({
								profile: content,
							});
							return `Profile updated successfully`;
						}
						case "goal": {
							updateProfile({
								goal: content,
							});
							return `Goal updated successfully`;
						}
						default:
							return "Unknown aspect";
					}
				},
			}),
			tool({
				name: "SetPlan",
				description: "Set a specific feature's plan in the conditioning plan",
				schema: {
					feature: z
						.enum(["hypno", "challenges"])
						.describe("The feature name (e.g., 'hypno', 'challenges')"),
					plan: z.string().describe("The plan description for the feature"),
				},
				call: async ({ feature, plan: planContent }) => {
					try {
						updateProfile({
							plan: {
								...profile.plan,
								[feature]: planContent,
							},
						});
						return `Plan for "${feature}" updated successfully`;
					} catch (error) {
						return `Error: ${error instanceof Error ? error.message : String(error)}`;
					}
				},
			}),
			// tool({
			// 	name: "SaveInfo",
			// 	description: "Save specific user information for RAG retrieval",
			// 	schema: {
			// 		content: z.string().describe("The information to save"),
			// 		tags: z.string().optional().describe("Comma-separated tags for categorization"),
			// 	},
			// 	call: async ({ content, tags }) => {
			// 		await addInfo(
			// 			content,
			// 			tags
			// 				?.split(",")
			// 				.map((t) => t.trim())
			// 				.filter(Boolean) || []
			// 		);
			// 		return "Information saved successfully";
			// 	},
			// }),
			tool({
				name: "GetCurrentData",
				description: "Get the current user profile, plan, and goal data",
				schema: {},
				call: async () => {
					return JSON.stringify({
						profile: profile?.profile,
						plan: profile?.plan,
						goal: profile?.goal,
					});
				},
			}),
			tool({
				name: "Complete",
				description: "Mark the coaching process as complete",
				schema: {},
				call: async () => {
					setShowCompleteButton(true);
					return "Coaching process marked as complete.";
				},
			}),
		],
		[profile, updateProfile, addInfo]
	);

	// Inject tools into agent when it's created
	useEffect(() => {
		if (agent) {
			// Override the act method to include tools
			const originalAct = agent.act.bind(agent);
			agent.act = async (message, _, onProgress) => {
				return originalAct(message, tools, onProgress);
			};

			// Build system prompt based on phase
			const systemPrompt = getCoachPrompt(isOnboarding, settings.coach_traits ?? []);

			if (isOnboarding) {
				if (agent.context.conversation.length === 0) {
					agent.addAgentMessage(
						`
Hello! I'm your Coach here to condition you. Tell me about your goals and any previous experience you have.
             `.trim()
					);
				}
			}

			agent.setSystemPrompt(systemPrompt);
		}
	}, [agent, isOnboarding, tools, settings.coach_traits]);

	if (!agent) {
		return (
			<Card className="h-full">
				<CardContent className="flex items-center justify-center h-full">
					<div className="text-muted-foreground">Initializing Coach...</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="border-b">
				<CardTitle className="flex items-center gap-2">
					<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
					{isOnboarding ? "Coach - Discovery" : "Coach Session"}
				</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 p-0 min-h-0 relative">
				<Chat
					agent={agent}
					placeholder={
						isOnboarding
							? "Tell me about your goals and experience..."
							: "Chat with your Coach about your progress, goals, or challenges..."
					}
					className="h-full"
				/>
				{/* Complete Onboarding Button */}
				{showCompleteButton && isOnboarding && onOnboardingComplete && (
					<div className="absolute bottom-24 left-4 right-4 z-10">
						<Button onClick={onOnboardingComplete} className="w-full" size="lg">
							Complete Onboarding
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
