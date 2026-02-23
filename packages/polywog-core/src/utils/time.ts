export function nowMs(): number {
  return Date.now();
}

export function elapsedMs(start: number): number {
  return Date.now() - start;
}

export function isoNow(): string {
  return new Date().toISOString();
}
