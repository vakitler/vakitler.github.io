export function createThemeController({ getEl, renderIcons }) {
    function updateThemeIcon(iconName) {
        const iconEl = getEl('theme-icon');
        if (iconEl) {
            iconEl.setAttribute('data-lucide', iconName);
            renderIcons();
        }
    }

    function initTheme() {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            updateThemeIcon('sun');
        } else {
            document.documentElement.classList.remove('dark');
            updateThemeIcon('moon');
        }
    }

    function toggleTheme() {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
            updateThemeIcon('moon');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            updateThemeIcon('sun');
        }
    }

    return {
        initTheme,
        toggleTheme
    };
}
