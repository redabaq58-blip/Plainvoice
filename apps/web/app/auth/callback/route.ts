import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Validate `next` to prevent open redirect — must be a relative internal path
  const next = searchParams.get("next");
  const safePath =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/fr/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/fr/auth/login?error=no_code", origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/fr/auth/login?error=oauth_exchange", origin)
    );
  }

  return NextResponse.redirect(new URL(safePath, origin));
}
