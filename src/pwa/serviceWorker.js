export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]';

    if (isLocalhost) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => registration.unregister());
        }).catch((err) => {
            console.warn('Service worker kayıt temizleme hatası:', err);
        });

        if ('caches' in window) {
            caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch((err) => {
                console.warn('Cache temizleme hatası:', err);
            });
        }
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.error('Service worker kayıt hatası:', err);
        });
    });
}
