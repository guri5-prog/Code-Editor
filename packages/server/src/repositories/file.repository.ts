import { FileModel, type IFile } from '../models/File.model.js';
import type { FileNode } from '@code-editor/shared';

function toFileNode(doc: IFile): FileNode {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    path: doc.path,
    content: doc.content,
    language: doc.language,
    version: doc.version ?? 0,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function findById(id: string): Promise<IFile | null> {
  return FileModel.findById(id);
}

export async function findByProject(projectId: string): Promise<FileNode[]> {
  const docs = await FileModel.find({ projectId }).sort({ path: 1 });
  return docs.map(toFileNode);
}

export async function findByProjectAndPath(
  projectId: string,
  path: string,
): Promise<FileNode | null> {
  const doc = await FileModel.findOne({ projectId, path });
  return doc ? toFileNode(doc) : null;
}

export async function create(data: {
  projectId: string;
  path: string;
  content?: string;
  language: string;
}): Promise<FileNode> {
  const doc = await FileModel.create(data);
  return toFileNode(doc);
}

export async function updateContent(id: string, content: string): Promise<FileNode | null> {
  const doc = await FileModel.findByIdAndUpdate(
    id,
    { $set: { content }, $inc: { version: 1 } },
    { new: true },
  );
  return doc ? toFileNode(doc) : null;
}

export async function updateContentWithVersion(
  id: string,
  content: string,
  expectedVersion: number,
): Promise<FileNode | null> {
  const doc = await FileModel.findOneAndUpdate(
    { _id: id, version: expectedVersion },
    { $set: { content }, $inc: { version: 1 } },
    { new: true },
  );
  return doc ? toFileNode(doc) : null;
}

export async function updateMeta(
  id: string,
  data: { path?: string; language?: string },
): Promise<FileNode | null> {
  const doc = await FileModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  return doc ? toFileNode(doc) : null;
}

export async function deleteById(id: string): Promise<boolean> {
  const result = await FileModel.findByIdAndDelete(id);
  return result !== null;
}

export async function deleteByProject(projectId: string): Promise<number> {
  const result = await FileModel.deleteMany({ projectId });
  return result.deletedCount;
}
