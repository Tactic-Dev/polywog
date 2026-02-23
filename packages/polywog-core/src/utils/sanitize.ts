const SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'apiKey', 'api_key',
  'authorization', 'credential', 'private_key', 'privateKey',
]);

export function sanitizeForDebug(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[max depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > 500 ? value.slice(0, 500) + '…[truncated]' : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    const capped = value.slice(0, 20);
    const sanitized = capped.map((v) => sanitizeForDebug(v, depth + 1));
    if (value.length > 20) sanitized.push(`…[${value.length - 20} more]`);
    return sanitized;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[redacted]';
      } else {
        out[k] = sanitizeForDebug(v, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}
