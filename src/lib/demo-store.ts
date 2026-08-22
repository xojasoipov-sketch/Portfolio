/**
 * Per-visitor persistence for the /demo page.
 *
 * localStorage rather than a table: the demo's clients and bookings are the
 * visitor's own scratch data, and nobody should have to think about what
 * happens to a stranger's typing. It stays in their browser, it never reaches
 * a server, and clearing site data is a complete delete.
 *
 * Every call is guarded twice — once for the prerender pass, which has no
 * `window` at all, and once for browsers where storage throws rather than
 * returning null (private mode, site data blocked). A demo that cannot save
 * should still run; it just forgets between reloads.
 */
const PREFIX = "sx-demo:v1:";

function store(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadDemo<T>(key: string, fallback: T): T {
  try {
    const raw = store()?.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Returns false when the value could not be persisted, so callers can say so. */
export function saveDemo(key: string, value: unknown): boolean {
  try {
    const s = store();
    if (!s) return false;
    s.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearDemo(key: string): void {
  try {
    store()?.removeItem(PREFIX + key);
  } catch {
    /* nothing to do: the value was never stored */
  }
}
