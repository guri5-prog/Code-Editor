import type { UserSettings } from '@code-editor/shared';

interface GeneralSettingsProps {
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
}

export function GeneralSettings({ settings, onChange }: GeneralSettingsProps) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>General</h2>
      <label style={labelStyle}>
        Theme
        <select
          value={settings.theme.activeTheme}
          onChange={(e) =>
            onChange({
              theme: { activeTheme: e.target.value as UserSettings['theme']['activeTheme'] },
            })
          }
          style={inputStyle}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="high-contrast">High Contrast</option>
        </select>
      </label>
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
