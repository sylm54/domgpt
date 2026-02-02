import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import {
	AlertCircle,
	Pause,
	Play,
	RotateCcw,
	SkipBack,
	SkipForward,
	Volume2,
	VolumeX,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useLogHistoryData } from "@/data/history";
import type { Model } from "../../lib/models";
import type { HypnoFile, Question, Reflection } from "../../types/user";
import { Questionaire } from "../steering/Questionaire";
import { Button } from "../ui/button";

interface SessionPlayerProps {
	session: HypnoFile;
	model?: Model;
	onComplete?: () => void;
}

export function SessionPlayer({ session, model: _model, onComplete }: SessionPlayerProps) {
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

	const [showDebrief, setShowDebrief] = useState(false);

	useEffect(() => {
		appDataDir().then(setDir);
	}, []);

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

	const skip = (seconds: number) => {
		if (!audioRef.current) return;
		audioRef.current.currentTime = Math.max(
			0,
			Math.min(duration, audioRef.current.currentTime + seconds)
		);
	};

	const changePlaybackRate = () => {
		if (!audioRef.current) return;
		const newRate =
			playbackRate === 1 ? 1.25 : playbackRate === 1.25 ? 1.5 : playbackRate === 1.5 ? 0.75 : 1;
		audioRef.current.playbackRate = newRate;
		setPlaybackRate(newRate);
	};

	const restart = () => {
		if (!audioRef.current) return;
		audioRef.current.currentTime = 0;
		if (!isPlaying) {
			togglePlay();
		}
	};

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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

	if (showDebrief) {
		return (
			<Questionaire
				referer={`a hypno session\n${session.plan.map((p) => `## ${p.name}:\n${p.content}`).join(", ") || "session"}`}
				onComplete={handleDebriefComplete}
				title="Session Debrief"
				generatingMessage="Generating debrief questions..."
				completionTitle="Debrief Complete"
				completionMessage="Thank you for your feedback."
				showRestart={false}
			/>
		);
	}

	if (isLoading) {
		return (
			<div className="h-full relative overflow-hidden rounded-xl bg-background">
				<div className="relative z-10 flex flex-col items-center justify-center h-full space-y-6">
					<div className="relative">
						<div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
							<div className="w-10 h-10 rounded-full bg-primary/40 animate-pulse" />
						</div>
					</div>

					<motion.div
						className="text-center space-y-2"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
					>
						<p className="text-lg font-medium text-foreground">Preparing your session...</p>
						<p className="text-sm text-muted-foreground">Creating a space for relaxation</p>
					</motion.div>

					<motion.div
						className="w-48 h-1 rounded-full bg-muted overflow-hidden"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.5 }}
					>
						<motion.div
							className="h-full bg-primary/50"
							animate={{ x: ["-100%", "200%"] }}
							transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
							style={{ width: "50%" }}
						/>
					</motion.div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="h-full relative overflow-hidden rounded-xl bg-background">
				<div className="relative z-10 flex flex-col items-center justify-center h-full space-y-6 p-8">
					<motion.div
						initial={{ scale: 0, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ type: "spring", duration: 0.5 }}
						className="relative"
					>
						<div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
							<AlertCircle className="w-10 h-10 text-destructive" />
						</div>
					</motion.div>

					<motion.div
						className="text-center space-y-2 max-w-sm"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
					>
						<h3 className="text-xl font-semibold text-foreground">Playback Error</h3>
						<p className="text-sm text-muted-foreground">{error}</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
					>
						<Button onClick={() => window.location.reload()} variant="outline">
							<RotateCcw className="w-4 h-4 mr-2" />
							Try Again
						</Button>
					</motion.div>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full relative overflow-hidden rounded-xl bg-background">
			<div className="relative z-10 h-full flex flex-col">
				<motion.div
					className="p-6 text-center"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="text-xl font-semibold text-foreground tracking-wide">
						Conditioning Session
					</h2>
					<div className="text-sm text-muted-foreground mt-1">
						{session.plan.map((step) => (
							<p key={step.name}>{step.name}</p>
						))}
					</div>
				</motion.div>

				<div className="flex-1 flex flex-col items-center justify-center px-6">
					<motion.div
						className="relative flex items-center justify-center"
						initial={{ scale: 0.8, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ duration: 0.6, ease: "easeOut" }}
					>
						<motion.div className="relative w-40 h-40 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
							<div className="relative flex items-center justify-center">
								{isPlaying ? (
									<>
										<div className="flex items-center gap-1">
											{[0, 1, 2, 3, 4].map((i) => (
												<motion.div
													key={`wave-bar-${i}`}
													className="w-2 rounded-full bg-primary"
													animate={{
														height: [16, 40 + i * 5, 16],
													}}
													transition={{
														duration: 0.5 + i * 0.05,
														repeat: Infinity,
														ease: "easeInOut",
														delay: i * 0.1,
													}}
												/>
											))}
										</div>
									</>
								) : (
									<motion.div
										initial={{ scale: 0.9, opacity: 0.5 }}
										animate={{ scale: 1, opacity: 1 }}
										className="text-primary/70"
									>
										<Play className="w-16 h-16" />
									</motion.div>
								)}
							</div>
						</motion.div>
					</motion.div>

					<motion.div
						className="mt-8 text-center space-y-2"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
					>
						<AnimatePresence mode="wait">
							<motion.p
								key={isPlaying ? "playing" : "paused"}
								className="text-2xl font-light text-foreground tracking-wide"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								transition={{ duration: 0.3 }}
							>
								{isPlaying ? "Listening..." : "Ready to Begin"}
							</motion.p>
						</AnimatePresence>
						<p className="text-sm text-muted-foreground max-w-xs">
							{isPlaying
								? "Breathe deeply and let go of tension"
								: "Find a comfortable position and relax"}
						</p>
					</motion.div>
				</div>

				<motion.div
					className="border-t border-border bg-muted/30 p-6 space-y-5"
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4, duration: 0.5 }}
				>
					<div className="space-y-3">
						<div className="relative h-2 rounded-full bg-muted overflow-hidden group cursor-pointer">
							<motion.div
								className="absolute inset-y-0 left-0 bg-primary rounded-full"
								style={{ width: `${progress}%` }}
								transition={{ duration: 0.1 }}
							/>
							<motion.div
								className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-2 border-primary shadow-sm"
								style={{ left: `calc(${progress}% - 8px)` }}
								whileHover={{ scale: 1.2 }}
								transition={{ duration: 0.1 }}
							/>
							<input
								type="range"
								min={0}
								max={100}
								step={0.1}
								value={progress}
								onChange={(e) => handleSeek([parseFloat(e.target.value)])}
								className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
							/>
						</div>

						<div className="flex justify-between text-sm">
							<span className="font-mono text-foreground tabular-nums">
								{formatTime(currentTime)}
							</span>
							<span className="font-mono text-muted-foreground tabular-nums">
								{formatTime(duration)}
							</span>
						</div>
					</div>

					<div className="flex items-center justify-center gap-3">
						<motion.button
							onClick={() => skip(-10)}
							className="relative h-12 w-12 rounded-full bg-background border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							title="Skip back 10s"
						>
							<SkipBack className="h-5 w-5" />
						</motion.button>

						<motion.button
							onClick={restart}
							className="h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							title="Restart"
						>
							<RotateCcw className="h-4 w-4" />
						</motion.button>

						<motion.button
							onClick={togglePlay}
							className="relative h-20 w-20 rounded-full flex items-center justify-center"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							title={isPlaying ? "Pause" : "Play"}
						>
							<AnimatePresence>
								{isPlaying && (
									<motion.div
										className="absolute inset-0 rounded-full border-2 border-primary/50"
										initial={{ scale: 1, opacity: 0.5 }}
										animate={{ scale: 1.4, opacity: 0 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
									/>
								)}
							</AnimatePresence>

							<div className="relative w-full h-full rounded-full bg-primary border border-primary/20 flex items-center justify-center">
								<AnimatePresence mode="wait">
									<motion.div
										key={isPlaying ? "pause" : "play"}
										initial={{ scale: 0.8, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										exit={{ scale: 0.8, opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										{isPlaying ? (
											<Pause className="h-8 w-8 text-primary-foreground" />
										) : (
											<Play className="h-8 w-8 text-primary-foreground ml-1" />
										)}
									</motion.div>
								</AnimatePresence>
							</div>
						</motion.button>

						<motion.button
							onClick={() => skip(10)}
							className="h-12 w-12 rounded-full bg-background border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							title="Skip forward 10s"
						>
							<SkipForward className="h-5 w-5" />
						</motion.button>

						<motion.button
							onClick={changePlaybackRate}
							className="relative h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors group"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							title={`Speed: ${playbackRate}x`}
						>
							<span className="text-xs font-semibold">{playbackRate}x</span>
							<div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-popover text-popover-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
								Playback Speed
							</div>
						</motion.button>
					</div>

					<div className="flex items-center justify-center gap-3">
						<motion.button
							onClick={toggleMute}
							className="h-9 w-9 rounded-full bg-background border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
						>
							{isMuted || volume === 0 ? (
								<VolumeX className="h-4 w-4" />
							) : (
								<Volume2 className="h-4 w-4" />
							)}
						</motion.button>

						<div className="relative w-32 h-2 rounded-full bg-muted overflow-hidden group">
							<motion.div
								className="absolute inset-y-0 left-0 bg-foreground/30 rounded-full"
								style={{ width: `${isMuted ? 0 : volume * 100}%` }}
								transition={{ duration: 0.1 }}
							/>
							<motion.div
								className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-background border border-foreground/30 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
								style={{ left: `calc(${isMuted ? 0 : volume * 100}% - 6px)` }}
							/>
							<input
								type="range"
								min={0}
								max={100}
								step={1}
								value={isMuted ? 0 : volume * 100}
								onChange={(e) => handleVolumeChange([parseFloat(e.target.value)])}
								className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
							/>
						</div>

						<span className="text-xs text-muted-foreground w-8 text-right font-mono tabular-nums">
							{Math.round(isMuted ? 0 : volume * 100)}%
						</span>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
