import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@repo/database";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { createSupabaseServerClient } from "@/lib/supabase";

export const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

export function createServiceRoleClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase service role configuration");
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createContactsSupabaseClient(): Promise<SupabaseClient<Database>> {
  return isAuthBypassed()
    ? createServiceRoleClient()
    : await createSupabaseServerClient();
}

export async function getCurrentOrgId() {
  if (isAuthBypassed()) {
    return DEMO_ORG_ID;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  return member?.org_id ?? null;
}
