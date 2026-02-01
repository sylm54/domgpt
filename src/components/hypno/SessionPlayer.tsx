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
	model?: Model; // Kept for backward compatibility but not used
	onComplete?: () => void;
}

// Floating orb component for ambient decoration
function FloatingOrb({
	delay = 0,
	size = 100,
	x = 0,
	y = 0,
	color = "primary",
}: {
	delay?: number;
	size?: number;
	x?: number;
	y?: number;
	color?: string;
}) {
	const colorClasses = {
		primary: "from-primary/20 to-primary/5",
		purple: "from-purple-500/20 to-purple-500/5",
		blue: "from-blue-500/20 to-blue-500/5",
		indigo: "from-indigo-500/20 to-indigo-500/5",
	};

	return (
		<motion.div
			className={`absolute rounded-full bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.primary} blur-xl pointer-events-none`}
			style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{
				opacity: [0.3, 0.6, 0.3],
				scale: [1, 1.2, 1],
				x: [0, 20, 0],
				y: [0, -20, 0],
			}}
			transition={{
				duration: 8,
				delay,
				repeat: Infinity,
				ease: "easeInOut",
			}}
		/>
	);
}

// Pulsing ring component for visualization
function PulsingRing({
	delay = 0,
	size = 100,
	isPlaying = false,
}: {
	delay?: number;
	size?: number;
	isPlaying?: boolean;
}) {
	return (
		<motion.div
			className="absolute rounded-full border border-primary/30"
			style={{ width: size, height: size }}
			initial={{ opacity: 0, scale: 0.8 }}
			animate={
				isPlaying
					? {
							opacity: [0.3, 0.1, 0.3],
							scale: [1, 1.3, 1],
						}
					: { opacity: 0.2, scale: 1 }
			}
			transition={{
				duration: 3,
				delay,
				repeat: Infinity,
				ease: "easeInOut",
			}}
		/>
	);
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

	// Loading state with atmospheric design
	if (isLoading) {
		return (
			<div className="h-full relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-purple-950/50 to-slate-900">
				{/* Floating orbs for atmosphere */}
				<FloatingOrb delay={0} size={200} x={10} y={20} color="purple" />
				<FloatingOrb delay={2} size={150} x={70} y={60} color="blue" />
				<FloatingOrb delay={4} size={180} x={50} y={10} color="indigo" />

				<div className="relative z-10 flex flex-col items-center justify-center h-full space-y-6">
					{/* Animated loading visualization */}
					<div className="relative">
						{[0, 1, 2].map((i) => (
							<motion.div
								key={`loading-ring-${i}`}
								className="absolute rounded-full border border-primary/30"
								style={{
									width: 80 + i * 40,
									height: 80 + i * 40,
									left: -(i * 20),
									top: -(i * 20),
								}}
								animate={{
									opacity: [0.2, 0.5, 0.2],
									scale: [1, 1.1, 1],
								}}
								transition={{
									duration: 2,
									delay: i * 0.3,
									repeat: Infinity,
									ease: "easeInOut",
								}}
							/>
						))}
						<motion.div
							className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center"
							animate={{ opacity: [0.5, 1, 0.5] }}
							transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
						>
							<motion.div
								className="w-10 h-10 rounded-full bg-primary/30"
								animate={{ scale: [1, 1.2, 1] }}
								transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
							/>
						</motion.div>
					</div>

					{/* Shimmer text effect */}
					<motion.div
						className="text-center space-y-2"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
					>
						<motion.p
							className="text-lg font-medium text-white/80"
							animate={{ opacity: [0.5, 1, 0.5] }}
							transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
						>
							Preparing your session...
						</motion.p>
						<p className="text-sm text-white/40">Creating a space for relaxation</p>
					</motion.div>

					{/* Skeleton loading bar */}
					<motion.div
						className="w-48 h-1 rounded-full bg-white/10 overflow-hidden"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.5 }}
					>
						<motion.div
							className="h-full bg-gradient-to-r from-transparent via-primary/50 to-transparent"
							animate={{ x: ["-100%", "200%"] }}
							transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
							style={{ width: "50%" }}
						/>
					</motion.div>
				</div>
			</div>
		);
	}

	// Error state with styled design
	if (error) {
		return (
			<div className="h-full relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-red-950/30 to-slate-900">
				{/* Subtle floating elements */}
				<FloatingOrb delay={0} size={150} x={20} y={30} color="primary" />
				<FloatingOrb delay={2} size={120} x={60} y={50} color="purple" />

				<div className="relative z-10 flex flex-col items-center justify-center h-full space-y-6 p-8">
					<motion.div
						initial={{ scale: 0, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ type: "spring", duration: 0.5 }}
						className="relative"
					>
						{/* Glow effect behind icon */}
						<div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl" />
						<div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 flex items-center justify-center">
							<AlertCircle className="w-10 h-10 text-red-400" />
						</div>
					</motion.div>

					<motion.div
						className="text-center space-y-2 max-w-sm"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
					>
						<h3 className="text-xl font-semibold text-white/90">Playback Error</h3>
						<p className="text-sm text-white/50">{error}</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
					>
						<Button
							onClick={() => window.location.reload()}
							variant="outline"
							className="bg-white/5 border-white/20 hover:bg-white/10 text-white"
						>
							<RotateCcw className="w-4 h-4 mr-2" />
							Try Again
						</Button>
					</motion.div>
				</div>
			</div>
		);
	}

	// Main player view
	return (
		<div className="h-full relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-purple-950/50 to-slate-900">
			{/* Ambient floating orbs */}
			<FloatingOrb delay={0} size={250} x={-5} y={10} color="purple" />
			<FloatingOrb delay={1.5} size={200} x={70} y={5} color="blue" />
			<FloatingOrb delay={3} size={180} x={80} y={60} color="indigo" />
			<FloatingOrb delay={4.5} size={150} x={20} y={70} color="primary" />

			{/* Main content container */}
			<div className="relative z-10 h-full flex flex-col">
				{/* Header */}
				<motion.div
					className="p-6 text-center"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="text-xl font-semibold text-white/90 tracking-wide">
						Conditioning Session
					</h2>
					<div className="text-sm text-white/40 mt-1">
						{session.plan.map((step) => (
							<p key={step.name}>{step.name}</p>
						))}
					</div>
				</motion.div>

				{/* Central Visualization */}
				<div className="flex-1 flex flex-col items-center justify-center px-6">
					<motion.div
						className="relative flex items-center justify-center"
						initial={{ scale: 0.8, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ duration: 0.6, ease: "easeOut" }}
					>
						{/* Outer glow effect */}
						<AnimatePresence>
							{isPlaying && (
								<motion.div
									className="absolute w-64 h-64 rounded-full bg-primary/10 blur-3xl"
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
									exit={{ opacity: 0, scale: 0.8 }}
									transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
								/>
							)}
						</AnimatePresence>

						{/* Concentric pulsing rings */}
						<div className="absolute flex items-center justify-center">
							<PulsingRing delay={0} size={200} isPlaying={isPlaying} />
							<PulsingRing delay={0.5} size={240} isPlaying={isPlaying} />
							<PulsingRing delay={1} size={280} isPlaying={isPlaying} />
							<PulsingRing delay={1.5} size={320} isPlaying={isPlaying} />
						</div>

						{/* Main visualization circle */}
						<motion.div
							className="relative w-40 h-40 rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-purple-600/20 border border-primary/30 flex items-center justify-center backdrop-blur-sm"
							animate={
								isPlaying
									? {
											boxShadow: [
												"0 0 30px rgba(var(--primary-rgb), 0.2)",
												"0 0 60px rgba(var(--primary-rgb), 0.4)",
												"0 0 30px rgba(var(--primary-rgb), 0.2)",
											],
										}
									: {}
							}
							transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
						>
							{/* Inner visualization */}
							<div className="relative flex items-center justify-center">
								{isPlaying ? (
									<>
										{/* Audio wave visualization bars */}
										<div className="flex items-center gap-1">
											{[0, 1, 2, 3, 4].map((i) => (
												<motion.div
													key={`wave-bar-${i}`}
													className="w-2 rounded-full bg-gradient-to-t from-primary to-primary/50"
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

					{/* Status text */}
					<motion.div
						className="mt-8 text-center space-y-2"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
					>
						<AnimatePresence mode="wait">
							<motion.p
								key={isPlaying ? "playing" : "paused"}
								className="text-2xl font-light text-white/90 tracking-wide"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								transition={{ duration: 0.3 }}
							>
								{isPlaying ? "Listening..." : "Ready to Begin"}
							</motion.p>
						</AnimatePresence>
						<p className="text-sm text-white/40 max-w-xs">
							{isPlaying
								? "Breathe deeply and let go of tension"
								: "Find a comfortable position and relax"}
						</p>
					</motion.div>
				</div>

				{/* Frosted glass controls area */}
				<motion.div
					className="backdrop-blur-xl bg-white/5 border-t border-white/10 p-6 space-y-5"
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4, duration: 0.5 }}
				>
					{/* Progress Bar */}
					<div className="space-y-3">
						<div className="relative h-2 rounded-full bg-white/10 overflow-hidden group cursor-pointer">
							{/* Progress fill with gradient */}
							<motion.div
								className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-purple-500 rounded-full"
								style={{ width: `${progress}%` }}
								transition={{ duration: 0.1 }}
							/>
							{/* Glowing thumb indicator */}
							<motion.div
								className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-primary/50"
								style={{ left: `calc(${progress}% - 8px)` }}
								whileHover={{ scale: 1.2 }}
								transition={{ duration: 0.1 }}
							>
								<div className="absolute inset-0 rounded-full bg-primary/50 blur-sm" />
							</motion.div>
							{/* Invisible range input for interaction */}
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

						{/* Time display */}
						<div className="flex justify-between text-sm">
							<span className="font-mono text-white/70 tabular-nums">
								{formatTime(currentTime)}
							</span>
							<span className="font-mono text-white/40 tabular-nums">{formatTime(duration)}</span>
						</div>
					</div>

					{/* Main Controls */}
					<div className="flex items-center justify-center gap-3">
						{/* Skip back button */}
						<motion.button
							onClick={() => skip(-10)}
							className="relative h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							title="Skip back 10s"
						>
							<SkipBack className="h-5 w-5" />
						</motion.button>

						{/* Restart button */}
						<motion.button
							onClick={restart}
							className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							title="Restart"
						>
							<RotateCcw className="h-4 w-4" />
						</motion.button>

						{/* Main play/pause button */}
						<motion.button
							onClick={togglePlay}
							className="relative h-20 w-20 rounded-full flex items-center justify-center"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							title={isPlaying ? "Pause" : "Play"}
						>
							{/* Glow effect */}
							<div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-purple-600 opacity-80 blur-md" />

							{/* Pulsing ring when playing */}
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

							{/* Button surface */}
							<div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary via-primary to-purple-600 border border-white/20 flex items-center justify-center shadow-2xl shadow-primary/30">
								<AnimatePresence mode="wait">
									<motion.div
										key={isPlaying ? "pause" : "play"}
										initial={{ scale: 0.8, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										exit={{ scale: 0.8, opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										{isPlaying ? (
											<Pause className="h-8 w-8 text-white" />
										) : (
											<Play className="h-8 w-8 text-white ml-1" />
										)}
									</motion.div>
								</AnimatePresence>
							</div>
						</motion.button>

						{/* Skip forward button */}
						<motion.button
							onClick={() => skip(10)}
							className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							title="Skip forward 10s"
						>
							<SkipForward className="h-5 w-5" />
						</motion.button>

						{/* Playback speed button */}
						<motion.button
							onClick={changePlaybackRate}
							className="relative h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors group"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							title={`Speed: ${playbackRate}x`}
						>
							<span className="text-xs font-semibold">{playbackRate}x</span>
							{/* Tooltip */}
							<div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/80 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
								Playback Speed
							</div>
						</motion.button>
					</div>

					{/* Volume Control */}
					<div className="flex items-center justify-center gap-3">
						<motion.button
							onClick={toggleMute}
							className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
						>
							{isMuted || volume === 0 ? (
								<VolumeX className="h-4 w-4" />
							) : (
								<Volume2 className="h-4 w-4" />
							)}
						</motion.button>

						{/* Custom volume slider */}
						<div className="relative w-32 h-2 rounded-full bg-white/10 overflow-hidden group">
							{/* Volume fill */}
							<motion.div
								className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/50 to-white/70 rounded-full"
								style={{ width: `${isMuted ? 0 : volume * 100}%` }}
								transition={{ duration: 0.1 }}
							/>
							{/* Slider knob */}
							<motion.div
								className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
								style={{ left: `calc(${isMuted ? 0 : volume * 100}% - 6px)` }}
							/>
							{/* Invisible range input */}
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

						{/* Volume percentage */}
						<span className="text-xs text-white/40 w-8 text-right font-mono tabular-nums">
							{Math.round(isMuted ? 0 : volume * 100)}%
						</span>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
