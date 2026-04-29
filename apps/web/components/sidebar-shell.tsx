"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Inbox,
  ListChecks,
  Activity,
  Contact,
  Bot,
  Phone,
  PhoneCall,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NavLabels = {
  dashboard: string;
  inbox: string;
  onboarding: string;
  activity: string;
  contacts: string;
  agents: string;
  calls: string;
  phoneNumbers: string;
  settings: string;
  signOut: string;
};

type Props = {
  locale: string;
  userEmail: string;
  signOut: () => Promise<void>;
  navLabels: NavLabels;
  children: React.ReactNode;
};

const navItems = (locale: string, labels: NavLabels) => [
  { href: `/${locale}/dashboard`, label: labels.dashboard, icon: LayoutDashboard },
  { href: `/${locale}/inbox`, label: labels.inbox, icon: Inbox },
  { href: `/${locale}/onboarding`, label: labels.onboarding, icon: ListChecks },
  { href: `/${locale}/activity`, label: labels.activity, icon: Activity },
  { href: `/${locale}/contacts`, label: labels.contacts, icon: Contact },
  { href: `/${locale}/agents`, label: labels.agents, icon: Bot },
  { href: `/${locale}/calls`, label: labels.calls, icon: Phone },
  { href: `/${locale}/phone-numbers`, label: labels.phoneNumbers, icon: PhoneCall },
  { href: `/${locale}/settings`, label: labels.settings, icon: Settings },
];

function NavContent({
  locale,
  userEmail,
  signOut,
  navLabels,
}: Omit<Props, "children">) {
  const pathname = usePathname();
  const router = useRouter();

  const items = navItems(locale, navLabels);

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-4 py-5">
        <span className="text-xl font-bold tracking-tight">PlainVoice</span>
      </div>
      <Separator />

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Language switcher + user */}
      <div className="px-4 py-4 space-y-3">
        <div className="flex gap-2">
          <Button
            variant={locale === "fr" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const withoutLocale = pathname.replace(/^\/(fr|en)/, "");
              router.push(`/fr${withoutLocale}`);
            }}
          >
            FR
          </Button>
          <Button
            variant={locale === "en" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const withoutLocale = pathname.replace(/^\/(fr|en)/, "");
              router.push(`/en${withoutLocale}`);
            }}
          >
            EN
          </Button>
        </div>

        <div className="text-xs text-muted-foreground truncate">{userEmail}</div>

        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            {navLabels.signOut}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function SidebarShell({
  locale,
  userEmail,
  signOut,
  navLabels,
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r lg:flex lg:flex-col">
        <NavContent
          locale={locale}
          userEmail={userEmail}
          signOut={signOut}
          navLabels={navLabels}
        />
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b px-4 py-3 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <NavContent
                locale={locale}
                userEmail={userEmail}
                signOut={signOut}
                navLabels={navLabels}
              />
            </SheetContent>
          </Sheet>
          <span className="font-semibold">PlainVoice</span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
