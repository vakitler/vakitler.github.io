export const RELIGIOUS_DAYS = [
    { name: { tr: 'Regaip Kandili', en: 'Ragaib Night' }, dateStr: '2026-01-15', hijri: '26 Recep 1447', icon: 'sparkles' },
    { name: { tr: 'Mirac Kandili', en: 'Isra and Mi\'raj' }, dateStr: '2026-02-10', hijri: '27 Recep 1447', icon: 'moon' },
    { name: { tr: 'Berat Kandili', en: 'Shab-e-Barat' }, dateStr: '2026-02-28', hijri: '15 Şaban 1447', icon: 'sun' },
    { name: { tr: 'Ramazan Başlangıcı', en: 'First Day of Ramadan' }, dateStr: '2026-03-19', hijri: '1 Ramazan 1447', icon: 'book-open' },
    { name: { tr: 'Kadir Gecesi', en: 'Laylat al-Qadr' }, dateStr: '2026-04-13', hijri: '27 Ramazan 1447', icon: 'sparkles' },
    { name: { tr: 'Ramazan Bayramı (1. Gün)', en: 'Eid al-Fitr (Day 1)' }, dateStr: '2026-04-18', hijri: '1 Şevval 1447', icon: 'heart' },
    { name: { tr: 'Ramazan Bayramı (2. Gün)', en: 'Eid al-Fitr (Day 2)' }, dateStr: '2026-04-19', hijri: '2 Şevval 1447', icon: 'heart' },
    { name: { tr: 'Ramazan Bayramı (3. Gün)', en: 'Eid al-Fitr (Day 3)' }, dateStr: '2026-04-20', hijri: '3 Şevval 1447', icon: 'heart' },
    { name: { tr: 'Kurban Bayramı Arife', en: 'Day of Arafah' }, dateStr: '2026-06-24', hijri: '9 Zilhicce 1447', icon: 'sun' },
    { name: { tr: 'Kurban Bayramı (1. Gün)', en: 'Eid al-Adha (Day 1)' }, dateStr: '2026-06-25', hijri: '10 Zilhicce 1447', icon: 'gift' },
    { name: { tr: 'Kurban Bayramı (2. Gün)', en: 'Eid al-Adha (Day 2)' }, dateStr: '2026-06-26', hijri: '11 Zilhicce 1447', icon: 'gift' },
    { name: { tr: 'Kurban Bayramı (3. Gün)', en: 'Eid al-Adha (Day 3)' }, dateStr: '2026-06-27', hijri: '12 Zilhicce 1447', icon: 'gift' },
    { name: { tr: 'Kurban Bayramı (4. Gün)', en: 'Eid al-Adha (Day 4)' }, dateStr: '2026-06-28', hijri: '13 Zilhicce 1447', icon: 'gift' },
    { name: { tr: 'Hicri Yılbaşı (1 Muharrem)', en: 'Islamic New Year' }, dateStr: '2026-07-16', hijri: '1 Muharrem 1448', icon: 'calendar' },
    { name: { tr: 'Aşure Günü', en: 'Day of Ashura' }, dateStr: '2026-07-25', hijri: '10 Muharrem 1448', icon: 'star' },
    { name: { tr: 'Mevlid Kandili', en: 'Mawlid al-Nabi' }, dateStr: '2026-09-24', hijri: '12 Rebiülevvel 1448', icon: 'sparkles' }
];

export function getUpcomingReligiousDays(nowDate = new Date()) {
    const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());

    return RELIGIOUS_DAYS.map((day) => {
        const targetDate = new Date(day.dateStr);
        const diffMs = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        return {
            ...day,
            daysLeft: diffDays,
            isPast: diffDays < 0,
            isToday: diffDays === 0
        };
    });
}
