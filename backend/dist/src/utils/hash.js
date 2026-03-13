"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashJsonStable = hashJsonStable;
const crypto_1 = __importDefault(require("crypto"));
// Ensure consistent key ordering for objects
function stableStringify(value) {
    if (value === null || typeof value !== 'object')
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(stableStringify).join(',')}]`;
    const keys = Object.keys(value).sort();
    const entries = keys.map((k) => `"${k}":${stableStringify(value[k])}`);
    return `{${entries.join(',')}}`;
}
// Hash a JSON-serializable value with SHA-256, returning a hex string
function hashJsonStable(value) {
    const json = stableStringify(value);
    return crypto_1.default.createHash('sha256').update(json).digest('hex');
}
