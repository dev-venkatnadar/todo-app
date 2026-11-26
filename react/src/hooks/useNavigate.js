import { useCallback } from 'react';

export function useNavigate() {
  return useCallback((path, { replace = false } = {}) => {
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);
}
