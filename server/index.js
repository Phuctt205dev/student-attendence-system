import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();

const corsOrigins = config.corsOrigin === '*'
  ? true
  : config.corsOrigin.split(',').map((o) => o.trim());

app.use(cors({ origin: corsOrigins }));
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
  console.log(`AI question server listening on http://localhost:${config.port}`);
  if (!config.aiApiKey || !config.aiApiBaseUrl) {
    console.warn('Warning: Set AI_API_KEY and AI_API_BASE_URL in server/.env');
  }
});
