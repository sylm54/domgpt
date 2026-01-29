## Techstack
- bun
- tauri
- React
- React Router
- shadcn
- Zustand

## Structure
- contexts: global states
- lib: helper functions
- components: UI components
- pages: different pages

## Existing Components & Structure

### Contexts (`src/contexts/`)
- `ConfigContext.tsx` - Global configuration state management

### Components (`src/components/`)

#### Custom Components
- `markdown-text.tsx` - Markdown text rendering component
- `tool-fallback.tsx` - Fallback UI for tool/function calls
- `tooltip-icon-button.tsx` - Icon button with tooltip functionality

#### UI Components (`src/components/ui/`)
Shadcn-based UI primitives:
- `avatar.tsx` - User avatar component
- `badge.tsx` - Badge/label component
- `button.tsx` - Button component with variants
- `card.tsx` - Card container component
- `checkbox.tsx` - Checkbox input component
- `collapsible.tsx` - Collapsible content component
- `dialog.tsx` - Dialog/modal component
- `input.tsx` - Text input component
- `label.tsx` - Form label component
- `select.tsx` - Dropdown select component
- `textarea.tsx` - Multi-line text input component
- `tooltip.tsx` - Tooltip component

#### AI Components (`src/components/ui/shadcn-io/ai/`)
Specialized AI chat and response components:
- `actions.tsx` - Action buttons for AI responses
- `branch.tsx` - Conversation branch display
- `chat.tsx` - Main chat container component
- `code-block.tsx` - Code syntax highlighting
- `conversation.tsx` - Conversation thread display
- `image.tsx` - Image display component
- `loader.tsx` - Loading states for AI responses
- `message.tsx` - Individual message display
- `prompt-input.tsx` - User input field
- `reasoning.tsx` - AI reasoning/thought display
- `response.tsx` - AI response container
- `source.tsx` - Source reference display
- `task.tsx` - Task/step display
- `tool.tsx` - Tool/function call display
- `web-preview.tsx` - Web content preview

### Lib (`src/lib/`)

#### Helper Functions
- `http.ts` - HTTP request utilities
- `tts-rust.ts` - Text-to-speech Rust integration
- `utils.ts` - General utility functions

#### Models (`src/lib/models/`)
- `index.ts` - Model definitions and exports
- `openrouter.ts` - OpenRouter API integration

### Pages (`src/pages/`)
- Currently empty - add new page components here
