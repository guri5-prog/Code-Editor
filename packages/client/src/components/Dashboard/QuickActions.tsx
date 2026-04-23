import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../../services/projectService';
import { SUPPORTED_LANGUAGES } from '@code-editor/shared';

export function QuickActions({ onCreated }: { onCreated: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const project = await createProject({
        name: name.trim(),
        language,
        isPublic,
      });
      onCreated();
      navigate(`/project/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Quick Create</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        style={inputStyle}
      />
      <select value={language} onChange={(e) => setLanguage(e.target.value)} style={inputStyle}>
        {SUPPORTED_LANGUAGES.filter((lang) => !lang.restricted).map((lang) => (
          <option key={lang.id} value={lang.monacoId}>
            {lang.displayName}
          </option>
        ))}
      </select>
      <label style={checkboxStyle}>
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        <span>Public</span>
      </label>
      <button type="button" onClick={create} disabled={busy || !name.trim()} style={buttonStyle}>
        {busy ? 'Creating...' : 'Create Project'}
      </button>
      {error && <p style={errorStyle}>{error}</p>}
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '10px',
  backgroundColor: 'var(--bg-surface)',
  padding: '14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '14px',
};

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '8px 10px',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
};

const checkboxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  color: 'var(--text-secondary)',
};

const buttonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: '6px',
  padding: '8px 10px',
  backgroundColor: 'var(--accent)',
  color: 'var(--accent-text)',
  cursor: 'pointer',
  fontWeight: 700,
};

const errorStyle: React.CSSProperties = {
  color: 'var(--error)',
  fontSize: '12px',
};
