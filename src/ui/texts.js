export function applyLanguageTexts({
    currentLang,
    t,
    getEl,
    selectedCountryData,
    selectedRegionData,
    selectedCityData,
    hasSelectedCity
}) {
    const langTextEl = getEl('lang-text');
    const appTitleEl = getEl('app-title');
    const nextPrayerNameEl = getEl('next-prayer-name');
    const qiblaLabelEl = getEl('qibla-label');
    const settingsTitleEl = getEl('settings-title');
    const labelCountryEl = getEl('label-country');
    const labelRegionEl = getEl('label-region');
    const labelCityEl = getEl('label-city');
    const saveLocationEl = getEl('btn-save-location');
    const autoLocateEl = getEl('btn-auto-locate');
    const searchCountryEl = getEl('search-country');
    const searchRegionEl = getEl('search-region');
    const searchCityEl = getEl('search-city');
    const buyCoffeeTitleEl = getEl('buy-coffee-title');
    const buyCoffeeDescEl = getEl('buy-coffee-desc');

    langTextEl.innerText = currentLang === 'tr' ? 'EN' : 'TR';
    appTitleEl.innerText = t('appTitle');
    nextPrayerNameEl.innerText = t('nextPrayer');
    qiblaLabelEl.innerText = t('qiblaTime');
    settingsTitleEl.innerText = t('settingsTitle');
    labelCountryEl.innerText = t('country');
    labelRegionEl.innerText = t('city');
    labelCityEl.innerText = t('district');
    saveLocationEl.innerText = t('saveLocation');
    if (autoLocateEl) autoLocateEl.innerText = t('autoLocate') || 'Konumu Otomatik Bul';

    searchCountryEl.placeholder = t('searchCountry');
    searchRegionEl.placeholder = t('searchCity');
    searchCityEl.placeholder = t('searchDistrict');
    buyCoffeeTitleEl.innerText = t('supportTitle');
    buyCoffeeDescEl.innerText = t('buyCoffee');

    const iftarTitle = getEl('iftar-title');
    if (iftarTitle) iftarTitle.innerText = t('timeToIftar');

    const btnMonthlyText = getEl('btn-monthly-text');
    if (btnMonthlyText) btnMonthlyText.innerText = t('monthlyTimes');

    const btnReligiousText = getEl('btn-religious-text');
    if (btnReligiousText) btnReligiousText.innerText = t('religiousDays');

    const monthlyTitle = getEl('monthly-title');
    if (monthlyTitle) monthlyTitle.innerText = t('monthlyTimes');

    const btnPrintText = getEl('btn-print-text');
    if (btnPrintText) btnPrintText.innerText = t('printPdf');

    const religiousTitle = getEl('religious-title');
    if (religiousTitle) religiousTitle.innerText = t('religiousDays');

    if (!selectedCountryData) {
        getEl('text-country').innerText = getEl('btn-country').disabled ? t('loading') : t('selectCountry');
    }
    if (!selectedRegionData) {
        getEl('text-region').innerText = getEl('btn-region').disabled ? t('selectCountryFirst') : t('selectCity');
    }
    if (!selectedCityData) {
        getEl('text-city').innerText = getEl('btn-city').disabled ? t('selectCityFirst') : t('selectDistrict');
    }

    if (!hasSelectedCity) {
        getEl('loc-not-selected').innerText = t('locNotSelected');
    }
}

export function updateLocationText({ name, currentLang, getEl }) {
    let displayName = name;
    if (currentLang === 'en') {
        const trMap = { 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c', 'İ': 'I', 'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'Ö': 'O', 'Ç': 'C' };
        displayName = name.replace(/[ığüşöçİĞÜŞÖÇ]/g, (match) => trMap[match]);
    }
    getEl('loc-not-selected').innerText = displayName;
}
