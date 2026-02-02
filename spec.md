Mobile Application
Concept: A fully integrated, agent-driven mobile app acting as an intelligent, adaptive conditioning trainer. It generates deeply personalized audio sessions and other conditionings, evolves based on feedback, and reinforces conditioning through active daily engagement.

# Spec
## Tech Stack
- **Runtime**: Tauri (Rust + Bun)
- **Frontend**: React + React Router + shadcn-ui + Framer Motion
- **State Management**: React Context (Config, SurrealDB) + Zustand (Settings, Profile)
- **Database**: SurrealDB
- **LLM**: OpenRouter (via SDK) with tool calling support
- **TTS**: Rust-based audio generation with SSML/ScriptBuilder API

## Project Structure
- **contexts/**: React Context for global state (ConfigContext, SurrealProvider)
- **lib/**: Core utilities and services
  - agent.ts: Agent system (Coach, HypnoPlanner, HypnoWriter, Interview, Challenge)
  - models/openrouter.ts: OpenRouter SDK integration
  - tts-rust.ts: TTS generation with ScriptBuilder
  - http.ts: Tauri HTTP fetcher
  - utils.ts: Tailwind class merging utility
- **components/**: UI components
  - ui/: shadcn base components (button, card, dialog, etc.)
  - ui/shadcn-io/ai/: AI chat components (chat, conversation, message, tool, response)
  - dashboard/: StatsCard, QuickActionButton
  - hypno/: SessionGenerator, SessionPlayer
  - steering/: CoachChat, OnboardingWizard, Questionaire, ReflectionSession
  - challenge/: ChallengeGenerator, ChallengeList
  - history/: HistoryTimeline
- **pages/**: Application pages
  - Dashboard: Main hub with stats and navigation
  - OnboardingPage: Setup wizard
  - CoachPage: AI coach chat
  - ChallengesPage: Daily challenges
  - ReflectionPage: Self-reflection session
  - HypnoNewPage: Generate new hypnosis session
  - HypnoPlayPage: Play session
- **data/**: Zustand stores with persistence
  - settings.ts: AppSettings (llm_engine, main_model, tts_engine, coach_traits, processing_mode)
  - profile.ts: UserProfile (profile, goal, plan, created_at)

## App Overview
* Core Experience: Daily usage. Primary interaction using the different conditionings.
* Technical Architecture:
    * Ensemble of LLM agents handling planning, creative writing, and data analysis.
    * Logic Engine: OpenRouter/Direct API with tool calling support.
    * Client: Tauri-based mobile application for performance and security.
    * Audio Engine: Rust-based TTS with ScriptBuilder API for SSML-like script generation.
    * Database: SurrealDB for persistent storage.
    * Protocol: Custom XML-based script format with tags for pacing, triggers, effects, and layering.

## Steering
### Onboarding
- Page: OnboardingPage (/onboarding)
- Component: OnboardingWizard
- Flow:
  * Choose Processing Mode: Toggle between Local-First (Privacy/Offline) or Cloud-First (High Fidelity).
  * Set API keys (if Cloud selected).
  * Chat with Coach agent:
    - Discovery: Conversational gathering of conditioning goals, blockers, and experience level.
    - Calibration: Sets of mini-hypnos to gauge responsiveness to different induction styles.
    - Co-Creation: Collaborative brainstorming of triggers, anchors, and suggestions.
  * Sets Structured User Profile and current conditioning plan.

### Coaching Session
- Page: CoachPage (/coach)
- Component: CoachChat
- Trigger: Initiated by User for manual plan adjustment or requested by Interview Agent.
- Coach Agent:
  * Analyzes debrief data, trend logs, and the structured profile.
  * Conducts a conversational review with the user.
  * Updates the User Profile JSON and active Plan as needed.
- UI: shadcn-io AI chat system with streaming support.

### Reflection
- Page: ReflectionPage (/reflection)
- Component: ReflectionSession
- Trigger: User-initiated (manual start when in a receptive state).
- Interview Agent generates 4–8 dynamic questions aimed to see conditioning plan progress.
- Format: Mix of Likert scales (1–10), Yes/No, and multiple-choice selections.
- Component: Questionaire for form-based interactions.

## Conditioning
### Hypno Session
#### Generation
- Page: HypnoNewPage (/hypno/new)
- Component: SessionGenerator
- Trigger: Plan gets updated or user requests "New Session."
- Pipeline Flow:
  * Planner Agent: Reads the Structured User Profile.
  * Writer Agent: Receives the plan. Writes the script using SSML + custom markup tags.
  * TTS Generation: Uses tts-rust.ts with ScriptBuilder API for audio generation.
    - text(): Add spoken text
    - pause(): Add pause
    - sound(): Add sound effect (beep, pop, bubble_pop, camera_shutter, censor_beep, heart_beat, padlock, snap)
    - voice(): Wrap content in voice tag (female, female2, male, male2)
    - speed(), volume(): Audio adjustments
    - effect(): Add echo or binaural effect
    - loop(): Loop content
    - overlay(): Overlay multiple parts
- After generation, auto-navigates to HypnoPlayPage.

#### Session
- Page: HypnoPlayPage (/hypno/play/:sessionId)
- Component: SessionPlayer
- User plays the generated audio.
- Debrief (Immediate): Not yet fully implemented.

### Subliminals
#### Generation
- Status: Not yet implemented in pages/components.
- Planned Flow:
  * Planner Agent: Extracts core affirmations from the current Goal/Plan.
  * Writer Agent: Simplifies affirmations into short, first-person present-tense statements.
  * Assembler: Renders TTS with infinite loop capability.
#### Session
* Passive playback (User listens while working/sleeping).
* Infinite loop until stopped.

### Challenges
#### Generation
- Page: ChallengesPage (/challenges)
- Component: ChallengeGenerator
- Trigger: Daily refresh or Coach assignment.
- Pipeline Flow:
  * Challenge Agent: Identifies real-world scenarios relevant to the Goal.
  * Writer Agent: Formulates a specific, actionable micro-task (e.g., "Make eye contact for 3 seconds").
#### Session
- Page: ChallengesPage (/challenges)
- Component: ChallengeList
- User reviews the task card.
- User performs task in real life.
- User marks "Complete" in app.
#### Debrief (Post-Task):
* Status: Not yet fully implemented.
* Planned: User initiates "Report", Interview Agent asks follow-up questions.

## Data
### Settings (Zustand Store)
- File: src/data/settings.ts
- Persistence: localStorage with key "settings-storage"
- Properties:
  - llm_engine: LLM configuration (type: "openrouter", optional API key)
  - main_model: Selected LLM model name
  - tts_engine: Text-to-speech engine configuration (type: "inbuild")
  - coach_traits: Array of personality traits (soft, motivational, encouraging, empathetic, direct, informative, intense, pushing, assertive)
  - processing_mode: Processing mode (defaults to "local")
- Actions:
  - updateSettings(): Updates partial settings

### User Profile (Zustand Store)
- File: src/data/profile.ts
- Persistence: localStorage with key "profile-storage"
- Properties:
  - profile: User's profile text
  - goal: User's goals text
  - plan: Conditioning plan containing:
    - hypno: Hypnosis plan content
    - challenges: Challenge plan content
    - user: User plan content
    - interview: Interview plan content
  - created_at: Profile creation timestamp
- Actions:
  - setProfile(): Sets the entire profile
  - updateProfile(): Updates partial profile fields
  - updatePlan(): Updates specific plan features (hypno, challenges, user, interview)
  - getProfile(): Returns the current profile

### Configuration (React Context)
- File: src/contexts/ConfigContext.tsx
- Loads from config.json in app config directory
- Currently has empty schema (can be extended)

### Database (SurrealDB)
- File: src/contexts/surreal.tsx
- React Context for SurrealDB connection
- Provides database client throughout the app
- Auto-connects on component mount

## Agents
### Coach Agent
- File: src/lib/agent.ts (CoachAgent class)
- Context: App functionality and Structured User Profile.
- Goal: Maintain the user's progress and update the conditioning roadmap.
- Features: Handles onboarding, coaching sessions, and reflection.

## Routing
- Router: React Router (createMemoryRouter for Tauri)
- Routes:
  - `/` - Dashboard (main hub)
  - `/onboarding` - Onboarding wizard (shown when onboarding not complete)
  - `/coach` - AI coach chat
  - `/challenges` - Daily challenges
  - `/reflection` - Self-reflection session
  - `/hypno/new` - Generate new hypnosis session
  - `/hypno/play/:sessionId` - Play specific hypnosis session
- Navigation Bar: Shows links to Dashboard, New Session, Coach, Challenges, Reflect
- Layout: Shared layout with navigation bar and gradient styling

## UI/UX Patterns
- Design System: shadcn-ui with Radix UI primitives
- Styling: Tailwind CSS with custom design tokens (hsl variables)
- Theme: Pink/magenta/fuchsia color palette with gradient effects
- Animations: Framer Motion for hover effects, transitions, entrance animations
- Common Patterns:
  - CVA (class-variance-authority) for component variants
  - React.forwardRef for composition
  - Sub-component pattern (CardHeader, CardTitle, DialogContent, etc.)
  - Slot composition with asChild prop
  - cn() utility for conditional class merging
- Accessibility: ARIA labels, sr-only spans, proper roles
- AI-Specific:
  - Streaming response support
  - Markdown rendering with Prism.js syntax highlighting
  - Tool call display with expand/collapse
  - Scroll-to-bottom with button indicator
  - User/assistant avatar differentiation

### Hypno Planner Agent
- File: src/lib/agent.ts (HypnoPlannerAgent class)
- Context: Structured User Profile.
- Goal: Create a high-level skeleton for the specific conditioning type requested.

### Hypno Writer Agent
- File: src/lib/agent.ts (HypnoWriterAgent class)
- Context: Session Brief and specific RAG-injected User Infos.
- System Prompt: Adaptive creative writer. Styles: Hypnotic (NLP/Pacing), Direct (Affirmations), or Instructional (Gym/Challenges).
- Output: SSML-formatted script with custom tags.

### Interview Agent
- File: src/lib/agent.ts (InterviewAgent class)
- Context: User Profile + historical interview data.
- Goal: Quantify conditioning effectiveness and mental state.

### Challenge Agent
- File: src/lib/agent.ts (ChallengeAgent class)
- Context: User goals and current conditioning plan.
- Goal: Generate real-world challenges for users.

### Agent System
- Base Class: Agent (src/lib/agent.ts)
- Core Methods:
  - chat(message): Simple user chat interaction
  - act(message, tools, onProgress): Tool-calling action with progress updates
  - addAgentMessage(message): Add assistant message to conversation
  - clearConversation(): Clear conversation history
  - setSystemPrompt(prompt): Update system prompt
  - getFullContext(): Get complete conversation including system messages
- Conversation State: Managed by AgentContext with subscription mechanism

### Tool Calling
- Implementation: OpenRouterModel.act() in src/lib/models/openrouter.ts
- Features:
  - Sequential tool execution loop
  - Progress callbacks during tool calls
  - Error handling for tool failures
  - Token usage tracking
