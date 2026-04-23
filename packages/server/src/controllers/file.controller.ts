import type { Request, Response, NextFunction } from 'express';
import { fileService } from '../services/file.service.js';
import { versionService } from '../services/version.service.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getProjectFiles(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;
    const files = await fileService.getProjectFiles(projectId);
    res.json({ files });
  } catch (err) {
    next(err);
  }
}

export async function getFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fileId } = req.params;
    const file = await fileService.getFile(fileId);
    res.json({ file });
  } catch (err) {
    next(err);
  }
}

export async function createFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const file = await fileService.createFile(projectId, req.body);
    res.status(201).json({ file });
  } catch (err) {
    next(err);
  }
}

export async function saveFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fileId } = req.params;
    const { content } = req.body as { content: string };
    const { file, version } = await fileService.saveContent(fileId, content);
    res.json({ file, version });
  } catch (err) {
    next(err);
  }
}

export async function patchFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fileId } = req.params;
    const { patch, baseVersion } = req.body as { patch: string; baseVersion: number };
    const { file, version } = await fileService.patchContent(fileId, patch, baseVersion);
    res.json({ file, version });
  } catch (err) {
    next(err);
  }
}

export async function deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fileId } = req.params;
    await fileService.deleteFile(fileId);
    res.json({ message: 'File deleted' });
  } catch (err) {
    next(err);
  }
}

export async function updateFileMeta(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { fileId } = req.params;
    const { path, language } = req.body as { path?: string; language?: string };
    const file = await fileService.updateMeta(fileId, { path, language });
    res.json({ file });
  } catch (err) {
    next(err);
  }
}

export async function getVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fileId } = req.params;
    const versions = await versionService.getVersions(fileId);
    res.json({ versions });
  } catch (err) {
    next(err);
  }
}

export async function getVersionContent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { fileId, version } = req.params;
    const versionNum = Number(version);
    if (!Number.isInteger(versionNum) || versionNum < 1) {
      throw new AppError(400, 'Invalid version number');
    }
    const content = await versionService.getVersionContent(fileId, versionNum);
    if (content === null) {
      throw new AppError(404, 'Version not found');
    }
    res.json({ content, version: versionNum });
  } catch (err) {
    next(err);
  }
}
