import { parseISO, format, addDays as fnsAddDays, differenceInCalendarDays, startOfDay, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';

export const parseDateString = (dateString) => {
    if (!dateString) return null;
    return startOfDay(parseISO(dateString));
};

export const formatDateString = (dateObj) => {
    if (!dateObj) return null;
    return format(dateObj, 'yyyy-MM-dd');
};

export const addDays = (dateString, days) => {
    if (!dateString) return null;
    const date = parseDateString(dateString);
    return formatDateString(fnsAddDays(date, Math.round(days)));
};

export const diffDays = (dateString1, dateString2) => {
    if (!dateString1 || !dateString2) return null;
    const d1 = parseDateString(dateString1);
    const d2 = parseDateString(dateString2);
    return differenceInCalendarDays(d1, d2);
};

export const toUIDate = (dateString) => {
    if (!dateString) return '';
    const date = parseDateString(dateString);
    return format(date, 'dd/MM/yyyy');
};

export const formatUIDateLong = (dateString) => {
    if (!dateString) return '';
    const date = parseDateString(dateString);
    return format(date, 'eee dd MMM', { locale: fr });
};

export const getTodayDateString = () => {
    return formatDateString(new Date());
};

export const getEasterDate = (year) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
};

export const getFrenchHolidaysForYear = (year) => {
    const easter = getEasterDate(year);
    const easterMonday = fnsAddDays(easter, 1);
    const ascension = fnsAddDays(easter, 39);
    const pentecost = fnsAddDays(easter, 50);

    return [
        `${year}-01-01`, // Jour de l'an
        `${year}-05-01`, // Fête du travail
        `${year}-05-08`, // Victoire 1945
        `${year}-07-14`, // Fête nationale
        `${year}-08-15`, // Assomption
        `${year}-11-01`, // Toussaint
        `${year}-11-11`, // Armistice
        `${year}-12-25`, // Noël
        formatDateString(easterMonday),
        formatDateString(ascension),
        formatDateString(pentecost)
    ];
};

export const getFrenchHolidays = (baseYear) => {
    const y = baseYear || new Date().getFullYear();
    const all = [
        ...getFrenchHolidaysForYear(y - 1),
        ...getFrenchHolidaysForYear(y),
        ...getFrenchHolidaysForYear(y + 1),
        ...getFrenchHolidaysForYear(y + 2),
        ...getFrenchHolidaysForYear(y + 3)
    ];
    return all.sort();
};

export const addWorkDays = (dateString, daysObj, holidays = []) => {
    if (!dateString) return null;
    let current = parseDateString(dateString);
    let daysToAdd = Math.round(daysObj);

    if (daysToAdd === 0) return formatDateString(current);

    const sign = daysToAdd < 0 ? -1 : 1;
    let daysRemaining = Math.abs(daysToAdd);

    while (daysRemaining > 0) {
        current = fnsAddDays(current, sign);
        const currentStr = formatDateString(current);
        if (!isWeekend(current) && !holidays.includes(currentStr)) {
            daysRemaining--;
        }
    }
    return formatDateString(current);
};

export const diffWorkDays = (dateString1, dateString2, holidays = []) => {
    if (!dateString1 || !dateString2) return null;
    let d1 = parseDateString(dateString1);
    let d2 = parseDateString(dateString2);
    if (d1.getTime() === d2.getTime()) return 0;

    let count = 0;
    const isForward = d1 < d2;
    let current = isForward ? d1 : d2;
    const end = isForward ? d2 : d1;

    while (current < end) {
        current = fnsAddDays(current, 1);
        const currentStr = formatDateString(current);
        if (!isWeekend(current) && !holidays.includes(currentStr)) {
            count++;
        }
    }
    return isForward ? count : -count;
};

export const getDateOffset = (projectStartDate, targetDate, ignoreWeekends, holidays = []) => {
    if (!projectStartDate || !targetDate) return null;

    return ignoreWeekends
        ? diffWorkDays(projectStartDate, targetDate, holidays)
        : diffDays(targetDate, projectStartDate);
};

export const offsetToStartDate = (projectStartDate, offset, ignoreWeekends, holidays = []) => {
    if (!projectStartDate || offset === null || offset === undefined) return null;

    const dayOffset = Math.max(0, Math.floor(offset));
    return ignoreWeekends
        ? addWorkDays(projectStartDate, dayOffset, holidays)
        : addDays(projectStartDate, dayOffset);
};

export const offsetToEndDate = (projectStartDate, offset, ignoreWeekends, holidays = []) => {
    if (!projectStartDate || offset === null || offset === undefined) return null;

    const dayOffset = Math.max(0, Math.ceil(offset) - 1);
    return ignoreWeekends
        ? addWorkDays(projectStartDate, dayOffset, holidays)
        : addDays(projectStartDate, dayOffset);
};

export const getDaysBetween = (startDateString, endDateString) => {
    if (!startDateString || !endDateString) return [];

    const start = parseDateString(startDateString);
    const end = parseDateString(endDateString);
    const daysArr = [];

    let current = start;
    while (current <= end) {
        daysArr.push({
            dateString: formatDateString(current),
            dateObj: new Date(current),
            isWeekend: isWeekend(current)
        });
        current = fnsAddDays(current, 1);
    }

    return daysArr;
};

export const formatMonthYear = (dateObj) => {
    return format(dateObj, 'MMM yyyy', { locale: fr });
};
