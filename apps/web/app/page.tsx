import Link from "next/link";
import {
  Activity,
  Bot,
  CalendarCheck,
  ClipboardCheck,
  Inbox,
  ListChecks,
  MessageSquareText,
  Phone,
  Settings2,
  UserRoundPlus,
} from "lucide-react";

const contactHref =
  "mailto:hello@plainvoice.ai?subject=PlainVoice%20demo%20request";

const verticals = [
  "Dental",
  "Med spa",
  "Auto repair",
  "Real estate",
  "Home services",
  "Legal office",
  "Restaurant",
  "HVAC / plumbing",
];

const outcomes = [
  "Answers calls when the team is busy",
  "Captures caller details and lead intent",
  "Books appointments when calendar setup is connected",
  "Sends SMS follow-up after calls",
  "Creates contacts and follow-up tasks",
  "Shows owners inbox items, actions, and automation logs",
];

const productSections = [
  {
    title: "AI receptionist",
    body: "A 24/7 front desk that handles common questions, lead capture, booking intent, and human handoff.",
    icon: Bot,
  },
  {
    title: "CRM",
    body: "Contacts are created from real conversations so the business has caller names, numbers, notes, and context.",
    icon: UserRoundPlus,
  },
  {
    title: "Booking",
    body: "Calendar-connected workflows help callers pick a time and give owners a clearer appointment trail.",
    icon: CalendarCheck,
  },
  {
    title: "SMS follow-up",
    body: "Follow-up messages can be sent after calls, with delivery history visible inside the dashboard.",
    icon: MessageSquareText,
  },
  {
    title: "Business inbox",
    body: "Missed calls, urgent issues, failed SMS, handoffs, and review items are gathered into one action surface.",
    icon: Inbox,
  },
  {
    title: "Automation logs",
    body: "The app records what happened after a call so the owner can see which workflows ran and which need attention.",
    icon: Activity,
  },
  {
    title: "Workflow recipes",
    body: "Reusable operating patterns help configure follow-up and service flows by business type.",
    icon: ListChecks,
  },
  {
    title: "Call quality review",
    body: "Calls can be reviewed for outcomes, urgency, follow-up need, and quality signals before deeper live testing.",
    icon: ClipboardCheck,
  },
  {
    title: "Client implementation console",
    body: "A setup surface supports business profile, agent configuration, phone numbers, settings, and launch readiness.",
    icon: Settings2,
  },
];

function DemoPanel() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Today at PlainVoice Demo</p>
          <p className="text-xs text-slate-500">Owner digest</p>
        </div>
        <div className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
          Live workflow
        </div>
      </div>

      <div className="grid gap-3 py-4 sm:grid-cols-3">
        {[
          ["18", "calls handled"],
          ["7", "new contacts"],
          ["5", "tasks created"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-md bg-slate-50 p-3">
            <div className="text-2xl font-semibold text-slate-950">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {[
          ["Urgent call", "Water leak reported. Task created for owner follow-up."],
          ["Booked appointment", "New client scheduled a consultation for Thursday."],
          ["SMS sent", "Follow-up instructions delivered after the call."],
        ].map(([title, body]) => (
          <div key={title} className="flex gap-3 rounded-md border border-slate-200 p-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <div>
              <p className="text-sm font-medium text-slate-950">{title}</p>
              <p className="text-sm text-slate-600">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          PlainVoice
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          <a href="#product">Product</a>
          <a href="#industries">Industries</a>
          <a href="#deployment">Demo</a>
        </nav>
        <a
          href={contactHref}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Request a demo
        </a>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pt-16">
        <div>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
            AI front desk and follow-up engine for small and medium businesses.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            PlainVoice gives your business a 24/7 receptionist, lead capture
            assistant, booking coordinator, and follow-up system. It answers
            calls, captures leads, books appointments, sends SMS follow-ups,
            creates tasks, and shows the owner exactly what happened.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={contactHref}
              className="rounded-md bg-slate-950 px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Request a demo
            </a>
            <a
              href={contactHref.replace("demo%20request", "partner%20conversation")}
              className="rounded-md border border-slate-300 px-5 py-3 text-center text-sm font-medium text-slate-900 transition hover:border-slate-500"
            >
              Partner with us
            </a>
            <a
              href={contactHref.replace("demo%20request", "founder%20conversation")}
              className="rounded-md border border-slate-300 px-5 py-3 text-center text-sm font-medium text-slate-900 transition hover:border-slate-500"
            >
              Talk to the founder
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="rounded-md border border-slate-300 bg-white px-3 py-1.5">
              Built for Canada, Quebec, and North America
            </span>
            <span className="rounded-md border border-slate-300 bg-white px-3 py-1.5">
              English and French workflows
            </span>
          </div>
        </div>
        <DemoPanel />
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              What it does for an owner
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              PlainVoice is designed for busy local teams that cannot afford to
              miss calls, lose lead details, or forget follow-up.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {outcomes.map((outcome) => (
              <div key={outcome} className="flex items-start gap-3 rounded-md bg-slate-50 p-4">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <p className="text-sm leading-6 text-slate-700">{outcome}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold text-slate-950">
            A practical operating system for calls, leads, and follow-up.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            The product connects phone handling with the back-office actions
            owners care about: contacts, bookings, messages, tasks, and review.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {productSections.map(({ title, body, icon: Icon }) => (
            <article key={title} className="rounded-lg border border-slate-200 bg-white p-5">
              <Icon className="h-5 w-5 text-emerald-700" />
              <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="industries" className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold">
              Useful across real service businesses.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              PlainVoice is not limited to one local market. It supports
              bilingual, North American service workflows while staying practical
              for Canadian and Quebec businesses.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {verticals.map((vertical) => (
              <div key={vertical} className="rounded-md border border-white/15 px-4 py-3 text-sm text-slate-100">
                {vertical}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="deployment" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold text-slate-950">
              Public demo ready without signup.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              The live web demo can start with this public tour. A deeper staging
              dashboard can be connected with Vercel, Railway, and Supabase when
              provider credentials are ready.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-950">Demo paths</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link className="rounded-md bg-slate-50 p-4 text-sm font-medium text-slate-900 hover:bg-slate-100" href="/fr">
                French product tour
              </Link>
              <Link className="rounded-md bg-slate-50 p-4 text-sm font-medium text-slate-900 hover:bg-slate-100" href="/en">
                English product tour
              </Link>
              <Link className="rounded-md bg-slate-50 p-4 text-sm font-medium text-slate-900 hover:bg-slate-100" href="/fr/dashboard">
                Staging dashboard
              </Link>
              <a className="rounded-md bg-slate-50 p-4 text-sm font-medium text-slate-900 hover:bg-slate-100" href={contactHref}>
                Founder contact
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
