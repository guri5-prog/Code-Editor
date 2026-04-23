import { Link } from 'react-router-dom';

interface ProjectHeaderProps {
  projectId: string;
}

export function ProjectHeader({ projectId }: ProjectHeaderProps) {
  return (
    <div style={barStyle}>
      <Link to="/dashboard" style={linkStyle}>
        Dashboard
      </Link>
      <Link to={`/project/${projectId}/settings`} style={linkStyle}>
        Project Settings
      </Link>
      <Link to="/settings" style={linkStyle}>
        User Settings
      </Link>
    </div>
  );
}

const barStyle: React.CSSProperties = {
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '0 12px',
  borderBottom: '1px solid var(--border)',
  backgroundColor: 'var(--bg-secondary)',
  fontSize: '12px',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--accent)',
  textDecoration: 'none',
};
