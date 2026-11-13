import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'edit'; id: string }
  | { name: 'play'; id: string }
  | { name: 'summary'; id: string }
  | { name: 'stats' }
  | { name: 'rules' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'edit':
      return parts[1] ? { name: 'edit', id: parts[1] } : { name: 'home' };
    case 'play':
      return parts[1] ? { name: 'play', id: parts[1] } : { name: 'home' };
    case 'summary':
      return parts[1] ? { name: 'summary', id: parts[1] } : { name: 'home' };
    case 'stats':
      return { name: 'stats' };
    case 'rules':
      return { name: 'rules' };
    default:
      return { name: 'home' };
  }
}

export function navigate(path: string) {
  window.location.hash = path.startsWith('/') ? path : '/' + path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
