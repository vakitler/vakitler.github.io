import { formatDateKey } from '../utils/time';
import { API_BASE, createApiClient } from '../services/api';
import { createDropdownManager } from '../ui/dropdowns';
import { createSettingsModalController } from '../ui/settingsModal';
import { computeNextPrayerState, getDayContext } from '../core/prayerTiming';
import { registerServiceWorker } from '../pwa/serviceWorker';
import { createThemeController } from '../ui/themeController';
import { applyLanguageTexts as applyLanguageTextsToUi, updateLocationText } from '../ui/texts';
import { createToast } from '../ui/toast';
import { createPrayerHighlighter, renderPrayerDay } from '../ui/prayerDisplay';
import { i18n } from '../i18n/translations';
import { dropdownTypes, hijriMonthMap, prayers } from '../constants/prayerMeta';
import { createLocationController } from './locationController';
import { createMotionCountdownController } from './motionCountdownController';
import { runNonCriticalTask } from '../utils/scheduler';

export function createAppController({ createIcons, usedIcons }) {
    function renderIcons() {
        createIcons({ icons: usedIcons });
    }

    registerServiceWorker();

    const { fetchJson } = createApiClient();
    let prayerData = null;
    let targetTimeMs = null;
    let lastTimeMs = null;
    let currentLang = localStorage.getItem('appLang') || 'tr';

    let imsakTimeMs = null;
    let aksamTimeMs = null;
    let isRamadan = false;
    let currentRenderedDate = formatDateKey(new Date());
    let renderedPrayerDayIndex = -1;
    let renderedGregorianDayIndex = -1;
    let locationController = null;

    const t = (key) => i18n[currentLang][key];
    const dropdownConfig = {
        country: { idKey: 'UlkeID', nameKey: 'UlkeAdi', getData: () => locationController?.getCountriesData() ?? [] },
        region: { idKey: 'SehirID', nameKey: 'SehirAdi', getData: () => locationController?.getRegionsData() ?? [] },
        city: { idKey: 'IlceID', nameKey: 'IlceAdi', getData: () => locationController?.getCitiesData() ?? [] }
    };

    const elementCache = new Map();
    const getEl = (id) => {
        const cached = elementCache.get(id);
        if (cached && cached.isConnected) {
            return cached;
        }
        const el = document.getElementById(id);
        if (el) {
            elementCache.set(id, el);
        }
        return el;
    };

    const settingsModalController = createSettingsModalController({ getEl });
    const toggleSettings = settingsModalController.toggleSettings;
    settingsModalController.bindKeydown();

    const themeController = createThemeController({ getEl, renderIcons });
    const { initTheme, toggleTheme } = themeController;

    const toast = createToast({ getEl });
    const showMessage = (msg) => toast.showMessage(msg);
    const updateLocationUI = (name) => updateLocationText({ name, currentLang, getEl });

    const prayerHighlighter = createPrayerHighlighter();
    const highlightCard = prayerHighlighter.highlightCard;

    const dropdownManager = createDropdownManager({
        dropdownTypes,
        dropdownConfig,
        getEl,
        getNoResultsText: () => t('noResults'),
        onSelect: (type, id, name) => {
            locationController.handleSelect(type, id, name);
        }
    });

    locationController = createLocationController({
        apiBase: API_BASE,
        fetchJson,
        formatDateKey,
        getEl,
        prepareSearchIndex: dropdownManager.prepareSearchIndex,
        showMessage,
        t,
        toggleSettings,
        updateLocationUI,
        onPrayerDataReady: (data) => {
            prayerData = data;
            renderToday();
            setupNextPrayer();
        }
    });

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionCountdownController = createMotionCountdownController({
        getEl,
        reducedMotionQuery,
        getTargetTimeMs: () => targetTimeMs,
        getLastTimeMs: () => lastTimeMs,
        getRamadanState: () => ({ isRamadan, imsakTimeMs, aksamTimeMs }),
        checkDateRollover,
        setupNextPrayer,
        renderIcons
    });

    const filterDropdown = dropdownManager.filterDropdown;
    const selectItem = dropdownManager.selectItem;
    const toggleDropdown = dropdownManager.toggleDropdown;
    const saveLocation = () => locationController.saveLocation();

    function applyLanguageTexts() {
        const {
            selectedCountryData,
            selectedRegionData,
            selectedCityData
        } = locationController.getSelectedState();

        applyLanguageTextsToUi({
            currentLang,
            t,
            getEl,
            selectedCountryData,
            selectedRegionData,
            selectedCityData,
            hasSelectedCity: Boolean(localStorage.getItem('selectedCity'))
        });
    }

    function checkDateRollover() {
        const todayDateKey = formatDateKey(new Date());
        if (currentRenderedDate !== todayDateKey) {
            currentRenderedDate = todayDateKey;
            const city = locationController.getSavedLocation();
            if (city) {
                locationController.fetchPrayerTimes(city.id);
            }
        }
    }

    function renderToday() {
        const rendered = renderPrayerDay({
            prayerData,
            getDayContext,
            getEl,
            renderIcons,
            currentLang,
            prayers,
            hijriMonthMap
        });

        prayerHighlighter.reset();
        if (!rendered) return;
        renderedPrayerDayIndex = rendered.renderedPrayerDayIndex;
        renderedGregorianDayIndex = rendered.renderedGregorianDayIndex;
    }

    function setupNextPrayer() {
        if (!prayerData || prayerData.length === 0) return;

        const context = getDayContext(prayerData);

        if (
            context.prayerIndex !== renderedPrayerDayIndex ||
            context.calendarIndex !== renderedGregorianDayIndex
        ) {
            renderToday();
        }

        const nextPrayerState = computeNextPrayerState({
            prayerData,
            context,
            prayers,
            currentLang,
            tomorrowText: t('tomorrow')
        });

        isRamadan = nextPrayerState.isRamadan;
        imsakTimeMs = nextPrayerState.imsakTimeMs;
        aksamTimeMs = nextPrayerState.aksamTimeMs;

        highlightCard(nextPrayerState.currentPrayerId);

        if (nextPrayerState.nextTimeMs) {
            targetTimeMs = nextPrayerState.targetTimeMs;
            lastTimeMs = nextPrayerState.lastTimeMs;

            const titleFormat = t('timeUntil');
            const finalTitleText = titleFormat.replace('{prayer}', nextPrayerState.nextName);
            getEl('next-prayer-name').innerText = finalTitleText.toLocaleUpperCase(currentLang === 'tr' ? 'tr-TR' : 'en-US');

            const locale = currentLang === 'tr' ? 'tr-TR' : 'en-US';
            getEl('next-prayer-time').innerText = new Date(nextPrayerState.nextTimeMs).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
            motionCountdownController.startCountdown();
        }
    }

    function toggleLang() {
        currentLang = currentLang === 'tr' ? 'en' : 'tr';
        localStorage.setItem('appLang', currentLang);
        applyLanguageTexts();

        const city = locationController.getSavedLocation();
        if (city) {
            updateLocationUI(city.cityName);
        }

        if (prayerData) {
            renderToday();
            setupNextPrayer();
        }
    }

    function bindDomEvents() {
        document.addEventListener('visibilitychange', () => {
            motionCountdownController.updateMotionState();

            if (document.visibilityState === 'visible' && prayerData) {
                checkDateRollover();
                setupNextPrayer();
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#settings-modal .relative')) {
                dropdownManager.closeAllDropdowns();
            }
        });

        const settingsModal = getEl('settings-modal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    toggleSettings();
                }
            });
        }

        let resizeRafId = null;
        window.addEventListener('resize', () => {
            if (resizeRafId) return;

            resizeRafId = window.requestAnimationFrame(() => {
                resizeRafId = null;
                dropdownTypes.forEach((type) => {
                    const dropdown = getEl(`dropdown-${type}`);
                    if (dropdown && !dropdown.classList.contains('hidden')) {
                        dropdownManager.applyDropdownLayout(type);
                    }
                });
            });
        });
    }

    function bootstrapLocation() {
        const city = locationController.getSavedLocation();
        if (city) {
            updateLocationUI(city.cityName);
            locationController.fetchPrayerTimes(city.id);

            if (city.country && city.region && city.city) {
                locationController.setSelectedFromSaved(city);
                runNonCriticalTask(() => {
                    locationController.prefetchSavedHierarchy(city);
                });
            }
        } else {
            toggleSettings();
        }

        runNonCriticalTask(() => {
            locationController.loadCountries();
        });
    }

    function init() {
        renderIcons();

        document.addEventListener('DOMContentLoaded', () => {
            initTheme();
            applyLanguageTexts();
            motionCountdownController.setupHeroMotionObserver();
            motionCountdownController.updateMotionState();
            motionCountdownController.bindReducedMotionListener();
            bindDomEvents();
            bootstrapLocation();
        });
    }

    return {
        filterDropdown,
        init,
        saveLocation,
        selectItem,
        toggleDropdown,
        toggleLang,
        toggleSettings,
        toggleTheme
    };
}
