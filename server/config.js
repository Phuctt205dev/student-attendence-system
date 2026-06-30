import dotenv from 'dotenv';

dotenv.config();

const parseIntEnv = (key, fallback) => {
  const value = parseInt(process.env[key], 10);
  return Number.isFinite(value) ? value : fallback;
};

const OLLAMA_DEFAULT_BASE = 'http://127.0.0.1:11434/v1';
const OLLAMA_DEFAULT_MODEL = 'llama3.2';
const GROQ_DEFAULT_BASE = 'https://api.groq.com/openai/v1';
const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const rawProvider = (process.env.AI_PROVIDER || '').trim().toLowerCase();
const rawBaseUrl = (process.env.AI_API_BASE_URL || '').replace(/\/$/, '');

const detectOllama = () => {
  if (rawProvider === 'ollama') return true;
  const lower = rawBaseUrl.toLowerCase();
  return lower.includes(':11434') || lower.includes('ollama');
};

const detectGemini = () => rawProvider === 'gemini';

const detectGroq = () =>
  rawProvider === 'groq' || rawBaseUrl.toLowerCase().includes('api.groq.com');

const isOllamaProvider = detectOllama();
const isGeminiProvider = detectGemini();
const isGroqProvider = detectGroq();

const resolveApiBaseUrl = () => {
  if (rawBaseUrl) return rawBaseUrl;
  if (isOllamaProvider) return OLLAMA_DEFAULT_BASE;
  if (isGroqProvider) return GROQ_DEFAULT_BASE;
  return '';
};

const resolveModel = () => {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  if (isOllamaProvider) return OLLAMA_DEFAULT_MODEL;
  if (isGroqProvider) return GROQ_DEFAULT_MODEL;
  if (isGeminiProvider) return process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  return 'gpt-oss-120b';
};

const resolveGeminiApiKey = () => {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (isGeminiProvider) return process.env.AI_API_KEY || '';
  return '';
};

const resolveProviderLabel = () => {
  if (isOllamaProvider) return 'ollama';
  if (isGeminiProvider) return 'gemini';
  if (isGroqProvider) return 'groq';
  if (rawProvider) return rawProvider;
  return 'openai-compatible';
};

export const config = {
  port: parseIntEnv('PORT', 3001),
  aiProvider: resolveProviderLabel(),
  aiApiKey: process.env.AI_API_KEY || '',
  aiApiBaseUrl: resolveApiBaseUrl(),
  aiModel: resolveModel(),
  geminiApiKey: resolveGeminiApiKey(),
  geminiModel:
    process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-2.5-flash',
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash',
  geminiMaxRetries: parseIntEnv('GEMINI_MAX_RETRIES', 4),
  geminiInterChunkDelayMs: parseIntEnv('GEMINI_CHUNK_DELAY_MS', isGeminiProvider ? 3000 : 0),
  aiApiVersion: process.env.AI_API_VERSION || '2024-08-01-preview',
  skipApiVersion:
    process.env.SKIP_API_VERSION === 'true' ||
    isOllamaProvider ||
    isGroqProvider ||
    isGeminiProvider,
  ollamaHost: (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, ''),
  chunkSize: parseIntEnv('AI_CHUNK_SIZE', 4000),
  chunkOverlap: parseIntEnv('AI_CHUNK_OVERLAP', 200),
  maxChunks: parseIntEnv('AI_MAX_CHUNKS', isOllamaProvider ? 4 : 8),
  maxFileSizeMb: parseIntEnv('MAX_FILE_SIZE_MB', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  aiRequestTimeoutMs: parseIntEnv('AI_REQUEST_TIMEOUT_MS', isOllamaProvider ? 300000 : 120000),
  isProduction: process.env.NODE_ENV === 'production',
};

export const isOllama = () => isOllamaProvider;
export const isGemini = () => isGeminiProvider;
export const isGroq = () => isGroqProvider;

export const isAiConfigured = () => {
  if (isGeminiProvider) return Boolean(config.geminiApiKey);
  if (isOllamaProvider) return Boolean(config.aiApiBaseUrl);
  return Boolean(config.aiApiKey && config.aiApiBaseUrl);
};

export const getChatCompletionsUrl = () => {
  const base = config.aiApiBaseUrl;
  if (!base) return '';

  let url = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;

  if (!config.skipApiVersion && !url.includes('api-version=')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}api-version=${encodeURIComponent(config.aiApiVersion)}`;
  }

  return url;
};

export const getOllamaTagsUrl = () => `${config.ollamaHost}/api/tags`;
