import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { InterviewAgent } from "../../lib/agent";
import type { Model } from "../../lib/models";
import { tool, userMessage } from "../../lib/models";
import type { HypnoFile, Question, Reflection } from "../../types/user";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useLogHistoryData } from "@/data/history";

interface SessionPlayerProps {
	session: HypnoFile;
	model: Model;
	onComplete?: () => void;
}

export function SessionPlayer({ session, model, onComplete }: SessionPlayerProps) {
	// Audio playback state
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const logHistoryData = useLogHistoryData();
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(session.duration_seconds || 0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isMuted, setIsMuted] = useState(false);
	const [volume, setVolume] = useState(1);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [dir, setDir] = useState<string | null>(null);

	// Debrief state
	const [showDebrief, setShowDebrief] = useState(false);
	const [debriefQuestions, setDebriefQuestions] = useState<Question[]>([]);
	const [debriefAnswers, setDebriefAnswers] = useState<Record<string, string | number>>({});
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [isGeneratingDebrief, setIsGeneratingDebrief] = useState(false);

	// Load app data directory
	useEffect(() => {
		appDataDir().then(setDir);
	}, []);

	// Initialize audio element
	useEffect(() => {
		if (session.hypno_file && dir) {
			console.log(`${dir}/${session.hypno_file}`);
			const audio = new Audio(convertFileSrc(`${dir}/${session.hypno_file}`));
			audio.preload = "metadata";
			audio.volume = volume;

			const handleLoadedMetadata = () => {
				setDuration(audio.duration);
				setIsLoading(false);
			};

			const handleTimeUpdate = () => {
				setCurrentTime(audio.currentTime);
			};

			const handleEnded = () => {
				setIsPlaying(false);
				setCurrentTime(0);
				setShowDebrief(true);
				generateDebrief();
			};

			const handleError = (e: Event) => {
				const target = e.target as HTMLAudioElement;
				setError(`Audio error: ${target.error?.message || "Failed to load audio"}`);
				setIsLoading(false);
				setIsPlaying(false);
			};

			audio.addEventListener("loadedmetadata", handleLoadedMetadata);
			audio.addEventListener("timeupdate", handleTimeUpdate);
			audio.addEventListener("ended", handleEnded);
			audio.addEventListener("error", handleError);

			audioRef.current = audio;

			return () => {
				audio.pause();
				audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
				audio.removeEventListener("timeupdate", handleTimeUpdate);
				audio.removeEventListener("ended", handleEnded);
				audio.removeEventListener("error", handleError);
			};
		} else {
			setIsLoading(true);
		}
	}, [session.hypno_file, dir]);

	// Handle play/pause
	const togglePlay = async () => {
		if (!audioRef.current) return;

		try {
			if (isPlaying) {
				audioRef.current.pause();
				setIsPlaying(false);
			} else {
				await audioRef.current.play();
				setIsPlaying(true);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to play audio");
		}
	};

	// Handle seeking
	const handleSeek = (value: number[]) => {
		if (!audioRef.current) return;
		const seekTime = (value[0] / 100) * duration;
		audioRef.current.currentTime = seekTime;
		setCurrentTime(seekTime);
	};

	// Handle volume change
	const handleVolumeChange = (value: number[]) => {
		if (!audioRef.current) return;
		const newVolume = value[0] / 100;
		audioRef.current.volume = newVolume;
		setVolume(newVolume);
		setIsMuted(newVolume === 0);
	};

	// Toggle mute
	const toggleMute = () => {
		if (!audioRef.current) return;
		audioRef.current.muted = !isMuted;
		setIsMuted(!isMuted);
	};

	// Skip forward/backward
	const skip = (seconds: number) => {
		if (!audioRef.current) return;
		audioRef.current.currentTime = Math.max(
			0,
			Math.min(duration, audioRef.current.currentTime + seconds)
		);
	};

	// Change playback speed
	const changePlaybackRate = () => {
		if (!audioRef.current) return;
		const newRate =
			playbackRate === 1 ? 1.25 : playbackRate === 1.25 ? 1.5 : playbackRate === 1.5 ? 0.75 : 1;
		audioRef.current.playbackRate = newRate;
		setPlaybackRate(newRate);
	};

	// Restart playback
	const restart = () => {
		if (!audioRef.current) return;
		audioRef.current.currentTime = 0;
		if (!isPlaying) {
			togglePlay();
		}
	};

	// Format time for display
	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// Calculate progress percentage
	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

	// Generate debrief questions
	const generateDebrief = async () => {
		setIsGeneratingDebrief(true);
		const interviewAgent = new InterviewAgent(model);

		const tools = [
			tool({
				name: "AskRate",
				description: "Create a rating question (1-10 scale)",
				schema: {
					question: z.string(),
					scale: z.number(),
					key: z.string(),
				},
				call: async ({ question, scale }) => {
					setDebriefQuestions((prev) => [
						...prev,
						{
							question,
							type: "rating",
							scale,
						},
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
				call: async ({ question, options }) => {
					setDebriefQuestions((prev) => [
						...prev,
						{
							question,
							type: "multiple_choice",
							options,
						},
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
				call: async ({ question }) => {
					setDebriefQuestions((prev) => [
						...prev,
						{
							question,
							type: "open_text",
						},
					]);
					return "Open text question added";
				},
			}),
		];

		interviewAgent.setSystemPrompt(`You are an Interview Agent for a conditioning training app.

Generate 4-8 dynamic questions for post-session debriefing.

Focus on:
- Depth of trance (1-10)
- Clarity of visualization
- Emotional response
- Trigger effectiveness
- Overall session quality

Use the tools to create a mix of rating, multiple choice, and open text questions.`);

		await interviewAgent.act(
			userMessage("Generate debrief questions for the hypno session that just completed."),
			tools
		);

		setIsGeneratingDebrief(false);
	};

	// Handle debrief answer
	const handleDebriefAnswer = (answer: string | number) => {
		const currentQuestion = debriefQuestions[currentQuestionIndex];
		const key = currentQuestion.question;
		setDebriefAnswers((prev) => ({ ...prev, [key]: answer }));
	};

	// Move to next debrief question
	const handleDebriefNext = async () => {
		if (currentQuestionIndex < debriefQuestions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1);
		} else {
			// Complete debrief
			const reflectionQuestions = debriefQuestions.map((q) => {
				const answer = debriefAnswers[q.question];
				if (q.type === "multiple_choice") {
					return { ...q, answer: answer as string };
				}
				if (q.type === "rating") {
					return { ...q, answer: answer as number };
				}
				return { ...q, answer: answer as string };
			});

			const reflection: Reflection = {
				questions: reflectionQuestions,
				created_at: new Date().toISOString(),
			};
			await logHistoryData({
				type: "session",
				debrief: reflection,
				data: session.id,
				session_type: "hypno",
				time: new Date(),
			});
			onComplete?.();
		}
	};

	const currentQuestion = debriefQuestions[currentQuestionIndex];
	const currentKey = currentQuestion?.question;

	// Debrief view
	if (showDebrief) {
		if (isGeneratingDebrief) {
			return (
				<Card className="h-full">
					<CardContent className="flex flex-col items-center justify-center h-full space-y-4">
						<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
						<p className="text-muted-foreground">Generating debrief questions...</p>
					</CardContent>
				</Card>
			);
		}

		return (
			<Card className="h-full">
				<CardHeader>
					<CardTitle>Session Debrief</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					{currentQuestion && (
						<>
							<div className="text-sm text-muted-foreground mb-2">
								Question {currentQuestionIndex + 1} of {debriefQuestions.length}
							</div>
							<div className="text-lg font-medium">{currentQuestion.question}</div>

							{currentQuestion.type === "rating" && (
								<div className="space-y-4">
									<div className="flex justify-between text-sm text-muted-foreground">
										<span>1</span>
										<span>{currentQuestion.scale}</span>
									</div>
									<div className="grid grid-cols-10 gap-1">
										{Array.from({ length: currentQuestion.scale }, (_, i) => i + 1).map((value) => (
											<Button
												key={value}
												variant={debriefAnswers[currentKey] === value ? "default" : "outline"}
												size="sm"
												className="aspect-square"
												onClick={() => handleDebriefAnswer(value)}
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
											variant={debriefAnswers[currentKey] === option ? "default" : "outline"}
											className="w-full justify-start"
											onClick={() => handleDebriefAnswer(option)}
										>
											{option}
										</Button>
									))}
								</div>
							)}

							{currentQuestion.type === "open_text" && (
								<textarea
									className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm resize-none"
									placeholder="Type your answer here..."
									value={(debriefAnswers[currentKey] as string) || ""}
									onChange={(e) => handleDebriefAnswer(e.target.value)}
								/>
							)}

							<Button
								onClick={handleDebriefNext}
								disabled={debriefAnswers[currentKey] === undefined}
								className="w-full"
							>
								{currentQuestionIndex === debriefQuestions.length - 1 ? "Complete" : "Next"}
							</Button>
						</>
					)}
				</CardContent>
			</Card>
		);
	}

	// Loading state
	if (isLoading) {
		return (
			<Card className="h-full">
				<CardContent className="flex flex-col items-center justify-center h-full space-y-4">
					<div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
					<p className="text-muted-foreground">Loading session...</p>
				</CardContent>
			</Card>
		);
	}

	// Error state
	if (error) {
		return (
			<Card className="h-full">
				<CardContent className="flex flex-col items-center justify-center h-full space-y-4">
					<div className="text-red-500 text-center">
						<p className="font-medium">Playback Error</p>
						<p className="text-sm text-muted-foreground mt-2">{error}</p>
					</div>
					<Button onClick={() => window.location.reload()} variant="outline">
						Try Again
					</Button>
				</CardContent>
			</Card>
		);
	}

	// Main player view
	return (
		<Card className="h-full flex flex-col">
			<CardHeader>
				<CardTitle>Hypno Session Player</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 flex flex-col justify-end space-y-6">
				{/* Session Info */}
				<div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center">
					<div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
						{isPlaying ? (
							<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
								<div className="w-8 h-8 rounded-full bg-primary animate-pulse" />
							</div>
						) : (
							<Play className="w-16 h-16 text-primary/50" />
						)}
					</div>
					<div className="space-y-2">
						<p className="text-2xl font-semibold">
							{isPlaying ? "Listening..." : "Ready to Start"}
						</p>
						<p className="text-muted-foreground">
							Find a comfortable position, close your eyes, and relax
						</p>
					</div>
				</div>

				{/* Progress Bar */}
				<div className="space-y-2">
					<div className="flex justify-between text-sm text-muted-foreground">
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>
					<input
						type="range"
						min={0}
						max={100}
						step={0.1}
						value={progress}
						onChange={(e) => handleSeek([parseFloat(e.target.value)])}
						className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
					/>
				</div>

				{/* Main Controls */}
				<div className="flex items-center justify-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => skip(-10)}
						className="h-12 w-12"
						title="Skip back 10s"
					>
						<SkipBack className="h-5 w-5" />
					</Button>

					<Button
						variant="ghost"
						size="icon"
						onClick={restart}
						className="h-10 w-10"
						title="Restart"
					>
						<RotateCcw className="h-4 w-4" />
					</Button>

					<Button
						size="icon"
						onClick={togglePlay}
						className="h-16 w-16 rounded-full"
						title={isPlaying ? "Pause" : "Play"}
					>
						{isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
					</Button>

					<Button
						variant="ghost"
						size="icon"
						onClick={() => skip(10)}
						className="h-12 w-12"
						title="Skip forward 10s"
					>
						<SkipForward className="h-5 w-5" />
					</Button>

					<Button
						variant="ghost"
						size="icon"
						onClick={changePlaybackRate}
						className="h-10 w-10"
						title={`Speed: ${playbackRate}x`}
					>
						<span className="text-xs font-medium">{playbackRate}x</span>
					</Button>
				</div>

				{/* Volume Control */}
				<div className="flex items-center gap-2 justify-center">
					<Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8">
						{isMuted || volume === 0 ? (
							<VolumeX className="h-4 w-4" />
						) : (
							<Volume2 className="h-4 w-4" />
						)}
					</Button>
					<input
						type="range"
						min={0}
						max={100}
						step={1}
						value={volume * 100}
						onChange={(e) => handleVolumeChange([parseFloat(e.target.value)])}
						className="w-32 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
					/>
				</div>
			</CardContent>
		</Card>
	);
}
