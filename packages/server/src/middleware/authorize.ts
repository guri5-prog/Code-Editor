import type { Request, Response, NextFunction } from 'express';
import { ProjectModel } from '../models/Project.model.js';
import { FileModel } from '../models/File.model.js';
import { AppError } from './errorHandler.js';
import mongoose from 'mongoose';

type Permission = 'view' | 'edit' | 'execute';

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

function assertAuth(req: Request): string {
  const userId = req.authPayload?.userId;
  if (!userId) throw new AppError(401, 'Unauthorized');
  return userId;
}

async function checkProjectAccess(
  projectId: string,
  userId: string,
  requiredPermission: Permission,
): Promise<void> {
  if (!isValidObjectId(projectId)) {
    throw new AppError(400, 'Invalid project ID');
  }

  const project = await ProjectModel.findById(projectId)
    .select('ownerId isPublic collaborators')
    .lean();

  if (!project) throw new AppError(404, 'Project not found');

  if (project.ownerId.toString() === userId) return;

  const collab = project.collaborators?.find((c) => c.userId.toString() === userId);

  if (requiredPermission === 'view' && project.isPublic) return;

  if (!collab) throw new AppError(403, 'You do not have access to this project');

  const permissionLevel: Record<Permission, number> = { view: 0, execute: 1, edit: 2 };
  if (permissionLevel[collab.permission] < permissionLevel[requiredPermission]) {
    throw new AppError(403, 'Insufficient permissions');
  }
}

export function authorizeProject(requiredPermission: Permission) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = assertAuth(req);
      const { projectId } = req.params;
      await checkProjectAccess(projectId, userId, requiredPermission);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function authorizeFile(requiredPermission: Permission) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = assertAuth(req);
      const { fileId } = req.params;

      if (!isValidObjectId(fileId)) {
        throw new AppError(400, 'Invalid file ID');
      }

      const file = await FileModel.findById(fileId).select('projectId').lean();
      if (!file) throw new AppError(404, 'File not found');

      await checkProjectAccess(file.projectId.toString(), userId, requiredPermission);
      next();
    } catch (err) {
      next(err);
    }
  };
}
