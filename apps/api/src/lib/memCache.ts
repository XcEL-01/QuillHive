interface Entry<T> {
  value: T;
  expiresAt: number;
}

const MAX_ENTRIES = 500;
const store = new Map<string, Entry<unknown>>();

export function memGet<T>(key: string): T | null {
  const e = store.get(key) as Entry<T> | undefined;
  if (!e) return null;
  if (e.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  store.delete(key);
  store.set(key, e);
  return e.value;
}

export function memSet<T>(key: string, value: T, ttlSeconds: number): void {
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function memDeletePattern(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

export function memSize(): number {
  return store.size;
}
