export type HskLevel = 'HSK 1–2' | 'HSK 3–4' | 'HSK 5–6';

export type VoiceName = 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';

export type SpeakingPace = 'slow' | 'natural' | 'fast';

export type AppView = 'practice' | 'scenarios' | 'saved' | 'vocabulary';

export type PracticeMode = 'voice' | 'text';

export interface PartnerPersona {
  id: string;
  name: string;
  hanziName: string;
  voiceName: VoiceName;
  city: string;
  style: string;
}

export interface Scenario {
  id: string;
  title: string;
  hanziTitle: string;
  category: string;
  recommendedLevel: HskLevel;
  description: string;
  partnerRole: string;
  userRole: string;
  openingGoal: string;
  imageUrl?: string;
  starterPhrases: Array<{
    hanzi: string;
    pinyin: string;
    vietnamese: string;
  }>;
  isCustom?: boolean;
}

export interface KeyPhrase {
  hanzi: string;
  pinyin: string;
  vietnamese: string;
  usage?: string;
}

export interface NaturalnessFeedback {
  isNatural: boolean;
  betterHanzi?: string;
  betterPinyin?: string;
  explanationVi: string;
}

export interface TranscriptTurn {
  id: string;
  role: 'user' | 'assistant';
  hanzi: string;
  pinyin?: string;
  vietnamese?: string;
  feedback?: NaturalnessFeedback;
  keyPhrases?: KeyPhrase[];
  timestamp: number;
  enriching?: boolean;
}

export interface SuggestedReply {
  hanzi: string;
  pinyin: string;
  vietnamese: string;
  tone: string;
}

export interface ExpressionUpgrade {
  original: string;
  naturalHanzi: string;
  naturalPinyin: string;
  explanationVi: string;
}

export interface ConversationReview {
  title: string;
  summaryVi: string;
  strengthsVi: string[];
  upgrades: ExpressionUpgrade[];
  keyTakeaways: KeyPhrase[];
  generatedAt: number;
}

export interface SavedConversation {
  id: string;
  title: string;
  scenarioId: string;
  scenarioTitle: string;
  scenarioHanziTitle: string;
  level: HskLevel;
  partnerName: string;
  voiceName: VoiceName;
  mode: PracticeMode;
  durationSeconds: number;
  createdAt: number;
  updatedAt: number;
  turns: TranscriptTurn[];
  review?: ConversationReview;
  personalNote?: string;
}

export interface SavedPhrase {
  id: string;
  hanzi: string;
  pinyin: string;
  vietnamese: string;
  usage?: string;
  scenarioTitle: string;
  mastered: boolean;
  createdAt: number;
}
