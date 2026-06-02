import { config } from '../config.js';
import {
  SYSTEM_PROMPT,
  buildChunkPrompt,
  parseQuestionsFromContent
} from './questionGeneration.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getGeminiUrl = () => {
  const model = encodeURIComponent(config.geminiModel);
  const key = encodeURIComponent(config.geminiApiKey);
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
};

const parseRetryAfterMs = (response, attempt) => {
  const header = response.headers.get('Retry-After');
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 120000);
    }
  }
  return Math.min(60000, 3000 * 2 ** attempt);
};

const buildGeminiRateLimitError = () =>
  new Error(
    'Gemini free tier đang giới hạn tần suất (429). Đợi 1–2 phút rồi thử lại. ' +
      'Trên Railway có thể đặt GEMINI_MODEL=gemini-2.0-flash-lite và giảm AI_MAX_CHUNKS=2.'
  );

const callGeminiOnce = async (userPrompt) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.aiRequestTimeoutMs);

  try {
    return await fetch(getGeminiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      })
    });
  } finally {
    clearTimeout(timeout);
  }
};

const callGeminiWithRetry = async (userPrompt) => {
  const maxAttempts = config.geminiMaxRetries + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await callGeminiOnce(userPrompt);

    if (response.ok) {
      return response;
    }

    const errorText = await response.text();
    console.error(`Gemini API Error (attempt ${attempt + 1}):`, errorText);

    const isRetryable = response.status === 429 || response.status === 503;

    if (isRetryable && attempt < maxAttempts - 1) {
      const waitMs = parseRetryAfterMs(response, attempt);
      console.warn(`Gemini ${response.status}: chờ ${waitMs}ms rồi thử lại...`);
      await sleep(waitMs);
      continue;
    }

    if (response.status === 429) {
      throw buildGeminiRateLimitError();
    }

    if (response.status === 400 && errorText.includes('API key')) {
      throw new Error('Gemini API key không hợp lệ. Kiểm tra GEMINI_API_KEY trên Railway.');
    }

    throw new Error(`Lỗi gọi AI (Gemini): ${response.status} ${response.statusText}`);
  }

  throw buildGeminiRateLimitError();
};

export const generateQuestionsForChunkGemini = async (params) => {
  if (!config.geminiApiKey) {
    throw new Error('Thiếu GEMINI_API_KEY (hoặc AI_API_KEY khi AI_PROVIDER=gemini)');
  }

  const userPrompt = buildChunkPrompt(params);
  const response = await callGeminiWithRetry(userPrompt);
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return parseQuestionsFromContent(content);
};

export const geminiInterChunkDelayMs = () => config.geminiInterChunkDelayMs;
