export function runNonCriticalTask(task) {
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => task(), { timeout: 1200 });
        return;
    }

    setTimeout(task, 0);
}
