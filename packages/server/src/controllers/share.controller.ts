import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ProjectModel } from '../models/Project.model.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CollabPermission, ShareTokenPayload } from '@code-editor/shared';
import mongoose from 'mongoose';

const SHARE_SECRET = env.JWT_SECRET + ':share';

export async function createShareLink(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.authPayload?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { projectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError(400, 'Invalid project ID');
    }

    const project = await ProjectModel.findById(projectId).select('ownerId').lean();
    if (!project) throw new AppError(404, 'Project not found');
    if (project.ownerId.toString() !== userId) {
      throw new AppError(403, 'Only the project owner can create share links');
    }

    const permission = (req.body.permission as CollabPermission) || 'view';
    if (!['edit', 'view', 'execute'].includes(permission)) {
      throw new AppError(400, 'Invalid permission');
    }

    const expiresIn = req.body.expiresIn || '7d';

    const payload: ShareTokenPayload = { projectId, permission };
    const token = jwt.sign(payload, SHARE_SECRET, { expiresIn });

    const shareUrl = `${env.CLIENT_URL}/join/${projectId}/${token}`;

    res.json({ token, url: shareUrl, permission, expiresIn });
  } catch (err) {
    next(err);
  }
}

export async function joinViaShareToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.authPayload?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      throw new AppError(400, 'Share token is required');
    }

    let payload: ShareTokenPayload;
    try {
      payload = jwt.verify(token, SHARE_SECRET) as ShareTokenPayload;
    } catch {
      throw new AppError(400, 'Invalid or expired share token');
    }

    const project = await ProjectModel.findById(payload.projectId);
    if (!project) throw new AppError(404, 'Project not found');

    if (project.ownerId.toString() === userId) {
      res.json({
        projectId: payload.projectId,
        permission: 'edit',
        message: 'You are the owner',
      });
      return;
    }

    const existingCollab = project.collaborators?.find((c) => c.userId.toString() === userId);

    if (!existingCollab) {
      project.collaborators.push({
        userId: new mongoose.Types.ObjectId(userId),
        permission: payload.permission,
      });
      await project.save();
    }

    res.json({
      projectId: payload.projectId,
      permission: existingCollab?.permission ?? payload.permission,
      message: existingCollab ? 'Already a collaborator' : 'Joined as collaborator',
    });
  } catch (err) {
    next(err);
  }
}
