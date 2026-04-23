import { Router } from 'express';
import { optionalAuthenticate } from '../middleware/auth.js';
import { executionLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { executeSchema } from '@code-editor/shared';
import * as executionController from '../controllers/execution.controller.js';

const router = Router();

router.use(optionalAuthenticate);
router.use(executionLimiter);

router.post('/', validate(executeSchema), executionController.execute);

export default router;
