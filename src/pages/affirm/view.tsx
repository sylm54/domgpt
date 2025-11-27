import { Button } from "@/components/ui/button";
import { Response } from "@/components/ui/shadcn-io/ai/response";
import { useEffect, useRef, useState, useId } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { loadAudio, type AffirmAudio } from "./types";
import { generateAudio } from "@/lib/tts/tts";
import { loadStats, recordListen, type AffirmStats } from "./stats";
import type { ChatMessage } from "@/lib/models";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { affirm_agent } from "@/agents/agents";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useConfig } from "@/contexts/ConfigContext";
import {
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SparklesIcon,
  MessageSquareIcon,
  MusicIcon,
  DownloadIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  RefreshCwIcon,
  FlameIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LoadedAudio = {
  meta: AffirmAudio;
  url?: string;
  error?: string;
};

export default function AffirmView() {
  const { uiText } = useConfig();
  const mainId = useId();
  const promptId = useId();

  const [items, setItems] = useState<LoadedAudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<AffirmStats>({
    fileStats: {},
    global: { streak: 0, lastStreakDate: "" },
  });

  // Dialog + agent prompt state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  // Player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Load metadata from localStorage then create asset URLs using convertFileSrc
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        // Load stats first
        setStats(loadStats());

        const metas = loadAudio();
        if (!metas || metas.length === 0) {
          if (mounted) setItems([]);
          return;
        }

        // Get the AppData directory path
        const appData = await appDataDir();

        const loaded: LoadedAudio[] = [];

        for (const meta of metas) {
          if (!meta?.filename) {
            loaded.push({
              meta,
              error: `Missing file`,
            });
            continue;
          }
          try {
            // Build the full file path and convert to asset URL
            const fullPath = `${appData}/${meta.filename}`;
            const url = convertFileSrc(fullPath);

            loaded.push({
              meta,
              url,
            });
          } catch (e) {
            loaded.push({
              meta,
              error: `Unable to load ${meta.filename}`,
            });
            console.warn("Failed to create asset URL for", meta.filename, e);
          }
        }

        if (mounted) {
          setItems(loaded);
        }
      } catch (e) {
        console.error("Failed to load audio metadata", e);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Wire up audio element events
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTimeUpdate = () => {
      setCurrentTime(el.currentTime || 0);
    };
    const onLoadedMeta = () => {
      setDuration(el.duration || 0);
    };
    const onEnded = () => {
      setIsPlaying(false);
      // Record listen stats
      if (selectedIndex !== null && items[selectedIndex]?.meta.filename) {
        const newStats = recordListen(items[selectedIndex].meta.filename!);
        setStats(newStats);
      }
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMeta);
    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMeta);
      el.removeEventListener("ended", onEnded);
    };
  }, [selectedIndex, items]);

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAndPlay = (index: number) => {
    const item = items[index];
    if (!item || !item.url) return;

    // If another track is selected, pause and switch
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = item.url;
      // Reset progress state before play
      setCurrentTime(0);
      setDuration(0);
    }

    setSelectedIndex(index);

    // Give browser a tick to set src before play
    requestAnimationFrame(async () => {
      try {
        if (audioRef.current) {
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } catch {
        setIsPlaying(false);
      }
    });
  };

  const handlePlayPause = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    audioRef.current.currentTime = pct * duration;
    setCurrentTime(audioRef.current.currentTime);
  };

  const playPrev = () => {
    if (selectedIndex === null) return;
    const prev = selectedIndex - 1;
    if (prev >= 0) selectAndPlay(prev);
  };

  const playNext = () => {
    if (selectedIndex === null) return;
    const next = selectedIndex + 1;
    if (next < items.length) selectAndPlay(next);
  };

  const formatTime = (t: number) => {
    if (!Number.isFinite(t) || t <= 0) return "0:00";
    const sec = Math.floor(t % 60)
      .toString()
      .padStart(2, "0");
    const min = Math.floor(t / 60).toString();
    return `${min}:${sec}`;
  };

  // Focus the textarea when the dialog opens
  useEffect(() => {
    if (dialogOpen) {
      const id = window.setTimeout(() => {
        try {
          promptRef.current?.focus();
        } catch {}
      }, 50);
      return () => clearTimeout(id);
    }
  }, [dialogOpen]);

  return (
    <PageLayout>
      <PageHeader
        title={uiText.affirm?.title || "Affirmations"}
        subtitle={
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <MusicIcon className="w-4 h-4" />
              {items.length} audio{items.length !== 1 ? "s" : ""}
            </span>
            {stats.global.streak > 0 && (
              <span className="flex items-center gap-1">
                <FlameIcon className="w-4 h-4" />
                {stats.global.streak}{" "}
                {uiText.affirm?.streak_label || "Day Streak"}
              </span>
            )}
          </div>
        }
        action={
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                try {
                  affirm_agent.context.conversation = [];
                  affirm_agent.context.in_progress = undefined;
                } catch {
                  // ignore errors
                }
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-white text-pink-600 hover:bg-white/90 font-semibold shadow-md">
                <MessageSquareIcon className="w-4 h-4 mr-2" />
                {uiText.affirm?.prompt_agent_label || "Prompt Agent"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Prompt Affirm Agent</DialogTitle>
                <DialogDescription>
                  Send a prompt directly to the affirm agent and view its
                  response. Keep prompts concise.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4">
                <label className="sr-only" htmlFor="agent-prompt">
                  Agent prompt
                </label>
                <Textarea
                  id={promptId}
                  ref={promptRef}
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="Ask the affirm agent something like: 'Generate a short morning affirmation about confidence.'"
                  aria-label="Agent prompt"
                  className="bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl"
                />
              </div>

              <DialogFooter>
                <div className="mr-auto text-sm text-pink-500 font-medium">
                  {agentLoading ? "Thinking…" : ""}
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
                      await affirm_agent.act(msg);
                      const conv = affirm_agent.context.conversation;
                      const lastAssistant = [...conv]
                        .reverse()
                        .find((m) => m.type === "assistant") as any;
                      const text =
                        lastAssistant?.content
                          ?.filter((c: any) => c.type === "text")
                          .map((c: any) => c.text)
                          .join("") ?? "No response";
                      setAgentResponse(text);
                    } catch (e: any) {
                      setAgentResponse(
                        "Error while contacting agent: " +
                          (e?.toString?.() ?? String(e)),
                      );
                    } finally {
                      setAgentLoading(false);
                    }
                  }}
                  disabled={agentLoading}
                  className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold rounded-xl"
                >
                  {agentLoading ? "Send…" : "Send"}
                </Button>

                <DialogClose asChild>
                  <Button
                    variant="outline"
                    className="border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl"
                  >
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>

              {agentResponse ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-4 max-h-64 overflow-auto bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4 border border-pink-200 dark:border-pink-500/30"
                >
                  <Response className="prose max-w-full">
                    {agentResponse}
                  </Response>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        }
      />

      {/* Main content area */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-32"
        id={mainId}
      >
        <div className="max-w-4xl mx-auto">
          {/* Streak Card */}
          {stats.global.streak > 0 && (
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl p-5 sm:p-6 shadow-lg shadow-pink-300/30 dark:shadow-pink-900/30 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FlameIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">
                    {stats.global.streak} Day Streak
                  </h3>
                  <p className="text-white/80 text-sm mt-0.5">
                    Keep listening daily to maintain your streak!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Audio List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-3 border-pink-500 border-t-transparent rounded-full" />
              <span className="ml-3 text-muted-foreground font-medium">
                Loading audio files…
              </span>
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={MusicIcon}
              title={uiText.affirm?.no_audio || "No affirmation audio yet"}
              description="Ask your AI assistant to create affirmation audio for you."
            />
          ) : (
            <div className="space-y-4">
              {items.map((it, idx) => {
                const key = it.meta.filename;
                const safeKey = key ?? `item-${idx}`;
                const isExpanded = Boolean(expanded[safeKey]);
                const isSelected = selectedIndex === idx;
                const fileStat = it.meta.filename
                  ? stats.fileStats[it.meta.filename]
                  : undefined;
                const listenCount = fileStat?.listenCount ?? 0;

                return (
                  <div
                    key={safeKey}
                    className={cn(
                      "bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border transition-all duration-200 hover:shadow-xl",
                      isSelected
                        ? "border-pink-400/50 dark:border-pink-400/30 ring-2 ring-pink-400/20"
                        : "border-pink-200/50 dark:border-pink-500/20 hover:border-pink-300/50",
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-lg text-foreground">
                            {it.meta.title}
                          </h3>
                          {listenCount > 0 && (
                            <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-100 to-pink-200 dark:from-pink-900/40 dark:to-pink-800/40 text-pink-600 dark:text-pink-400">
                              {listenCount} play{listenCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                          {it.meta.filename}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {it.error ? (
                          <span className="text-sm text-red-500 font-medium">
                            {it.error}
                          </span>
                        ) : null}

                        <Button
                          onClick={() => toggleExpanded(safeKey)}
                          variant="outline"
                          size="sm"
                          aria-expanded={isExpanded}
                          aria-controls={`desc-${safeKey}`}
                          className="border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUpIcon className="w-4 h-4 mr-1" />
                              Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDownIcon className="w-4 h-4 mr-1" />
                              Expand
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={() => {
                            const m = { ...it.meta };
                            m.filename = undefined;
                            generateAudio(m);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl"
                        >
                          <RefreshCwIcon className="w-4 h-4 mr-1" />
                          Rerender
                        </Button>
                        <Button
                          onClick={() => {
                            const m = { ...it.meta };
                            m.script = undefined;
                            generateAudio(m);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-500/30 dark:hover:bg-pink-900/20 rounded-xl"
                        >
                          <RefreshCwIcon className="w-4 h-4 mr-1" />
                          Regenerate
                        </Button>

                        {it.url ? (
                          <>
                            <Button
                              onClick={() => selectAndPlay(idx)}
                              size="sm"
                              className={cn(
                                "rounded-xl font-semibold shadow-md",
                                isSelected && isPlaying
                                  ? "bg-green-500 hover:bg-green-600 text-white"
                                  : "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-pink-300/30",
                              )}
                              aria-label={`Play ${it.meta.title} in player`}
                            >
                              <PlayIcon className="w-4 h-4" />
                              {/*{isSelected && isPlaying
                                ? "Playing"
                                : uiText.affirm?.play_label || "Play"}*/}
                            </Button>

                            <a
                              className="inline-flex items-center px-3 py-2 text-sm border border-pink-200 dark:border-pink-500/30 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors font-medium"
                              href={it.url}
                              download={it.meta.filename}
                            >
                              <DownloadIcon className="w-4 h-4" />
                              {/*{uiText.affirm?.download_label || "Download"}*/}
                            </a>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Expandable description area */}
                    <div
                      id={`desc-${safeKey}`}
                      className={cn(
                        "transition-all duration-300 ease-in-out overflow-hidden",
                        isExpanded ? "max-h-[40rem] mt-4" : "max-h-0",
                      )}
                    >
                      {isExpanded && it.url ? (
                        <div className="bg-gradient-to-r from-pink-50 to-pink-100/50 dark:from-pink-900/20 dark:to-pink-800/10 rounded-xl p-4 border border-pink-200/50 dark:border-pink-500/20 overflow-auto h-32">
                          <Response className="prose max-w-full text-sm">
                            {it.meta.summary}
                          </Response>
                        </div>
                      ) : isExpanded && it.error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-500/30">
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                            {it.error}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info Card */}
          {items.length > 0 && (
            <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 rounded-2xl p-5 border border-pink-200/50 dark:border-pink-500/20 mt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    About Affirmations
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Affirmations are personalized audio created by your AI
                    assistant to help reinforce positive thoughts and beliefs.
                    Listen daily to build your streak and establish a positive
                    mindset routine. Use the "Prompt Agent" button to request
                    new affirmations!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Persistent bottom player */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 backdrop-blur-xl px-4 sm:px-6 py-4 shadow-2xl z-40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          {/* Track info */}
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            {selectedIndex === null ? (
              <div className="text-sm text-white/80 italic text-center sm:text-left">
                Select a track to start listening
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0 text-center sm:text-left">
                  <div className="font-bold text-white truncate">
                    {items[selectedIndex]?.meta.title}
                  </div>
                  <div className="text-xs text-white/70 truncate">
                    {items[selectedIndex]?.meta.filename}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Button
                    onClick={playPrev}
                    aria-label="Previous track"
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
                  >
                    <SkipBackIcon className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={handlePlayPause}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    type="button"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-white text-pink-600 hover:bg-white/90 shadow-lg transition-all"
                  >
                    {isPlaying ? (
                      <PauseIcon className="w-5 h-5" />
                    ) : (
                      <PlayIcon className="w-5 h-5 ml-0.5" />
                    )}
                  </Button>
                  <Button
                    onClick={playNext}
                    aria-label="Next track"
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
                  >
                    <SkipForwardIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Progress bar */}
            <div className="mt-3">
              <div
                className="h-2 bg-white/30 rounded-full cursor-pointer overflow-hidden relative group"
                onClick={handleSeek}
                role="presentation"
                aria-label="Seek"
              >
                <div
                  className="h-full bg-white rounded-full relative transition-all"
                  style={{
                    width:
                      duration > 0 && selectedIndex !== null
                        ? `${Math.min(100, (currentTime / duration) * 100)}%`
                        : "0%",
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-white/70 mt-1.5">
                <div>{formatTime(currentTime)}</div>
                <div>{formatTime(duration)}</div>
              </div>
            </div>
          </div>

          {/* Hidden single audio element used by the bottom player */}
          <audio ref={audioRef} className="hidden" />
        </div>
      </div>
    </PageLayout>
  );
}
