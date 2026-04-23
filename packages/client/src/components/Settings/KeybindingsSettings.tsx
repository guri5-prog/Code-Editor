import type { UserSettings } from '@code-editor/shared';

interface KeybindingsSettingsProps {
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
}

export function KeybindingsSettings({ settings, onChange }: KeybindingsSettingsProps) {
  const keybindings = settings.keybindings;
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Keybindings</h2>
      <div style={gridStyle}>
        <label style={labelStyle}>
          Run Code
          <input
            value={keybindings.run}
            onChange={(e) => onChange({ keybindings: { ...keybindings, run: e.target.value } })}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Save
          <input
            value={keybindings.save}
            onChange={(e) => onChange({ keybindings: { ...keybindings, save: e.target.value } })}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          New File
          <input
            value={keybindings.newFile}
            onChange={(e) => onChange({ keybindings: { ...keybindings, newFile: e.target.value } })}
            style={inputStyle}
          />
        </label>
      </div>
      <p style={noteStyle}>
        Shortcuts apply live. Use unique combos like Ctrl+S, Ctrl+ENTER, Alt+1.
      </p>
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 14,
  backgroundColor: 'var(--bg-surface)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 15,
  marginBottom: 10,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10,
};

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  fontSize: 12,
  color: 'var(--text-secondary)',
};

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 6,
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  padding: '8px 10px',
  fontSize: 13,
};

const noteStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 11,
  color: 'var(--text-muted)',
};
