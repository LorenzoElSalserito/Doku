import { useCallback, useEffect, useState } from 'react';
import { logWorkspaceEvent } from '../workspaceDocuments.js';

/**
 * Owns: the immersive (chrome-less) reading flag.
 * Exposes: the flag and its toggle; Escape leaves immersive mode.
 * Does not: persist the flag.
 */
export function useImmersiveMode() {
  const [immersive, setImmersive] = useState(false);

  const toggleImmersive = useCallback(() => {
    setImmersive((current) => {
      const next = !current;
      logWorkspaceEvent('workspace-immersive-toggled', { immersive: next });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!immersive) {
      return undefined;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setImmersive(false);
        logWorkspaceEvent('workspace-immersive-toggled', { immersive: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [immersive]);

  return { immersive, toggleImmersive };
}
