import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Project } from '@code-editor/shared';
import { Link } from 'react-router-dom';
import { deleteProject, fetchDashboard, fetchPublicProjects } from '../services/projectService';
import { ProjectCard } from '../components/Dashboard/ProjectCard';
import { QuickActions } from '../components/Dashboard/QuickActions';
import { RecentActivity } from '../components/Dashboard/RecentActivity';
import { logout } from '../services/auth';

export function Dashboard() {
  const [owned, setOwned] = useState<Project[]>([]);
  const [shared, setShared] = useState<Project[]>([]);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'owned' | 'shared' | 'public'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'language'>('recent');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, pub] = await Promise.all([fetchDashboard(), fetchPublicProjects(12, 0)]);
      setOwned(dashboard.owned);
      setShared(dashboard.shared);
      setPublicProjects(pub);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activitySource = useMemo(() => [...owned, ...shared], [owned, shared]);

  const applyFilters = useCallback(
    (projects: Project[], section: 'owned' | 'shared' | 'public') => {
      const q = query.trim().toLowerCase();
      const visible = projects
        .filter(() => (scope === 'all' ? true : scope === section))
        .filter((project) => {
          if (!q) return true;
          return (
            project.name.toLowerCase().includes(q) || project.language.toLowerCase().includes(q)
          );
        })
        .sort((a, b) => {
          if (sortBy === 'name') return a.name.localeCompare(b.name);
          if (sortBy === 'language') return a.language.localeCompare(b.language);
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      return visible;
    },
    [query, scope, sortBy],
  );

  const removeProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setOwned((items) => items.filter((p) => p.id !== projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={headingStyle}>Dashboard</h1>
        <div style={headerLinksStyle}>
          <Link to="/templates" style={navLinkStyle}>
            Templates
          </Link>
          <Link to="/settings" style={navLinkStyle}>
            Settings
          </Link>
          <button
            type="button"
            style={logoutBtnStyle}
            onClick={() => {
              logout().finally(() => {
                window.location.assign('/login');
              });
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {loading && <p style={mutedStyle}>Loading projects...</p>}
      {error && <p style={errorStyle}>{error}</p>}

      {!loading && (
        <main style={contentGridStyle}>
          <section style={leftColumnStyle}>
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Find Projects</h2>
              <div style={controlsStyle}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or language"
                  style={inputStyle}
                />
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as typeof scope)}
                  style={selectStyle}
                >
                  <option value="all">All</option>
                  <option value="owned">Owned</option>
                  <option value="shared">Shared</option>
                  <option value="public">Public</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  style={selectStyle}
                >
                  <option value="recent">Recently updated</option>
                  <option value="name">Name</option>
                  <option value="language">Language</option>
                </select>
              </div>
            </section>
            <Section title="My Projects">
              <ProjectGrid projects={applyFilters(owned, 'owned')} onDelete={removeProject} />
            </Section>
            <Section title="Shared With Me">
              <ProjectGrid projects={applyFilters(shared, 'shared')} />
            </Section>
            <Section title="Public Projects">
              <ProjectGrid projects={applyFilters(publicProjects, 'public')} />
            </Section>
          </section>

          <aside style={rightColumnStyle}>
            <QuickActions onCreated={load} />
            <RecentActivity projects={activitySource} />
          </aside>
        </main>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

function ProjectGrid({
  projects,
  onDelete,
}: {
  projects: Project[];
  onDelete?: (projectId: string) => void;
}) {
  if (projects.length === 0) return <p style={mutedStyle}>No projects yet.</p>;
  return (
    <div style={gridStyle}>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onDelete={onDelete} />
      ))}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  height: '100%',
  overflow: 'auto',
  padding: '20px',
  background: 'linear-gradient(180deg, var(--bg-secondary), var(--bg-primary))',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '18px',
};

const headingStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 800,
};

const headerLinksStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
};

const navLinkStyle: React.CSSProperties = {
  color: 'var(--accent)',
  fontSize: '13px',
};

const contentGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  gap: '16px',
};

const leftColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const rightColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const sectionStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '14px',
  backgroundColor: 'var(--bg-primary)',
};

const sectionTitleStyle: React.CSSProperties = {
  marginBottom: '12px',
  fontSize: '15px',
  color: 'var(--text-primary)',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '12px',
};

const controlsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  gap: '8px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  padding: '8px 10px',
  fontSize: '13px',
};

const selectStyle: React.CSSProperties = {
  borderRadius: '6px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  padding: '8px 10px',
  fontSize: '13px',
};

const mutedStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '13px',
};

const errorStyle: React.CSSProperties = {
  color: 'var(--error)',
  marginBottom: '10px',
  fontSize: '13px',
};

const logoutBtnStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '6px 10px',
  backgroundColor: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  cursor: 'pointer',
};
