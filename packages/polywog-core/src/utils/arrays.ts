export function compact<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter((v): v is T => v != null);
}

export function pushIfPresent<T>(arr: T[], value: T | null | undefined): void {
  if (value != null) arr.push(value);
}
