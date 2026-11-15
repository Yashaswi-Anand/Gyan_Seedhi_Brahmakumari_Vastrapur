/* "Install as an app" (PWA) helpers.
   Chrome / Edge (Android and computers) fire `beforeinstallprompt`; we keep it so the app can
   show its own Install button. iPhone / iPad Safari has no such event: users add the app with
   Share → "Add to Home Screen", so the app shows those steps instead. */

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export function initPwa() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // show our own button instead of the browser's mini bar
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
  // the service worker is only for the real (production) app, not the dev server
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
}

export const canPromptInstall = () => !!deferred;

/** Shows the browser's install dialog. Resolves 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const e = deferred;
  deferred = null;
  notify();
  e.prompt();
  const { outcome } = await e.userChoice;
  return outcome;
}

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Already running as an installed app? */
export const isInstalled = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
