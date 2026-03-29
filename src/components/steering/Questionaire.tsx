import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useProfileStore } from "@/data/profile";
import { useModel } from "@/data/settings";
import { getInterviewPrompt } from "@/prompts/interview";
import { tool, userMessage } from "../../lib/models";
import type { Question } from "../../types/user";
import { Agent } from "../../lib/agent";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";

interface QuestionaireProps {
	referer: string;
	onComplete: (questions: Question[]) => void;
	title?: string;
	generatingMessage?: string;
	completionTitle?: string;
	completionMessage?: string;
	showRestart?: boolean;
	restartLabel?: string;
	onRestart?: () => void;
}

// Rating label helper
function getRatingLabel(value: number, max: number): string {
	const percentage = value / max;
	if (percentage <= 0.2) return "Very Low";
	if (percentage <= 0.4) return "Low";
	if (percentage <= 0.6) return "Moderate";
	if (percentage <= 0.8) return "High";
	return "Very High";
}

// Rating color helper
function getRatingColor(value: number, max: number): string {
	const percentage = value / max;
	if (percentage <= 0.2) return "from-red-500 to-orange-500";
	if (percentage <= 0.4) return "from-orange-500 to-amber-500";
	if (percentage <= 0.6) return "from-amber-500 to-yellow-500";
	if (percentage <= 0.8) return "from-yellow-500 to-lime-500";
	return "from-lime-500 to-emerald-500";
}

export function Questionaire({
	referer,
	onComplete,
	title,
	generatingMessage,
	completionTitle,
	completionMessage,
	showRestart = true,
	restartLabel,
	onRestart,
}: QuestionaireProps) {
	const model = useModel();
	const [agent, setAgent] = useState<Agent | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string | number>>({});
	const [isGenerating, setIsGenerating] = useState(true);
	const [isComplete, setIsComplete] = useState(false);
	const { profile } = useProfileStore();
	const hasGeneratedRef = useRef(false);

	// Define tools for question generation - memoized to prevent unnecessary re-renders
	const tools = useMemo(
		() => [
			tool({
				name: "AskRate",
				description: "Create a rating question (1-10 scale)",
				schema: {
					question: z.string(),
					scale: z.number().describe("The scale for the rating (e.g., 10 for 1-10)"),
					key: z.string(),
				},
				call: async ({ question, scale, key: _key }) => {
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
				call: async ({ question, options, key: _key }) => {
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
				call: async ({ question, key: _key }) => {
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
		],
		[]
	);

	const generateQuestions = useCallback(
		async (interviewAgent: Agent) => {
			if (hasGeneratedRef.current) return;
			hasGeneratedRef.current = true;
			setIsGenerating(true);

			// Set up agent with tools and context
			interviewAgent.setSystemPrompt(getInterviewPrompt(profile, referer));

			// Trigger question generation
			await interviewAgent.act(userMessage("Generate questions for the user."), tools);

			setIsGenerating(false);
		},
		[profile, referer, tools]
	);

	// Initialize agent on mount
	useEffect(() => {
		const interviewAgent = new Agent(model);
		setAgent(interviewAgent);
	}, [model]);

	// Generate questions when agent is ready
	useEffect(() => {
		if (agent && !hasGeneratedRef.current) {
			generateQuestions(agent);
		}
	}, [agent, generateQuestions]);

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
		const reflectionQuestions: Question[] = questions.map((q): Question => {
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

		setIsComplete(true);
		onComplete(reflectionQuestions);
	};

	const handleRestart = () => {
		if (onRestart) {
			onRestart();
		} else {
			hasGeneratedRef.current = false;
			setQuestions([]);
			setCurrentQuestionIndex(0);
			setAnswers({});
			setIsComplete(false);
			if (agent) {
				generateQuestions(agent);
			}
		}
	};

	if (!profile) {
		return (
			<Card className="h-64 flex items-center justify-center border-violet-200">
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
								className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500"
							/>
							<div className="absolute inset-0 flex items-center justify-center">
								<Sparkles className="w-5 h-5 text-violet-400" />
							</div>
						</div>
						<span className="text-muted-foreground font-medium">Loading profile...</span>
					</motion.div>
				</CardContent>
			</Card>
		);
	}

	if (!agent) {
		return (
			<Card className="h-full border-violet-200">
				<CardContent className="flex items-center justify-center h-full">
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
								<Sparkles className="w-5 h-5 text-violet-500" />
							</div>
						</div>
						<span className="text-muted-foreground font-medium">Initializing questionnaire...</span>
					</motion.div>
				</CardContent>
			</Card>
		);
	}

	if (isGenerating) {
		return (
			<Card className="h-full flex flex-col border-violet-200">
				<CardContent className="flex items-center justify-center h-full">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="flex flex-col items-center gap-6"
					>
						<div className="relative">
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
								className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500"
							/>
							<div className="absolute inset-0 flex items-center justify-center">
								<Sparkles className="w-5 h-5 text-violet-400" />
							</div>
						</div>
						<motion.div
							className="text-center space-y-2"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.2 }}
						>
							<span className="text-foreground font-medium">
								{generatingMessage || "Generating questions..."}
							</span>
							<span className="text-muted-foreground text-sm">
								Take a deep breath and prepare for reflection
							</span>
						</motion.div>
					</motion.div>
				</CardContent>
			</Card>
		);
	}

	if (isComplete) {
		return (
			<Card className="h-full flex flex-col border-emerald-200">
				<CardContent className="flex items-center justify-center h-full p-8">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.3, ease: "easeOut" }}
						className="flex flex-col items-center gap-6 text-center"
					>
						<div className="relative">
							<div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
								<CheckCircle2 className="w-10 h-10 text-emerald-500" />
							</div>
						</div>
						<motion.div
							className="space-y-3"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
						>
							<h3 className="text-2xl font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
								{completionTitle || "Complete"}
							</h3>
							<p className="text-muted-foreground max-w-sm">{completionMessage || "Thank you."}</p>
						</motion.div>
						<motion.div
							className="bg-muted/30 rounded-xl px-4 py-3"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
						>
							<p className="text-sm text-muted-foreground">
								You answered{" "}
								<span className="font-semibold text-foreground">{questions.length}</span> questions
							</p>
						</motion.div>
						{showRestart && (
							<motion.div
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.4 }}
							>
								<Button
									onClick={handleRestart}
									className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white border-0 shadow-lg hover:shadow-violet-500/25 transition-all duration-300"
								>
									<Sparkles className="w-4 h-4 mr-2" />
									{restartLabel || "Restart"}
								</Button>
							</motion.div>
						)}
					</motion.div>
				</CardContent>
			</Card>
		);
	}

	const currentQuestion = questions[currentQuestionIndex];
	const currentKey = currentQuestion?.question;
	const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
	const currentAnswer = answers[currentKey];

	return (
		<Card className="h-full flex flex-col border-violet-200">
			<CardHeader className="pb-4 border-b border-violet-100">
				<CardTitle className="flex items-center justify-between">
					<span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
						{title || "Questionnaire"}
					</span>
					<Badge
						variant="secondary"
						className="bg-violet-500/10 text-violet-500 border-violet-500/20"
					>
						{currentQuestionIndex + 1} / {questions.length}
					</Badge>
				</CardTitle>
				<div className="relative h-2 bg-muted rounded-full overflow-hidden">
					<motion.div
						className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full"
						initial={{ width: 0 }}
						animate={{ width: `${progress}%` }}
						transition={{ duration: 0.3, ease: "easeOut" }}
					/>
				</div>
			</CardHeader>

			<CardContent className="flex-1 p-0 min-h-0 relative overflow-y-auto">
				<AnimatePresence mode="wait">
					{currentQuestion && (
						<motion.div
							key={currentQuestionIndex}
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
							className="p-6 space-y-6"
						>
							{/* Question number badge and text */}
							<div className="space-y-4">
								<motion.div
									className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-xl text-white font-bold shadow-lg"
									initial={{ opacity: 0, y: 8, scale: 0.95 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									transition={{ duration: 0.3, ease: "easeOut" }}
								>
									{currentQuestionIndex + 1}
								</motion.div>
								<Label className="block text-lg font-medium leading-relaxed">
									{currentQuestion.question}
								</Label>
							</div>

							{/* Rating input */}
							{currentQuestion.type === "rating" && (
								<div className="space-y-6">
									{/* Rating display */}
									{currentAnswer !== undefined && (
										<motion.div
											initial={{ opacity: 0, y: 8 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.3, ease: "easeOut" }}
											className="text-center"
										>
											<span
												className={cn(
													"text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
													getRatingColor(currentAnswer as number, currentQuestion.scale)
												)}
											>
												{currentAnswer}
											</span>
											<span className="text-muted-foreground ml-2">/ {currentQuestion.scale}</span>
											<p className="text-sm text-muted-foreground mt-1">
												{getRatingLabel(currentAnswer as number, currentQuestion.scale)}
											</p>
										</motion.div>
									)}

									{/* Rating buttons */}
									<div className="space-y-3">
										<div className="flex justify-between text-xs text-muted-foreground px-1">
											<span>Not at all</span>
											<span>Extremely</span>
										</div>
										<div className="flex gap-2 flex-wrap justify-center">
											{Array.from({ length: currentQuestion.scale }, (_, i) => i + 1).map(
												(value) => {
													const isSelected = currentAnswer === value;
													return (
														<motion.button
															key={value}
															type="button"
															className={cn(
																"relative w-10 h-10 rounded-xl font-semibold text-sm transition-all duration-200",
																isSelected
																	? "bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/30"
																	: "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
															)}
															onClick={() => handleAnswer(value)}
															whileHover={{ scale: 1.1 }}
															whileTap={{ scale: 0.95 }}
															initial={{ opacity: 0, y: 8, scale: 0.95 }}
															animate={{ opacity: 1, y: 0, scale: 1 }}
															transition={{ duration: 0.2, ease: "easeOut" }}
														>
															{value}
															{isSelected && (
																<motion.div
																	className="absolute inset-0 rounded-xl border-2 border-white/30"
																	layoutId="rating-selected"
																/>
															)}
														</motion.button>
													);
												}
											)}
										</div>
									</div>
								</div>
							)}

							{/* Multiple choice */}
							{currentQuestion.type === "multiple_choice" && currentQuestion.options && (
								<div className="space-y-3">
									{currentQuestion.options.map((option, index) => {
										const isSelected = currentAnswer === option;
										return (
											<motion.button
												key={option}
												type="button"
												initial={{ opacity: 0, y: 8 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
												className={cn(
													"w-full p-4 rounded-xl text-left font-medium transition-all duration-200 border",
													isSelected
														? "bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border-violet-500/50 text-foreground"
														: "bg-muted/30 border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
												)}
												onClick={() => handleAnswer(option)}
												whileHover={{ scale: 1.01 }}
												whileTap={{ scale: 0.99 }}
											>
												<div className="flex items-center gap-3">
													<div
														className={cn(
															"w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200",
															isSelected
																? "border-violet-500 bg-violet-500"
																: "border-muted-foreground/30"
														)}
													>
														{isSelected && (
															<motion.div
																initial={{ scale: 0 }}
																animate={{ scale: 1 }}
																className="w-2 h-2 rounded-full bg-white"
															/>
														)}
													</div>
													{option}
												</div>
											</motion.button>
										);
									})}
								</div>
							)}

							{/* Open text */}
							{currentQuestion.type === "open_text" && (
								<div className="space-y-3">
									<div className="relative group">
										<div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500/50 via-transparent to-cyan-500/50 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
										<textarea
											className="relative w-full min-h-[150px] p-4 rounded-xl border border-muted bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:bg-background/50 resize-none transition-all duration-300"
											placeholder="Share your thoughts here..."
											value={(currentAnswer as string) || ""}
											onChange={(e) => handleAnswer(e.target.value)}
										/>
									</div>
									<div className="flex justify-end">
										<span
											className={cn(
												"text-xs transition-colors",
												(currentAnswer as string)?.length > 0
													? "text-muted-foreground"
													: "text-muted-foreground/50"
											)}
										>
											{(currentAnswer as string)?.length || 0} characters
										</span>
									</div>
								</div>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</CardContent>

			{/* Navigation footer */}
			<div className="p-4 pt-4 space-y-4 border-t border-violet-100">
				<div className="flex justify-between gap-4">
					<Button
						variant="outline"
						onClick={handleBack}
						disabled={currentQuestionIndex === 0}
						className="flex-1 h-12 border-muted/50 hover:bg-muted/50 transition-all duration-200 disabled:opacity-30"
					>
						Back
					</Button>

					<motion.div
						className="flex-1"
						whileHover={currentAnswer !== undefined ? { scale: 1.02 } : {}}
						whileTap={currentAnswer !== undefined ? { scale: 0.98 } : {}}
					>
						<Button
							onClick={handleNext}
							disabled={currentAnswer === undefined}
							className="w-full h-12 relative overflow-hidden bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white border-0 font-medium shadow-lg hover:shadow-violet-500/30 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
						>
							<motion.div
								className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
								animate={{ x: ["-100%", "100%"] }}
								transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
							/>
							<span className="relative z-10 flex items-center justify-center">
								{currentQuestionIndex === questions.length - 1 ? "Complete" : "Next"}
								<Sparkles className="w-4 h-4 ml-2" />
							</span>
						</Button>
					</motion.div>
				</div>

				{/* Progress dots */}
				<div className="flex justify-center gap-1.5">
					{questions.map((q, index) => (
						<motion.div
							key={`progress-${q.question.slice(0, 20)}-${index}`}
							className={cn(
								"h-1.5 rounded-full transition-all duration-300",
								index === currentQuestionIndex
									? "w-6 bg-gradient-to-r from-violet-500 to-cyan-500"
									: index < currentQuestionIndex
										? "w-1.5 bg-violet-500/50"
										: "w-1.5 bg-muted"
							)}
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
						/>
					))}
				</div>
			</div>
		</Card>
	);
}
