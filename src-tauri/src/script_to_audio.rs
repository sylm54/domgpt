//! Script-to-Audio converter module
//! Rewrite of tts.ts in Rust using kuchiki for HTML/XML parsing and dasp for audio processing

#![allow(dead_code)]

use anyhow::{Context, Result};
use hound::{SampleFormat, WavReader, WavSpec};
use kuchiki::traits::TendrilSink;
use kuchiki::NodeRef;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Cursor;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Emitter, Manager};

use crate::ttslib::{load_cfgs, load_voice_style, Style, TextToSpeech, UnicodeProcessor};

// ============================================================================
// Constants and Configuration
// ============================================================================

const SAMPLE_RATE: u32 = 24000;
const MODEL_REPO: &str = "https://huggingface.co/Supertone/supertonic/resolve/main";

// ============================================================================
// Embedded Sound Effects
// ============================================================================

static SOUND_BEEP_LOW_HIGH: &[u8] = include_bytes!("sounds/beep_low_high.wav");
static SOUND_POP: &[u8] = include_bytes!("sounds/pop.wav");
static SOUND_BUBBLE_POP: &[u8] = include_bytes!("sounds/bubble_pop.wav");
static SOUND_CAMERA_SHUTTER: &[u8] = include_bytes!("sounds/camera_shutter.wav");
static SOUND_CENSOR_BEEP: &[u8] = include_bytes!("sounds/censor_beep.wav");
static SOUND_HEART_BEAT: &[u8] = include_bytes!("sounds/heart_beat.wav");
static SOUND_PADLOCK: &[u8] = include_bytes!("sounds/padlock.wav");
static SOUND_SNAP: &[u8] = include_bytes!("sounds/snap.wav");

/// Get embedded sound effect bytes by key
fn get_embedded_sound(key: &str) -> Option<&'static [u8]> {
    match key {
        "beep" => Some(SOUND_BEEP_LOW_HIGH),
        "pop" => Some(SOUND_POP),
        "bubble_pop" => Some(SOUND_BUBBLE_POP),
        "camera_shutter" => Some(SOUND_CAMERA_SHUTTER),
        "censor_beep" => Some(SOUND_CENSOR_BEEP),
        "heart_beat" => Some(SOUND_HEART_BEAT),
        "padlock" => Some(SOUND_PADLOCK),
        "snap" => Some(SOUND_SNAP),
        _ => None,
    }
}

/// Sound effects mapping (key -> filename) - kept for reference
fn get_sound_effects() -> HashMap<&'static str, &'static str> {
    let mut map = HashMap::new();
    map.insert("beep", "beep_low_high.wav");
    map.insert("pop", "pop.wav");
    map.insert("bubble_pop", "bubble_pop.wav");
    map.insert("camera_shutter", "camera_shutter.wav");
    map.insert("censor_beep", "censor_beep.wav");
    map.insert("heart_beat", "heart_beat.wav");
    map.insert("padlock", "padlock.wav");
    map.insert("snap", "snap.wav");
    map
}

/// Voice mapping (key -> voice file)
fn get_voices() -> HashMap<&'static str, &'static str> {
    let mut map = HashMap::new();
    map.insert("female", "F1.json");
    map.insert("female2", "F2.json");
    map.insert("male", "M1.json");
    map.insert("male2", "M2.json");
    map
}

// ============================================================================
// Progress Event Types
// ============================================================================

#[derive(Clone, Serialize)]
pub struct TtsProgressEvent {
    pub job_id: String,
    pub message: String,
    pub progress: f32,
    pub stage: String,
}

// ============================================================================
// Effect Options and Presets
// ============================================================================

#[derive(Clone, Debug, Default)]
pub struct EffectOptions {
    // Echo options
    pub delay: Option<f32>,
    pub decay: Option<f32>,
    pub repeats: Option<u32>,
    // Binaural options
    pub hz: Option<f32>,
    pub offset: Option<f32>,
    pub amplitude: Option<f32>,
    pub fade_ms: Option<f32>,
    // Pan options (-1.0 = full left, 0.0 = center, 1.0 = full right)
    pub pan: Option<f32>,
}

impl EffectOptions {
    pub fn from_json(json: &str) -> Self {
        #[derive(Deserialize, Default)]
        struct Opts {
            delay: Option<f32>,
            decay: Option<f32>,
            repeats: Option<u32>,
            hz: Option<f32>,
            offset: Option<f32>,
            amplitude: Option<f32>,
            #[serde(rename = "fadeMs")]
            fade_ms: Option<f32>,
            pan: Option<f32>,
        }

        let opts: Opts = serde_json::from_str(json).unwrap_or_default();
        EffectOptions {
            delay: opts.delay,
            decay: opts.decay,
            repeats: opts.repeats,
            hz: opts.hz,
            offset: opts.offset,
            amplitude: opts.amplitude,
            fade_ms: opts.fade_ms,
            pan: opts.pan,
        }
    }

    pub fn merge(&self, other: &EffectOptions) -> EffectOptions {
        EffectOptions {
            delay: other.delay.or(self.delay),
            decay: other.decay.or(self.decay),
            repeats: other.repeats.or(self.repeats),
            hz: other.hz.or(self.hz),
            offset: other.offset.or(self.offset),
            amplitude: other.amplitude.or(self.amplitude),
            fade_ms: other.fade_ms.or(self.fade_ms),
            pan: other.pan.or(self.pan),
        }
    }
}

fn get_binaural_presets() -> HashMap<&'static str, EffectOptions> {
    let mut map = HashMap::new();
    map.insert(
        "delta",
        EffectOptions {
            hz: Some(400.0),
            offset: Some(2.0),
            ..Default::default()
        },
    );
    map.insert(
        "theta",
        EffectOptions {
            hz: Some(400.0),
            offset: Some(6.0),
            ..Default::default()
        },
    );
    map.insert(
        "alpha",
        EffectOptions {
            hz: Some(400.0),
            offset: Some(10.0),
            ..Default::default()
        },
    );
    map.insert(
        "beta",
        EffectOptions {
            hz: Some(400.0),
            offset: Some(20.0),
            ..Default::default()
        },
    );
    map.insert(
        "gamma",
        EffectOptions {
            hz: Some(400.0),
            offset: Some(40.0),
            ..Default::default()
        },
    );
    map
}

fn get_echo_presets() -> HashMap<&'static str, EffectOptions> {
    let mut map = HashMap::new();
    map.insert(
        "light",
        EffectOptions {
            delay: Some(0.1),
            decay: Some(0.3),
            repeats: Some(2),
            ..Default::default()
        },
    );
    map.insert(
        "medium",
        EffectOptions {
            delay: Some(0.2),
            decay: Some(0.5),
            repeats: Some(3),
            ..Default::default()
        },
    );
    map.insert(
        "heavy",
        EffectOptions {
            delay: Some(0.2),
            decay: Some(0.6),
            repeats: Some(4),
            ..Default::default()
        },
    );
    map
}

fn get_pan_presets() -> HashMap<&'static str, EffectOptions> {
    let mut map = HashMap::new();
    map.insert(
        "left",
        EffectOptions {
            pan: Some(-1.0),
            ..Default::default()
        },
    );
    map.insert(
        "right",
        EffectOptions {
            pan: Some(1.0),
            ..Default::default()
        },
    );
    map
}

// ============================================================================
// Audio Buffer Implementation
// ============================================================================

#[derive(Clone)]
pub struct AudioBuffer {
    pub samples: Vec<Vec<f32>>, // channels x samples
    pub sample_rate: u32,
}

impl AudioBuffer {
    pub fn new(channels: usize, length: usize, sample_rate: u32) -> Self {
        AudioBuffer {
            samples: vec![vec![0.0; length]; channels],
            sample_rate,
        }
    }

    pub fn from_mono(data: Vec<f32>, sample_rate: u32) -> Self {
        AudioBuffer {
            samples: vec![data],
            sample_rate,
        }
    }

    pub fn from_stereo(left: Vec<f32>, right: Vec<f32>, sample_rate: u32) -> Self {
        AudioBuffer {
            samples: vec![left, right],
            sample_rate,
        }
    }

    pub fn num_channels(&self) -> usize {
        self.samples.len()
    }

    pub fn length(&self) -> usize {
        self.samples.first().map(|c| c.len()).unwrap_or(0)
    }

    pub fn get_channel_data(&self, channel: usize) -> &[f32] {
        &self.samples[channel]
    }

    pub fn get_channel_data_mut(&mut self, channel: usize) -> &mut [f32] {
        &mut self.samples[channel]
    }

    /// Create silence buffer
    pub fn silence(duration_secs: f32, sample_rate: u32) -> Self {
        let length = (duration_secs * sample_rate as f32) as usize;
        AudioBuffer::new(1, length, sample_rate)
    }

    /// Concatenate multiple audio buffers (resamples to first buffer's sample rate if needed)
    pub fn concat(buffers: &[AudioBuffer]) -> Result<AudioBuffer> {
        if buffers.is_empty() {
            return Ok(AudioBuffer::new(1, 1, SAMPLE_RATE));
        }

        // Use first buffer's sample rate as target
        let target_sample_rate = buffers[0].sample_rate;

        // Resample all buffers to the target sample rate
        let resampled: Vec<AudioBuffer> = buffers
            .iter()
            .map(|b| {
                if b.sample_rate != target_sample_rate {
                    b.resample(target_sample_rate)
                } else {
                    b.clone()
                }
            })
            .collect();

        let num_channels = resampled
            .iter()
            .map(|b| b.num_channels())
            .max()
            .unwrap_or(1);
        let total_length: usize = resampled.iter().map(|b| b.length()).sum();

        let mut result = AudioBuffer::new(num_channels, total_length, target_sample_rate);
        let mut offset = 0;

        for buffer in &resampled {
            for ch in 0..num_channels {
                let src_ch = ch.min(buffer.num_channels() - 1);
                let src_data = buffer.get_channel_data(src_ch);
                let dst_data = result.get_channel_data_mut(ch);
                for (i, &sample) in src_data.iter().enumerate() {
                    dst_data[offset + i] = sample;
                }
            }
            offset += buffer.length();
        }

        Ok(result)
    }

    /// Merge (mix) multiple audio buffers together (resamples to first buffer's sample rate if needed)
    pub fn merge(buffers: &[AudioBuffer]) -> Result<AudioBuffer> {
        if buffers.is_empty() {
            return Ok(AudioBuffer::new(1, 1, SAMPLE_RATE));
        }

        // Use first buffer's sample rate as target
        let target_sample_rate = buffers[0].sample_rate;

        // Resample all buffers to the target sample rate
        let resampled: Vec<AudioBuffer> = buffers
            .iter()
            .map(|b| {
                if b.sample_rate != target_sample_rate {
                    b.resample(target_sample_rate)
                } else {
                    b.clone()
                }
            })
            .collect();

        let num_channels = resampled
            .iter()
            .map(|b| b.num_channels())
            .max()
            .unwrap_or(1);
        let max_length = resampled.iter().map(|b| b.length()).max().unwrap_or(0);

        let mut result = AudioBuffer::new(num_channels, max_length, target_sample_rate);

        for buffer in &resampled {
            for ch in 0..num_channels {
                let src_ch = ch.min(buffer.num_channels() - 1);
                let src_data = buffer.get_channel_data(src_ch);
                let dst_data = result.get_channel_data_mut(ch);
                for (i, &sample) in src_data.iter().enumerate() {
                    let mixed = dst_data[i] + sample;
                    dst_data[i] = mixed.clamp(-1.0, 1.0);
                }
            }
        }

        Ok(result)
    }

    /// Convert to mono by averaging channels
    pub fn to_mono(&self) -> Vec<f32> {
        let len = self.length();
        let mut mono = vec![0.0; len];
        let num_channels = self.num_channels() as f32;

        for ch in 0..self.num_channels() {
            let data = self.get_channel_data(ch);
            for i in 0..len {
                mono[i] += data[i] / num_channels;
            }
        }

        mono
    }

    /// Write to WAV file
    pub fn write_to_file<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let spec = WavSpec {
            channels: self.num_channels() as u16,
            sample_rate: self.sample_rate,
            bits_per_sample: 16,
            sample_format: SampleFormat::Int,
        };

        let mut writer = hound::WavWriter::create(path, spec)?;
        let len = self.length();

        for i in 0..len {
            for ch in 0..self.num_channels() {
                let sample = self.samples[ch][i].clamp(-1.0, 1.0);
                let val = (sample * 32767.0) as i16;
                writer.write_sample(val)?;
            }
        }

        writer.finalize()?;
        Ok(())
    }

    /// Read from WAV file
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let reader = WavReader::open(path)?;
        let spec = reader.spec();
        let num_channels = spec.channels as usize;
        let sample_rate = spec.sample_rate;

        let samples: Vec<i16> = reader
            .into_samples::<i16>()
            .filter_map(|s| s.ok())
            .collect();

        let num_samples = samples.len() / num_channels;
        let mut channels = vec![vec![0.0f32; num_samples]; num_channels];

        for (i, sample) in samples.iter().enumerate() {
            let ch = i % num_channels;
            let idx = i / num_channels;
            channels[ch][idx] = *sample as f32 / 32768.0;
        }

        Ok(AudioBuffer {
            samples: channels,
            sample_rate,
        })
    }

    /// Read from WAV bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        let cursor = Cursor::new(bytes);
        let reader = WavReader::new(cursor)?;
        let spec = reader.spec();
        let num_channels = spec.channels as usize;
        let sample_rate = spec.sample_rate;
        let bits_per_sample = spec.bits_per_sample;

        let num_samples_total: usize;
        let mut channels: Vec<Vec<f32>>;

        match bits_per_sample {
            16 => {
                let samples: Vec<i16> = reader
                    .into_samples::<i16>()
                    .filter_map(|s| s.ok())
                    .collect();

                num_samples_total = samples.len() / num_channels;
                channels = vec![vec![0.0f32; num_samples_total]; num_channels];

                for (i, sample) in samples.iter().enumerate() {
                    let ch = i % num_channels;
                    let idx = i / num_channels;
                    channels[ch][idx] = *sample as f32 / 32768.0;
                }
            }
            24 => {
                let samples: Vec<i32> = reader
                    .into_samples::<i32>()
                    .filter_map(|s| s.ok())
                    .collect();

                num_samples_total = samples.len() / num_channels;
                channels = vec![vec![0.0f32; num_samples_total]; num_channels];

                for (i, sample) in samples.iter().enumerate() {
                    let ch = i % num_channels;
                    let idx = i / num_channels;
                    // 24-bit audio is stored in i32, max value is 2^23
                    channels[ch][idx] = *sample as f32 / 8388608.0;
                }
            }
            32 => {
                let samples: Vec<i32> = reader
                    .into_samples::<i32>()
                    .filter_map(|s| s.ok())
                    .collect();

                num_samples_total = samples.len() / num_channels;
                channels = vec![vec![0.0f32; num_samples_total]; num_channels];

                for (i, sample) in samples.iter().enumerate() {
                    let ch = i % num_channels;
                    let idx = i / num_channels;
                    channels[ch][idx] = *sample as f32 / 2147483648.0;
                }
            }
            _ => {
                // Fallback to 16-bit
                let samples: Vec<i16> = reader
                    .into_samples::<i16>()
                    .filter_map(|s| s.ok())
                    .collect();

                num_samples_total = samples.len() / num_channels;
                channels = vec![vec![0.0f32; num_samples_total]; num_channels];

                for (i, sample) in samples.iter().enumerate() {
                    let ch = i % num_channels;
                    let idx = i / num_channels;
                    channels[ch][idx] = *sample as f32 / 32768.0;
                }
            }
        }

        Ok(AudioBuffer {
            samples: channels,
            sample_rate,
        })
    }

    /// Resample audio buffer to a target sample rate using linear interpolation
    pub fn resample(&self, target_sample_rate: u32) -> Self {
        if self.sample_rate == target_sample_rate {
            return self.clone();
        }

        let ratio = self.sample_rate as f64 / target_sample_rate as f64;
        let new_length = ((self.length() as f64) / ratio).ceil() as usize;
        let num_channels = self.num_channels();

        let mut new_samples = vec![vec![0.0f32; new_length]; num_channels];

        for ch in 0..num_channels {
            let src = &self.samples[ch];
            let dst = &mut new_samples[ch];
            let src_len = src.len();

            for i in 0..new_length {
                let src_pos = i as f64 * ratio;
                let src_idx = src_pos as usize;
                let frac = src_pos - src_idx as f64;

                if src_idx + 1 < src_len {
                    // Linear interpolation between two samples
                    dst[i] = (src[src_idx] as f64 * (1.0 - frac) + src[src_idx + 1] as f64 * frac)
                        as f32;
                } else if src_idx < src_len {
                    dst[i] = src[src_idx];
                }
            }
        }

        AudioBuffer {
            samples: new_samples,
            sample_rate: target_sample_rate,
        }
    }
}

// ============================================================================
// Audio Effects
// ============================================================================

/// Apply echo effect to audio buffer
pub fn apply_echo(buffer: &AudioBuffer, options: &EffectOptions) -> AudioBuffer {
    let sample_rate = buffer.sample_rate;
    let delay_seconds = options.delay.unwrap_or(0.25);
    let decay = options.decay.unwrap_or(0.6);
    let repeats = options.repeats.unwrap_or(3) as usize;

    let delay_samples = (delay_seconds * sample_rate as f32) as usize;
    let new_length = buffer.length() + delay_samples * repeats;
    let mut out = AudioBuffer::new(buffer.num_channels(), new_length, sample_rate);

    for ch in 0..buffer.num_channels() {
        let in_data = buffer.get_channel_data(ch);
        let out_data = out.get_channel_data_mut(ch);

        // Copy original
        for (i, &sample) in in_data.iter().enumerate() {
            out_data[i] = sample;
        }

        // Add echoes
        for r in 1..=repeats {
            let attenuation = decay.powi(r as i32);
            let offset = r * delay_samples;
            for (i, &sample) in in_data.iter().enumerate() {
                let idx = i + offset;
                if idx < out_data.len() {
                    out_data[idx] += sample * attenuation;
                }
            }
        }

        // Clip to [-1, 1]
        for sample in out_data.iter_mut() {
            *sample = sample.clamp(-1.0, 1.0);
        }
    }

    out
}

/// Apply binaural beats effect to audio buffer
pub fn apply_binaural(buffer: &AudioBuffer, options: &EffectOptions) -> AudioBuffer {
    let sample_rate = buffer.sample_rate;
    let channels = buffer.num_channels();
    let len = buffer.length();

    let hz = options.hz.unwrap_or(200.0).max(1.0);
    let offset = options.offset.unwrap_or(4.0).max(0.0);
    let amplitude = options.amplitude.unwrap_or(0.08);
    let fade_ms = options.fade_ms.unwrap_or(10.0);
    let fade_samples = ((fade_ms / 1000.0) * sample_rate as f32).max(1.0) as usize;

    let f_left = hz - offset / 2.0;
    let f_right = hz + offset / 2.0;
    let two_pi = std::f32::consts::PI * 2.0;

    // Ensure stereo output for binaural effect
    let out_channels = if channels == 1 { 2 } else { channels };
    let mut out = AudioBuffer::new(out_channels, len, sample_rate);

    for ch in 0..out_channels {
        let in_ch = ch.min(channels - 1);
        let in_data = buffer.get_channel_data(in_ch);
        let out_data = out.get_channel_data_mut(ch);

        let tone_freq = if out_channels == 1 {
            f_left
        } else if ch == 0 {
            f_left
        } else {
            f_right
        };

        let phase_inc = (two_pi * tone_freq) / sample_rate as f32;
        let mut phase = 0.0f32;

        for i in 0..len {
            let sample = in_data.get(i).copied().unwrap_or(0.0);
            let mut tone = if channels == 1 && out_channels == 2 {
                // For mono input going to stereo, use appropriate channel's frequency
                let freq = if ch == 0 { f_left } else { f_right };
                amplitude * (two_pi * freq * i as f32 / sample_rate as f32).sin()
            } else {
                amplitude * phase.sin()
            };

            phase += phase_inc;
            if phase > two_pi {
                phase -= two_pi;
            }

            // Apply fade in/out
            if i < fade_samples {
                tone *= i as f32 / fade_samples as f32;
            } else if i > len - fade_samples {
                tone *= (len - i) as f32 / fade_samples as f32;
            }

            let mixed = sample + tone;
            out_data[i] = mixed.clamp(-1.0, 1.0);
        }
    }

    out
}

/// Apply pan effect to audio buffer (-1.0 = full left, 0.0 = center, 1.0 = full right)
pub fn apply_pan(buffer: &AudioBuffer, options: &EffectOptions) -> AudioBuffer {
    let sample_rate = buffer.sample_rate;
    let len = buffer.length();

    // Pan value: -1.0 = full left, 0.0 = center, 1.0 = full right
    let pan = options.pan.unwrap_or(0.0).clamp(-1.0, 1.0);

    // Calculate left and right gains using constant power panning
    // This maintains perceived loudness across the stereo field
    let angle = (pan + 1.0) * std::f32::consts::FRAC_PI_4; // 0 to PI/2
    let left_gain = angle.cos();
    let right_gain = angle.sin();

    // Ensure stereo output
    let mut out = AudioBuffer::new(2, len, sample_rate);

    // Get mono mix of input (or use existing channels)
    let mono_samples: Vec<f32> = if buffer.num_channels() == 1 {
        buffer.get_channel_data(0).to_vec()
    } else {
        // Mix down to mono
        let left = buffer.get_channel_data(0);
        let right = buffer.get_channel_data(1.min(buffer.num_channels() - 1));
        left.iter()
            .zip(right.iter())
            .map(|(l, r)| (l + r) * 0.5)
            .collect()
    };

    // Apply panning - use direct index access to avoid double mutable borrow
    for i in 0..len {
        let sample = mono_samples.get(i).copied().unwrap_or(0.0);
        out.samples[0][i] = (sample * left_gain).clamp(-1.0, 1.0);
        out.samples[1][i] = (sample * right_gain).clamp(-1.0, 1.0);
    }

    out
}

/// Apply volume scaling to audio buffer
pub fn apply_volume(buffer: &AudioBuffer, volume: f32) -> AudioBuffer {
    let mut out = buffer.clone();

    for ch in 0..out.num_channels() {
        let data = out.get_channel_data_mut(ch);
        for sample in data.iter_mut() {
            *sample = (*sample * volume).clamp(-1.0, 1.0);
        }
    }

    out
}

/// Trim silence from beginning and end of audio buffer
pub fn trim_silence(buffer: &AudioBuffer, threshold: f32, min_silence_ms: f32) -> AudioBuffer {
    let sample_rate = buffer.sample_rate;
    let min_samples = ((min_silence_ms / 1000.0) * sample_rate as f32).max(1.0) as usize;
    let channels = buffer.num_channels();
    let len = buffer.length();

    // Build per-sample max across channels
    let mut abs_max = vec![0.0f32; len];
    for ch in 0..channels {
        let data = buffer.get_channel_data(ch);
        for i in 0..len {
            let v = data[i].abs();
            if v > abs_max[i] {
                abs_max[i] = v;
            }
        }
    }

    // Find start position
    let find_start = || -> usize {
        for i in 0..=len.saturating_sub(min_samples) {
            let mut m = 0.0f32;
            for j in 0..min_samples {
                if i + j < len {
                    let v = abs_max[i + j];
                    if v > m {
                        m = v;
                    }
                }
            }
            if m > threshold {
                return i;
            }
        }
        len
    };

    // Find end position
    let find_end = || -> usize {
        for i in (0..=len.saturating_sub(min_samples)).rev() {
            let mut m = 0.0f32;
            for j in 0..min_samples {
                if i + j < len {
                    let v = abs_max[i + j];
                    if v > m {
                        m = v;
                    }
                }
            }
            if m > threshold {
                return i + min_samples;
            }
        }
        0
    };

    let start = find_start();
    let end = find_end();

    if start >= end {
        return AudioBuffer::new(1, 1, sample_rate);
    }

    let out_len = end - start;
    let mut out = AudioBuffer::new(channels, out_len, sample_rate);

    for ch in 0..channels {
        let in_data = buffer.get_channel_data(ch);
        let out_data = out.get_channel_data_mut(ch);
        for i in 0..out_len {
            out_data[i] = in_data[i + start];
        }
    }

    out
}

// ============================================================================
// Model and Voice Download
// ============================================================================

/// Download a file from URL to path with progress reporting
async fn download_file(
    client: &reqwest::Client,
    url: &str,
    path: &Path,
    app_handle: Option<&AppHandle>,
    job_id: &str,
    file_name: &str,
) -> Result<()> {
    use std::io::Write;

    let response = client.get(url).send().await?;

    if !response.status().is_success() {
        anyhow::bail!("Failed to download {}: HTTP {}", url, response.status());
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;

    // Create parent directories
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let mut file = File::create(path)?;
    let stream = response.bytes().await?;

    downloaded += stream.len() as u64;
    file.write_all(&stream)?;

    if let Some(handle) = app_handle {
        let progress = if total_size > 0 {
            downloaded as f32 / total_size as f32
        } else {
            1.0
        };
        let _ = handle.emit(
            "tts-progress",
            TtsProgressEvent {
                job_id: job_id.to_string(),
                message: format!("Downloaded {}", file_name),
                progress,
                stage: "download".to_string(),
            },
        );
    }

    Ok(())
}

/// Ensure model files are downloaded
pub async fn ensure_model_files(
    onnx_dir: &Path,
    app_handle: Option<&AppHandle>,
    job_id: &str,
) -> Result<()> {
    let model_files = [
        "duration_predictor.onnx",
        "text_encoder.onnx",
        "vector_estimator.onnx",
        "vocoder.onnx",
        "tts.json",
        "unicode_indexer.json",
    ];

    let client = reqwest::Client::new();

    for (i, file) in model_files.iter().enumerate() {
        let path = onnx_dir.join(file);
        if !path.exists() {
            let url = format!("{}/onnx/{}", MODEL_REPO, file);

            if let Some(handle) = app_handle {
                let _ = handle.emit(
                    "tts-progress",
                    TtsProgressEvent {
                        job_id: job_id.to_string(),
                        message: format!("Downloading model: {}", file),
                        progress: i as f32 / model_files.len() as f32,
                        stage: "download".to_string(),
                    },
                );
            }

            download_file(&client, &url, &path, app_handle, job_id, file).await?;
        }
    }

    Ok(())
}

/// Ensure voice style files are downloaded
pub async fn ensure_voice_files(
    voice_dir: &Path,
    app_handle: Option<&AppHandle>,
    job_id: &str,
) -> Result<()> {
    let voice_files = ["F1.json", "F2.json", "M1.json", "M2.json"];

    let client = reqwest::Client::new();

    for (i, file) in voice_files.iter().enumerate() {
        let path = voice_dir.join(file);
        if !path.exists() {
            let url = format!("{}/voice_styles/{}", MODEL_REPO, file);

            if let Some(handle) = app_handle {
                let _ = handle.emit(
                    "tts-progress",
                    TtsProgressEvent {
                        job_id: job_id.to_string(),
                        message: format!("Downloading voice: {}", file),
                        progress: i as f32 / voice_files.len() as f32,
                        stage: "download".to_string(),
                    },
                );
            }

            download_file(&client, &url, &path, app_handle, job_id, file).await?;
        }
    }

    Ok(())
}

// ============================================================================
// Script Parser and Audio Generator
// ============================================================================

pub struct ScriptToAudioContext {
    pub tts: TextToSpeech,
    pub current_speed: f32,
    pub current_voice: String,
    pub sample_rate: u32,
    pub onnx_dir: PathBuf,
    pub voice_dir: PathBuf,
    pub sound_effects_dir: PathBuf,
    pub resource_dir: Option<PathBuf>,
    pub app_handle: Option<AppHandle>,
    pub job_id: String,
    pub total_nodes: usize,
    pub current_node: usize,
}

impl ScriptToAudioContext {
    pub async fn new(
        onnx_dir: PathBuf,
        voice_dir: PathBuf,
        sound_effects_dir: PathBuf,
        resource_dir: Option<PathBuf>,
        app_handle: Option<AppHandle>,
        job_id: String,
    ) -> Result<Self> {
        // Ensure model and voice files exist
        ensure_model_files(&onnx_dir, app_handle.as_ref(), &job_id).await?;
        ensure_voice_files(&voice_dir, app_handle.as_ref(), &job_id).await?;

        // Load TTS
        let tts = load_text_to_speech_internal(&onnx_dir)?;

        // Use the actual sample rate from the TTS model config
        let sample_rate = tts.sample_rate as u32;

        Ok(ScriptToAudioContext {
            tts,
            current_speed: 1.0,
            current_voice: "female".to_string(),
            sample_rate,
            onnx_dir,
            voice_dir,
            sound_effects_dir,
            resource_dir,
            app_handle,
            job_id,
            total_nodes: 0,
            current_node: 0,
        })
    }

    fn emit_progress(&self, message: &str, stage: &str) {
        if let Some(ref handle) = self.app_handle {
            let progress = if self.total_nodes > 0 {
                0.1 + (self.current_node as f32 / self.total_nodes as f32) * 0.9
            } else {
                0.0
            };
            let _ = handle.emit(
                "tts-progress",
                TtsProgressEvent {
                    job_id: self.job_id.clone(),
                    message: message.to_string(),
                    progress,
                    stage: stage.to_string(),
                },
            );
        }
    }

    fn get_voice_style(&self, voice_key: &str) -> Result<Style> {
        let voices = get_voices();
        let voice_file = voices.get(voice_key).unwrap_or(&"F1.json");
        let voice_path = self.voice_dir.join(voice_file);
        load_voice_style(&[voice_path.to_string_lossy().to_string()], false)
    }

    fn fetch_sound_effect(&self, effect_key: &str) -> Result<AudioBuffer> {
        // First try embedded sounds
        if let Some(bytes) = get_embedded_sound(effect_key) {
            let buffer = AudioBuffer::from_bytes(bytes)?;
            // Resample to match TTS sample rate if needed
            if buffer.sample_rate != self.sample_rate {
                return Ok(buffer.resample(self.sample_rate));
            }
            return Ok(buffer);
        }

        // Fallback to file-based loading for custom sounds
        let effects = get_sound_effects();
        let filename = effects
            .get(effect_key)
            .ok_or_else(|| anyhow::anyhow!("Sound effect '{}' not found", effect_key))?;

        // Try sound_effects_dir first
        let path = self.sound_effects_dir.join(filename);
        if path.exists() {
            let buffer = AudioBuffer::from_file(&path)?;
            // Resample to match TTS sample rate if needed
            if buffer.sample_rate != self.sample_rate {
                return Ok(buffer.resample(self.sample_rate));
            }
            return Ok(buffer);
        }

        // Try resource_dir as fallback (for bundled assets)
        if let Some(ref resource_dir) = self.resource_dir {
            let resource_path = resource_dir.join(filename);
            if resource_path.exists() {
                let buffer = AudioBuffer::from_file(&resource_path)?;
                // Resample to match TTS sample rate if needed
                if buffer.sample_rate != self.sample_rate {
                    return Ok(buffer.resample(self.sample_rate));
                }
                return Ok(buffer);
            }
        }

        // If still not found, provide a helpful error message
        Err(anyhow::anyhow!(
            "Sound effect file '{}' not found. Checked embedded sounds and: {:?}{}",
            filename,
            path,
            self.resource_dir
                .as_ref()
                .map(|r| format!(", {:?}", r.join(filename)))
                .unwrap_or_default()
        ))
    }

    fn apply_effect(
        &self,
        effect_name: &str,
        buffer: &AudioBuffer,
        options: &EffectOptions,
    ) -> AudioBuffer {
        match effect_name {
            "echo" => apply_echo(buffer, options),
            "binaural" => apply_binaural(buffer, options),
            "pan" => apply_pan(buffer, options),
            _ => {
                eprintln!("Unknown effect: {}", effect_name);
                buffer.clone()
            }
        }
    }

    fn get_preset(&self, effect_name: &str, preset_name: &str) -> Option<EffectOptions> {
        match effect_name {
            "echo" => get_echo_presets().get(preset_name).cloned(),
            "binaural" => get_binaural_presets().get(preset_name).cloned(),
            "pan" => get_pan_presets().get(preset_name).cloned(),
            _ => None,
        }
    }

    fn generate_tts(&mut self, text: &str) -> Result<AudioBuffer> {
        let style = self.get_voice_style(&self.current_voice)?;
        let speed = (self.current_speed.clamp(0.5, 2.0) - 0.5) / 1.5;
        let speed = 0.75 + speed * 0.5;
        let (wav, _duration) =
            self.tts
                .call(format!(". {}", text).as_str(), &style, 50, speed, 0.3)?;

        let buffer = AudioBuffer::from_mono(wav, self.sample_rate);

        // Trim silence
        let trimmed = trim_silence(&buffer, 0.002, 20.0);

        // Reduce loudness
        Ok(apply_volume(&trimmed, 0.85))
    }
}

/// Load TTS without GPU option (internal helper)
fn load_text_to_speech_internal(onnx_dir: &Path) -> Result<TextToSpeech> {
    use ort::session::Session;

    let cfgs = load_cfgs(onnx_dir)?;

    let dp_path = onnx_dir.join("duration_predictor.onnx");
    let text_enc_path = onnx_dir.join("text_encoder.onnx");
    let vector_est_path = onnx_dir.join("vector_estimator.onnx");
    let vocoder_path = onnx_dir.join("vocoder.onnx");
    let unicode_indexer_path = onnx_dir.join("unicode_indexer.json");

    let dp_ort = Session::builder()?.commit_from_file(&dp_path)?;
    let text_enc_ort = Session::builder()?.commit_from_file(&text_enc_path)?;
    let vector_est_ort = Session::builder()?.commit_from_file(&vector_est_path)?;
    let vocoder_ort = Session::builder()?.commit_from_file(&vocoder_path)?;

    let text_processor = UnicodeProcessor::new(&unicode_indexer_path)?;

    Ok(TextToSpeech::new(
        cfgs,
        text_processor,
        dp_ort,
        text_enc_ort,
        vector_est_ort,
        vocoder_ort,
    ))
}

/// Count nodes in the DOM tree
fn count_nodes(node: &NodeRef) -> usize {
    1 + node
        .children()
        .map(|child| count_nodes(&child))
        .sum::<usize>()
}

/// Get element attribute value
fn get_attr(node: &NodeRef, name: &str) -> Option<String> {
    node.as_element()
        .and_then(|el| el.attributes.borrow().get(name).map(|s| s.to_string()))
}

/// Get element tag name (lowercase)
fn get_tag_name(node: &NodeRef) -> Option<String> {
    node.as_element()
        .map(|el| el.name.local.to_string().to_lowercase())
}

/// Helper to make a tag self-closing if it has no content
fn make_tag_self_closing(input: &str, tag_name: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '<' {
            // Check if this is our target tag
            let mut tag_content = String::from("<");
            let mut found_tag = false;

            // Collect the tag name
            while let Some(&next_c) = chars.peek() {
                if next_c.is_whitespace() || next_c == '>' || next_c == '/' {
                    break;
                }
                tag_content.push(chars.next().unwrap());
            }

            if tag_content == format!("<{}", tag_name) {
                found_tag = true;
                // Collect rest of opening tag
                while let Some(&next_c) = chars.peek() {
                    tag_content.push(chars.next().unwrap());
                    if next_c == '>' {
                        break;
                    }
                }

                // Check if there's an immediate closing tag
                let mut lookahead = String::new();
                let closing_tag = format!("</{}>", tag_name);

                // Collect potential whitespace and closing tag
                while let Some(&next_c) = chars.peek() {
                    if lookahead.len() >= closing_tag.len() + 10 {
                        break; // Don't look too far ahead
                    }
                    if lookahead.ends_with(&closing_tag) {
                        break;
                    }
                    lookahead.push(chars.next().unwrap());

                    // If we find non-whitespace that isn't part of closing tag, stop
                    if !next_c.is_whitespace() && !lookahead.trim_start().starts_with("</") {
                        break;
                    }
                }

                if lookahead.trim().is_empty() || lookahead.trim() == format!("</{}>", tag_name) {
                    // It's an empty tag, make sure it has closing
                    result.push_str(&tag_content);
                    if !tag_content.ends_with("/>") {
                        if !lookahead.contains(&closing_tag) {
                            result.push_str(&format!("</{}>", tag_name));
                        } else {
                            result.push_str(&lookahead);
                        }
                    }
                } else {
                    // Has content
                    result.push_str(&tag_content);
                    result.push_str(&lookahead);
                }
            } else {
                result.push_str(&tag_content);
            }

            if !found_tag {
                continue;
            }
        } else {
            result.push(c);
        }
    }

    result
}

/// Preprocess script - replace ellipsis with pause tags and unescape HTML entities
fn preprocess_script(script: &str) -> String {
    let mut result = script.to_string();

    result = make_tag_self_closing(&result, "pause");
    result = make_tag_self_closing(&result, "sound");

    // Replace ellipsis with .
    result = result.replace("...", r#"."#);
    result = result.replace("(pause)", r#"<pause value="0.5"></pause>"#);

    // Unescape HTML entities (kuchiki handles most, but we do some manually for safety)
    result = result.replace("&quot;", "\"");
    result = result.replace("&amp;", "&");
    result = result.replace("&lt;", "<");
    result = result.replace("&gt;", ">");

    result
}

/// Process a single DOM node and return audio segments
fn process_node(ctx: &mut ScriptToAudioContext, node: &NodeRef) -> Result<Vec<AudioBuffer>> {
    ctx.current_node += 1;
    ctx.emit_progress("Processing script", "generate");

    let mut segments: Vec<AudioBuffer> = Vec::new();

    // Handle text nodes
    if let Some(text_node) = node.as_text() {
        let text = text_node.borrow().trim().to_string();
        println!("Text: {}", text);
        if !text.is_empty() {
            let audio = ctx.generate_tts(&text)?;
            segments.push(audio);
        }
        return Ok(segments);
    }

    // Handle element nodes
    if let Some(tag) = get_tag_name(node) {
        match tag.as_str() {
            "speed" => {
                let prev_speed = ctx.current_speed;
                if let Some(value) = get_attr(node, "value") {
                    ctx.current_speed = value.parse().unwrap_or(1.0);
                }
                for child in node.children() {
                    segments.extend(process_node(ctx, &child)?);
                }
                ctx.current_speed = prev_speed;
            }

            "voice" => {
                let prev_voice = ctx.current_voice.clone();
                if let Some(value) = get_attr(node, "value") {
                    let voices = get_voices();
                    ctx.current_voice = if voices.contains_key(value.as_str()) {
                        value
                    } else {
                        value
                    };
                }
                for child in node.children() {
                    segments.extend(process_node(ctx, &child)?);
                }
                ctx.current_voice = prev_voice;
            }

            "pause" => {
                let duration: f32 = get_attr(node, "value")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(1.0);
                let silence = AudioBuffer::silence(duration, ctx.sample_rate);
                segments.push(silence);
                for child in node.children() {
                    segments.extend(process_node(ctx, &child)?);
                }
            }

            "overlay" => {
                let mut parts: Vec<AudioBuffer> = Vec::new();
                for child in node.children() {
                    if let Some(child_tag) = get_tag_name(&child) {
                        if child_tag == "part" {
                            ctx.current_node += 1;
                            ctx.emit_progress("Processing overlay part", "generate");

                            let mut part_segments: Vec<AudioBuffer> = Vec::new();
                            for part_child in child.children() {
                                part_segments.extend(process_node(ctx, &part_child)?);
                            }
                            if !part_segments.is_empty() {
                                let concatenated = AudioBuffer::concat(&part_segments)?;
                                parts.push(concatenated);
                            }
                        }
                    }
                }
                if !parts.is_empty() {
                    let merged = AudioBuffer::merge(&parts)?;
                    segments.push(merged);
                }
            }

            "sound" => {
                if let Some(value) = get_attr(node, "value") {
                    if let Ok(buffer) = ctx.fetch_sound_effect(&value) {
                        segments.push(buffer);
                    }
                }
                for child in node.children() {
                    segments.extend(process_node(ctx, &child)?);
                }
            }

            "effect" => {
                let effect_name = get_attr(node, "value").unwrap_or_default();
                let preset_name = get_attr(node, "preset");
                let options_attr = get_attr(node, "options").unwrap_or_else(|| "{}".to_string());

                let mut options = EffectOptions::default();

                // Load preset if available
                if let Some(ref preset) = preset_name {
                    if let Some(preset_opts) = ctx.get_preset(&effect_name, preset) {
                        options = preset_opts;
                    }
                }

                // Merge with parsed options
                let parsed_options = EffectOptions::from_json(&options_attr);
                options = options.merge(&parsed_options);

                let mut child_segments: Vec<AudioBuffer> = Vec::new();
                for child in node.children() {
                    child_segments.extend(process_node(ctx, &child)?);
                }

                if !child_segments.is_empty() {
                    let target = AudioBuffer::concat(&child_segments)?;
                    let effected = ctx.apply_effect(&effect_name, &target, &options);
                    segments.push(effected);
                }
            }

            "loop" => {
                let loops: usize = get_attr(node, "value")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(1);

                let mut child_segments: Vec<AudioBuffer> = Vec::new();
                for child in node.children() {
                    child_segments.extend(process_node(ctx, &child)?);
                }

                if !child_segments.is_empty() {
                    let single_iteration = AudioBuffer::concat(&child_segments)?;
                    for _ in 0..loops {
                        segments.push(single_iteration.clone());
                    }
                }
            }

            "volume" => {
                let volume: f32 = get_attr(node, "value")
                    .and_then(|v| v.parse::<f32>().ok())
                    .unwrap_or(1.0)
                    .max(0.0);

                let mut child_segments: Vec<AudioBuffer> = Vec::new();
                for child in node.children() {
                    child_segments.extend(process_node(ctx, &child)?);
                }

                if !child_segments.is_empty() {
                    let target = AudioBuffer::concat(&child_segments)?;
                    let scaled = apply_volume(&target, volume);
                    segments.push(scaled);
                }
            }

            // For root, html, head, body, or unknown elements - just process children
            _ => {
                for child in node.children() {
                    segments.extend(process_node(ctx, &child)?);
                }
            }
        }
    } else {
        // For other node types, process children
        for child in node.children() {
            segments.extend(process_node(ctx, &child)?);
        }
    }

    Ok(segments)
}

/// Convert script to audio buffer
pub async fn script_to_audio(
    script: &str,
    onnx_dir: PathBuf,
    voice_dir: PathBuf,
    sound_effects_dir: PathBuf,
    resource_dir: Option<PathBuf>,
    app_handle: Option<AppHandle>,
    job_id: String,
) -> Result<AudioBuffer> {
    // Create context
    let mut ctx = ScriptToAudioContext::new(
        onnx_dir,
        voice_dir,
        sound_effects_dir,
        resource_dir,
        app_handle.clone(),
        job_id.clone(),
    )
    .await?;

    // Preprocess script
    let preprocessed = preprocess_script(script);
    let wrapped = format!("<root>{}</root>", preprocessed);

    // Parse with kuchiki (more robust HTML/XML parsing)
    let document = kuchiki::parse_html().one(wrapped);

    // Find the root element we created
    let root = document
        .select_first("root")
        .map(|n| n.as_node().clone())
        .unwrap_or_else(|_| document.clone());

    ctx.total_nodes = count_nodes(&root);
    ctx.current_node = 0;

    // Process all nodes
    let mut audio_segments: Vec<AudioBuffer> = Vec::new();
    for child in root.children() {
        let child_segments = process_node(&mut ctx, &child)?;
        audio_segments.extend(child_segments);
    }

    // Concatenate all segments
    if audio_segments.is_empty() {
        Ok(AudioBuffer::new(1, 1, ctx.sample_rate))
    } else {
        AudioBuffer::concat(&audio_segments)
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[derive(Clone, Serialize, Deserialize)]
pub struct AudioScript {
    pub title: String,
    pub script: String,
    pub filename: Option<String>,
}

/// Generate audio from script and save to file
#[tauri::command]
pub async fn generate_audio(
    app_handle: AppHandle,
    script: AudioScript,
) -> Result<AudioScript, String> {
    let job_id = format!(
        "tts-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );

    // Get app data directory
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    // Get resource directory for bundled assets (sound effects)
    let resource_dir = app_handle.path().resource_dir().ok();

    let onnx_dir = app_data_dir.join("models").join("onnx");
    let voice_dir = app_data_dir.join("models").join("voice_styles");
    let sound_effects_dir = app_data_dir.join("sounds");

    // Emit start progress
    let _ = app_handle.emit(
        "tts-progress",
        TtsProgressEvent {
            job_id: job_id.clone(),
            message: format!("Starting audio generation: {}", script.title),
            progress: 0.0,
            stage: "start".to_string(),
        },
    );

    // Generate audio
    let audio = script_to_audio(
        &script.script,
        onnx_dir,
        voice_dir,
        sound_effects_dir,
        resource_dir,
        Some(app_handle.clone()),
        job_id.clone(),
    )
    .await
    .map_err(|e| e.to_string())?;

    // Write to file
    let filename = script
        .filename
        .clone()
        .unwrap_or_else(|| format!("{}.wav", script.title));
    let output_path = app_data_dir.join(&filename);

    let _ = app_handle.emit(
        "tts-progress",
        TtsProgressEvent {
            job_id: job_id.clone(),
            message: format!("Writing audio file: {}", filename),
            progress: 0.99,
            stage: "write".to_string(),
        },
    );

    audio
        .write_to_file(&output_path)
        .map_err(|e| e.to_string())?;

    // Emit completion
    let _ = app_handle.emit(
        "tts-progress",
        TtsProgressEvent {
            job_id: job_id.clone(),
            message: "Audio generation complete".to_string(),
            progress: 1.0,
            stage: "complete".to_string(),
        },
    );

    Ok(AudioScript {
        title: script.title,
        script: script.script,
        filename: Some(filename),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preprocess_script() {
        // Test ellipsis replacement
        let input = "Hello... world";
        let result = preprocess_script(input);
        assert!(result.contains(r#"<pause value="0.5"></pause>"#));

        // Test HTML entity unescaping
        let input2 = "&amp; &lt; &gt;";
        let result2 = preprocess_script(input2);
        assert!(result2.contains("& < >"));
    }

    #[test]
    fn test_audio_buffer_silence() {
        let buffer = AudioBuffer::silence(1.0, 24000);
        assert_eq!(buffer.length(), 24000);
        assert_eq!(buffer.num_channels(), 1);
    }

    #[test]
    fn test_audio_buffer_concat() {
        let b1 = AudioBuffer::from_mono(vec![0.5; 100], 24000);
        let b2 = AudioBuffer::from_mono(vec![-0.5; 100], 24000);
        let result = AudioBuffer::concat(&[b1, b2]).unwrap();
        assert_eq!(result.length(), 200);
    }

    #[test]
    fn test_apply_echo() {
        let buffer = AudioBuffer::from_mono(vec![1.0; 1000], 24000);
        let options = EffectOptions {
            delay: Some(0.1),
            decay: Some(0.5),
            repeats: Some(2),
            ..Default::default()
        };
        let result = apply_echo(&buffer, &options);
        assert!(result.length() > buffer.length());
    }

    #[test]
    fn test_effect_options_from_json() {
        let json = r#"{"delay": 0.5, "decay": 0.3}"#;
        let opts = EffectOptions::from_json(json);
        assert_eq!(opts.delay, Some(0.5));
        assert_eq!(opts.decay, Some(0.3));
    }

    #[test]
    fn test_kuchiki_parsing() {
        let html = "<root><voice value=\"female\">Hello world</voice></root>";
        let document = kuchiki::parse_html().one(html);
        let root = document.select_first("root").unwrap();
        let voice = root.as_node().select_first("voice").unwrap();
        let attrs = voice.as_node().as_element().unwrap().attributes.borrow();
        assert_eq!(attrs.get("value"), Some("female"));
    }
}
