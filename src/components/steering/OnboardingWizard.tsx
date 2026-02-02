import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import {
	Brain,
	Check,
	Cpu,
	Heart,
	Key,
	Loader2,
	MessageCircle,
	Pause,
	Play,
	Shield,
	Sparkles,
	Target,
	Volume2,
	VolumeX,
	Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HypnoStyleSettings } from "@/components/settings/HypnoStyleSettings";
import { useProfileStore } from "@/data/profile";
import { getLLMModel, useSettingsStore } from "@/data/settings";
import type { Model } from "@/lib/models";
import { setOnboardingCompleted } from "@/pages/Dashboard";
import type { CoachTrait } from "@/types/user";
import { type AudioScript, generateAudio, type TtsProgressEvent } from "../../lib/tts-rust";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CoachChat } from "./CoachChat";

const steps = [
	{
		id: "audio-test",
		title: "Audio Test",
		description: "Test audio generation and playback",
	},
	{
		id: "api-keys",
		title: "API Configuration",
		description: "Configure your API keys for cloud mode",
	},
	{
		id: "coach-traits",
		title: "Coach Personality",
		description: "Choose how your Coach should interact with you",
	},
	{
		id: "hypno-style",
		title: "Hypno Style",
		description: "Configure your hypnosis session preferences",
	},
	{
		id: "discovery",
		title: "Discovery",
		description: "Chat with your Coach to understand your goals",
	},
	{ id: "complete", title: "Complete", description: "You're ready to begin" },
];

export function OnboardingWizard() {
	const [currentStep, setCurrentStep] = useState(0);
	const [audioTestCompleted, setAudioTestCompleted] = useState(false);
	const { settings } = useSettingsStore();

	const navigate = useNavigate();

	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handleBack = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
			if (currentStep === 1) {
				setAudioTestCompleted(false);
			}
		}
	};

	const handleComplete = () => {
		setOnboardingCompleted(true);
		navigate("/");
	};

	const renderStepContent = () => {
		switch (steps[currentStep].id) {
			case "audio-test":
				return <AudioTestStep onComplete={() => setAudioTestCompleted(true)} />;
			case "api-keys":
				return <APIKeysStep />;
			case "coach-traits":
				return <CoachTraitsStep />;
			case "hypno-style":
				return <HypnoStyleSettings isOnboarding={true} />;
			case "discovery": {
				const model = getLLMModel(settings.llm_engine, settings.main_model || "x-ai/grok-4.1-fast");
				return <DiscoveryStep model={model} onComplete={handleNext} />;
			}
			case "complete":
				return <CompleteStep onComplete={handleComplete} />;
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col h-full max-w-4xl mx-auto p-4">
			{/* Progress Indicator - Timeline Design */}
			<div className="mb-10 px-4">
				<div className="relative flex justify-between items-start">
					{/* Connecting Line Background */}
					<div
						className="absolute top-4 left-0 right-0 h-0.5 bg-muted/50"
						style={{ left: "2rem", right: "2rem" }}
					/>

					{/* Animated Progress Line */}
					<div
						className="absolute top-4 h-0.5 bg-primary transition-all duration-500 ease-out"
						style={{
							left: "2rem",
							width: `calc(${(currentStep / (steps.length - 1)) * 100}% - 2rem)`,
						}}
					/>

					{steps.map((step, index) => {
						const isCompleted = index < currentStep;
						const isActive = index === currentStep;
						const isPending = index > currentStep;

						return (
							<div
								key={step.id}
								className="relative flex flex-col items-center z-10"
								style={{ width: `${100 / steps.length}%` }}
							>
								{/* Step Circle */}
								<div
									className={`
										relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
										transition-all duration-300 ease-out
										${isActive ? "scale-110" : "scale-100"}
										${
											isCompleted
												? "bg-primary text-primary-foreground"
												: isActive
													? "bg-primary text-primary-foreground"
													: "bg-muted/80 text-muted-foreground border-2 border-muted-foreground/20"
										}
									`}
								>
									{isCompleted ? <Check className="w-4 h-4" /> : <span>{index + 1}</span>}
								</div>

								{/* Step Label */}
								<div
									className={`
										mt-3 text-center transition-all duration-300
										${isActive ? "opacity-100 translate-y-0" : "opacity-60 translate-y-0.5"}
									`}
								>
									<span
										className={`
											text-xs font-medium block
											${isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"}
										`}
									>
										{step.title}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Step Content */}
			<Card className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-background border-border">
				<CardHeader className="relative pb-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
							<span className="text-primary font-bold">{currentStep + 1}</span>
						</div>
						<div>
							<CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
							<CardDescription className="text-sm mt-0.5">
								{steps[currentStep].description}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
					{renderStepContent()}
				</CardContent>
			</Card>

			{/* Navigation - Polished Buttons */}
			{currentStep < 4 && (
				<div className="flex justify-between mt-6 gap-4">
					<Button
						variant="outline"
						onClick={handleBack}
						disabled={currentStep === 0}
						className="min-w-[120px] border-border/50 hover:bg-muted/50 hover:border-border transition-all duration-200 disabled:opacity-30"
					>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<title>Back arrow</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 19l-7-7 7-7"
							/>
						</svg>
						Back
					</Button>
					<Button
						onClick={handleNext}
						disabled={currentStep === 0 && !audioTestCompleted}
						className={`
							min-w-[160px] transition-all duration-200
							${
								currentStep === 0 && !audioTestCompleted
									? "opacity-50"
									: "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/30"
							}
						`}
					>
						{currentStep === 0 ? (audioTestCompleted ? "Continue" : "Generate Test First") : "Next"}
						<svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<title>Next arrow</title>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					</Button>
				</div>
			)}
		</div>
	);
}

// Step Components

function AudioTestStep({ onComplete }: { onComplete: () => void }) {
	const [isGenerating, setIsGenerating] = useState(false);
	const [progress, setProgress] = useState(0);
	const [stage, setStage] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const [generatedScript, setGeneratedScript] = useState<AudioScript | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [dir, setDir] = useState<string | null>(null);

	useEffect(() => {
		appDataDir().then(setDir);
	}, []);

	useEffect(() => {
		if (generatedScript && dir) {
			const filePath = `${dir}/${generatedScript.filename}`;
			const url = convertFileSrc(filePath);

			const audio = new Audio(url);
			audio.preload = "metadata";
			audio.volume = volume;

			const handleLoadedMetadata = () => {
				setDuration(audio.duration);
			};

			const handleTimeUpdate = () => {
				setCurrentTime(audio.currentTime);
			};

			const handleEnded = () => {
				setIsPlaying(false);
				setCurrentTime(0);
			};

			audio.addEventListener("loadedmetadata", handleLoadedMetadata);
			audio.addEventListener("timeupdate", handleTimeUpdate);
			audio.addEventListener("ended", handleEnded);

			audioRef.current = audio;

			return () => {
				audio.pause();
				audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
				audio.removeEventListener("timeupdate", handleTimeUpdate);
				audio.removeEventListener("ended", handleEnded);
			};
		}
	}, [generatedScript, dir, volume]);

	const handleGenerateAudio = async () => {
		setIsGenerating(true);
		setProgress(0);
		setStage("");
		setError(null);
		setGeneratedScript(null);

		try {
			const testScript: AudioScript = {
				title: "Test Audio",
				script:
					"Hello! This is a test of the audio generation system. You should hear this message clearly.",
				filename: "test_audio.wav",
			};

			const result = await generateAudio(testScript, (event: TtsProgressEvent) => {
				setProgress(event.progress * 100);
				setStage(event.stage);
			});

			setGeneratedScript(result);
			onComplete();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate audio");
		} finally {
			setIsGenerating(false);
		}
	};

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

	const handleSeek = (value: number[]) => {
		if (!audioRef.current) return;
		const seekTime = (value[0] / 100) * duration;
		audioRef.current.currentTime = seekTime;
		setCurrentTime(seekTime);
	};

	const handleVolumeChange = (value: number[]) => {
		if (!audioRef.current) return;
		const newVolume = value[0] / 100;
		audioRef.current.volume = newVolume;
		setVolume(newVolume);
		setIsMuted(newVolume === 0);
	};

	const toggleMute = () => {
		if (!audioRef.current) return;
		audioRef.current.muted = !isMuted;
		setIsMuted(!isMuted);
	};

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground leading-relaxed">
					Before continuing, let's test the audio generation and playback system. Click the button
					below to generate a test audio clip and ensure everything is working properly.
				</p>
			</div>

			{!generatedScript && (
				<div className="flex justify-center py-4">
					<Button
						onClick={handleGenerateAudio}
						disabled={isGenerating}
						size="lg"
						className={`
							w-full max-w-md h-14 text-base font-medium
							${!isGenerating && "bg-primary hover:bg-primary/90"}
							transition-all duration-300
						`}
					>
						{isGenerating ? (
							<>
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								Generating...
							</>
						) : (
							<>
								<Sparkles className="mr-2 h-5 w-5" />
								Generate Test Audio
							</>
						)}
					</Button>
				</div>
			)}

			{isGenerating && (
				<div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground capitalize font-medium">{stage}</span>
						<span className="text-primary font-semibold">{Math.round(progress)}%</span>
					</div>
					<div className="w-full bg-secondary/50 h-3 rounded-full overflow-hidden">
						<div
							className="h-full rounded-full bg-primary transition-all duration-300 relative"
							style={{ width: `${progress}%` }}
						/>
					</div>
					{stage === "download" && (
						<p className="text-xs text-muted-foreground text-center">
							Downloading voice model (this may take a moment on first use)...
						</p>
					)}
				</div>
			)}

			{error && (
				<div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20">
					<p className="text-sm font-medium">Error</p>
					<p className="text-xs mt-1 opacity-90">{error}</p>
				</div>
			)}

			{generatedScript && (
				<div className="space-y-5">
					<div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
								<Check className="w-5 h-5 text-emerald-500" />
							</div>
							<div>
								<p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
									Audio Generated Successfully!
								</p>
								<p className="text-xs text-muted-foreground">Now test the playback below.</p>
							</div>
						</div>
					</div>

					{/* Audio Player Card */}
					<div className="bg-muted/30 p-6 rounded-2xl border border-border/50 space-y-5">
						{/* Waveform Visualization Placeholder */}
						<div className="h-16 bg-primary/5 rounded-xl flex items-center justify-center overflow-hidden relative">
							<div className="flex items-end gap-1 h-12">
								{[...Array(40)].map((_, i) => {
									const barId = `wave-bar-${i}-static`;
									return (
										<div
											key={barId}
											className={`w-1 rounded-full bg-primary/60 transition-all duration-150 ${isPlaying ? "animate-pulse" : ""}`}
											style={{
												height: `${20 + Math.sin(i * 0.5) * 15 + (isPlaying ? Math.random() * 20 : 0)}px`,
												animationDelay: `${i * 50}ms`,
											}}
										/>
									);
								})}
							</div>
							{!isPlaying && (
								<div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px]">
									<span className="text-xs text-muted-foreground font-medium">Waveform</span>
								</div>
							)}
						</div>

						{/* Controls */}
						<div className="flex items-center justify-center gap-6">
							<Button
								variant="ghost"
								size="icon"
								onClick={toggleMute}
								className="h-10 w-10 rounded-full hover:bg-muted"
							>
								{isMuted || volume === 0 ? (
									<VolumeX className="h-5 w-5 text-muted-foreground" />
								) : (
									<Volume2 className="h-5 w-5 text-muted-foreground" />
								)}
							</Button>

							{/* Play Button */}
							<div className="relative">
								<Button
									onClick={onComplete}
									size="lg"
									className="
					w-full max-w-md h-14 text-base font-semibold
					bg-primary
					hover:bg-primary/90
					transition-all duration-300
				"
								>
									{isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
								</Button>
							</div>

							<div className="w-10 flex justify-center">
								<input
									type="range"
									min={0}
									max={100}
									step={1}
									value={volume * 100}
									onChange={(e) => handleVolumeChange([parseFloat(e.target.value)])}
									className="w-20 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
								/>
							</div>
						</div>

						{/* Progress Bar */}
						<div className="space-y-2">
							<div className="relative h-2 bg-muted rounded-full overflow-hidden">
								<div
									className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-100"
									style={{ width: `${progressPercent}%` }}
								>
									<div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/50" />
								</div>
								<input
									type="range"
									min={0}
									max={100}
									step={0.1}
									value={progressPercent}
									onChange={(e) => handleSeek([parseFloat(e.target.value)])}
									className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
								/>
							</div>
							<div className="flex justify-between text-xs text-muted-foreground font-medium">
								<span>{formatTime(currentTime)}</span>
								<span>{formatTime(duration)}</span>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function APIKeysStep() {
	const { settings, updateSettings } = useSettingsStore();

	return (
		<div className="space-y-6">
			{/* API Key Section */}
			<div className="space-y-4 p-5 rounded-xl bg-muted/30 border border-border/50">
				<div className="flex items-center gap-3 pb-2 border-b border-border/50">
					<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
						<Key className="w-4 h-4 text-primary" />
					</div>
					<h3 className="font-medium">API Key</h3>
				</div>

				<div className="space-y-2">
					<Label htmlFor="openrouter-key" className="text-sm flex items-center gap-2">
						<span className="text-muted-foreground">OpenRouter API Key</span>
					</Label>
					<Input
						id="openrouter-key"
						type="password"
						placeholder="sk-or-..."
						value={settings.llm_engine?.api_key || ""}
						onChange={(e) =>
							updateSettings({
								llm_engine: {
									type: "openrouter",
									api_key: e.target.value,
								},
							})
						}
						className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
					/>
					<p className="text-xs text-muted-foreground mt-2">
						Required for cloud processing mode. Get your key from{" "}
						<a
							href="https://openrouter.ai"
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline"
						>
							openrouter.ai
						</a>
					</p>
				</div>
			</div>

			{/* Model Selection Section */}
			<div className="space-y-4 p-5 rounded-xl bg-muted/30 border border-border/50">
				<div className="flex items-center gap-3 pb-2 border-b border-border/50">
					<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
						<Cpu className="w-4 h-4 text-primary" />
					</div>
					<h3 className="font-medium">Model Selection</h3>
				</div>

				<div className="space-y-2">
					<Label htmlFor="model" className="text-sm text-muted-foreground">
						Language Model
					</Label>
					<Select
						value={settings.main_model || "x-ai/grok-4.1-fast"}
						onValueChange={(value) => updateSettings({ main_model: value })}
					>
						<SelectTrigger
							id="model"
							className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
						>
							<SelectValue placeholder="Select model" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="x-ai/grok-4.1-fast">Grok 4.1 Fast (Speedy)</SelectItem>
							<SelectItem value="deepseek/deepseek-v3.2-exp">DeepSeek v3.2 Experimental</SelectItem>
							<SelectItem value="meituan/longcat-flash-chat">
								LongCat Flash Chat (Meituan)
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}

function CoachTraitsStep() {
	const { settings, updateSettings } = useSettingsStore();

	const traitDefinitions: {
		value: CoachTrait;
		label: string;
		description: string;
		icon: React.ReactNode;
	}[] = [
		{
			value: "soft",
			label: "Soft",
			description: "Gentle and non-confrontational",
			icon: <Heart className="w-4 h-4" />,
		},
		{
			value: "motivational",
			label: "Motivational",
			description: "Inspires and uplifts the user",
			icon: <Sparkles className="w-4 h-4" />,
		},
		{
			value: "encouraging",
			label: "Encouraging",
			description: "More friendly and supportive",
			icon: <MessageCircle className="w-4 h-4" />,
		},
		{
			value: "empathetic",
			label: "Empathetic",
			description: "Shows understanding of user's feelings",
			icon: <Heart className="w-4 h-4" />,
		},
		{
			value: "direct",
			label: "Direct",
			description: "Straightforward and to the point",
			icon: <Target className="w-4 h-4" />,
		},
		{
			value: "informative",
			label: "Informative",
			description: "Provides detailed explanations",
			icon: <Brain className="w-4 h-4" />,
		},
		{
			value: "intense",
			label: "Intense",
			description: "More forceful and goes farther",
			icon: <Zap className="w-4 h-4" />,
		},
		{
			value: "pushing",
			label: "Pushing",
			description: "Expands on your goals and takes them further",
			icon: <Target className="w-4 h-4" />,
		},
		{
			value: "assertive",
			label: "Assertive",
			description: "Takes initiative and guides your journey",
			icon: <Shield className="w-4 h-4" />,
		},
	];

	const selectedTraits = settings.coach_traits || [];

	const handleTraitToggle = (trait: CoachTrait) => {
		const newTraits = selectedTraits.includes(trait)
			? selectedTraits.filter((t) => t !== trait)
			: [...selectedTraits, trait];
		updateSettings({ coach_traits: newTraits });
	};

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground leading-relaxed">
					Select the personality traits that best match how you'd like your Coach to interact with
					you. You can choose multiple traits.
				</p>
			</div>

			{selectedTraits.length > 0 && (
				<div className="flex flex-wrap gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
					{selectedTraits.map((trait) => (
						<Badge
							key={trait}
							variant="default"
							className="text-sm bg-primary/20 text-primary hover:bg-primary/30 border-0"
						>
							{traitDefinitions.find((t) => t.value === trait)?.label}
						</Badge>
					))}
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
				{traitDefinitions.map(({ value, label, description, icon }) => {
					const isSelected = selectedTraits.includes(value);

					return (
						<button
							key={value}
							type="button"
							onClick={() => handleTraitToggle(value)}
							className={`
								relative group text-left p-4 rounded-xl border-2 transition-all duration-200
								hover:-translate-y-0.5 hover:shadow-lg
								${
									isSelected
										? "bg-primary/10 border-primary"
										: "bg-background/50 border-border/50 hover:border-border hover:bg-muted/30"
								}
							`}
						>
							<div className="flex items-start gap-3">
								{/* Custom Checkbox */}
								<div
									className={`
										mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
										transition-all duration-200
										${
											isSelected
												? "bg-primary border-primary"
												: "border-muted-foreground/30 group-hover:border-muted-foreground/50"
										}
									`}
								>
									{isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<span
											className={`
												transition-colors duration-200
												${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}
											`}
										>
											{icon}
										</span>
										<span
											className={`
												font-medium transition-colors duration-200
												${isSelected ? "text-primary" : "text-foreground"}
											`}
										>
											{label}
										</span>
									</div>
									<p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
								</div>
							</div>
						</button>
					);
				})}
			</div>

			{selectedTraits.length === 0 && (
				<p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-xl">
					Select at least one trait to continue
				</p>
			)}
		</div>
	);
}

function DiscoveryStep({ model, onComplete }: { model: Model; onComplete: () => void }) {
	return (
		<div className="h-full flex flex-col">
			<CoachChat model={model} isOnboarding={true} onOnboardingComplete={onComplete} />
		</div>
	);
}

function CompleteStep({ onComplete }: { onComplete: () => void }) {
	return (
		<div className="text-center space-y-8 py-8">
			{/* Animated Checkmark */}
			<div className="relative">
				{/* Main checkmark circle */}
				<div className="relative w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-primary/40">
					<svg
						className="w-10 h-10 text-primary-foreground animate-[bounce_1s_ease-in-out]"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<title>Success checkmark</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={3}
							d="M5 13l4 4L19 7"
							className="animate-[draw_0.5s_ease-out_forwards]"
							style={{
								strokeDasharray: 50,
								strokeDashoffset: 0,
							}}
						/>
					</svg>
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="text-2xl font-bold text-primary">You're all set!</h3>
				<p className="text-muted-foreground max-w-md mx-auto">
					Your profile has been created and your Coach understands your goals. Time to begin your
					transformation.
				</p>
			</div>

			<div className="bg-muted/30 p-6 rounded-2xl text-left max-w-md mx-auto border border-border/50">
				<h4 className="font-semibold mb-4 flex items-center gap-2">
					<Sparkles className="w-4 h-4 text-primary" />
					What's next
				</h4>
				<ul className="text-sm text-muted-foreground space-y-3">
					<li className="flex items-start gap-3">
						<div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
							<span className="text-xs font-bold text-primary">1</span>
						</div>
						<span>Start your first conditioning session</span>
					</li>
					<li className="flex items-start gap-3">
						<div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
							<span className="text-xs font-bold text-primary">2</span>
						</div>
						<span>Chat with your Coach anytime to adjust your plan</span>
					</li>
					<li className="flex items-start gap-3">
						<div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
							<span className="text-xs font-bold text-primary">3</span>
						</div>
						<span>Use Reflection to track your progress</span>
					</li>
				</ul>
			</div>

			<Button
				onClick={onComplete}
				size="lg"
				className="w-full max-w-md h-14 text-base font-semibold bg-primary hover:bg-primary/90 transition-all duration-300"
			>
				<Sparkles className="w-5 h-5 mr-2" />
				Start Your Journey
			</Button>
		</div>
	);
}
