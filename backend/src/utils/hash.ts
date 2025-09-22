import crypto from 'crypto';

// Ensure consistent key ordering for objects
function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  const entries = keys.map((k) => `"${k}":${stableStringify(value[k])}`);
  return `{${entries.join(',')}}`;
}

// Hash a JSON-serializable value with SHA-256, returning a hex string
export function hashJsonStable(value: unknown): string {
  const json = stableStringify(value);
  return crypto.createHash('sha256').update(json).digest('hex');
}
