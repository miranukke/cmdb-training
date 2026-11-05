import { useEffect, useRef } from 'react';

/**
 * Global keyboard shortcuts. Ignored while typing in form fields or when a modifier key is held,
 * so browser shortcuts keep working. The latest handler is always used (no stale closures).
 */
export function useHotkeys(handler: (e: KeyboardEvent) => void, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      ref.current(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
