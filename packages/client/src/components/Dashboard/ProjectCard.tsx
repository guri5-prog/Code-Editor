import type { Project } from '@code-editor/shared';
import { Link } from 'react-router-dom';

interface ProjectCardProps {
  project: Project;
  onDelete?: (projectId: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  return (
    <article style={cardStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>{project.name}</h3>
        {project.isPublic && <span style={badgeStyle}>Public</span>}
      </div>
      {project.description && <p style={descStyle}>{project.description}</p>}
      <div style={metaStyle}>
        <span>{project.language}</span>
        <span>{project.collaborators?.length ?? 0} collaborators</span>
        <span>{new Date(project.updatedAt).toLocaleString()}</span>
      </div>
      <div style={actionsStyle}>
        <Link to={`/project/${project.id}`} style={linkBtnStyle}>
          Open
        </Link>
        <Link to={`/project/${project.id}/settings`} style={subtleBtnStyle}>
          Settings
        </Link>
        {onDelete && (
          <button type="button" style={dangerBtnStyle} onClick={() => onDelete(project.id)}>
            Delete
          </button>
        )}
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
  minHeight: '160px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const badgeStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: '999px',
  backgroundColor: 'var(--accent)',
  color: 'var(--accent-text)',
  fontSize: '11px',
  fontWeight: 700,
};

const descStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '13px',
  lineHeight: 1.4,
  flex: 1,
};

const metaStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '11px',
  color: 'var(--text-muted)',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const baseBtn: React.CSSProperties = {
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '12px',
  textDecoration: 'none',
  border: '1px solid var(--border)',
};

const linkBtnStyle: React.CSSProperties = {
  ...baseBtn,
  backgroundColor: 'var(--accent)',
  border: 'none',
  color: 'var(--accent-text)',
  fontWeight: 700,
};

const subtleBtnStyle: React.CSSProperties = {
  ...baseBtn,
  backgroundColor: 'transparent',
  color: 'var(--text-secondary)',
};

const dangerBtnStyle: React.CSSProperties = {
  ...baseBtn,
  backgroundColor: 'transparent',
  color: 'var(--error)',
  cursor: 'pointer',
};
