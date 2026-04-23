import type { FileNode, Project } from '@code-editor/shared';
import { apiFetch } from './apiClient';

export interface DashboardData {
  owned: Project[];
  shared: Project[];
}

export interface ProjectActivityEntry {
  fileId: string;
  path: string;
  language: string;
  version: number;
  updatedAt: string;
}

export interface FileVersionEntry {
  version: number;
  timestamp: string;
}

export async function fetchDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/api/projects');
}

export async function fetchPublicProjects(limit = 20, skip = 0): Promise<Project[]> {
  const data = await apiFetch<{ projects: Project[] }>(
    `/api/projects/public?limit=${encodeURIComponent(limit)}&skip=${encodeURIComponent(skip)}`,
  );
  return data.projects;
}

export async function createProject(input: {
  name: string;
  description?: string;
  language: string;
  isPublic?: boolean;
  templateId?: string;
}): Promise<Project> {
  const data = await apiFetch<{ project: Project }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.project;
}

export async function fetchProject(projectId: string): Promise<Project> {
  const data = await apiFetch<{ project: Project }>(`/api/projects/${projectId}`);
  return data.project;
}

export async function updateProject(
  projectId: string,
  input: { name?: string; description?: string; language?: string; isPublic?: boolean },
): Promise<Project> {
  const data = await apiFetch<{ project: Project }>(`/api/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return data.project;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiFetch<{ message: string }>(`/api/projects/${projectId}`, { method: 'DELETE' });
}

export async function fetchProjectFiles(projectId: string): Promise<FileNode[]> {
  const data = await apiFetch<{ files: FileNode[] }>(`/api/projects/${projectId}/files`);
  return data.files;
}

export async function createProjectFile(
  projectId: string,
  input: { path: string; language: string; content?: string },
): Promise<FileNode> {
  const data = await apiFetch<{ file: FileNode }>(`/api/projects/${projectId}/files`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.file;
}

export async function deleteProjectFile(fileId: string): Promise<void> {
  await apiFetch<{ message: string }>(`/api/files/${fileId}`, { method: 'DELETE' });
}

export async function renameProjectFile(
  fileId: string,
  input: { path?: string; language?: string },
): Promise<FileNode> {
  const data = await apiFetch<{ file: FileNode }>(`/api/files/${fileId}/meta`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return data.file;
}

export async function saveProjectFile(fileId: string, content: string): Promise<FileNode> {
  const data = await apiFetch<{ file: FileNode; version: number }>(`/api/files/${fileId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
  return {
    ...data.file,
    version: data.version,
  };
}

export async function fetchFileVersions(fileId: string): Promise<FileVersionEntry[]> {
  const data = await apiFetch<{ versions: FileVersionEntry[] }>(`/api/files/${fileId}/versions`);
  return data.versions;
}

export async function fetchFileVersionContent(fileId: string, version: number): Promise<string> {
  const data = await apiFetch<{ content: string }>(`/api/files/${fileId}/versions/${version}`);
  return data.content;
}

export async function fetchProjectActivity(
  projectId: string,
  limit = 20,
): Promise<ProjectActivityEntry[]> {
  const data = await apiFetch<{ activity: ProjectActivityEntry[] }>(
    `/api/projects/${projectId}/activity?limit=${encodeURIComponent(limit)}`,
  );
  return data.activity;
}

export async function fetchCollaborators(
  projectId: string,
): Promise<Array<{ userId: string; permission: 'edit' | 'view' | 'execute' }>> {
  const data = await apiFetch<{
    collaborators: Array<{ userId: string; permission: 'edit' | 'view' | 'execute' }>;
  }>(`/api/projects/${projectId}/collaborators`);
  return data.collaborators;
}

export async function addCollaborator(
  projectId: string,
  payload: { userId: string; permission: 'edit' | 'view' | 'execute' },
): Promise<void> {
  await apiFetch<{ message: string }>(`/api/projects/${projectId}/collaborators`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function removeCollaborator(projectId: string, userId: string): Promise<void> {
  await apiFetch<{ message: string }>(`/api/projects/${projectId}/collaborators/${userId}`, {
    method: 'DELETE',
  });
}

export async function updateCollaboratorPermission(
  projectId: string,
  userId: string,
  permission: 'edit' | 'view' | 'execute',
): Promise<void> {
  await apiFetch<{ message: string }>(`/api/projects/${projectId}/collaborators/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ permission }),
  });
}
