"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zone = exports.toLocal = exports.toUtc = void 0;
exports.parseClientToUtc = parseClientToUtc;
const date_fns_tz_1 = require("date-fns-tz");
const ZONE = 'Europe/Helsinki';
function parseClientToUtc(input) {
    const hasTz = /[zZ]$|[+\-]\d{2}:\d{2}$/.test(input);
    return hasTz ? new Date(input) : (0, date_fns_tz_1.fromZonedTime)(input, ZONE);
}
const toUtc = (localISO) => (0, date_fns_tz_1.fromZonedTime)(localISO, ZONE);
exports.toUtc = toUtc;
const toLocal = (utcISO) => (0, date_fns_tz_1.toZonedTime)(typeof utcISO === 'string' ? new Date(utcISO) : utcISO, ZONE);
exports.toLocal = toLocal;
exports.zone = ZONE;
