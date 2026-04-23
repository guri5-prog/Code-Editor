import { useState, useRef, useEffect } from 'react';
import { SUPPORTED_LANGUAGES } from '@code-editor/shared';
import { DialogOverlay } from './DialogOverlay';
import { validateFileName } from '../../utils/validateFileName';
import { validateFilePath } from '../../utils/validateFilePath';

interface NewFileDialogProps {
  onClose: () => void;
  onCreate: (name: string, language: string) => void;
  existingNames: string[];
  initialName?: string;
  initialLanguage?: string;
  allowPath?: boolean;
}

export function NewFileDialog({
  onClose,
  onCreate,
  existingNames,
  initialName = '',
  initialLanguage = 'typescript',
  allowPath = false,
}: NewFileDialogProps) {
  const [name, setName] = useState(initialName);
  const [language, setLanguage] = useState(initialLanguage);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialName) {
      inputRef.current?.setSelectionRange(initialName.length, initialName.length);
    }
  }, [initialName]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const validationError = allowPath
      ? validateFilePath(trimmed, existingNames)
      : validateFileName(trimmed, existingNames);
    if (validationError) {
      setError(validationError);
      return;
    }
    onCreate(trimmed, language);
    onClose();
  }

  return (
    <DialogOverlay onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <h3 style={styles.title}>New File</h3>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="new-file-name">
            File name
          </label>
          <input
            ref={inputRef}
            id="new-file-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="e.g. main.ts"
            autoCapitalize="off"
            style={styles.input}
          />
          {error && <span style={styles.error}>{error}</span>}
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="new-file-lang">
            Language
          </label>
          <select
            id="new-file-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={styles.select}
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.id} value={l.monacoId}>
                {l.displayName}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>
          <button type="submit" style={styles.createBtn}>
            Create
          </button>
        </div>
      </form>
    </DialogOverlay>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '16px',
  },
  field: {
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  error: {
    display: 'block',
    fontSize: '11px',
    color: 'var(--error)',
    marginTop: '4px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '16px',
  },
  cancelBtn: {
    padding: '6px 14px',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  createBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
