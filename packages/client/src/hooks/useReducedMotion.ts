import { useMediaQuery } from './useMediaQuery';
import { useSettings } from './useSettings';

export function useReducedMotion(): boolean {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { settings } = useSettings();
  return prefersReducedMotion || settings.accessibility.reducedMotion;
}
