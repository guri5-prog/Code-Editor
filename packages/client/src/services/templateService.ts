import type { ProjectTemplate } from '@code-editor/shared';
import { apiFetch } from './apiClient';

export async function fetchTemplates(): Promise<ProjectTemplate[]> {
  const data = await apiFetch<{ templates: ProjectTemplate[] }>('/api/templates');
  return data.templates;
}

export async function createTemplate(input: {
  name: string;
  description: string;
  language: string;
  tags: string[];
  files: Array<{ path: string; language: string; content: string }>;
}): Promise<ProjectTemplate> {
  const data = await apiFetch<{ template: ProjectTemplate }>('/api/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.template;
}
