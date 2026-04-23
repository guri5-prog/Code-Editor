import { useState, useRef, useEffect, useMemo } from 'react';
import {
  useThemeStore,
  getThemeColors,
} from '../../store/themeStore';
import { BUILT_IN_THEMES } from '@code-editor/shared';
import { useSettingsStore } from '../../hooks/useSettings';

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const setTheme = useThemeStore((s) => s.setTheme);
  const customThemes = useThemeStore((s) => s.customThemes);
  const allThemes = useMemo(() => [...BUILT_IN_THEMES, ...customThemes], [customThemes]);
  const activeConfig = useMemo(
    () => allThemes.find((theme) => theme.id === activeThemeId),
    [allThemes, activeThemeId],
  );

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={containerRef} style={styles.container}>
      <button
        onClick={() => setOpen(!open)}
        style={styles.trigger}
        aria-label="Select theme"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <ThemePreviewInline
          colors={getThemeColors(activeConfig?.baseTheme ?? activeThemeId, activeConfig?.colors)}
          size={20}
        />
        {activeConfig?.displayName ?? 'Theme'}
        <span style={styles.arrow}>{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div style={styles.dropdown} role="listbox" aria-label="Themes">
          {allThemes.map((theme) => {
            const isSelected = theme.id === activeThemeId;
            const isHovered = theme.id === hoveredId;
            const colors = getThemeColors(theme.baseTheme ?? theme.id, theme.colors);

            return (
              <button
                key={theme.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setTheme(theme.id);
                  void useSettingsStore.getState().updateSettings({
                    theme: { activeTheme: theme.id as 'dark' | 'light' | 'high-contrast' },
                    accessibility: {
                      ...useSettingsStore.getState().settings.accessibility,
                      highContrast: theme.id === 'high-contrast',
                    },
                  });
                  setOpen(false);
                }}
                onMouseEnter={() => setHoveredId(theme.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  ...styles.option,
                  backgroundColor: isSelected || isHovered ? 'var(--bg-surface)' : 'transparent',
                }}
              >
                <ThemePreviewInline colors={colors} size={28} />
                <div style={styles.optionText}>
                  <span
                    style={{
                      ...styles.optionName,
                      color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                    }}
                  >
                    {theme.displayName}
                  </span>
                  {!theme.isBuiltIn && <span style={styles.customBadge}>Custom</span>}
                </div>
                {isSelected && <span style={styles.check}>&#10003;</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThemePreviewInline({
  colors,
  size,
}: {
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgSurface: string;
    accent: string;
    textPrimary: string;
    textMuted: string;
    success: string;
  };
  size: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ borderRadius: 4, flexShrink: 0 }}>
      <rect width="32" height="32" fill={colors.bgPrimary} />
      <rect x="0" y="0" width="8" height="32" fill={colors.bgSecondary} />
      <rect x="0" y="0" width="32" height="6" fill={colors.bgSurface} />
      <rect x="10" y="10" width="16" height="2" rx="1" fill={colors.accent} />
      <rect x="10" y="14" width="12" height="2" rx="1" fill={colors.textPrimary} />
      <rect x="10" y="18" width="14" height="2" rx="1" fill={colors.textMuted} />
      <rect x="10" y="22" width="10" height="2" rx="1" fill={colors.success} />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  arrow: {
    fontSize: '8px',
    color: 'var(--text-muted)',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    width: '220px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    boxShadow: '0 8px 24px var(--shadow-color)',
    zIndex: 100,
    overflow: 'hidden',
    padding: '4px',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '6px 8px',
    border: 'none',
    borderRadius: '3px',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
  },
  optionText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
    flex: 1,
  },
  optionName: {
    fontSize: '12px',
  },
  customBadge: {
    fontSize: '9px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  check: {
    color: 'var(--accent)',
    fontSize: '14px',
    fontWeight: 'bold',
  },
};
