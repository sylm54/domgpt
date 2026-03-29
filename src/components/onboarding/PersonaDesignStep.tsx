import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Agent } from "@/lib/agent";
import { tool } from "@/lib/models";
import { useProfileStore } from "@/data/profile";
import { Chat } from "@/components/ui/shadcn-io/ai/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PersonaDesignStepProps {
	model: any; // eslint-disable-line @typescript-eslint/no-explicit-any
	onComplete: () => void;
}

export function PersonaDesignStep({ model, onComplete }: PersonaDesignStepProps) {
	const { profile, updateProfile, getProfile } = useProfileStore();
	const [agent, setAgent] = useState<Agent | null>(null);

	const [loading, setLoading] = useState(true);
	const [completed, setCompleted] = useState(false);

	// Create agent for persona design
	useEffect(() => {
		if (
			profile?.personality &&
			profile.personality.coach &&
			profile.personality.reflection &&
			profile.personality.hypnostyle
		) {
			setLoading(false);
			setCompleted(true);
			return;
		}

		// Get the goal from the profile
		const goal = profile?.data?.goal;

		const personaAgent = new Agent(
			model,
			`
You are a persona designer agent for a conditioning coaching system. Your task is to create personalized personas for the user's Coach and Reflection agents, as well as design the optimal hypnosis style for their journey.

- Coach
  - Designs the users training plan: creates todos/routines/habits, plans hypnos, and sets plans for reflection agent.
  - Monitors progress and adapts plans using the user's profile, constraints, and recent activity.
  - Persona should be a fully realized character with a distinct voice, background, and approach that embodies their role. The Coach should feel like a real person—someone whose personality, communication style, and values naturally inspire and support the user's motivation and target identity. Describe their demeanor, how they interact, their philosophy, and any unique qualities that make them an ideal guide for the user's journey.

- Reflection
  - Leads reflective, Socratic-style conversations to surface beliefs, patterns, and learning from experience.
  - Helps reframe challenges, clarify insights, and convert reflections into practical adjustments.
  - Persona should be a distinct character from the Coach, with their own voice and style. The Reflection agent should feel like a trusted confidant—someone who listens deeply, asks insightful questions, and helps the user gain clarity and perspective on their journey. Describe their demeanor, how they interact, their philosophy, and any unique qualities that make them an ideal partner for reflection and self-discovery.

- Hypno Style
  - Specifies induction, deepening, suggestion styles, anchors, metaphors, pacing, and sensory focus for hypno sessions.
  - Outlines session structure, timing, and post-hypnotic cues to support conditioning and carryover.
  - Should be tailored to the user's goal, motivation, and target identity, as well as their preferences and responsiveness. Describe the optimal hypnosis style for the user.

The user has a specific goal they want to achieve through conditioning training. Your job is to understand this goal and design personas that will best support the user in achieving it.

User Goal Information:
${goal.description}
Motivation:
${goal.motivation}
Target Identity:
${goal.targetIdentity}
      `.trim()
		);

		personaAgent.addAgentMessage(
			`
Hello! I'm your persona designer. Based on your goal, I'll create personalized personas for your Coach and Reflection agents, and tune your hypnosis style.

I'll design:
1. **Coach Persona**: How your coach should interact with you to help achieve your goal
2. **Reflection Persona**: How your reflection agent should help you process and integrate your experiences
3. **Hypno Style**: The optimal hypnosis style for your conditioning journey

To start i will give you a preliminary design for each persona. You can then provide feedback and preferences to refine them until they perfectly fit your needs and support your journey toward your goal.
`.trim()
		);

		setAgent(personaAgent);
		setLoading(false);
	}, [model, profile]);

	// Define tools for the Persona Design Agent
	const tools = useMemo(
		() => [
			tool({
				name: "SetPersonality",
				description: "Set the personality profiles for Coach, Reflection, and Hypno Style",
				schema: {
					coach: z.string().describe("The coach persona description"),
					reflection: z.string().describe("The reflection persona description"),
					hypnostyle: z.string().describe("The hypnosis style description"),
				},
				call: async ({ coach, reflection, hypnostyle }) => {
					updateProfile({
						personality: {
							coach,
							reflection,
							hypnostyle,
						},
					});
					setCompleted(true);
					return `Personas designed successfully!`;
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
		const personality = getProfile()?.personality;
		return (
			<div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
				<div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
					<Sparkles className="w-10 h-10 text-primary" />
				</div>
				<div className="space-y-2">
					<h3 className="text-xl font-semibold">Personas Designed!</h3>
					<p className="text-sm text-muted-foreground max-w-md">
						Your personalized personas have been created based on your goal and preferences.
					</p>
					{personality && (
						<div className="mt-4 space-y-3 text-left max-w-lg mx-auto">
							<div className="p-3 bg-muted/30 rounded-lg border border-border/50">
								<div className="flex items-center gap-2 mb-2">
									<Sparkles className="w-4 h-4 text-primary" />
									<span className="text-sm font-medium">Coach Persona</span>
								</div>
								<p className="text-xs text-muted-foreground line-clamp-2">{personality.coach}</p>
							</div>
							<div className="p-3 bg-muted/30 rounded-lg border border-border/50">
								<div className="flex items-center gap-2 mb-2">
									<Sparkles className="w-4 h-4 text-primary" />
									<span className="text-sm font-medium">Reflection Persona</span>
								</div>
								<p className="text-xs text-muted-foreground line-clamp-2">
									{personality.reflection}
								</p>
							</div>
							<div className="p-3 bg-muted/30 rounded-lg border border-border/50">
								<div className="flex items-center gap-2 mb-2">
									<Sparkles className="w-4 h-4 text-primary" />
									<span className="text-sm font-medium">Hypno Style</span>
								</div>
								<p className="text-xs text-muted-foreground line-clamp-2">
									{personality.hypnostyle}
								</p>
							</div>
						</div>
					)}
				</div>
				<Button onClick={onComplete} size="lg" className="min-w-[160px]">
					Continue to Profile
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
					Now I'll design your personalized personas. Based on your goal, I'll create the optimal
					coach personality, reflection style, and hypnosis configuration for your journey.
				</p>
			</div>

			{agent && (
				<div className="flex-1 min-h-0 border border-border/50 rounded-lg overflow-hidden">
					<Chat
						agent={agent}
						placeholder="Tell me about your preferences..."
						className="h-full"
						tool_display={() => (
							<Card className="bg-muted/30 border-primary/20">
								<CardContent className="py-3 px-4">
									<div className="flex items-center gap-2 text-xs">
										<Sparkles className="w-4 h-4 text-primary" />
										<span className="font-medium">Designing Personas</span>
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										Creating your personalized coaching experience...
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
