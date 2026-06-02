import { config } from '../config.js';
import {
  SYSTEM_PROMPT,
  buildChunkPrompt,
  parseQuestionsFromContent
} from './questionGeneration.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getGeminiUrl = (modelName) => {
  const model = encodeURIComponent(modelName || config.geminiModel);
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
  return Math.min(90000, 5000 * 2 ** attempt);
};

const buildGeminiRateLimitError = () =>
  new Error(
    'Gemini free tier đã hết hạn mức tạm thời (429). ' +
      'Thử: (1) đợi 5–10 phút hoặc sang ngày mới; (2) tạo API key mới trên AI Studio; ' +
      '(3) Railway: GEMINI_MODEL=gemini-1.5-flash, AI_MAX_CHUNKS=1; ' +
      '(4) hoặc đổi sang Groq — xem GITHUB_PAGES_AI.md mục Groq.'
  );

const callGeminiOnce = async (userPrompt, modelName) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.aiRequestTimeoutMs);

  try {
    return await fetch(getGeminiUrl(modelName), {
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

const callGeminiWithRetry = async (userPrompt, modelName) => {
  const maxAttempts = config.geminiMaxRetries + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await callGeminiOnce(userPrompt, modelName);

    if (response.ok) {
      return response;
    }

    const errorText = await response.text();
    console.error(
      `Gemini API Error [${modelName}] (attempt ${attempt + 1}):`,
      errorText.slice(0, 500)
    );

    const isRetryable = response.status === 429 || response.status === 503;

    if (isRetryable && attempt < maxAttempts - 1) {
      const waitMs = parseRetryAfterMs(response, attempt);
      console.warn(`Gemini ${response.status}: chờ ${waitMs}ms rồi thử lại...`);
      await sleep(waitMs);
      continue;
    }

    if (response.status === 429) {
      const err = buildGeminiRateLimitError();
      err.rateLimited = true;
      throw err;
    }

    if (response.status === 400 && errorText.includes('API key')) {
      throw new Error('Gemini API key không hợp lệ. Kiểm tra GEMINI_API_KEY trên Railway.');
    }

    throw new Error(`Lỗi gọi AI (Gemini): ${response.status} ${response.statusText}`);
  }

  const err = buildGeminiRateLimitError();
  err.rateLimited = true;
  throw err;
};

const generateWithModel = async (params, modelName) => {
  const userPrompt = buildChunkPrompt(params);
  const response = await callGeminiWithRetry(userPrompt, modelName);
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseQuestionsFromContent(content);
};

export const generateQuestionsForChunkGemini = async (params) => {
  if (!config.geminiApiKey) {
    throw new Error('Thiếu GEMINI_API_KEY (hoặc AI_API_KEY khi AI_PROVIDER=gemini)');
  }

  try {
    return await generateWithModel(params, config.geminiModel);
  } catch (error) {
    const fallback = config.geminiFallbackModel;
    const canFallback =
      error.rateLimited &&
      fallback &&
      fallback !== config.geminiModel;

    if (!canFallback) {
      throw error;
    }

    console.warn(`Gemini primary model rate limited — thử fallback: ${fallback}`);
    await sleep(2000);
    return await generateWithModel(params, fallback);
  }
};

export const geminiInterChunkDelayMs = () => config.geminiInterChunkDelayMs;
