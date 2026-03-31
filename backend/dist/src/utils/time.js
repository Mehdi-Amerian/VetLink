"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zone = exports.toLocal = exports.toUtc = exports.SAME_DAY_BOOKING_LEAD_MINUTES = void 0;
exports.parseClientToUtc = parseClientToUtc;
exports.isSameClinicDay = isSameClinicDay;
exports.isBeforeSameDayLeadTime = isBeforeSameDayLeadTime;
const date_fns_tz_1 = require("date-fns-tz");
const ZONE = 'Europe/Helsinki';
exports.SAME_DAY_BOOKING_LEAD_MINUTES = 30;
function parseClientToUtc(input) {
    const hasTz = /[zZ]$|[+\-]\d{2}:\d{2}$/.test(input);
    return hasTz ? new Date(input) : (0, date_fns_tz_1.fromZonedTime)(input, ZONE);
}
const toUtc = (localISO) => (0, date_fns_tz_1.fromZonedTime)(localISO, ZONE);
exports.toUtc = toUtc;
const toLocal = (utcISO) => (0, date_fns_tz_1.toZonedTime)(typeof utcISO === 'string' ? new Date(utcISO) : utcISO, ZONE);
exports.toLocal = toLocal;
function isSameClinicDay(aUtc, bUtc) {
    const a = (0, exports.toLocal)(aUtc);
    const b = (0, exports.toLocal)(bUtc);
    return (a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate());
}
function isBeforeSameDayLeadTime(startUtc, nowUtc = new Date(), leadMinutes = exports.SAME_DAY_BOOKING_LEAD_MINUTES) {
    if (!isSameClinicDay(startUtc, nowUtc)) {
        return false;
    }
    const earliestAllowed = nowUtc.getTime() + leadMinutes * 60000;
    return startUtc.getTime() < earliestAllowed;
}
exports.zone = ZONE;
