# Implementation Plan: Crash Course

## Overview
This plan builds Crash Course in 6 phases, starting with foundation setup and progressively adding features. Each step is designed to produce testable, incremental progress.

---

## Phase 1: Project Foundation

1. Initialize Vite project with React and TypeScript template
   - Create new project using `npm create vite@latest`
   - Configure TypeScript strict mode
   - Set up initial file structure per spec

2. Install and configure core dependencies
   - Install Three.js, React Three Fiber, Drei, Rapier
   - Install Zustand for state management
   - Install TailwindCSS and configure with design tokens

3. Create basic UI component library
   - Build Button, Modal, Card, ProgressBar components
   - Set up Overcooked-style color palette and typography
   - Create reusable layout components

4. Set up Zustand stores skeleton
   - Create gameStore for map/navigation state
   - Create quizStore for quiz progress tracking
   - Create chatStore for AI conversation history

---

## Phase 2: 3D Map & Environment

5. Build MapCanvas component with R3F
   - Set up Canvas with proper sizing and performance settings
   - Configure lighting (ambient + directional for Overcooked style)
   - Add sky/environment background

6. Create Module 1 terrain and environment
   - Build low-poly ground plane with colorful materials
   - Add decorative 3D elements (books, buildings, props)
   - Create visual boundaries for the playable area

7. Implement content node 3D markers
   - Create ContentNode component with icon/type indicators
   - Position 8 nodes according to Module 1 map layout
   - Add hover/selection visual feedback

8. Build path visualization between nodes
   - Create PathRenderer component for connecting lines
   - Show locked vs unlocked path states
   - Add animated progress indicators on paths

---

## Phase 3: Avatar & Navigation

9. Integrate Ecctrl character controller
   - Set up physics world with Rapier
   - Configure Ecctrl with proper collision settings
   - Tune camera follow behavior

10. Create avatar character model
    - Build or import simple low-poly character
    - Set up idle and walking animations
    - Connect animation states to movement

11. Implement node interaction system
    - Detect proximity to content nodes
    - Show interaction prompt when near node
    - Handle click/key to open node content

12. Add camera controls and boundaries
    - Implement smooth camera transitions
    - Add invisible collision walls at map edges
    - Test navigation across entire map [review]

---

## Phase 4: Content System

13. Build VideoPlayer content component
    - Create modal overlay for video playback
    - Add play/pause controls and progress bar
    - Track video completion for progress

14. Build ReadingPanel content component
    - Create scrollable reading modal with markdown support
    - Style with Overcooked aesthetic
    - Track scroll completion for progress

15. Build ExerciseModal component
    - Create interactive question format
    - Handle answer submission and feedback
    - Award XP on completion

16. Create Module 1 placeholder content
    - Define 8 content nodes with placeholder text/videos
    - Set up prerequisite relationships
    - Configure XP rewards per node

17. Implement progress tracking and node unlocking
    - Save completed nodes to Zustand store
    - Calculate and display unlocked nodes
    - Persist progress to localStorage [review]

---

## Phase 5: Quiz Boss System

18. Design quiz battle UI components
    - Create BossCharacter component with health bar
    - Build QuestionCard for displaying questions
    - Add damage/heal animations

19. Implement quiz battle game loop
    - Load questions for current boss
    - Handle answer selection and scoring
    - Calculate boss damage based on correctness

20. Create results screen and progression
    - Show score breakdown after battle
    - Handle pass/fail states (70% threshold)
    - Unlock next section on victory

21. Add adaptive quiz logic with SM-2 algorithm
    - Implement SM-2 calculation functions
    - Track question ease factors and intervals
    - Prioritize struggling topics in question selection

22. Create Module 1 quiz questions
    - Write 20+ questions covering financial statements
    - Include explanations for wrong answers
    - Tag questions by topic and difficulty [review]

---

## Phase 6: AI Chatbot

23. Set up backend API structure
    - Create Express server with TypeScript
    - Set up /api/chat endpoint
    - Configure CORS for frontend access

24. Integrate OpenAI API for chat
    - Create financial statements system prompt
    - Implement chat completion with streaming
    - Handle rate limiting and errors

25. Build ChatWidget UI component
    - Create floating chat bubble
    - Build expandable chat panel
    - Style messages with Overcooked aesthetic

26. Implement chat functionality
    - Connect frontend to backend API
    - Display streaming responses
    - Maintain conversation history in session [review]

---

## Phase 7: Gamification & Polish

27. Implement XP and leveling system
    - Calculate XP from node completions
    - Define level thresholds
    - Show XP gain animations

28. Create achievement badge system
    - Define 5+ achievement types
    - Detect achievement triggers
    - Display badge unlock notifications

29. Add visual polish and animations
    - Implement confetti effects for achievements
    - Add transition animations between screens
    - Polish hover/click feedback throughout

30. Create landing page and navigation
    - Build Home page with game entry
    - Add module selection screen
    - Implement routing between pages

---

## Phase 8: Persistence & Deployment

31. Set up Prisma with SQLite
    - Define database schema for progress
    - Create migration for initial tables
    - Set up API endpoints for save/load

32. Implement progress persistence
    - Save progress to database on changes
    - Load progress on app start
    - Handle offline/online sync

33. Optimize performance for production
    - Enable code splitting and lazy loading
    - Optimize 3D model sizes
    - Configure production build settings

34. Deploy to Vercel
    - Configure Vercel project settings
    - Set up environment variables
    - Deploy and verify functionality [review]

---

## Estimated Complexity
- Phase 1 (Foundation): 4 steps - Setup and configuration
- Phase 2 (3D Map): 4 steps - Core 3D environment
- Phase 3 (Avatar): 4 steps - Navigation system
- Phase 4 (Content): 5 steps - Learning content delivery
- Phase 5 (Quiz): 5 steps - Boss battle mechanics
- Phase 6 (Chatbot): 4 steps - AI tutor integration
- Phase 7 (Gamification): 4 steps - Engagement features
- Phase 8 (Deployment): 4 steps - Production readiness

**Total: 34 implementation steps**

---

## Review Checkpoints
Steps marked with [review] indicate significant milestones:
- Step 12: Avatar navigation complete (full 3D interaction)
- Step 17: Content system complete (learning flow works)
- Step 22: Quiz system complete (gamified assessment)
- Step 26: AI chatbot complete (tutoring support)
- Step 34: Final deployment (production ready)

---

## Dependencies & Blockers
- Steps 9-12 depend on 5-8 (map before avatar)
- Steps 13-17 depend on 7 (nodes before content)
- Steps 18-22 depend on 17 (progress tracking before quizzes)
- Steps 23-26 require OpenAI API key
- Steps 31-32 optional for MVP (localStorage fallback)

---

*Plan Version: 1.0*
*Created: January 2025*
