import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { GeneralSettings } from '../components/Settings/GeneralSettings';
import { EditorSettings } from '../components/Settings/EditorSettings';
import { KeybindingsSettings } from '../components/Settings/KeybindingsSettings';
import { AccessibilitySettings } from '../components/Settings/AccessibilitySettings';

export function Settings() {
  const { settings, loading, initialized, initialize, updateSettings } = useSettings();

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialize, initialized]);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Settings</h1>
        <div style={linksStyle}>
          <Link to="/dashboard" style={linkStyle}>
            Dashboard
          </Link>
        </div>
      </header>

      {loading && <p style={mutedStyle}>Syncing settings...</p>}

      <div style={contentStyle}>
        <GeneralSettings settings={settings} onChange={updateSettings} />
        <EditorSettings settings={settings} onChange={updateSettings} />
        <KeybindingsSettings settings={settings} onChange={updateSettings} />
        <AccessibilitySettings settings={settings} onChange={updateSettings} />
      </div>
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

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 800,
};

const linksStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
};

const linkStyle: React.CSSProperties = {
  color: 'var(--accent)',
  fontSize: 13,
};

const mutedStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 13,
};

const contentStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
};
