import type { ProjectTemplate } from '@code-editor/shared';
import { DialogOverlay } from '../Dialogs/DialogOverlay';

interface TemplatePreviewProps {
  template: ProjectTemplate;
  onClose: () => void;
}

export function TemplatePreview({ template, onClose }: TemplatePreviewProps) {
  return (
    <DialogOverlay onClose={onClose}>
      <div style={contentStyle}>
        <h3 style={titleStyle}>{template.name}</h3>
        <p style={descStyle}>{template.description}</p>
        <div style={fileListStyle}>
          {template.files.map((file) => (
            <article key={file.path} style={fileCardStyle}>
              <div style={filePathStyle}>{file.path}</div>
              <pre style={fileContentStyle}>{file.content}</pre>
            </article>
          ))}
        </div>
      </div>
    </DialogOverlay>
  );
}

const contentStyle: React.CSSProperties = {
  width: 'min(820px, 92vw)',
  maxHeight: '78vh',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: 'var(--text-primary)',
};

const descStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-secondary)',
};

const fileListStyle: React.CSSProperties = {
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const fileCardStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg-primary)',
};

const filePathStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--border)',
  fontSize: 12,
  color: 'var(--text-secondary)',
  padding: '8px 10px',
};

const fileContentStyle: React.CSSProperties = {
  margin: 0,
  padding: 10,
  overflow: 'auto',
  maxHeight: 220,
  fontSize: 11,
  lineHeight: 1.45,
  color: 'var(--text-primary)',
};
