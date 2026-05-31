import dotenv from 'dotenv';

dotenv.config();

const parseIntEnv = (key, fallback) => {
  const value = parseInt(process.env[key], 10);
  return Number.isFinite(value) ? value : fallback;
};

export const config = {
  port: parseIntEnv('PORT', 3001),
  aiApiKey: process.env.AI_API_KEY || '',
  aiApiBaseUrl: (process.env.AI_API_BASE_URL || '').replace(/\/$/, ''),
  aiModel: process.env.AI_MODEL || 'gpt-oss-120b',
  chunkSize: parseIntEnv('AI_CHUNK_SIZE', 4000),
  chunkOverlap: parseIntEnv('AI_CHUNK_OVERLAP', 200),
  maxChunks: parseIntEnv('AI_MAX_CHUNKS', 8),
  maxFileSizeMb: parseIntEnv('MAX_FILE_SIZE_MB', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

export const getChatCompletionsUrl = () => {
  const base = config.aiApiBaseUrl;
  if (!base) return '';
  if (base.endsWith('/chat/completions')) return base;
  return `${base}/chat/completions`;
};
