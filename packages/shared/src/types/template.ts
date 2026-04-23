export interface ProjectTemplateFile {
  path: string;
  language: string;
  content: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  tags: string[];
  files: ProjectTemplateFile[];
}
