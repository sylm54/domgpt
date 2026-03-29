// import { AnimatePresence, motion } from "motion/react";
// import { useEffect, useState } from "react";
// import { z } from "zod";
// import { useGetPromptHistoryData } from "@/data/history";
// import { useProfileStore } from "@/data/profile";
// import { useSaveSubliminalFile } from "@/data/subliminal";
// import { setMemory } from "@/lib/utils";
// import { getSubliminalPlannerPrompt, getSubliminalWriterPrompt } from "@/prompts/subliminal";
// import type { HypnoPlan, SubliminalFile } from "@/types/user";
// import { SubliminalPlannerAgent, SubliminalWriterAgent } from "../../lib/agent";
// import type { Model } from "../../lib/models";
// import { tool, userMessage } from "../../lib/models";
// import { type AudioScript, generateAudio, type TtsProgressEvent } from "../../lib/tts-rust";
// import { Button } from "../ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

// interface SessionGeneratorProps {
// 	model: Model;
// 	onSessionGenerated?: (session: SubliminalFile) => void;
// }

// type GenerationPhase = "planning" | "writing" | "generating" | "complete" | "error";

// const PHASES: { key: GenerationPhase; label: string }[] = [
// 	{ key: "planning", label: "Planning" },
// 	{ key: "writing", label: "Writing" },
// 	{ key: "generating", label: "Generating" },
// 	{ key: "complete", label: "Complete" },
// ];

// function PhaseIndicator({ currentPhase }: { currentPhase: GenerationPhase }) {
// 	const getPhaseIndex = (phase: GenerationPhase) => {
// 		if (phase === "error") return -1;
// 		return PHASES.findIndex((p) => p.key === phase);
// 	};

// 	const currentIndex = getPhaseIndex(currentPhase);

// 	return (
// 		<div className="relative flex items-center justify-between w-full px-4 py-6">
// 			{/* Connecting line background */}
// 			<div className="absolute top-1/2 left-8 right-8 h-0.5 bg-muted -translate-y-1/2" />

// 			{/* Animated progress line */}
// 			<motion.div
// 				className="absolute top-1/2 left-8 h-0.5 bg-primary -translate-y-1/2"
// 				initial={{ width: "0%" }}
// 				animate={{
// 					width: currentIndex >= 0 ? `${(currentIndex / (PHASES.length - 1)) * 100}%` : "0%",
// 				}}
// 				transition={{ duration: 0.5, ease: "easeOut" }}
// 			/>

// 			{PHASES.map((phase, index) => {
// 				const isActive = phase.key === currentPhase;
// 				const isCompleted = currentIndex > index;
// 				const isPending = currentIndex < index;

// 				return (
// 					<div key={phase.key} className="relative z-10 flex flex-col items-center gap-2">
// 						<motion.div
// 							className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
// 								isCompleted
// 									? "bg-primary border-transparent"
// 									: isActive
// 										? "bg-background border-primary"
// 										: "bg-muted border-muted-foreground/30"
// 							}`}
// 						>
// 							{isCompleted ? (
// 								<motion.svg
// 									className="w-5 h-5 text-white"
// 									fill="none"
// 									stroke="currentColor"
// 									viewBox="0 0 24 24"
// 									initial={{ scale: 0 }}
// 									animate={{ scale: 1 }}
// 									transition={{ type: "spring", stiffness: 300, damping: 20 }}
// 								>
// 									<path
// 										strokeLinecap="round"
// 										strokeLinejoin="round"
// 										strokeWidth={2}
// 										d="M5 13l4 4L19 7"
// 									/>
// 								</motion.svg>
// 							) : (
// 								<span
// 									className={`text-sm font-semibold ${
// 										isActive ? "text-primary" : "text-muted-foreground"
// 									}`}
// 								>
// 									{index + 1}
// 								</span>
// 							)}
// 						</motion.div>

// 						<span
// 							className={`text-xs font-medium ${
// 								isActive ? "text-primary" : isPending ? "text-muted-foreground" : "text-foreground"
// 							}`}
// 						>
// 							{phase.label}
// 						</span>
// 					</div>
// 				);
// 			})}
// 		</div>
// 	);
// }

// function PlanningSpinner() {
// 	return (
// 		<div className="relative w-20 h-20">
// 			{/* Outer ring */}
// 			<motion.div
// 				className="absolute inset-0 rounded-full border-4 border-primary/20"
// 				animate={{ rotate: 360 }}
// 				transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
// 			>
// 				<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full" />
// 			</motion.div>

// 			{/* Middle ring */}
// 			<motion.div
// 				className="absolute inset-3 rounded-full border-4 border-primary/30"
// 				animate={{ rotate: -360 }}
// 				transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
// 			>
// 				<div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-primary/70 rounded-full" />
// 			</motion.div>

// 			{/* Inner ring */}
// 			<motion.div
// 				className="absolute inset-6 rounded-full border-4 border-primary/40"
// 				animate={{ rotate: 360 }}
// 				transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
// 			>
// 				<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary/90 rounded-full" />
// 			</motion.div>

// 			{/* Center pulse */}
// 			<motion.div
// 				className="absolute inset-8 rounded-full bg-primary"
// 				animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
// 				transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
// 			/>
// 		</div>
// 	);
// }

// function GeneratingWaveform() {
// 	return (
// 		<div className="relative w-full h-32 flex items-center justify-center">
// 			<div className="flex items-center gap-1 h-20">
// 				{Array.from({ length: 40 }, (_, idx) => idx).map((idx) => (
// 					<motion.div
// 						key={`bar-${idx}`}
// 						className="w-1.5 bg-primary rounded-full"
// 						animate={{
// 							height: [10, 40 + Math.random() * 30, 10],
// 							opacity: [0.4, 1, 0.4],
// 						}}
// 						transition={{
// 							duration: 1 + Math.random() * 0.5,
// 							repeat: Infinity,
// 							ease: "easeInOut",
// 							delay: idx * 0.05,
// 						}}
// 					/>
// 				))}
// 			</div>

// 			{/* Checkmark overlay on completion */}
// 			<motion.svg
// 				className="absolute inset-0 w-full h-full p-6 text-white"
// 				fill="none"
// 				stroke="currentColor"
// 				viewBox="0 0 24 24"
// 				initial={{ pathLength: 0, opacity: 0 }}
// 				animate={{ pathLength: 1, opacity: 1 }}
// 				transition={{ duration: 0.5, delay: 0.4 }}
// 			>
// 				<motion.path
// 					strokeLinecap="round"
// 					strokeLinejoin="round"
// 					strokeWidth={3}
// 					d="M5 13l4 4L19 7"
// 					initial={{ pathLength: 0 }}
// 					animate={{ pathLength: 1 }}
// 					transition={{ duration: 0.5, delay: 0.5 }}
// 				/>
// 			</motion.svg>
// 		</div>
// 	);
// }

// export function SessionGenerator({ model, onSessionGenerated }: SessionGeneratorProps) {
// 	const getPromptHistoryData = useGetPromptHistoryData();
// 	const [plannerAgent, setPlannerAgent] = useState<SubliminalPlannerAgent | null>(null);
// 	const [writerAgent, setWriterAgent] = useState<SubliminalWriterAgent | null>(null);
// 	const [phase, setPhase] = useState<GenerationPhase>("planning");
// 	const [sessionPlan, setSessionPlan] = useState<HypnoPlan>([]);
// 	const [writingProgress, setWritingProgress] = useState({ completed: 0, total: 0 });
// 	const [generatingProgress, setGeneratingProgress] = useState({
// 		message: "",
// 		progress: 0,
// 		stage: "" as TtsProgressEvent["stage"],
// 	});
// 	const [isPlanning, setIsPlanning] = useState(false);
// 	const [error, setError] = useState<string | null>(null);
// 	const { profile } = useProfileStore();
// 	const saveSubliminalFile = useSaveSubliminalFile();

// 	useEffect(() => {
// 		setPlannerAgent(new SubliminalPlannerAgent(model));
// 		setWriterAgent(new SubliminalWriterAgent(model));
// 	}, [model]);

// 	const generateSession = async () => {
// 		setIsPlanning(true);
// 		setPhase("planning");
// 		setError(null);
// 		setSessionPlan([]);
// 		setWritingProgress({ completed: 0, total: 0 });
// 		setGeneratingProgress({ message: "", progress: 0, stage: "start" });

// 		try {
// 			// Phase 1: Planning
// 			const planResult = await runPlannerPhase();
// 			setSessionPlan(planResult);
// 			setIsPlanning(false);
// 			setPhase("writing");

// 			// Phase 2: Writing
// 			setWritingProgress({ completed: 0, total: planResult.length });
// 			const scriptResult = await runWriterPhase(planResult);
// 			setPhase("generating");

// 			const audioScript: AudioScript = {
// 				title: "Subliminal Session",
// 				filename: `${crypto.randomUUID()}.wav`,
// 				script: scriptResult,
// 			};

// 			const audioResult = await generateAudio(audioScript, (progress: TtsProgressEvent) => {
// 				setGeneratingProgress({
// 					message: progress.message,
// 					progress: progress.progress,
// 					stage: progress.stage,
// 				});
// 			});

// 			const file = await saveSubliminalFile({
// 				script: scriptResult,
// 				plan: planResult,
// 				subliminal_file: audioResult.filename,
// 				duration_seconds: estimateDuration(scriptResult),
// 				created_at: new Date(),
// 			});
// 			setPhase("complete");
// 			onSessionGenerated?.(file);
// 		} catch (err) {
// 			const errmsg = err instanceof Error ? err.message : "Unknown error occurred";
// 			setError(`Error while ${phase}: ${errmsg}`);
// 			setPhase("error");
// 		}
// 	};

// 	const runPlannerPhase = async (): Promise<HypnoPlan> => {
// 		if (!plannerAgent) throw new Error("Planner agent not initialized");

// 		const planContent: HypnoPlan = [];

// 		const tools = [
// 			tool({
// 				name: "CreateSection",
// 				description: "Create a section of the subliminal session plan",
// 				schema: {
// 					prompt: z.string(),
// 					section: z.string(),
// 				},
// 				call: async ({ section, prompt }) => {
// 					planContent.push({ name: section, content: prompt });
// 					return `Section "${section}" created`;
// 				},
// 			}),
// 			tool({
// 				name: "UpdateMemory",
// 				description:
// 					"Save important insights about the user to memory for future sessions. Use this to record what affirmations worked well, user responsiveness patterns, and adjustments needed for future subliminal sessions.",
// 				schema: {
// 					content: z.string(),
// 				},
// 				call: async ({ content }) => {
// 					setMemory(content);
// 					return "Memory updated successfully";
// 				},
// 			}),
// 		];

// 		const history = await getPromptHistoryData(5);

// 		plannerAgent.setSystemPrompt(getSubliminalPlannerPrompt(profile, history));

// 		await plannerAgent.act(
// 			userMessage(
// 				"Create a subliminal session plan based on the user profile and goal. Remember to design it for seamless looping."
// 			),
// 			tools
// 		);

// 		return planContent;
// 	};

// 	const runWriterPhase = async (planContent: HypnoPlan): Promise<string> => {
// 		if (!writerAgent) throw new Error("Writer agent not initialized");

// 		let script = "";

// 		for (let i = 0; i < planContent.length; i++) {
// 			const section = planContent[i];

// 			writerAgent.setSystemPrompt(getSubliminalWriterPrompt(script, section));

// 			const systemContent = writerAgent.context.system[0]?.content[0];
// 			const systemText = systemContent?.type === "text" ? systemContent.text : "";
// 			const response = await writerAgent.model.generate([
// 				{ type: "system", content: [{ type: "text", text: systemText }] },
// 				{
// 					type: "user",
// 					content: [
// 						{
// 							type: "text",
// 							text: "Write the subliminal session script based on the system prompt. Output only the script. Remember: NO explicit intros or outros, must loop seamlessly.",
// 						},
// 					],
// 				},
// 			]);

// 			script += response.content
// 				.filter((c) => c.type === "text")
// 				.map((c) => c.text)
// 				.join("");

// 			setWritingProgress({ completed: i + 1, total: planContent.length });
// 		}

// 		return script;
// 	};

// 	const estimateDuration = (script: string): number => {
// 		// Rough estimation: ~130 words per minute, plus breaks
// 		const wordCount = script.split(/\s+/).length;
// 		const breakMatches = script.match(/<break[^>]+time= "(\d+)s"\/>/g);
// 		let breakSeconds = 0;
// 		if (breakMatches) {
// 			breakMatches.forEach((match) => {
// 				const timeMatch = match.match(/time= "(\d+)s"/);
// 				if (timeMatch) {
// 					breakSeconds += parseInt(timeMatch[1], 10);
// 				}
// 			});
// 		}
// 		return Math.ceil((wordCount / 130) * 60 + breakSeconds);
// 	};

// 	const renderPhaseContent = () => {
// 		switch (phase) {
// 			case "planning":
// 				return (
// 					<motion.div
// 						className="relative flex flex-col items-center justify-center space-y-6 py-12"
// 						initial={{ opacity: 0, y: 20 }}
// 						animate={{ opacity: 1, y: 0 }}
// 						exit={{ opacity: 0, y: -20 }}
// 					>
// 						<PlanningSpinner />

// 						<div className="text-center space-y-2 relative z-10">
// 							<p className="text-lg font-medium text-foreground">Planning subliminal structure</p>
// 							<p className="text-sm text-muted-foreground">
// 								Creating a loopable session for passive listening...
// 							</p>
// 						</div>
// 					</motion.div>
// 				);

// 			case "writing": {
// 				const progressPercent =
// 					writingProgress.total > 0 ? (writingProgress.completed / writingProgress.total) * 100 : 0;

// 				return (
// 					<motion.div
// 						className="flex flex-col items-center justify-center space-y-6 py-8"
// 						initial={{ opacity: 0, y: 20 }}
// 						animate={{ opacity: 1, y: 0 }}
// 						exit={{ opacity: 0, y: -20 }}
// 					>
// 						<div className="text-center space-y-2">
// 							<p className="text-lg font-medium text-foreground">Writing subliminal script</p>
// 							<div className="flex items-center justify-center gap-2 text-sm">
// 								<span className="text-2xl font-bold text-primary">{writingProgress.completed}</span>
// 								<span className="text-muted-foreground">of</span>
// 								<span className="text-2xl font-bold text-foreground">{writingProgress.total}</span>
// 								<span className="text-muted-foreground">sections</span>
// 							</div>
// 						</div>

// 						{/* Progress bar */}
// 						<div className="w-full max-w-sm">
// 							<div className="h-2 bg-muted rounded-full overflow-hidden">
// 								<motion.div
// 									className="h-full bg-primary"
// 									initial={{ width: 0 }}
// 									animate={{ width: `${progressPercent}%` }}
// 									transition={{ duration: 0.5 }}
// 								/>
// 							</div>
// 						</div>

// 						{/* Session plan timeline */}
// 						{sessionPlan.length > 0 && (
// 							<div className="w-full mt-4 p-5 bg-muted/50 rounded-xl border border-border/50">
// 								<h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
// 									Session Plan
// 								</h4>
// 								<div className="relative space-y-0">
// 									{/* Timeline line */}
// 									<div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-primary/30" />

// 									{sessionPlan.map((section, index) => {
// 										const isCompleted = index < writingProgress.completed;
// 										const isActive = index === writingProgress.completed;

// 										return (
// 											<motion.div
// 												key={section.name}
// 												className="relative pl-10 py-3"
// 												initial={{ opacity: 0, x: -10 }}
// 												animate={{ opacity: 1, x: 0 }}
// 												transition={{ delay: index * 0.1 }}
// 											>
// 												{/* Timeline node */}
// 												<div className="absolute left-0 top-1/2 -translate-y-1/2">
// 													<motion.div
// 														className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
// 															isCompleted
// 																? "bg-green-500 border-transparent"
// 																: isActive
// 																	? "bg-background border-primary"
// 																	: "bg-muted border-muted-foreground/30"
// 														}`}
// 														animate={isActive ? { scale: [1, 1.1, 1] } : {}}
// 														transition={isActive ? { duration: 1, repeat: Infinity } : {}}
// 													>
// 														{isCompleted ? (
// 															<motion.svg
// 																className="w-4 h-4 text-white"
// 																fill="none"
// 																stroke="currentColor"
// 																viewBox="0 0 24 24"
// 																initial={{ scale: 0, rotate: -180 }}
// 																animate={{ scale: 1, rotate: 0 }}
// 																transition={{ type: "spring", stiffness: 300 }}
// 															>
// 																<path
// 																	strokeLinecap="round"
// 																	strokeLinejoin="round"
// 																	strokeWidth={2.5}
// 																	d="M5 13l4 4L19 7"
// 																/>
// 															</motion.svg>
// 														) : isActive ? (
// 															<motion.div
// 																className="w-3 h-3 rounded-full bg-primary"
// 																animate={{ scale: [1, 1.3, 1] }}
// 																transition={{ duration: 0.8, repeat: Infinity }}
// 															/>
// 														) : (
// 															<span className="text-xs text-muted-foreground">{index + 1}</span>
// 														)}
// 													</motion.div>
// 												</div>

// 												{/* Section content */}
// 												<div className="space-y-1">
// 													<p
// 														className={`font-medium ${isActive ? "text-primary" : "text-foreground"}`}
// 													>
// 														{section.name}
// 													</p>
// 													<p className="text-sm text-muted-foreground line-clamp-2">
// 														{section.content}
// 													</p>
// 												</div>
// 											</motion.div>
// 										);
// 									})}
// 								</div>
// 							</div>
// 						)}
// 					</motion.div>
// 				);
// 			}

// 			case "generating":
// 				return (
// 					<motion.div
// 						className="flex flex-col items-center justify-center space-y-4 py-8"
// 						initial={{ opacity: 0, y: 20 }}
// 						animate={{ opacity: 1, y: 0 }}
// 						exit={{ opacity: 0, y: -20 }}
// 					>
// 						<GeneratingWaveform />

// 						<div className="text-center space-y-2">
// 							<p className="text-lg font-medium text-foreground">Generating subliminal audio</p>
// 							<p className="text-sm text-muted-foreground">{generatingProgress.message}</p>
// 						</div>

// 						{/* Progress bar */}
// 						<div className="w-full max-w-sm">
// 							<div className="h-2 bg-muted rounded-full overflow-hidden">
// 								<motion.div
// 									className="h-full bg-primary"
// 									initial={{ width: 0 }}
// 									animate={{ width: `${generatingProgress.progress}%` }}
// 									transition={{ duration: 0.3 }}
// 								/>
// 							</div>
// 							<div className="flex justify-between mt-1 text-xs text-muted-foreground">
// 								<span>{Math.round(generatingProgress.progress)}%</span>
// 								<span>{generatingProgress.stage}</span>
// 							</div>
// 						</div>
// 					</motion.div>
// 				);

// 			case "complete":
// 				return (
// 					<motion.div
// 						className="flex flex-col items-center justify-center space-y-6 py-12"
// 						initial={{ opacity: 0, scale: 0.9 }}
// 						animate={{ opacity: 1, scale: 1 }}
// 						exit={{ opacity: 0, scale: 0.9 }}
// 					>
// 						<motion.div
// 							className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center"
// 							initial={{ scale: 0 }}
// 							animate={{ scale: 1 }}
// 							transition={{ type: "spring", stiffness: 200, damping: 15 }}
// 						>
// 							<motion.svg
// 								className="w-12 h-12 text-white"
// 								fill="none"
// 								stroke="currentColor"
// 								viewBox="0 0 24 24"
// 								initial={{ pathLength: 0 }}
// 								animate={{ pathLength: 1 }}
// 								transition={{ duration: 0.5, delay: 0.2 }}
// 							>
// 								<path
// 									strokeLinecap="round"
// 									strokeLinejoin="round"
// 									strokeWidth={3}
// 									d="M5 13l4 4L19 7"
// 								/>
// 							</motion.svg>
// 						</motion.div>

// 						<div className="text-center space-y-2">
// 							<p className="text-xl font-semibold text-foreground">Subliminal Session Complete!</p>
// 							<p className="text-sm text-muted-foreground">
// 								Your loopable subliminal is ready for passive listening
// 							</p>
// 						</div>
// 					</motion.div>
// 				);

// 			case "error":
// 				return (
// 					<motion.div
// 						className="flex flex-col items-center justify-center space-y-4 py-8"
// 						initial={{ opacity: 0, y: 20 }}
// 						animate={{ opacity: 1, y: 0 }}
// 						exit={{ opacity: 0, y: -20 }}
// 					>
// 						<div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
// 							<svg
// 								className="w-8 h-8 text-red-500"
// 								fill="none"
// 								stroke="currentColor"
// 								viewBox="0 0 24 24"
// 							>
// 								<path
// 									strokeLinecap="round"
// 									strokeLinejoin="round"
// 									strokeWidth={2}
// 									d="M6 18L18 6M6 6l12 12"
// 								/>
// 							</svg>
// 						</div>

// 						<div className="text-center space-y-2">
// 							<p className="text-lg font-medium text-red-600">Generation Failed</p>
// 							<p className="text-sm text-muted-foreground max-w-md">{error}</p>
// 						</div>

// 						<Button variant="outline" onClick={() => setPhase("planning")}>
// 							Try Again
// 						</Button>
// 					</motion.div>
// 				);

// 			default:
// 				return null;
// 		}
// 	};

// 	return (
// 		<Card className="w-full border border-primary/20 rounded-2xl bg-background">
// 			<CardHeader className="pb-4">
// 				<div className="flex items-center gap-3">
// 					<motion.div
// 						className="p-3 rounded-xl bg-primary/10"
// 						whileHover={{ scale: 1.05 }}
// 						transition={{ type: "spring", stiffness: 400 }}
// 					>
// 						<svg
// 							className="w-6 h-6 text-primary"
// 							fill="none"
// 							viewBox="0 0 24 24"
// 							stroke="currentColor"
// 						>
// 							<path
// 								strokeLinecap="round"
// 								strokeLinejoin="round"
// 								strokeWidth={2}
// 								d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
// 							/>
// 						</svg>
// 					</motion.div>
// 					<div>
// 						<CardTitle className="text-xl">Subliminal Session</CardTitle>
// 						<CardDescription>
// 							Generate a loopable subliminal for background listening
// 						</CardDescription>
// 					</div>
// 				</div>
// 			</CardHeader>

// 			<CardContent className="space-y-6">
// 				<PhaseIndicator currentPhase={phase} />

// 				<AnimatePresence mode="wait">
// 					{phase === "planning" && !isPlanning ? (
// 						<motion.div
// 							className="flex flex-col items-center space-y-4 py-8"
// 							initial={{ opacity: 0, y: 20 }}
// 							animate={{ opacity: 1, y: 0 }}
// 							exit={{ opacity: 0, y: -20 }}
// 						>
// 							<div className="text-center space-y-2 max-w-md">
// 								<p className="text-base text-muted-foreground">
// 									This will create a loopable subliminal audio designed for passive listening while
// 									you sleep, work, or relax.
// 								</p>
// 								<p className="text-sm text-muted-foreground/70">
// 									The session will be seamless when repeated and will work effectively at low
// 									volumes.
// 								</p>
// 							</div>

// 							<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
// 								<Button
// 									size="lg"
// 									onClick={generateSession}
// 									disabled={!plannerAgent || !writerAgent}
// 									className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8"
// 								>
// 									Generate Subliminal
// 								</Button>
// 							</motion.div>
// 						</motion.div>
// 					) : (
// 						renderPhaseContent()
// 					)}
// 				</AnimatePresence>
// 			</CardContent>
// 		</Card>
// 	);
// }
