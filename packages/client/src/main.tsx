import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router';
import './index.css';
import './styles/a11y.css';
import './styles/responsive.css';
import { SkipLinks } from './components/A11y/SkipLinks';
import { ScreenReaderAnnouncer } from './components/A11y/ScreenReaderAnnouncer';
import { useSettings } from './hooks/useSettings';
import { initializeAuth } from './services/auth';

function AppBootstrap() {
  const { initialize } = useSettings();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initializeAuth();
      await initialize();
    })().finally(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [initialize]);

  if (!ready) {
    return <div style={{ padding: 16, fontSize: 13 }}>Initializing session...</div>;
  }

  return (
    <>
      <SkipLinks />
      <ScreenReaderAnnouncer />
      <AppRouter />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppBootstrap />
    </BrowserRouter>
  </StrictMode>,
);
