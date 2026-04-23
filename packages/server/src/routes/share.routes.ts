import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createShareLink, joinViaShareToken } from '../controllers/share.controller.js';

const router = Router();

router.post('/projects/:projectId/share', authenticate, createShareLink);
router.post('/collab/join', authenticate, joinViaShareToken);

export default router;
