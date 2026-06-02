import {
  config,
  getChatCompletionsUrl,
  isAiConfigured,
  isGemini,
  isOllama
} from '../config.js';
import { generateQuestionsForChunkGemini } from './geminiService.js';
import { SYSTEM_PROMPT, buildChunkPrompt, parseQuestionsFromContent } from './questionGeneration.js';

const buildAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (config.aiApiKey) {
    headers['api-key'] = config.aiApiKey;
    headers.Authorization = `Bearer ${config.aiApiKey}`;
  }
  return headers;
};

const mapFetchError = (error) => {
  if (error.name === 'AbortError') {
    return new Error(
      `Hết thời gian chờ AI (${Math.round(config.aiRequestTimeoutMs / 1000)}s). ` +
        (isOllama()
          ? 'Model local có thể đang tải lần đầu — thử lại hoặc giảm AI_MAX_CHUNKS.'
          : 'Thử lại sau.')
    );
  }

  if (isOllama() && (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('fetch failed'))) {
    return new Error(
      'Không kết nối được Ollama. Mở app Ollama hoặc chạy: ollama serve — sau đó: ollama pull ' +
        config.aiModel
    );
  }

  return error;
};

const generateQuestionsForChunkOpenAI = async (params) => {
  if (!isAiConfigured()) {
    throw new Error('Thiếu cấu hình AI_API_KEY và AI_API_BASE_URL (hoặc dùng AI_PROVIDER=gemini)');
  }

  const url = getChatCompletionsUrl();
  if (!url) {
    throw new Error('Thiếu cấu hình AI_API_BASE_URL');
  }

  const userPrompt = buildChunkPrompt(params);

  const body = {
    model: config.aiModel,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    stream: false
  };

  if (isOllama()) {
    body.format = 'json';
    body.options = { num_predict: 2048 };
  } else {
    body.max_tokens = 2000;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.aiRequestTimeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    throw mapFetchError(error);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API Error:', errorText);

    if (isOllama() && response.status === 404) {
      throw new Error(
        `Model "${config.aiModel}" chưa có trên Ollama. Chạy: ollama pull ${config.aiModel}`
      );
    }

    throw new Error(`Lỗi gọi AI: ${response.statusText} (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return parseQuestionsFromContent(content);
};

export const generateQuestionsForChunk = async (params) => {
  if (isGemini()) {
    return generateQuestionsForChunkGemini(params);
  }

  if (isOllama() && !isAiConfigured()) {
    throw new Error('Thiếu AI_API_BASE_URL. Đặt AI_PROVIDER=ollama trong server/.env');
  }

  return generateQuestionsForChunkOpenAI(params);
};

export const dedupeQuestions = (questions) => {
  const seen = new Set();
  return questions.filter((q) => {
    const key = q.questionText.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
