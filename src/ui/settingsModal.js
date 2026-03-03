export function createSettingsModalController({ getEl }) {
    let lastFocusedElement = null;
    let scrollYBeforeModal = 0;

    function getFocusableElements(container) {
        if (!container) return [];

        return Array.from(
            container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter((el) => !el.disabled && !el.getAttribute('aria-hidden'));
    }

    function toggleSettings() {
        const modal = getEl('settings-modal');
        const dialog = getEl('settings-dialog');
        if (!modal) return;

        const isOpening = modal.classList.contains('hidden');

        modal.classList.toggle('hidden');
        modal.setAttribute('aria-hidden', isOpening ? 'false' : 'true');

        if (isOpening) {
            scrollYBeforeModal = window.scrollY || window.pageYOffset || 0;
            document.documentElement.classList.add('modal-open');
            document.body.classList.add('modal-open');
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollYBeforeModal}px`;
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        } else {
            document.documentElement.classList.remove('modal-open');
            document.body.classList.remove('modal-open');
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            window.scrollTo(0, scrollYBeforeModal);
            scrollYBeforeModal = 0;
        }

        if (isOpening) {
            lastFocusedElement = document.activeElement;
            setTimeout(() => {
                const focusableEls = getFocusableElements(modal);
                if (focusableEls.length > 0) {
                    focusableEls[0].focus();
                } else if (dialog) {
                    dialog.focus();
                }
            }, 0);
            return;
        }

        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
            lastFocusedElement = null;
        }
    }

    function bindKeydown() {
        document.addEventListener('keydown', (e) => {
            const modal = getEl('settings-modal');
            if (!modal || modal.classList.contains('hidden')) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                toggleSettings();
                return;
            }

            if (e.key !== 'Tab') return;

            const focusableEls = getFocusableElements(modal);
            if (focusableEls.length === 0) return;

            const firstEl = focusableEls[0];
            const lastEl = focusableEls[focusableEls.length - 1];

            if (e.shiftKey && document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
            } else if (!e.shiftKey && document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
            }
        });
    }

    return {
        bindKeydown,
        toggleSettings
    };
}
