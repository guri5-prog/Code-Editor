import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authenticatedLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { templateCreateSchema } from '@code-editor/shared';
import * as templateController from '../controllers/template.controller.js';

const router = Router();

router.use(authenticate);
router.use(authenticatedLimiter);

router.get('/templates', templateController.listTemplates);
router.post('/templates', validate(templateCreateSchema), templateController.createTemplate);

export default router;
