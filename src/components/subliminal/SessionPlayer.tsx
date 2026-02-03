import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { readFile } from "@tauri-apps/plugin-fs";
import { Download, Loader2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import type { SubliminalFile } from "@/types/user";

interface SessionPlayerProps {
	subliminal: SubliminalFile;
}

export function SessionPlayer({ subliminal }: SessionPlayerProps) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [volume, setVolume] = useState(0.5);
	const [isMuted, setIsMuted] = useState(false);
	const [playbackSpeed, setPlaybackSpeed] = useState(1);
	const [audioSrc, setAudioSrc] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isDownloading, setIsDownloading] = useState(false);

	// Load audio file
	useEffect(() => {
		async function loadAudio() {
			try {
				const appDataDirPath = await appDataDir();
				const filePath = await join(appDataDirPath, "audio", subliminal.subliminal_file);
				const assetUrl = convertFileSrc(filePath);
				setAudioSrc(assetUrl);
			} catch (error) {
				console.error("Failed to load audio:", error);
			} finally {
				setIsLoading(false);
			}
		}
		loadAudio();
	}, [subliminal.subliminal_file]);

	// Audio event listeners
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const handleEnded = () => {
			// Auto-loop: when audio ends, it will automatically restart
			// The loop attribute handles this automatically
		};

		const handleError = (e: Event) => {
			console.error("Audio error:", e);
			setIsPlaying(false);
		};

		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError);

		return () => {
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
		};
	}, []);

	// Update audio properties
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		audio.volume = isMuted ? 0 : volume;
		audio.playbackRate = playbackSpeed;
	}, [volume, isMuted, playbackSpeed]);

	const togglePlay = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) return;

		if (isPlaying) {
			audio.pause();
		} else {
			audio.play().catch(console.error);
		}
		setIsPlaying(!isPlaying);
	}, [isPlaying]);

	const toggleMute = useCallback(() => {
		setIsMuted(!isMuted);
	}, [isMuted]);

	const handleVolumeChange = (value: number[]) => {
		const newVolume = value[0];
		setVolume(newVolume);
		if (newVolume > 0 && isMuted) {
			setIsMuted(false);
		}
	};

	const handleSpeedChange = (speed: number) => {
		setPlaybackSpeed(speed);
	};

	const handleDownload = async () => {
		setIsDownloading(true);
		try {
			const appDataDirPath = await appDataDir();
			const sourcePath = await join(appDataDirPath, "audio", subliminal.subliminal_file);

			// Read file contents
			const fileData = await readFile(sourcePath);

			// Create blob and download
			const blob = new Blob([fileData], { type: "audio/wav" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = subliminal.subliminal_file;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Failed to download file:", error);
		} finally {
			setIsDownloading(false);
		}
	};

	const formatDuration = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	if (isLoading) {
		return (
			<Card className="w-full border border-primary/20 rounded-2xl bg-background">
				<CardContent className="p-8">
					<div className="flex items-center justify-center py-12">
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
							className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full"
						/>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full border border-primary/20 rounded-2xl bg-background">
			<audio
				ref={audioRef}
				src={audioSrc || undefined}
				loop
				preload="auto"
				onPlay={() => setIsPlaying(true)}
				onPause={() => setIsPlaying(false)}
			>
				<track kind="captions" src="" label="Captions" />
			</audio>

			<CardContent className="p-6 md:p-8 space-y-6">
				{/* Header with title and download */}
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<motion.h2
							className="text-2xl font-bold text-foreground mb-2"
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
						>
							Subliminal Session
						</motion.h2>
						<p className="text-muted-foreground text-sm">
							Duration: {formatDuration(subliminal.duration_seconds)} • Auto-looping
						</p>
					</div>

					<Button
						variant="outline"
						size="sm"
						onClick={handleDownload}
						disabled={isDownloading}
						className="shrink-0"
					>
						{isDownloading ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : (
							<Download className="h-4 w-4 mr-2" />
						)}
						Download
					</Button>
				</div>

				{/* Looping indicator */}
				<div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-lg">
					<motion.div
						className="w-2 h-2 rounded-full bg-primary"
						animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
						transition={{ duration: 2, repeat: Infinity }}
					/>
					<span className="text-sm text-muted-foreground">
						Looping mode active - perfect for sleep or background listening
					</span>
				</div>

				{/* Main controls */}
				<div className="flex flex-col md:flex-row items-center gap-6 py-4">
					{/* Play/Pause Button */}
					<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
						<Button
							size="lg"
							onClick={togglePlay}
							className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
						>
							{isPlaying ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10 ml-1" />}
						</Button>
					</motion.div>

					{/* Volume and Speed Controls */}
					<div className="flex-1 w-full space-y-4">
						{/* Volume Control */}
						<div className="flex items-center gap-4">
							<Button variant="ghost" size="icon" onClick={toggleMute} className="shrink-0">
								{isMuted || volume === 0 ? (
									<VolumeX className="h-5 w-5 text-muted-foreground" />
								) : (
									<Volume2 className="h-5 w-5 text-foreground" />
								)}
							</Button>

							<Slider
								value={[isMuted ? 0 : volume]}
								onValueChange={handleVolumeChange}
								max={1}
								step={0.01}
								className="flex-1"
							/>

							<span className="text-sm text-muted-foreground w-12 text-right">
								{Math.round((isMuted ? 0 : volume) * 100)}%
							</span>
						</div>

						{/* Playback Speed Control */}
						<div className="flex items-center gap-4">
							<span className="text-sm text-muted-foreground w-16">Speed:</span>
							<div className="flex gap-2">
								{[0.75, 1, 1.25, 1.5].map((speed) => (
									<Button
										key={speed}
										variant={playbackSpeed === speed ? "default" : "outline"}
										size="sm"
										onClick={() => handleSpeedChange(speed)}
										className={
											playbackSpeed === speed
												? "bg-primary text-primary-foreground"
												: "text-muted-foreground"
										}
									>
										{speed}x
									</Button>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Session Plan Display */}
				{subliminal.plan && subliminal.plan.length > 0 && (
					<div className="pt-4 border-t border-border/50">
						<h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
							Session Structure
						</h3>
						<div className="space-y-2">
							{subliminal.plan.map((section, index) => (
								<motion.div
									key={section.name}
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: index * 0.1 }}
									className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
								>
									<div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
										{index + 1}
									</div>
									<div className="flex-1">
										<p className="font-medium text-sm">{section.name}</p>
										<p className="text-xs text-muted-foreground line-clamp-1">{section.content}</p>
									</div>
								</motion.div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
