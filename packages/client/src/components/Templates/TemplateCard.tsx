import type { ProjectTemplate } from '@code-editor/shared';

interface TemplateCardProps {
  template: ProjectTemplate;
  busy: boolean;
  onUse: () => void;
  onPreview: () => void;
}

export function TemplateCard({ template, busy, onUse, onPreview }: TemplateCardProps) {
  return (
    <article style={cardStyle}>
      <h2 style={cardTitleStyle}>{template.name}</h2>
      <p style={descStyle}>{template.description}</p>
      <div style={tagsRowStyle}>
        {template.tags.map((tag) => (
          <span key={tag} style={tagStyle}>
            {tag}
          </span>
        ))}
      </div>
      <div style={filesBlockStyle}>
        {template.files.map((file) => (
          <code key={file.path} style={fileStyle}>
            {file.path}
          </code>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={subtleButtonStyle} onClick={onPreview}>
          Preview
        </button>
        <button type="button" style={buttonStyle} disabled={busy} onClick={onUse}>
          {busy ? 'Creating...' : 'Use Template'}
        </button>
      </div>
    </article>
  );
}

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '14px',
  backgroundColor: 'var(--bg-surface)',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '16px',
};

const descStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '13px',
};

const tagsRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
};

const tagStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '999px',
  padding: '2px 8px',
  fontSize: '11px',
  color: 'var(--text-secondary)',
};

const filesBlockStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const fileStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
};

const buttonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: '6px',
  padding: '8px 10px',
  backgroundColor: 'var(--accent)',
  color: 'var(--accent-text)',
  fontWeight: 700,
  cursor: 'pointer',
};

const subtleButtonStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '8px 10px',
  backgroundColor: 'transparent',
  color: 'var(--text-secondary)',
  fontWeight: 600,
  cursor: 'pointer',
};
