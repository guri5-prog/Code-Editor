import type { Project } from '@code-editor/shared';

export function RecentActivity({ projects }: { projects: Project[] }) {
  const items = [...projects]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 8);

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Recent Activity</h2>
      {items.length === 0 ? (
        <p style={emptyStyle}>No project activity yet.</p>
      ) : (
        <ul style={listStyle}>
          {items.map((project) => (
            <li key={project.id} style={itemStyle}>
              <span style={nameStyle}>{project.name}</span>
              <span style={timeStyle}>{new Date(project.updatedAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '10px',
  backgroundColor: 'var(--bg-surface)',
  padding: '14px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '14px',
  marginBottom: '10px',
};

const emptyStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '12px',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '8px',
};

const nameStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: '12px',
};

const timeStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '11px',
};
