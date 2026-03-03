export function createDropdownManager({
    dropdownTypes,
    dropdownConfig,
    getEl,
    getNoResultsText,
    onSelect
}) {
    const searchDebounceTimers = {
        country: null,
        region: null,
        city: null
    };

    function applyDropdownLayout(type) {
        const btn = getEl(`btn-${type}`);
        const dropdown = getEl(`dropdown-${type}`);
        const list = getEl(`list-${type}`);
        if (!btn || !dropdown || !list) return;

        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const rect = btn.getBoundingClientRect();
        const safeGap = 12;
        const isMobile = window.matchMedia('(max-width: 639px)').matches;

        if (isMobile) {
            const dropdownFixedPartMobile = 72;
            const minListHeightMobile = 120;
            const maxListHeightMobile = 280;
            const availableBelowMobile = Math.max(
                minListHeightMobile,
                Math.floor(viewportHeight - rect.bottom - safeGap - dropdownFixedPartMobile)
            );

            dropdown.classList.remove('dropdown-open-up');
            list.style.maxHeight = `${Math.min(availableBelowMobile, maxListHeightMobile)}px`;
            return;
        }

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

    function closeDropdown(type) {
        const dropdown = getEl(`dropdown-${type}`);
        const icon = getEl(`icon-${type}`);
        const list = getEl(`list-${type}`);
        if (!dropdown) return;

        dropdown.classList.add('hidden');
        dropdown.classList.remove('dropdown-open-up');
        if (icon) icon.classList.remove('rotate-180');
        if (list) list.style.maxHeight = '';
    }

    function closeAllDropdowns(exceptType = null) {
        dropdownTypes.forEach((type) => {
            if (type !== exceptType) {
                closeDropdown(type);
            }
        });
    }

    function renderList(type, data, idKey, nameKey, filterQuery = '') {
        const list = getEl(`list-${type}`);
        if (!list) return;

        const lowerQuery = filterQuery.toLocaleLowerCase('tr-TR');
        const filtered = data.filter((item) =>
            (item.__searchName || item[nameKey].toLocaleLowerCase('tr-TR')).includes(lowerQuery)
        );

        if (filtered.length === 0) {
            list.innerHTML = `<li class="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">${getNoResultsText()}</li>`;
            return;
        }

        list.innerHTML = filtered.map((item) => `
                <li>
                    <button type="button" onclick="selectItem('${type}', '${item[idKey]}', '${item[nameKey].replace(/'/g, "\\'")}')" class="w-full text-left px-4 py-3 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors truncate">
                        ${item[nameKey]}
                    </button>
                </li>
            `).join('');
    }

    function renderListByType(type, query = '') {
        const config = dropdownConfig[type];
        if (!config) return;

        const data = config.getData();
        renderList(type, data, config.idKey, config.nameKey, query);
    }

    function filterDropdown(type, query) {
        if (!dropdownConfig[type]) return;

        if (searchDebounceTimers[type]) {
            clearTimeout(searchDebounceTimers[type]);
        }

        const normalizedQuery = typeof query === 'string' ? query : '';
        searchDebounceTimers[type] = setTimeout(() => {
            renderListByType(type, normalizedQuery);
            searchDebounceTimers[type] = null;
        }, 90);
    }

    function toggleDropdown(type) {
        closeAllDropdowns(type);

        const btn = getEl(`btn-${type}`);
        if (btn.disabled) return;

        const dropdown = getEl(`dropdown-${type}`);
        const icon = getEl(`icon-${type}`);
        const search = getEl(`search-${type}`);

        dropdown.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');

        if (!dropdown.classList.contains('hidden')) {
            search.value = '';
            renderListByType(type);
            applyDropdownLayout(type);
            setTimeout(() => search.focus(), 100);
        } else {
            closeDropdown(type);
        }
    }

    function selectItem(type, id, name) {
        if (searchDebounceTimers[type]) {
            clearTimeout(searchDebounceTimers[type]);
            searchDebounceTimers[type] = null;
        }

        getEl(`text-${type}`).innerText = name;
        closeDropdown(type);
        onSelect(type, id, name);
    }

    function prepareSearchIndex(data, nameKey) {
        data.forEach((item) => {
            const sourceName = item?.[nameKey] ?? '';
            if (item.__searchSource === sourceName && item.__searchName) {
                return;
            }

            item.__searchSource = sourceName;
            item.__searchName = sourceName.toLocaleLowerCase('tr-TR');
        });
    }

    return {
        applyDropdownLayout,
        closeAllDropdowns,
        filterDropdown,
        prepareSearchIndex,
        selectItem,
        toggleDropdown
    };
}
