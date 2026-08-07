import { DISTRICT_COORDS } from '../constants/districtCoords';

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
        getEl('text-city').innerText = city.city.displayName || city.city.name;

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

    function getDistrictCoords(districtName, regionName) {
        const key = `${districtName}_${regionName}`;
        if (DISTRICT_COORDS[key]) return DISTRICT_COORDS[key];

        const normKey = normalizeName(key);
        for (const [k, coords] of Object.entries(DISTRICT_COORDS)) {
            if (normalizeName(k) === normKey) return coords;
        }
        return null;
    }

    async function getReverseGeocode(lat, lon) {
        // Try BigDataCloud API first (fast, reliable CORS-enabled client API)
        try {
            const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=tr`;
            const bdcRes = await fetchJson(bdcUrl, false);
            if (bdcRes && bdcRes.countryCode) {
                const adminNames = (bdcRes.localityInfo?.administrative || []).map((a) => a.name);
                return {
                    address: {
                        country: bdcRes.countryName,
                        country_code: bdcRes.countryCode,
                        province: bdcRes.principalSubdivision,
                        state: bdcRes.principalSubdivision,
                        city: bdcRes.city,
                        county: bdcRes.locality,
                        town: bdcRes.locality,
                        locality: bdcRes.locality,
                        admin_names: adminNames
                    },
                    display_name: [bdcRes.locality, bdcRes.city, bdcRes.principalSubdivision, bdcRes.countryName].filter(Boolean).join(', ')
                };
            }
        } catch (err) {
            console.warn('BigDataCloud reverse geocode failed, trying Nominatim fallback', err);
        }

        // Fallback to Nominatim API
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=tr`;
            const res = await fetchJson(url, false);
            if (res && res.address) {
                return res;
            }
        } catch (err) {
            console.warn('Nominatim reverse geocode failed', err);
        }

        return null;
    }

    function extractLocalDistrictName(address, regionName) {
        if (!address) return null;
        const normRegion = normalizeName(regionName);

        if (Array.isArray(address.admin_names)) {
            const candidate = address.admin_names.find((name) => {
                const norm = normalizeName(name);
                return norm &&
                       norm !== normRegion &&
                       !norm.includes('bolgesi') &&
                       !norm.includes('turkiye') &&
                       !norm.includes('turkey');
            });
            if (candidate) return candidate;
        }

        const candidate = [
            address.county,
            address.district,
            address.town,
            address.municipality,
            address.suburb,
            address.locality
        ].find((name) => {
            const norm = normalizeName(name);
            return norm && norm !== normRegion;
        });

        return candidate || null;
    }

    async function findNearestDistrictByCoords(lat, lon, regionName, countryName, cities) {
        if (!cities || cities.length === 0) return null;
        if (cities.length === 1) return cities[0];

        let minDistance = Infinity;
        let nearestCity = null;

        for (const cityItem of cities) {
            const coords = getDistrictCoords(cityItem.IlceAdi, regionName);
            if (coords) {
                const dist = calculateDistanceKm(lat, lon, coords[0], coords[1]);
                console.log(`📏 Distance to ${cityItem.IlceAdi}: ${dist.toFixed(2)} km`);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestCity = cityItem;
                }
            }
        }

        if (nearestCity) {
            console.log('📍 Geographically Nearest Listed District Selected:', nearestCity.IlceAdi, `(${minDistance.toFixed(2)} km away)`);
            return nearestCity;
        }

        return cities[0];
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

                    const geo = await getReverseGeocode(lat, lon);
                    console.log('📍 GPS Coords:', lat, lon);
                    console.log('🌐 Reverse Geocode Result:', geo);

                    if (!geo) {
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
                        `${geo.display_name || ''} ${Object.values(address).flat().join(' ')}`
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
                        address.town,
                        ...(address.admin_names || [])
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

                    console.log('🏙️ Matched Region:', foundRegion.SehirAdi, '(ID:', foundRegion.SehirID, ')');

                    // Load cities/districts for found region
                    await loadCities(foundRegion.SehirID);

                    console.log('📋 Available Diyanet Districts for Region:', citiesData.map((c) => c.IlceAdi));

                    const normRegionName = normalizeName(foundRegion.SehirAdi);
                    const detectedDistrictName = extractLocalDistrictName(address, foundRegion.SehirAdi);

                    const rawDistrictCandidates = [
                        address.county,
                        address.district,
                        address.town,
                        address.city_district,
                        address.municipality,
                        address.suburb,
                        address.village,
                        address.neighbourhood,
                        address.state_district,
                        address.locality,
                        ...(address.admin_names || [])
                    ].filter(Boolean);

                    console.log('🔍 District Candidates from Geocoder:', rawDistrictCandidates);
                    console.log('📍 Extracted Local District Name:', detectedDistrictName);

                    let foundCity = null;
                    let matchPass = '';

                    // Pass 1: Exact match of specific district candidates against citiesData (excluding generic region name)
                    for (const cand of rawDistrictCandidates) {
                        const normCand = normalizeName(cand);
                        if (!normCand || normCand === normRegionName) continue;
                        foundCity = citiesData.find((c) => normalizeName(c.IlceAdi) === normCand);
                        if (foundCity) {
                            matchPass = `Pass 1 Exact Match (candidate: "${cand}")`;
                            break;
                        }
                    }

                    // Pass 2: Partial match of district candidates (excluding generic region name to prioritize specific sub-districts)
                    if (!foundCity) {
                        for (const cand of rawDistrictCandidates) {
                            const normCand = normalizeName(cand);
                            if (!normCand || normCand === normRegionName) continue;
                            foundCity = citiesData.find((c) => {
                                const normIlce = normalizeName(c.IlceAdi);
                                return normIlce !== normRegionName && (normIlce.includes(normCand) || normCand.includes(normIlce));
                            });
                            if (foundCity) {
                                matchPass = `Pass 2 Partial Match (candidate: "${cand}")`;
                                break;
                            }
                        }
                    }

                    // Pass 3: Check fullGeoText against citiesData (excluding generic region name)
                    if (!foundCity) {
                        foundCity = citiesData.find((c) => {
                            const normIlce = normalizeName(c.IlceAdi);
                            return normIlce && normIlce !== normRegionName && fullGeoText.includes(normIlce);
                        });
                        if (foundCity) matchPass = 'Pass 3 FullGeoText Match';
                    }

                    // Pass 4: Geographically Nearest District (calculates distance in km to all listed districts)
                    if (!foundCity && citiesData.length > 1) {
                        foundCity = await findNearestDistrictByCoords(
                            lat,
                            lon,
                            foundRegion.SehirAdi,
                            foundCountry.UlkeAdi,
                            citiesData
                        );
                        if (foundCity) matchPass = 'Pass 4 Geographically Nearest District';
                    }

                    // Pass 5: Fallback to Central district (matching region name or "MERKEZ")
                    if (!foundCity) {
                        foundCity = citiesData.find((c) => normalizeName(c.IlceAdi) === normRegionName) ||
                                    citiesData.find((c) => normalizeName(c.IlceAdi).includes('merkez'));
                        if (foundCity) matchPass = 'Pass 5 Central/Merkez Fallback';
                    }

                    // Pass 6: Fallback to first item in citiesData
                    if (!foundCity && citiesData.length > 0) {
                        foundCity = citiesData[0];
                        matchPass = 'Pass 6 First District Fallback';
                    }

                    console.log('✅ Final Selected District:', foundCity ? foundCity.IlceAdi : 'NONE', '| Strategy:', matchPass);

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

        const cityName = (normalizeName(selectedRegionData.name) === normalizeName(selectedCityData.name))
            ? selectedRegionData.name
            : `${selectedRegionData.name}, ${selectedCityData.name}`;

        const cityData = {
            id: selectedCityData.id,
            cityName,
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
