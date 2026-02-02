# DomGPT - Conditioning Trainer Specification

## Overview

DomGPT is a desktop application built with Tauri and React that provides personalized conditioning and self-improvement training. It uses AI-powered agents to generate hypnosis sessions, coaching, challenges, and reflections tailored to user's goals and preferences.

**Concept:** A fully integrated, agent-driven desktop app acting as an intelligent, adaptive conditioning trainer. It generates deeply personalized audio sessions and other conditionings, evolves based on feedback, and reinforces conditioning through active daily engagement.

**Version:** 0.1.16
**Identifier:** com.ylm.domgpt

---

## Tech Stack

### Runtime & Backend
- **Desktop Framework:** Tauri 2 (Rust)
- **Runtime:** Bun (JavaScript/TypeScript)
- **Build Tool:** Vite 7

### Frontend
- **Framework:** React 19
- **Routing:** React Router 6
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS 4
- **Animations:** motion (Framer Motion)
- **State Management:**
  - Zustand (Settings, Profile with persistence)
  - React Context (Config, SurrealDB)
  - TanStack Query (Data fetching)
- **Markdown Rendering:** react-markdown + KaTeX
- **Syntax Highlighting:** Shiki

### Database
- **Database:** SurrealDB (WASM)
- **Storage:** Local embedded database
- **Endpoint:** `indxdb://demo`
- **Namespace/Database:** `app/default`

### AI/LLM
- **LLM Provider:** OpenRouter
- **AI SDK:** Vercel AI SDK (@ai-sdk/openai, @openrouter/ai-sdk-provider)
- **Chat UI:** assistant-ui (@assistant-ui/react, @assistant-ui/react-ai-sdk)
- **Tool Calling:** Native support via OpenRouter SDK

### Text-to-Speech (TTS)
- **Engine:** Custom Rust-based TTS (Kokoro-inspired)
- **ONNX Runtime:** ort (Tauri plugin)
- **Audio Processing:** Crunker (JavaScript), hound (Rust)
- **Model:** Pre-trained neural TTS models

---

## Project Structure

```
src/
├── components/                    # UI Components
│   ├── hypno/                   # Hypnosis session components
│   │   ├── SessionGenerator.tsx  # Generate new sessions
│   │   ├── SessionPlayer.tsx     # Audio player with controls
│   │   └── index.ts
│   ├── steering/                # Coach/interview/wizard components
│   │   ├── CoachChat.tsx         # AI coach chat interface
│   │   ├── OnboardingWizard.tsx # Multi-step onboarding
│   │   ├── Questionaire.tsx     # Form-based question interface
│   │   ├── ReflectionSession.tsx # Reflection flow
│   │   └── index.ts
│   ├── challenge/               # Challenge-related components
│   │   ├── ChallengeGenerator.tsx
│   │   ├── ChallengeList.tsx
│   │   └── index.ts
│   ├── dashboard/               # Dashboard widgets
│   │   ├── StatsCard.tsx        # Statistics display
│   │   ├── QuickActionButton.tsx
│   │   └── index.ts
│   ├── settings/                # Settings UI
│   │   ├── AISettings.tsx       # AI model configuration
│   │   ├── AudioSettings.tsx    # TTS configuration
│   │   ├── CoachSettings.tsx    # Coach traits
│   │   ├── HypnoStyleSettings.tsx
│   │   ├── ProfileView.tsx
│   │   ├── DataManagement.tsx
│   │   ├── SettingsSection.tsx
│   │   └── index.ts
│   ├── history/                 # History components
│   │   ├── HistoryTimeline.tsx   # Activity timeline
│   │   └── index.ts
│   ├── ui/                      # Base UI components (shadcn)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── label.tsx
│   │   ├── avatar.tsx
│   │   ├── checkbox.tsx
│   │   ├── textarea.tsx
│   │   ├── tooltip.tsx
│   │   ├── collapsible.tsx
│   │   ├── badge.tsx
│   │   └── shadcn-io/ai/       # AI chat components
│   │       ├── chat.tsx
│   │       ├── conversation.tsx
│   │       ├── message.tsx
│   │       ├── prompt-input.tsx
│   │       ├── response.tsx
│   │       ├── tool.tsx
│   │       ├── code-block.tsx
│   │       ├── reasoning.tsx
│   │       ├── image.tsx
│   │       ├── task.tsx
│   │       ├── source.tsx
│   │       ├── branch.tsx
│   │       ├── loader.tsx
│   │       └── web-preview.tsx
│   ├── markdown-text.tsx         # Markdown renderer
│   └── tool-fallback.tsx         # Tool call fallback UI
├── pages/                        # Page-level components
│   ├── Dashboard.tsx              # Main hub with stats
│   ├── OnboardingPage.tsx         # Initial setup wizard
│   ├── CoachPage.tsx              # AI coach chat
│   ├── ChallengesPage.tsx         # Daily challenges
│   ├── ReflectionPage.tsx         # Self-reflection
│   ├── HypnoNewPage.tsx          # Generate new hypnosis session
│   ├── HypnoPlayPage.tsx         # Play existing session
│   └── SettingsPage.tsx          # App configuration
├── contexts/                     # React Context providers
│   └── ConfigContext.tsx          # App configuration context
├── lib/                          # Core utilities and services
│   ├── agent.ts                  # Agent system classes
│   ├── models/                   # LLM model abstractions
│   │   ├── openrouter.ts         # OpenRouter SDK integration
│   │   └── index.ts
│   ├── tts-rust.ts               # TTS generation interface
│   ├── http.ts                   # Tauri HTTP fetcher
│   └── utils.ts                  # Utility functions
├── data/                         # Zustand stores (data access)
│   ├── surreal.tsx               # SurrealDB provider
│   ├── profile.ts                # UserProfile store (persisted)
│   ├── settings.ts               # AppSettings store (persisted)
│   ├── hypno.ts                  # Hypno file operations
│   ├── challenges.ts             # Challenge operations
│   ├── history.ts                # History retrieval
│   └── info.ts                  # User info (RAG) operations
├── prompts/                      # AI agent prompts
│   ├── coach.ts                  # Coach agent prompts
│   ├── hypno.ts                  # Hypnosis agent prompts
│   ├── challenge.ts              # Challenge agent prompts
│   └── interview.ts             # Interview agent prompts
├── types/                        # TypeScript type definitions
│   └── user.ts                  # Core type definitions
├── main.tsx                      # React entry point
├── vite-env.d.ts                # Vite type declarations
└── App.tsx                      # Main app component

src-tauri/
├── src/
│   ├── main.rs                   # Tauri entry point
│   ├── lib.rs                    # Core Rust library
│   ├── ttslib.rs                 # TTS engine implementation
│   └── script_to_audio.rs        # Script-to-audio conversion
├── build.rs                      # Build script
├── Cargo.toml                    # Rust dependencies
├── tauri.conf.json              # Tauri configuration
└── icons/                       # App icons (32x32, 128x128, etc.)
```

---

## Application Architecture

### Core Experience

**Primary Interaction:** Daily usage with different conditioning types.

**Technical Architecture:**
1. **Ensemble of LLM Agents** - Handle planning, creative writing, and data analysis
2. **Logic Engine** - OpenRouter API with tool calling support
3. **Client** - Tauri-based desktop application for performance and security
4. **Audio Engine** - Rust-based TTS with custom script tags
5. **Database** - SurrealDB for persistent storage
6. **Protocol** - Custom XML-based script format with tags for pacing, triggers, effects, and layering

### Agent System

All agents extend the base `Agent` class with:
- Conversation context management
- Tool calling capabilities
- Streaming response support
- Progress callbacks

**Agent Types:**

| Agent | Purpose | File |
|-------|---------|------|
| **CoachAgent** | Onboarding, coaching sessions, reflection | `lib/agent.ts` |
| **HypnoPlannerAgent** | Create high-level session skeletons | `lib/agent.ts` |
| **HypnoWriterAgent** | Write hypnotic scripts with SSML tags | `lib/agent.ts` |
| **InterviewAgent** | Generate reflection questions | `lib/agent.ts` |
| **ChallengeAgent** | Generate real-world challenges | `lib/agent.ts` |

---

## Core Features

### 1. Onboarding

**Page:** `/onboarding` (`OnboardingPage.tsx`)
**Component:** `OnboardingWizard.tsx`, `CoachChat.tsx`

**Flow:**
1. **Processing Mode Selection**
   - Local-First: Privacy/Offline focus
   - Cloud-First: High fidelity with API keys

2. **Coach-Led Discovery**
   - Conversational gathering of conditioning goals
   - Identify blockers and challenges
   - Assess experience level
   - Collect preferences

3. **Calibration**
   - Mini-hypnos to gauge responsiveness
   - Test different induction styles
   - Determine optimal sensory preferences

4. **Co-Creation**
   - Collaborative brainstorming of triggers
   - Design anchors and suggestions
   - Define conditioning approach

5. **Profile Creation**
   - Set structured User Profile
   - Create initial conditioning plan
   - Store in Zustand store (persisted)

**Data:**
```typescript
interface UserProfile {
  profile: string;              // User description
  goal: string;                 // Conditioning goal
  plan: ConditioningPlan;        // Feature-specific plans
  created_at: Date;
}

interface ConditioningPlan {
  hypno: string;        // Hypnosis plan
  challenges: string;   // Challenge plan
  user: string;        // User-facing instructions
  coach: string;       // Coach's memory
  interview: string;    // Interview plan
}
```

---

### 2. Hypnosis Sessions

The core feature - AI-generated personalized hypnosis audio sessions.

#### Generation

**Page:** `/hypno/new` (`HypnoNewPage.tsx`)
**Component:** `SessionGenerator.tsx`

**Triggers:**
- Plan gets updated
- User requests "New Session"

**Pipeline Flow:**

1. **Planner Agent** (`HypnoPlannerAgent`)
   - Reads Structured User Profile
   - Creates high-level session plan
   - Determines induction styles, depth levels
   - Uses `CreateSection` tool for each section

2. **Writer Agent** (`HypnoWriterAgent`)
   - Receives section plans from Planner
   - Writes hypnotic scripts using custom tags
   - Applies NLP techniques (pacing, leading, embedded commands)
   - Uses VAK (Visual, Auditory, Kinesthetic) language

3. **TTS Generation** (`lib/tts-rust.ts`)
   - Parses custom XML-like tags
   - Generates audio using ONNX TTS models
   - Applies effects (echo, binaural, pan)
   - Handles overlays, loops, voice changes

**Session Structure:**
1. **Pre-talk** (optional) - Rapport building, setting expectations
2. **Induction** - Fixation, PMR, Confusion, binaural, visualization, breathing
3. **Deepening** - Staircase, Elevator, Drifting techniques
4. **Suggestions** - Metaphors, Direct suggestions, Reframing, Anchoring
5. **Emerging** - Bringing user back to awareness
6. **Post-hypnotic suggestions** (optional)

#### Custom TTS Audio Tags

```xml
<voice value="...">           <!-- male, male2, female, female2 -->
    Welcome to your session.
    <pause value="1" />
    <speed value="0.9">
        Let your mind slow down.
    </speed>
    <effect value="binaural" preset="theta">
        Relax deeply now.
    </effect>
    <sound value="heart_beat"/>
    <overlay>
        <part>
            <voice value="male">You are safe and secure.</voice>
        </part>
        <part>
            <volume value="0.2">
                <loop value="3"><sound value="bubble_pop"/></loop>
            </volume>
        </part>
    </overlay>
</voice>
```

**Available Tags:**
- `<voice value="...">` - Change TTS voice
- `<speed value="...">` - Adjust playback speed (0.5-2.0)
- `<pause value="..."/>` - Insert silence (seconds)
- `<sound value="..."/>` - Sound effects (beep, pop, bubble_pop, camera_shutter, censor_beep, heart_beat, padlock, snap)
- `<effect value="..." [preset="..."]>` - Audio effects (echo, binaural, pan)
- `<overlay>` - Layer multiple audio tracks
- `<loop value="...">` - Repeat content
- `<volume value="...">` - Adjust volume (0.0-1.0)

#### Playback

**Page:** `/hypno/play/:sessionId` (`HypnoPlayPage.tsx`)
**Component:** `SessionPlayer.tsx`

**Features:**
- Play/Pause controls
- Progress indicator
- Playback speed control
- Volume control
- Audio visualization (optional)

#### Hypno Style Configuration

Users can customize hypnosis style:

```typescript
interface HypnoStyleConfig {
  style: HypnoStyle;              // authoritarian | permissive | balanced
  induction_types: InductionType[];  // progressive_relaxation | visualization | breathing
  sensory: SensoryType;           // visual | kinesthetic | mixed
  suggestion: SuggestionType;     // direct | indirect | permissive
}
```

**Style Descriptions:**

| Style | Description |
|-------|-------------|
| **Authoritarian** | Commanding, direct language, imperative statements ("You will...") |
| **Permissive** | Gentle, inviting language ("You might...", "As you wish...") |
| **Balanced** | Mix of authoritative guidance with gentle invitation |

| Induction Type | Description |
|----------------|-------------|
| **Progressive Relaxation** | Systematically guide through muscle groups |
| **Visualization** | Create vivid mental scenes |
| **Breathing** | Focus on breath patterns and rhythm |

| Sensory Mode | Focus |
|--------------|-------|
| **Visual** | Primary visual language (see, look, picture, imagine) |
| **Kinesthetic** | Primary feelings (feel, sense, touch, warmth, floating) |
| **Mixed** | Balanced VAK (Visual, Auditory, Kinesthetic) |

| Suggestion Type | Description |
|----------------|-------------|
| **Direct** | Explicit, clear suggestions ("You are confident") |
| **Indirect** | Embedded in metaphors and stories |
| **Permissive** | Presented as possibilities ("You might notice...") |

#### Data Model

```typescript
interface HypnoFile {
  id?: RecordId;
  hypno_file: string;        // Path to audio file
  plan: HypnoPlan;            // Session plan structure
  script: string;             // Full script with tags
  duration_seconds: number;
  created_at: Date;
}

type HypnoPlan = {
  name: string;
  content: string;
}[];
```

---

### 3. Coach Chat

AI-powered personal coaching for ongoing guidance.

**Page:** `/coach` (`CoachPage.tsx`)
**Component:** `CoachChat.tsx`

**Triggers:**
- User initiates manual plan adjustment
- Interview Agent requests escalation

**Features:**
- Real-time chat with AI coach
- Uses Socratic Questioning / Guided Discovery
- Reviews user history and progress
- Adjusts conditioning plans based on feedback
- Streaming responses with markdown rendering

**Coach Traits (Configurable):**

| Trait | Description |
|-------|-------------|
| `soft` | Gentle and non-confrontational |
| `motivational` | Inspires and uplifts |
| `encouraging` | Friendly and supportive |
| `empathetic` | Shows understanding of feelings |
| `direct` | Straightforward and to the point |
| `informative` | Provides detailed explanations |
| `intense` | More forceful, pushes further |
| `pushing` | Expands on user goals |
| `assertive` | Takes initiative without informing user |

**Tools Available:**
- `SetData` - Update user profile or goal
- `SetPlan` - Set specific feature's plan
- `GetCurrentData` - Retrieve current user data
- `Complete` - End coaching session

**Prompt Structure:**

```typescript
getCoachPrompt(isOnboarding, traits, history, profile) {
  // Base system prompt
  // Conditioning features explanation
  // Tool descriptions
  // History context
  // User preferences (based on traits)
  // Onboarding instructions (if applicable)
}
```

---

### 4. Daily Challenges

Real-world micro-tasks aligned with conditioning goals.

**Page:** `/challenges` (`ChallengesPage.tsx`)

**Components:**
- `ChallengeGenerator.tsx` - Generate new challenges
- `ChallengeList.tsx` - Display and manage challenges

**Triggers:**
- Daily refresh
- Coach assignment

**Generation Flow:**

1. **Challenge Agent** reads User Profile and current Goal
2. Identifies real-world scenarios relevant to conditioning goals
3. Generates 5-8 specific, actionable micro-tasks
4. Outputs JSON array of challenge descriptions

**Challenge Requirements:**
- Specific and actionable
- Realistic and appropriate
- Mix of difficulty levels
- Clear and unambiguous
- Measurable completion criteria

**Data Model:**

```typescript
interface Challenge {
  id?: RecordId;
  description: string;
  completed: boolean;
  created_at: Date;
  completed_at?: Date;
}
```

**Example Challenges:**
- "Make eye contact for 3 seconds with a stranger"
- "Compliment someone genuinely"
- "Take 5 deep breaths before a stressful meeting"

---

### 5. Reflection/Interview

Post-session or standalone reflection to assess progress.

**Page:** `/reflection` (`ReflectionPage.tsx`)
**Component:** `ReflectionSession.tsx`, `Questionaire.tsx`

**Triggers:**
- User-initiated (manual start when receptive)
- After hypnosis session (planned)

**Agent:** InterviewAgent

**Contexts:**
- **Reflection** - General interview to gauge response to conditioning
- **Post-session** - Follow-up after hypno, challenge, habit, mantra, subliminal

**Question Types:**

| Type | Format | Example |
|------|--------|---------|
| **Multiple Choice** | Options list | "How did you feel after the session? [Calm, Energized, Neutral, Anxious]" |
| **Rating** | Likert scale (1-10) | "Rate the effectiveness of suggestions (1-10)" |
| **Open Text** | Free-form | "What was your most vivid visualization?" |

**Data Model:**

```typescript
type Question =
  | { question: string; answer: string; type: "multiple_choice"; options: string[] }
  | { question: string; type: "rating"; scale: number; answer: number }
  | { question: string; type: "open_text"; answer: string };

interface Reflection {
  questions: Question[];
  created_at: string;
}
```

---

### 6. Dashboard

Main dashboard providing overview and quick access.

**Page:** `/` (`Dashboard.tsx`)

**Components:**
- `StatsCard.tsx` - Display statistics
- `QuickActionButton.tsx` - Quick action buttons
- `HistoryTimeline.tsx` - Show activity history

**Statistics Displayed:**
- Total Sessions count
- Reflections count
- Current Streak (consecutive days of activity)
- Last Activity time (relative: Today, Yesterday, X days/weeks/months ago)

**Quick Actions:**
- Hypnosis Session (Play latest or generate new)
- Chat with Coach
- Daily Challenges
- Reflection
- Settings

**Current Conditioning Plan Section:**
- Displays user-facing plan content
- Shows goal focus

**Journey History:**
- Timeline of past sessions and reflections
- Filterable by type
- Paginated loading

---

### 7. Settings

Configure application preferences and manage data.

**Page:** `/settings` (`SettingsPage.tsx`)

**Sub-sections:**

#### AISettings.tsx
- Configure LLM engine (OpenRouter)
- Set API key
- Select main model

#### AudioSettings.tsx
- Configure TTS engine
- Voice preferences

#### CoachSettings.tsx
- Select coach traits (multi-select)
- Configure personality

#### HypnoStyleSettings.tsx
- Select hypno style (authoritarian/permissive/balanced)
- Choose induction types
- Set sensory mode
- Configure suggestion type

#### ProfileView.tsx
- View current user profile
- Display goals
- Show conditioning plans

#### DataManagement.tsx
- Export data (JSON)
- Import data
- Clear history
- Reset application

#### Data Model

```typescript
interface AppSettings {
  llm_engine?: LLMEngine;
  main_model?: string;
  tts_engine?: TTSEngine;
  coach_traits?: CoachTrait[];
  hypno_style?: HypnoStyleConfig;
}

type LLMEngine = {
  type: "openrouter";
  api_key?: string;
};

type TTSEngine = {
  type: "inbuild";
};
```

---

## Data Models

### User Profile

Stored in Zustand store (`data/profile.ts`):
- **Persistence Key:** `profile-storage`
- **Middleware:** Zustand persist

```typescript
interface UserProfile {
  profile: string;              // Read by most agents
  goal: string;                 // Read by coach
  plan: ConditioningPlan;        // Feature-specific plans
  created_at: Date;
}

interface ConditioningPlan {
  hypno: string;        // Used by hypnosis agents
  challenges: string;   // Used by challenge agent
  user: string;        // Displayed to user
  coach: string;       // Coach's memory/instructions
  interview: string;    // Used by interview agent
}
```

### History

Stored in SurrealDB (`history` table):

```typescript
type HistoryItem = HistorySession | HistoryReflection;

interface HistoryData {
  id?: RecordId;
  type: string;
  time: Date;
}

interface HistorySession extends HistoryData {
  type: "session";
  session_type: SessionType;  // "hypno" | "trigger_gym" | "challenge" | "habit" | "mantra" | "subliminal"
  data: RecordId;           // Reference to session data
  extra?: string;
  debrief?: Reflection;
}

interface HistoryReflection extends HistoryData {
  type: "reflection";
  reflection: Reflection;
}
```

### User Info (RAG)

Stored in SurrealDB (`info` table):

```typescript
interface UserInfo {
  id?: RecordId;
  content: string;          // Stored anecdotes/preferences
  tags: string[];           // Tags for retrieval
  created_at: Date;
  embedding?: number[];      // Vector for semantic search (future)
}
```

---

## Database (SurrealDB)

### Configuration

```typescript
<SurrealProvider
  endpoint="indxdb://demo"
  params={{ namespace: "app", database: "default" }}
>
  {/* App content */}
</SurrealProvider>
```

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user` | User profile and conditioning plan | profile, goal, plan, created_at |
| `hypno_file` | Hypnosis sessions | hypno_file, plan, script, duration_seconds, created_at |
| `challenge` | Daily challenges | description, completed, created_at, completed_at |
| `history` | Session and reflection history | type, time, session_type, data, debrief |
| `info` | RAG-stored user information | content, tags, created_at, embedding |
| `settings` | Application settings | llm_engine, main_model, tts_engine, coach_traits, hypno_style |

---

## Routing

**Router:** React Router Memory Router (for Tauri)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | Main hub, stats, quick actions |
| `/onboarding` | OnboardingPage | Initial setup (shown when not complete) |
| `/settings` | SettingsPage | App configuration |
| `/coach` | CoachPage | AI coach chat |
| `/challenges` | ChallengesPage | View/manage challenges |
| `/reflection` | ReflectionPage | Self-reflection session |
| `/hypno/new` | HypnoNewPage | Generate new hypnosis session |
| `/hypno/play/:sessionId` | HypnoPlayPage | Play existing session |

**Navigation:**
- Programmatic navigation via `useNavigate()` hook
- URL parameters for session playback

---

## TTS Engine (Rust)

### Architecture

**Components:**

1. **TTS Library** (`src-tauri/src/ttslib.rs`)
   - Text preprocessing (Unicode normalization, emoji removal)
   - Text chunking (max 300 chars per chunk)
   - ONNX model inference:
     - Duration prediction
     - Text encoding
     - Vector estimation (denoising loop)
     - Vocoder (waveform generation)
   - WAV file output

2. **Script Parser** (`src-tauri/src/script_to_audio.rs`)
   - Parses custom XML-like tags
   - Builds audio using ScriptBuilder API
   - Applies effects and overlays

3. **ONNX Models** (Pre-loaded)
   - `duration_predictor.onnx` - Predicts audio duration
   - `text_encoder.onnx` - Encodes text to embeddings
   - `vector_estimator.onnx` - Denoising loop
   - `vocoder.onnx` - Generates waveform from latent

### Voice Styles

Pre-configured voice styles stored as JSON:
- **male**, **male2** - Male voices
- **female**, **female2** - Female voices

Each style contains:
- **TTL** - Text-to-latent style components
- **DP** - Duration predictor style components

### Audio Processing Pipeline

```
Script (XML) → Parse Tags → Chunk Text
    ↓
ONNX Inference (Duration, Encoding, Denoising, Vocoder)
    ↓
WAV Generation → Effects/Overlays → Concatenation
    ↓
Final Audio File
```

### JavaScript Interface

```typescript
// lib/tts-rust.ts
interface TTSConfig {
  voice: "male" | "male2" | "female" | "female2";
  speed: number;
  onnxDir: string;
}

interface ScriptBuilder {
  text(content: string): this;
  pause(seconds: number): this;
  sound(type: SoundEffect): this;
  voice(voiceType: string): this;
  speed(value: number): this;
  volume(value: number): this;
  effect(type: string, preset?: string): this;
  loop(count: number): this;
  overlay(parts: ScriptBuilder[]): this;
  build(): string;
}
```

---

## UI/UX Guidelines

Based on `design.md`:

### Design Principles

1. **Avoid Generic AI Aesthetics**
   - No purple gradients on white backgrounds
   - No Inter, Roboto, Arial (unless intentional)
   - No cookie-cutter design

2. **Bold Aesthetic Direction**
   - Choose one: brutalist, maximalist, retro-futuristic, luxury, playful, etc.
   - Execute with precision and intentionality

3. **Distinctive Typography**
   - Pair unique display font with refined body font
   - Unexpected, characterful choices

4. **Color & Theme**
   - Cohesive palette with dominant colors
   - Sharp accents (not evenly distributed)
   - CSS variables for consistency

5. **Motion**
   - Sparingly, with intention
   - One orchestrated animation (e.g., page load) over scattered micro-interactions
   - Smooth, unobtrusive, never blocking

6. **Spatial Composition**
   - Asymmetry, diagonal flow
   - Grid-breaking elements
   - Generous negative space OR controlled density

7. **Visual Details**
   - Gradient meshes, noise textures
   - Geometric patterns, layered transparencies
   - Dramatic shadows, decorative borders
   - Custom cursors, grain overlays

### Implementation

- **Design System:** shadcn-ui with Radix UI primitives
- **Styling:** Tailwind CSS with custom design tokens (HSL variables)
- **Theme:** Pink/magenta/fuchsia color palette (current) - can be reimagined
- **Animations:** Framer Motion (motion)
- **Component Patterns:**
  - CVA (class-variance-authority) for variants
  - React.forwardRef for composition
  - Sub-component pattern (CardHeader, CardTitle, etc.)
  - Slot composition with `asChild` prop
  - `cn()` utility for conditional class merging

### Accessibility

- ARIA labels, `sr-only` spans, proper roles
- Keyboard navigation (Radix UI primitives)
- Screen reader support
- Focus management in modals/dialogs

### AI-Specific UI

- Streaming response support
- Markdown rendering with syntax highlighting (Shiki)
- Math rendering (KaTeX)
- Tool call display with expand/collapse
- Scroll-to-bottom with indicator
- User/assistant avatar differentiation

---

## Development Workflow

### Scripts

```json
{
  "dev": "vite",                    // Start dev server with hot reload
  "build": "tsc && vite build",     // Build for production
  "preview": "vite preview",        // Preview production build
  "tauri": "tauri"                  // Tauri CLI commands
}
```

### Development

```bash
# Start development
bun run dev

# Start Tauri dev mode
bun run tauri dev

# Build for production
bun run build
bun run tauri build

# Preview build
bun run preview
```

### Build Process

1. **Frontend:** TypeScript compilation → Vite build → `dist/`
2. **Tauri:** Bundle Rust backend + frontend → Desktop app
3. **Output:** Platform-specific installers:
   - Windows: NSIS installer
   - macOS: DMG / App bundle
   - Linux: AppImage, DEB

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts |
| `vite.config.ts` | Vite configuration |
| `tailwind.config.js` | Tailwind CSS |
| `tsconfig.json` | TypeScript |
| `biome.json` | Code linting |
| `components.json` | shadcn/ui components |
| `tauri.conf.json` | Tauri app config |

---

## Configuration

### Tauri Configuration (`tauri.conf.json`)

```json
{
  "productName": "domgpt",
  "version": "0.1.16",
  "identifier": "com.ylm.domgpt",
  "build": {
    "beforeDevCommand": "bun run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "bun run build",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [{
      "title": "domgpt",
      "width": 800,
      "height": 600
    }],
    "security": {
      "csp": "default-src 'self' ipc: http://ipc.localhost; img-src 'self' asset: http://asset.localhost; font-src 'self' data:",
      "assetProtocol": { "enable": true, "scope": ["**"] }
    }
  }
}
```

### Zustand Persistence

```typescript
// Profile
create<Profile>()(
  persist(
    (set, get) => ({ ... }),
    { name: "profile-storage" }
  )
)

// Settings
create<Settings>()(
  persist(
    (set, get) => ({ ... }),
    { name: "settings-storage" }
  )
)
```

---

## Dependencies

### Frontend (Key)

| Package | Purpose |
|---------|---------|
| `@assistant-ui/react` | AI chat UI |
| `@ai-sdk/openai` | Vercel AI SDK |
| `@openrouter/ai-sdk-provider` | OpenRouter integration |
| `@tanstack/react-query` | Data fetching |
| `zustand` | State management |
| `@surrealdb/wasm` | Embedded database |
| `react-markdown` | Markdown rendering |
| `shiki` | Syntax highlighting |
| `katex` | Math rendering |
| `motion` | Framer Motion |
| `tailwindcss` | Styling |
| `lucide-react` | Icons |

### Backend (Rust)

| Crate | Purpose |
|-------|---------|
| `tauri` | Desktop framework |
| `ort` | ONNX Runtime (TTS inference) |
| `hound` | WAV file I/O |
| `ndarray` | N-dimensional arrays |
| `regex` | Regular expressions |
| `serde` | Serialization |
| `rand` | Random generation (noisy latent) |

---

## Security

### Content Security Policy

```
default-src 'self' ipc: http://ipc.localhost;
img-src 'self' asset: http://asset.localhost;
font-src 'self' data:;
```

### Asset Protocol
- Enabled for local asset loading
- Scope: All files (`**`)

### API Keys
- Stored in local settings (not committed to repo)
- Used only for OpenRouter requests
- Never sent to external services other than OpenRouter

---

## Target Platforms

- **Windows** (primary development)
- **macOS**
- **Linux**

### Window Configuration

- **Default Size:** 800x600
- **Resizable:** Yes
- **Title:** "domgpt"
- **Icons:** 32x32, 128x128, 128x128@2x

---

## Future Enhancements

### Planned Features

1. **Subliminals**
   - Background affirmation playback
   - Loop capability
   - Volume blending

2. **Trigger Gym**
   - Practice trigger activation
   - Build response speed
   - Measure effectiveness

3. **Habit Reinforcement**
   - Daily habit tracking
   - Micro-hypnos for habits
   - Progress visualization

4. **Mantra Recording**
   - Custom mantras
   - Repetition exercises
   - Audio playback

5. **Advanced Analytics**
   - Progress charts
   - Achievement system
   - Trend analysis

6. **Multi-User Support**
   - Profiles for multiple users
   - Privacy separation

7. **Cloud Sync**
   - Sync across devices
   - Backup/restore

8. **Offline Mode**
   - Pre-download models
   - Full offline functionality

9. **Plugin System**
   - Custom agents
   - Custom session types

10. **Voice Recognition**
    - Voice-controlled sessions
    - Real-time feedback

### Potential Directions

- **Mobile App:** React Native or Tauri Mobile
- **VR Support:** Immersive hypnosis sessions
- **Social Features:** Community challenges
- **Localization:** Multi-language support
- **Advanced TTS:** Emotional speech synthesis

---

## Performance Considerations

### Frontend
- SurrealDB WASM runs on main thread (consider worker for large datasets)
- LLM calls are async/streaming
- Audio playback uses Web Audio API

### Backend
- TTS inference is CPU-intensive (ONNX Runtime)
- Consider GPU acceleration for TTS (not yet implemented)
- Rust ensures performant audio processing

### Optimization Opportunities
- Web Worker for database queries
- Cache generated hypnosis sessions
- Lazy load large models
- Optimize audio file sizes

---

## Internationalization

Currently English-only.

**To Add Support:**
1. UI translation framework (i18next, react-intl)
2. TTS engine language support (models per language)
3. Unicode processor adjustments (`ttslib.rs`)
4. Locale-specific date/time formatting

---

## Appendix: Code Patterns

### Agent Usage Example

```typescript
import { CoachAgent } from "@/lib/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const model = createOpenRouter({
  apiKey: settings.api_key,
});

const coach = new CoachAgent(model);

// Simple chat
const response = await coach.chat("How should I start?");

// With tools
const response = await coach.act(
  { type: "user", content: [{ type: "text", text: "..." }] },
  [setDataTool, setPlanTool],
  (msg) => console.log("Progress:", msg)
);
```

### Zustand Store Pattern

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Store {
  data: DataType;
  setData: (data: DataType) => void;
  updateData: (updates: Partial<DataType>) => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      data: initialState,
      setData: (data) => set({ data }),
      updateData: (updates) =>
        set((state) => ({ data: { ...state.data, ...updates } })),
    }),
    { name: "store-name" }
  )
);
```

### SurrealDB Query Pattern

```typescript
// In component
const db = useSurrealContext();

// Select
const result = await db.select("hypno_file");

// Insert
const created = await db.create("hypno_file", {
  hypno_file: path,
  plan,
  script,
  duration_seconds,
});

// Update
await db.merge(id, { completed: true });
```

---

**Document Version:** 1.0
**Last Updated:** 2025
