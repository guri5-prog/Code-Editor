import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { env } from './config/env.js';
import { configurePassport } from './config/passport.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { csrfProtection } from './middleware/csrfProtection.js';
import type { ErrorRequestHandler } from 'express';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import fileRoutes from './routes/file.routes.js';
import executionRoutes from './routes/execution.routes.js';
import shareRoutes from './routes/share.routes.js';
import projectRoutes from './routes/project.routes.js';
import templateRoutes from './routes/template.routes.js';
import { isMongoHealthy } from './database/mongo.js';
import { isRedisHealthy } from './database/redis.js';

const app = express();

// Render and other managed hosts terminate TLS and forward client IPs via proxy headers.
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", env.CLIENT_URL, env.SERVER_URL],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '600kb' }));
app.use(cookieParser());
app.use(csrfProtection);
app.use(passport.initialize());

configurePassport();

app.get('/api/health', async (_req, res, next) => {
  try {
    const mongo = isMongoHealthy();
    const redis = await isRedisHealthy();

    const status = mongo && redis ? 'ok' : 'degraded';

    res.status(status === 'ok' ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

app.use('/api/execute', executionRoutes);
app.use(apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', fileRoutes);
app.use('/api', shareRoutes);
app.use('/api', projectRoutes);
app.use('/api', templateRoutes);
app.use(errorHandler as ErrorRequestHandler);

export default app;
