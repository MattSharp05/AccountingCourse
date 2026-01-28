# Specification: Crash Course - Educational Gamification Platform

## 1. Project Overview

**Crash Course** is an educational gamification platform for financial statements training featuring an Overcooked-style academic design. The platform combines 3D exploration, interactive learning content, adaptive quizzes, and AI tutoring to create an engaging learning experience.

### 1.1 Vision Statement
Create a "learning adventure" where students explore a colorful 3D world, unlock knowledge through video/reading nodes, face quiz bosses as checkpoints, and receive personalized AI tutoring—all with the playful energy of Overcooked meets academia.

### 1.2 Target Users
- Students learning financial statements (accounting, finance)
- Self-learners wanting gamified education
- Educators looking for interactive training tools

---

## 2. Core Requirements

### 2.1 Interactive 3D Map System
| Requirement | Description | Priority |
|-------------|-------------|----------|
| R-MAP-01 | Display Module 1 map with at least 8 content nodes | Must Have |
| R-MAP-02 | Nodes show locked/unlocked state visually | Must Have |
| R-MAP-03 | Visual paths connect related nodes | Should Have |
| R-MAP-04 | Overcooked-style low-poly aesthetic | Must Have |
| R-MAP-05 | Responsive to different screen sizes | Should Have |

### 2.2 Avatar Navigation
| Requirement | Description | Priority |
|-------------|-------------|----------|
| R-NAV-01 | Third-person avatar with WASD/arrow key movement | Must Have |
| R-NAV-02 | Camera follows avatar smoothly | Must Have |
| R-NAV-03 | Avatar collides with environment boundaries | Must Have |
| R-NAV-04 | Click-to-move alternative navigation | Should Have |
| R-NAV-05 | Avatar animations (idle, walk, run) | Should Have |

### 2.3 Content Node System
| Requirement | Description | Priority |
|-------------|-------------|----------|
| R-CON-01 | Video content nodes with embedded player | Must Have |
| R-CON-02 | Reading content nodes with markdown support | Must Have |
| R-CON-03 | Exercise nodes with interactive questions | Should Have |
| R-CON-04 | Quiz boss nodes as gated checkpoints | Must Have |
| R-CON-05 | Node completion tracking (mark as done) | Must Have |
| R-CON-06 | Prerequisites system (unlock after completing required nodes) | Must Have |

### 2.4 Quiz Boss System
| Requirement | Description | Priority |
|-------------|-------------|----------|
| R-QUZ-01 | Boss battle UI with health bar visualization | Must Have |
| R-QUZ-02 | Multiple-choice question format | Must Have |
| R-QUZ-03 | Damage animation on correct/incorrect answers | Must Have |
| R-QUZ-04 | Pass threshold (70%) to defeat boss | Must Have |
| R-QUZ-05 | Results screen with score breakdown | Must Have |
| R-QUZ-06 | Retry mechanism on failure | Must Have |
| R-QUZ-07 | Adaptive difficulty using SM-2 algorithm | Should Have |

### 2.5 AI Tutor Chatbot
| Requirement | Description | Priority |
|-------------|-------------|----------|
| R-AI-01 | Floating chat widget accessible from any screen | Must Have |
| R-AI-02 | Integration with OpenAI API (GPT-4) | Must Have |
| R-AI-03 | Streaming responses for real-time feedback | Should Have |
| R-AI-04 | Context-aware (knows current module/topic) | Should Have |
| R-AI-05 | Pre-defined financial statements knowledge | Must Have |
| R-AI-06 | Chat history persistence during session | Should Have |

### 2.6 Gamification System
| Requirement | Description | Priority |
|-------------|-------------|----------|
| R-GAM-01 | XP points awarded for completing content | Must Have |
| R-GAM-02 | Level progression system | Should Have |
| R-GAM-03 | Achievement badges (5+ achievements) | Should Have |
| R-GAM-04 | Visual feedback (confetti, pop-ups) on achievements | Should Have |
| R-GAM-05 | Progress tracking across modules | Must Have |

### 2.7 Website & Hosting
| Requirement | Description | Priority |
|-------------|-------------|----------|
| R-WEB-01 | Landing/home page with game entry | Must Have |
| R-WEB-02 | Responsive design for desktop/tablet | Must Have |
| R-WEB-03 | Fast loading (< 5s initial load) | Should Have |
| R-WEB-04 | Deployable to Vercel/similar platform | Must Have |

---

## 3. Technical Specifications

### 3.1 Technology Stack
- **Frontend Framework**: React 18 + TypeScript + Vite
- **3D Graphics**: React Three Fiber + Drei + Rapier
- **Character Controller**: Ecctrl
- **State Management**: Zustand
- **Styling**: TailwindCSS
- **Backend**: Node.js/Express (minimal API)
- **Database**: SQLite + Prisma (local progress persistence)
- **AI**: OpenAI API (GPT-4-turbo)
- **Deployment**: Vercel

### 3.2 Project Structure
```
crash-course/
├── public/
│   ├── models/          # 3D models (GLTF/GLB)
│   └── audio/           # Sound effects
├── src/
│   ├── components/
│   │   ├── ui/          # Buttons, modals, progress bars
│   │   ├── game/        # 3D scene components
│   │   ├── content/     # Content viewers
│   │   ├── quiz/        # Quiz battle components
│   │   └── chatbot/     # AI chat widget
│   ├── features/
│   │   └── module1/     # Module 1 specific content
│   ├── stores/          # Zustand stores
│   ├── hooks/           # Custom hooks
│   ├── services/        # API services
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── pages/           # Page components
├── server/              # Backend API
└── prisma/              # Database schema
```

### 3.3 Data Models

#### ContentNode
```typescript
interface ContentNode {
  id: string;
  type: 'video' | 'reading' | 'exercise' | 'quiz-boss';
  title: string;
  description: string;
  position: [number, number, number];
  prerequisites: string[];
  xpReward: number;
  content: VideoContent | ReadingContent | ExerciseContent | QuizContent;
}
```

#### QuizQuestion
```typescript
interface QuizQuestion {
  id: string;
  topic: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}
```

#### PlayerProgress
```typescript
interface PlayerProgress {
  currentModule: number;
  completedNodes: string[];
  xp: number;
  level: number;
  badges: string[];
  quizAttempts: QuizAttempt[];
}
```

---

## 4. Design Specifications

### 4.1 Visual Style: Overcooked Academic
- **Aesthetic**: Low-poly, colorful, exaggerated proportions
- **Mood**: Playful, energetic, encouraging

### 4.2 Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary (Indigo) | #4F46E5 | Academic trust, buttons, links |
| Secondary (Amber) | #F59E0B | Energy, achievements, highlights |
| Accent (Emerald) | #10B981 | Success, growth, correct answers |
| Error (Rose) | #F43F5E | Wrong answers, warnings |
| Background Light | #F8FAFC | Light mode background |
| Background Dark | #1E293B | Dark mode / 3D scene |

### 4.3 Typography
- **Headings**: Bold, rounded sans-serif (Nunito or similar)
- **Body**: Clean, readable sans-serif (Inter or system font)

### 4.4 3D Scene Guidelines
- Soft shadows with ambient occlusion
- Bright, saturated materials
- Floating/bouncy animations on interactive elements
- Particle effects for achievements/unlocks

---

## 5. Module 1 Content: Intro to Financial Statements

### 5.1 Learning Objectives
1. Understand what financial statements are and why they matter
2. Identify the three main financial statements
3. Recognize key components of each statement
4. Interpret basic financial data

### 5.2 Content Map (8 Nodes)
1. **Welcome Video** (video) - Introduction to the course
2. **What Are Financial Statements?** (reading) - Overview
3. **The Balance Sheet** (video) - Assets, liabilities, equity
4. **Balance Sheet Exercise** (exercise) - Practice identifying items
5. **The Income Statement** (reading) - Revenue, expenses, profit
6. **Income Statement Quiz** (quiz-boss) - First checkpoint
7. **The Cash Flow Statement** (video) - Operating, investing, financing
8. **Module 1 Boss: Financial Foundations** (quiz-boss) - Final exam

### 5.3 Placeholder Content
All content will use placeholder text/videos for MVP. Real content integration is Phase 2.

---

## 6. Success Criteria

### 6.1 Functional Criteria
- [ ] User can navigate a 3D map with avatar using WASD keys
- [ ] User can click on content nodes to open video/reading content
- [ ] User can complete a quiz boss battle with pass/fail outcome
- [ ] User can access AI chatbot and receive relevant responses
- [ ] Progress is saved locally and persists between sessions
- [ ] At least 8 content nodes are functional in Module 1

### 6.2 Quality Criteria
- [ ] Consistent Overcooked-style visual design
- [ ] Smooth 60fps animation in 3D scene (desktop)
- [ ] Responsive UI that works on desktop (1024px+)
- [ ] Quiz questions provide helpful feedback on wrong answers
- [ ] AI chatbot responses are relevant to financial statements

### 6.3 Technical Criteria
- [ ] TypeScript strict mode with no compile errors
- [ ] Zustand stores properly manage state
- [ ] API endpoints are functional and documented
- [ ] Application builds and deploys successfully
- [ ] Loading performance < 5 seconds on modern connection

---

## 7. Out of Scope (Phase 2)

- User authentication / accounts
- Payment processing
- Mobile-optimized experience
- Modules 2-4
- Real educational content (using placeholders)
- Multiplayer features
- Leaderboards
- Social sharing

---

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 3D performance on low-end devices | Medium | Use LOD, optimize models, test on various hardware |
| OpenAI API costs/limits | Medium | Implement rate limiting, cache responses |
| Complex quiz algorithm | Low | Start with simple scoring, add SM-2 incrementally |
| 3D model creation time | Medium | Use free assets from Poly Pizza, Sketchfab |
| Large bundle size | Medium | Code splitting, lazy loading, CDN for models |

---

## 9. Acceptance Checklist

### MVP Launch Requirements
- [ ] Module 1 map renders with 8 content nodes
- [ ] Avatar navigates map with collision detection
- [ ] All content types (video, reading, exercise, quiz) functional
- [ ] Quiz boss with health bar and pass/fail logic
- [ ] AI chatbot responds to financial statement questions
- [ ] XP system tracks progress
- [ ] Application deploys to Vercel
- [ ] No critical bugs or crashes

---

*Document Version: 1.0*
*Created: January 2025*
*Status: Ready for Review*
