// Fix for Node.js 22 uninitialized globalThis.localStorage during SSR
if (
  typeof globalThis !== "undefined" &&
  (typeof globalThis.localStorage === "undefined" ||
    typeof globalThis.localStorage.getItem !== "function")
) {
  const store = new Map<string, string>();
  try {
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, String(value)),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        get length() {
          return store.size;
        },
      },
      writable: true,
      configurable: true,
    });
  } catch {
    // If not configurable, assign directly
    const target = globalThis as Record<string, unknown>;
    target.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
  }
}

export {};
