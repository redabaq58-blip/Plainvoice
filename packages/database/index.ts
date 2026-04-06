import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import { createServerClient as _createServerClient } from "@supabase/ssr";
import type { CookieMethodsServer } from "@supabase/ssr";

export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "./types";
import type { Database } from "./types";

// ---------------------------------------------------------------------------
// Browser client — singleton, uses cookie-based session storage
// ---------------------------------------------------------------------------
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return _createBrowserClient<Database>(url, key);
}

// ---------------------------------------------------------------------------
// Server client — per-request, requires cookie handlers
// ---------------------------------------------------------------------------
export function createServerClient(cookies: CookieMethodsServer) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return _createServerClient<Database>(url, key, { cookies });
}

export type { CookieMethodsServer };
