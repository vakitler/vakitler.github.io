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
    if (monthlyTitle) monthlyTitle.innerText = t('monthlyTableTitle');

    const printMonthlyTitle = getEl('print-monthly-title');
    if (printMonthlyTitle) printMonthlyTitle.innerText = t('monthlyTableTitle');

    const printHeaderTitle = getEl('print-header-title');
    if (printHeaderTitle) printHeaderTitle.innerText = t('printHeaderTitle');

    const btnPrintText = getEl('btn-print-text');
    if (btnPrintText) btnPrintText.innerText = t('printPdf');

    const religiousTitle = getEl('religious-title');
    if (religiousTitle) religiousTitle.innerText = t('religiousModalTitle');

    const thDate = getEl('th-date');
    if (thDate) thDate.innerText = t('tableDate');
    const thImsak = getEl('th-imsak');
    if (thImsak) thImsak.innerText = t('imsak');
    const thGunes = getEl('th-gunes');
    if (thGunes) thGunes.innerText = t('gunes');
    const thOgle = getEl('th-ogle');
    if (thOgle) thOgle.innerText = t('ogle');
    const thIkindi = getEl('th-ikindi');
    if (thIkindi) thIkindi.innerText = t('ikindi');
    const thAksam = getEl('th-aksam');
    if (thAksam) thAksam.innerText = t('aksam');
    const thYatsi = getEl('th-yatsi');
    if (thYatsi) thYatsi.innerText = t('yatsi');

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
