import * as projectRepo from '../repositories/project.repository.js';
import { FileModel } from '../models/File.model.js';
import { FileVersionModel } from '../models/FileVersion.model.js';
import { ProjectModel } from '../models/Project.model.js';
import type {
  CollaboratorInput,
  ProjectCreateInput,
  ProjectUpdateInput,
  Project,
} from '@code-editor/shared';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { templateService } from './template.service.js';

export interface ProjectActivityEntry {
  fileId: string;
  path: string;
  language: string;
  version: number;
  updatedAt: string;
}

class ProjectService {
  async listDashboard(userId: string): Promise<{
    owned: Project[];
    shared: Project[];
  }> {
    const [owned, shared] = await Promise.all([
      projectRepo.findByOwner(userId),
      projectRepo.findSharedWith(userId),
    ]);
    return { owned, shared };
  }

  async listPublic(limit = 20, skip = 0): Promise<Project[]> {
    return projectRepo.findPublic(limit, skip);
  }

  async getById(projectId: string): Promise<Project> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError(400, 'Invalid project ID');
    }
    const project = await projectRepo.findById(projectId);
    if (!project) throw new AppError(404, 'Project not found');

    return {
      id: project._id.toString(),
      ownerId: project.ownerId.toString(),
      name: project.name,
      description: project.description,
      language: project.language,
      isPublic: project.isPublic,
      template: project.template,
      collaborators: (project.collaborators ?? []).map((c) => ({
        userId: c.userId.toString(),
        permission: c.permission,
      })),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async create(userId: string, input: ProjectCreateInput): Promise<Project> {
    const template = input.templateId
      ? await templateService.getTemplateById(input.templateId)
      : null;

    const initialFiles = template?.files ?? [
      {
        path: defaultPathForLanguage(input.language),
        language: input.language,
        content: defaultContentForLanguage(input.language),
      },
    ];

    const session = await mongoose.startSession();
    try {
      let createdProject: Project | null = null;
      await session.withTransaction(async () => {
        const projectDoc = await ProjectModel.create(
          [
            {
              ownerId: userId,
              name: input.name,
              description: input.description?.trim() || undefined,
              language: template?.language ?? input.language,
              isPublic: input.isPublic,
              template: template?.id,
            },
          ],
          { session },
        );
        const project = projectDoc[0];
        createdProject = {
          id: project._id.toString(),
          ownerId: project.ownerId.toString(),
          name: project.name,
          description: project.description,
          language: project.language,
          isPublic: project.isPublic,
          template: project.template,
          collaborators: [],
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
        };

        await FileModel.insertMany(
          initialFiles.map((file) => ({
            projectId: project._id,
            path: file.path,
            language: file.language,
            content: file.content,
          })),
          { session },
        );
      });
      if (!createdProject) throw new AppError(500, 'Project creation failed');
      return createdProject;
    } finally {
      session.endSession();
    }
  }

  async update(projectId: string, input: ProjectUpdateInput): Promise<Project> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError(400, 'Invalid project ID');
    }
    const updated = await projectRepo.updateById(projectId, {
      name: input.name,
      description: input.description?.trim() || undefined,
      language: input.language,
      isPublic: input.isPublic,
    });
    if (!updated) throw new AppError(404, 'Project not found');
    return updated;
  }

  async delete(projectId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError(400, 'Invalid project ID');
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const files = await FileModel.find({ projectId }).select('_id').session(session).lean();
        const fileIds = files.map((f) => f._id);

        await FileModel.deleteMany({ projectId }).session(session);
        if (fileIds.length > 0) {
          await FileVersionModel.deleteMany({ fileId: { $in: fileIds } }).session(session);
        }
        await ProjectModel.deleteOne({ _id: projectId }).session(session);
      });
    } finally {
      session.endSession();
    }
  }

  async assertOwner(projectId: string, userId: string): Promise<void> {
    const project = await projectRepo.findById(projectId);
    if (!project) throw new AppError(404, 'Project not found');
    if (project.ownerId.toString() !== userId) {
      throw new AppError(403, 'Only the owner can perform this action');
    }
  }

  async listCollaborators(
    projectId: string,
  ): Promise<Array<{ userId: string; permission: 'edit' | 'view' | 'execute' }>> {
    const project = await projectRepo.findById(projectId);
    if (!project) throw new AppError(404, 'Project not found');
    return (project.collaborators ?? []).map((c) => ({
      userId: c.userId.toString(),
      permission: c.permission,
    }));
  }

  async addCollaborator(projectId: string, payload: CollaboratorInput): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(payload.userId)) {
      throw new AppError(400, 'Invalid collaborator user ID');
    }
    const project = await projectRepo.findById(projectId);
    if (!project) throw new AppError(404, 'Project not found');
    const exists = (project.collaborators ?? []).some(
      (c) => c.userId.toString() === payload.userId,
    );
    if (exists) throw new AppError(409, 'Collaborator already exists');
    const ok = await projectRepo.addCollaborator(projectId, payload.userId, payload.permission);
    if (!ok) throw new AppError(500, 'Failed to add collaborator');
  }

  async removeCollaborator(projectId: string, userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError(400, 'Invalid collaborator user ID');
    }
    const project = await projectRepo.findById(projectId);
    if (!project) throw new AppError(404, 'Project not found');
    const exists = (project.collaborators ?? []).some((c) => c.userId.toString() === userId);
    if (!exists) throw new AppError(404, 'Collaborator not found');
    const ok = await projectRepo.removeCollaborator(projectId, userId);
    if (!ok) throw new AppError(500, 'Failed to remove collaborator');
  }

  async updateCollaboratorPermission(
    projectId: string,
    userId: string,
    permission: 'edit' | 'view' | 'execute',
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError(400, 'Invalid collaborator user ID');
    }
    const ok = await projectRepo.updateCollaboratorPermission(projectId, userId, permission);
    if (!ok) throw new AppError(404, 'Collaborator not found');
  }

  async getActivity(projectId: string, limit = 20): Promise<ProjectActivityEntry[]> {
    const files = await FileModel.find({ projectId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('_id path language version updatedAt')
      .lean();

    return files.map((f) => ({
      fileId: f._id.toString(),
      path: f.path,
      language: f.language,
      version: f.version ?? 0,
      updatedAt: f.updatedAt.toISOString(),
    }));
  }
}

function defaultPathForLanguage(language: string): string {
  switch (language) {
    case 'python':
      return 'main.py';
    case 'java':
      return 'Main.java';
    case 'c':
      return 'main.c';
    case 'cpp':
      return 'main.cpp';
    case 'go':
      return 'main.go';
    case 'rust':
      return 'main.rs';
    case 'html':
      return 'index.html';
    case 'css':
      return 'styles.css';
    default:
      return 'index.js';
  }
}

function defaultContentForLanguage(language: string): string {
  if (language === 'python') return "print('Hello, world!')\n";
  if (language === 'java')
    return 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, world!");\n  }\n}\n';
  if (language === 'html')
    return '<!doctype html>\n<html><body><h1>Hello, world!</h1></body></html>\n';
  return "console.log('Hello, world!');\n";
}

export const projectService = new ProjectService();
