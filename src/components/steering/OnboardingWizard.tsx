import { useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CoachChat } from "./CoachChat";
import { useNavigate } from "react-router-dom";
import { getLLMModel, useSettingsStore } from "@/data/settings";
import { setOnboardingCompleted } from "@/pages/Dashboard";
import type { CoachTrait } from "@/types/user";
import type { Model } from "@/lib/models";
import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { generateAudio, type TtsProgressEvent, type AudioScript } from "../../lib/tts-rust";
import { Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useProfileStore } from "@/data/profile";

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
			{/* Progress Indicator */}
			<div className="mb-8">
				<div className="flex justify-between mb-2">
					{steps.map((step, index) => (
						<div
							key={step.id}
							className={`flex flex-col items-center ${
								index <= currentStep ? "text-primary" : "text-muted-foreground"
							}`}
						>
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1 ${
									index <= currentStep
										? "bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground"
								}`}
							>
								{index + 1}
							</div>
							<span className="text-xs hidden sm:block">{step.title}</span>
						</div>
					))}
				</div>
				<div className="w-full bg-muted h-2 rounded-full">
					<div
						className="bg-primary h-2 rounded-full transition-all duration-300"
						style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
					/>
				</div>
			</div>

			{/* Step Content */}
			<Card className="flex-1 flex flex-col min-h-0">
				<CardHeader>
					<CardTitle>{steps[currentStep].title}</CardTitle>
					<CardDescription>{steps[currentStep].description}</CardDescription>
				</CardHeader>
				<CardContent className="flex-1 min-h-0 overflow-hidden">{renderStepContent()}</CardContent>
			</Card>

			{/* Navigation - only show for non-chat steps */}
			{currentStep < 4 && (
				<div className="flex justify-between mt-6">
					<Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
						Back
					</Button>
					<Button onClick={handleNext} disabled={currentStep === 0 && !audioTestCompleted}>
						{currentStep === 0 ? (audioTestCompleted ? "Continue" : "Generate Test First") : "Next"}
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
				<p className="text-sm text-muted-foreground">
					Before continuing, let's test the audio generation and playback system. Click the button
					below to generate a test audio clip and ensure everything is working properly.
				</p>
			</div>

			{!generatedScript && (
				<div className="flex justify-center">
					<Button
						onClick={handleGenerateAudio}
						disabled={isGenerating}
						size="lg"
						className="w-full max-w-md"
					>
						{isGenerating ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Generating...
							</>
						) : (
							"Generate Test Audio"
						)}
					</Button>
				</div>
			)}

			{isGenerating && (
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground capitalize">{stage}</span>
						<span>{Math.round(progress)}%</span>
					</div>
					<div className="w-full bg-secondary h-2 rounded-full">
						<div
							className="bg-primary h-2 rounded-full transition-all"
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
				<div className="bg-destructive/10 text-destructive p-4 rounded-lg">
					<p className="text-sm font-medium">Error</p>
					<p className="text-xs mt-1">{error}</p>
				</div>
			)}

			{generatedScript && (
				<div className="space-y-4">
					<div className="bg-muted p-4 rounded-lg">
						<p className="text-sm font-medium mb-1">Audio Generated Successfully!</p>
						<p className="text-xs text-muted-foreground">Now test the playback.</p>
					</div>

					<div className="space-y-4">
						<div className="flex items-center justify-center gap-4">
							<Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8">
								{isMuted || volume === 0 ? (
									<VolumeX className="h-4 w-4" />
								) : (
									<Volume2 className="h-4 w-4" />
								)}
							</Button>
							<Button size="icon" onClick={togglePlay} className="h-12 w-12 rounded-full">
								{isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
							</Button>
							<input
								type="range"
								min={0}
								max={100}
								step={1}
								value={volume * 100}
								onChange={(e) => handleVolumeChange([parseFloat(e.target.value)])}
								className="w-24 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
							/>
						</div>

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
								value={progressPercent}
								onChange={(e) => handleSeek([parseFloat(e.target.value)])}
								className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
							/>
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
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="openrouter-key">OpenRouter API Key</Label>
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
					/>
					<p className="text-xs text-muted-foreground">
						Required for cloud processing mode. Get your key from openrouter.ai
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="model">Model</Label>
					<Select
						value={settings.main_model || "x-ai/grok-4.1-fast"}
						onValueChange={(value) => updateSettings({ main_model: value })}
					>
						<SelectTrigger id="model">
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

	const traitDefinitions: { value: CoachTrait; label: string; description: string }[] = [
		{
			value: "soft",
			label: "Soft",
			description: "Gentle and non-confrontational",
		},
		{
			value: "motivational",
			label: "Motivational",
			description: "Inspires and uplifts the user",
		},
		{
			value: "encouraging",
			label: "Encouraging",
			description: "More friendly and supportive",
		},
		{
			value: "empathetic",
			label: "Empathetic",
			description: "Shows understanding of user's feelings",
		},
		{
			value: "direct",
			label: "Direct",
			description: "Straightforward and to the point",
		},
		{
			value: "informative",
			label: "Informative",
			description: "Provides detailed explanations",
		},
		{
			value: "intense",
			label: "Intense",
			description: "More forceful and goes farther",
		},
		{
			value: "pushing",
			label: "Pushing",
			description: "Expands on your goals and takes them further",
		},
		{
			value: "assertive",
			label: "Assertive",
			description: "Takes initiative and guides your journey",
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
				<p className="text-sm text-muted-foreground">
					Select the personality traits that best match how you'd like your Coach to interact with
					you. You can choose multiple traits.
				</p>
			</div>

			{selectedTraits.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{selectedTraits.map((trait) => (
						<Badge key={trait} variant="default" className="text-sm">
							{traitDefinitions.find((t) => t.value === trait)?.label}
						</Badge>
					))}
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{traitDefinitions.map(({ value, label, description }) => (
					<div
						key={value}
						className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
							selectedTraits.includes(value)
								? "bg-primary/5 border-primary"
								: "bg-background hover:bg-muted/50 border-border"
						}`}
					>
						<Checkbox
							id={`trait-${value}`}
							checked={selectedTraits.includes(value)}
							onCheckedChange={() => handleTraitToggle(value)}
						/>
						<div className="flex-1 space-y-1">
							<Label
								htmlFor={`trait-${value}`}
								className="font-medium cursor-pointer flex items-center gap-2"
							>
								{label}
							</Label>
							<p className="text-xs text-muted-foreground">{description}</p>
						</div>
					</div>
				))}
			</div>

			{selectedTraits.length === 0 && (
				<p className="text-sm text-muted-foreground text-center py-4">
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
		<div className="text-center space-y-6 py-8">
			<div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
				<svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<title>Success checkmark</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
				</svg>
			</div>

			<div>
				<h3 className="text-lg font-medium">You're all set!</h3>
				<p className="text-muted-foreground mt-2">
					Your profile has been created and your Coach understands your goals.
				</p>
			</div>

			<div className="bg-muted p-4 rounded-lg text-left max-w-md mx-auto">
				<h4 className="font-medium mb-2">Next steps:</h4>
				<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
					<li>Start your first hypno session</li>
					<li>Chat with your Coach anytime to adjust your plan</li>
					<li>Use Reflection to track your progress</li>
				</ul>
			</div>

			<Button onClick={onComplete} className="w-full max-w-md">
				Start Your Journey
			</Button>
		</div>
	);
}
