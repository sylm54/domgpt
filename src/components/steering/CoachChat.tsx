import {
	AlertCircle,
	CheckCircle2,
	Database,
	FileText,
	Info,
	PlayCircle,
	RefreshCw,
	Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useAddInfo } from "@/data/info";
import { useProfileStore } from "@/data/profile";
import { useSettingsStore } from "@/data/settings";
import { cn } from "@/lib/utils";
import { getCoachPrompt } from "@/prompts/coach";
import { CoachAgent } from "../../lib/agent";
import type { Model } from "../../lib/models";
import { tool } from "../../lib/models";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Chat } from "../ui/shadcn-io/ai/chat";
import { useGetPromptHistoryData } from "@/data/history";

interface CoachChatProps {
	model: Model;
	isOnboarding?: boolean;
	onOnboardingComplete?: () => void;
}

// Tool action card component with animations
function ToolActionCard({
	icon: Icon,
	iconColor,
	label,
	badge,
	badgeClassName,
	borderColor,
}: {
	icon: React.ComponentType<{ className?: string }>;
	iconColor: string;
	label: string;
	badge: React.ReactNode;
	badgeClassName?: string;
	borderColor: string;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 8, scale: 0.95 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
			className={cn(
				"flex items-center gap-3 px-4 py-3 rounded-xl",
				"bg-gradient-to-r from-background/80 to-background/40",
				"backdrop-blur-sm border-l-4",
				"shadow-sm hover:shadow-md transition-shadow duration-200",
				borderColor
			)}
		>
			<div
				className={cn("p-2 rounded-lg bg-gradient-to-br from-background to-muted/50", iconColor)}
			>
				<Icon className="w-4 h-4" />
			</div>
			<span className="text-sm text-muted-foreground font-medium">{label}</span>
			<Badge
				variant="secondary"
				className={cn("font-semibold text-white shadow-sm", "bg-gradient-to-r", badgeClassName)}
			>
				{badge}
			</Badge>
		</motion.div>
	);
}

export function CoachChat({ model, isOnboarding = false, onOnboardingComplete }: CoachChatProps) {
	const getPromptHistoryData = useGetPromptHistoryData();
	const [agent, setAgent] = useState<CoachAgent | null>(null);
	const [showCompleteButton, setShowCompleteButton] = useState(false);
	const { profile, setProfile, updateProfile, updatePlan, getProfile } = useProfileStore();
	const { settings } = useSettingsStore();
	const addInfo = useAddInfo();
	const prevProfileRef = useRef(JSON.parse(JSON.stringify(profile ?? {})));
	const [loading, setLoading] = useState(true);
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

			getPromptHistoryData(5).then((history) => {
				// Build system prompt based on phase
				const systemPrompt = getCoachPrompt(isOnboarding, settings.coach_traits ?? [], history);

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
				setLoading(false);
			});
		}
	}, [agent, isOnboarding, tools, settings.coach_traits, getPromptHistoryData]);

	if (loading) {
		return (
			<Card className="h-64 flex items-center justify-center">
				<CardContent>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="flex flex-col items-center gap-4"
					>
						<div className="relative">
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
								className="w-12 h-12 rounded-full border-2 border-pink-500/30 border-t-pink-500"
							/>
							<div className="absolute inset-0 flex items-center justify-center">
								<Sparkles className="w-5 h-5 text-pink-400" />
							</div>
						</div>
						<span className="text-muted-foreground font-medium bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
							Loading Coach...
						</span>
					</motion.div>
				</CardContent>
			</Card>
		);
	}

	if (!agent) {
		return (
			<Card
				className={cn(
					"h-full relative overflow-hidden",
					"bg-gradient-to-br from-background/95 via-background/90 to-pink-950/20",
					"backdrop-blur-xl border-pink-500/20",
					"shadow-[0_8px_32px_rgba(236,72,153,0.15)]"
				)}
			>
				{/* Decorative corner accents */}
				<div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-pink-500/20 to-transparent rounded-br-full" />
				<div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-magenta-500/15 to-transparent rounded-tl-full" />

				<CardContent className="flex items-center justify-center h-full">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="flex flex-col items-center gap-4"
					>
						{/* Refined spinner */}
						<div className="relative">
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
								className="w-12 h-12 rounded-full border-2 border-pink-500/30 border-t-pink-500"
							/>
							<div className="absolute inset-0 flex items-center justify-center">
								<Sparkles className="w-5 h-5 text-pink-400" />
							</div>
						</div>
						<span className="text-muted-foreground font-medium bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
							Initializing Coach...
						</span>
					</motion.div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card
			className={cn(
				"h-full flex flex-col relative overflow-hidden",
				"bg-gradient-to-br from-background/95 via-background/90 to-pink-950/20",
				"backdrop-blur-xl border-pink-500/20",
				"shadow-[0_8px_32px_rgba(236,72,153,0.15)]"
			)}
		>
			{/* Decorative corner accents */}
			<div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-pink-500/20 to-transparent rounded-br-full pointer-events-none" />
			<div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-fuchsia-500/15 to-transparent rounded-tl-full pointer-events-none" />

			<CardHeader className="relative pb-4">
				<CardTitle className="flex items-center gap-3">
					{/* Status indicator with glow ring */}
					<div className="relative">
						<span className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-40" />
						<span className="relative block w-3 h-3 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
					</div>
					{/* Improved title typography */}
					<span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-foreground via-pink-200 to-foreground bg-clip-text">
						{isOnboarding ? "Coach — Discovery" : "Coach Session"}
					</span>
				</CardTitle>
				{/* Gradient accent line under header */}
				<div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
			</CardHeader>

			<CardContent className="flex-1 p-0 min-h-0 relative">
				<Chat
					tool_display={(tool) => {
						try {
							const input = tool.tool_input ? JSON.parse(tool.tool_input) : {};

							// Handle SetData tool (profile or goal)
							if (tool.tool === "SetData") {
								const aspect = input.aspect;
								const isProfile = aspect === "profile";

								return (
									<ToolActionCard
										icon={Database}
										iconColor={isProfile ? "text-blue-400" : "text-violet-400"}
										label="Updated"
										badge={isProfile ? "Profile" : "Goal"}
										badgeClassName={
											isProfile ? "from-blue-500 to-blue-600" : "from-violet-500 to-purple-600"
										}
										borderColor={isProfile ? "border-l-blue-500" : "border-l-violet-500"}
									/>
								);
							}

							// Handle SetPlan tool
							if (tool.tool === "SetPlan") {
								const feature = input.feature;
								const featureConfig: Record<
									string,
									{ label: string; gradient: string; border: string; iconColor: string }
								> = {
									hypno: {
										label: "Hypnosis",
										gradient: "from-pink-500 to-rose-600",
										border: "border-l-pink-500",
										iconColor: "text-pink-400",
									},
									challenges: {
										label: "Challenges",
										gradient: "from-orange-500 to-amber-600",
										border: "border-l-orange-500",
										iconColor: "text-orange-400",
									},
									user: {
										label: "User Profile",
										gradient: "from-emerald-500 to-green-600",
										border: "border-l-emerald-500",
										iconColor: "text-emerald-400",
									},
									interview: {
										label: "Interview",
										gradient: "from-teal-500 to-cyan-600",
										border: "border-l-teal-500",
										iconColor: "text-teal-400",
									},
								};
								const config = featureConfig[feature] || {
									label: feature,
									gradient: "from-gray-500 to-gray-600",
									border: "border-l-gray-500",
									iconColor: "text-gray-400",
								};

								return (
									<ToolActionCard
										icon={FileText}
										iconColor={config.iconColor}
										label="Set plan for"
										badge={config.label}
										badgeClassName={config.gradient}
										borderColor={config.border}
									/>
								);
							}

							// Handle GetCurrentData tool
							if (tool.tool === "GetCurrentData") {
								return (
									<motion.div
										initial={{ opacity: 0, y: 8, scale: 0.95 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										transition={{ duration: 0.3, ease: "easeOut" }}
										className={cn(
											"flex items-center gap-3 px-4 py-3 rounded-xl",
											"bg-gradient-to-r from-background/80 to-background/40",
											"backdrop-blur-sm border-l-4 border-l-cyan-500",
											"shadow-sm"
										)}
									>
										<div className="p-2 rounded-lg bg-gradient-to-br from-background to-muted/50 text-cyan-400">
											<RefreshCw className="w-4 h-4" />
										</div>
										<span className="text-sm text-muted-foreground font-medium">
											Retrieved current data
										</span>
										<Badge
											variant="outline"
											className="text-cyan-400 border-cyan-500/50 bg-cyan-500/10 font-semibold"
										>
											<Info className="w-3 h-3 mr-1.5" />
											View
										</Badge>
									</motion.div>
								);
							}

							// Handle Complete tool
							if (tool.tool === "Complete") {
								return (
									<motion.div
										initial={{ opacity: 0, y: 8, scale: 0.95 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										transition={{ duration: 0.3, ease: "easeOut" }}
										className={cn(
											"flex items-center gap-3 px-4 py-3 rounded-xl",
											"bg-gradient-to-r from-emerald-500/10 to-green-500/5",
											"backdrop-blur-sm border-l-4 border-l-emerald-500",
											"shadow-sm"
										)}
									>
										<div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/10 text-emerald-400">
											<CheckCircle2 className="w-4 h-4" />
										</div>
										<span className="text-sm text-muted-foreground font-medium">
											Marked coaching as
										</span>
										<Badge className="font-semibold text-white shadow-sm bg-gradient-to-r from-emerald-500 to-green-600">
											Complete
										</Badge>
									</motion.div>
								);
							}

							// Handle fallback for input-based tools
							if (input.aspect) {
								return (
									<ToolActionCard
										icon={Database}
										iconColor="text-blue-400"
										label="Updated"
										badge={input.aspect}
										badgeClassName="from-blue-500 to-blue-600"
										borderColor="border-l-blue-500"
									/>
								);
							}

							if (input.feature) {
								return (
									<ToolActionCard
										icon={FileText}
										iconColor="text-orange-400"
										label="Set plan for"
										badge={input.feature}
										badgeClassName="from-orange-500 to-amber-600"
										borderColor="border-l-orange-500"
									/>
								);
							}

							// Handle unknown tools
							return (
								<motion.div
									initial={{ opacity: 0, y: 8, scale: 0.95 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									transition={{ duration: 0.3, ease: "easeOut" }}
									className={cn(
										"flex items-center gap-3 px-4 py-3 rounded-xl",
										"bg-gradient-to-r from-background/80 to-background/40",
										"backdrop-blur-sm border-l-4 border-l-gray-500",
										"shadow-sm"
									)}
								>
									<div className="p-2 rounded-lg bg-gradient-to-br from-background to-muted/50 text-gray-400">
										<PlayCircle className="w-4 h-4" />
									</div>
									<span className="text-sm text-muted-foreground font-medium">Executed tool:</span>
									<Badge variant="outline" className="font-mono text-xs border-gray-500/50">
										{tool.tool}
									</Badge>
								</motion.div>
							);
						} catch (e) {
							console.error("Tool parsing error:", e);
							return (
								<motion.div
									initial={{ opacity: 0, y: 8, scale: 0.95 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									transition={{ duration: 0.3, ease: "easeOut" }}
									className={cn(
										"flex items-center gap-3 px-4 py-3 rounded-xl",
										"bg-gradient-to-r from-red-500/10 to-rose-500/5",
										"backdrop-blur-sm border-l-4 border-l-red-500",
										"shadow-sm"
									)}
								>
									<div className="p-2 rounded-lg bg-gradient-to-br from-red-500/20 to-rose-500/10 text-red-400">
										<AlertCircle className="w-4 h-4" />
									</div>
									<span className="text-sm text-muted-foreground font-medium">
										Tool parsing failed:
									</span>
									<Badge variant="destructive" className="font-mono text-xs">
										{tool.tool}
									</Badge>
								</motion.div>
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

				{/* Complete Onboarding Button with gradient and glow */}
				<AnimatePresence>
					{showCompleteButton && isOnboarding && onOnboardingComplete && (
						<motion.div
							initial={{ opacity: 0, y: 20, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 10, scale: 0.98 }}
							transition={{ duration: 0.4, ease: "easeOut" }}
							className="absolute bottom-24 left-4 right-4 z-10"
						>
							<Button
								onClick={onOnboardingComplete}
								className={cn(
									"w-full relative overflow-hidden",
									"bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-500",
									"hover:from-pink-400 hover:via-fuchsia-400 hover:to-pink-400",
									"text-white font-semibold tracking-wide",
									"shadow-[0_4px_20px_rgba(236,72,153,0.4)]",
									"hover:shadow-[0_6px_30px_rgba(236,72,153,0.6)]",
									"transition-all duration-300",
									"border border-pink-400/30"
								)}
								size="lg"
							>
								{/* Shimmer effect */}
								<span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
								<Sparkles className="w-5 h-5 mr-2" />
								Complete Onboarding
							</Button>
						</motion.div>
					)}
				</AnimatePresence>
			</CardContent>
		</Card>
	);
}
