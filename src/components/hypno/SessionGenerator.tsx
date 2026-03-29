import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useSaveHypnoFile } from "@/data/hypno";
import { useProfileStore } from "@/data/profile";
import { getHypnoPlannerPrompt, getHypnoWriterPrompt } from "@/prompts/hypno";
import type { HypnoFile, HypnoPlan } from "@/types/user";
import type { Model } from "../../lib/models";
import { tool, userMessage } from "../../lib/models";
import { type AudioScript, generateAudio, type TtsProgressEvent } from "../../lib/tts-rust";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Agent } from "@/lib/agent";
import { useScratchpadTool } from "@/data/tools/scratchpad";
import { useProfileReadTool } from "@/data/tools/profile-tools";

interface SessionGeneratorProps {
	model: Model;
	onSessionGenerated?: (session: HypnoFile) => void;
}

type GenerationPhase = "planning" | "writing" | "generating" | "complete" | "error";

const PHASES: { key: GenerationPhase; label: string }[] = [
	{ key: "planning", label: "Planning" },
	{ key: "writing", label: "Writing" },
	{ key: "generating", label: "Generating" },
	{ key: "complete", label: "Complete" },
];

function PhaseIndicator({ currentPhase }: { currentPhase: GenerationPhase }) {
	const getPhaseIndex = (phase: GenerationPhase) => {
		if (phase === "error") return -1;
		return PHASES.findIndex((p) => p.key === phase);
	};

	const currentIndex = getPhaseIndex(currentPhase);

	return (
		<div className="relative flex items-center justify-between w-full px-4 py-6">
			{/* Connecting line background */}
			<div className="absolute top-1/2 left-8 right-8 h-0.5 bg-muted -translate-y-1/2" />

			{/* Animated progress line */}
			<motion.div
				className="absolute top-1/2 left-8 h-0.5 bg-primary -translate-y-1/2"
				initial={{ width: "0%" }}
				animate={{
					width: currentIndex >= 0 ? `${(currentIndex / (PHASES.length - 1)) * 100}%` : "0%",
				}}
				transition={{ duration: 0.5, ease: "easeOut" }}
			/>

			{PHASES.map((phase, index) => {
				const isActive = phase.key === currentPhase;
				const isCompleted = currentIndex > index;
				const isPending = currentIndex < index;

				return (
					<div key={phase.key} className="relative z-10 flex flex-col items-center gap-2">
						<motion.div
							className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
								isCompleted
									? "bg-primary border-transparent"
									: isActive
										? "bg-background border-primary"
										: "bg-muted border-muted-foreground/30"
							}`}
						>
							{isCompleted ? (
								<motion.svg
									className="w-5 h-5 text-white"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ type: "spring", stiffness: 300, damping: 20 }}
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</motion.svg>
							) : (
								<span
									className={`text-sm font-semibold ${
										isActive ? "text-primary" : "text-muted-foreground"
									}`}
								>
									{index + 1}
								</span>
							)}
						</motion.div>

						<span
							className={`text-xs font-medium ${
								isActive ? "text-primary" : isPending ? "text-muted-foreground" : "text-foreground"
							}`}
						>
							{phase.label}
						</span>
					</div>
				);
			})}
		</div>
	);
}

function PlanningSpinner() {
	return (
		<div className="relative w-16 h-16">
			{/* Outer rotating ring */}
			<motion.div
				className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/70"
				animate={{ rotate: 360 }}
				transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
			/>

			{/* Middle rotating ring (opposite direction) */}
			<motion.div
				className="absolute inset-2 rounded-full border-2 border-transparent border-b-primary/80 border-l-primary/60"
				animate={{ rotate: -360 }}
				transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
			/>

			{/* Inner pulsing core */}
			<motion.div
				className="absolute inset-4 rounded-full bg-primary"
				animate={{ scale: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
				transition={{ duration: 1.5, repeat: Infinity }}
			/>
		</div>
	);
}

const WAVEFORM_BARS = Array.from(
	{ length: 24 },
	(_, i) => `bar-${crypto.randomUUID().slice(0, 8)}`
);
const PARTICLE_IDS = Array.from({ length: 8 }, (_, i) => ({
	id: `particle-${crypto.randomUUID().slice(0, 8)}`,
	angle: (i / 8) * Math.PI * 2,
}));

function WaveformVisualizer({ progress }: { progress: number }) {
	return (
		<div className="flex items-end justify-center gap-1 h-16 w-full max-w-xs">
			{WAVEFORM_BARS.map((barId, i) => {
				const isActive = i / WAVEFORM_BARS.length <= progress;
				return (
					<motion.div
						key={barId}
						className={`w-2 rounded-full ${isActive ? "bg-primary" : "bg-muted-foreground/20"}`}
						animate={
							isActive
								? {
										height: [
											`${20 + Math.random() * 60}%`,
											`${30 + Math.random() * 50}%`,
											`${20 + Math.random() * 60}%`,
										],
									}
								: { height: "20%" }
						}
						transition={
							isActive
								? {
										duration: 0.4 + Math.random() * 0.4,
										repeat: Infinity,
										repeatType: "reverse",
									}
								: {}
						}
					/>
				);
			})}
		</div>
	);
}

function SuccessAnimation() {
	return (
		<div className="relative w-24 h-24">
			<motion.div
				className="absolute inset-0 rounded-full border-4 border-green-500"
				initial={{ scale: 0, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ duration: 0.5, ease: "easeOut" }}
			/>
			<motion.div
				className="absolute inset-2 rounded-full bg-green-500"
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				transition={{ duration: 0.4, delay: 0.2 }}
			/>
			<motion.svg
				className="absolute inset-0 w-full h-full p-6 text-white"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				initial={{ pathLength: 0, opacity: 0 }}
				animate={{ pathLength: 1, opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.4 }}
			>
				<motion.path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={3}
					d="M5 13l4 4L19 7"
					initial={{ pathLength: 0 }}
					animate={{ pathLength: 1 }}
					transition={{ duration: 0.5, delay: 0.5 }}
				/>
			</motion.svg>
		</div>
	);
}

export function SessionGenerator({ model, onSessionGenerated }: SessionGeneratorProps) {
	const [plannerAgent, setPlannerAgent] = useState<Agent | null>(null);
	const [writerAgent, setWriterAgent] = useState<Agent | null>(null);
	const [phase, setPhase] = useState<GenerationPhase>("planning");
	const [sessionPlan, setSessionPlan] = useState<HypnoPlan>([]);
	const [writingProgress, setWritingProgress] = useState({ completed: 0, total: 0 });
	const [generatingProgress, setGeneratingProgress] = useState({
		message: "",
		progress: 0,
		stage: "" as TtsProgressEvent["stage"],
	});
	const [isPlanning, setIsPlanning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { profile } = useProfileStore();
	const [scratchpad, writeScratchpad] = useScratchpadTool("hypnoplanner");
	const readProfile = useProfileReadTool();
	const saveHypnoFile = useSaveHypnoFile();

	useEffect(() => {
		setPlannerAgent(new Agent(model));
		setWriterAgent(new Agent(model));
	}, [model]);

	const generateSession = async () => {
		setIsPlanning(true);
		setPhase("planning");
		setError(null);
		setSessionPlan([]);
		setWritingProgress({ completed: 0, total: 0 });
		setGeneratingProgress({ message: "", progress: 0, stage: "start" });

		try {
			// Phase 1: Planning
			const planResult = await runPlannerPhase();
			setSessionPlan(planResult);
			setIsPlanning(false);
			setPhase("writing");

			// Phase 2: Writing
			setWritingProgress({ completed: 0, total: planResult.length });
			const scriptResult = await runWriterPhase(planResult);
			setPhase("generating");

			const audioScript: AudioScript = {
				title: "Hypno Session",
				filename: `${crypto.randomUUID()}.wav`,
				script: scriptResult,
			};

			const audioResult = await generateAudio(audioScript, (progress: TtsProgressEvent) => {
				setGeneratingProgress({
					message: progress.message,
					progress: progress.progress,
					stage: progress.stage,
				});
			});

			const file = await saveHypnoFile({
				script: scriptResult,
				plan: planResult,
				hypno_file: audioResult.filename,
				duration_seconds: estimateDuration(scriptResult),
				created_at: new Date(),
			});
			setPhase("complete");
			onSessionGenerated?.(file);
		} catch (err) {
			const errmsg = err instanceof Error ? err.message : "Unknown error occurred";
			setError(`Error while ${phase}: ${errmsg}`);
			setPhase("error");
		}
	};

	const runPlannerPhase = async (): Promise<HypnoPlan> => {
		if (!plannerAgent) throw new Error("Planner agent not initialized");

		const planContent: HypnoPlan = [];

		const tools = [
			tool({
				name: "CreateSection",
				description: "Create a section of the session plan",
				schema: {
					prompt: z.string(),
					section: z.string(),
				},
				call: async ({ section, prompt }) => {
					planContent.push({ name: section, content: prompt });
					return `Section "${section}" created`;
				},
			}),
			readProfile,
			writeScratchpad,
		];

		plannerAgent.setSystemPrompt(getHypnoPlannerPrompt(profile, scratchpad));

		await plannerAgent.act(userMessage("Create a hypno session plan."), tools);

		return planContent;
	};

	const runWriterPhase = async (planContent: HypnoPlan): Promise<string> => {
		if (!writerAgent) throw new Error("Writer agent not initialized");

		let script = "";

		for (let i = 0; i < planContent.length; i++) {
			const section = planContent[i];

			writerAgent.setSystemPrompt(getHypnoWriterPrompt(script, section));

			const systemContent = writerAgent.context.system[0]?.content[0];
			const systemText = systemContent?.type === "text" ? systemContent.text : "";
			const response = await writerAgent.model.generate([
				{ type: "system", content: [{ type: "text", text: systemText }] },
				{
					type: "user",
					content: [
						{
							type: "text",
							text: "Write the hypno session script based on the system prompt. Output only the script.",
						},
					],
				},
			]);

			script += response.content
				.filter((c) => c.type === "text")
				.map((c) => c.text)
				.join("");

			setWritingProgress({ completed: i + 1, total: planContent.length });
		}

		return script;
	};

	const estimateDuration = (script: string): number => {
		// Rough estimation: ~130 words per minute, plus breaks
		const wordCount = script.split(/\s+/).length;
		const breakMatches = script.match(/<break[^>]+time="(\d+)s"\/>/g);
		let breakSeconds = 0;
		if (breakMatches) {
			breakMatches.forEach((match) => {
				const timeMatch = match.match(/time="(\d+)s"/);
				if (timeMatch) {
					breakSeconds += parseInt(timeMatch[1], 10);
				}
			});
		}
		return Math.ceil((wordCount / 130) * 60 + breakSeconds);
	};

	const renderPhaseContent = () => {
		switch (phase) {
			case "planning":
				return (
					<motion.div
						className="relative flex flex-col items-center justify-center space-y-6 py-12"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						<PlanningSpinner />

						<div className="text-center space-y-2 relative z-10">
							<p className="text-lg font-medium text-foreground">Planning session structure</p>
							<p className="text-sm text-muted-foreground">
								Analyzing your profile and creating a personalized outline...
							</p>
						</div>
					</motion.div>
				);

			case "writing": {
				const progressPercent =
					writingProgress.total > 0 ? (writingProgress.completed / writingProgress.total) * 100 : 0;

				return (
					<motion.div
						className="flex flex-col items-center justify-center space-y-6 py-8"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						<div className="text-center space-y-2">
							<p className="text-lg font-medium text-foreground">Writing hypnotic script</p>
							<div className="flex items-center justify-center gap-2 text-sm">
								<span className="text-2xl font-bold text-primary">{writingProgress.completed}</span>
								<span className="text-muted-foreground">of</span>
								<span className="text-2xl font-bold text-foreground">{writingProgress.total}</span>
								<span className="text-muted-foreground">sections</span>
							</div>
						</div>

						{/* Progress bar */}
						<div className="w-full max-w-sm">
							<div className="h-2 bg-muted rounded-full overflow-hidden">
								<motion.div
									className="h-full bg-primary"
									initial={{ width: 0 }}
									animate={{ width: `${progressPercent}%` }}
									transition={{ duration: 0.5 }}
								/>
							</div>
						</div>

						{/* Session plan timeline */}
						{sessionPlan.length > 0 && (
							<div className="w-full mt-4 p-5 bg-muted/50 rounded-xl border border-border/50">
								<h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
									Session Plan
								</h4>
								<div className="relative space-y-0">
									{/* Timeline line */}
									<div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-primary/30" />

									{sessionPlan.map((section, index) => {
										const isCompleted = index < writingProgress.completed;
										const isActive = index === writingProgress.completed;

										return (
											<motion.div
												key={section.name}
												className="relative pl-10 py-3"
												initial={{ opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ delay: index * 0.1 }}
											>
												{/* Timeline node */}
												<div className="absolute left-0 top-1/2 -translate-y-1/2">
													<motion.div
														className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
															isCompleted
																? "bg-green-500 border-transparent"
																: isActive
																	? "bg-background border-primary"
																	: "bg-muted border-muted-foreground/30"
														}`}
														animate={isActive ? { scale: [1, 1.1, 1] } : {}}
														transition={isActive ? { duration: 1, repeat: Infinity } : {}}
													>
														{isCompleted ? (
															<motion.svg
																className="w-4 h-4 text-white"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
																initial={{ scale: 0, rotate: -180 }}
																animate={{ scale: 1, rotate: 0 }}
																transition={{ type: "spring", stiffness: 300 }}
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2.5}
																	d="M5 13l4 4L19 7"
																/>
															</motion.svg>
														) : isActive ? (
															<motion.div
																className="w-3 h-3 rounded-full bg-primary"
																animate={{ scale: [0.8, 1.2, 0.8] }}
																transition={{ duration: 1, repeat: Infinity }}
															/>
														) : (
															<span className="text-xs font-medium text-muted-foreground">
																{index + 1}
															</span>
														)}
													</motion.div>
												</div>

												{/* Section content */}
												<div
													className={`p-3 rounded-lg transition-all ${
														isCompleted
															? "bg-green-500/10 border border-green-500/20"
															: isActive
																? "bg-primary/10 border border-primary/30"
																: "bg-muted/50"
													}`}
												>
													<span
														className={`font-medium text-sm ${
															isCompleted
																? "text-green-600 dark:text-green-400"
																: isActive
																	? "text-primary"
																	: "text-muted-foreground"
														}`}
													>
														{section.name}
													</span>
												</div>
											</motion.div>
										);
									})}
								</div>
							</div>
						)}
					</motion.div>
				);
			}

			case "generating":
				return (
					<motion.div
						className="flex flex-col items-center justify-center space-y-8 py-12"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						<div className="text-center space-y-2">
							<p className="text-lg font-medium text-foreground">Generating audio</p>
							{generatingProgress.message && (
								<motion.p
									className="text-sm text-primary font-medium"
									key={generatingProgress.message}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
								>
									{generatingProgress.message}
								</motion.p>
							)}
						</div>

						{/* Waveform visualizer */}
						<WaveformVisualizer progress={generatingProgress.progress} />

						{/* Sophisticated progress bar */}
						<div className="w-full max-w-sm space-y-2">
							<div className="relative h-3 bg-muted rounded-full overflow-hidden">
								{/* Progress fill */}
								<motion.div
									className="absolute inset-y-0 left-0 bg-primary rounded-full"
									initial={{ width: 0 }}
									animate={{ width: `${generatingProgress.progress * 100}%` }}
									transition={{ duration: 0.3 }}
								/>
							</div>

							<div className="flex justify-between items-center text-xs">
								<span className="text-muted-foreground">
									{generatingProgress.stage === "generate"
										? "Synthesizing voice..."
										: generatingProgress.stage === "write"
											? "Processing audio..."
											: "Preparing..."}
								</span>
								<span className="font-semibold text-primary">
									{(generatingProgress.progress * 100).toFixed(0)}%
								</span>
							</div>
						</div>
					</motion.div>
				);

			case "complete":
				return (
					<motion.div
						className="flex flex-col items-center space-y-8 py-8"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
					>
						{/* Success animation */}
						<SuccessAnimation />

						<div className="text-center space-y-2">
							<motion.h3
								className="text-2xl font-bold text-green-500"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.8 }}
							>
								Session Complete!
							</motion.h3>
							<motion.p
								className="text-muted-foreground"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 1 }}
							>
								Your personalized session has been generated successfully
							</motion.p>
						</div>

						{/* Session outline */}
						{sessionPlan.length > 0 && (
							<motion.div
								className="w-full p-5 bg-green-500/5 rounded-xl border border-green-500/20"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 1.2 }}
							>
								<h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-green-600 dark:text-green-400">
									Session Outline
								</h4>
								<div className="grid gap-2">
									{sessionPlan.map((section, index) => (
										<motion.div
											key={`${section.name}a`}
											className="flex items-center gap-3 p-2 bg-background/50 rounded-lg"
											initial={{ opacity: 0, x: -10 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: 1.3 + index * 0.1 }}
										>
											<div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
												<svg
													className="w-3.5 h-3.5 text-white"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2.5}
														d="M5 13l4 4L19 7"
													/>
												</svg>
											</div>
											<span className="font-medium text-sm text-foreground">{section.name}</span>
										</motion.div>
									))}
								</div>
							</motion.div>
						)}

						{/* Generate another button */}
						<motion.div
							className="w-full"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 1.5 }}
						>
							<Button
								onClick={() => setPhase("planning")}
								variant="outline"
								className="w-full h-12 text-base font-medium border-2 hover:bg-primary/10 hover:border-primary/50 transition-all"
							>
								<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
								Generate Another Session
							</Button>
						</motion.div>
					</motion.div>
				);

			case "error":
				return (
					<motion.div
						className="flex flex-col items-center space-y-6 py-8"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
					>
						{/* Error icon */}
						<div className="relative">
							<motion.div
								className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center"
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{ type: "spring" }}
							>
								<motion.div
									className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center"
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ delay: 0.1, type: "spring" }}
								>
									<svg
										className="w-8 h-8 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2.5}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</motion.div>
							</motion.div>
						</div>

						<div className="text-center space-y-2">
							<h3 className="text-xl font-bold text-red-500">Generation Failed</h3>
							<p className="text-sm text-muted-foreground max-w-sm">{error}</p>
						</div>

						{/* Retry button */}
						<Button
							onClick={() => {
								setPhase("planning");
								setError(null);
							}}
							className="h-12 px-8 bg-red-500 hover:bg-red-600 text-white font-medium"
						>
							<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
							Try Again
						</Button>
					</motion.div>
				);

			default:
				return null;
		}
	};

	return (
		<Card className="relative max-h-[calc(100vh-120px)] overflow-hidden flex flex-col border-0 shadow-2xl">
			<CardHeader className="relative z-10">
				<CardTitle className="text-2xl font-bold text-foreground">Generate Session</CardTitle>
				<CardDescription>
					Create a personalized conditioning session based on your profile and goals
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-6 flex-1 overflow-y-auto relative z-10">
				{/* Phase indicator - shown during active generation */}
				{(phase !== "planning" || isPlanning) && phase !== "error" && (
					<PhaseIndicator currentPhase={phase} />
				)}

				{/* Initial generate button */}
				{phase === "planning" && !isPlanning && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="py-8"
					>
						<Button
							onClick={generateSession}
							className="relative w-full h-14 rounded-xl font-semibold text-lg text-white overflow-hidden bg-primary hover:bg-primary/90"
						>
							<span className="relative z-10 flex items-center justify-center gap-2">
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
								Generate Session
							</span>
						</Button>

						<p className="text-center text-sm text-muted-foreground mt-4">
							This will create a unique session tailored to your conditioning goals
						</p>
					</motion.div>
				)}

				{/* Phase content */}
				<AnimatePresence mode="wait">
					{(phase !== "planning" || isPlanning) && renderPhaseContent()}
				</AnimatePresence>
			</CardContent>
		</Card>
	);
}
