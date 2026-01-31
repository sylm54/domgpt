import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useAddInfo } from "@/data/info";
import { CoachAgent } from "../../lib/agent";
import type { Model } from "../../lib/models";
import { tool } from "../../lib/models";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Chat } from "../ui/shadcn-io/ai/chat";
import { useSettingsStore } from "@/data/settings";
import { getCoachPrompt } from "@/prompts/coach";
import { useProfileStore } from "@/data/profile";
import {
	CheckCircle2,
	Database,
	FileText,
	PlayCircle,
	RefreshCw,
	AlertCircle,
	Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CoachChatProps {
	model: Model;
	isOnboarding?: boolean;
	onOnboardingComplete?: () => void;
}

export function CoachChat({ model, isOnboarding = false, onOnboardingComplete }: CoachChatProps) {
	const [agent, setAgent] = useState<CoachAgent | null>(null);
	const [showCompleteButton, setShowCompleteButton] = useState(false);
	const { profile, setProfile, updateProfile, updatePlan, getProfile } = useProfileStore();
	const { settings } = useSettingsStore();
	const addInfo = useAddInfo();
	const prevProfileRef = useRef(JSON.parse(JSON.stringify(profile ?? {})));
	useEffect(() => {
		if (!isOnboarding) return;
		if (profile) return;
		setProfile({
			goal: "",
			plan: { hypno: "", challenges: "", user: "", interview: "" },
			profile: "",
			created_at: new Date(),
		});
		prevProfileRef.current = {
			goal: "",
			plan: { hypno: "", challenges: "", user: "", interview: "" },
			profile: "",
			created_at: new Date(),
		};
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
					aspect: z.enum(["profile", "goal"]).describe("The aspect to set (profile or goal)"),
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
				description: "Set a specific feature's plan",
				schema: {
					feature: z
						.enum(["hypno", "challenges", "user", "interview"])
						.describe("The feature name)"),
					plan: z.string().describe("The plan description for the feature"),
				},
				call: async ({ feature, plan }) => {
					try {
						console.log(getProfile());
						updatePlan(feature, plan);
						console.log(getProfile());
						return `Plan for "${feature}" updated successfully`;
					} catch (error) {
						return `Error: ${error instanceof Error ? error.message : String(error)}`;
					}
				},
			}),
			tool({
				name: "GetCurrentData",
				description: "Get the current user profile, plan, and goal data",
				schema: {},
				call: async () => {
					const profile = getProfile();
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
				call: async (): Promise<string> => {
					const profile = getProfile();
					if (prevProfileRef.current.plan.user === profile.plan.user) {
						prevProfileRef.current.plan.user += "warned";
						return "You havent set/updated the user feature plan yet. If you are sure you dont want to set/update it ignore this message and call Complete again.";
					}
					if (prevProfileRef.current.plan.hypno === profile.plan.hypno) {
						prevProfileRef.current.plan.hypno += "warned";
						return "You havent set/updated the hypno feature plan yet. If you are sure you dont want to set/update it ignore this message and call Complete again.";
					}
					if (prevProfileRef.current.plan.challenges === profile.plan.challenges) {
						prevProfileRef.current.plan.challenges += "warned";
						return "You havent set/updated the challenges feature plan yet. If you are sure you dont want to set/update it ignore this message and call Complete again.";
					}
					if (prevProfileRef.current.plan.interview === profile.plan.interview) {
						prevProfileRef.current.plan.interview += "warned";
						return "You havent set/updated the interview feature plan yet. If you are sure you dont want to set/update it ignore this message and call Complete again.";
					}
					setShowCompleteButton(true);
					return "Coaching process marked as complete.";
				},
			}),
		],
		[getProfile, updateProfile, updatePlan]
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
					tool_display={(tool) => {
						try {
							const input = tool.tool_input ? JSON.parse(tool.tool_input) : {};

							// Handle SetData tool (profile or goal)
							if (tool.tool === "SetData") {
								const aspect = input.aspect;
								const aspectLabel = aspect === "profile" ? "Profile" : "Goal";
								const aspectColor = aspect === "profile" ? "bg-blue-500" : "bg-purple-500";

								return (
									<div className="flex items-center gap-2 text-sm">
										<Database className="w-4 h-4 text-blue-500" />
										<span className="text-muted-foreground">Updated</span>
										<Badge variant="secondary" className={cn("font-medium", aspectColor)}>
											{aspectLabel}
										</Badge>
									</div>
								);
							}

							// Handle SetPlan tool
							if (tool.tool === "SetPlan") {
								const feature = input.feature;
								const featureLabels: Record<string, string> = {
									hypno: "Hypnosis",
									challenges: "Challenges",
									user: "User Profile",
									interview: "Interview",
								};
								const featureColor: Record<string, string> = {
									hypno: "bg-pink-500",
									challenges: "bg-orange-500",
									user: "bg-green-500",
									interview: "bg-teal-500",
								};

								return (
									<div className="flex items-center gap-2 text-sm">
										<FileText className="w-4 h-4 text-orange-500" />
										<span className="text-muted-foreground">Set plan for</span>
										<Badge variant="secondary" className={cn("font-medium", featureColor[feature])}>
											{featureLabels[feature] || feature}
										</Badge>
									</div>
								);
							}

							// Handle GetCurrentData tool
							if (tool.tool === "GetCurrentData") {
								return (
									<div className="flex items-center gap-2 text-sm">
										<RefreshCw className="w-4 h-4 text-cyan-500" />
										<span className="text-muted-foreground">Retrieved current data</span>
										<Badge variant="outline" className="text-cyan-500 border-cyan-500">
											<Info className="w-3 h-3 mr-1" />
											View
										</Badge>
									</div>
								);
							}

							// Handle Complete tool
							if (tool.tool === "Complete") {
								return (
									<div className="flex items-center gap-2 text-sm">
										<CheckCircle2 className="w-4 h-4 text-green-500" />
										<span className="text-muted-foreground">Marked coaching as</span>
										<Badge variant="secondary" className="bg-green-500 font-medium">
											Complete
										</Badge>
									</div>
								);
							}

							// Handle fallback for input-based tools
							if (input.aspect) {
								return (
									<div className="flex items-center gap-2 text-sm">
										<Database className="w-4 h-4 text-blue-500" />
										<span className="text-muted-foreground">Updated</span>
										<Badge variant="secondary" className="bg-blue-500 font-medium">
											{input.aspect}
										</Badge>
									</div>
								);
							}

							if (input.feature) {
								return (
									<div className="flex items-center gap-2 text-sm">
										<FileText className="w-4 h-4 text-orange-500" />
										<span className="text-muted-foreground">Set plan for</span>
										<Badge variant="secondary" className="bg-orange-500 font-medium">
											{input.feature}
										</Badge>
									</div>
								);
							}

							// Handle unknown tools
							return (
								<div className="flex items-center gap-2 text-sm">
									<PlayCircle className="w-4 h-4 text-gray-500" />
									<span className="text-muted-foreground">Executed tool:</span>
									<Badge variant="outline" className="font-mono text-xs">
										{tool.tool}
									</Badge>
								</div>
							);
						} catch (e) {
							console.error("Tool parsing error:", e);
							return (
								<div className="flex items-center gap-2 text-sm">
									<AlertCircle className="w-4 h-4 text-red-500" />
									<span className="text-muted-foreground">Tool parsing failed:</span>
									<Badge variant="destructive" className="font-mono text-xs">
										{tool.tool}
									</Badge>
								</div>
							);
						}
					}}
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
