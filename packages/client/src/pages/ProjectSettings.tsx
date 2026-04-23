import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  addCollaborator,
  deleteProject,
  fetchCollaborators,
  fetchProject,
  fetchProjectActivity,
  removeCollaborator,
  updateCollaboratorPermission,
  updateProject,
  type ProjectActivityEntry,
} from '../services/projectService';
import type { Project } from '@code-editor/shared';
import { CollaboratorManager } from '../components/Project/CollaboratorManager';

export function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activity, setActivity] = useState<ProjectActivityEntry[]>([]);
  const [collaborators, setCollaborators] = useState<
    Array<{ userId: string; permission: 'edit' | 'view' | 'execute' }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [collabUserId, setCollabUserId] = useState('');
  const [collabPermission, setCollabPermission] = useState<'edit' | 'view' | 'execute'>('view');

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchProject(id), fetchProjectActivity(id, 20), fetchCollaborators(id)])
      .then(([p, a, c]) => {
        setProject(p);
        setActivity(a);
        setCollaborators(c);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load settings'));
  }, [id]);

  if (!id) return <div style={errorStyle}>Missing project id</div>;
  if (!project) return <div style={pageStyle}>Loading settings...</div>;

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await updateProject(id, {
        name: project.name,
        description: project.description,
        language: project.language,
        isPublic: project.isPublic,
      });
      setProject(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!collabUserId.trim()) return;
    try {
      await addCollaborator(id, { userId: collabUserId.trim(), permission: collabPermission });
      const refreshed = await fetchCollaborators(id);
      setCollaborators(refreshed);
      setCollabUserId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add collaborator');
    }
  };

  const remove = async (userId: string) => {
    try {
      await removeCollaborator(id, userId);
      setCollaborators((items) => items.filter((c) => c.userId !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove collaborator');
    }
  };

  const removeProject = async () => {
    if (!window.confirm('Delete this project permanently?')) return;
    try {
      await deleteProject(id);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Project Settings</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to={`/project/${id}`} style={linkStyle}>
            Back to editor
          </Link>
          <Link to="/dashboard" style={linkStyle}>
            Dashboard
          </Link>
        </div>
      </header>

      {error && <p style={errorStyle}>{error}</p>}

      <section style={panelStyle}>
        <h2 style={panelTitleStyle}>General</h2>
        <label style={labelStyle}>Name</label>
        <input
          value={project.name}
          onChange={(e) => setProject({ ...project, name: e.target.value })}
          style={inputStyle}
        />
        <label style={labelStyle}>Description</label>
        <textarea
          value={project.description ?? ''}
          onChange={(e) => setProject({ ...project, description: e.target.value })}
          style={{ ...inputStyle, minHeight: '80px' }}
        />
        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={project.isPublic}
            onChange={(e) => setProject({ ...project, isPublic: e.target.checked })}
          />
          <span>Public project</span>
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" style={primaryBtnStyle} onClick={save} disabled={busy}>
            {busy ? 'Saving...' : 'Save'}
          </button>
          <button type="button" style={dangerBtnStyle} onClick={removeProject}>
            Delete Project
          </button>
        </div>
      </section>

      <CollaboratorManager
        collaborators={collaborators}
        userId={collabUserId}
        permission={collabPermission}
        onUserIdChange={setCollabUserId}
        onPermissionChange={setCollabPermission}
        onAdd={add}
        onRemove={remove}
        onChangePermission={async (userId, permission) => {
          try {
            await updateCollaboratorPermission(id, userId, permission);
            setCollaborators((items) =>
              items.map((c) => (c.userId === userId ? { ...c, permission } : c)),
            );
          } catch (err) {
            setError(
              err instanceof Error ? err.message : 'Failed to update collaborator permission',
            );
          }
        }}
      />

      <section style={panelStyle}>
        <h2 style={panelTitleStyle}>Recent File Activity</h2>
        <ul style={listStyle}>
          {activity.map((entry) => (
            <li key={entry.fileId} style={listItemStyle}>
              <span>{entry.path}</span>
              <span>v{entry.version}</span>
              <span>{new Date(entry.updatedAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  height: '100%',
  overflow: 'auto',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  backgroundColor: 'var(--bg-primary)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 800,
};

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '10px',
  backgroundColor: 'var(--bg-surface)',
  padding: '14px',
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  marginBottom: '10px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '4px',
  color: 'var(--text-secondary)',
  fontSize: '12px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  marginBottom: '8px',
};

const checkboxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  color: 'var(--text-secondary)',
  marginBottom: '10px',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: 'var(--accent)',
  color: 'var(--accent-text)',
  fontWeight: 700,
  cursor: 'pointer',
};

const dangerBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  backgroundColor: 'var(--error)',
  color: '#fff',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const listItemStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '8px',
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  gap: '10px',
  alignItems: 'center',
  fontSize: '12px',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--accent)',
  fontSize: '13px',
};

const errorStyle: React.CSSProperties = {
  color: 'var(--error)',
  fontSize: '13px',
};
