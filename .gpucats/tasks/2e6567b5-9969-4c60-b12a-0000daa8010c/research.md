# Research: Crash Course - Educational Gamification Platform

## Project Overview
Build an educational gamification platform for financial statements training with Overcooked-style academic design. This is a **greenfield project** - no existing codebase.

## Confidence Level: 95%

---

## 1. Technology Stack Analysis

### 1.1 Core Framework: React + TypeScript + Vite
**Setup Command:**
```bash
npm create vite@latest crash-course -- --template react-ts
```

**Recommended Project Structure:**
```
src/
├── assets/           # Static assets (3D models, textures, images)
├── components/       # Reusable UI components
│   ├── ui/          # Generic UI (buttons, modals, cards)
│   ├── game/        # Game-specific components
│   └── quiz/        # Quiz components
├── features/         # Feature-based modules
│   ├── map/         # 3D map feature
│   ├── avatar/      # Avatar/character feature
│   ├── content/     # Educational content nodes
│   ├── quiz/        # Quiz/boss battles
│   └── chatbot/     # AI tutor
├── hooks/           # Custom React hooks
├── stores/          # Zustand state stores
├── services/        # API services
├── types/           # TypeScript types/interfaces
├── utils/           # Utility functions
└── pages/           # Page components
```

### 1.2 3D Graphics: React Three Fiber (R3F) + Drei

**Key Packages:**
```bash
npm install three @react-three/fiber @react-three/drei @react-three/rapier
```

**Core Components to Use:**
- `<Canvas>` - Main 3D scene container
- `<OrbitControls>` - Camera controls (Drei)
- `<Environment>` - Lighting presets (Drei)
- `<useAnimations>` - Character animations (Drei)

**Character Controller Options:**
1. **Ecctrl (pmndrs/ecctrl)** - Best option for avatar movement
   - Simple web-based character controller
   - Built on react-three-fiber and react-three-rapier
   - Features: capsule collider, follow camera, slope handling

2. **Custom Third Person Controller** (Wawa Sensei tutorial approach)
   - Uses @react-three/rapier for physics
   - Synchronizes animation with movement speed
   - Handles collisions and slopes

### 1.3 State Management: Zustand

**Why Zustand for 3D Games:**
- 1.2KB lightweight (critical for game performance)
- Selective re-renders (avoids full subtree re-renders)
- `subscribe` function for direct view mutations without re-renders
- Middleware support for persistence and devtools

**Store Structure Recommendation:**
```typescript
// stores/gameStore.ts
interface GameState {
  currentModule: number;
  currentNode: string | null;
  avatar: { position: [number, number, number]; animation: string };
  unlockedNodes: string[];
  quizProgress: Record<string, QuizProgress>;
  // Actions
  setCurrentNode: (node: string) => void;
  unlockNode: (node: string) => void;
  updateQuizProgress: (quizId: string, progress: QuizProgress) => void;
}
```

### 1.4 Styling: TailwindCSS
```bash
npm install tailwindcss @tailwindcss/forms autoprefixer postcss
```

---

## 2. Feature Implementation Plans

### 2.1 Interactive 3D Map (Module 1)

**Architecture:**
```
MapScene/
├── MapCanvas.tsx       # R3F Canvas wrapper
├── MapEnvironment.tsx  # Lighting, skybox
├── MapTerrain.tsx      # Ground/base geometry
├── ContentNodes.tsx    # Clickable content points
├── PathSystem.tsx      # Visual paths between nodes
└── CameraController.tsx
```

**Content Nodes Structure:**
```typescript
interface ContentNode {
  id: string;
  position: [number, number, number];
  type: 'video' | 'reading' | 'exercise' | 'quiz-boss';
  title: string;
  isLocked: boolean;
  requiredNodes: string[]; // Prerequisites
  content: ContentData;
}
```

**Visual Style (Overcooked Academic):**
- Bright, saturated colors (blues, greens, oranges)
- Low-poly stylized geometry
- Exaggerated proportions on buildings/objects
- Floating UI elements with playful animations
- Particle effects for unlocks/achievements

### 2.2 Avatar Navigation

**Implementation with Ecctrl:**
```typescript
import Ecctrl from 'ecctrl';

<Ecctrl
  capsuleHalfHeight={0.35}
  capsuleRadius={0.3}
  floatHeight={0.3}
  camInitDis={-5}
  camMaxDis={-7}
  camMinDis={-3}
>
  <AvatarModel />
</Ecctrl>
```

**Movement Modes:**
1. **Freeroam** - WASD/Arrow keys, full 3D movement
2. **Node-to-Node** - Click destination, auto-pathfind
3. **Hybrid** - Freeroam within zones, guided between zones

### 2.3 Embedded Content System

**Content Types & Implementation:**
| Type | Component | Notes |
|------|-----------|-------|
| Video | `<VideoPlayer>` | HTML5 video overlay on 3D scene |
| Reading | `<ReadingPanel>` | Markdown renderer, scrollable |
| Exercise | `<ExerciseModal>` | Interactive forms, code editors |
| Quiz Boss | `<QuizBattle>` | Gamified quiz interface |

**Content Loading:**
```typescript
// Lazy load content when node is activated
const ContentLoader = ({ nodeId, type }: { nodeId: string; type: ContentType }) => {
  const content = useSuspenseQuery(['content', nodeId], fetchContent);
  return <ContentRenderer content={content} type={type} />;
};
```

### 2.4 Quiz Boss System

**Boss Battle Flow:**
1. Approach boss node → Trigger encounter animation
2. Display boss character with health bar (questions remaining)
3. Each correct answer → Boss takes damage
4. Incorrect → Player takes damage (limited lives)
5. Defeat boss → Unlock next section

**Adaptive Quiz Algorithm (SM-2 Based):**
```typescript
interface QuizQuestion {
  id: string;
  topic: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  easeFactor: number; // SM-2 ease factor (default 2.5)
  interval: number;   // Days until next review
  repetitions: number;
  lastReview: Date | null;
}

function calculateNextReview(question: QuizQuestion, quality: 0 | 1 | 2 | 3 | 4 | 5) {
  // SM-2 algorithm implementation
  const newEF = Math.max(1.3, question.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  // ... calculate interval based on quality and ease factor
}
```

**Question Selection Logic:**
1. Prioritize questions with low ease factors (struggling areas)
2. Include spaced repetition for previously answered questions
3. Introduce new questions based on content progress
4. Dynamically adjust difficulty based on recent performance

### 2.5 AI Tutor Chatbot

**Backend Architecture:**
```
/api/chat
├── route.ts              # API endpoint
├── systemPrompt.ts       # Educational context prompt
└── types.ts
```

**OpenAI Integration:**
```typescript
// Using gpt-4-turbo or gpt-4o
const systemPrompt = `
You are an expert financial statements tutor for the Crash Course platform.
You specialize in:
- Balance sheets
- Income statements
- Cash flow statements
- Financial ratios

Context: Student is currently studying ${currentModule}.
Their recent quiz performance shows struggles with: ${strugglingTopics.join(', ')}.

Provide clear, encouraging explanations with examples.
`;

async function chat(userMessage: string, context: ChatContext) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      ...context.history,
      { role: 'user', content: userMessage }
    ],
    stream: true
  });
  return response;
}
```

**UI Component:**
- Floating chat bubble in corner
- Expand to side panel
- Typing indicators with streaming responses
- Context-aware (knows current location/content)

### 2.6 Gamification Elements

**Progress System:**
```typescript
interface PlayerProgress {
  level: number;
  xp: number;
  streak: number;           // Consecutive days
  badges: Badge[];
  completedModules: string[];
  totalQuizScore: number;
}
```

**Achievement Types:**
- First Steps (complete first node)
- Quiz Master (100% on any quiz)
- Streak Keeper (7-day streak)
- Boss Slayer (defeat first boss)
- Financial Analyst (complete Module 1)

**Visual Feedback:**
- XP pop-ups on correct answers
- Level-up celebrations (confetti, sounds)
- Badge unlock animations
- Progress bar fills

---

## 3. Backend Requirements

### 3.1 Minimal Backend (Phase 1)
Using SQLite + Prisma for local persistence:

**Schema:**
```prisma
model User {
  id        String   @id @default(uuid())
  progress  Json     // Store all progress as JSON for simplicity
  createdAt DateTime @default(now())
}

model QuizAttempt {
  id         String   @id @default(uuid())
  questions  Json     // Question IDs and responses
  score      Int
  duration   Int      // Seconds
  createdAt  DateTime @default(now())
}
```

### 3.2 API Endpoints
```
POST /api/progress    - Save progress
GET  /api/progress    - Load progress
POST /api/quiz/submit - Submit quiz answers
POST /api/chat        - AI tutor messages
```

---

## 4. File Structure (Complete)

```
crash-course/
├── public/
│   ├── models/        # GLTF/GLB 3D models
│   ├── textures/      # Texture files
│   └── audio/         # Sound effects, music
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── Card.tsx
│   │   ├── game/
│   │   │   ├── MapCanvas.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── ContentNode.tsx
│   │   │   └── PathRenderer.tsx
│   │   ├── content/
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── ReadingPanel.tsx
│   │   │   └── ExerciseModal.tsx
│   │   ├── quiz/
│   │   │   ├── QuizBattle.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── BossCharacter.tsx
│   │   │   └── ResultsScreen.tsx
│   │   └── chatbot/
│   │       ├── ChatWidget.tsx
│   │       ├── ChatMessage.tsx
│   │       └── ChatInput.tsx
│   ├── features/
│   │   └── module1/
│   │       ├── Module1Map.tsx
│   │       ├── nodes.ts          # Node definitions
│   │       └── content/          # Module 1 content
│   ├── stores/
│   │   ├── gameStore.ts
│   │   ├── quizStore.ts
│   │   └── chatStore.ts
│   ├── hooks/
│   │   ├── useProgress.ts
│   │   ├── useQuiz.ts
│   │   └── useChat.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── openai.ts
│   ├── types/
│   │   ├── game.ts
│   │   ├── quiz.ts
│   │   └── content.ts
│   ├── utils/
│   │   ├── sm2.ts               # Spaced repetition algorithm
│   │   └── scoring.ts
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── GameMap.tsx
│   │   └── Profile.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server/                       # Backend (optional separate)
│   ├── index.ts
│   ├── routes/
│   └── prisma/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

---

## 5. Implementation Phases

### Phase 1: Core Setup (Week 1)
1. Initialize Vite + React + TypeScript project
2. Install and configure dependencies (R3F, Drei, Zustand, Tailwind)
3. Create basic file structure
4. Build MapCanvas with placeholder 3D scene

### Phase 2: 3D Map & Navigation (Week 2)
1. Create Module 1 map layout with content nodes
2. Implement avatar with Ecctrl controller
3. Add node interaction (click to approach)
4. Build path visualization between nodes

### Phase 3: Content System (Week 3)
1. Create content node modals (video, reading, exercise)
2. Implement placeholder content for Module 1
3. Build progress tracking with Zustand
4. Add node unlock logic

### Phase 4: Quiz Boss System (Week 4)
1. Design quiz battle UI
2. Implement SM-2 adaptive algorithm
3. Create boss encounter flow
4. Build results and progression

### Phase 5: AI Chatbot (Week 5)
1. Set up backend API route for chat
2. Integrate OpenAI API
3. Build chat widget UI
4. Add context awareness (current module, struggles)

### Phase 6: Gamification & Polish (Week 6)
1. Add XP/leveling system
2. Create achievements/badges
3. Visual polish (animations, particles, sounds)
4. Website hosting setup

---

## 6. Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "three": "^0.170.0",
    "@react-three/fiber": "^8.17.0",
    "@react-three/drei": "^9.114.0",
    "@react-three/rapier": "^1.4.0",
    "ecctrl": "^1.1.0",
    "zustand": "^5.0.0",
    "openai": "^4.70.0",
    "@tanstack/react-query": "^5.59.0",
    "react-markdown": "^9.0.0",
    "framer-motion": "^11.11.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "tailwindcss": "^3.4.0",
    "@types/three": "^0.170.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0"
  }
}
```

---

## 7. Design Guidelines (Overcooked Academic Style)

**Color Palette:**
- Primary: `#4F46E5` (Indigo) - Academic trust
- Secondary: `#F59E0B` (Amber) - Energy/achievement
- Accent: `#10B981` (Emerald) - Success/growth
- Background: `#F8FAFC` (Light) / `#1E293B` (Dark)

**3D Style Characteristics:**
- Low-poly stylized models
- Soft shadows with ambient occlusion
- Bright, saturated materials
- Rounded edges, exaggerated proportions
- Floating/bouncy animations

**UI Elements:**
- Rounded corners (lg to xl)
- Playful shadows and depth
- Animated transitions (spring physics)
- Progress indicators everywhere
- Encouraging micro-copy

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| 3D performance on low-end devices | Use LOD, optimize models, provide 2D fallback |
| Complex quiz algorithm tuning | Start simple (basic adaptive), iterate with data |
| OpenAI API costs | Cache common questions, rate limit, consider alternatives |
| Content creation time | Use placeholder content, design for easy updates |
| Large asset bundle size | Code splitting, lazy loading, CDN for 3D models |

---

## 9. Resources & References

### Official Documentation
- [React Three Fiber Docs](https://r3f.docs.pmnd.rs/)
- [Drei Helper Library](https://github.com/pmndrs/drei)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Ecctrl Character Controller](https://github.com/pmndrs/ecctrl)

### Tutorials
- [Wawa Sensei R3F Game Tutorial](https://wawasensei.dev/tuto/react-three-fiber-tutorial-hiragana-katakana-game)
- [Third Person Controller Tutorial](https://wawasensei.dev/tuto/third-person-controller-react-three-fiber-tutorial)
- [React AI Chat with OpenAI](https://www.robinwieruch.de/react-ai-chat/)

### Algorithms
- [SM-2 Spaced Repetition Algorithm](https://github.com/open-spaced-repetition/fsrs4anki/wiki/spaced-repetition-algorithm:-a-three%E2%80%90day-journey-from-novice-to-expert)
- [FSRS (Free Spaced Repetition Scheduler)](https://www.npmjs.com/package/ts-fsrs)

### 3D Assets
- [Sketchfab Overcooked-style Assets](https://sketchfab.com/3d-models/overcooked-kitchen-assets-fan-art-ec99c64c346347a89454f569054ddb86)
- [Poly Pizza Free 3D Models](https://poly.pizza/)

---

## 10. Summary

This project is **highly feasible** with the recommended tech stack. Key insights:

1. **React Three Fiber** provides excellent React integration for 3D
2. **Ecctrl** solves avatar navigation out of the box
3. **Zustand** is ideal for game state with minimal re-renders
4. **SM-2 algorithm** provides proven adaptive learning
5. **OpenAI API** enables powerful tutoring capabilities
6. **Overcooked aesthetic** works well with low-poly web 3D (performance-friendly)

The biggest effort will be in:
- Creating/sourcing 3D models that match the art style
- Building the adaptive quiz system with proper SM-2 implementation
- Designing engaging boss battle UX

**Recommendation:** Start with a vertical slice - one complete node path with video → quiz boss → unlock - to validate the full flow before expanding.
