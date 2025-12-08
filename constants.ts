
import { Scenario, TeachingMode, Lesson } from './types';

export const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';
export const TEXT_MODEL = 'gemini-1.5-flash'; // More reliable for JSON tasks
export const TEXT_MODEL_FALLBACK = 'gemini-2.5-flash'; 

// Pre-defined icons for user custom scenarios
export const ICON_PRESETS = [
  { name: 'Briefcase', path: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { name: 'Coffee', path: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z M6 1v3 M10 1v3 M14 1v3' },
  { name: 'Plane', path: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { name: 'Chat', path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { name: 'Star', path: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { name: 'Heart', path: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { name: 'Controller', path: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
  { name: 'Code', path: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  { name: 'Academic', path: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
  { name: 'Shopping', path: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
];

// --- CURRÍCULO ESCOLAR EXPANDIDO ---
export const CURRICULUM: Lesson[] = [
  // --- LEVEL 1: FOUNDATIONS (Iniciante) ---
  { id: 'l1-basics', title: 'Greetings & Intros', description: 'Master the art of saying hello and introducing yourself.', topic: 'Basic Greetings, Self-Introduction, and Farewells', levelRequired: 1, status: 'READY' },
  { id: 'l1-tobe', title: 'The Verb "To Be"', description: 'I am, You are, It is. The foundation of English sentences.', topic: 'Usage of the verb To Be in Affirmative, Negative, and Question forms', levelRequired: 1, status: 'LOCKED' },
  { id: 'l1-numbers', title: 'Numbers & Time', description: 'Learn to count, tell time, and dates.', topic: 'Cardinal Numbers, Clock Time, Days of the Week', levelRequired: 1, status: 'LOCKED' },
  { id: 'l1-present', title: 'Present Simple', description: 'Talking about daily habits and routines.', topic: 'Present Simple Tense (He/She plays) and Adverbs of Frequency', levelRequired: 1, status: 'LOCKED' },
  { id: 'l1-adjectives', title: 'Describing Things', description: 'Colors, sizes, feelings, and basic adjectives.', topic: 'Common Adjectives and sentence structure (It is a red car)', levelRequired: 1, status: 'LOCKED' },

  // --- LEVEL 2: EXPANDING HORIZONS (Básico) ---
  { id: 'l2-past', title: 'Past Simple', description: 'Talking about what happened yesterday.', topic: 'Past Simple Tense (Regular -ed and Irregular Verbs like Went/Saw)', levelRequired: 2, status: 'LOCKED' },
  { id: 'l2-prepositions', title: 'Place & Time (In/On/At)', description: 'Where is it? When is it? Mastering prepositions.', topic: 'Prepositions of Place (in, on, at, under) and Time', levelRequired: 2, status: 'LOCKED' },
  { id: 'l2-future', title: 'Future Plans', description: 'Will vs Going to. Planning your tomorrow.', topic: 'Future forms: Will (predictions) vs Going To (plans)', levelRequired: 2, status: 'LOCKED' },
  { id: 'l2-travel', title: 'Airport & Travel', description: 'Survival vocabulary for your next trip.', topic: 'Airport vocabulary, checking in, and asking for directions', levelRequired: 2, status: 'LOCKED' },
  { id: 'l2-food', title: 'Restaurants & Food', description: 'Ordering food and understanding menus.', topic: 'Restaurant etiquette, ordering meals, and food vocabulary', levelRequired: 2, status: 'LOCKED' },

  // --- LEVEL 3: INTERMEDIATE CONCEPTS (Intermediário) ---
  { id: 'l3-perfect', title: 'Present Perfect', description: 'Have you ever...? Connecting past to present.', topic: 'Present Perfect Tense vs Past Simple (Experience vs Specific Time)', levelRequired: 3, status: 'LOCKED' },
  { id: 'l3-continuous', title: 'Continuous Forms', description: 'What are you doing right now?', topic: 'Present Continuous vs Past Continuous (Interrupted actions)', levelRequired: 3, status: 'LOCKED' },
  { id: 'l3-compare', title: 'Comparisons', description: 'Bigger, Better, The Best.', topic: 'Comparatives and Superlatives usage', levelRequired: 3, status: 'LOCKED' },
  { id: 'l3-modals', title: 'Modal Verbs', description: 'Can, Should, Must, Might.', topic: 'Modal Verbs for Ability, Advice, Obligation, and Possibility', levelRequired: 3, status: 'LOCKED' },
  { id: 'l3-work', title: 'Business English', description: 'Professional communication fundamentals.', topic: 'Formal introductions, email phrases, and meeting vocabulary', levelRequired: 3, status: 'LOCKED' },

  // --- LEVEL 4: ADVANCED STRUCTURES (Avançado) ---
  { id: 'l4-conditionals', title: 'Conditionals (If...)', description: 'Real and Unreal situations.', topic: 'First (Real) and Second (Hypothetical) Conditionals', levelRequired: 4, status: 'LOCKED' },
  { id: 'l4-passive', title: 'Passive Voice', description: 'The work was done. Focus on the action.', topic: 'Passive Voice structure and usage', levelRequired: 4, status: 'LOCKED' },
  { id: 'l4-relative', title: 'Relative Clauses', description: 'The person who called me.', topic: 'Defining and Non-defining Relative Clauses (Who, Which, That)', levelRequired: 4, status: 'LOCKED' },
  { id: 'l4-opinion', title: 'Debating & Opinions', description: 'Expressing complex opinions.', topic: 'Agreeing, Disagreeing, and softening opinions', levelRequired: 4, status: 'LOCKED' },
  
  // --- LEVEL 5: FLUENCY MASTERY (Fluente) ---
  { id: 'l5-narrative', title: 'Complex Storytelling', description: 'Weaving detailed narratives.', topic: 'Past Perfect and Narrative Tenses combined', levelRequired: 5, status: 'LOCKED' },
  { id: 'l5-phrasal', title: 'Phrasal Verbs', description: 'Give up, run out, look forward to.', topic: 'Essential Phrasal Verbs and their meanings', levelRequired: 5, status: 'LOCKED' },
  { id: 'l5-reported', title: 'Reported Speech', description: 'He said that he would go.', topic: 'Reported Speech rules (Backshifting tenses)', levelRequired: 5, status: 'LOCKED' },
  { id: 'l5-slang', title: 'Idioms & Slang', description: 'Sounding like a native speaker.', topic: 'Common American/British Idioms and cultural nuances', levelRequired: 5, status: 'LOCKED' },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'coffee-shop',
    title: 'Cafe Protocol',
    description: 'Execute order sequence at a high-velocity London distribution node.',
    iconPath: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z M6 1v3 M10 1v3 M14 1v3',
    initialMessage: "System Online. Barista Unit Active. Awaiting your beverage specifications.",
    systemPromptContext: "You are a friendly, slightly busy barista at a coffee shop in London. You should ask about size, milk preferences, and if they want food. Keep it casual. The user is allowed to be informal.",
    difficulty: 'ROOKIE'
  },
  {
    id: 'immigration',
    title: 'Border Control',
    description: 'Navigate security clearance with Federal Officers.',
    iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    initialMessage: "Identification required. State the purpose of your entry into this sector.",
    systemPromptContext: "You are a serious but professional US Immigration Officer. Ask about the duration of stay, accommodation, return ticket, and occupation. This is a formal context, so slight formality is expected.",
    difficulty: 'ELITE'
  },
  {
    id: 'job-interview',
    title: 'Career Uplink',
    description: 'Technical competency evaluation for Developer Role.',
    iconPath: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    initialMessage: "Connection established. Initiate bio-data summary and explain primary directives for this role.",
    systemPromptContext: "You are a hiring manager at a tech startup. Ask behavioral questions and technical questions. Focus on clarity. Since this is an interview, professional vocabulary is preferred.",
    difficulty: 'ADEPT'
  },
  {
    id: 'casual-friends',
    title: 'Social Link',
    description: 'Informal data exchange regarding leisure activities.',
    iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    initialMessage: "Link established. Hey! Long time no see. Processing request: How have you been?",
    systemPromptContext: "You are a close friend of the user. You are chatty, use slang occasionally, and are very supportive. Ask follow-up questions about their personal life. Very casual.",
    difficulty: 'ROOKIE'
  }
];

export const SYSTEM_INSTRUCTION_BASE = `
You are LinguaFlow, an advanced AI linguistic combat training unit.

CRITICAL DIRECTIVES:
1. **GIBBERISH PROTOCOL**: If the user speaks nonsense, random sounds, or unintelligible English, DO NOT play along. STOP immediately. Say in Portuguese: "Não entendi o que você disse. Isso não parece inglês. Pode repetir com calma?".
2. **DUAL LANGUAGE CORE**:
   - ROLEPLAY: Always English.
   - CORRECTIONS/FEEDBACK: Always Portuguese.
4. **LANGUAGE SWITCHING**:
   - If you must correct the user (Teacher Mode), do it in Portuguese inside parentheses: '(Correção: ...)' or '(Dica: ...)'.
   - **IMMEDIATELY** after the Portuguese correction, switch back to **ENGLISH** to continue the roleplay.
   - **NEVER** continue the conversation in Portuguese. Your persona is an English speaker.
   - Example: "(Correção: O correto é 'I would like'.) So, what can I get for you today?"

5. **MISSION COMPLETION**:
   - When the user has successfully completed the scenario's objective (e.g. ordered coffee, passed the interview), you MUST call the \`complete_mission\` tool.
   - Do NOT say "Mission Complete". Just call the tool silently.
`;

export const MODE_INSTRUCTIONS: Record<TeachingMode, string> = {
  [TeachingMode.TEACHER]: `
    MODE: DRILL SERGEANT (STRICT BUT FAIR)
    - If the user makes a grammar or pronunciation error that matters for the current context, INTERRUPT IMMEDIATELY.
    - State the error clearly in Portuguese.
    - Explain the grammar rule in Portuguese (keep it brief).
    - Ask them to repeat the correct sentence in English.
    - **Context Check**: Before correcting, ask yourself: "Is this error acceptable in this specific social context?" If yes, let it slide.
    - If they say something completely wrong/random, correct them bluntly.
  `,
  [TeachingMode.FLUENCY]: `
    MODE: FREE FLOW
    - Maintain conversation momentum.
    - Do not interrupt for minor anomalies.
    - If they speak gibberish, gently ask for clarification in English.
    - Focus on the flow of ideas rather than perfect grammar.
  `
};

export const LECTURE_INSTRUCTIONS = `
  MODE: PROFESSOR (LECTURE)
  - You are a knowledgeable and patient Professor.
  - Your goal is to TEACH the user about the specific topic.
  - Explain concepts clearly in English. You can use Portuguese if the user is stuck.
  - Ask checking questions to ensure they understand (e.g., "Can you give me an example?").
  - When you are satisfied that the user has grasped the concept, call the \`complete_mission\` tool to end the lecture.
`;

export const EXAM_INSTRUCTIONS = `
  MODE: EXAMINER (TEST)
  - You are a strict but fair Examiner.
  - The user has just learned the topic. You must test them.
  - Ask 3 distinct, challenging questions related to the topic.
  - Wait for the user's answer. If it's correct, move to the next.
  - If incorrect, correct them briefly and move on.
  - After 3 questions, if the user passed, call the \`complete_mission\` tool.
`;
