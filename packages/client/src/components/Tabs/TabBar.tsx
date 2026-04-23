import { useRef } from 'react';
import { Tab } from './Tab';
import { useFileStore } from '../../store/fileStore';

interface TabBarProps {
  onCloseTab: (id: string) => void;
}

export function TabBar({ onCloseTab }: TabBarProps) {
  const tabOrder = useFileStore((s) => s.tabOrder);
  const files = useFileStore((s) => s.files);
  const activeFileId = useFileStore((s) => s.activeFileId);
  const setActiveFile = useFileStore((s) => s.setActiveFile);
  const reorderTabs = useFileStore((s) => s.reorderTabs);

  const dragIndexRef = useRef<number | null>(null);

  return (
    <div style={styles.bar} role="tablist" aria-label="Open files">
      {tabOrder.map((id, index) => {
        const file = files[id];
        if (!file) return null;
        return (
          <Tab
            key={id}
            name={file.name}
            isActive={id === activeFileId}
            isDirty={file.isDirty}
            onClick={() => setActiveFile(id)}
            onClose={() => onCloseTab(id)}
            onMiddleClick={() => onCloseTab(id)}
            index={index}
            onDragStart={(i) => {
              dragIndexRef.current = i;
            }}
            onDragOver={(i) => {
              if (dragIndexRef.current !== null && dragIndexRef.current !== i) {
                reorderTabs(dragIndexRef.current, i);
                dragIndexRef.current = i;
              }
            }}
            onDragEnd={() => {
              dragIndexRef.current = null;
            }}
          />
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'stretch',
    height: '35px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
  },
};
