import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authenticatedLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { settingsSchema } from '@code-editor/shared';
import * as userController from '../controllers/user.controller.js';

const router = Router();

router.use(authenticate);
router.use(authenticatedLimiter);

router.get('/me', userController.getMe);
router.get('/me/settings', userController.getMySettings);
router.put('/me/settings', validate(settingsSchema), userController.updateMySettings);

export default router;
