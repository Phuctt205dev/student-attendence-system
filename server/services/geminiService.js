import { config } from '../config.js';
import {
  SYSTEM_PROMPT,
  buildChunkPrompt,
  parseQuestionsFromContent
} from './questionGeneration.js';

const getGeminiUrl = () => {
  const model = encodeURIComponent(config.geminiModel);
  const key = encodeURIComponent(config.geminiApiKey);
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
};

export const generateQuestionsForChunkGemini = async (params) => {
  if (!config.geminiApiKey) {
    throw new Error('Thiếu GEMINI_API_KEY (hoặc AI_API_KEY khi AI_PROVIDER=gemini)');
  }

  const userPrompt = buildChunkPrompt(params);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.aiRequestTimeoutMs);

  let response;
  try {
    response = await fetch(getGeminiUrl(), {
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
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        `Hết thời gian chờ AI (${Math.round(config.aiRequestTimeoutMs / 1000)}s). Thử lại hoặc giảm AI_MAX_CHUNKS.`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Error:', errorText);

    if (response.status === 400 && errorText.includes('API key')) {
      throw new Error('Gemini API key không hợp lệ. Kiểm tra GEMINI_API_KEY trên Railway.');
    }

    throw new Error(`Lỗi gọi AI (Gemini): ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return parseQuestionsFromContent(content);
};
