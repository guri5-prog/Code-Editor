import { Router } from 'express';
import {
  collaboratorSchema,
  collaboratorPermissionSchema,
  projectCreateSchema,
  projectUpdateSchema,
} from '@code-editor/shared';
import { authenticate } from '../middleware/auth.js';
import { authenticatedLimiter } from '../middleware/rateLimiter.js';
import { authorizeProject } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import * as projectController from '../controllers/project.controller.js';

const router = Router();

router.get('/projects/public', projectController.listPublicProjects);

router.use(authenticate);
router.use(authenticatedLimiter);

router.get('/projects', projectController.getDashboard);
router.post('/projects', validate(projectCreateSchema), projectController.createProject);
router.get('/projects/:projectId', authorizeProject('view'), projectController.getProject);
router.patch(
  '/projects/:projectId',
  authorizeProject('edit'),
  validate(projectUpdateSchema),
  projectController.updateProject,
);
router.delete('/projects/:projectId', authorizeProject('edit'), projectController.deleteProject);

router.get(
  '/projects/:projectId/collaborators',
  authorizeProject('view'),
  projectController.getCollaborators,
);
router.post(
  '/projects/:projectId/collaborators',
  authorizeProject('edit'),
  validate(collaboratorSchema),
  projectController.addCollaborator,
);
router.delete(
  '/projects/:projectId/collaborators/:userId',
  authorizeProject('edit'),
  projectController.removeCollaborator,
);
router.patch(
  '/projects/:projectId/collaborators/:userId',
  authorizeProject('edit'),
  validate(collaboratorPermissionSchema),
  projectController.updateCollaboratorPermission,
);
router.get(
  '/projects/:projectId/activity',
  authorizeProject('view'),
  projectController.getProjectActivity,
);

export default router;
