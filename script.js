
        // --- PWA (Mobil Uygulama) Yükleyicisi ---
        function setupPWA() {
            // Tarayıcıya uygulamanın tam ekran açılması gerektiğini söyleyen Manifest bildirgesi
            const manifest = {
                name: "Vakitler",
                short_name: "Vakitler",
                display: "standalone", // Adres çubuğunu gizler, uygulama gibi açar
                start_url: window.location.href,
                background_color: "#f7f9ff",
                theme_color: "#0061a4",
                icons: [{
                    src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#0061a4' rx='22'/><text x='50' y='50' font-size='55' text-anchor='middle' dominant-baseline='central' fill='white'>🌙</text></svg>`),
                    sizes: "512x512",
                    type: "image/svg+xml",
                    purpose: "any maskable"
                }]
            };
            
            // Manifest'i HTML'e enjekte et
            const manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            manifestLink.href = 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest));
            document.head.appendChild(manifestLink);
            
            // Not: İzole tarayıcı ortamlarında blob tabanlı Service Worker kaydı protokol hatalarına yol açabilir.
            // Bu nedenle, harici dosya erişimi olmayan bu ortamda SW kaydı devre dışı bırakılmıştır.
        }
        setupPWA(); // Algoritmayı Başlat

        const API_BASE = "https://ezanvakti.emushaf.net";
        let prayerData = null;
        let timerInterval = null;
        let targetTimeMs = null; 
        let lastTimeMs = null; // Progress bar için eklendi
        let currentLang = localStorage.getItem('appLang') || 'tr';
        
        // İftar sayacı için değişkenler
        let imsakTimeMs = null;
        let aksamTimeMs = null;
        let isRamadan = false;

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
                ,errAudioAutoplay: 'Ses otomatik çalınamadı. Lütfen sayfaya dokunarak sesi etkinleştirin.'
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
                errFetchTimes: 'Could not fetch times, check your internet connection.',
                errLoadCountries: 'Could not load countries',
                errLoadRegions: 'Could not load cities',
                errLoadCities: 'Could not load districts',
                tomorrow: 'Tomorrow',
                supportTitle: 'Support Me',
                buyCoffee: 'Buy me a coffee',
                timeToIftar: 'Time to Iftar'
                ,errAudioAutoplay: 'Audio autoplay blocked. Please interact with the page to enable sound.'
            }
        };

        const t = (key) => i18n[currentLang][key];

        // Arama için hafıza değişkenleri
        let countriesData = [];
        let regionsData = [];
        let citiesData = [];
        
        // Seçim tutucuları
        let selectedCountryData = null;
        let selectedRegionData = null;
        let selectedCityData = null;

        // Zarif bir bildirim sesi (Zil sesi)
        const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

        const prayers = [
            { id: 'Imsak', label: { tr: 'İmsak', en: 'Fajr' }, icon: 'sunrise' },
            { id: 'Gunes', label: { tr: 'Güneş', en: 'Sunrise' }, icon: 'sun' },
            { id: 'Ogle', label: { tr: 'Öğle', en: 'Dhuhr' }, icon: 'cloud-sun' },
            { id: 'Ikindi', label: { tr: 'İkindi', en: 'Asr' }, icon: 'sunset' },
            { id: 'Aksam', label: { tr: 'Akşam', en: 'Maghrib' }, icon: 'moon' },
            { id: 'Yatsi', label: { tr: 'Yatsı', en: 'Isha' }, icon: 'stars' }
        ];

        // Initialize Lucide icons
        lucide.createIcons();

        document.addEventListener('DOMContentLoaded', async () => {
            // Tema yükleme
            initTheme();

            // --- Arka Plandan Dönüş Senkronizasyonu ---
            // Kullanıcı telefonu kilitleyip açtığında veya sekmeler arası geçiş yaptığında saati tazele
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible") {
                    if (prayerData) {
                        setupNextPrayer(); // Sayacı ve vakitleri gerçek zamanlı yeniden ayarla
                    }
                }
            });

            // Menü (Modal) dışı tıklamalarda açık olan dropdown listeleri kapat
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#settings-modal .relative')) {
                    ['country', 'region', 'city'].forEach(t => {
                        const dd = document.getElementById(`dropdown-${t}`);
                        const icon = document.getElementById(`icon-${t}`);
                        if(dd && !dd.classList.contains('hidden')) {
                            dd.classList.add('hidden');
                            if(icon) icon.classList.remove('rotate-180');
                        }
                    });
                }
            });

            const savedLocation = localStorage.getItem('selectedCity');
            if (savedLocation) {
                const city = JSON.parse(savedLocation);
                updateLocationUI(city.cityName);
                fetchPrayerTimes(city.id);
                
                // Ayarlar menüsündeki form durumunu geri yükle
                if (city.country && city.region && city.city) {
                    selectedCountryData = city.country;
                    selectedRegionData = city.region;
                    selectedCityData = city.city;
                    
                    document.getElementById('text-country').innerText = city.country.name;
                    document.getElementById('text-region').innerText = city.region.name;
                    document.getElementById('text-city').innerText = city.city.name;
                    
                    document.getElementById('btn-region').disabled = false;
                    document.getElementById('btn-city').disabled = false;
                    
                    // Açılır menüler tıklandığında hazır olması için arka planda sessizce yükle (res.ok kontrolü ile)
                    fetch(`${API_BASE}/sehirler/${city.country.id}`)
                        .then(r => { if (!r.ok) throw new Error('Network response was not ok'); return r.json(); })
                        .then(d => { regionsData = d; })
                        .catch(e => console.log(e));
                    fetch(`${API_BASE}/ilceler/${city.region.id}`)
                        .then(r => { if (!r.ok) throw new Error('Network response was not ok'); return r.json(); })
                        .then(d => { citiesData = d; })
                        .catch(e => console.log(e));
                }
            } else {
                toggleSettings();
            }
            
            loadCountries();
            applyLanguageTexts(); // İlk yüklemede dili uygula
        });

        // --- Dil Yönetimi ---
        function toggleLang() {
            currentLang = currentLang === 'tr' ? 'en' : 'tr';
            localStorage.setItem('appLang', currentLang);
            applyLanguageTexts();
            
            // Konum metnini mevcut dile göre (TR karakter dönüşümü) güncelle
            const savedLocation = localStorage.getItem('selectedCity');
            if (savedLocation) {
                updateLocationUI(JSON.parse(savedLocation).cityName);
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

            // Eğer daha önceden seçili bir veri yoksa placeholder metinlerini uygula
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

        // Yardımcı fonksiyon: Custom Select Dropdown Aç/Kapat
        function toggleDropdown(type) {
            // Diğer açık olanları kapat
            ['country', 'region', 'city'].forEach(t => {
                if(t !== type) {
                    document.getElementById(`dropdown-${t}`).classList.add('hidden');
                    document.getElementById(`icon-${t}`).classList.remove('rotate-180');
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
                
                // Menü açılınca otomatik arama çubuğuna odaklan
                setTimeout(() => search.focus(), 100);
            }
        }

        // Yardımcı fonksiyon: Verileri güvenli şekilde DOM ile listeye basar (XSS koruması)
        function renderList(type, data, idKey, nameKey, filterQuery = "") {
            const list = document.getElementById(`list-${type}`);
            const lowerQuery = filterQuery.toLocaleLowerCase('tr-TR');
            list.innerHTML = '';

            const filtered = data.filter(item =>
                item[nameKey].toLocaleLowerCase('tr-TR').includes(lowerQuery)
            );

            if (filtered.length === 0) {
                const li = document.createElement('li');
                li.className = 'px-4 py-4 text-sm text-slate-500 dark:text-slate-400 text-center font-medium';
                li.textContent = t('noResults');
                list.appendChild(li);
                return;
            }

            filtered.forEach(item => {
                const li = document.createElement('li');
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'w-full text-left px-4 py-3 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-item';
                btn.dataset.id = item[idKey];
                btn.dataset.name = item[nameKey];
                btn.textContent = item[nameKey];
                btn.addEventListener('click', () => selectItem(type, btn.dataset.id, btn.dataset.name));

                li.appendChild(btn);
                list.appendChild(li);
            });
        }

        // Yardımcı fonksiyon: Liste elemanı seçildiğinde
        function selectItem(type, id, name) {
            document.getElementById(`text-${type}`).innerText = name;
            document.getElementById(`dropdown-${type}`).classList.add('hidden');
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
                if (!res.ok) throw new Error('Network response was not ok');
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
                if (!res.ok) throw new Error('Network response was not ok');
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
                if (!res.ok) throw new Error('Network response was not ok');
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

            // Bugünün tarihini API formatında (DD.MM.YYYY) alıyoruz
            const todayObj = new Date();
            const formattedToday = `${String(todayObj.getDate()).padStart(2,'0')}.${String(todayObj.getMonth()+1).padStart(2,'0')}.${todayObj.getFullYear()}`;

            // 1. Önbellek (Cache) Kontrolü
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                
                // Önbellekteki verilerde bugünü bul
                const todayIndex = parsedData.findIndex(d => d.MiladiTarihKisa === formattedToday);
                
                if (todayIndex !== -1) {
                    // Geçmiş günleri atıp, bugünden itibaren olan veriyi kullan
                    prayerData = parsedData.slice(todayIndex);
                    renderToday();
                    setupNextPrayer();
                    return;
                }
            }

            // 2. Önbellekte yoksa veya eskimişse API'den çek
            try {
                const res = await fetch(`${API_BASE}/vakitler/${cityId}`);
                if (!res.ok) throw new Error('Network response was not ok');
                const data = await res.json();
                localStorage.setItem(cacheKey, JSON.stringify(data)); // Yeni veriyi kaydet
                
                // DÜZELTME: API'den gelen ham veri listesinde de bugünü bulup listeyi kırpmalıyız
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
            
            const today = prayerData[0]; // Assuming first index is today
            const container = document.getElementById('daily-times-container');
            container.innerHTML = '';

            // Miladi Tarih (Gregorian) Yerelleştirme
            const [d, m, y] = today.MiladiTarihKisa.split('.');
            const dateObj = new Date(y, parseInt(m) - 1, d);
            const gregorianStr = dateObj.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });
            document.getElementById('gregorian-date').innerText = gregorianStr;

            // Hicri Tarih (Hijri) Yerelleştirme
            const hijriMonths = {
                'Muharrem': 'Muharram',
                'Safer': 'Safar',
                'Rebiülevvel': 'Rabi al-Awwal',
                'Rebiülahir': 'Rabi al-Thani',
                'Cemaziyelevvel': 'Jumada al-Awwal',
                'Cemaziyelahir': 'Jumada al-Thani',
                'Recep': 'Rajab',
                'Şaban': "Sha'ban",
                'Ramazan': 'Ramadan',
                'Şevval': 'Shawwal',
                'Zilkade': "Dhu al-Qi'dah",
                'Zilhicce': 'Dhu al-Hijjah'
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

            // Ayın Şekli görselini ekliyoruz
            const moonImg = document.getElementById('moon-phase');
            if (today.AyinSekliURL && today.AyinSekliURL.trim() !== '') {
                // 1. Tarayıcı (Mixed Content) HTTP engellemesini önlemek için HTTPS'ye zorluyoruz
                const secureUrl = today.AyinSekliURL.replace(/^http:\/\//i, 'https://');
                
                // Resim tamamen yüklenene kadar bekle, yüklenince görünür yap
                moonImg.onload = () => {
                    moonImg.classList.remove('hidden');
                };
                
                // Eğer Diyanet/API sunucusunda resim yoksa kırıksa gizli tut
                moonImg.onerror = () => {
                    moonImg.classList.add('hidden');
                };

                // Kaynağı atayarak yüklemeyi başlat
                moonImg.src = secureUrl;
            } else {
                moonImg.classList.add('hidden');
            }
            
            // Kıble Saati verisini ekliyoruz (güvenli DOM oluşturma)
            const qiblaEl = document.getElementById('qibla-time');
            if (qiblaEl && today.KibleSaati) {
                qiblaEl.innerHTML = '';
                const ico = document.createElement('i');
                ico.setAttribute('data-lucide', 'compass');
                ico.className = 'w-3.5 h-3.5 text-slate-400';
                qiblaEl.appendChild(ico);
                const txt = document.createTextNode(' ' + today.KibleSaati);
                qiblaEl.appendChild(txt);
            }

            const isFriday = dateObj.getDay() === 5; // Cuma günü kontrolü

            prayers.forEach(prayer => {
                const timeStr = today[prayer.id];
                
                // Cuma gününe denk geliyorsa "Öğle" metnini "Cuma" olarak değiştir
                let pLabel = prayer.label[currentLang];
                if (prayer.id === 'Ogle' && isFriday) {
                    pLabel = currentLang === 'tr' ? 'Cuma' : "Jumu'ah";
                }

                const card = document.createElement('div');
                card.className = 'm3-card p-5 sm:p-6 flex flex-col items-center justify-center gap-3 border-2 border-transparent transition-all duration-500 hover:-translate-y-1 cursor-default';
                card.id = `card-${prayer.id}`;

                const iconWrap = document.createElement('div');
                iconWrap.className = 'p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 transition-colors';
                const iconEl = document.createElement('i');
                iconEl.setAttribute('data-lucide', prayer.icon);
                iconEl.className = 'w-6 h-6 opacity-80';
                iconWrap.appendChild(iconEl);

                const labelEl = document.createElement('span');
                labelEl.className = 'text-[11px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest';
                labelEl.textContent = pLabel;

                const timeEl = document.createElement('span');
                timeEl.className = 'text-2xl font-bold text-slate-800 dark:text-slate-100 time-display tracking-tight';
                timeEl.textContent = timeStr;

                card.appendChild(iconWrap);
                card.appendChild(labelEl);
                card.appendChild(timeEl);
                container.appendChild(card);
            });
            lucide.createIcons();
        }

        // CPU Optimizasyonu: Sonraki vakti sadece 1 kere veya vakit geçince hesapla
        function setupNextPrayer() {
            if (!prayerData || prayerData.length === 0) return;

            const now = new Date();
            const formattedToday = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;
            // Eğer gece yarısı geçildiyse ve sayfa yenilenmediyse doğru günü bul
            const actualTodayData = prayerData.find(d => d.MiladiTarihKisa === formattedToday) || prayerData[0];
            
            const today = prayerData[0];
            const tomorrow = prayerData[1];

            // --- İftar Sayacı Mantığı (Ramazan Kontrolü) ---
            isRamadan = actualTodayData.HicriTarihUzun.includes('Ramazan') || actualTodayData.HicriTarihUzun.includes('Ramadan');
            
            const [ih, im] = actualTodayData.Imsak.split(':');
            const iDate = new Date();
            iDate.setHours(parseInt(ih), parseInt(im), 0, 0);
            imsakTimeMs = iDate.getTime();

            const [ah, am] = actualTodayData.Aksam.split(':');
            const aDate = new Date();
            aDate.setHours(parseInt(ah), parseInt(am), 0, 0);
            aksamTimeMs = aDate.getTime();
            // ---------------------------------------------
            
            let nextDateObj = null;
            let lastDateObj = null;
            let nextName = "";
            let nextIndex = -1;
            let currentPrayerId = 'Yatsi'; // Gece yarısından sonra, imsaktan önceki varsayılan mevcut vakit

            for (let i = 0; i < prayers.length; i++) {
                const p = prayers[i];
                const [h, m] = today[p.id].split(':');
                const pTime = new Date();
                pTime.setHours(parseInt(h), parseInt(m), 0, 0); 
                
                if (pTime > now) {
                    nextDateObj = pTime;
                    
                    // Sonraki vakit isminde Cuma kontrolü
                    let pLabel = p.label[currentLang];
                    if (p.id === 'Ogle' && pTime.getDay() === 5) {
                        pLabel = currentLang === 'tr' ? 'Cuma' : "Jumu'ah";
                    }
                    
                    nextName = pLabel;
                    nextIndex = i;
                    
                    if (i > 0) {
                        currentPrayerId = prayers[i - 1].id; // İçinde bulunduğumuz vakti al
                    }
                    break;
                }
            }

            // Eğer bugün tüm vakitler geçtiyse, yarının imsak vaktini al
            if (!nextDateObj && tomorrow) {
                const [h, m] = tomorrow.Imsak.split(':');
                nextDateObj = new Date();
                nextDateObj.setDate(nextDateObj.getDate() + 1);
                nextDateObj.setHours(parseInt(h), parseInt(m), 0, 0);
                nextName = prayers[0].label[currentLang] + ` (${t('tomorrow')})`;
                currentPrayerId = 'Yatsi'; // Gece yarısından önce, yatsıdan sonra mevcut vakit
                
                // Önceki vakit bugünün yatsısı
                const [lh, lm] = today.Yatsi.split(':');
                lastDateObj = new Date();
                lastDateObj.setHours(parseInt(lh), parseInt(lm), 0, 0);
            } else if (nextIndex > 0) {
                // Önceki vakit bugünün bir önceki vakti
                const lastP = prayers[nextIndex - 1];
                const [lh, lm] = today[lastP.id].split(':');
                lastDateObj = new Date();
                lastDateObj.setHours(parseInt(lh), parseInt(lm), 0, 0);
            } else if (nextIndex === 0) {
                // Sonraki vakit bugünün imsakı, o halde önceki dünün yatsısıdır
                lastDateObj = new Date();
                lastDateObj.setHours(0, 0, 0, 0);
            }

            // Artık SONRAKİ değil, İÇİNDE BULUNDUĞUMUZ (Mevcut) vakti vurgula
            highlightCard(currentPrayerId);

            if (nextDateObj) {
                targetTimeMs = nextDateObj.getTime();
                lastTimeMs = lastDateObj ? lastDateObj.getTime() : Date.now();
                
                // Başlığı "X Vaktine Kalan" formatında dinamik olarak güncelle
                const titleFormat = t('timeUntil');
                const finalTitleText = titleFormat.replace('{prayer}', nextName);
                document.getElementById('next-prayer-name').innerText = finalTitleText.toLocaleUpperCase(currentLang === 'tr' ? 'tr-TR' : 'en-US');
                
                const locale = currentLang === 'tr' ? 'tr-TR' : 'en-US';
                document.getElementById('next-prayer-time').innerText = nextDateObj.toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'});
                startCountdown();
            }
        }

        function startCountdown() {
            if (timerInterval) clearInterval(timerInterval);
            
            timerInterval = setInterval(() => {
                if (!targetTimeMs) return;

                const nowMs = Date.now();
                const diff = targetTimeMs - nowMs;

                // Eğer geri sayım bittiyse (vakit girdiyse)
                if (diff <= 0) {
                    clearInterval(timerInterval);
                    document.getElementById('countdown-timer').innerText = "00:00:00";
                    document.getElementById('prayer-progress').style.width = '100%';
                    
                    // Sesli Bildirim Çal, eğer tarayıcı engellerse kullanıcıya bilgi ver
                    notificationSound.play().catch(e => { showMessage(t('errAudioAutoplay')); console.log(e); });
                    
                    // Yeni vakti bulmak için tekrar çalıştır
                    setTimeout(setupNextPrayer, 2000); 
                    return;
                }

                // Saat, Dakika, Saniye Hesaplama
                const hours = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                const secs = Math.floor((diff % 60000) / 1000);

                document.getElementById('countdown-timer').innerText = 
                    `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

                // Progress Bar Hesaplama
                if (lastTimeMs && targetTimeMs > lastTimeMs) {
                    const totalDuration = targetTimeMs - lastTimeMs;
                    const elapsed = nowMs - lastTimeMs;
                    let percentage = (elapsed / totalDuration) * 100;
                    if (percentage < 0) percentage = 0;
                    if (percentage > 100) percentage = 100;
                    document.getElementById('prayer-progress').style.width = `${percentage}%`;
                }

                // --- İftar Sayacı Güncellemesi (Inline) ---
                const iftarContainer = document.getElementById('iftar-inline-container');
                if (isRamadan && nowMs >= imsakTimeMs && nowMs < aksamTimeMs) {
                    if (iftarContainer.classList.contains('hidden')) {
                        iftarContainer.classList.remove('hidden');
                        lucide.createIcons(); // Yeni ikon görünür olduğunda render et
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

            }, 1000);
        }

        // --- Tema Yönetimi (Karanlık Mod) ---
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
                lucide.createIcons();
            }
        }

        function highlightCard(prayerId) {
            document.querySelectorAll('.m3-card').forEach(c => c.classList.remove('active-prayer'));
            const active = document.getElementById(`card-${prayerId}`);
            if (active) active.classList.add('active-prayer');
        }

        function toggleSettings() {
            const modal = document.getElementById('settings-modal');
            modal.classList.toggle('hidden');
        }

        function updateLocationUI(name) {
            let displayName = name;
            if (currentLang === 'en') {
                const trMap = { 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c', 'İ': 'I', 'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'Ö': 'O', 'Ç': 'C' };
                displayName = name.replace(/[ığüşöçİĞÜŞÖÇ]/g, match => trMap[match]);
            }
            const locEl = document.getElementById('current-location-text');
            locEl.innerHTML = '';
            const ico = document.createElement('i');
            ico.setAttribute('data-lucide', 'map-pin');
            ico.className = 'w-3.5 h-3.5';
            const span = document.createElement('span');
            span.textContent = displayName;
            locEl.appendChild(ico);
            locEl.appendChild(document.createTextNode(' '));
            locEl.appendChild(span);
            lucide.createIcons();
        }

        function showMessage(msg) {
            const toast = document.getElementById('error-toast');
            toast.innerText = msg;
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 3000);
        }
    