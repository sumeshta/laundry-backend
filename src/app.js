import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  const corsOrigin =
    config.corsOrigins.length === 1 && config.corsOrigins[0] === '*'
      ? true
      : config.corsOrigins;
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    })
  );
  app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1', apiRoutes);

  app.use((req, res) => {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' });
  });

  app.use(errorHandler);

  return app;
}
