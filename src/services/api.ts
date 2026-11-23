import {
  ConversationReview,
  KeyPhrase,
  NaturalnessFeedback,
  SavedConversation,
  SavedPhrase,
  SuggestedReply,
  TranscriptTurn,
  VoiceName,
} from '../types';

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Lỗi kết nối (${res.status})`);
  }
  return data as T;
}

export async function enrichTurnApi(params: {
  role: 'user' | 'assistant';
  text: string;
  scenarioTitle: string;
  level: string;
  recentHistory: Array<{ role: string; hanzi: string }>;
}): Promise<{
  hanzi: string;
  pinyin: string;
  vietnamese: string;
  feedback?: NaturalnessFeedback;
  keyPhrases?: KeyPhrase[];
}> {
  return requestJson('/api/enrich-turn', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function chatReplyApi(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; hanzi: string }>;
  scenarioTitle: string;
  partnerRole: string;
  userRole: string;
  partnerName: string;
  level: string;
}): Promise<{
  userEnrichment?: {
    hanzi: string;
    pinyin: string;
    vietnamese: string;
    feedback?: NaturalnessFeedback;
  };
  assistantReply: {
    hanzi: string;
    pinyin: string;
    vietnamese: string;
    keyPhrases?: KeyPhrase[];
  };
}> {
  return requestJson('/api/chat-reply', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function suggestRepliesApi(params: {
  history: Array<{ role: string; hanzi: string }>;
  scenarioTitle: string;
  level: string;
}): Promise<{ suggestions: SuggestedReply[] }> {
  return requestJson('/api/suggest-replies', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function synthesizeTtsApi(params: {
  text: string;
  voiceName?: VoiceName;
  slow?: boolean;
}): Promise<{ audioBase64: string; mimeType: string }> {
  return requestJson('/api/tts', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function generateReviewApi(params: {
  turns: TranscriptTurn[];
  scenarioTitle: string;
  level: string;
}): Promise<{ review: ConversationReview }> {
  return requestJson('/api/review-summary', {
    method: 'POST',
    body: JSON.stringify({
      turns: params.turns.map((t) => ({ role: t.role, hanzi: t.hanzi })),
      scenarioTitle: params.scenarioTitle,
      level: params.level,
    }),
  });
}

export async function listConversationsApi(): Promise<{ conversations: SavedConversation[] }> {
  return requestJson('/api/conversations');
}

export async function saveConversationApi(
  conversation: SavedConversation
): Promise<{ conversation: SavedConversation }> {
  return requestJson('/api/conversations', {
    method: 'POST',
    body: JSON.stringify(conversation),
  });
}

export async function updateConversationApi(
  id: string,
  patch: Partial<SavedConversation>
): Promise<{ conversation: SavedConversation }> {
  return requestJson(`/api/conversations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteConversationApi(id: string): Promise<{ ok: boolean }> {
  return requestJson(`/api/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function listVocabularyApi(): Promise<{ vocabulary: SavedPhrase[] }> {
  return requestJson('/api/vocabulary');
}

export async function savePhraseApi(phrase: {
  hanzi: string;
  pinyin: string;
  vietnamese: string;
  usage?: string;
  scenarioTitle: string;
}): Promise<{ phrase: SavedPhrase; duplicate?: boolean }> {
  return requestJson('/api/vocabulary', {
    method: 'POST',
    body: JSON.stringify(phrase),
  });
}

export async function updatePhraseApi(
  id: string,
  patch: Partial<SavedPhrase>
): Promise<{ phrase: SavedPhrase }> {
  return requestJson(`/api/vocabulary/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deletePhraseApi(id: string): Promise<{ ok: boolean }> {
  return requestJson(`/api/vocabulary/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
