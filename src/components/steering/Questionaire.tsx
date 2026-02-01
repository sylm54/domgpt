import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useGetPromptHistoryData } from "@/data/history";
import { useProfileStore } from "@/data/profile";
import { useModel } from "@/data/settings";
import { getInterviewPrompt } from "@/prompts/interview";
import { InterviewAgent } from "../../lib/agent";
import { tool, userMessage } from "../../lib/models";
import type { Question } from "../../types/user";
import { Button } from "../ui/button";
import { Label } from "../ui/label";

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

// Card wrapper component with glass effect and decorative corners
function CardWrapper({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative h-full">
			{/* Gradient accent border */}
			<div className="absolute -inset-[1px] bg-gradient-to-br from-violet-500/30 via-transparent to-cyan-500/30 rounded-2xl" />

			{/* Main card */}
			<div className="relative h-full bg-background/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/10 overflow-hidden">
				{/* Decorative corner elements */}
				<div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-violet-500/10 to-transparent" />
				<div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-cyan-500/10 to-transparent" />
				<div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-amber-500/10 to-transparent" />
				<div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-rose-500/10 to-transparent" />

				{/* Content */}
				<div className="relative h-full flex flex-col">{children}</div>
			</div>
		</div>
	);
}

// Floating element component for loading state
function FloatingElement({ delay, size, color }: { delay: number; size: number; color: string }) {
	return (
		<motion.div
			className={`absolute rounded-full ${color}`}
			style={{ width: size, height: size }}
			initial={{ opacity: 0, scale: 0 }}
			animate={{
				opacity: [0.3, 0.7, 0.3],
				scale: [0.8, 1.2, 0.8],
				y: [0, -20, 0],
			}}
			transition={{
				duration: 3,
				delay,
				repeat: Infinity,
				ease: "easeInOut",
			}}
		/>
	);
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
	const getPromptHistoryData = useGetPromptHistoryData();
	const [agent, setAgent] = useState<InterviewAgent | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string | number>>({});
	const [isGenerating, setIsGenerating] = useState(true);
	const [isComplete, setIsComplete] = useState(false);
	const { profile } = useProfileStore();
	const hasGeneratedRef = useRef(false);

	const generateQuestions = useCallback(
		async (interviewAgent: InterviewAgent) => {
			if (hasGeneratedRef.current) return;
			hasGeneratedRef.current = true;
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
			];
			const history = await getPromptHistoryData(5);
			// Set up agent with tools and context
			interviewAgent.setSystemPrompt(getInterviewPrompt(profile, referer, history));

			// Trigger question generation
			await interviewAgent.act(userMessage("Generate questions for the user."), tools);

			setIsGenerating(false);
		},
		[profile, getPromptHistoryData, referer]
	);

	useEffect(() => {
		const interviewAgent = new InterviewAgent(model);
		setAgent(interviewAgent);
		console.log("asd");
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
			<CardWrapper>
				<div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
					<motion.div
						className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full"
						animate={{ rotate: 360 }}
						transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
					/>
					<p className="text-muted-foreground">Loading profile...</p>
				</div>
			</CardWrapper>
		);
	}

	if (isGenerating) {
		return (
			<CardWrapper>
				<div className="flex flex-col items-center justify-center h-full space-y-8 p-8">
					{/* Floating elements container */}
					<div className="relative w-32 h-32 flex items-center justify-center">
						<FloatingElement delay={0} size={12} color="bg-violet-500/60" />
						<FloatingElement delay={0.5} size={16} color="bg-cyan-500/60" />
						<FloatingElement delay={1} size={10} color="bg-amber-500/60" />
						<FloatingElement delay={1.5} size={14} color="bg-rose-500/60" />

						{/* Central spinner */}
						<motion.div
							className="absolute inset-4 border-4 border-violet-500/30 border-t-violet-500 rounded-full"
							animate={{ rotate: 360 }}
							transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
						/>
						<motion.div
							className="absolute inset-8 border-4 border-cyan-500/30 border-b-cyan-500 rounded-full"
							animate={{ rotate: -360 }}
							transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
						/>

						{/* Pulsing center */}
						<motion.div
							className="w-6 h-6 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-full"
							animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
							transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
						/>
					</div>

					{/* Message */}
					<div className="text-center space-y-2">
						<motion.p
							className="text-lg font-medium text-foreground"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
						>
							{generatingMessage || "Generating questions..."}
						</motion.p>
						<motion.p
							className="text-sm text-muted-foreground"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.6 }}
						>
							Take a deep breath and prepare for reflection
						</motion.p>
					</div>
				</div>
			</CardWrapper>
		);
	}

	if (isComplete) {
		return (
			<CardWrapper>
				<div className="flex flex-col items-center justify-center h-full space-y-8 p-8">
					{/* Animated checkmark */}
					<motion.div
						className="relative w-24 h-24"
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ type: "spring", stiffness: 200, damping: 15 }}
					>
						{/* Outer glow ring */}
						<motion.div
							className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 rounded-full"
							initial={{ scale: 0.8, opacity: 0 }}
							animate={{ scale: 1.3, opacity: 0 }}
							transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
						/>

						{/* Background circle */}
						<div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full opacity-20" />

						{/* Inner circle with checkmark */}
						<motion.div
							className="absolute inset-2 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center"
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
						>
							<motion.svg
								className="w-10 h-10 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								initial={{ pathLength: 0, opacity: 0 }}
								animate={{ pathLength: 1, opacity: 1 }}
								transition={{ delay: 0.4, duration: 0.5 }}
							>
								<title>Checkmark</title>
								<motion.path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={3}
									d="M5 13l4 4L19 7"
									initial={{ pathLength: 0 }}
									animate={{ pathLength: 1 }}
									transition={{ delay: 0.5, duration: 0.4 }}
								/>
							</motion.svg>
						</motion.div>
					</motion.div>

					{/* Celebration particles */}
					<div className="absolute inset-0 pointer-events-none overflow-hidden">
						{[
							"particle-1",
							"particle-2",
							"particle-3",
							"particle-4",
							"particle-5",
							"particle-6",
							"particle-7",
							"particle-8",
						].map((id, i) => (
							<motion.div
								key={id}
								className="absolute w-2 h-2 rounded-full"
								style={{
									left: "50%",
									top: "40%",
									backgroundColor: ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#10b981"][i % 5],
								}}
								initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
								animate={{
									x: Math.cos((i * Math.PI * 2) / 8) * 80,
									y: Math.sin((i * Math.PI * 2) / 8) * 80,
									scale: [0, 1, 0],
									opacity: [0, 1, 0],
								}}
								transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
							/>
						))}
					</div>

					{/* Text content */}
					<motion.div
						className="text-center space-y-3"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.5 }}
					>
						<h3 className="text-2xl font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
							{completionTitle || "Complete"}
						</h3>
						<p className="text-muted-foreground max-w-sm">{completionMessage || "Thank you."}</p>
					</motion.div>

					{/* Summary card */}
					<motion.div
						className="bg-muted/50 rounded-xl p-4 space-y-2"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.7 }}
					>
						<p className="text-sm text-muted-foreground text-center">
							You answered <span className="font-semibold text-foreground">{questions.length}</span>{" "}
							questions
						</p>
					</motion.div>

					{/* Restart button */}
					{showRestart && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.9 }}
						>
							<Button
								onClick={handleRestart}
								className="relative overflow-hidden bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white border-0 shadow-lg hover:shadow-violet-500/25 transition-all duration-300"
							>
								<span className="relative z-10">{restartLabel || "Restart"}</span>
							</Button>
						</motion.div>
					)}
				</div>
			</CardWrapper>
		);
	}

	const currentQuestion = questions[currentQuestionIndex];
	const currentKey = currentQuestion?.question;
	const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
	const currentAnswer = answers[currentKey];

	return (
		<CardWrapper>
			{/* Header */}
			<div className="p-6 pb-4 space-y-4">
				<div className="flex justify-between items-center">
					<h2 className="text-xl font-semibold bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
						{title || "Questionnaire"}
					</h2>
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Question</span>
						<span className="px-2 py-1 bg-violet-500/10 text-violet-500 text-sm font-medium rounded-md">
							{currentQuestionIndex + 1} / {questions.length}
						</span>
					</div>
				</div>

				{/* Progress bar */}
				<div className="relative h-2 bg-muted rounded-full overflow-hidden">
					<motion.div
						className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full"
						initial={{ width: 0 }}
						animate={{ width: `${progress}%` }}
						transition={{ duration: 0.3, ease: "easeOut" }}
					/>
					{/* Shimmer effect */}
					<motion.div
						className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
						animate={{ x: ["-100%", "100%"] }}
						transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
					/>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 px-6 overflow-y-auto">
				<AnimatePresence mode="wait">
					{currentQuestion && (
						<motion.div
							key={currentQuestionIndex}
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.3 }}
							className="space-y-6"
						>
							{/* Question number badge and text */}
							<div className="space-y-4">
								<motion.div
									className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-xl text-white font-bold shadow-lg"
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
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
											initial={{ opacity: 0, y: -10 }}
											animate={{ opacity: 1, y: 0 }}
											className="text-center"
										>
											<span
												className={`text-4xl font-bold bg-gradient-to-r ${getRatingColor(currentAnswer as number, currentQuestion.scale)} bg-clip-text text-transparent`}
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
															className={`
															relative w-10 h-10 rounded-xl font-semibold text-sm
															transition-all duration-200
															${
																isSelected
																	? "bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/30"
																	: "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
															}
														`}
															onClick={() => handleAnswer(value)}
															whileHover={{ scale: 1.1 }}
															whileTap={{ scale: 0.95 }}
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
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ delay: index * 0.05 }}
												className={`
													w-full p-4 rounded-xl text-left font-medium
													transition-all duration-200 border
													${
														isSelected
															? "bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border-violet-500/50 text-foreground"
															: "bg-muted/30 border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
													}
												`}
												onClick={() => handleAnswer(option)}
												whileHover={{ scale: 1.01 }}
												whileTap={{ scale: 0.99 }}
											>
												<div className="flex items-center gap-3">
													<div
														className={`
														w-5 h-5 rounded-full border-2 flex items-center justify-center
														transition-colors duration-200
														${isSelected ? "border-violet-500 bg-violet-500" : "border-muted-foreground/30"}
													`}
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
										{/* Gradient border effect */}
										<div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500/50 via-transparent to-cyan-500/50 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />

										<textarea
											className="relative w-full min-h-[150px] p-4 rounded-xl border border-muted bg-muted/30
												text-foreground placeholder:text-muted-foreground/50
												focus:outline-none focus:bg-background/50
												resize-none transition-all duration-300"
											placeholder="Share your thoughts here..."
											value={(currentAnswer as string) || ""}
											onChange={(e) => handleAnswer(e.target.value)}
										/>
									</div>

									{/* Character indicator */}
									<div className="flex justify-end">
										<span
											className={`text-xs transition-colors ${
												(currentAnswer as string)?.length > 0
													? "text-muted-foreground"
													: "text-muted-foreground/50"
											}`}
										>
											{(currentAnswer as string)?.length || 0} characters
										</span>
									</div>
								</div>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Navigation footer */}
			<div className="p-6 pt-4 space-y-4 border-t border-muted/50">
				<div className="flex justify-between gap-4">
					<Button
						variant="outline"
						onClick={handleBack}
						disabled={currentQuestionIndex === 0}
						className="flex-1 h-12 border-muted/50 hover:bg-muted/50 transition-all duration-200 disabled:opacity-30"
					>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 19l-7-7 7-7"
							/>
						</svg>
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
							className={`
								w-full h-12 relative overflow-hidden
								bg-gradient-to-r from-violet-500 to-cyan-500
								hover:from-violet-600 hover:to-cyan-600
								text-white border-0 font-medium
								shadow-lg hover:shadow-violet-500/30
								transition-all duration-300
								disabled:opacity-30 disabled:cursor-not-allowed
								disabled:hover:shadow-none
							`}
						>
							{/* Shimmer effect */}
							<motion.div
								className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
								animate={{ x: ["-100%", "100%"] }}
								transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
							/>
							<span className="relative z-10 flex items-center justify-center">
								{currentQuestionIndex === questions.length - 1 ? "Complete" : "Next"}
								<svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</span>
						</Button>
					</motion.div>
				</div>

				{/* Progress dots */}
				<div className="flex justify-center gap-1.5">
					{questions.map((q, index) => (
						<motion.div
							key={`progress-${q.question.slice(0, 20)}-${index}`}
							className={`h-1.5 rounded-full transition-all duration-300 ${
								index === currentQuestionIndex
									? "w-6 bg-gradient-to-r from-violet-500 to-cyan-500"
									: index < currentQuestionIndex
										? "w-1.5 bg-violet-500/50"
										: "w-1.5 bg-muted"
							}`}
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ delay: index * 0.05 }}
						/>
					))}
				</div>
			</div>
		</CardWrapper>
	);
}
