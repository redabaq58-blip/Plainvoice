import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { SidebarShell } from "@/components/sidebar-shell";
import { isAuthBypassed } from "@/lib/auth-bypass";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  const authBypassed = isAuthBypassed();

  const supabase = authBypassed ? null : await createSupabaseServerClient();
  const user = authBypassed
    ? { email: "dev@plainvoice.local" }
    : (await supabase!.auth.getUser()).data.user;

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const t = await getTranslations();

  async function signOut() {
    "use server";
    if (isAuthBypassed()) {
      redirect(`/${locale}/dashboard`);
    }
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
        onboarding: t("nav.onboarding"),
        contacts: t("nav.contacts"),
        agents: t("nav.agents"),
        calls: t("nav.calls"),
        phoneNumbers: t("nav.phoneNumbers"),
        settings: t("nav.settings"),
        signOut: t("auth.signOut"),
      }}
    >
      {children}
    </SidebarShell>
  );
}
