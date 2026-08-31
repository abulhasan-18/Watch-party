import { createClient } from "@supabase/supabase-js";

// Custom storage provider that safely handles Node 22 SSR vs Browser environments
const safeStorage = {
  getItem: (key: string): string | null => {
    if (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined" &&
      typeof window.localStorage.getItem === "function"
    ) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined" &&
      typeof window.localStorage.setItem === "function"
    ) {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
  },
  removeItem: (key: string): void => {
    if (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined" &&
      typeof window.localStorage.removeItem === "function"
    ) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
  },
};

const isBrowser = typeof window !== "undefined";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
      storage: safeStorage,
    },
  }
);
