import { useRef, type ReactNode } from 'react';

interface DialogOverlayProps {
  children: ReactNode;
  onClose: () => void;
}

export function DialogOverlay({ children, onClose }: DialogOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={overlayRef}
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div style={styles.dialog}>{children}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'var(--overlay-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  dialog: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '20px',
    minWidth: '320px',
    maxWidth: '90vw',
    boxShadow: '0 8px 32px var(--shadow-color)',
  },
};
