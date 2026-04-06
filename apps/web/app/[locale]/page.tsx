import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold tracking-tight">PlainVoice</h1>
      <p className="mt-4 text-muted-foreground">
        {t("common.loading")}
      </p>
      <nav className="mt-8 flex gap-4">
        <span>{t("nav.dashboard")}</span>
        <span>{t("nav.agents")}</span>
        <span>{t("nav.calls")}</span>
        <span>{t("nav.billing")}</span>
        <span>{t("nav.settings")}</span>
      </nav>
    </main>
  );
}
