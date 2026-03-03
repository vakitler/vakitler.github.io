export function createMotionCountdownController({
    getEl,
    reducedMotionQuery,
    getTargetTimeMs,
    getLastTimeMs,
    getRamadanState,
    checkDateRollover,
    setupNextPrayer,
    renderIcons
}) {
    let timerInterval = null;
    let heroInViewport = true;
    let countdownPausedByState = false;

    function stopCountdownLoop() {
        if (timerInterval) {
            clearTimeout(timerInterval);
            timerInterval = null;
        }
    }

    function startCountdown() {
        stopCountdownLoop();

        const countdownTimerEl = getEl('countdown-timer');
        const prayerProgressEl = getEl('prayer-progress');
        const iftarContainer = getEl('iftar-inline-container');
        const iftarInlineTimerEl = getEl('iftar-inline-timer');

        function scheduleNextTick() {
            if (
                document.visibilityState !== 'visible' ||
                document.documentElement.classList.contains('motion-paused')
            ) {
                countdownPausedByState = true;
                timerInterval = null;
                return;
            }

            const delayMs = 1000 - (Date.now() % 1000) || 1000;
            timerInterval = setTimeout(updateTimer, delayMs);
        }

        function updateTimer() {
            checkDateRollover();

            const targetTimeMs = getTargetTimeMs();
            if (!targetTimeMs) {
                timerInterval = null;
                return;
            }

            const nowMs = Date.now();
            const diff = targetTimeMs - nowMs;

            if (diff <= 0) {
                stopCountdownLoop();
                countdownTimerEl.innerText = '00:00:00';
                prayerProgressEl.style.width = '100%';

                setTimeout(setupNextPrayer, 2000);
                return;
            }

            const hours = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);

            countdownTimerEl.innerText =
                `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            const lastTimeMs = getLastTimeMs();
            if (lastTimeMs && targetTimeMs > lastTimeMs) {
                const totalDuration = targetTimeMs - lastTimeMs;
                const elapsed = nowMs - lastTimeMs;
                let percentage = (elapsed / totalDuration) * 100;
                if (percentage < 0) percentage = 0;
                if (percentage > 100) percentage = 100;
                prayerProgressEl.style.width = `${percentage}%`;
            }

            const { isRamadan, imsakTimeMs, aksamTimeMs } = getRamadanState();
            if (isRamadan && nowMs >= imsakTimeMs && nowMs < aksamTimeMs) {
                if (iftarContainer.classList.contains('hidden')) {
                    iftarContainer.classList.remove('hidden');
                    renderIcons();
                }

                const iftarDiff = aksamTimeMs - nowMs;
                const iHours = Math.floor(iftarDiff / 3600000);
                const iMins = Math.floor((iftarDiff % 3600000) / 60000);
                const iSecs = Math.floor((iftarDiff % 60000) / 1000);

                iftarInlineTimerEl.innerText =
                    `${String(iHours).padStart(2, '0')}:${String(iMins).padStart(2, '0')}:${String(iSecs).padStart(2, '0')}`;
            } else if (!iftarContainer.classList.contains('hidden')) {
                iftarContainer.classList.add('hidden');
            }

            scheduleNextTick();
        }

        updateTimer();
    }

    function updateMotionState() {
        const shouldPause =
            document.visibilityState !== 'visible' ||
            reducedMotionQuery.matches ||
            !heroInViewport;
        document.documentElement.classList.toggle('motion-paused', shouldPause);

        if (shouldPause) {
            if (timerInterval) {
                stopCountdownLoop();
                countdownPausedByState = true;
            }
            return;
        }

        if (countdownPausedByState && getTargetTimeMs()) {
            countdownPausedByState = false;
            startCountdown();
        }
    }

    function setupHeroMotionObserver() {
        const heroSection = getEl('hero-section');
        if (!heroSection || !('IntersectionObserver' in window)) {
            heroInViewport = true;
            updateMotionState();
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                heroInViewport = Boolean(entries[0]?.isIntersecting);
                updateMotionState();
            },
            { threshold: 0.08 }
        );

        observer.observe(heroSection);
    }

    function bindReducedMotionListener() {
        if (typeof reducedMotionQuery.addEventListener === 'function') {
            reducedMotionQuery.addEventListener('change', updateMotionState);
            return;
        }

        if (typeof reducedMotionQuery.addListener === 'function') {
            reducedMotionQuery.addListener(updateMotionState);
        }
    }

    return {
        bindReducedMotionListener,
        setupHeroMotionObserver,
        startCountdown,
        stopCountdownLoop,
        updateMotionState
    };
}
