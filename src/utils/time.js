export function formatDateKey(date) {
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

export function timeToMs(timeStr, dayStartMs) {
    const [hourPart, minutePart] = timeStr.split(':');
    const hour = Number(hourPart);
    const minute = Number(minutePart);
    return dayStartMs + ((hour * 60 + minute) * 60000);
}

export function parseMiladiDate(dateKey) {
    const [day, month, year] = dateKey.split('.').map(Number);
    return new Date(year, month - 1, day);
}
