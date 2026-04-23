import { useEffect, useState } from 'react';
import type { ProjectTemplate } from '@code-editor/shared';
import { Link, useNavigate } from 'react-router-dom';
import { createTemplate, fetchTemplates } from '../services/templateService';
import { createProject } from '../services/projectService';
import { TemplateCard } from '../components/Templates/TemplateCard';
import { TemplatePreview } from '../components/Templates/TemplatePreview';

export function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<ProjectTemplate | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customLanguage, setCustomLanguage] = useState('javascript');
  const [customTags, setCustomTags] = useState('custom');
  const [customFiles, setCustomFiles] = useState<
    Array<{ path: string; language: string; content: string }>
  >([
    {
      path: 'index.js',
      language: 'javascript',
      content: "console.log('Hello from custom template');\n",
    },
  ]);

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load templates'));
  }, []);

  const createFromTemplate = async (template: ProjectTemplate) => {
    setBusyTemplateId(template.id);
    setError('');
    try {
      const project = await createProject({
        name: `${template.name} Project`,
        language: template.language,
        templateId: template.id,
      });
      navigate(`/project/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setBusyTemplateId(null);
    }
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Templates</h1>
        <Link to="/dashboard" style={linkStyle}>
          Dashboard
        </Link>
      </header>

      {error && <p style={errorStyle}>{error}</p>}

      <section style={customPanelStyle}>
        <h2 style={customTitleStyle}>Create Custom Template</h2>
        <div style={customGridStyle}>
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Template name"
            style={inputStyle}
          />
          <input
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Description"
            style={inputStyle}
          />
          <input
            value={customLanguage}
            onChange={(e) => setCustomLanguage(e.target.value)}
            placeholder="Language id (e.g. javascript)"
            style={inputStyle}
          />
          <input
            value={customTags}
            onChange={(e) => setCustomTags(e.target.value)}
            placeholder="Tags (comma-separated)"
            style={inputStyle}
          />
        </div>

        <div style={filesEditorWrapStyle}>
          <div style={filesEditorHeaderStyle}>
            <span style={customSubtitleStyle}>Template Files</span>
            <button
              type="button"
              style={subtleBtnStyle}
              onClick={() => {
                const fallback = customLanguage.trim() || 'javascript';
                setCustomFiles((prev) => [
                  ...prev,
                  {
                    path:
                      fallback === 'python'
                        ? `file-${prev.length + 1}.py`
                        : `file-${prev.length + 1}.js`,
                    language: fallback,
                    content: '',
                  },
                ]);
              }}
            >
              Add File
            </button>
          </div>
          {customFiles.map((file, idx) => (
            <div key={`${file.path}-${idx}`} style={fileRowStyle}>
              <div style={fileRowTopStyle}>
                <input
                  value={file.path}
                  onChange={(e) =>
                    setCustomFiles((prev) =>
                      prev.map((entry, i) =>
                        i === idx ? { ...entry, path: e.target.value } : entry,
                      ),
                    )
                  }
                  placeholder="path/to/file.ext"
                  style={inputStyle}
                />
                <input
                  value={file.language}
                  onChange={(e) =>
                    setCustomFiles((prev) =>
                      prev.map((entry, i) =>
                        i === idx ? { ...entry, language: e.target.value } : entry,
                      ),
                    )
                  }
                  placeholder="language"
                  style={inputStyle}
                />
                <button
                  type="button"
                  style={dangerBtnStyle}
                  onClick={() =>
                    setCustomFiles((prev) =>
                      prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev,
                    )
                  }
                >
                  Remove
                </button>
              </div>
              <textarea
                value={file.content}
                onChange={(e) =>
                  setCustomFiles((prev) =>
                    prev.map((entry, i) =>
                      i === idx ? { ...entry, content: e.target.value } : entry,
                    ),
                  )
                }
                placeholder="File content..."
                style={textareaStyle}
              />
            </div>
          ))}
        </div>

        <div style={customActionsStyle}>
          <button
            type="button"
            style={createCustomBtnStyle}
            onClick={async () => {
              if (!customName.trim() || !customDescription.trim() || !customLanguage.trim()) return;
              const cleanedFiles = customFiles
                .map((file) => ({
                  path: file.path.trim(),
                  language: file.language.trim(),
                  content: file.content,
                }))
                .filter((file) => file.path && file.language);
              if (cleanedFiles.length === 0) {
                setError('Custom template must include at least one valid file.');
                return;
              }
              try {
                const template = await createTemplate({
                  name: customName.trim(),
                  description: customDescription.trim(),
                  language: customLanguage.trim(),
                  tags: customTags
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                  files: cleanedFiles,
                });
                setTemplates((prev) => [template, ...prev]);
                setCustomName('');
                setCustomDescription('');
                setCustomTags('custom');
                setCustomFiles([
                  {
                    path: customLanguage.trim() === 'python' ? 'main.py' : 'index.js',
                    language: customLanguage.trim(),
                    content:
                      customLanguage.trim() === 'python'
                        ? "print('Hello from custom template')\n"
                        : "console.log('Hello from custom template');\n",
                  },
                ]);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to create template');
              }
            }}
          >
            Save Template
          </button>
        </div>
      </section>

      <div style={gridStyle}>
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            busy={busyTemplateId === template.id}
            onUse={() => createFromTemplate(template)}
            onPreview={() => setPreviewTemplate(template)}
          />
        ))}
      </div>
      {previewTemplate && (
        <TemplatePreview template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  height: '100%',
  overflow: 'auto',
  padding: '20px',
  backgroundColor: 'var(--bg-primary)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 900,
};

const linkStyle: React.CSSProperties = {
  color: 'var(--accent)',
};

const errorStyle: React.CSSProperties = {
  color: 'var(--error)',
  marginBottom: '10px',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '12px',
};

const customPanelStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 12,
  marginBottom: 14,
  backgroundColor: 'var(--bg-surface)',
};

const customTitleStyle: React.CSSProperties = {
  fontSize: 14,
  marginBottom: 10,
};

const customGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr 1fr',
  gap: 8,
  marginBottom: 10,
};

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '8px 10px',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 13,
};

const createCustomBtnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 6,
  padding: '8px 10px',
  backgroundColor: 'var(--accent)',
  color: 'var(--accent-text)',
  fontWeight: 700,
  cursor: 'pointer',
};

const filesEditorWrapStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 10,
  backgroundColor: 'var(--bg-primary)',
  display: 'grid',
  gap: 8,
};

const filesEditorHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const customSubtitleStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  fontWeight: 600,
};

const fileRowStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 8,
  display: 'grid',
  gap: 6,
};

const fileRowTopStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 160px auto',
  gap: 8,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 96,
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '8px 10px',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 12,
  fontFamily: 'Consolas, monospace',
};

const customActionsStyle: React.CSSProperties = {
  marginTop: 10,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
};

const subtleBtnStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '6px 10px',
  backgroundColor: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 12,
  cursor: 'pointer',
};

const dangerBtnStyle: React.CSSProperties = {
  border: '1px solid var(--error)',
  borderRadius: 6,
  padding: '6px 10px',
  backgroundColor: 'transparent',
  color: 'var(--error)',
  fontSize: 12,
  cursor: 'pointer',
};
