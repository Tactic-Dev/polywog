export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}

export function safeCall<T>(fn: () => T | Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then((value) => ({ ok: true as const, value }))
        .catch((err: unknown) => ({ ok: false as const, error: toErrorMessage(err) }));
    }
    return Promise.resolve({ ok: true as const, value: result });
  } catch (err) {
    return Promise.resolve({ ok: false as const, error: toErrorMessage(err) });
  }
}
