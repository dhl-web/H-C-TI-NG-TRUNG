import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Shared server-side Gemini client (default v1 for Gemini 4 text/JSON routes)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Dedicated v1beta Gemini client required for Gemini 3.8 Live API and Gemini 3.8 TTS (speechConfig / speechMetadata)
const aiBeta = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  apiVersion: 'v1beta',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || err);
      const isTransient =
        err?.status === 503 ||
        err?.status === 429 ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('503') ||
        msg.includes('high demand');
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

// Simple persistent JSON store on disk for saved conversations and vocabulary notebook
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

interface StoreData {
  conversations: any[];
  vocabulary: any[];
}

let writeQueue = Promise.resolve();

async function ensureStore(): Promise<StoreData> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
    };
  } catch {
    const initial: StoreData = { conversations: [], vocabulary: [] };
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

async function saveStore(data: StoreData): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  });
  return writeQueue;
}

function buildPartnerSystemInstruction(params: {
  partnerName?: string;
  scenarioTitle?: string;
  partnerRole?: string;
  userRole?: string;
  level?: string;
  pace?: string;
}) {
  const {
    partnerName = '林小雨',
    scenarioTitle = '每日自由闲聊',
    partnerRole = 'A warm, friendly native Mandarin conversation partner',
    userRole = 'A Vietnamese learner practicing everyday spoken Mandarin',
    level = 'HSK 3–4',
    pace = 'natural',
  } = params;

  const levelGuide =
    level === 'HSK 1–2'
      ? 'Use simple, everyday HSK 1–2 Mandarin vocabulary and short sentences (1–2 short sentences per turn). Speak clearly and slightly slower so a beginner can follow effortlessly.'
      : level === 'HSK 5–6'
      ? 'Use authentic, colloquial everyday Mandarin with natural fillers (哎呀, 确实, 挺好的, 说实话), idioms when fitting, and normal native pacing.'
      : 'Use natural, everyday HSK 3–4 Mandarin (2–3 concise sentences per turn). Keep phrasing colloquial and realistic rather than textbook-stiff.';

  const paceGuide =
    pace === 'slow'
      ? 'Enunciate clearly at a calm, unhurried pace.'
      : pace === 'fast'
      ? 'Speak briskly like a lively everyday native conversation.'
      : 'Speak at a comfortable, natural conversational rhythm.';

  return [
    `You are ${partnerName}, a real-time Mandarin Chinese conversation partner.`,
    `Scenario: ${scenarioTitle}.`,
    `Your role: ${partnerRole}`,
    `Learner's role: ${userRole}`,
    `Language rules:`,
    `- Speak primarily in natural Simplified Mandarin Chinese (普通话).`,
    `- ${levelGuide}`,
    `- ${paceGuide}`,
    `- Keep each spoken response concise (1 to 3 sentences) and end with a gentle, natural follow-up question or cue to keep the dialogue flowing.`,
    `- Do NOT give long lectures or grammar explanations mid-conversation. If the learner uses a Vietnamese word or hesitates, warmly acknowledge what they meant, model the natural Chinese phrase smoothly in your reply, and keep the conversation going.`,
    `- Never read out stage directions, asterisks, Pinyin, or emojis aloud. Speak purely as a real human partner.`,
  ].join('\n');
}

function formatApiError(err: any): { status: number; message: string } {
  const msg = err?.message || String(err);
  if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || err?.status === 403) {
    return {
      status: 403,
      message: 'Khóa Gemini API chưa hợp lệ hoặc thiếu quyền truy cập. Vui lòng kiểm tra mục Settings > Secrets.',
    };
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || err?.status === 429) {
    return {
      status: 429,
      message: 'Đã chạm giới hạn lượt gọi API tạm thời. Vui lòng thử lại sau giây lát.',
    };
  }
  if (msg.includes('UNAVAILABLE') || msg.includes('high demand') || err?.status === 503) {
    return {
      status: 503,
      message: 'Dịch vụ AI đang có lưu lượng cao tạm thời. Vui lòng thử lại sau vài giây.',
    };
  }
  if (msg.includes('404') || msg.includes('NOT_FOUND') || err?.status === 404) {
    return {
      status: 404,
      message: 'Không tìm thấy endpoint hoặc mô hình AI tương ứng. Vui lòng thử tải lại trang.',
    };
  }
  return {
    status: 500,
    message: msg || 'Không thể kết nối tới dịch vụ AI.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, hasKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // 1. Enrich a single spoken turn with Pinyin, Vietnamese translation, naturalness coaching & key phrases
  app.post('/api/enrich-turn', async (req, res) => {
    try {
      const { role, text, scenarioTitle, level, recentHistory } = req.body as {
        role: 'user' | 'assistant';
        text: string;
        scenarioTitle?: string;
        level?: string;
        recentHistory?: Array<{ role: string; hanzi: string }>;
      };

      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Thiếu nội dung câu thoại.' });
      }

      const historyContext = (recentHistory ?? [])
        .slice(-4)
        .map((t) => `${t.role === 'user' ? 'Learner' : 'Partner'}: ${t.hanzi}`)
        .join('\n');

      const prompt = `Analyze this single Mandarin Chinese conversation turn for a Vietnamese learner.
Scenario: ${scenarioTitle || 'Daily Mandarin chat'}
Target level: ${level || 'HSK 3–4'}
Speaker role: ${role === 'user' ? 'Vietnamese learner practicing Mandarin' : 'Native Mandarin partner'}
Recent context:
${historyContext || '(start of conversation)'}

Utterance to analyze: "${text}"

Requirements:
1. "hanzi": Clean Simplified Chinese transcription of the utterance (fix minor ASR punctuation spacing, preserve the speaker's actual words).
2. "pinyin": Accurate tone-marked Pinyin for the Chinese text.
3. "vietnamese": Natural, idiomatic Vietnamese translation.
4. "feedback": ${
        role === 'user'
          ? 'Evaluate how natural the learner’s Chinese sounds. Set isNatural=true if it already sounds natural in spoken Mandarin; otherwise set isNatural=false and provide betterHanzi, betterPinyin, and a concise encouraging Vietnamese explanation (1–2 short sentences) on why native speakers say it that way.'
          : 'Set isNatural=true and explanationVi="" (not needed for partner turns).'
      }
5. "keyPhrases": Extract 1 to 2 useful everyday colloquial Mandarin words or expressions from this turn (or from betterHanzi if applicable) worth saving to a Vietnamese learner's notebook. Return empty array if the turn is just a 1-word greeting like 嗯 or 好.`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hanzi: { type: Type.STRING },
              pinyin: { type: Type.STRING },
              vietnamese: { type: Type.STRING },
              feedback: {
                type: Type.OBJECT,
                properties: {
                  isNatural: { type: Type.BOOLEAN },
                  betterHanzi: { type: Type.STRING },
                  betterPinyin: { type: Type.STRING },
                  explanationVi: { type: Type.STRING },
                },
                required: ['isNatural', 'explanationVi'],
              },
              keyPhrases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hanzi: { type: Type.STRING },
                    pinyin: { type: Type.STRING },
                    vietnamese: { type: Type.STRING },
                    usage: { type: Type.STRING },
                  },
                  required: ['hanzi', 'pinyin', 'vietnamese'],
                },
              },
            },
            required: ['hanzi', 'pinyin', 'vietnamese', 'feedback', 'keyPhrases'],
          },
        },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 2. Text-mode conversational reply (plus coaching for learner's input)
  app.post('/api/chat-reply', async (req, res) => {
    try {
      const { message, history, scenarioTitle, partnerRole, userRole, partnerName, level } = req.body as {
        message: string;
        history: Array<{ role: 'user' | 'assistant'; hanzi: string }>;
        scenarioTitle?: string;
        partnerRole?: string;
        userRole?: string;
        partnerName?: string;
        level?: string;
      };

      const convoText = (history ?? [])
        .slice(-10)
        .map((t) => `${t.role === 'user' ? 'Learner' : partnerName || 'Partner'}: ${t.hanzi}`)
        .join('\n');

      const isGreeting = message === '__START_CONVERSATION__';

      const prompt = isGreeting
        ? `Start the Mandarin conversation in character as ${partnerName || '林小雨'}.
Scenario: ${scenarioTitle}
Your role: ${partnerRole}
Learner role: ${userRole}
Level: ${level || 'HSK 3–4'}

Return a warm, natural opening line in Simplified Mandarin (1–2 sentences) with Pinyin, Vietnamese translation, and 1 useful phrase.`
        : `Continue this everyday Mandarin conversation in character as ${partnerName || '林小雨'}.
Scenario: ${scenarioTitle}
Your role: ${partnerRole}
Learner role: ${userRole}
Level: ${level || 'HSK 3–4'}

Conversation so far:
${convoText}

Learner's new message: "${message}"

Provide:
1. Analysis of the learner's message (userEnrichment): clean Hanzi (if the learner typed Pinyin or Vietnamese, convert/interpret into the Chinese they tried to express), Pinyin, Vietnamese translation, and gentle naturalness feedback in Vietnamese.
2. Your natural in-character Mandarin reply (assistantReply): 1–3 concise, colloquial sentences with Pinyin, Vietnamese translation, and 1–2 useful colloquial keyPhrases.`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              userEnrichment: {
                type: Type.OBJECT,
                properties: {
                  hanzi: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  vietnamese: { type: Type.STRING },
                  feedback: {
                    type: Type.OBJECT,
                    properties: {
                      isNatural: { type: Type.BOOLEAN },
                      betterHanzi: { type: Type.STRING },
                      betterPinyin: { type: Type.STRING },
                      explanationVi: { type: Type.STRING },
                    },
                    required: ['isNatural', 'explanationVi'],
                  },
                },
                required: ['hanzi', 'pinyin', 'vietnamese', 'feedback'],
              },
              assistantReply: {
                type: Type.OBJECT,
                properties: {
                  hanzi: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  vietnamese: { type: Type.STRING },
                  keyPhrases: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        hanzi: { type: Type.STRING },
                        pinyin: { type: Type.STRING },
                        vietnamese: { type: Type.STRING },
                        usage: { type: Type.STRING },
                      },
                      required: ['hanzi', 'pinyin', 'vietnamese'],
                    },
                  },
                },
                required: ['hanzi', 'pinyin', 'vietnamese', 'keyPhrases'],
              },
            },
            required: ['assistantReply'],
          },
        },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 3. Contextual reply suggestions when learner is unsure what to say next
  app.post('/api/suggest-replies', async (req, res) => {
    try {
      const { history, scenarioTitle, level } = req.body as {
        history: Array<{ role: string; hanzi: string }>;
        scenarioTitle?: string;
        level?: string;
      };

      const convoText = (history ?? [])
        .slice(-6)
        .map((t) => `${t.role === 'user' ? 'Learner' : 'Partner'}: ${t.hanzi}`)
        .join('\n');

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Suggest 3 natural, everyday Mandarin Chinese replies the learner could say next in this conversation.
Scenario: ${scenarioTitle || 'Daily Mandarin chat'}
Target level: ${level || 'HSK 3–4'}
Recent dialogue:
${convoText || '(Beginning of conversation)'}

Make the 3 options varied in tone (e.g. "Thân thiện", "Ngắn gọn", "Mở rộng chủ đề"). Keep them realistic for spoken Mandarin.`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hanzi: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  vietnamese: { type: Type.STRING },
                  tone: { type: Type.STRING },
                },
                required: ['hanzi', 'pinyin', 'vietnamese', 'tone'],
              },
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? '[]').trim());
      res.json({ suggestions: parsed });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 4. Native Mandarin Text-to-Speech using gemini-3.8-flash-lite-tts (unary WAV)
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, voiceName = 'Zephyr', slow = false } = req.body as {
        text: string;
        voiceName?: string;
        slow?: boolean;
      };

      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Thiếu văn bản cần đọc.' });
      }

      const stylePrompt = slow
        ? 'Clear, slow, carefully enunciated standard Mandarin Chinese for a language learner'
        : 'Warm, natural everyday spoken Mandarin Chinese';

      const response = await withRetry(() =>
        aiBeta.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: text.trim(),
                  speechMetadata: {
                    style: stylePrompt,
                  },
                } as any,
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        })
      );

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(502).json({ error: 'Không tạo được âm thanh mẫu.' });
      }

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 5. Deep Conversation Review Summary for saved conversations
  app.post('/api/review-summary', async (req, res) => {
    try {
      const { turns, scenarioTitle, level } = req.body as {
        turns: Array<{ role: string; hanzi: string }>;
        scenarioTitle?: string;
        level?: string;
      };

      if (!turns || turns.length === 0) {
        return res.status(400).json({ error: 'Chưa có lượt hội thoại để tổng kết.' });
      }

      const transcript = turns
        .map((t, i) => `${i + 1}. ${t.role === 'user' ? 'Người học' : 'Đối tác'}: ${t.hanzi}`)
        .join('\n');

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
        contents: `You are an encouraging Mandarin communication coach for a Vietnamese learner.
Review this saved Mandarin practice conversation and create a concise, practical review sheet in Vietnamese.
Scenario: ${scenarioTitle || 'Giao tiếp hàng ngày'}
Level: ${level || 'HSK 3–4'}

Transcript:
${transcript}

Return JSON with:
- "title": Short memorable Vietnamese title for this saved session (max 8 words).
- "summaryVi": 2 sentences summarizing what the learner practiced.
- "strengthsVi": 2 to 3 specific encouraging observations in Vietnamese about what the learner did well.
- "upgrades": 2 to 4 concrete phrasing upgrades based on the learner's turns (or key conversational moments if the learner had few turns): show "original" (what was said or a common literal phrasing), "naturalHanzi" (authentic spoken Mandarin), "naturalPinyin", and "explanationVi".
- "keyTakeaways": 3 to 5 practical everyday Mandarin expressions from the conversation worth memorizing (hanzi, pinyin, vietnamese, usage).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summaryVi: { type: Type.STRING },
              strengthsVi: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              upgrades: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    naturalHanzi: { type: Type.STRING },
                    naturalPinyin: { type: Type.STRING },
                    explanationVi: { type: Type.STRING },
                  },
                  required: ['original', 'naturalHanzi', 'naturalPinyin', 'explanationVi'],
                },
              },
              keyTakeaways: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hanzi: { type: Type.STRING },
                    pinyin: { type: Type.STRING },
                    vietnamese: { type: Type.STRING },
                    usage: { type: Type.STRING },
                  },
                  required: ['hanzi', 'pinyin', 'vietnamese'],
                },
              },
            },
            required: ['title', 'summaryVi', 'strengthsVi', 'upgrades', 'keyTakeaways'],
          },
        },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ review: { ...parsed, generatedAt: Date.now() } });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 6. Persistent Saved Conversations CRUD
  app.get('/api/conversations', async (_req, res) => {
    try {
      const store = await ensureStore();
      const sorted = [...store.conversations].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
      res.json({ conversations: sorted });
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải danh sách hội thoại đã lưu.' });
    }
  });

  app.post('/api/conversations', async (req, res) => {
    try {
      const conversation = req.body;
      if (!conversation?.id || !Array.isArray(conversation.turns)) {
        return res.status(400).json({ error: 'Dữ liệu hội thoại không hợp lệ.' });
      }
      const store = await ensureStore();
      const idx = store.conversations.findIndex((c) => c.id === conversation.id);
      const record = {
        ...conversation,
        updatedAt: Date.now(),
        createdAt: conversation.createdAt || Date.now(),
      };
      if (idx >= 0) {
        store.conversations[idx] = record;
      } else {
        store.conversations.unshift(record);
      }
      await saveStore(store);
      res.json({ conversation: record });
    } catch {
      res.status(500).json({ error: 'Không thể lưu hội thoại.' });
    }
  });

  app.patch('/api/conversations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const patch = req.body;
      const store = await ensureStore();
      const idx = store.conversations.findIndex((c) => c.id === id);
      if (idx < 0) {
        return res.status(404).json({ error: 'Không tìm thấy hội thoại.' });
      }
      store.conversations[idx] = {
        ...store.conversations[idx],
        ...patch,
        updatedAt: Date.now(),
      };
      await saveStore(store);
      res.json({ conversation: store.conversations[idx] });
    } catch {
      res.status(500).json({ error: 'Không thể cập nhật hội thoại.' });
    }
  });

  app.delete('/api/conversations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const store = await ensureStore();
      store.conversations = store.conversations.filter((c) => c.id !== id);
      await saveStore(store);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Không thể xóa hội thoại.' });
    }
  });

  // 7. Persistent Vocabulary Notebook CRUD
  app.get('/api/vocabulary', async (_req, res) => {
    try {
      const store = await ensureStore();
      const sorted = [...store.vocabulary].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      res.json({ vocabulary: sorted });
    } catch {
      res.status(500).json({ error: 'Không thể tải sổ từ vựng.' });
    }
  });

  app.post('/api/vocabulary', async (req, res) => {
    try {
      const phrase = req.body;
      if (!phrase?.hanzi) {
        return res.status(400).json({ error: 'Thiếu cụm từ cần lưu.' });
      }
      const store = await ensureStore();
      const existing = store.vocabulary.find((v) => v.hanzi.trim() === phrase.hanzi.trim());
      if (existing) {
        return res.json({ phrase: existing, duplicate: true });
      }
      const item = {
        id: phrase.id || `phr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        hanzi: phrase.hanzi.trim(),
        pinyin: phrase.pinyin || '',
        vietnamese: phrase.vietnamese || '',
        usage: phrase.usage || '',
        scenarioTitle: phrase.scenarioTitle || 'Hội thoại hàng ngày',
        mastered: false,
        createdAt: Date.now(),
      };
      store.vocabulary.unshift(item);
      await saveStore(store);
      res.json({ phrase: item });
    } catch {
      res.status(500).json({ error: 'Không thể lưu từ vựng.' });
    }
  });

  app.patch('/api/vocabulary/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const store = await ensureStore();
      const idx = store.vocabulary.findIndex((v) => v.id === id);
      if (idx < 0) {
        return res.status(404).json({ error: 'Không tìm thấy mục từ vựng.' });
      }
      store.vocabulary[idx] = { ...store.vocabulary[idx], ...req.body };
      await saveStore(store);
      res.json({ phrase: store.vocabulary[idx] });
    } catch {
      res.status(500).json({ error: 'Không thể cập nhật từ vựng.' });
    }
  });

  app.delete('/api/vocabulary/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const store = await ensureStore();
      store.vocabulary = store.vocabulary.filter((v) => v.id !== id);
      await saveStore(store);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Không thể xóa từ vựng.' });
    }
  });

  // Frontend middleware (Vite in dev, static dist in prod)
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);

  // Real-time Gemini 3.8 Live WebSocket Bridge (/api/live)
  const wss = new WebSocketServer({ server, path: '/api/live' });

  wss.on('connection', (clientWs: WebSocket) => {
    let liveSession: any = null;
    let isClosing = false;

    const safeSend = (payload: Record<string, any>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    const cleanupSession = () => {
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // ignore close errors
        }
        liveSession = null;
      }
    };

    clientWs.on('message', async (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === 'start') {
        cleanupSession();
        if (!process.env.GEMINI_API_KEY) {
          safeSend({
            type: 'error',
            message: 'Chưa cấu hình GEMINI_API_KEY trong Settings > Secrets.',
          });
          return;
        }

        try {
          const systemInstruction = buildPartnerSystemInstruction({
            partnerName: msg.partnerName,
            scenarioTitle: msg.scenarioTitle,
            partnerRole: msg.partnerRole,
            userRole: msg.userRole,
            level: msg.level,
            pace: msg.pace,
          });

          const session = await aiBeta.live.connect({
            model: 'gemini-3.8-live',
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: msg.voiceName || 'Zephyr',
                  },
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              systemInstruction,
            },
            callbacks: {
              onmessage: (message: LiveServerMessage) => {
                const content = message.serverContent;
                if (!content) return;

                if (content.interrupted) {
                  safeSend({ type: 'interrupted' });
                }

                if (content.inputTranscription?.text) {
                  safeSend({
                    type: 'inputTranscript',
                    text: content.inputTranscription.text,
                  });
                }

                if (content.outputTranscription?.text) {
                  safeSend({
                    type: 'outputTranscript',
                    text: content.outputTranscription.text,
                  });
                }

                for (const part of content.modelTurn?.parts ?? []) {
                  if (part.inlineData?.data) {
                    safeSend({
                      type: 'audio',
                      data: part.inlineData.data,
                    });
                  }
                }

                if (content.turnComplete) {
                  safeSend({ type: 'turnComplete' });
                }
              },
              onerror: (err: any) => {
                if (!isClosing) {
                  const formatted = formatApiError(err);
                  safeSend({ type: 'error', message: formatted.message });
                }
              },
              onclose: () => {
                if (!isClosing) {
                  safeSend({ type: 'closed' });
                }
              },
            },
          });

          if (isClosing) {
            session.close();
            return;
          }

          liveSession = session;
          safeSend({ type: 'ready' });

          // Optional automatic warm Mandarin greeting when starting a scenario
          if (msg.autoGreet) {
            liveSession.sendRealtimeInput({
              text: 'Please warmly greet me in character in natural Mandarin Chinese (1–2 concise sentences) to begin our conversation.',
            });
          }
        } catch (err) {
          const formatted = formatApiError(err);
          safeSend({ type: 'error', message: formatted.message });
        }
        return;
      }

      if (msg.type === 'audio' && liveSession && msg.data) {
        try {
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } catch {
          // ignore transient send errors during disconnect
        }
        return;
      }

      if (msg.type === 'text' && liveSession && msg.text) {
        try {
          liveSession.sendRealtimeInput({
            text: msg.text,
          });
        } catch (err) {
          const formatted = formatApiError(err);
          safeSend({ type: 'error', message: formatted.message });
        }
        return;
      }

      if (msg.type === 'stop') {
        cleanupSession();
        safeSend({ type: 'closed' });
      }
    });

    clientWs.on('close', () => {
      isClosing = true;
      cleanupSession();
    });

    clientWs.on('error', () => {
      isClosing = true;
      cleanupSession();
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`YǔChá server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
