import type { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service.js';
import { AppError } from '../middleware/errorHandler.js';

function requireUserId(req: Request): string {
  const userId = req.authPayload?.userId;
  if (!userId) throw new AppError(401, 'Unauthorized');
  return userId;
}

export async function getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req);
    const data = await projectService.listDashboard(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function listPublicProjects(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit = Number(req.query.limit ?? 20);
    const skip = Number(req.query.skip ?? 0);
    const projects = await projectService.listPublic(
      Number.isFinite(limit) ? limit : 20,
      Number.isFinite(skip) ? skip : 0,
    );
    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const project = await projectService.getById(projectId);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const project = await projectService.create(userId, req.body);
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;
    const project = await projectService.update(projectId, req.body);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const { projectId } = req.params;
    await projectService.assertOwner(projectId, userId);
    await projectService.delete(projectId);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getCollaborators(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;
    const collaborators = await projectService.listCollaborators(projectId);
    res.json({ collaborators });
  } catch (err) {
    next(err);
  }
}

export async function addCollaborator(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const { projectId } = req.params;
    await projectService.assertOwner(projectId, userId);
    await projectService.addCollaborator(projectId, req.body);
    res.status(201).json({ message: 'Collaborator added' });
  } catch (err) {
    next(err);
  }
}

export async function removeCollaborator(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const { projectId, userId: collaboratorId } = req.params;
    await projectService.assertOwner(projectId, userId);
    await projectService.removeCollaborator(projectId, collaboratorId);
    res.json({ message: 'Collaborator removed' });
  } catch (err) {
    next(err);
  }
}

export async function updateCollaboratorPermission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const { projectId, userId: collaboratorId } = req.params;
    const { permission } = req.body as { permission: 'edit' | 'view' | 'execute' };
    await projectService.assertOwner(projectId, userId);
    await projectService.updateCollaboratorPermission(projectId, collaboratorId, permission);
    res.json({ message: 'Collaborator permission updated' });
  } catch (err) {
    next(err);
  }
}

export async function getProjectActivity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;
    const limit = Number(req.query.limit ?? 20);
    const activity = await projectService.getActivity(
      projectId,
      Number.isFinite(limit) ? limit : 20,
    );
    res.json({ activity });
  } catch (err) {
    next(err);
  }
}
