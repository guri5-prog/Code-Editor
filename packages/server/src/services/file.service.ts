import DiffMatchPatch from 'diff-match-patch';
import * as fileRepo from '../repositories/file.repository.js';
import { AppError } from '../middleware/errorHandler.js';
import type { FileNode } from '@code-editor/shared';
import mongoose from 'mongoose';
import { FileModel } from '../models/File.model.js';
import { FileVersionModel } from '../models/FileVersion.model.js';

const dmp = new DiffMatchPatch();
const MAX_VERSIONS_PER_FILE = 50;

function toFileNode(file: {
  _id: { toString(): string };
  projectId: { toString(): string };
  path: string;
  content: string;
  language: string;
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}): FileNode {
  return {
    id: file._id.toString(),
    projectId: file.projectId.toString(),
    path: file.path,
    content: file.content,
    language: file.language,
    version: file.version ?? 0,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

async function createVersionInSession(
  fileId: string,
  content: string,
  session: mongoose.ClientSession,
): Promise<number> {
  const latest = await FileVersionModel.findOne({ fileId })
    .sort({ version: -1 })
    .select('version')
    .session(session)
    .lean();
  const version = (latest?.version ?? 0) + 1;
  await FileVersionModel.create([{ fileId, version, content }], { session });

  const stale = await FileVersionModel.find({ fileId })
    .sort({ version: -1 })
    .skip(MAX_VERSIONS_PER_FILE)
    .select('_id')
    .session(session)
    .lean();
  if (stale.length > 0) {
    await FileVersionModel.deleteMany({ _id: { $in: stale.map((doc) => doc._id) } }).session(
      session,
    );
  }
  return version;
}

class FileService {
  async getProjectFiles(projectId: string): Promise<FileNode[]> {
    return fileRepo.findByProject(projectId);
  }

  async getFile(fileId: string): Promise<FileNode> {
    const file = await fileRepo.findById(fileId);
    if (!file) throw new AppError(404, 'File not found');
    return toFileNode(file);
  }

  async createFile(
    projectId: string,
    data: { path: string; content: string; language: string },
  ): Promise<FileNode> {
    const existing = await fileRepo.findByProjectAndPath(projectId, data.path);
    if (existing) throw new AppError(409, 'File already exists at this path');

    return fileRepo.create({ projectId, ...data });
  }

  async saveContent(fileId: string, content: string): Promise<{ file: FileNode; version: number }> {
    const session = await mongoose.startSession();
    try {
      let fileNode: FileNode | null = null;
      let version = 0;
      await session.withTransaction(async () => {
        const updated = await FileModel.findByIdAndUpdate(
          fileId,
          { $set: { content }, $inc: { version: 1 } },
          { new: true, session },
        );
        if (!updated) throw new AppError(404, 'File not found');
        fileNode = toFileNode(updated);
        version = await createVersionInSession(fileId, content, session);
      });
      if (!fileNode) throw new AppError(500, 'File save failed');
      return { file: fileNode, version };
    } finally {
      session.endSession();
    }
  }

  async patchContent(
    fileId: string,
    patchText: string,
    baseVersion: number,
  ): Promise<{ file: FileNode; version: number }> {
    const session = await mongoose.startSession();
    try {
      let fileNode: FileNode | null = null;
      let version = 0;
      await session.withTransaction(async () => {
        const existing = await FileModel.findById(fileId).session(session);
        if (!existing) throw new AppError(404, 'File not found');

        if ((existing.version ?? 0) !== baseVersion) {
          throw new AppError(409, 'Version conflict - please re-fetch and retry');
        }

        const patches = dmp.patch_fromText(patchText);
        const [patched, results] = dmp.patch_apply(patches, existing.content);
        if (results.some((r) => !r)) {
          throw new AppError(422, 'Patch could not be applied cleanly');
        }

        existing.content = patched;
        existing.version = (existing.version ?? 0) + 1;
        await existing.save({ session });

        fileNode = toFileNode(existing);
        version = await createVersionInSession(fileId, patched, session);
      });
      if (!fileNode) throw new AppError(500, 'Patch update failed');
      return { file: fileNode, version };
    } finally {
      session.endSession();
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const deleted = await FileModel.findByIdAndDelete(fileId, { session });
        if (!deleted) throw new AppError(404, 'File not found');
        await FileVersionModel.deleteMany({ fileId }).session(session);
      });
    } finally {
      session.endSession();
    }
  }

  async updateMeta(fileId: string, data: { path?: string; language?: string }): Promise<FileNode> {
    if (data.path) {
      const existing = await fileRepo.findById(fileId);
      if (!existing) throw new AppError(404, 'File not found');

      const samePath = existing.path === data.path;
      if (!samePath) {
        const duplicate = await fileRepo.findByProjectAndPath(
          existing.projectId.toString(),
          data.path,
        );
        if (duplicate) throw new AppError(409, 'File already exists at this path');
      }
    }

    const file = await fileRepo.updateMeta(fileId, data);
    if (!file) throw new AppError(404, 'File not found');
    return file;
  }
}

export const fileService = new FileService();
