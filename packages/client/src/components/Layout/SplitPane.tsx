import { useState, useCallback, useRef, type ReactNode } from 'react';
import styles from './SplitPane.module.css';

interface SplitPaneProps {
  top: ReactNode;
  bottom: ReactNode;
  ratio: number;
  onRatioChange: (ratio: number) => void;
  minRatio?: number;
  maxRatio?: number;
}

export function SplitPane({
  top,
  bottom,
  ratio,
  onRatioChange,
  minRatio = 0.2,
  maxRatio = 0.8,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);

      const onMouseMove = (ev: MouseEvent) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const y = ev.clientY - rect.top;
        const newRatio = Math.min(maxRatio, Math.max(minRatio, y / rect.height));
        onRatioChange(newRatio);
      };

      const onMouseUp = () => {
        setDragging(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [onRatioChange, minRatio, maxRatio],
  );

  const handleDoubleClick = useCallback(() => {
    onRatioChange(0.6);
  }, [onRatioChange]);

  const topPercent = `${ratio * 100}%`;
  const bottomPercent = `${(1 - ratio) * 100}%`;

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.topPane} style={{ height: topPercent }}>
        {top}
      </div>
      <div
        className={`${styles.divider} ${dragging ? styles.dividerActive : ''}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize editor and output panels"
        tabIndex={0}
      />
      <div className={styles.bottomPane} style={{ height: bottomPercent }}>
        {bottom}
      </div>
    </div>
  );
}
