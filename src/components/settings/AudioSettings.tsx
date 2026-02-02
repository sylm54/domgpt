import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { Check, Loader2, Pause, Play, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type AudioScript, generateAudio, type TtsProgressEvent } from "@/lib/tts-rust";

export function AudioSettings() {
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
					Test the audio generation and playback system to ensure everything is working properly.
				</p>
			</div>

			{!generatedScript && (
				<div className="flex justify-center py-4">
					<Button
						onClick={handleGenerateAudio}
						disabled={isGenerating}
						size="lg"
						className="w-full max-w-md h-14 text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
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
							className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all duration-300 relative"
							style={{ width: `${progress}%` }}
						>
							<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
						</div>
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
					<div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 p-4 rounded-xl border border-emerald-500/20">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
								<Check className="w-5 h-5 text-emerald-500" />
							</div>
							<div>
								<p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
									Audio Generated Successfully!
								</p>
								<p className="text-xs text-muted-foreground">Test the playback below.</p>
							</div>
						</div>
					</div>

					<div className="bg-gradient-to-br from-muted/50 to-muted/30 p-6 rounded-2xl border border-border/50 space-y-5">
						<div className="h-16 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl flex items-center justify-center overflow-hidden relative">
							<div className="flex items-end gap-1 h-12">
								{[...Array(40)].map((_, i) => (
									<div
										key={`wave-bar-${i}-${isPlaying}`}
										className={`w-1 rounded-full bg-gradient-to-t from-primary/40 to-primary/80 transition-all duration-150 ${isPlaying ? "animate-pulse" : ""}`}
										style={{
											height: `${20 + Math.sin(i * 0.5) * 15 + (isPlaying ? Math.random() * 20 : 0)}px`,
											animationDelay: `${i * 50}ms`,
										}}
									/>
								))}
							</div>
							{!isPlaying && (
								<div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px]">
									<span className="text-xs text-muted-foreground font-medium">Waveform</span>
								</div>
							)}
						</div>

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

							<div className="relative">
								{isPlaying && (
									<>
										<div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
										<div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary/40 to-primary/20 animate-pulse blur-sm" />
									</>
								)}
								<Button
									size="icon"
									onClick={togglePlay}
									className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-200"
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

						<div className="space-y-2">
							<div className="relative h-2 bg-muted rounded-full overflow-hidden">
								<div
									className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/70 rounded-full transition-all duration-100"
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
