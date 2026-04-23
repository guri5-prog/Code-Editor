import type { UserSettings } from '@code-editor/shared';

interface EditorSettingsProps {
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
}

export function EditorSettings({ settings, onChange }: EditorSettingsProps) {
  const editor = settings.editor;

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Editor</h2>
      <div style={gridStyle}>
        <label style={labelStyle}>
          Font Size
          <input
            type="number"
            min={12}
            max={32}
            value={editor.fontSize}
            onChange={(e) => {
              const next = e.currentTarget.valueAsNumber;
              if (!Number.isFinite(next)) return;
              onChange({ editor: { ...editor, fontSize: clamp(next, 12, 32) } });
            }}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Tab Size
          <input
            type="number"
            min={1}
            max={8}
            value={editor.tabSize}
            onChange={(e) => {
              const next = e.currentTarget.valueAsNumber;
              if (!Number.isFinite(next)) return;
              onChange({ editor: { ...editor, tabSize: clamp(next, 1, 8) } });
            }}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Word Wrap
          <select
            value={editor.wordWrap}
            onChange={(e) =>
              onChange({
                editor: {
                  ...editor,
                  wordWrap: e.target.value as UserSettings['editor']['wordWrap'],
                },
              })
            }
            style={inputStyle}
          >
            <option value="on">On</option>
            <option value="off">Off</option>
            <option value="wordWrapColumn">Word Wrap Column</option>
          </select>
        </label>
        <label style={labelStyle}>
          Line Numbers
          <select
            value={editor.lineNumbers}
            onChange={(e) =>
              onChange({
                editor: {
                  ...editor,
                  lineNumbers: e.target.value as UserSettings['editor']['lineNumbers'],
                },
              })
            }
            style={inputStyle}
          >
            <option value="on">On</option>
            <option value="off">Off</option>
            <option value="relative">Relative</option>
          </select>
        </label>
        <label style={checkLabelStyle}>
          <input
            type="checkbox"
            checked={editor.minimap}
            onChange={(e) => onChange({ editor: { ...editor, minimap: e.target.checked } })}
          />
          <span>Enable Minimap</span>
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

const checkLabelStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  fontSize: 12,
  color: 'var(--text-secondary)',
  marginTop: 24,
};
