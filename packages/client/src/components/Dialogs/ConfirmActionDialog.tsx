import { DialogOverlay } from './DialogOverlay';

interface ConfirmActionDialogProps {
  title: string;
  description: string;
  confirmText?: string;
  tone?: 'danger' | 'normal';
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmActionDialog({
  title,
  description,
  confirmText = 'Confirm',
  tone = 'normal',
  onClose,
  onConfirm,
}: ConfirmActionDialogProps) {
  return (
    <DialogOverlay onClose={onClose}>
      <h3 style={titleStyle}>{title}</h3>
      <p style={descStyle}>{description}</p>
      <div style={actionsStyle}>
        <button type="button" onClick={onClose} style={cancelBtnStyle}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          style={tone === 'danger' ? dangerBtnStyle : confirmBtnStyle}
        >
          {confirmText}
        </button>
      </div>
    </DialogOverlay>
  );
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: 10,
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const descStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
};

const actionsStyle: React.CSSProperties = {
  marginTop: 18,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
};

const cancelBtnStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 6,
  backgroundColor: 'transparent',
  color: 'var(--text-secondary)',
  padding: '7px 12px',
  fontSize: 12,
  cursor: 'pointer',
};

const confirmBtnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 6,
  backgroundColor: 'var(--accent)',
  color: 'var(--accent-text)',
  padding: '7px 12px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const dangerBtnStyle: React.CSSProperties = {
  ...confirmBtnStyle,
  backgroundColor: 'var(--error)',
  color: '#fff',
};
