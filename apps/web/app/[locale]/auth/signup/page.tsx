import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { Database } from "@repo/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function SignupPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { error } = await searchParams;
  const t = await getTranslations("auth.signup");

  async function signUp(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const orgName = formData.get("orgName") as string;

    if (password !== confirmPassword) {
      redirect(`/${locale}/auth/signup?error=mismatch`);
    }

    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      redirect(`/${locale}/auth/signup?error=signup`);
    }

    const userId = authData.user.id;

    // Service-role client for org + member inserts — RLS blocks them before member row exists
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminClient = createClient<Database>(serviceUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: org, error: orgError } = await adminClient
      .from("organizations")
      .insert({ name: orgName, slug: slugify(orgName) })
      .select("id")
      .single();

    if (orgError || !org) {
      redirect(`/${locale}/auth/signup?error=org`);
    }

    const { error: memberError } = await adminClient
      .from("organization_members")
      .insert({ org_id: org.id, user_id: userId, role: "owner" });

    if (memberError) {
      redirect(`/${locale}/auth/signup?error=member`);
    }

    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error === "mismatch" ? t("errorMismatch") : t("errorMismatch")}
              </AlertDescription>
            </Alert>
          )}

          <form action={signUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">{t("orgNameLabel")}</Label>
              <Input
                id="orgName"
                name="orgName"
                type="text"
                placeholder={t("orgNamePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("passwordLabel")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t("confirmPasswordLabel")}
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder={t("confirmPasswordPlaceholder")}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {t("submitButton")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href={`/${locale}/auth/login`}
              className="underline underline-offset-4 hover:text-primary"
            >
              {t("loginLink")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
