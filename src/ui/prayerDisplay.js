import { parseMiladiDate } from '../utils/time';

export function createPrayerHighlighter() {
    let activePrayerCardId = null;

    function highlightCard(prayerId) {
        if (activePrayerCardId === prayerId) return;

        if (activePrayerCardId) {
            const previous = document.getElementById(`card-${activePrayerCardId}`);
            if (previous) previous.classList.remove('active-prayer');
        }

        const active = document.getElementById(`card-${prayerId}`);
        if (active) {
            active.classList.add('active-prayer');
            activePrayerCardId = prayerId;
            return;
        }

        activePrayerCardId = null;
    }

    function reset() {
        activePrayerCardId = null;
    }

    return {
        highlightCard,
        reset
    };
}

export function renderPrayerDay({
    prayerData,
    getDayContext,
    getEl,
    renderIcons,
    currentLang,
    prayers,
    hijriMonthMap
}) {
    if (!prayerData || prayerData.length === 0) {
        return null;
    }

    const context = getDayContext(prayerData);
    const prayerDay = prayerData[context.prayerIndex] || prayerData[0];
    const gregorianDay = prayerData[context.calendarIndex] || prayerDay;

    const container = getEl('daily-times-container');
    container.innerHTML = '';

    const prayerDateObj = parseMiladiDate(prayerDay.MiladiTarihKisa);
    const gregorianDateObj = parseMiladiDate(gregorianDay.MiladiTarihKisa);
    const gregorianStr = gregorianDateObj.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    getEl('gregorian-date').innerText = gregorianStr;

    let hijriStr = prayerDay.HicriTarihUzun;
    if (currentLang === 'en') {
        for (const [tr, en] of Object.entries(hijriMonthMap)) {
            if (hijriStr.includes(tr)) {
                hijriStr = hijriStr.replace(tr, en);
                break;
            }
        }
    }
    getEl('hijri-date').innerText = hijriStr;

    const moonImg = getEl('moon-phase');
    if (prayerDay.AyinSekliURL && prayerDay.AyinSekliURL.trim() !== '') {
        const secureUrl = prayerDay.AyinSekliURL.replace(/^http:\/\//i, 'https://');
        if (moonImg.src !== secureUrl) {
            moonImg.onload = () => moonImg.classList.remove('hidden');
            moonImg.onerror = () => moonImg.classList.add('hidden');
            moonImg.src = secureUrl;
        } else {
            moonImg.classList.remove('hidden');
        }
    } else {
        moonImg.classList.add('hidden');
    }

    const qiblaEl = getEl('qibla-time');
    if (qiblaEl && prayerDay.KibleSaati) {
        qiblaEl.innerHTML = `<i data-lucide="compass" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400"></i> ${prayerDay.KibleSaati}`;
    }

    const isFriday = prayerDateObj.getDay() === 5;
    const fragment = document.createDocumentFragment();

    prayers.forEach((prayer) => {
        const timeStr = prayerDay[prayer.id];

        let pLabel = prayer.label[currentLang];
        if (prayer.id === 'Ogle' && isFriday) {
            pLabel = currentLang === 'tr' ? 'Cuma' : "Jumu'ah";
        }

        const card = document.createElement('div');
        card.className = 'm3-card p-4 sm:p-6 flex flex-col items-center justify-center gap-2 sm:gap-3 border-2 border-transparent transition-all duration-500 hover:-translate-y-1 cursor-default w-full';
        card.id = `card-${prayer.id}`;
        card.innerHTML = `
                    <div class="p-2 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 transition-colors">
                        <i data-lucide="${prayer.icon}" class="w-5 h-5 sm:w-6 sm:h-6 opacity-80"></i>
                    </div>
                    <span class="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center truncate w-full">${pLabel}</span>
                    <span class="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 time-display tracking-tight">${timeStr}</span>
                `;
        fragment.appendChild(card);
    });

    container.appendChild(fragment);
    renderIcons();

    return {
        renderedGregorianDayIndex: context.calendarIndex,
        renderedPrayerDayIndex: context.prayerIndex
    };
}
