import { useEffect, useRef, useState } from 'react';
import { DialogOverlay } from './DialogOverlay';

interface TextPromptDialogProps {
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  errorText?: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export function TextPromptDialog({
  title,
  label,
  placeholder,
  initialValue = '',
  confirmText = 'Confirm',
  errorText,
  onClose,
  onSubmit,
}: TextPromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <DialogOverlay onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(value.trim());
        }}
      >
        <h3 style={titleStyle}>{title}</h3>
        <label style={labelStyle}>
          {label}
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            style={inputStyle}
          />
        </label>
        {errorText && <p style={errorStyle}>{errorText}</p>}
        <div style={actionsStyle}>
          <button type="button" onClick={onClose} style={cancelBtnStyle}>
            Cancel
          </button>
          <button type="submit" style={confirmBtnStyle}>
            {confirmText}
          </button>
        </div>
      </form>
    </DialogOverlay>
  );
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: 12,
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  fontSize: 12,
  color: 'var(--text-secondary)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 13,
};

const errorStyle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 0,
  color: 'var(--error)',
  fontSize: 12,
};

const actionsStyle: React.CSSProperties = {
  marginTop: 16,
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
