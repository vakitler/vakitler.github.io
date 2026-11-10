export function createThemeController({ getEl, renderIcons }) {
    function updateThemeColor(isDark) {
        let metaTheme = document.querySelector('meta[name="theme-color"]:not([media])');
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.setAttribute('name', 'theme-color');
            document.head.appendChild(metaTheme);
        }
        metaTheme.setAttribute('content', isDark ? '#121418' : '#f7f9ff');
    }

    function updateThemeIcon(iconName) {
        const iconEl = getEl('theme-icon');
        if (iconEl) {
            iconEl.setAttribute('data-lucide', iconName);
            renderIcons();
        }
    }

    function initTheme() {
        const isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
            document.documentElement.classList.add('dark');
            updateThemeIcon('sun');
        } else {
            document.documentElement.classList.remove('dark');
            updateThemeIcon('moon');
        }
        updateThemeColor(isDark);
    }

    function toggleTheme() {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
            updateThemeIcon('moon');
            updateThemeColor(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            updateThemeIcon('sun');
            updateThemeColor(true);
        }
    }

    return {
        initTheme,
        toggleTheme
    };
}
