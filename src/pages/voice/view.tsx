import { Button } from "@/components/ui/button";
import { Response } from "@/components/ui/shadcn-io/ai/response";
import { useEffect, useRef, useState } from "react";
import {
  loadAssignments,
  loadScores,
  saveScores,
  VoiceAssignment,
  VoiceScore,
  logVoiceAssignmentCompleted,
} from "./types";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { voice_agent } from "@/agents/agents";
import type { ChatMessage } from "@/lib/models";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useConfig } from "@/contexts/ConfigContext";
import {
  MicIcon,
  BookOpenIcon,
  MessageSquareIcon,
  TargetIcon,
  TrendingUpIcon,
  ActivityIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function VoiceView() {
  const { uiText } = useConfig();
  const [assignments, setAssignments] = useState<VoiceAssignment[]>([]);
  const [scores, setScores] = useState<VoiceScore[]>([]);
  const [recording, setRecording] = useState(false);
  const [currentAssignment, setCurrentAssignment] =
    useState<VoiceAssignment | null>(null);
  const [dryRunMode, setDryRunMode] = useState(false);

  // Agent Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  // Audio Context
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pitchHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    setAssignments(loadAssignments());
    setScores(loadScores());
  }, []);

  useEffect(() => {
    if (recording && canvasRef.current && analyserRef.current) {
      drawVisualizer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (recording && canvasRef.current && analyserRef.current) {
      drawVisualizer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const startRecording = async (assignment: VoiceAssignment) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      // Setup MediaRecorder
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      setCurrentAssignment(assignment);
      setRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert(
        "Could not access microphone. Please ensure you have granted permission.",
      );
    }
  };

  // Simple autocorrelation pitch detection
  const detectPitch = (buffer: Float32Array, sampleRate: number): number => {
    const SIZE = buffer.length;
    const rms = Math.sqrt(
      buffer.reduce((acc, val) => acc + val * val, 0) / SIZE,
    );
    if (rms < 0.01) return 0; // Too quiet

    let r1 = 0,
      r2 = SIZE - 1,
      thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < thres) {
        r2 = SIZE - i;
        break;
      }
    }

    const buf = buffer.slice(r1, r2);
    const c = new Array(buf.length).fill(0);
    for (let i = 0; i < buf.length; i++) {
      for (let j = 0; j < buf.length - i; j++) {
        c[i] = c[i] + buf[j] * buf[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1,
      maxpos = -1;
    for (let i = d; i < buf.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    return sampleRate / T0;
  };

  // Simple FFT implementation for spectral analysis
  const simpleFFT = (signal: Float32Array): Float32Array => {
    const n = signal.length;
    const magnitude = new Float32Array(n / 2);

    for (let k = 0; k < n / 2; k++) {
      let real = 0;
      let imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / n;
        real += signal[t] * Math.cos(angle);
        imag -= signal[t] * Math.sin(angle);
      }
      magnitude[k] = Math.sqrt(real * real + imag * imag);
    }

    return magnitude;
  };

  // Calculate high-frequency energy ratio for resonance
  const calculateResonance = (
    magnitude: Float32Array,
    sampleRate: number,
  ): number => {
    // Split frequency bands: low (0-1000Hz) vs high (1000-4000Hz)
    const binWidth = sampleRate / (magnitude.length * 2);
    const lowBandEnd = Math.floor(1000 / binWidth);
    const highBandEnd = Math.floor(4000 / binWidth);

    let lowEnergy = 0;
    let highEnergy = 0;

    for (let i = 0; i < lowBandEnd && i < magnitude.length; i++) {
      lowEnergy += magnitude[i] * magnitude[i];
    }

    for (let i = lowBandEnd; i < highBandEnd && i < magnitude.length; i++) {
      highEnergy += magnitude[i] * magnitude[i];
    }

    const totalEnergy = lowEnergy + highEnergy;
    if (totalEnergy === 0) return 0;

    // Return ratio of high to total energy (0-1)
    return highEnergy / totalEnergy;
  };

  const analyzeAudio = async (blob: Blob): Promise<VoiceScore["breakdown"]> => {
    if (!audioContextRef.current)
      return { pitch: 0, intonation: 0, resonance: 0, naturalness: 0 };

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer =
      await audioContextRef.current.decodeAudioData(arrayBuffer);
    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Analyze chunks of 2048 samples
    const pitches: number[] = [];
    const resonanceRatios: number[] = [];
    const bufferSize = 2048;

    for (let i = 0; i < rawData.length; i += bufferSize) {
      const chunk = rawData.slice(i, i + bufferSize);
      if (chunk.length === bufferSize) {
        const p = detectPitch(chunk, sampleRate);
        if (p > 50 && p < 500) pitches.push(p);

        // Calculate resonance from frequency spectrum
        const magnitude = simpleFFT(chunk);
        const resonance = calculateResonance(magnitude, sampleRate);
        if (resonance > 0) resonanceRatios.push(resonance);
      }
    }

    if (pitches.length === 0)
      return { pitch: 0, intonation: 0, resonance: 0, naturalness: 0 };

    const avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    // Target ~220Hz for feminine range
    const pitchScore = Math.max(
      0,
      Math.min(100, 100 - Math.abs(avgPitch - 220) / 2),
    );

    // Intonation (Std Dev)
    const variance =
      pitches.reduce((a, b) => a + Math.pow(b - avgPitch, 2), 0) /
      pitches.length;
    const stdDev = Math.sqrt(variance);
    // Target dynamic range ~20-50Hz
    const intonationScore = Math.max(0, Math.min(100, (stdDev / 30) * 100));

    // Resonance (High-frequency energy ratio)
    // Higher ratio = brighter, more resonant voice (more high-frequency content)
    // Feminine voices typically have 0.3-0.6 ratio, masculine 0.2-0.4
    const avgRatio =
      resonanceRatios.length > 0
        ? resonanceRatios.reduce((a, b) => a + b, 0) / resonanceRatios.length
        : 0.3;
    // Map 0.2-0.6 ratio to 0-100 score
    const resonanceScore = Math.max(
      0,
      Math.min(100, ((avgRatio - 0.2) / 0.4) * 100),
    );

    // Naturalness (Stability)
    // Penalize extreme jumps
    let jumps = 0;
    for (let i = 1; i < pitches.length; i++) {
      if (Math.abs(pitches[i] - pitches[i - 1]) > 50) jumps++;
    }
    const stability = 100 - (jumps / pitches.length) * 100;
    const naturalnessScore = Math.max(0, Math.min(100, stability));

    return {
      pitch: Math.round(pitchScore),
      intonation: Math.round(intonationScore),
      resonance: Math.round(resonanceScore),
      naturalness: Math.round(naturalnessScore),
    };
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = async () => {
        // Skip analysis if in dry run mode
        if (!dryRunMode) {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const breakdown = await analyzeAudio(blob);
          const overallScore = Math.round(
            (breakdown.pitch +
              breakdown.intonation +
              breakdown.resonance +
              breakdown.naturalness) /
              4,
          );

          if (currentAssignment) {
            const newScore: VoiceScore = {
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              assignmentId: currentAssignment.id,
              overallScore,
              breakdown,
            };

            const updatedScores = [...scores, newScore];
            setScores(updatedScores);
            saveScores(updatedScores);
            logVoiceAssignmentCompleted(currentAssignment, newScore);
          }
        }

        setCurrentAssignment(null);

        // Cleanup
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => {
            track.stop();
          });
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        pitchHistoryRef.current = [];
        setRecording(false);
      };
    } else {
      // Fallback cleanup if recorder failed
      setRecording(false);
    }
  };

  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current || !audioContextRef.current)
      return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    const maxHistory = 150; // Show last 150 pitch samples

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      // Get time domain data for pitch detection
      analyserRef.current!.getFloatTimeDomainData(dataArray);

      // Detect current pitch
      const currentPitch = detectPitch(
        dataArray,
        audioContextRef.current!.sampleRate,
      );
      if (currentPitch > 50 && currentPitch < 500) {
        pitchHistoryRef.current.push(currentPitch);
        if (pitchHistoryRef.current.length > maxHistory) {
          pitchHistoryRef.current.shift();
        }
      }

      // Clear canvas with pink-tinted background
      canvasCtx.fillStyle = "rgb(253, 242, 248)";
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Define pitch range for visualization (100Hz - 400Hz)
      const minPitch = 100;
      const maxPitch = 400;
      const targetMinPitch = 165; // Feminine voice target range (more accommodating)
      const targetMaxPitch = 300;

      // Draw target zone
      const targetMinY =
        canvas.height -
        ((targetMinPitch - minPitch) / (maxPitch - minPitch)) * canvas.height;
      const targetMaxY =
        canvas.height -
        ((targetMaxPitch - minPitch) / (maxPitch - minPitch)) * canvas.height;
      canvasCtx.fillStyle = "rgba(34, 197, 94, 0.15)"; // Light green
      canvasCtx.fillRect(0, targetMaxY, canvas.width, targetMinY - targetMaxY);

      // Draw target zone borders
      canvasCtx.strokeStyle = "rgba(34, 197, 94, 0.5)";
      canvasCtx.lineWidth = 2;
      canvasCtx.setLineDash([5, 5]);
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, targetMinY);
      canvasCtx.lineTo(canvas.width, targetMinY);
      canvasCtx.stroke();
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, targetMaxY);
      canvasCtx.lineTo(canvas.width, targetMaxY);
      canvasCtx.stroke();
      canvasCtx.setLineDash([]);

      // Draw pitch history
      if (pitchHistoryRef.current.length > 1) {
        canvasCtx.lineWidth = 3;
        canvasCtx.beginPath();

        const pointSpacing = canvas.width / maxHistory;

        for (let i = 0; i < pitchHistoryRef.current.length; i++) {
          const pitch = pitchHistoryRef.current[i];
          const x = i * pointSpacing;
          const normalizedPitch = (pitch - minPitch) / (maxPitch - minPitch);
          const y = canvas.height - normalizedPitch * canvas.height;

          // Color code: green if in target range, pink if outside
          const inRange = pitch >= targetMinPitch && pitch <= targetMaxPitch;
          canvasCtx.strokeStyle = inRange
            ? "rgb(34, 197, 94)"
            : "rgb(236, 72, 153)";

          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }
        }

        canvasCtx.stroke();

        // Draw current pitch value
        if (pitchHistoryRef.current.length > 0) {
          const latestPitch =
            pitchHistoryRef.current[pitchHistoryRef.current.length - 1];
          canvasCtx.fillStyle = "rgb(190, 24, 93)";
          canvasCtx.font = "bold 18px sans-serif";
          canvasCtx.fillText(`${Math.round(latestPitch)} Hz`, 15, 30);
        }
      }

      // Draw grid labels
      canvasCtx.fillStyle = "rgb(150, 150, 150)";
      canvasCtx.font = "12px sans-serif";
      canvasCtx.textAlign = "right";
      [100, 150, 200, 250, 300, 350, 400].forEach((pitch) => {
        const y =
          canvas.height -
          ((pitch - minPitch) / (maxPitch - minPitch)) * canvas.height;
        canvasCtx.fillText(`${pitch}Hz`, canvas.width - 10, y + 4);
      });
    };

    draw();
  };

  // Calculate average score
  const avgScore =
    scores.length > 0
      ? Math.round(
          scores.reduce((acc, s) => acc + s.overallScore, 0) / scores.length,
        )
      : 0;

  return (
    <PageLayout>
      <PageHeader
        title={uiText.voice?.title || "Voice Training"}
        subtitle={
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <ActivityIcon className="w-4 h-4" />
              {scores.length} sessions
            </span>
            {scores.length > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUpIcon className="w-4 h-4" />
                Avg: {avgScore}%
              </span>
            )}
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer bg-white/20 px-3 py-1.5 rounded-lg">
              <input
                type="checkbox"
                checked={dryRunMode}
                onChange={(e) => setDryRunMode(e.target.checked)}
                className="w-4 h-4 cursor-pointer rounded"
              />
              <span className="text-white/90 font-medium hidden sm:inline">
                {uiText.voice?.dry_run_label || "Dry Run"}
              </span>
            </label>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-32">
        <div className="max-w-6xl mx-auto">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl"
                >
                  <BookOpenIcon className="w-4 h-4 mr-2 text-pink-500" />
                  Guide
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Voice Analysis Guide</DialogTitle>
                  <DialogDescription>
                    Understanding your voice metrics and how to improve them.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  <section className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4">
                    <h3 className="text-lg font-bold mb-2 text-pink-600 dark:text-pink-400">
                      Pitch
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>What it is:</strong> How high or low your voice
                        sounds (frequency).
                      </p>
                      <p>
                        <strong>Target:</strong> Feminine range is typically{" "}
                        <strong>170Hz - 220Hz</strong>.
                      </p>
                      <div className="bg-white dark:bg-card p-3 rounded-lg border border-pink-200 dark:border-pink-500/30">
                        <strong className="text-pink-600 dark:text-pink-400">
                          Training Tip:
                        </strong>{" "}
                        Practice humming at a higher pitch, use a tuner app,
                        slide up from your chest voice without straining.
                      </div>
                    </div>
                  </section>

                  <section className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4">
                    <h3 className="text-lg font-bold mb-2 text-pink-600 dark:text-pink-400">
                      Resonance
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>What it is:</strong> The "brightness" or "size"
                        of your voice. Masculine resonance is "chest-heavy"
                        (dark/large), feminine is "head-heavy" (bright/small).
                      </p>
                      <p>
                        <strong>Target:</strong> Bright, forward resonance.
                      </p>
                      <div className="bg-white dark:bg-card p-3 rounded-lg border border-pink-200 dark:border-pink-500/30">
                        <strong className="text-pink-600 dark:text-pink-400">
                          Training Tip:
                        </strong>{" "}
                        "Mmm" sounds, try to feel vibrations in your lips/nose
                        rather than chest. Whisper "heee" to lift the larynx.
                      </div>
                    </div>
                  </section>

                  <section className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4">
                    <h3 className="text-lg font-bold mb-2 text-pink-600 dark:text-pink-400">
                      Intonation
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>What it is:</strong> The melody and variation of
                        your pitch.
                      </p>
                      <p>
                        <strong>Target:</strong> More dynamic, "singsong"
                        quality. Avoid monotone.
                      </p>
                      <div className="bg-white dark:bg-card p-3 rounded-lg border border-pink-200 dark:border-pink-500/30">
                        <strong className="text-pink-600 dark:text-pink-400">
                          Training Tip:
                        </strong>{" "}
                        Read children's books aloud, exaggerate emotions,
                        emphasize key words with pitch changes.
                      </div>
                    </div>
                  </section>

                  <section className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4">
                    <h3 className="text-lg font-bold mb-2 text-pink-600 dark:text-pink-400">
                      Naturalness
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>What it is:</strong> How stable and relaxed your
                        voice sounds.
                      </p>
                      <p>
                        <strong>Target:</strong> Smooth transitions, no cracking
                        or strain.
                      </p>
                      <div className="bg-white dark:bg-card p-3 rounded-lg border border-pink-200 dark:border-pink-500/30">
                        <strong className="text-pink-600 dark:text-pink-400">
                          Training Tip:
                        </strong>{" "}
                        Breath support, relaxation exercises (yawning, neck
                        rolls), don't push too high too fast.
                      </div>
                    </div>
                  </section>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-md shadow-pink-300/30">
                  <MessageSquareIcon className="w-4 h-4 mr-2" />
                  Voice Coach
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Voice Coach Agent</DialogTitle>
                  <DialogDescription>
                    Ask for new assignments or feedback on your progress.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <Textarea
                    ref={promptRef}
                    value={agentPrompt}
                    onChange={(e) => setAgentPrompt(e.target.value)}
                    placeholder="E.g., 'Give me a phrase to practice pitch variation.'"
                    className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl"
                  />
                </div>
                <DialogFooter>
                  <div className="mr-auto text-sm text-pink-500 font-medium">
                    {agentLoading ? "Thinking..." : ""}
                  </div>
                  <Button
                    onClick={async () => {
                      if (!agentPrompt.trim() || agentLoading) return;
                      setAgentLoading(true);
                      setAgentResponse(null);
                      try {
                        const msg: ChatMessage = {
                          type: "user",
                          content: [{ type: "text", text: agentPrompt }],
                        };
                        await voice_agent.act(msg);
                        const conv = voice_agent.context.conversation;
                        const lastAssistant = [...conv]
                          .reverse()
                          .find((m) => m.type === "assistant") as any;
                        const text =
                          lastAssistant?.content
                            ?.filter((c: any) => c.type === "text")
                            .map((c: any) => c.text)
                            .join("") ?? "No response";
                        setAgentResponse(text);
                        // Refresh assignments in case agent added some
                        setAssignments(loadAssignments());
                      } catch (e: any) {
                        setAgentResponse("Error: " + e.toString());
                      } finally {
                        setAgentLoading(false);
                      }
                    }}
                    disabled={agentLoading}
                    className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold rounded-xl"
                  >
                    Send
                  </Button>
                </DialogFooter>
                {agentResponse && (
                  <div className="mt-4 max-h-64 overflow-auto bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4 border border-pink-200 dark:border-pink-500/30">
                    <Response className="prose max-w-full">
                      {agentResponse}
                    </Response>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Recording Overlay */}
          {recording && currentAssignment ? (
            <div className="fixed inset-0 bg-gradient-to-br from-pink-50 via-pink-100 to-pink-200 dark:from-pink-950 dark:via-pink-900 dark:to-pink-800 z-50 flex flex-col items-center justify-center p-4 sm:p-8">
              {/* Close Button */}
              <button
                onClick={stopRecording}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/80 dark:bg-card/80 hover:bg-white dark:hover:bg-card shadow-lg transition-colors"
              >
                <XIcon className="w-6 h-6 text-pink-600" />
              </button>

              {dryRunMode && (
                <div className="absolute top-4 left-4 sm:top-8 sm:left-auto sm:right-20 bg-yellow-400/20 border border-yellow-500 text-yellow-700 dark:text-yellow-400 px-4 py-2 rounded-xl font-semibold text-sm">
                  DRY RUN MODE - No analysis will be saved
                </div>
              )}

              <div className="max-w-3xl w-full">
                <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-2xl border border-pink-200/50 dark:border-pink-500/20 mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 text-foreground">
                    {currentAssignment.phrase}
                  </h2>
                  <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                    {currentAssignment.targetPitch && (
                      <span className="flex items-center gap-1 bg-pink-100 dark:bg-pink-900/30 px-3 py-1.5 rounded-lg">
                        <TargetIcon className="w-4 h-4 text-pink-500" />
                        Pitch: {currentAssignment.targetPitch}
                      </span>
                    )}
                    {currentAssignment.targetTone && (
                      <span className="flex items-center gap-1 bg-pink-100 dark:bg-pink-900/30 px-3 py-1.5 rounded-lg">
                        <SparklesIcon className="w-4 h-4 text-pink-500" />
                        Tone: {currentAssignment.targetTone}
                      </span>
                    )}
                  </div>
                </div>

                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full h-48 sm:h-56 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl border border-pink-200/50 dark:border-pink-500/20 shadow-xl mb-6"
                />

                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={stopRecording}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-6 px-10 rounded-2xl shadow-xl shadow-red-300/30 transition-all duration-200"
                  >
                    <MicIcon className="w-5 h-5 mr-2" />
                    {dryRunMode
                      ? uiText.voice?.stop_label || "Stop Recording"
                      : uiText.voice?.analyze_label || "Stop & Analyze"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Daily Assignments */}
            <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border border-pink-200/50 dark:border-pink-500/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center shadow-md">
                  <MicIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Daily Assignments
                </h2>
              </div>

              {assignments.length === 0 ? (
                <EmptyState
                  icon={MicIcon}
                  title="No assignments yet"
                  description="Ask the Voice Coach to give you practice phrases!"
                />
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="bg-gradient-to-r from-pink-50 to-pink-100/50 dark:from-pink-900/20 dark:to-pink-800/10 rounded-xl p-4 border border-pink-200/50 dark:border-pink-500/20 hover:shadow-md transition-shadow"
                    >
                      <div className="font-semibold text-lg mb-2 text-foreground">
                        {assignment.phrase}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                        {assignment.targetPitch && (
                          <span className="bg-white dark:bg-card px-2 py-1 rounded-md">
                            Pitch: {assignment.targetPitch}
                          </span>
                        )}
                        {assignment.targetTone && (
                          <span className="bg-white dark:bg-card px-2 py-1 rounded-md">
                            Tone: {assignment.targetTone}
                          </span>
                        )}
                      </div>
                      <Button
                        onClick={() => startRecording(assignment)}
                        className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-md shadow-pink-300/30"
                      >
                        <MicIcon className="w-4 h-4 mr-2" />
                        {uiText.voice?.record_label || "Practice"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Feedback */}
            <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border border-pink-200/50 dark:border-pink-500/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center shadow-md">
                  <TrendingUpIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Recent Feedback
                </h2>
              </div>

              {scores.length === 0 ? (
                <EmptyState
                  icon={TrendingUpIcon}
                  title="No scores yet"
                  description="Practice to get feedback on your voice!"
                />
              ) : (
                <div className="space-y-4">
                  {[...scores]
                    .reverse()
                    .slice(0, 5)
                    .map((score) => (
                      <div
                        key={score.id}
                        className="bg-gradient-to-r from-pink-50 to-pink-100/50 dark:from-pink-900/20 dark:to-pink-800/10 rounded-xl p-4 border border-pink-200/50 dark:border-pink-500/20"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                              {score.overallScore}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground bg-white dark:bg-card px-2 py-1 rounded-md">
                            {new Date(score.date).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "Pitch", value: score.breakdown.pitch },
                            {
                              label: "Intonation",
                              value: score.breakdown.intonation,
                            },
                            {
                              label: "Resonance",
                              value: score.breakdown.resonance,
                            },
                            {
                              label: "Naturalness",
                              value: score.breakdown.naturalness,
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="bg-white/80 dark:bg-card/80 rounded-lg p-2"
                            >
                              <div className="text-xs text-muted-foreground mb-1">
                                {item.label}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-pink-100 dark:bg-pink-900/30 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      item.value >= 70
                                        ? "bg-green-500"
                                        : item.value >= 40
                                          ? "bg-yellow-500"
                                          : "bg-pink-500",
                                    )}
                                    style={{ width: `${item.value}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-foreground w-8 text-right">
                                  {item.value}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 rounded-2xl p-5 border border-pink-200/50 dark:border-pink-500/20 mt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <MicIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  About Voice Training
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Voice training helps you develop and refine your vocal
                  characteristics. The analyzer measures pitch (frequency),
                  resonance (brightness), intonation (melody), and naturalness
                  (stability). Use &quot;Dry Run&quot; mode to practice with the
                  visualizer without saving scores. Ask the Voice Coach for
                  personalized exercises!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
