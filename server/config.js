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
  aiApiVersion: process.env.AI_API_VERSION || '1',
  skipApiVersion: process.env.SKIP_API_VERSION === 'true',
  chunkSize: parseIntEnv('AI_CHUNK_SIZE', 4000),
  chunkOverlap: parseIntEnv('AI_CHUNK_OVERLAP', 200),
  maxChunks: parseIntEnv('AI_MAX_CHUNKS', 8),
  maxFileSizeMb: parseIntEnv('MAX_FILE_SIZE_MB', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

export const getChatCompletionsUrl = () => {
  const base = config.aiApiBaseUrl;
  if (!base) return '';

  let url = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;

  // Azure / Foundry yêu cầu query api-version (trừ khi đã có hoặc skip)
  if (!config.skipApiVersion && !url.includes('api-version=')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}api-version=${encodeURIComponent(config.aiApiVersion)}`;
  }

  return url;
};
