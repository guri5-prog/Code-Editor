import { type ReactNode } from 'react';
import styles from './AppShell.module.css';

interface AppShellProps {
  header: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}

export function AppShell({ header, sidebar, children }: AppShellProps) {
  return (
    <div className={styles.shell} data-app-shell="true">
      <header className={styles.header}>{header}</header>
      <div className={styles.body} data-app-body="true">
        {sidebar && (
          <aside id="app-sidebar" className={styles.sidebar} data-app-sidebar="true">
            {sidebar}
          </aside>
        )}
        <main id="main-content" className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
