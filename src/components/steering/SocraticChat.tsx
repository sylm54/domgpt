import { Brain, CheckCircle2, Lightbulb, MessageSquare, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useLogHistoryData } from "@/data/history";
import { useProfileStore } from "@/data/profile";
import { cn } from "@/lib/utils";
import { Agent } from "../../lib/agent";
import type { Model } from "../../lib/models";
import { tool } from "../../lib/models";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Chat } from "../ui/shadcn-io/ai/chat";
import { useQueryDatabaseTool } from "@/data/tools/query-database";
import { useProfileReadTool } from "@/data/tools/profile-tools";
import { useScratchpadTool } from "@/data/tools/scratchpad";
import { getReflectionPrompt } from "@/prompts/reflection";

interface SocraticChatProps {
	model: Model;
	onComplete?: () => void;
}

export function SocraticChat({ model, onComplete }: SocraticChatProps) {
	const logHistoryData = useLogHistoryData();
	const [agent, setAgent] = useState<Agent | null>(null);
	const [isComplete, setIsComplete] = useState(false);
	const [summary, setSummary] = useState<string | null>(null);
	const { profile } = useProfileStore();
	const [loading, setLoading] = useState(true);
	const [scratchpad, scratchpadTool] = useScratchpadTool("reflection");
	const readProfile = useProfileReadTool();
	const queryDatabase = useQueryDatabaseTool();

	useEffect(() => {
		const socraticAgent = new Agent(model);
		setAgent(socraticAgent);
	}, [model]);

	const tools = useMemo(
		() => [
			readProfile,
			queryDatabase,
			scratchpadTool,
			tool({
				name: "CompleteSession",
				description: "Complete the reflection session and save the report",
				schema: {
					report: z.string().describe("Brief summary of the conversation"),
				},
				call: async ({ report }) => {
					if (isComplete) {
						return "Session already completed.";
					}
					setSummary(report);
					setIsComplete(true);

					const conversation =
						agent?.context.conversation.map((msg) => ({
							role: msg.type as "user" | "assistant",
							content: msg.content.map((c) => ("text" in c ? c.text : "")).join(" "),
						})) || [];

					// Save to history
					await logHistoryData({
						type: "reflection_session",
						time: new Date(),
						chat: conversation,
						report,
					});

					return "Reflection session saved successfully.";
				},
			}),
		],
		[logHistoryData, agent, readProfile, queryDatabase, scratchpadTool]
	);

	useEffect(() => {
		if (agent) {
			const originalAct = agent.act.bind(agent);
			agent.act = async (message, _, onProgress) => {
				return originalAct(message, tools, onProgress);
			};

			agent.setSystemPrompt(getReflectionPrompt(profile, scratchpad));
			setLoading(false);
		}
	}, [agent]);

	if (loading) {
		return (
			<Card className="h-full flex flex-col">
				<CardContent className="flex-1 flex items-center justify-center">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="flex flex-col items-center gap-4"
					>
						<div className="relative">
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
								className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500"
							/>
							<div className="absolute inset-0 flex items-center justify-center">
								<Brain className="w-5 h-5 text-violet-500" />
							</div>
						</div>
						<span className="text-muted-foreground font-medium">
							Preparing reflection session...
						</span>
					</motion.div>
				</CardContent>
			</Card>
		);
	}

	if (!agent) {
		return (
			<Card className="h-full flex flex-col">
				<CardContent className="flex-1 flex items-center justify-center">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="flex flex-col items-center gap-4"
					>
						<div className="relative">
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
								className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500"
							/>
							<div className="absolute inset-0 flex items-center justify-center">
								<Brain className="w-5 h-5 text-violet-500" />
							</div>
						</div>
						<span className="text-muted-foreground font-medium">
							Initializing reflection agent...
						</span>
					</motion.div>
				</CardContent>
			</Card>
		);
	}

	if (isComplete && summary) {
		return (
			<Card className="h-full flex flex-col">
				<CardHeader className="border-b">
					<CardTitle className="flex items-center gap-3">
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ type: "spring", stiffness: 200, damping: 15 }}
							className="relative"
						>
							<div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
							<div className="relative w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
								<CheckCircle2 className="w-5 h-5 text-white" />
							</div>
						</motion.div>
						<span className="text-lg font-semibold">Reflection Complete</span>
					</CardTitle>
				</CardHeader>

				<CardContent className="flex-1 p-6 overflow-y-auto">
					<div className="space-y-6">
						{/* Summary Card */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-xl p-5 border border-violet-500/20"
						>
							<div className="flex items-center gap-2 mb-3">
								<MessageSquare className="w-5 h-5 text-violet-500" />
								<h3 className="font-semibold">Session Summary</h3>
							</div>
							<p className="text-muted-foreground text-sm leading-relaxed">{summary}</p>
						</motion.div>

						{/* Restart Button */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.5 }}
							className="flex justify-center pt-4"
						>
							<Button
								onClick={() => {
									setIsComplete(false);
									setSummary(null);
									if (agent) {
										agent.clearConversation();
										agent.addAgentMessage(
											"Welcome to your reflection session. I'm here to help you explore your thoughts and thought patterns. What's on your mind today?"
										);
									}
									if (onComplete) onComplete();
								}}
								className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white"
							>
								<Sparkles className="w-4 h-4 mr-2" />
								Start New Reflection
							</Button>
						</motion.div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="h-full flex flex-col border-violet-200">
			<CardHeader className="pb-4 border-b border-violet-100">
				<CardTitle className="flex items-center gap-3">
					<div className="relative">
						<span className="absolute inset-0 w-3 h-3 bg-violet-400 rounded-full animate-ping opacity-40" />
						<span className="relative block w-3 h-3 bg-violet-500 rounded-full" />
					</div>
					<span className="text-lg font-semibold tracking-tight">Socratic Reflection</span>
				</CardTitle>
				<p className="text-sm text-muted-foreground mt-1">
					Explore your thoughts through guided questioning
				</p>
			</CardHeader>

			<CardContent className="flex-1 p-0 min-h-0 relative">
				<Chat
					tool_display={(tool) => {
						try {
							const input = tool.tool_input ? JSON.parse(tool.tool_input) : {};

							if (tool.tool === "AnalyzeThought") {
								const isConducive = input.is_conducive;
								return (
									<motion.div
										initial={{ opacity: 0, y: 8, scale: 0.95 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										transition={{ duration: 0.3, ease: "easeOut" }}
										className={cn(
											"flex items-center gap-3 px-4 py-3 rounded-xl",
											"bg-muted/30",
											"border-l-4",
											"shadow-sm",
											isConducive ? "border-l-emerald-500" : "border-l-rose-500"
										)}
									>
										<div
											className={cn(
												"p-2 rounded-lg bg-muted/50",
												isConducive ? "text-emerald-500" : "text-rose-500"
											)}
										>
											{isConducive ? (
												<CheckCircle2 className="w-4 h-4" />
											) : (
												<Brain className="w-4 h-4" />
											)}
										</div>
										<span className="text-sm text-muted-foreground font-medium">
											Thought recorded
										</span>
										<span
											className={cn(
												"text-xs px-2 py-1 rounded-full font-medium",
												isConducive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
											)}
										>
											{isConducive ? "Conducive" : "Not Conducive"}
										</span>
									</motion.div>
								);
							}

							if (tool.tool === "CompleteSession") {
								return (
									<motion.div
										initial={{ opacity: 0, y: 8, scale: 0.95 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										transition={{ duration: 0.3, ease: "easeOut" }}
										className={cn(
											"flex items-center gap-3 px-4 py-3 rounded-xl",
											"bg-emerald-500/10",
											"border-l-4 border-l-emerald-500",
											"shadow-sm"
										)}
									>
										<div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
											<CheckCircle2 className="w-4 h-4" />
										</div>
										<span className="text-sm text-muted-foreground font-medium">Session saved</span>
									</motion.div>
								);
							}
						} catch (e) {
							console.error("Tool parsing error:", e);
							return null;
						}
						return null;
					}}
					agent={agent}
					placeholder="Share your thoughts and I'll help you explore them..."
					className="h-full"
				/>
			</CardContent>
		</Card>
	);
}
