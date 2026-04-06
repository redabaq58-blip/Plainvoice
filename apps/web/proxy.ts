import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@repo/database";
import type { CookieMethodsServer } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

type SetAllArg = Parameters<NonNullable<CookieMethodsServer["setAll"]>>[0];

export default async function proxy(request: NextRequest) {
  // 1. Run next-intl first — get the locale-aware response we will ultimately return
  const intlResponse = createIntlMiddleware(routing)(request);

  // 2. Supabase session refresh:
  //    Read cookies from incoming request, write refreshed cookies onto intlResponse.
  //    This ensures both locale headers and refreshed auth cookies survive in one response.
  const supabase = createServerClient({
    getAll: () => request.cookies.getAll(),
    setAll: (toSet: SetAllArg) =>
      toSet.forEach(({ name, value, options }) =>
        intlResponse.cookies.set(name, value, options)
      ),
  });

  // Always use getUser() — validates with auth server; getSession() only reads the cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Auth guards
  const { pathname } = request.nextUrl;
  const locale = pathname.split("/")[1] ?? "fr";
  const isDashboard =
    /^\/(en|fr)\/(dashboard|agents|calls|billing|settings)/.test(pathname);
  const isAuth = /^\/(en|fr)\/auth/.test(pathname);

  if (isDashboard && !user) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/login`, request.url)
    );
  }
  if (isAuth && user) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // 4. Return the next-intl response carrying the refreshed Supabase cookies
  return intlResponse;
}

export const config = {
  // /auth/callback is excluded so Supabase OAuth redirect lands directly on the route handler
  // without next-intl rewriting it to /fr/auth/callback or /en/auth/callback.
  matcher: ["/((?!auth/callback|api|_next|_vercel|.*\\..*).*)" ],
};
