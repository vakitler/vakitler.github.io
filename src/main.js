import './style.css';
import {
    createIcons,
    Moon,
    MapPin,
    Settings,
    Clock,
    Utensils,
    Coffee,
    ExternalLink,
    X,
    ChevronDown,
    Search,
    Sun,
    Compass,
    Sunrise,
    CloudSun,
    Sunset,
    Stars
} from 'lucide';

const usedIcons = {
    Moon,
    MapPin,
    Settings,
    Clock,
    Utensils,
    Coffee,
    ExternalLink,
    X,
    ChevronDown,
    Search,
    Sun,
    Compass,
    Sunrise,
    CloudSun,
    Sunset,
    Stars
};

function renderIcons() {
    createIcons({ icons: usedIcons });
}

function registerServiceWorker() {
            if (!('serviceWorker' in navigator)) {
                return;
            }

            const isLocalhost =
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname === '[::1]';

            if (isLocalhost) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => registration.unregister());
                }).catch((err) => {
                    console.warn('Service worker kayıt temizleme hatası:', err);
                });

                if ('caches' in window) {
                    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch((err) => {
                        console.warn('Cache temizleme hatası:', err);
                    });
                }
                return;
            }

            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch((err) => {
                    console.error('Service worker kayıt hatası:', err);
                });
            });
        }
        registerServiceWorker();

        const API_BASE = "https://ezanvakti.emushaf.net";
        let prayerData = null;
        let timerInterval = null;
        let targetTimeMs = null; 
        let lastTimeMs = null;
        let currentLang = localStorage.getItem('appLang') || 'tr';
        
        let imsakTimeMs = null;
        let aksamTimeMs = null;
        let isRamadan = false;
        let currentRenderedDate = new Date().getDate();
        let lastFocusedElement = null;
        let scrollYBeforeModal = 0;
        let heroInViewport = true;
        let countdownPausedByState = false;

        const i18n = {
            tr: {
                appTitle: 'Vakitler',
                locNotSelected: 'Konum Seçilmedi',
                nextPrayer: 'Vakit Hesaplanıyor...',
                timeUntil: '{prayer} Vaktine Kalan',
                qiblaTime: 'Kıble Saati',
                settingsTitle: 'Konum Ayarları',
                country: 'Ülke',
                city: 'Şehir',
                district: 'İlçe',
                loading: 'Yükleniyor...',
                selectCountry: 'Ülke Seçin',
                selectCountryFirst: 'Önce Ülke Seçin',
                selectCity: 'Şehir Seçin',
                selectCityFirst: 'Önce Şehir Seçin',
                selectDistrict: 'İlçe Seçin',
                searchCountry: 'Ülke ara...',
                searchCity: 'Şehir ara...',
                searchDistrict: 'İlçe ara...',
                saveLocation: 'Konumu Kaydet',
                noResults: 'Sonuç bulunamadı',
                errSelectDistrict: 'Lütfen bir ilçe seçin',
                errFetchTimes: 'Vakitler alınamadı, internet bağlantınızı kontrol edin.',
                errLoadCountries: 'Ülkeler yüklenemedi',
                errLoadRegions: 'Şehirler yüklenemedi',
                errLoadCities: 'İlçeler yüklenemedi',
                tomorrow: 'Yarın',
                supportTitle: 'Destek Ol',
                buyCoffee: 'Bana bir kahve ısmarla',
                timeToIftar: 'İftara Kalan Süre'
            },
            en: {
                appTitle: 'Prayer Times',
                locNotSelected: 'Location Not Selected',
                nextPrayer: 'Calculating...',
                timeUntil: 'Time until {prayer}',
                qiblaTime: 'Qibla Time',
                settingsTitle: 'Location Settings',
                country: 'Country',
                city: 'City',
                district: 'District',
                loading: 'Loading...',
                selectCountry: 'Select Country',
                selectCountryFirst: 'Select Country First',
                selectCity: 'Select City',
                selectCityFirst: 'Select City First',
                selectDistrict: 'Select District',
                searchCountry: 'Search country...',
                searchCity: 'Search city...',
                searchDistrict: 'Search district...',
                saveLocation: 'Save Location',
                noResults: 'No results found',
                errSelectDistrict: 'Please select a district',
                errFetchTimes: 'Could not fetch times, check your connection.',
                errLoadCountries: 'Could not load countries',
                errLoadRegions: 'Could not load cities',
                errLoadCities: 'Could not load districts',
                tomorrow: 'Tomorrow',
                supportTitle: 'Support Me',
                buyCoffee: 'Buy me a coffee',
                timeToIftar: 'Time to Iftar'
            }
        };

        const t = (key) => i18n[currentLang][key];

        let countriesData = [];
        let regionsData = [];
        let citiesData = [];
        
        let selectedCountryData = null;
        let selectedRegionData = null;
        let selectedCityData = null;

        const prayers = [
            { id: 'Imsak', label: { tr: 'İmsak', en: 'Fajr' }, icon: 'sunrise' },
            { id: 'Gunes', label: { tr: 'Güneş', en: 'Sunrise' }, icon: 'sun' },
            { id: 'Ogle', label: { tr: 'Öğle', en: 'Dhuhr' }, icon: 'cloud-sun' },
            { id: 'Ikindi', label: { tr: 'İkindi', en: 'Asr' }, icon: 'sunset' },
            { id: 'Aksam', label: { tr: 'Akşam', en: 'Maghrib' }, icon: 'moon' },
            { id: 'Yatsi', label: { tr: 'Yatsı', en: 'Isha' }, icon: 'stars' }
        ];

        renderIcons();

        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        function stopCountdownLoop() {
            if (timerInterval) {
                clearTimeout(timerInterval);
                timerInterval = null;
            }
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

            if (countdownPausedByState && targetTimeMs) {
                countdownPausedByState = false;
                startCountdown();
            }
        }

        function setupHeroMotionObserver() {
            const heroSection = document.getElementById('hero-section');
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

        document.addEventListener('DOMContentLoaded', async () => {
            initTheme();

            applyLanguageTexts(); 
            setupHeroMotionObserver();
            updateMotionState();

            if (typeof reducedMotionQuery.addEventListener === 'function') {
                reducedMotionQuery.addEventListener('change', updateMotionState);
            } else if (typeof reducedMotionQuery.addListener === 'function') {
                reducedMotionQuery.addListener(updateMotionState);
            }

            document.addEventListener("visibilitychange", () => {
                updateMotionState();

                if (document.visibilityState !== "visible") {
                    if (timerInterval) {
                        stopCountdownLoop();
                        countdownPausedByState = true;
                    }
                    return;
                }

                if (document.visibilityState === "visible") {
                    if (prayerData) {
                        checkDateRollover();
                        setupNextPrayer();
                    }
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#settings-modal .relative')) {
                    ['country', 'region', 'city'].forEach(t => {
                        const dd = document.getElementById(`dropdown-${t}`);
                        const icon = document.getElementById(`icon-${t}`);
                        const list = document.getElementById(`list-${t}`);
                        if(dd && !dd.classList.contains('hidden')) {
                            dd.classList.add('hidden');
                            dd.classList.remove('dropdown-open-up');
                            if (list) list.style.maxHeight = '';
                            if(icon) icon.classList.remove('rotate-180');
                        }
                    });
                }
            });

            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) {
                settingsModal.addEventListener('click', (e) => {
                    if (e.target === settingsModal) {
                        toggleSettings();
                    }
                });
            }

            window.addEventListener('resize', () => {
                ['country', 'region', 'city'].forEach((type) => {
                    const dropdown = document.getElementById(`dropdown-${type}`);
                    if (dropdown && !dropdown.classList.contains('hidden')) {
                        applyDropdownLayout(type);
                    }
                });
            });

            const city = getSavedLocation();
            if (city) {
                updateLocationUI(city.cityName);
                fetchPrayerTimes(city.id);
                
                if (city.country && city.region && city.city) {
                    selectedCountryData = city.country;
                    selectedRegionData = city.region;
                    selectedCityData = city.city;
                    
                    document.getElementById('text-country').innerText = city.country.name;
                    document.getElementById('text-region').innerText = city.region.name;
                    document.getElementById('text-city').innerText = city.city.name;
                    
                    document.getElementById('btn-region').disabled = false;
                    document.getElementById('btn-city').disabled = false;
                    
                    fetch(`${API_BASE}/sehirler/${city.country.id}`).then(r => r.json()).then(d => { regionsData = d; }).catch(e=>console.log(e));
                    fetch(`${API_BASE}/ilceler/${city.region.id}`).then(r => r.json()).then(d => { citiesData = d; }).catch(e=>console.log(e));
                }
            } else {
                toggleSettings();
            }
            
            loadCountries();
        });
        
        function checkDateRollover() {
            const todayDate = new Date().getDate();
            if (currentRenderedDate !== todayDate) {
                currentRenderedDate = todayDate;
                const city = getSavedLocation();
                if (city) {
                    fetchPrayerTimes(city.id); 
                }
            }
        }

        function toggleLang() {
            currentLang = currentLang === 'tr' ? 'en' : 'tr';
            localStorage.setItem('appLang', currentLang);
            applyLanguageTexts();
            
            const city = getSavedLocation();
            if (city) {
                updateLocationUI(city.cityName);
            }

            if (prayerData) {
                renderToday();
                setupNextPrayer();
            }
        }

        function applyLanguageTexts() {
            document.getElementById('lang-text').innerText = currentLang === 'tr' ? 'EN' : 'TR';
            document.getElementById('app-title').innerText = t('appTitle');
            document.getElementById('next-prayer-name').innerText = t('nextPrayer');
            document.getElementById('qibla-label').innerText = t('qiblaTime');
            document.getElementById('settings-title').innerText = t('settingsTitle');
            document.getElementById('label-country').innerText = t('country');
            document.getElementById('label-region').innerText = t('city');
            document.getElementById('label-city').innerText = t('district');
            document.getElementById('btn-save-location').innerText = t('saveLocation');
            
            document.getElementById('search-country').placeholder = t('searchCountry');
            document.getElementById('search-region').placeholder = t('searchCity');
            document.getElementById('search-city').placeholder = t('searchDistrict');
            document.getElementById('buy-coffee-title').innerText = t('supportTitle');
            document.getElementById('buy-coffee-desc').innerText = t('buyCoffee');
            
            const iftarTitle = document.getElementById('iftar-title');
            if (iftarTitle) iftarTitle.innerText = t('timeToIftar');

            if (!selectedCountryData) {
                document.getElementById('text-country').innerText = document.getElementById('btn-country').disabled ? t('loading') : t('selectCountry');
            }
            if (!selectedRegionData) {
                document.getElementById('text-region').innerText = document.getElementById('btn-region').disabled ? t('selectCountryFirst') : t('selectCity');
            }
            if (!selectedCityData) {
                document.getElementById('text-city').innerText = document.getElementById('btn-city').disabled ? t('selectCityFirst') : t('selectDistrict');
            }

            if (!localStorage.getItem('selectedCity')) {
                document.getElementById('loc-not-selected').innerText = t('locNotSelected');
            }
        }

        function toggleDropdown(type) {
            ['country', 'region', 'city'].forEach(t => {
                if(t !== type) {
                    const dd = document.getElementById(`dropdown-${t}`);
                    dd.classList.add('hidden');
                    dd.classList.remove('dropdown-open-up');
                    document.getElementById(`icon-${t}`).classList.remove('rotate-180');
                    const list = document.getElementById(`list-${t}`);
                    if (list) list.style.maxHeight = '';
                }
            });

            const btn = document.getElementById(`btn-${type}`);
            if (btn.disabled) return;

            const dropdown = document.getElementById(`dropdown-${type}`);
            const icon = document.getElementById(`icon-${type}`);
            const search = document.getElementById(`search-${type}`);

            dropdown.classList.toggle('hidden');
            icon.classList.toggle('rotate-180');
            
            if(!dropdown.classList.contains('hidden')) {
                search.value = '';
                if(type === 'country') renderList('country', countriesData, 'UlkeID', 'UlkeAdi');
                if(type === 'region') renderList('region', regionsData, 'SehirID', 'SehirAdi');
                if(type === 'city') renderList('city', citiesData, 'IlceID', 'IlceAdi');
                applyDropdownLayout(type);
                
                setTimeout(() => search.focus(), 100);
            } else {
                dropdown.classList.remove('dropdown-open-up');
                const list = document.getElementById(`list-${type}`);
                if (list) list.style.maxHeight = '';
            }
        }

        function applyDropdownLayout(type) {
            const btn = document.getElementById(`btn-${type}`);
            const dropdown = document.getElementById(`dropdown-${type}`);
            const list = document.getElementById(`list-${type}`);
            if (!btn || !dropdown || !list) return;

            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const rect = btn.getBoundingClientRect();
            const safeGap = 12;
            const dropdownFixedPart = 88;
            const minListHeight = 140;
            const preferredMinBelow = 220;
            const maxListHeight = 420;

            const availableBelow = Math.max(minListHeight, Math.floor(viewportHeight - rect.bottom - safeGap - dropdownFixedPart));
            const availableAbove = Math.max(minListHeight, Math.floor(rect.top - safeGap - dropdownFixedPart));

            const openUp = availableAbove > availableBelow && availableBelow < preferredMinBelow;
            dropdown.classList.toggle('dropdown-open-up', openUp);

            const computedListHeight = Math.min(openUp ? availableAbove : availableBelow, maxListHeight);
            list.style.maxHeight = `${computedListHeight}px`;
        }

        function renderList(type, data, idKey, nameKey, filterQuery = "") {
            const list = document.getElementById(`list-${type}`);
            const lowerQuery = filterQuery.toLocaleLowerCase('tr-TR');
            
            const filtered = data.filter(item => 
                item[nameKey].toLocaleLowerCase('tr-TR').includes(lowerQuery)
            );

            if (filtered.length === 0) {
                list.innerHTML = `<li class="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">${t('noResults')}</li>`;
                return;
            }

            list.innerHTML = filtered.map(item => `
                <li>
                    <button type="button" onclick="selectItem('${type}', '${item[idKey]}', '${item[nameKey].replace(/'/g, "\\'")}')" class="w-full text-left px-4 py-3 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors truncate">
                        ${item[nameKey]}
                    </button>
                </li>
            `).join('');
        }

        function filterDropdown(type, query) {
            if (type === 'country') {
                renderList('country', countriesData, 'UlkeID', 'UlkeAdi', query);
                return;
            }

            if (type === 'region') {
                renderList('region', regionsData, 'SehirID', 'SehirAdi', query);
                return;
            }

            if (type === 'city') {
                renderList('city', citiesData, 'IlceID', 'IlceAdi', query);
            }
        }

        function selectItem(type, id, name) {
            document.getElementById(`text-${type}`).innerText = name;
            const dropdown = document.getElementById(`dropdown-${type}`);
            dropdown.classList.add('hidden');
            dropdown.classList.remove('dropdown-open-up');
            const list = document.getElementById(`list-${type}`);
            if (list) list.style.maxHeight = '';
            document.getElementById(`icon-${type}`).classList.remove('rotate-180');

            if(type === 'country') {
                selectedCountryData = {id, name};
                loadRegions(id);
            } else if(type === 'region') {
                selectedRegionData = {id, name};
                loadCities(id);
            } else if(type === 'city') {
                selectedCityData = {id, name};
            }
        }

        async function loadCountries() {
            try {
                const res = await fetch(`${API_BASE}/ulkeler`);
                countriesData = await res.json();
                
                document.getElementById('btn-country').disabled = false;
                if (!selectedCountryData) {
                    document.getElementById('text-country').innerText = t('selectCountry');
                }
            } catch (err) { showMessage(t('errLoadCountries')); console.error(err); }
        }

        async function loadRegions(countryId) {
            selectedRegionData = null;
            selectedCityData = null;

            const btnRegion = document.getElementById('btn-region');
            const btnCity = document.getElementById('btn-city');
            
            btnRegion.disabled = true;
            btnCity.disabled = true;
            document.getElementById('text-region').innerText = t('loading');
            document.getElementById('text-city').innerText = t('selectCityFirst');

            try {
                const res = await fetch(`${API_BASE}/sehirler/${countryId}`);
                regionsData = await res.json();
                
                btnRegion.disabled = false;
                document.getElementById('text-region').innerText = t('selectCity');
            } catch (err) { showMessage(t('errLoadRegions')); console.error(err); }
        }

        async function loadCities(regionId) {
            selectedCityData = null;
            
            const btnCity = document.getElementById('btn-city');
            btnCity.disabled = true;
            document.getElementById('text-city').innerText = t('loading');

            try {
                const res = await fetch(`${API_BASE}/ilceler/${regionId}`);
                citiesData = await res.json();
                
                btnCity.disabled = false;
                document.getElementById('text-city').innerText = t('selectDistrict');
            } catch (err) { showMessage(t('errLoadCities')); console.error(err); }
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

            const todayObj = new Date();
            const formattedToday = `${String(todayObj.getDate()).padStart(2,'0')}.${String(todayObj.getMonth()+1).padStart(2,'0')}.${todayObj.getFullYear()}`;

            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                const todayIndex = parsedData.findIndex(d => d.MiladiTarihKisa === formattedToday);
                
                if (todayIndex !== -1) {
                    prayerData = parsedData.slice(todayIndex);
                    renderToday();
                    setupNextPrayer();
                    return;
                }
            }

            try {
                const res = await fetch(`${API_BASE}/vakitler/${cityId}`);
                const data = await res.json();
                localStorage.setItem(cacheKey, JSON.stringify(data)); 
                
                const todayIndex = data.findIndex(d => d.MiladiTarihKisa === formattedToday);
                prayerData = todayIndex !== -1 ? data.slice(todayIndex) : data;

                renderToday();
                setupNextPrayer();
            } catch (err) {
                showMessage(t('errFetchTimes'));
                console.error(err);
            }
        }

        function renderToday() {
            if (!prayerData || prayerData.length === 0) return;
            
            const today = prayerData[0]; 
            const container = document.getElementById('daily-times-container');
            container.innerHTML = '';

            const [d, m, y] = today.MiladiTarihKisa.split('.');
            const dateObj = new Date(y, parseInt(m) - 1, d);
            const gregorianStr = dateObj.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });
            document.getElementById('gregorian-date').innerText = gregorianStr;

            const hijriMonths = {
                'Muharrem': 'Muharram', 'Safer': 'Safar', 'Rebiülevvel': 'Rabi al-Awwal', 'Rebiülahir': 'Rabi al-Thani', 
                'Cemaziyelevvel': 'Jumada al-Awwal', 'Cemaziyelahir': 'Jumada al-Thani', 'Recep': 'Rajab', 
                'Şaban': 'Sha\'ban', 'Ramazan': 'Ramadan', 'Şevval': 'Shawwal', 'Zilkade': 'Dhu al-Qi\'dah', 'Zilhicce': 'Dhu al-Hijjah'
            };
            let hijriStr = today.HicriTarihUzun;
            if (currentLang === 'en') {
                for (const [tr, en] of Object.entries(hijriMonths)) {
                    if (hijriStr.includes(tr)) {
                        hijriStr = hijriStr.replace(tr, en);
                        break;
                    }
                }
            }
            document.getElementById('hijri-date').innerText = hijriStr;

            const moonImg = document.getElementById('moon-phase');
            if (today.AyinSekliURL && today.AyinSekliURL.trim() !== '') {
                const secureUrl = today.AyinSekliURL.replace(/^http:\/\//i, 'https://');
                moonImg.onload = () => moonImg.classList.remove('hidden');
                moonImg.onerror = () => moonImg.classList.add('hidden');
                moonImg.src = secureUrl;
            } else {
                moonImg.classList.add('hidden');
            }
            
            const qiblaEl = document.getElementById('qibla-time');
            if (qiblaEl && today.KibleSaati) {
                qiblaEl.innerHTML = `<i data-lucide="compass" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400"></i> ${today.KibleSaati}`;
            }

            const isFriday = dateObj.getDay() === 5; 

            prayers.forEach(prayer => {
                const timeStr = today[prayer.id];
                
                let pLabel = prayer.label[currentLang];
                if (prayer.id === 'Ogle' && isFriday) {
                    pLabel = currentLang === 'tr' ? 'Cuma' : "Jumu'ah";
                }

                const card = document.createElement('div');
                card.className = `m3-card p-4 sm:p-6 flex flex-col items-center justify-center gap-2 sm:gap-3 border-2 border-transparent transition-all duration-500 hover:-translate-y-1 cursor-default w-full`;
                card.id = `card-${prayer.id}`;
                card.innerHTML = `
                    <div class="p-2 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 transition-colors">
                        <i data-lucide="${prayer.icon}" class="w-5 h-5 sm:w-6 sm:h-6 opacity-80"></i>
                    </div>
                    <span class="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center truncate w-full">${pLabel}</span>
                    <span class="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 time-display tracking-tight">${timeStr}</span>
                `;
                container.appendChild(card);
            });
            renderIcons();
        }

        function setupNextPrayer() {
            if (!prayerData || prayerData.length === 0) return;

            const now = new Date();
            const formattedToday = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;
            const todayIndex = prayerData.findIndex(d => d.MiladiTarihKisa === formattedToday);
            const normalizedTodayIndex = todayIndex === -1 ? 0 : todayIndex;
            const today = prayerData[normalizedTodayIndex] || prayerData[0];
            const tomorrow = prayerData[normalizedTodayIndex + 1];

            isRamadan = today.HicriTarihUzun.includes('Ramazan') || today.HicriTarihUzun.includes('Ramadan');
            
            const [ih, im] = today.Imsak.split(':');
            const iDate = new Date();
            iDate.setHours(parseInt(ih), parseInt(im), 0, 0);
            imsakTimeMs = iDate.getTime();

            const [ah, am] = today.Aksam.split(':');
            const aDate = new Date();
            aDate.setHours(parseInt(ah), parseInt(am), 0, 0);
            aksamTimeMs = aDate.getTime();
            
            let nextDateObj = null;
            let lastDateObj = null;
            let nextName = "";
            let nextIndex = -1;
            let currentPrayerId = 'Yatsi'; 

            for (let i = 0; i < prayers.length; i++) {
                const p = prayers[i];
                const [h, m] = today[p.id].split(':');
                const pTime = new Date();
                pTime.setHours(parseInt(h), parseInt(m), 0, 0); 
                
                if (pTime > now) {
                    nextDateObj = pTime;
                    
                    let pLabel = p.label[currentLang];
                    if (p.id === 'Ogle' && pTime.getDay() === 5) {
                        pLabel = currentLang === 'tr' ? 'Cuma' : "Jumu'ah";
                    }
                    
                    nextName = pLabel;
                    nextIndex = i;
                    
                    if (i > 0) {
                        currentPrayerId = prayers[i - 1].id; 
                    }
                    break;
                }
            }

            if (!nextDateObj && tomorrow) {
                const [h, m] = tomorrow.Imsak.split(':');
                nextDateObj = new Date();
                nextDateObj.setDate(nextDateObj.getDate() + 1);
                nextDateObj.setHours(parseInt(h), parseInt(m), 0, 0);
                nextName = prayers[0].label[currentLang] + ` (${t('tomorrow')})`;
                currentPrayerId = 'Yatsi'; 
                
                const [lh, lm] = today.Yatsi.split(':');
                lastDateObj = new Date();
                lastDateObj.setHours(parseInt(lh), parseInt(lm), 0, 0);
            } else if (nextIndex > 0) {
                const lastP = prayers[nextIndex - 1];
                const [lh, lm] = today[lastP.id].split(':');
                lastDateObj = new Date();
                lastDateObj.setHours(parseInt(lh), parseInt(lm), 0, 0);
            } else if (nextIndex === 0) {
                lastDateObj = new Date();
                lastDateObj.setHours(0, 0, 0, 0);
            }

            highlightCard(currentPrayerId);

            if (nextDateObj) {
                targetTimeMs = nextDateObj.getTime();
                lastTimeMs = lastDateObj ? lastDateObj.getTime() : Date.now();
                
                const titleFormat = t('timeUntil');
                const finalTitleText = titleFormat.replace('{prayer}', nextName);
                document.getElementById('next-prayer-name').innerText = finalTitleText.toLocaleUpperCase(currentLang === 'tr' ? 'tr-TR' : 'en-US');
                
                const locale = currentLang === 'tr' ? 'tr-TR' : 'en-US';
                document.getElementById('next-prayer-time').innerText = nextDateObj.toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'});
                startCountdown();
            }
        }

        function startCountdown() {
            stopCountdownLoop();

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

                if (!targetTimeMs) {
                    timerInterval = null;
                    return;
                }

                const nowMs = Date.now();
                const diff = targetTimeMs - nowMs;

                if (diff <= 0) {
                    stopCountdownLoop();
                    document.getElementById('countdown-timer').innerText = "00:00:00";
                    document.getElementById('prayer-progress').style.width = '100%';
                    
                    setTimeout(setupNextPrayer, 2000); 
                    return;
                }

                const hours = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                const secs = Math.floor((diff % 60000) / 1000);

                document.getElementById('countdown-timer').innerText = 
                    `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

                if (lastTimeMs && targetTimeMs > lastTimeMs) {
                    const totalDuration = targetTimeMs - lastTimeMs;
                    const elapsed = nowMs - lastTimeMs;
                    let percentage = (elapsed / totalDuration) * 100;
                    if (percentage < 0) percentage = 0;
                    if (percentage > 100) percentage = 100;
                    document.getElementById('prayer-progress').style.width = `${percentage}%`;
                }

                const iftarContainer = document.getElementById('iftar-inline-container');
                if (isRamadan && nowMs >= imsakTimeMs && nowMs < aksamTimeMs) {
                    if (iftarContainer.classList.contains('hidden')) {
                        iftarContainer.classList.remove('hidden');
                        renderIcons(); 
                    }
                    
                    const iftarDiff = aksamTimeMs - nowMs;
                    const iHours = Math.floor(iftarDiff / 3600000);
                    const iMins = Math.floor((iftarDiff % 3600000) / 60000);
                    const iSecs = Math.floor((iftarDiff % 60000) / 1000);
                    
                    document.getElementById('iftar-inline-timer').innerText = 
                        `${String(iHours).padStart(2, '0')}:${String(iMins).padStart(2, '0')}:${String(iSecs).padStart(2, '0')}`;
                } else {
                    if (!iftarContainer.classList.contains('hidden')) {
                        iftarContainer.classList.add('hidden');
                    }
                }

                scheduleNextTick();
            }

            updateTimer();
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

        function updateThemeIcon(iconName) {
            const iconEl = document.getElementById('theme-icon');
            if(iconEl) {
                iconEl.setAttribute('data-lucide', iconName);
                renderIcons();
            }
        }

        function highlightCard(prayerId) {
            document.querySelectorAll('.m3-card').forEach(c => c.classList.remove('active-prayer'));
            const active = document.getElementById(`card-${prayerId}`);
            if (active) active.classList.add('active-prayer');
        }

        function toggleSettings() {
            const modal = document.getElementById('settings-modal');
            const dialog = document.getElementById('settings-dialog');
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
            } else if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
                lastFocusedElement.focus();
                lastFocusedElement = null;
            }
        }

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

        function getFocusableElements(container) {
            if (!container) return [];
            return Array.from(container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
                .filter(el => !el.disabled && !el.getAttribute('aria-hidden'));
        }

        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('settings-modal');
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

        function updateLocationUI(name) {
            let displayName = name;
            if (currentLang === 'en') {
                const trMap = { 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c', 'İ': 'I', 'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'Ö': 'O', 'Ç': 'C' };
                displayName = name.replace(/[ığüşöçİĞÜŞÖÇ]/g, match => trMap[match]);
            }
            document.getElementById('current-location-text').innerHTML = 
                `<i data-lucide="map-pin" class="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0"></i> <span class="truncate">${displayName}</span>`;
            renderIcons();
        }

        function showMessage(msg) {
            const toast = document.getElementById('error-toast');
            toast.innerText = msg;
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 3000);
        }

window.toggleLang = toggleLang;
window.toggleTheme = toggleTheme;
window.toggleSettings = toggleSettings;
window.toggleDropdown = toggleDropdown;
window.renderList = renderList;
window.filterDropdown = filterDropdown;
window.selectItem = selectItem;
window.saveLocation = saveLocation;
