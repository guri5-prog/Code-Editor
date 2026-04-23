import { DialogOverlay } from './DialogOverlay';

interface UnsavedChangesDialogProps {
  fileName: string;
  onClose: () => void;
  onDiscard: () => void;
}

export function UnsavedChangesDialog({ fileName, onClose, onDiscard }: UnsavedChangesDialogProps) {
  return (
    <DialogOverlay onClose={onClose}>
      <h3 style={styles.title}>Unsaved Changes</h3>
      <p style={styles.message}>
        <strong>{fileName}</strong> has unsaved changes. Do you want to discard them?
      </p>
      <div style={styles.actions}>
        <button type="button" onClick={onClose} style={styles.cancelBtn}>
          Keep Editing
        </button>
        <button
          type="button"
          onClick={() => {
            onDiscard();
            onClose();
          }}
          style={styles.discardBtn}
        >
          Discard
        </button>
      </div>
    </DialogOverlay>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  message: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    marginBottom: '16px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
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
  discardBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'var(--warning)',
    color: 'var(--accent-text)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
