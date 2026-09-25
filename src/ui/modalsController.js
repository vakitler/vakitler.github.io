import { getUpcomingReligiousDays } from '../core/religiousDays';
import { formatDateKey } from '../utils/time';

export function createModalsController({ getEl, renderIcons, t, currentLang }) {
    let currentPrayerData = null;

    function setPrayerData(data) {
        currentPrayerData = data;
    }

    function toggleMonthlyModal(show) {
        const modal = getEl('monthly-modal');
        if (!modal) return;

        const isHidden = modal.classList.contains('hidden');
        const shouldShow = show !== undefined ? show : isHidden;

        if (shouldShow) {
            renderMonthlyTable();
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
        } else {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
        }
    }

    function renderMonthlyTable() {
        const container = getEl('monthly-table-body');
        if (!container || !currentPrayerData) return;

        const printLoc = getEl('print-location-text');
        if (printLoc) {
            try {
                const savedLoc = localStorage.getItem('selectedCity');
                if (savedLoc) {
                    const parsed = JSON.parse(savedLoc);
                    printLoc.innerText = parsed.cityName || '';
                }
            } catch (e) {}
        }

        container.innerHTML = '';

        const todayStr = formatDateKey(new Date());

        const fragment = document.createDocumentFragment();

        currentPrayerData.forEach((dayData) => {
            const tr = document.createElement('tr');
            const isToday = dayData.MiladiTarihKisa === todayStr;

            tr.className = isToday
                ? 'bg-blue-50/80 dark:bg-blue-900/40 font-bold border-l-4 border-blue-600 dark:border-blue-400'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60';

            tr.innerHTML = `
                <td class="py-3 px-3 sm:px-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    <div class="font-medium">${dayData.MiladiTarihKisa}</div>
                    <div class="tiny-text text-slate-400 font-normal">${dayData.HicriTarihKisa || ''}</div>
                </td>
                <td class="py-3 px-2 sm:px-3 text-xs sm:text-sm time-display text-slate-700 dark:text-slate-300">${dayData.Imsak}</td>
                <td class="py-3 px-2 sm:px-3 text-xs sm:text-sm time-display text-slate-700 dark:text-slate-300">${dayData.Gunes}</td>
                <td class="py-3 px-2 sm:px-3 text-xs sm:text-sm time-display text-slate-700 dark:text-slate-300">${dayData.Ogle}</td>
                <td class="py-3 px-2 sm:px-3 text-xs sm:text-sm time-display text-slate-700 dark:text-slate-300">${dayData.Ikindi}</td>
                <td class="py-3 px-2 sm:px-3 text-xs sm:text-sm time-display text-slate-700 dark:text-slate-300">${dayData.Aksam}</td>
                <td class="py-3 px-2 sm:px-3 text-xs sm:text-sm time-display text-slate-700 dark:text-slate-300">${dayData.Yatsi || dayData.Yatsı || ''}</td>
            `;

            fragment.appendChild(tr);
        });

        container.appendChild(fragment);
    }

    function toggleReligiousDaysModal(show) {
        const modal = getEl('religious-days-modal');
        if (!modal) return;

        const isHidden = modal.classList.contains('hidden');
        const shouldShow = show !== undefined ? show : isHidden;

        if (shouldShow) {
            renderReligiousDaysList();
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
        } else {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
        }
    }

    function renderReligiousDaysList() {
        const container = getEl('religious-days-list');
        if (!container) return;

        container.innerHTML = '';

        const days = getUpcomingReligiousDays();
        const lang = currentLang() || 'tr';
        const fragment = document.createDocumentFragment();

        days.forEach((item) => {
            const card = document.createElement('div');
            const isToday = item.isToday;
            const isPast = item.isPast;

            let badgeHtml = '';
            if (isToday) {
                badgeHtml = `<span class="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-emerald-500 text-white shadow-sm">${t('today')}</span>`;
            } else if (isPast) {
                badgeHtml = `<span class="px-2.5 py-1 text-[10px] font-medium uppercase rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 opacity-60">${t('past')}</span>`;
            } else {
                badgeHtml = `<span class="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">${t('daysLeft').replace('{n}', item.daysLeft)}</span>`;
            }

            card.className = `p-4 sm:p-5 rounded-2xl sm:rounded-3xl border flex items-center justify-between gap-3 transition-all ${
                isToday
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 shadow-md scale-[1.02]'
                    : isPast
                    ? 'bg-slate-50/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow'
            }`;

            card.innerHTML = `
                <div class="flex items-center gap-3.5 min-w-0">
                    <div class="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        isToday
                            ? 'bg-emerald-500 text-white'
                            : 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-300'
                    }">
                        <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h4 class="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">${item.name[lang] || item.name.tr}</h4>
                        <p class="tiny-text sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">${item.dateStr} &bull; ${item.hijri}</p>
                    </div>
                </div>
                <div class="flex-shrink-0 text-right">
                    ${badgeHtml}
                </div>
            `;

            fragment.appendChild(card);
        });

        container.appendChild(fragment);
        renderIcons();
    }

    function printMonthlyTable() {
        renderMonthlyTable();
        window.print();
    }

    function bindEvents() {
        // Close on backdrop click
        ['monthly-modal', 'religious-days-modal'].forEach((modalId) => {
            const modal = getEl(modalId);
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        if (modalId === 'monthly-modal') toggleMonthlyModal(false);
                        else toggleReligiousDaysModal(false);
                    }
                });
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const monthlyModal = getEl('monthly-modal');
                if (monthlyModal && !monthlyModal.classList.contains('hidden')) {
                    toggleMonthlyModal(false);
                    return;
                }
                const religiousModal = getEl('religious-days-modal');
                if (religiousModal && !religiousModal.classList.contains('hidden')) {
                    toggleReligiousDaysModal(false);
                }
            }
        });

        // Auto-render table before printing so Ctrl+P always prints filled table
        window.addEventListener('beforeprint', () => {
            renderMonthlyTable();
        });
    }

    return {
        bindEvents,
        setPrayerData,
        toggleMonthlyModal,
        toggleReligiousDaysModal,
        printMonthlyTable
    };
}
