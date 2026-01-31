import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { useLogHistoryData } from "@/data/history";
import { InterviewAgent } from "../../lib/agent";
import type { Model } from "../../lib/models";
import { tool, userMessage } from "../../lib/models";
import type { Question, Reflection } from "../../types/user";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { useProfileStore } from "@/data/profile";

interface ReflectionSessionProps {
	model: Model;
}

export function ReflectionSession({ model }: ReflectionSessionProps) {
	const [agent, setAgent] = useState<InterviewAgent | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string | number>>({});
	const [isGenerating, setIsGenerating] = useState(true);
	const [isComplete, setIsComplete] = useState(false);
	const { profile } = useProfileStore();
	const logHistoryData = useLogHistoryData();

	const generateQuestions = useCallback(
		async (interviewAgent: InterviewAgent) => {
			setIsGenerating(true);

			// Define tools for question generation
			const tools = [
				tool({
					name: "AskRate",
					description: "Create a rating question (1-10 scale)",
					schema: {
						question: z.string(),
						scale: z.number().describe("The scale for the rating (e.g., 10 for 1-10)"),
						key: z.string(),
					},
					call: async ({ question, scale, key }) => {
						setQuestions((prev) => [
							...prev,
							{
								question,
								type: "rating",
								scale,
							} as Question,
						]);
						return "Rating question added";
					},
				}),
				tool({
					name: "AskMultipleChoice",
					description: "Create a multiple choice question",
					schema: {
						question: z.string(),
						options: z.array(z.string()),
						key: z.string(),
					},
					call: async ({ question, options, key }) => {
						setQuestions((prev) => [
							...prev,
							{
								question,
								type: "multiple_choice",
								options,
							} as Question,
						]);
						return "Multiple choice question added";
					},
				}),
				tool({
					name: "AskOpenText",
					description: "Create an open text question",
					schema: {
						question: z.string(),
						key: z.string(),
					},
					call: async ({ question, key }) => {
						setQuestions((prev) => [
							...prev,
							{
								question,
								type: "open_text",
							} as Question,
						]);
						return "Open text question added";
					},
				}),
			];

			// Set up agent with tools and context
			interviewAgent.setSystemPrompt(`You are an Interview Agent for a conditioning training app.

Your role is to:
1. Generate 4-8 dynamic questions based on context
2. Quantify conditioning effectiveness and mental state
3. Assess conditioning plan progress

You have access to tools to:
- AskMultipleChoice: Present multiple choice questions (use 'options' field)
- AskRate: Get Likert scale ratings (1-10, use 'scale' field)
- AskOpenText: Get open-ended responses

Current User Context:
${JSON.stringify({ profile: profile?.profile, plan: profile?.plan, goal: profile?.goal }, null, 2)}

Generate questions that assess:
- Progress toward the user's goal
- Effectiveness of current conditioning techniques
- Any blockers or challenges
- Emotional state and receptivity

Use the tools to create 4-8 questions. Mix of rating, multiple choice, and open text.`);

			// Trigger question generation
			await interviewAgent.act(userMessage("Generate reflection questions for the user."), tools);

			setIsGenerating(false);
		},
		[profile]
	);

	useEffect(() => {
		const interviewAgent = new InterviewAgent(model);
		setAgent(interviewAgent);

		// Generate questions on mount
		generateQuestions(interviewAgent);
	}, [model, generateQuestions]);

	const handleAnswer = (answer: string | number) => {
		const currentQuestion = questions[currentQuestionIndex];
		// Create a key based on the question text since Question type doesn't have id
		const key = currentQuestion.question;
		setAnswers((prev) => ({ ...prev, [key]: answer }));
	};

	const handleNext = () => {
		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1);
		} else {
			completeReflection();
		}
	};

	const handleBack = () => {
		if (currentQuestionIndex > 0) {
			setCurrentQuestionIndex(currentQuestionIndex - 1);
		}
	};

	const completeReflection = () => {
		// Transform answers to match Question type with answers embedded
		const reflectionQuestions = questions.map((q) => {
			const answer = answers[q.question];
			if (q.type === "multiple_choice") {
				return {
					...q,
					answer: answer as string,
				};
			}
			if (q.type === "rating") {
				return {
					...q,
					answer: answer as number,
				};
			}
			return {
				...q,
				answer: answer as string,
			};
		});

		const reflection: Reflection = {
			questions: reflectionQuestions,
			created_at: new Date().toISOString(),
		};
		logHistoryData({
			type: "reflection",
			reflection: reflection,
			time: new Date(),
		});
		setIsComplete(true);
	};

	const handleRestart = () => {
		setQuestions([]);
		setCurrentQuestionIndex(0);
		setAnswers({});
		setIsComplete(false);
		if (agent) {
			generateQuestions(agent);
		}
	};

	if (!profile) {
		return (
			<Card className="h-full">
				<CardContent className="flex flex-col items-center justify-center h-full space-y-4">
					<p className="text-muted-foreground">Loading profile...</p>
				</CardContent>
			</Card>
		);
	}

	if (isGenerating) {
		return (
			<Card className="h-full">
				<CardContent className="flex flex-col items-center justify-center h-full space-y-4">
					<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
					<p className="text-muted-foreground">Generating reflection questions...</p>
				</CardContent>
			</Card>
		);
	}

	if (isComplete) {
		return (
			<Card className="h-full">
				<CardContent className="flex flex-col items-center justify-center h-full space-y-6">
					<div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
						<svg
							className="w-8 h-8 text-primary"
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
					</div>
					<div className="text-center">
						<h3 className="text-lg font-medium">Reflection Complete</h3>
						<p className="text-muted-foreground mt-2">
							Thank you for your reflection. Your Coach will review this data.
						</p>
					</div>
					<Button onClick={handleRestart}>Start New Reflection</Button>
				</CardContent>
			</Card>
		);
	}

	const currentQuestion = questions[currentQuestionIndex];
	const currentKey = currentQuestion?.question;
	const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

	return (
		<Card className="h-full flex flex-col">
			<CardHeader>
				<div className="flex justify-between items-center mb-2">
					<CardTitle>Reflection Session</CardTitle>
					<span className="text-sm text-muted-foreground">
						{currentQuestionIndex + 1} of {questions.length}
					</span>
				</div>
				<div className="w-full bg-muted h-2 rounded-full">
					<div
						className="bg-primary h-2 rounded-full transition-all duration-300"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</CardHeader>
			<CardContent className="flex-1 flex flex-col">
				{currentQuestion && (
					<div className="flex-1 space-y-6">
						<div>
							<Label className="text-lg font-medium">{currentQuestion.question}</Label>
						</div>

						{currentQuestion.type === "rating" && (
							<div className="space-y-4">
								<div className="flex justify-between text-sm text-muted-foreground">
									<span>1</span>
									<span>{currentQuestion.scale}</span>
								</div>
								<div className="flex justify-between gap-2">
									{Array.from({ length: currentQuestion.scale }, (_, i) => i + 1).map((value) => (
										<Button
											key={value}
											variant={answers[currentKey] === value ? "default" : "outline"}
											size="sm"
											className="flex-1"
											onClick={() => handleAnswer(value)}
										>
											{value}
										</Button>
									))}
								</div>
							</div>
						)}

						{currentQuestion.type === "multiple_choice" && currentQuestion.options && (
							<div className="space-y-2">
								{currentQuestion.options.map((option) => (
									<Button
										key={option}
										variant={answers[currentKey] === option ? "default" : "outline"}
										className="w-full justify-start"
										onClick={() => handleAnswer(option)}
									>
										{option}
									</Button>
								))}
							</div>
						)}

						{currentQuestion.type === "open_text" && (
							<textarea
								className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm"
								placeholder="Type your answer here..."
								value={(answers[currentKey] as string) || ""}
								onChange={(e) => handleAnswer(e.target.value)}
							/>
						)}
					</div>
				)}

				<div className="flex justify-between mt-6 pt-4 border-t">
					<Button variant="outline" onClick={handleBack} disabled={currentQuestionIndex === 0}>
						Back
					</Button>
					<Button onClick={handleNext} disabled={answers[currentKey] === undefined}>
						{currentQuestionIndex === questions.length - 1 ? "Complete" : "Next"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
