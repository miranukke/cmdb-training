/**
 * Registers the service worker that vite.config.ts emits as sw.js (production builds only;
 * in `vite dev` a cache would just get in the way of hot reloading).
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    // Relative URL: the scope becomes the folder the app is served from, e.g. /cmdb-training/.
    navigator.serviceWorker.register('./sw.js').catch((err: unknown) => {
      console.warn('Service worker registration failed', err);
    });
  });
}
