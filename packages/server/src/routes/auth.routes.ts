import { Router, type Request, type Response, type NextFunction } from 'express';
import passport from 'passport';
import { registerSchema, loginSchema } from '@code-editor/shared';
import { env } from '../config/env.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

function ensureOAuthConfigured(provider: 'google' | 'github') {
  return (_req: Request, res: Response, next: NextFunction) => {
    const isConfigured =
      provider === 'google'
        ? Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
        : Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);

    if (!isConfigured) {
      res.status(503).json({
        error: {
          code: 503,
          message: `${provider[0].toUpperCase()}${provider.slice(1)} OAuth is not configured`,
        },
      });
      return;
    }

    next();
  };
}

router.use(authLimiter);

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/token', authController.exchangeCode);

router.get('/google', ensureOAuthConfigured('google'), authController.oauthStart, (req, res, next) => {
  const state = (req as unknown as Record<string, unknown>).oauthState as string;
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state,
  })(req, res, next);
});

router.get(
  '/google/callback',
  ensureOAuthConfigured('google'),
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/login-failed' }),
  authController.oauthCallback,
);

router.get('/github', ensureOAuthConfigured('github'), authController.oauthStart, (req, res, next) => {
  const state = (req as unknown as Record<string, unknown>).oauthState as string;
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
    state,
  })(req, res, next);
});

router.get(
  '/github/callback',
  ensureOAuthConfigured('github'),
  passport.authenticate('github', { session: false, failureRedirect: '/api/auth/login-failed' }),
  authController.oauthCallback,
);

router.get('/login-failed', (_req, res) => {
  res.status(401).json({ error: { code: 401, message: 'OAuth login failed' } });
});

export default router;
