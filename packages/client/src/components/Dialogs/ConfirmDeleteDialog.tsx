import { DialogOverlay } from './DialogOverlay';

interface ConfirmDeleteDialogProps {
  fileName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({ fileName, onClose, onConfirm }: ConfirmDeleteDialogProps) {
  return (
    <DialogOverlay onClose={onClose}>
      <h3 style={styles.title}>Delete File</h3>
      <p style={styles.message}>
        Are you sure you want to delete <strong>{fileName}</strong>? This action cannot be undone.
      </p>
      <div style={styles.actions}>
        <button type="button" onClick={onClose} style={styles.cancelBtn}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          style={styles.deleteBtn}
        >
          Delete
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
  deleteBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'var(--error)',
    color: 'white',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
