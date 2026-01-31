import { useEffect, useState } from "react";
import { z } from "zod";
import { HypnoPlannerAgent, HypnoWriterAgent } from "../../lib/agent";
import type { Model } from "../../lib/models";
import { tool, userMessage } from "../../lib/models";
import { type AudioScript, generateAudio, type TtsProgressEvent } from "../../lib/tts-rust";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import type { HypnoFile, HypnoPlan } from "@/types/user";
import { useSaveHypnoFile } from "@/data/hypno";
import { getHypnoPlannerPrompt } from "@/prompts/hypno";
import { useProfileStore } from "@/data/profile";

interface SessionGeneratorProps {
	model: Model;
	onSessionGenerated?: (session: HypnoFile) => void;
}

type GenerationPhase = "planning" | "writing" | "generating" | "complete" | "error";

export function SessionGenerator({ model, onSessionGenerated }: SessionGeneratorProps) {
	const [plannerAgent, setPlannerAgent] = useState<HypnoPlannerAgent | null>(null);
	const [writerAgent, setWriterAgent] = useState<HypnoWriterAgent | null>(null);
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
	const saveHypnoFile = useSaveHypnoFile();

	useEffect(() => {
		setPlannerAgent(new HypnoPlannerAgent(model));
		setWriterAgent(new HypnoWriterAgent(model));
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

			const file: HypnoFile = {
				script: scriptResult,
				plan: planResult,
				hypno_file: audioResult.filename,
				duration_seconds: estimateDuration(scriptResult),
				created_at: new Date(),
			};

			await saveHypnoFile(file);
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
			// tool({
			// 	name: "SearchInfo",
			// 	description: "Search for relevant user information",
			// 	schema: {
			// 		query: z.string(),
			// 	},
			// 	call: async ({ query }) => {
			// 		// In a real implementation, this would search the vector DB
			// 		return `Search results for: ${query}`;
			// 	},
			// }),
		];
		plannerAgent.setSystemPrompt(getHypnoPlannerPrompt(profile));

		await plannerAgent.act(
			userMessage("Create a hypno session plan based on the user profile and goal."),
			tools
		);

		return planContent;
	};

	const runWriterPhase = async (planContent: HypnoPlan): Promise<string> => {
		if (!writerAgent) throw new Error("Writer agent not initialized");

		let script = "";

		for (let i = 0; i < planContent.length; i++) {
			const section = planContent[i];

			writerAgent.setSystemPrompt(`You are a Hypno Writer Agent.

Your role is to:
1. Receive a prompt of a hypno section from the Planner(the user message)
2. Write a hypnotic scripts for this section to be used by a tts system using the below audio tags

Key Requirements:
- Adapt writing style: Hypnotic (NLP/Pacing), Direct (Affirmations), or Instructional
- Write in a calm, soothing, and authoritative tone.
- Include pacing statements to build rapport.
- Repeat key suggestions for reinforcement.
- Use vivid imagery and sensory language.
- Ensure suggestions align with the user's hypno goals.
- Use Hypno and conditioning techniques effectively.
- Only write for the specified section.

Tags to use:
- <voice value="...">: Changes the TTS voice for all contained content.
  - Available: male, male2, female, female2
- <speed value="...">: Adjusts playback speed for contained content.
- <pause value="..."/>: Inserts silence.
- <sound value="..."/>: Plays a pre-built sound effect.
    - Available: beep, pop, bubble_pop, camera_shutter, censor_beep, heart_beat, padlock, snap
- <effect value="..." [preset="..."] [options="..."]>...</effect>: Applies audio effects to contained content.
    - Echo: <effect value="echo" preset="light">echoed text</effect>
    - Binaural: <effect value="binaural" preset="theta">binaural text</effect>
    - Pan: <effect value="pan" preset="left">left channel</effect>
- <overlay><part>...</part><part>...</part></overlay>: Overlays multiple audio tracks.
- <loop value="...">...</loop>: Repeats contained audio.
- <volume value="...">...</volume>: Adjusts volume.
- <!-- comments -->: for internal notes
Example usage:
<voice value="female">
    Welcome to your session.
    <pause value="1" />
    <effect value="binaural" preset="theta">
        Relax deeply now.
    </effect>
    You feel calm and confident.
    <speed value="0.9">
        Let your mind slow down.
    </speed>
    <sound value="heart_beat"/>
    <overlay>
        <part>
            <voice value="male">
                You are safe and secure.
            </voice>
        </part>
        <part>
            <volume value="0.2">
                <loop value="3">
                    <sound value="bubble_pop"/>
                </loop>
            </volume>
        </part>
    </overlay>
</voice>

Session Plan:
## ${section.name}
${section.content}

Previous Section ending:
${script.substring(script.length - 100, script.length)}

Include proper pacing with breaks. Make it effective. Use the tags extensively.`);

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
					<div className="flex flex-col items-center justify-center space-y-4 py-8">
						<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
						<p className="text-muted-foreground">Planning session structure...</p>
					</div>
				);
			case "writing":
				return (
					<div className="flex flex-col items-center justify-center space-y-4 py-8">
						<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
						<p className="text-muted-foreground">Writing hypnotic script...</p>
						<div className="flex items-center gap-2 text-sm text-primary font-medium">
							<span>{writingProgress.completed}</span>
							<span className="text-muted-foreground">/</span>
							<span>{writingProgress.total}</span>
							<span className="text-muted-foreground">sections completed</span>
						</div>
						{sessionPlan.length > 0 && (
							<div className="w-full mt-4 p-4 bg-muted rounded-lg">
								<h4 className="font-medium mb-2">Session Plan:</h4>
								<div className="space-y-2">
									{sessionPlan.map((section, index) => (
										<div
											key={section.name}
											className={`p-2 rounded ${index < writingProgress.completed ? "bg-primary/10" : "bg-muted"}`}
										>
											<div className="flex items-center gap-2">
												{index < writingProgress.completed ? (
													<svg
														className="w-4 h-4 text-primary"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M5 13l4 4L19 7"
														/>
													</svg>
												) : (
													<svg
														className="w-4 h-4 text-muted-foreground"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M12 6v6m0 0v6m0-6h6m-6 0H6"
														/>
													</svg>
												)}
												<span className="font-medium text-sm">{section.name}</span>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				);
			case "generating":
				return (
					<div className="flex flex-col items-center justify-center space-y-4 py-8">
						<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
						<p className="text-muted-foreground">Generating audio...</p>
						{generatingProgress.message && (
							<p className="text-sm text-primary font-medium">{generatingProgress.message}</p>
						)}
						{generatingProgress.progress > 0 && (
							<div className="w-full max-w-xs">
								<div className="h-2 bg-muted rounded-full overflow-hidden">
									<div
										className="h-full bg-primary transition-all duration-300"
										style={{ width: `${generatingProgress.progress * 100}%` }}
									/>
								</div>
								<p className="text-xs text-muted-foreground mt-1 text-center">
									{(generatingProgress.progress * 100).toFixed(0)}% complete
								</p>
							</div>
						)}
					</div>
				);
			case "complete":
				return (
					<div className="space-y-6">
						<div className="flex items-center gap-2 text-green-600">
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span className="font-medium text-lg">Session generated successfully!</span>
						</div>
						{sessionPlan.length > 0 && (
							<div className="bg-muted p-4 rounded-lg">
								<h4 className="font-medium mb-3">Session Outline:</h4>
								<div className="space-y-2">
									{sessionPlan.map((section, index) => (
										<div key={`${section.name}a`} className="p-2 bg-background rounded">
											<div className="flex items-center gap-2">
												<svg
													className="w-4 h-4 text-green-600"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M5 13l4 4L19 7"
													/>
												</svg>
												<span className="font-medium text-sm">{section.name}</span>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
						<Button onClick={() => setPhase("planning")} variant="outline" className="w-full">
							Generate Another Session
						</Button>
					</div>
				);
			case "error":
				return (
					<div className="space-y-4">
						<div className="flex items-center gap-2 text-red-600">
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
							<span className="font-medium">Error generating session</span>
						</div>
						<p className="text-sm text-muted-foreground">{error}</p>
						<Button onClick={() => setPhase("planning")} variant="outline" className="w-full">
							Try Again
						</Button>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<Card className="max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
			<CardHeader>
				<CardTitle>Generate Hypno Session</CardTitle>
				<CardDescription>
					Create a personalized hypno session based on your profile and goals
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6 flex-1 overflow-y-auto">
				{phase === "planning" && !isPlanning && (
					<Button onClick={generateSession} className="w-full">
						Generate Session
					</Button>
				)}

				{(phase !== "planning" || isPlanning) && renderPhaseContent()}
			</CardContent>
		</Card>
	);
}
