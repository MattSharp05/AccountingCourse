import type { BattleQuestion } from '../../components/quiz';

// Legacy seed data — preserved only to keep the file name stable.
// Nothing in the app imports from this module. Real quiz data flows through
// the Supabase `content_items.quiz_data` column and the AI quiz generator.
export const QUIZ_CHECKPOINT_QUESTIONS: BattleQuestion[] = [];
