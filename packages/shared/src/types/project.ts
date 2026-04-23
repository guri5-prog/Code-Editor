export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  language: string;
  isPublic: boolean;
  template?: string;
  collaborators?: Array<{
    userId: string;
    permission: 'edit' | 'view' | 'execute';
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface FileNode {
  id: string;
  projectId: string;
  path: string;
  content: string;
  language: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
