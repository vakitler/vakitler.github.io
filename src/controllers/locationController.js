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

    function normalizeName(s) {
        if (!s) return '';
        let str = s.toString().trim();
        str = str.replace(/İ/g, 'i').replace(/I/g, 'ı');
        str = str.toLowerCase();
        return str
            .replace(/ç/g, 'c')
            .replace(/ğ/g, 'g')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ş/g, 's')
            .replace(/ü/g, 'u')
            .replace(/[^a-z0-9]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
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

    function calculateDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    async function findNearestDistrictByCoords(lat, lon, regionName, countryName, cities) {
        if (!cities || cities.length === 0) return null;
        if (cities.length === 1) return cities[0];

        try {
            const results = await Promise.all(
                cities.map(async (cityItem) => {
                    try {
                        const q = encodeURIComponent(`${cityItem.IlceAdi}, ${regionName}, ${countryName}`);
                        const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`;
                        const res = await fetchJson(searchUrl, false);
                        if (res && res.length > 0 && res[0].lat && res[0].lon) {
                            const dist = calculateDistanceKm(lat, lon, parseFloat(res[0].lat), parseFloat(res[0].lon));
                            return { cityItem, dist };
                        }
                    } catch (e) {
                        console.warn('Geo search error for district:', cityItem.IlceAdi, e);
                    }
                    return null;
                })
            );

            const validResults = results.filter(Boolean);
            if (validResults.length === 0) return cities[0];

            validResults.sort((a, b) => a.dist - b.dist);
            return validResults[0].cityItem;
        } catch (err) {
            console.error('Error finding nearest district:', err);
            return cities[0];
        }
    }

    async function autoDetectLocation() {
        if (!navigator || !navigator.geolocation) {
            showMessage(t('errGeoUnavailable'));
            return;
        }

        showMessage(t('locDetecting'));

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                try {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=tr`;

                    let geo = null;
                    try {
                        geo = await fetchJson(url, false);
                    } catch (err) {
                        console.error('Reverse geocode failed', err);
                        showMessage(t('errGeoFailed'));
                        resolve(false);
                        return;
                    }

                    const address = (geo && geo.address) || {};
                    const countryCode = (address['country_code'] || '').toLowerCase();
                    const countryName = address.country || countryCode || '';

                    // Ensure countries are loaded
                    if (!countriesData || countriesData.length === 0) {
                        await loadCountries();
                    }

                    const normCountry = normalizeName(countryName);
                    let foundCountry = countriesData.find((c) => {
                        const normUlke = normalizeName(c.UlkeAdi);
                        return normUlke.includes(normCountry) || normCountry.includes(normUlke);
                    });

                    // Fallback for Turkey / TR
                    if (!foundCountry && (countryCode === 'tr' || normCountry.includes('turk'))) {
                        foundCountry = countriesData.find((c) => normalizeName(c.UlkeAdi).includes('turk')) || countriesData[0];
                    }

                    if (!foundCountry && countriesData.length > 0) {
                        foundCountry = countriesData[0];
                    }

                    if (!foundCountry) {
                        showMessage(t('errGeoNoMatch'));
                        resolve(false);
                        return;
                    }

                    const fullGeoText = normalizeName(
                        `${geo.display_name || ''} ${Object.values(address).join(' ')}`
                    );

                    // Load regions for found country
                    await loadRegions(foundCountry.UlkeID);

                    const IGNORED_GEO_TERMS = ['marmara', 'ege', 'akdeniz', 'karadeniz', 'anadolu', 'region', 'bolgesi'];

                    const regionCandidates = [
                        address.province,
                        address.state,
                        address.admin_level_4,
                        address.city,
                        address.county,
                        address.district,
                        address.state_district,
                        address.town
                    ].filter(Boolean).filter((cand) => {
                        const norm = normalizeName(cand);
                        return !IGNORED_GEO_TERMS.some((term) => norm.includes(term) && norm !== 'marmara ereglisi');
                    });

                    let foundRegion = null;

                    // Pass 1: Exact match against 81 provinces
                    for (const rCand of regionCandidates) {
                        const normRCand = normalizeName(rCand);
                        if (!normRCand) continue;
                        foundRegion = regionsData.find((r) => normalizeName(r.SehirAdi) === normRCand);
                        if (foundRegion) break;
                    }

                    // Pass 2: Partial match against filtered candidates
                    if (!foundRegion) {
                        for (const rCand of regionCandidates) {
                            const normRCand = normalizeName(rCand);
                            if (!normRCand) continue;
                            foundRegion = regionsData.find((r) => {
                                const normSehir = normalizeName(r.SehirAdi);
                                return normSehir.includes(normRCand) || normRCand.includes(normSehir);
                            });
                            if (foundRegion) break;
                        }
                    }

                    // Pass 3: Check fullGeoText against regionsData
                    if (!foundRegion) {
                        foundRegion = regionsData.find((r) => {
                            const normSehir = normalizeName(r.SehirAdi);
                            return normSehir && normSehir.length > 2 && fullGeoText.includes(normSehir);
                        });
                    }

                    if (!foundRegion && regionsData.length > 0) {
                        foundRegion = regionsData[0];
                    }

                    if (!foundRegion) {
                        showMessage(t('errGeoNoMatch'));
                        resolve(false);
                        return;
                    }

                    // Load cities/districts for found region
                    await loadCities(foundRegion.SehirID);

                    const normRegionName = normalizeName(foundRegion.SehirAdi);

                    const rawCandidates = [
                        address.town,
                        address.county,
                        address.district,
                        address.city_district,
                        address.municipality,
                        address.suburb,
                        address.village,
                        address.neighbourhood,
                        address.state_district,
                        address.city
                    ].filter(Boolean);

                    const districtCandidates = rawCandidates.filter((cand) => {
                        const norm = normalizeName(cand);
                        return norm !== normRegionName;
                    });

                    let foundCity = null;

                    // Pass 1: Exact match on district candidates (excluding generic region name)
                    for (const cand of districtCandidates) {
                        const normCand = normalizeName(cand);
                        if (!normCand) continue;
                        foundCity = citiesData.find((c) => normalizeName(c.IlceAdi) === normCand);
                        if (foundCity) break;
                    }

                    // Pass 2: Partial match on district candidates
                    if (!foundCity) {
                        for (const cand of districtCandidates) {
                            const normCand = normalizeName(cand);
                            if (!normCand) continue;
                            foundCity = citiesData.find((c) => {
                                const normIlce = normalizeName(c.IlceAdi);
                                return normIlce !== normRegionName && (normIlce.includes(normCand) || normCand.includes(normIlce));
                            });
                            if (foundCity) break;
                        }
                    }

                    // Pass 3: Check fullGeoText against citiesData (excluding generic region name)
                    if (!foundCity) {
                        foundCity = citiesData.find((c) => {
                            const normIlce = normalizeName(c.IlceAdi);
                            return normIlce && normIlce !== normRegionName && fullGeoText.includes(normIlce);
                        });
                    }

                    // Pass 4: Calculate geographic distance to district centers
                    if (!foundCity) {
                        const candidatesForDistance = citiesData.filter((c) => normalizeName(c.IlceAdi) !== normRegionName);
                        foundCity = await findNearestDistrictByCoords(
                            lat,
                            lon,
                            foundRegion.SehirAdi,
                            foundCountry.UlkeAdi,
                            candidatesForDistance.length > 0 ? candidatesForDistance : citiesData
                        );
                    }

                    // Pass 5: Fallback to region-named district or first item
                    if (!foundCity) {
                        foundCity = citiesData.find((c) => normalizeName(c.IlceAdi) === normRegionName) || citiesData[0];
                    }

                    if (!foundCity && citiesData.length > 0) {
                        foundCity = citiesData[0];
                    }

                    if (!foundCity) {
                        showMessage(t('errGeoNoMatch'));
                        resolve(false);
                        return;
                    }

                    // Set selected data
                    selectedCountryData = { id: foundCountry.UlkeID, name: foundCountry.UlkeAdi };
                    selectedRegionData = { id: foundRegion.SehirID, name: foundRegion.SehirAdi };
                    selectedCityData = { id: foundCity.IlceID, name: foundCity.IlceAdi };

                    getEl('text-country').innerText = selectedCountryData.name;
                    getEl('text-region').innerText = selectedRegionData.name;
                    getEl('text-city').innerText = selectedCityData.name;

                    // Save and fetch prayer times
                    await saveLocation();
                    resolve(true);
                } catch (err) {
                    console.error('Auto detect error', err);
                    showMessage(t('errGeoFailed'));
                    resolve(false);
                }
            }, (err) => {
                console.error('Geolocation error', err);
                showMessage(t('errGeoFailed'));
                resolve(false);
            }, { enableHighAccuracy: false, timeout: 10000 });
        });
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
        autoDetectLocation,
        setSelectedFromSaved
    };
}
