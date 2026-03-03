export function createLocationController({
    apiBase,
    fetchJson,
    formatDateKey,
    getEl,
    prepareSearchIndex,
    showMessage,
    t,
    toggleSettings,
    updateLocationUI,
    onPrayerDataReady
}) {
    let countriesData = [];
    let regionsData = [];
    let citiesData = [];

    let selectedCountryData = null;
    let selectedRegionData = null;
    let selectedCityData = null;

    function getSavedLocation() {
        const savedLocation = localStorage.getItem('selectedCity');
        if (!savedLocation) return null;

        try {
            const parsed = JSON.parse(savedLocation);
            if (!parsed || typeof parsed !== 'object' || !parsed.id || !parsed.cityName) {
                localStorage.removeItem('selectedCity');
                return null;
            }
            return parsed;
        } catch (err) {
            console.error('Kaydedilen konum verisi bozuk:', err);
            localStorage.removeItem('selectedCity');
            return null;
        }
    }

    function getSelectedState() {
        return {
            selectedCountryData,
            selectedRegionData,
            selectedCityData
        };
    }

    function getCountriesData() {
        return countriesData;
    }

    function getRegionsData() {
        return regionsData;
    }

    function getCitiesData() {
        return citiesData;
    }

    function setSelectedFromSaved(city) {
        if (!city?.country || !city?.region || !city?.city) return;

        selectedCountryData = city.country;
        selectedRegionData = city.region;
        selectedCityData = city.city;

        getEl('text-country').innerText = city.country.name;
        getEl('text-region').innerText = city.region.name;
        getEl('text-city').innerText = city.city.name;

        getEl('btn-region').disabled = false;
        getEl('btn-city').disabled = false;
    }

    function prefetchSavedHierarchy(city) {
        if (!city?.country?.id || !city?.region?.id) return;

        fetchJson(`${apiBase}/sehirler/${city.country.id}`).then((data) => {
            regionsData = data;
            prepareSearchIndex(regionsData, 'SehirAdi');
        }).catch((err) => console.log(err));

        fetchJson(`${apiBase}/ilceler/${city.region.id}`).then((data) => {
            citiesData = data;
            prepareSearchIndex(citiesData, 'IlceAdi');
        }).catch((err) => console.log(err));
    }

    async function loadCountries() {
        try {
            countriesData = await fetchJson(`${apiBase}/ulkeler`);
            prepareSearchIndex(countriesData, 'UlkeAdi');

            getEl('btn-country').disabled = false;
            if (!selectedCountryData) {
                getEl('text-country').innerText = t('selectCountry');
            }
        } catch (err) {
            showMessage(t('errLoadCountries'));
            console.error(err);
        }
    }

    async function loadRegions(countryId) {
        selectedRegionData = null;
        selectedCityData = null;

        const btnRegion = getEl('btn-region');
        const btnCity = getEl('btn-city');

        btnRegion.disabled = true;
        btnCity.disabled = true;
        getEl('text-region').innerText = t('loading');
        getEl('text-city').innerText = t('selectCityFirst');

        try {
            regionsData = await fetchJson(`${apiBase}/sehirler/${countryId}`);
            prepareSearchIndex(regionsData, 'SehirAdi');

            btnRegion.disabled = false;
            getEl('text-region').innerText = t('selectCity');
        } catch (err) {
            showMessage(t('errLoadRegions'));
            console.error(err);
        }
    }

    async function loadCities(regionId) {
        selectedCityData = null;

        const btnCity = getEl('btn-city');
        btnCity.disabled = true;
        getEl('text-city').innerText = t('loading');

        try {
            citiesData = await fetchJson(`${apiBase}/ilceler/${regionId}`);
            prepareSearchIndex(citiesData, 'IlceAdi');

            btnCity.disabled = false;
            getEl('text-city').innerText = t('selectDistrict');
        } catch (err) {
            showMessage(t('errLoadCities'));
            console.error(err);
        }
    }

    function handleSelect(type, id, name) {
        if (type === 'country') {
            selectedCountryData = { id, name };
            loadRegions(id);
            return;
        }

        if (type === 'region') {
            selectedRegionData = { id, name };
            loadCities(id);
            return;
        }

        if (type === 'city') {
            selectedCityData = { id, name };
        }
    }

    async function saveLocation() {
        if (!selectedCityData || !selectedRegionData || !selectedCountryData) {
            showMessage(t('errSelectDistrict'));
            return;
        }

        const cityData = {
            id: selectedCityData.id,
            cityName: `${selectedRegionData.name}, ${selectedCityData.name}`,
            country: selectedCountryData,
            region: selectedRegionData,
            city: selectedCityData
        };

        localStorage.setItem('selectedCity', JSON.stringify(cityData));
        updateLocationUI(cityData.cityName);
        toggleSettings();
        await fetchPrayerTimes(cityData.id);
    }

    async function fetchPrayerTimes(cityId) {
        const cacheKey = `prayerTimes_${cityId}`;
        const cachedData = localStorage.getItem(cacheKey);
        const formattedToday = formatDateKey(new Date());

        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const todayIndex = parsedData.findIndex((d) => d.MiladiTarihKisa === formattedToday);

            if (todayIndex !== -1) {
                onPrayerDataReady(parsedData.slice(todayIndex));
                return;
            }
        }

        try {
            const data = await fetchJson(`${apiBase}/vakitler/${cityId}`, false);
            localStorage.setItem(cacheKey, JSON.stringify(data));

            const todayIndex = data.findIndex((d) => d.MiladiTarihKisa === formattedToday);
            onPrayerDataReady(todayIndex !== -1 ? data.slice(todayIndex) : data);
        } catch (err) {
            showMessage(t('errFetchTimes'));
            console.error(err);
        }
    }

    return {
        fetchPrayerTimes,
        getCitiesData,
        getCountriesData,
        getRegionsData,
        getSavedLocation,
        getSelectedState,
        handleSelect,
        loadCountries,
        prefetchSavedHierarchy,
        saveLocation,
        setSelectedFromSaved
    };
}
