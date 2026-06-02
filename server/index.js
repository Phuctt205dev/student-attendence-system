import express from 'express';
import cors from 'cors';
import { config, isAiConfigured, isGemini, isOllama } from './config.js';
import { checkOllamaReachable } from './services/ollamaService.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();

const buildCorsOptions = () => {
  if (config.corsOrigin === '*') {
    return { origin: true };
  }

  const allowed = config.corsOrigin
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return {
    origin(origin, callback) {
      // Postman / server-side — no Origin header
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = origin.replace(/\/$/, '');
      if (allowed.includes(normalized)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowed.join(', ')}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
};

const corsOptions = buildCorsOptions();

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

app.use('/api/ai', aiRoutes);


app.get('/api/health', (_req, res) => {
  res.json({ success: true, service: 'ai-question-generator' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

app.listen(config.port, async () => {
  console.log(`Server listening on port ${config.port}`);
  console.log(`CORS_ORIGIN: ${config.corsOrigin}`);

  if (!isAiConfigured()) {
    console.warn('Warning: AI chưa cấu hình. Production: GITHUB_PAGES_AI.md | Local: OLLAMA_SETUP.md');
    return;
  }

  if (config.isProduction && isOllama()) {
    console.warn(
      'Cảnh báo: AI_PROVIDER=ollama trên production — GitHub Pages KHÔNG dùng được. Đặt AI_PROVIDER=gemini trên Railway.'
    );
  }

  console.log(
    `AI provider: ${config.aiProvider}, model: ${isGemini() ? config.geminiModel : config.aiModel}`
  );

  if (isGemini()) {
    console.log('Gemini OK — phù hợp deploy GitHub Pages + Railway');
  }

  if (isOllama()) {
    const ollama = await checkOllamaReachable();
    if (!ollama.reachable) {
      console.warn(`Ollama: ${ollama.error}`);
    } else if (!ollama.modelInstalled) {
      console.warn(
        `Ollama đang chạy nhưng chưa có model "${config.aiModel}". Chạy: ollama pull ${config.aiModel}`
      );
    } else {
      console.log(`Ollama OK — model "${config.aiModel}" sẵn sàng`);
    }
  }
});
