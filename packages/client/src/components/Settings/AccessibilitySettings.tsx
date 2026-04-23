import type { UserSettings } from '@code-editor/shared';

interface AccessibilitySettingsProps {
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
}

export function AccessibilitySettings({ settings, onChange }: AccessibilitySettingsProps) {
  const accessibility = settings.accessibility;

  const toggle = (key: keyof UserSettings['accessibility']) => {
    onChange({
      accessibility: {
        ...accessibility,
        [key]: !accessibility[key],
      },
    });
  };

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Accessibility</h2>
      <div style={listStyle}>
        <label style={checkStyle}>
          <input
            type="checkbox"
            checked={accessibility.reducedMotion}
            onChange={() => toggle('reducedMotion')}
          />
          <span>Reduced Motion</span>
        </label>
        <label style={checkStyle}>
          <input
            type="checkbox"
            checked={accessibility.highContrast}
            onChange={() => toggle('highContrast')}
          />
          <span>High Contrast Theme</span>
        </label>
        <label style={checkStyle}>
          <input
            type="checkbox"
            checked={accessibility.focusIndicators}
            onChange={() => toggle('focusIndicators')}
          />
          <span>Visible Focus Indicators</span>
        </label>
        <label style={checkStyle}>
          <input
            type="checkbox"
            checked={accessibility.screenReaderMode}
            onChange={() => toggle('screenReaderMode')}
          />
          <span>Screen Reader Mode</span>
        </label>
      </div>
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

const listStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
};

const checkStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  fontSize: 12,
  color: 'var(--text-secondary)',
};
