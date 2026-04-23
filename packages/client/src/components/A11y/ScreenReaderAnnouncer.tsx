import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function pathToLabel(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'Dashboard page';
  if (pathname.startsWith('/templates')) return 'Templates page';
  if (pathname.startsWith('/settings')) return 'Settings page';
  if (pathname.startsWith('/project/')) return 'Project editor page';
  if (pathname.startsWith('/login')) return 'Login page';
  return 'Page changed';
}

export function ScreenReaderAnnouncer() {
  const location = useLocation();
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage(pathToLabel(location.pathname));
  }, [location.pathname]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
