import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * Audio script to be converted to audio
 */
export interface AudioScript {
  title: string;
  script: string;
  filename?: string;
}

/**
 * Progress event payload from the Rust TTS backend
 */
export interface TtsProgressEvent {
  job_id: string;
  message: string;
  progress: number;
  stage: "start" | "download" | "generate" | "write" | "complete";
}

/**
 * Listener for TTS progress events
 */
export type TtsProgressListener = (event: TtsProgressEvent) => void;

/**
 * Generate audio from an AudioScript using the Rust TTS backend.
 * This will automatically download model and voice files if they don't exist.
 *
 * @param script - The audio script containing title, script content, and optional filename
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to the AudioScript with the filename populated
 */
export async function generateAudio(
  script: AudioScript,
  onProgress?: TtsProgressListener,
): Promise<AudioScript> {
  let unlisten: UnlistenFn | undefined;

  if (onProgress) {
    unlisten = await listen<TtsProgressEvent>("tts-progress", (event) => {
      onProgress(event.payload);
    });
  }

  try {
    const result = await invoke<AudioScript>("generate_audio", { script });
    return result;
  } finally {
    if (unlisten) {
      unlisten();
    }
  }
}

/**
 * Subscribe to all TTS progress events.
 * Returns an unsubscribe function.
 */
export async function subscribeTtsProgress(
  listener: TtsProgressListener,
): Promise<UnlistenFn> {
  return listen<TtsProgressEvent>("tts-progress", (event) => {
    listener(event.payload);
  });
}

/**
 * Sound effects available in the TTS system
 */
export const soundEffects = {
  beep: "beep",
  pop: "pop",
  bubble_pop: "bubble_pop",
  camera_shutter: "camera_shutter",
  censor_beep: "censor_beep",
  heart_beat: "heart_beat",
  padlock: "padlock",
  snap: "snap",
} as const;

/**
 * Voices available in the TTS system
 */
export const voices = {
  female: "female",
  female2: "female2",
  male: "male",
  male2: "male2",
} as const;

/**
 * Binaural beat presets
 */
export const binauralPresets = {
  delta: "delta", // 2 Hz offset - deep sleep
  theta: "theta", // 6 Hz offset - meditation
  alpha: "alpha", // 10 Hz offset - relaxation
  beta: "beta", // 20 Hz offset - focus
  gamma: "gamma", // 40 Hz offset - high cognition
} as const;

/**
 * Echo effect presets
 */
export const echoPresets = {
  light: "light",
  medium: "medium",
  heavy: "heavy",
} as const;

/**
 * Build an XML script string from components.
 * Helper for constructing audio scripts programmatically.
 */
export class ScriptBuilder {
  private content: string[] = [];

  /** Add raw text to be spoken */
  text(text: string): this {
    this.content.push(text);
    return this;
  }

  /** Add a pause in seconds */
  pause(seconds: number): this {
    this.content.push(`<pause value="${seconds}"></pause>`);
    return this;
  }

  /** Add a sound effect */
  sound(effect: keyof typeof soundEffects): this {
    this.content.push(`<sound value="${effect}"></sound>`);
    return this;
  }

  /** Wrap content in a voice tag */
  voice(voiceKey: keyof typeof voices, content: string | ScriptBuilder): this {
    const inner = content instanceof ScriptBuilder ? content.build() : content;
    this.content.push(`<voice value="${voiceKey}">${inner}</voice>`);
    return this;
  }

  /** Wrap content in a speed tag */
  speed(value: number, content: string | ScriptBuilder): this {
    const inner = content instanceof ScriptBuilder ? content.build() : content;
    this.content.push(`<speed value="${value}">${inner}</speed>`);
    return this;
  }

  /** Wrap content in a volume tag */
  volume(value: number, content: string | ScriptBuilder): this {
    const inner = content instanceof ScriptBuilder ? content.build() : content;
    this.content.push(`<volume value="${value}">${inner}</volume>`);
    return this;
  }

  /** Wrap content in an effect tag */
  effect(
    effectName: "echo" | "binaural",
    content: string | ScriptBuilder,
    options?: {
      preset?: string;
      options?: Record<string, number>;
    },
  ): this {
    const inner = content instanceof ScriptBuilder ? content.build() : content;
    let attrs = `value="${effectName}"`;
    if (options?.preset) {
      attrs += ` preset="${options.preset}"`;
    }
    if (options?.options) {
      attrs += ` options='${JSON.stringify(options.options)}'`;
    }
    this.content.push(`<effect ${attrs}>${inner}</effect>`);
    return this;
  }

  /** Loop content multiple times */
  loop(times: number, content: string | ScriptBuilder): this {
    const inner = content instanceof ScriptBuilder ? content.build() : content;
    this.content.push(`<loop value="${times}">${inner}</loop>`);
    return this;
  }

  /** Overlay multiple parts to play simultaneously */
  overlay(parts: (string | ScriptBuilder)[]): this {
    const partStrings = parts.map((p) => {
      const inner = p instanceof ScriptBuilder ? p.build() : p;
      return `<part>${inner}</part>`;
    });
    this.content.push(`<overlay>${partStrings.join("")}</overlay>`);
    return this;
  }

  /** Build the final script string */
  build(): string {
    return this.content.join("");
  }

  /** Create a new ScriptBuilder */
  static create(): ScriptBuilder {
    return new ScriptBuilder();
  }
}
