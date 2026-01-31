import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Model } from "../../lib/models";
import type { HypnoFile, Question, Reflection } from "../../types/user";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useLogHistoryData } from "@/data/history";
import { Questionaire } from "../steering/Questionaire";

interface SessionPlayerProps {
	session: HypnoFile;
	model?: Model; // Kept for backward compatibility but not used
	onComplete?: () => void;
}

export function SessionPlayer({ session, model: _model, onComplete }: SessionPlayerProps) {
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

	// Handle debrief completion
	const handleDebriefComplete = async (questions: Question[]) => {
		const reflection: Reflection = {
			questions,
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
	};

	// Debrief view
	if (showDebrief) {
		return (
			<Questionaire
				referer={`a hypno session (${session.script || "session"})`}
				onComplete={handleDebriefComplete}
				title="Session Debrief"
				generatingMessage="Generating debrief questions..."
				completionTitle="Debrief Complete"
				completionMessage="Thank you for your feedback."
				showRestart={false}
			/>
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
