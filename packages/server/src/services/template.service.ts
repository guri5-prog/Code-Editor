import type { ProjectTemplate, TemplateCreateInput } from '@code-editor/shared';
import { TemplateModel } from '../models/Template.model.js';

const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'js-console',
    name: 'JavaScript Console',
    description: 'Minimal JavaScript starter with a single executable file.',
    language: 'javascript',
    tags: ['javascript', 'starter'],
    files: [
      {
        path: 'index.js',
        language: 'javascript',
        content: "console.log('Hello from JavaScript template');\n",
      },
    ],
  },
  {
    id: 'python-script',
    name: 'Python Script',
    description: 'Python starter script with a main function.',
    language: 'python',
    tags: ['python', 'starter'],
    files: [
      {
        path: 'main.py',
        language: 'python',
        content:
          "def main():\n    print('Hello from Python template')\n\n\nif __name__ == '__main__':\n    main()\n",
      },
    ],
  },
  {
    id: 'web-basic',
    name: 'Basic Web App',
    description: 'A tiny HTML/CSS/JS project scaffold.',
    language: 'html',
    tags: ['web', 'frontend'],
    files: [
      {
        path: 'index.html',
        language: 'html',
        content:
          '<!doctype html>\n<html>\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>Starter App</title>\n    <link rel="stylesheet" href="styles.css" />\n  </head>\n  <body>\n    <main>\n      <h1>Starter App</h1>\n      <p>Edit <code>index.js</code> to begin.</p>\n    </main>\n    <script src="index.js"></script>\n  </body>\n</html>\n',
      },
      {
        path: 'styles.css',
        language: 'css',
        content:
          'body {\n  font-family: system-ui, sans-serif;\n  margin: 0;\n  padding: 2rem;\n  background: #f6f7f9;\n  color: #1a1f2b;\n}\n\nmain {\n  max-width: 40rem;\n}\n',
      },
      {
        path: 'index.js',
        language: 'javascript',
        content: "console.log('Web template loaded');\n",
      },
    ],
  },
  {
    id: 'java-hello',
    name: 'Hello World (Java)',
    description: 'Simple Java class starter.',
    language: 'java',
    tags: ['java', 'starter'],
    files: [
      {
        path: 'Main.java',
        language: 'java',
        content:
          'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, world!");\n  }\n}\n',
      },
    ],
  },
  {
    id: 'cpp-algo',
    name: 'Algorithm Practice (C++)',
    description: 'C++ starter file for algorithm exercises.',
    language: 'cpp',
    tags: ['cpp', 'algorithms'],
    files: [
      {
        path: 'main.cpp',
        language: 'cpp',
        content:
          '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  cout << "Hello, world!\\n";\n  return 0;\n}\n',
      },
    ],
  },
  {
    id: 'blank-project',
    name: 'Blank Project',
    description: 'Empty starter project with a README file.',
    language: 'plaintext',
    tags: ['blank'],
    files: [
      {
        path: 'README.md',
        language: 'markdown',
        content: '# Blank Project\n\nStart building your project here.\n',
      },
    ],
  },
];

class TemplateService {
  async listTemplates(): Promise<ProjectTemplate[]> {
    const custom = await TemplateModel.find({}).sort({ updatedAt: -1 }).lean();

    const customMapped: ProjectTemplate[] = custom.map((template) => ({
      id: template._id.toString(),
      name: template.name,
      description: template.description,
      language: template.language,
      tags: template.tags ?? [],
      files: (template.files ?? []).map((file) => ({
        path: file.path,
        language: file.language,
        content: file.content,
      })),
    }));

    return [...TEMPLATES, ...customMapped];
  }

  async getTemplateById(id: string): Promise<ProjectTemplate | null> {
    const builtIn = TEMPLATES.find((t) => t.id === id);
    if (builtIn) return builtIn;

    const custom = await TemplateModel.findById(id).lean();
    if (!custom) return null;
    return {
      id: custom._id.toString(),
      name: custom.name,
      description: custom.description,
      language: custom.language,
      tags: custom.tags ?? [],
      files: (custom.files ?? []).map((file) => ({
        path: file.path,
        language: file.language,
        content: file.content,
      })),
    };
  }

  async createTemplate(createdBy: string, input: TemplateCreateInput): Promise<ProjectTemplate> {
    const doc = await TemplateModel.create({
      name: input.name,
      description: input.description,
      language: input.language,
      tags: input.tags,
      files: input.files,
      createdBy,
    });

    return {
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      language: doc.language,
      tags: doc.tags ?? [],
      files: doc.files.map((file) => ({
        path: file.path,
        language: file.language,
        content: file.content,
      })),
    };
  }
}

export const templateService = new TemplateService();
