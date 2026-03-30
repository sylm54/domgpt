import { Brain, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chat } from "@/components/ui/shadcn-io/ai/chat";
import { useProfileStore } from "@/data/profile";
import { Agent } from "@/lib/agent";
import { tool } from "@/lib/models";
import { getHypnoOnboardingPrompt } from "@/prompts/coach";

interface HypnoOnboardingStepProps {
	model: any; // eslint-disable-line @typescript-eslint/no-explicit-any
	onComplete: () => void;
}

export function HypnoOnboardingStep({ model, onComplete }: HypnoOnboardingStepProps) {
	const { profile, updateProfile, getProfile } = useProfileStore();
	const [agent, setAgent] = useState<Agent | null>(null);
	const [loading, setLoading] = useState(true);
	const [completed, setCompleted] = useState(false);

	useEffect(() => {
		const hypno = profile?.data?.profile?.hypno;
		if (hypno && hypno.language && hypno.language.idealSelfDescription) {
			setLoading(false);
			setCompleted(true);
			return;
		}

		const hypnoAgent = new Agent(model, getHypnoOnboardingPrompt(profile!));

		const goal = profile?.data?.goal;

		hypnoAgent.addAgentMessage(
			`
Hello! I'm here to learn about how you experience the world internally, so we can craft hypnosis sessions that feel natural and deeply effective for you.

I already know a bit about you — your goal of "${goal?.description || "personal growth"}" and what motivates you. Now I'd like to explore how your mind works on a deeper level.

I'll ask about:
- How you experience suggestions (do you prefer direct guidance or gentle invitations?)
- What senses resonate most with you (visual images, sounds, or physical sensations)
- The language, imagery, and themes that move you emotionally
- A vivid picture of who you want to become

Let's start simply — when you imagine a peaceful place, what comes to mind first? Do you see images, hear sounds, or feel sensations?
`.trim()
		);

		setAgent(hypnoAgent);
		setLoading(false);
	}, [model, profile]);

	const tools = useMemo(
		() => [
			tool({
				name: "SetHypnoProfile",
				description: "Save the user's hypno profile configuration",
				schema: {
					suggestionStyle: z
						.enum(["authoritative", "permissive", "mixed"])
						.describe("How suggestions should be delivered"),
					inductionNotes: z
						.string()
						.describe("User's preferences and experiences with entering trance"),
					sensoryModalities: z
						.array(z.enum(["visual", "auditory", "kinesthetic"]))
						.describe("Which senses resonate most with the user"),
					selfReferentialPhrases: z
						.array(z.string())
						.describe("Phrases the user identifies with or wants to embody"),
					imagery: z.array(z.string()).describe("Images and scenes that resonate with the user"),
					themes: z.array(z.string()).describe("Recurring themes for their journey"),
					emotionalVocab: z
						.array(z.string())
						.describe("Words that carry emotional weight for the user"),
					idealSelfDescription: z.string().describe("Vivid description of who they want to become"),
				},
				call: async ({
					suggestionStyle,
					inductionNotes,
					sensoryModalities,
					selfReferentialPhrases,
					imagery,
					themes,
					emotionalVocab,
					idealSelfDescription,
				}) => {
					const currentProfile = getProfile();
					updateProfile({
						data: {
							...currentProfile?.data,
							profile: {
								...currentProfile?.data?.profile,
								hypno: {
									suggestionStyle,
									inductionNotes,
									sensoryModalities,
									language: {
										selfReferentialPhrases,
										imagery,
										themes,
										emotionalVocab,
										idealSelfDescription,
									},
								},
							},
						},
					});
					setCompleted(true);
					return `Hypno profile saved successfully! Style: ${suggestionStyle}, Modalities: ${sensoryModalities.join(", ")}`;
				},
			}),
		],
		[getProfile, updateProfile]
	);

	useEffect(() => {
		if (!agent) return;

		const originalAct = agent.act.bind(agent);
		agent.act = async (message, _, onProgress) => {
			return originalAct(message, tools, onProgress);
		};

		return () => {};
	}, [agent, tools]);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	if (completed) {
		const hypno = getProfile()?.data?.profile?.hypno;
		return (
			<div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
				<div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
					<Brain className="w-10 h-10 text-primary" />
				</div>
				<div className="space-y-2">
					<h3 className="text-xl font-semibold">Hypno Profile Configured!</h3>
					<p className="text-sm text-muted-foreground max-w-md">
						Your personalized hypnosis profile has been created. Sessions will be tailored to your
						unique sensory style and language.
					</p>
				</div>
				{hypno && (
					<div className="mt-4 space-y-3 text-left max-w-lg mx-auto">
						<div className="p-3 bg-muted/30 rounded-lg border border-border/50">
							<div className="flex items-center gap-2 mb-2">
								<Brain className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium">Suggestion Style</span>
							</div>
							<Badge variant="secondary" className="bg-primary/10 text-primary capitalize">
								{hypno.suggestionStyle}
							</Badge>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="p-3 bg-muted/30 rounded-lg border border-border/50">
								<span className="text-xs font-medium text-muted-foreground block mb-1">
									Modalities
								</span>
								<div className="flex flex-wrap gap-1">
									{hypno.sensoryModalities.map((m) => (
										<span
											key={m}
											className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded capitalize"
										>
											{m}
										</span>
									))}
								</div>
							</div>
							<div className="p-3 bg-muted/30 rounded-lg border border-border/50">
								<span className="text-xs font-medium text-muted-foreground block mb-1">Themes</span>
								<div className="flex flex-wrap gap-1">
									{hypno.language.themes.slice(0, 3).map((t) => (
										<span
											key={t}
											className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
										>
											{t}
										</span>
									))}
									{hypno.language.themes.length > 3 && (
										<span className="text-xs text-muted-foreground">
											+{hypno.language.themes.length - 3} more
										</span>
									)}
								</div>
							</div>
						</div>
					</div>
				)}
				<Button onClick={onComplete} size="lg" className="min-w-[160px]">
					Continue
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
					Let's configure your hypnosis experience. I'll explore how your mind responds to
					suggestions, imagery, and language so every session feels natural and effective.
				</p>
			</div>

			{agent && (
				<div className="flex-1 min-h-0 border border-border/50 rounded-lg overflow-hidden">
					<Chat
						agent={agent}
						placeholder="Tell me about your inner experience..."
						className="h-full"
						tool_display={() => (
							<Card className="bg-muted/30 border-primary/20">
								<CardContent className="py-3 px-4">
									<div className="flex items-center gap-2 text-xs">
										<Brain className="w-4 h-4 text-primary" />
										<span className="font-medium">Building Hypno Profile</span>
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										Discovering your hypnotic preferences...
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
