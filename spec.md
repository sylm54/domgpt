Mobile Application
Concept: A fully integrated, agent-driven mobile app acting as an intelligent, adaptive conditioning trainer. It generates deeply personalized audio sessions and other conditionings, evolves based on feedback, and reinforces conditioning through active daily engagement. 

# Spec
## App Overview
 * Core Experience: Daily usage. Primary interaction using the different conditionings.
 * Technical Architecture:
   * Ensemble of LLM agents handling planning, creative writing, and data analysis.
   * Logic Engine: User-selectable between Local (e.g., LMStudio, Ollama) or Cloud (OpenRouter/Direct API).
   * Client: Tauri-based mobile application for performance and security.
   * Audio Engine: User-selectable between Local TTS (system-level/Piper) or Cloud TTS (ElevenLabs/OpenAI Audio). Handles DSP for subliminal masking.
   * Protocol: SSML (Speech Synthesis Markup Language) base with custom extensions for pacing, triggers, and binaural/ambient layering.

## Steering
### Onboarding
 * Choose Processing Mode: Toggle between Local-First (Privacy/Offline) or Cloud-First (High Fidelity).
 * Set API keys (if Cloud selected).
 * Chat with Coach agent:
   * Discovery: Conversational gathering of conditioning goals, blockers, and experience level.
   * Calibration: Sets of mini-hypnos to gauge responsiveness to different induction styles. Invokes the hypno planner; user listens directly in chat.
   * Co-Creation: Collaborative brainstorming of triggers, anchors, and suggestions.
 * Sets Structured User Profile and current conditioning plan.

### Coaching Session
 * Trigger: Initiated by User for manual plan adjustment or requested by Interview Agent.
 * Coach Agent:
   * Analyzes debrief data, trend logs, and the structured profile.
   * Conducts a conversational review with the user.
   * Updates the User Profile JSON and active Plan as needed.

### Reflection
   * Trigger: User-initiated (manual start when in a receptive state).
   * Interview Agent generates 4–8 dynamic questions aimed to see conditioning plan progress.
   * Format: Mix of Likert scales (1–10), Yes/No, and multiple-choice selections.

## Conditioning
### Hypno Session
#### Generation
* Trigger: Plan gets updated or user requests "New Session."
* Pipeline Flow:
	* Planner Agent: Reads the Structured User Profile.
	* Writer Agent: Receives the plan. Writes the script using SSML + custom markup tags (e.g., `<break time="5s"/>`, `<trigger id="alpha_anchor"/>`).
	* Assembler: Parses the SSML, routes to selected TTS (Local/Cloud), mixes background ambience, and compiles the final audio file/stream.
#### Session
* User plays the generated audio.
* Debrief (Immediate):
	* Interview Agent generates 4–8 dynamic questions.
	* Focus: Depth of trance, clarity of visualization, emotional response, and trigger effectiveness.

### Subliminals
#### Generation
* Trigger: Plan update or specific request for "Passive Mode."
* Pipeline Flow:
    * Planner Agent: Extracts core affirmations from the current Goal/Plan.
    * Writer Agent: Simplifies affirmations into short, first-person present-tense statements.
    * Assembler: 
        * Renders TTS.
#### Session
* Passive playback (User listens while working/sleeping).
* Infinite loop until stopped.

### Trigger Gym
#### Generation
* Trigger: User selects "Practice" mode.
* Pipeline Flow:
    * Planner Agent: Selects under-performing or new anchors from `User Profile > Anchors`.
    * Writer Agent: Generates short "Firing" scripts (Instructions + Trigger Word + Consequence).
#### Session
* Interactive Audio/Haptic loop.
* Flow: 
    1. Instruction: "Take a deep breath."
    2. Stimulus: Audio plays Trigger Word + Phone vibrates pattern.
    3. Action: User presses button to confirm sensation/visualization.
* Repetition: High frequency, short duration.
#### Debrief (Immediate):
* Short check: "Did the feeling arrive immediately?" (Yes/No/Delayed).
* Updates `Anchor Strength` score in Profile.

### Challenges
#### Generation
* Trigger: Daily refresh or Coach assignment.
* Pipeline Flow:
    * Planner Agent: Identifies real-world scenarios relevant to the Goal.
    * Writer Agent: Formulates a specific, actionable micro-task (e.g., "Make eye contact for 3 seconds").
#### Session
* User reviews the task card.
* User performs task in real life.
* User marks "Complete" in app.
#### Debrief (Post-Task):
* User initiates "Report".
* Interview Agent asks: "What was your anxiety level before vs during?" "Did you use your trigger?"

### Habits
#### Generation
* Trigger: Established during Coaching Session.
* Pipeline Flow:
    * Coach Agent: Defines the Habits and routines.
    * Logic: Adds to the daily tracker database.
#### Session
* Active Daily List.
* User ticks off habits.
#### Debrief (Weekly):
* Aggregated consistency data presented during Coaching Session.

### Mantra Mode
#### Generation
* Trigger: User opens "Mantra" tab.
* Pipeline Flow:
    * Writer Agent: Generates 20-50 punchy, rhythmic affirmations.
#### Session
* UI: Infinite vertical scroll of large text.
* Audio: Optional rhythmic TTS reading (Chant style).
* User interaction: "Save" (Heart) specific mantras to weight them higher in future generations.
#### Debrief (Passive):
* Data collection: Time spent in mode, number of "Hearts."

## Data
### Settings
* API keys and model choices.
* Engine Toggle: [Local | Cloud] for both LLM Logic and TTS Synthesis.

### User Profile
* Profile: User Profile general info on user
* Plan: Current active conditioning roadmap and session structure.
* Goal: Current primary objective.
* Infos: Vector database/Array for RAG-based retrieval of specific user anecdotes and preferences.

## Agents
### Coach Agent
 - Context: App functionality and Structured User Profile.
- Goal: Maintain the user's progress and update the conditioning roadmap.
 - Tools:
	- SetData(aspect: "plan" | "profile" | "goal", content: JSON_string)
	- SaveInfo(content: string)

### Hypno Planner Agent
- Context: Structured User Profile.
- Goal: Create a high-level skeleton for the specific conditioning type requested.
- Tools:
	- CreateSection(prompt: string): string 
	- SearchInfo(query: string): string

### Hypno Writer Agent
- Context: Session Brief and specific RAG-injected User Infos.
- System Prompt: Adaptive creative writer. Styles: Hypnotic (NLP/Pacing), Direct (Affirmations), or Instructional (Gym/Challenges).
- Output: SSML-formatted script with custom tags.

### Interview Agent
- Context: User Profile + historical interview data.
* Goal: Quantify conditioning effectiveness and mental state.
* Tools:
   * AskMultipleChoice(question, choices[], key)
   * AskRate(prompt, min_label, max_label, key)
   * AskOpenText(question, key)
   * RequestCoach(reason)
