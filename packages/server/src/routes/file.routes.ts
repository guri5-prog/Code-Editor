import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authenticatedLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { authorizeProject, authorizeFile } from '../middleware/authorize.js';
import {
  fileSaveSchema,
  filePatchSchema,
  fileCreateSchema,
  fileUpdateSchema,
} from '@code-editor/shared';
import * as fileController from '../controllers/file.controller.js';

const router = Router();

router.use(authenticate);
router.use(authenticatedLimiter);

router.get('/projects/:projectId/files', authorizeProject('view'), fileController.getProjectFiles);
router.post(
  '/projects/:projectId/files',
  authorizeProject('edit'),
  validate(fileCreateSchema),
  fileController.createFile,
);

router.get('/files/:fileId', authorizeFile('view'), fileController.getFile);
router.put(
  '/files/:fileId',
  authorizeFile('edit'),
  validate(fileSaveSchema),
  fileController.saveFile,
);
router.patch(
  '/files/:fileId',
  authorizeFile('edit'),
  validate(filePatchSchema),
  fileController.patchFile,
);
router.patch(
  '/files/:fileId/meta',
  authorizeFile('edit'),
  validate(fileUpdateSchema),
  fileController.updateFileMeta,
);
router.delete('/files/:fileId', authorizeFile('edit'), fileController.deleteFile);

router.get('/files/:fileId/versions', authorizeFile('view'), fileController.getVersions);
router.get(
  '/files/:fileId/versions/:version',
  authorizeFile('view'),
  fileController.getVersionContent,
);

export default router;
