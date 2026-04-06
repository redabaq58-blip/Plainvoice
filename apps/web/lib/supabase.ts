import { cookies } from "next/headers";
import { createServerClient } from "@repo/database";
import type { CookieMethodsServer } from "@supabase/ssr";

// Explicit type for the setAll callback argument (from @supabase/ssr, which is in web's node_modules)
type SetAllArg = Parameters<NonNullable<CookieMethodsServer["setAll"]>>[0];

/**
 * Creates a typed Supabase server client using the current request's cookies.
 * Always use getUser() after this — never getSession() — to validate server-side.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet: SetAllArg) =>
      toSet.forEach(({ name, value, options }) =>
        cookieStore.set(name, value, options)
      ),
  });
}
