import express from 'express';
import cors from 'cors';
import { config } from './config.js';
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

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
  console.log(`CORS_ORIGIN: ${config.corsOrigin}`);
  if (!config.aiApiKey || !config.aiApiBaseUrl) {
    console.warn('Warning: Set AI_API_KEY and AI_API_BASE_URL');
  }
});
