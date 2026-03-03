import { formatDateKey, parseMiladiDate, timeToMs } from '../utils/time';

export function getDayContext(prayerData, now = new Date()) {
    if (!Array.isArray(prayerData) || prayerData.length === 0) {
        return {
            now,
            nowMs: now.getTime(),
            calendarIndex: 0,
            prayerIndex: 0
        };
    }

    const nowMs = now.getTime();
    const calendarDateKey = formatDateKey(now);
    let calendarIndex = prayerData.findIndex((d) => d.MiladiTarihKisa === calendarDateKey);
    if (calendarIndex === -1) {
        calendarIndex = 0;
    }

    let prayerIndex = calendarIndex;
    const calendarDay = prayerData[calendarIndex];
    if (calendarDay && prayerData[calendarIndex + 1]) {
        const dayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yatsiMs = timeToMs(calendarDay.Yatsi, dayStartMs);
        if (nowMs >= yatsiMs) {
            prayerIndex = calendarIndex + 1;
        }
    }

    return {
        now,
        nowMs,
        calendarIndex,
        prayerIndex
    };
}

export function computeNextPrayerState({ prayerData, context, prayers, currentLang, tomorrowText }) {
    const today = prayerData[context.prayerIndex] || prayerData[0];
    const tomorrow = prayerData[context.prayerIndex + 1];
    const dayStartMs = parseMiladiDate(today.MiladiTarihKisa).getTime();

    const isRamadan = today.HicriTarihUzun.includes('Ramazan') || today.HicriTarihUzun.includes('Ramadan');
    const imsakTimeMs = timeToMs(today.Imsak, dayStartMs);
    const aksamTimeMs = timeToMs(today.Aksam, dayStartMs);

    const isFriday = context.now.getDay() === 5;
    let nextTimeMs = null;
    let lastPrayerTimeMs = null;
    let nextName = '';
    let nextIndex = -1;
    let currentPrayerId = 'Yatsi';

    for (let i = 0; i < prayers.length; i++) {
        const prayer = prayers[i];
        const prayerTimeMs = timeToMs(today[prayer.id], dayStartMs);

        if (prayerTimeMs > context.nowMs) {
            nextTimeMs = prayerTimeMs;

            let prayerLabel = prayer.label[currentLang];
            if (prayer.id === 'Ogle' && isFriday) {
                prayerLabel = currentLang === 'tr' ? 'Cuma' : "Jumu'ah";
            }

            nextName = prayerLabel;
            nextIndex = i;

            if (i > 0) {
                currentPrayerId = prayers[i - 1].id;
            }
            break;
        }
    }

    if (!nextTimeMs && tomorrow) {
        const tomorrowStartMs = dayStartMs + 86400000;
        nextTimeMs = timeToMs(tomorrow.Imsak, tomorrowStartMs);
        nextName = `${prayers[0].label[currentLang]} (${tomorrowText})`;
        currentPrayerId = 'Yatsi';
        lastPrayerTimeMs = timeToMs(today.Yatsi, dayStartMs);
    } else if (nextIndex > 0) {
        const lastPrayer = prayers[nextIndex - 1];
        lastPrayerTimeMs = timeToMs(today[lastPrayer.id], dayStartMs);
    } else if (nextIndex === 0) {
        lastPrayerTimeMs = dayStartMs;
    }

    return {
        aksamTimeMs,
        currentPrayerId,
        imsakTimeMs,
        isRamadan,
        lastTimeMs: lastPrayerTimeMs ?? context.nowMs,
        nextName,
        nextTimeMs,
        targetTimeMs: nextTimeMs
    };
}
