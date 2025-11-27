import { useState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LockIcon, UnlockIcon, ClockIcon, ShieldIcon } from "lucide-react";
import type { SafeData } from "./types";
import {
  loadSafeData,
  saveSafeData,
  lockSafe,
  isSafeLocked,
  getLockedDuration,
  formatLockedDuration,
} from "./types";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { useConfig } from "@/contexts/ConfigContext";

export default function SafeView() {
  const { uiText } = useConfig();
  const [data, setData] = useState<SafeData>({
    key: null,
    lockedAt: null,
    isLocked: false,
  });
  const [inputKey, setInputKey] = useState("");
  const [currentDuration, setCurrentDuration] = useState<string>("");

  const keyInputId = useId();
  const mainId = useId();

  useEffect(() => {
    const loaded = loadSafeData();
    setData(loaded);
  }, []);

  useEffect(() => {
    if (!data.isLocked) {
      setCurrentDuration("");
      return;
    }

    const updateDuration = () => {
      const duration = getLockedDuration(data);
      if (duration !== null) {
        setCurrentDuration(formatLockedDuration(duration));
      }
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [data]);

  const handleLock = () => {
    if (!inputKey.trim()) {
      alert("Please enter a key to lock");
      return;
    }

    try {
      const locked = lockSafe(inputKey);
      setData(locked);
      saveSafeData(locked);
      setInputKey("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to lock safe");
    }
  };

  const isLocked = isSafeLocked(data);

  return (
    <PageLayout>
      <PageHeader
        title={uiText.safe?.title || "Safe"}
        subtitle={
          isLocked
            ? uiText.safe?.locked_subtitle || "Locked - Only AI can unlock"
            : uiText.safe?.unlocked_subtitle || "Unlocked"
        }
      />

      {/* Safe Content */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-32"
        id={mainId}
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-pink-200/50 dark:border-pink-500/20">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Lock Icon */}
              <div
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                  isLocked
                    ? "bg-gradient-to-br from-pink-500 to-pink-600 shadow-pink-300/40"
                    : "bg-gradient-to-br from-green-400 to-green-500 shadow-green-300/40"
                }`}
              >
                {isLocked ? (
                  <LockIcon className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
                ) : (
                  <UnlockIcon className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
                )}
              </div>

              {/* Status */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">
                  {isLocked
                    ? uiText.safe?.title + " is Locked"
                    : uiText.safe?.title + " is Unlocked"}
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base max-w-md leading-relaxed">
                  {isLocked
                    ? uiText.safe?.locked_desc ||
                      "Your key is safely locked. Only the AI assistant can unlock it."
                    : uiText.safe?.unlocked_desc ||
                      "You can lock a key in the safe. Once locked, only the AI assistant can retrieve it."}
                </p>
              </div>

              {/* Timer */}
              {isLocked && currentDuration && (
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/50 dark:to-pink-900/30 rounded-2xl p-5 w-full border border-pink-200/50 dark:border-pink-500/20">
                  <div className="flex items-center justify-center gap-2 text-pink-600 dark:text-pink-400 mb-2">
                    <ClockIcon className="w-5 h-5" />
                    <span className="text-sm font-semibold uppercase tracking-wide">
                      {uiText.safe?.locked_duration_label || "Locked Duration"}
                    </span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">
                    {currentDuration}
                  </p>
                </div>
              )}

              {/* Input Section (only when unlocked) */}
              {!isLocked && (
                <div className="w-full space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor={keyInputId}
                      className="block text-sm font-semibold text-left text-foreground"
                    >
                      {uiText.safe?.enter_key_label || "Enter Key to Lock"}
                    </label>
                    <Textarea
                      id={keyInputId}
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder={
                        uiText.safe?.placeholder ||
                        "Enter your key here (e.g., password, secret, code)..."
                      }
                      className="min-h-[120px] resize-y bg-white dark:bg-card border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl"
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground text-left">
                      {inputKey.length}/1000 characters
                    </p>
                  </div>
                  <Button
                    onClick={handleLock}
                    disabled={!inputKey.trim()}
                    className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-xl shadow-lg shadow-pink-300/30 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
                    size="lg"
                  >
                    <LockIcon className="w-5 h-5 mr-2" />
                    {uiText.safe?.lock_label || "Lock Safe"}
                  </Button>
                </div>
              )}

              {/* Locked Message */}
              {isLocked && (
                <div className="w-full space-y-4">
                  <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 border-l-4 border-pink-500 rounded-r-xl p-4 text-left">
                    <div className="flex items-start gap-3">
                      <ShieldIcon className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-pink-700 dark:text-pink-400 mb-1">
                          Safe is Locked
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Your key has been secured. Only your AI assistant can
                          unlock the safe and retrieve the key. You cannot
                          unlock it manually.
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Ask your AI assistant to unlock the safe when you need
                    access to your key.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="bg-white/60 dark:bg-card/60 backdrop-blur-sm rounded-xl p-4 border border-pink-200/30 dark:border-pink-500/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <ShieldIcon className="w-5 h-5 text-pink-500" />
                </div>
                <h3 className="font-semibold text-foreground">
                  Secure Storage
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your key is encrypted and stored locally. Only you and your AI
                assistant can access it.
              </p>
            </div>
            <div className="bg-white/60 dark:bg-card/60 backdrop-blur-sm rounded-xl p-4 border border-pink-200/30 dark:border-pink-500/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <LockIcon className="w-5 h-5 text-pink-500" />
                </div>
                <h3 className="font-semibold text-foreground">AI Controlled</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Once locked, only the AI can unlock it. This helps with
                self-control and accountability.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
