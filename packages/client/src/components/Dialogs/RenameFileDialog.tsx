import { useState, useRef, useEffect } from 'react';
import { DialogOverlay } from './DialogOverlay';
import { validateFileName } from '../../utils/validateFileName';

interface RenameFileDialogProps {
  currentName: string;
  onClose: () => void;
  onRename: (newName: string) => void;
  existingNames: string[];
}

export function RenameFileDialog({
  currentName,
  onClose,
  onRename,
  existingNames,
}: RenameFileDialogProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const validationError = validateFileName(trimmed, existingNames, currentName);
    if (validationError) {
      setError(validationError);
      return;
    }
    onRename(trimmed);
    onClose();
  }

  return (
    <DialogOverlay onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <h3 style={styles.title}>Rename File</h3>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="rename-file-name">
            New name
          </label>
          <input
            ref={inputRef}
            id="rename-file-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            style={styles.input}
          />
          {error && <span style={styles.error}>{error}</span>}
        </div>
        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>
          <button type="submit" style={styles.renameBtn}>
            Rename
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
  renameBtn: {
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
