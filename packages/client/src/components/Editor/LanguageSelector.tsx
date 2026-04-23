import { useState, useRef, useEffect } from 'react';
import { SUPPORTED_LANGUAGES } from '@code-editor/shared';

interface LanguageSelectorProps {
  value: string;
  onChange: (languageId: string) => void;
}

const CATEGORY_ORDER = ['web', 'systems', 'scripting', 'education', 'custom'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  web: 'Web',
  systems: 'Systems',
  scripting: 'Scripting',
  education: 'Education',
  custom: 'Custom',
};

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = SUPPORTED_LANGUAGES.find((l) => l.monacoId === value);

  const filtered = SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.displayName.toLowerCase().includes(search.toLowerCase()) ||
      l.id.toLowerCase().includes(search.toLowerCase()),
  );

  const grouped = filtered.reduce(
    (acc, lang) => {
      (acc[lang.category] ??= []).push(lang);
      return acc;
    },
    {} as Record<string, typeof filtered>,
  );

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  return (
    <div ref={containerRef} style={styles.container}>
      <button
        onClick={() => setOpen(!open)}
        style={styles.trigger}
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
        role="combobox"
      >
        {current?.displayName ?? 'Select Language'}
        <span style={styles.arrow}>{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div style={styles.dropdown} role="listbox" aria-label="Languages">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search languages..."
            style={styles.searchInput}
            aria-label="Search languages"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                setSearch('');
              }
            }}
          />
          <div style={styles.list}>
            {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((category) => (
              <div key={category}>
                <div style={styles.categoryLabel}>{CATEGORY_LABELS[category]}</div>
                {grouped[category].map((lang) => {
                  const isSelected = lang.monacoId === value;
                  const isHovered = lang.id === hoveredId;
                  return (
                    <button
                      key={lang.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(lang.monacoId);
                        setOpen(false);
                        setSearch('');
                      }}
                      onMouseEnter={() => setHoveredId(lang.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        ...styles.option,
                        backgroundColor: isSelected
                          ? 'var(--bg-surface)'
                          : isHovered
                            ? 'var(--bg-surface)'
                            : 'transparent',
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                      }}
                    >
                      {lang.displayName}
                    </button>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && <div style={styles.noResults}>No languages found</div>}
          </div>
        </div>
      )}
    </div>
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
  },
  searchInput: {
    width: '100%',
    padding: '8px 10px',
    backgroundColor: 'var(--bg-primary)',
    border: 'none',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  list: {
    maxHeight: '260px',
    overflowY: 'auto' as const,
    padding: '4px',
  },
  categoryLabel: {
    padding: '6px 8px 2px',
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  option: {
    display: 'block',
    width: '100%',
    padding: '6px 8px',
    border: 'none',
    borderRadius: '3px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
  },
  noResults: {
    padding: '12px 8px',
    color: 'var(--text-muted)',
    fontSize: '12px',
    textAlign: 'center' as const,
  },
};
