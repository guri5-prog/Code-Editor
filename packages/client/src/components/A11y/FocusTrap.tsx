import { useEffect, useRef, type ReactNode } from 'react';

interface FocusTrapProps {
  children: ReactNode;
  active?: boolean;
}

export function FocusTrap({ children, active = true }: FocusTrapProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const root = ref.current;
    const focusable = root.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, [active]);

  return <div ref={ref}>{children}</div>;
}
