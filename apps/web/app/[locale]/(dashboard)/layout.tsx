import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { SidebarShell } from "@/components/sidebar-shell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const t = await getTranslations();

  async function signOut() {
    "use server";
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect(`/${locale}/auth/login`);
  }

  return (
    <SidebarShell
      locale={locale}
      userEmail={user.email ?? ""}
      signOut={signOut}
      navLabels={{
        dashboard: t("nav.dashboard"),
        agents: t("nav.agents"),
        calls: t("nav.calls"),
        billing: t("nav.billing"),
        settings: t("nav.settings"),
        signOut: t("auth.signOut"),
      }}
    >
      {children}
    </SidebarShell>
  );
}
