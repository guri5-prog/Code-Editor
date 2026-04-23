import { ProjectModel, type IProject } from '../models/Project.model.js';
import type { Project } from '@code-editor/shared';
import type { Types } from 'mongoose';

function toProject(doc: IProject): Project {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId.toString(),
    name: doc.name,
    description: doc.description,
    language: doc.language,
    isPublic: doc.isPublic,
    template: doc.template,
    collaborators: (doc.collaborators ?? []).map((c) => ({
      userId: c.userId.toString(),
      permission: c.permission,
    })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function findById(id: string): Promise<IProject | null> {
  return ProjectModel.findById(id);
}

export async function findByOwner(ownerId: string): Promise<Project[]> {
  const docs = await ProjectModel.find({ ownerId }).sort({ updatedAt: -1 });
  return docs.map(toProject);
}

export async function findSharedWith(userId: string): Promise<Project[]> {
  const docs = await ProjectModel.find({
    'collaborators.userId': userId,
  }).sort({ updatedAt: -1 });
  return docs.map(toProject);
}

export async function findPublic(limit = 20, skip = 0): Promise<Project[]> {
  const docs = await ProjectModel.find({ isPublic: true })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);
  return docs.map(toProject);
}

export async function create(data: {
  ownerId: string;
  name: string;
  description?: string;
  language: string;
  isPublic?: boolean;
  template?: string;
}): Promise<Project> {
  const doc = await ProjectModel.create(data);
  return toProject(doc);
}

export async function updateById(
  id: string,
  data: Partial<Pick<IProject, 'name' | 'description' | 'language' | 'isPublic'>>,
): Promise<Project | null> {
  const doc = await ProjectModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  return doc ? toProject(doc) : null;
}

export async function deleteById(id: string): Promise<boolean> {
  const result = await ProjectModel.findByIdAndDelete(id);
  return result !== null;
}

export async function addCollaborator(
  projectId: string,
  userId: string,
  permission: 'edit' | 'view' | 'execute',
): Promise<boolean> {
  const result = await ProjectModel.updateOne(
    { _id: projectId, 'collaborators.userId': { $ne: userId } },
    { $push: { collaborators: { userId: userId as unknown as Types.ObjectId, permission } } },
  );
  return result.modifiedCount > 0;
}

export async function removeCollaborator(projectId: string, userId: string): Promise<boolean> {
  const result = await ProjectModel.updateOne(
    { _id: projectId },
    {
      $pull: { collaborators: { userId } },
    },
  );
  return result.modifiedCount > 0;
}

export async function updateCollaboratorPermission(
  projectId: string,
  userId: string,
  permission: 'edit' | 'view' | 'execute',
): Promise<boolean> {
  const result = await ProjectModel.findOneAndUpdate(
    { _id: projectId, 'collaborators.userId': userId },
    { $set: { 'collaborators.$.permission': permission } },
  );
  return result !== null;
}
