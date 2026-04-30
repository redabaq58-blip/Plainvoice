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

type ProductSection = {
  title: string;
  body: string;
  icon: typeof Bot;
};

type LandingContent = {
  nav: {
    product: string;
    industries: string;
    demo: string;
  };
  ctas: {
    demo: string;
    partner: string;
    founder: string;
    contact: string;
  };
  hero: {
    title: string;
    body: string;
    badges: string[];
    status: string;
  };
  panel: {
    title: string;
    subtitle: string;
    status: string;
    stats: [string, string][];
    events: [string, string][];
  };
  owner: {
    title: string;
    body: string;
    outcomes: string[];
  };
  product: {
    title: string;
    body: string;
    sections: ProductSection[];
  };
  industries: {
    title: string;
    body: string;
    verticals: string[];
  };
  demo: {
    title: string;
    body: string;
    pathsTitle: string;
    frenchTour: string;
    englishTour: string;
    guidedDashboard: string;
    founderContact: string;
  };
};

const contactEmail = "redabaq58@gmail.com";

function contactHref(subject: string) {
  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`;
}

export const englishContent: LandingContent = {
  nav: {
    product: "Product",
    industries: "Industries",
    demo: "Demo",
  },
  ctas: {
    demo: "Request a demo",
    partner: "Partner with us",
    founder: "Talk to the founder",
    contact: "Founder contact",
  },
  hero: {
    title: "AI front desk and follow-up engine for small and medium businesses.",
    body: "PlainVoice gives your business a 24/7 receptionist, lead capture assistant, booking coordinator, and follow-up system. It answers calls, captures leads, books appointments, sends SMS follow-ups, creates tasks, and shows the owner exactly what happened.",
    badges: [
      "Built for Canada, Quebec, and North America",
      "English and French workflows",
    ],
    status:
      "PlainVoice is currently available for guided demos and implementation partners.",
  },
  panel: {
    title: "Today at PlainVoice Demo",
    subtitle: "Owner digest",
    status: "Live workflow",
    stats: [
      ["18", "calls handled"],
      ["7", "new contacts"],
      ["5", "tasks created"],
    ],
    events: [
      ["Urgent call", "Water leak reported. Task created for owner follow-up."],
      ["Booked appointment", "New client scheduled a consultation for Thursday."],
      ["SMS sent", "Follow-up instructions delivered after the call."],
    ],
  },
  owner: {
    title: "What it does for an owner",
    body: "PlainVoice is designed for busy local teams that cannot afford to miss calls, lose lead details, or forget follow-up.",
    outcomes: [
      "Answers calls when the team is busy",
      "Captures caller details and lead intent",
      "Books appointments when calendar setup is connected",
      "Sends SMS follow-up after calls",
      "Creates contacts and follow-up tasks",
      "Shows owners inbox items, actions, and automation logs",
    ],
  },
  product: {
    title: "A practical operating system for calls, leads, and follow-up.",
    body: "The product connects phone handling with the back-office actions owners care about: contacts, bookings, messages, tasks, and review.",
    sections: [
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
    ],
  },
  industries: {
    title: "Useful across real service businesses.",
    body: "PlainVoice is not limited to one local market. It supports bilingual, North American service workflows while staying practical for Canadian and Quebec businesses.",
    verticals: [
      "Dental",
      "Med spa",
      "Auto repair",
      "Real estate",
      "Home services",
      "Legal office",
      "Restaurant",
      "HVAC / plumbing",
    ],
  },
  demo: {
    title: "Public demo ready without signup.",
    body: "The live web demo can start with this public tour. A deeper staging dashboard can be connected with Vercel, Railway, and Supabase when provider credentials are ready.",
    pathsTitle: "Demo paths",
    frenchTour: "French product tour",
    englishTour: "English product tour",
    guidedDashboard: "Dashboard available in guided demo",
    founderContact: "Founder contact",
  },
};

export const frenchContent: LandingContent = {
  nav: {
    product: "Produit",
    industries: "Secteurs",
    demo: "Demo",
  },
  ctas: {
    demo: "Demander une demo",
    partner: "Devenir partenaire",
    founder: "Parler au fondateur",
    contact: "Contacter le fondateur",
  },
  hero: {
    title: "Reception et suivis par IA pour les PME.",
    body: "PlainVoice donne a votre entreprise une reception 24/7, un assistant de capture de prospects, un coordinateur de rendez-vous et un systeme de suivi. Il repond aux appels, capture les demandes, reserve des rendez-vous, envoie des suivis SMS, cree des taches et montre au proprietaire exactement ce qui s'est passe.",
    badges: [
      "Concu pour le Canada, le Quebec et l'Amerique du Nord",
      "Flux de travail en francais et en anglais",
    ],
    status:
      "PlainVoice est actuellement disponible pour des demos guidees et des partenaires d'implementation.",
  },
  panel: {
    title: "Aujourd'hui dans la demo PlainVoice",
    subtitle: "Resume proprietaire",
    status: "Flux actif",
    stats: [
      ["18", "appels traites"],
      ["7", "nouveaux contacts"],
      ["5", "taches creees"],
    ],
    events: [
      ["Appel urgent", "Fuite d'eau signalee. Tache creee pour le suivi."],
      ["Rendez-vous reserve", "Nouveau client planifie pour jeudi."],
      ["SMS envoye", "Instructions de suivi envoyees apres l'appel."],
    ],
  },
  owner: {
    title: "Ce que PlainVoice fait pour un proprietaire",
    body: "PlainVoice aide les equipes locales occupees a ne pas manquer d'appels, perdre de details importants ou oublier les suivis.",
    outcomes: [
      "Repond aux appels quand l'equipe est occupee",
      "Capture les coordonnees et l'intention du prospect",
      "Reserve des rendez-vous lorsque le calendrier est connecte",
      "Envoie des suivis SMS apres les appels",
      "Cree des contacts et des taches de suivi",
      "Affiche les actions, la boite d'affaires et les journaux d'automatisation",
    ],
  },
  product: {
    title: "Un systeme pratique pour les appels, les prospects et les suivis.",
    body: "PlainVoice relie la reception telephonique aux actions qui comptent: contacts, rendez-vous, messages, taches et revue des appels.",
    sections: [
      {
        title: "Receptionniste IA",
        body: "Une reception 24/7 pour les questions courantes, la capture de prospects, les rendez-vous et le transfert humain.",
        icon: Bot,
      },
      {
        title: "CRM",
        body: "Les contacts sont crees a partir des conversations pour garder noms, numeros, notes et contexte.",
        icon: UserRoundPlus,
      },
      {
        title: "Rendez-vous",
        body: "Les flux connectes au calendrier aident les appelants a choisir un moment et donnent une trace claire au proprietaire.",
        icon: CalendarCheck,
      },
      {
        title: "Suivi SMS",
        body: "Les messages de suivi peuvent etre envoyes apres les appels, avec l'historique visible dans le tableau de bord.",
        icon: MessageSquareText,
      },
      {
        title: "Boite d'affaires",
        body: "Appels manques, urgences, echecs SMS, transferts et revues sont rassembles dans une surface d'action.",
        icon: Inbox,
      },
      {
        title: "Journaux d'automatisation",
        body: "L'app enregistre ce qui s'est passe apres l'appel pour voir quels flux ont fonctionne.",
        icon: Activity,
      },
      {
        title: "Recettes de workflow",
        body: "Des modeles reutilisables aident a configurer les suivis selon le type d'entreprise.",
        icon: ListChecks,
      },
      {
        title: "Revue qualite des appels",
        body: "Les appels peuvent etre revises selon le resultat, l'urgence, le suivi requis et les signaux de qualite.",
        icon: ClipboardCheck,
      },
      {
        title: "Console d'implementation client",
        body: "Un espace de configuration pour le profil d'entreprise, les agents, les numeros, les reglages et la preparation au lancement.",
        icon: Settings2,
      },
    ],
  },
  industries: {
    title: "Utile pour de vraies entreprises de services.",
    body: "PlainVoice n'est pas limite a un seul marche local. Il soutient les operations bilingues nord-americaines tout en restant pratique pour les entreprises canadiennes et quebecoises.",
    verticals: [
      "Dentaire",
      "Med spa",
      "Reparation auto",
      "Immobilier",
      "Services a domicile",
      "Bureau juridique",
      "Restaurant",
      "CVAC / plomberie",
    ],
  },
  demo: {
    title: "Demo publique sans inscription.",
    body: "La demo web peut commencer avec cette visite publique. Un tableau de bord de staging plus complet peut etre connecte avec Vercel, Railway et Supabase lorsque les identifiants fournisseurs sont prets.",
    pathsTitle: "Parcours de demo",
    frenchTour: "Visite produit en francais",
    englishTour: "Visite produit en anglais",
    guidedDashboard: "Tableau de bord disponible en demo guidee",
    founderContact: "Contacter le fondateur",
  },
};

function DemoPanel({ content }: { content: LandingContent["panel"] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{content.title}</p>
          <p className="text-xs text-slate-500">{content.subtitle}</p>
        </div>
        <div className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
          {content.status}
        </div>
      </div>

      <div className="grid gap-3 py-4 sm:grid-cols-3">
        {content.stats.map(([value, label]) => (
          <div key={label} className="rounded-md bg-slate-50 p-3">
            <div className="text-2xl font-semibold text-slate-950">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {content.events.map(([title, body]) => (
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

export function PlainVoiceLanding({ content }: { content: LandingContent }) {
  const demoHref = contactHref("PlainVoice demo request");
  const partnerHref = contactHref("PlainVoice partner conversation");
  const founderHref = contactHref("PlainVoice founder conversation");

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          PlainVoice
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          <a href="#product">{content.nav.product}</a>
          <a href="#industries">{content.nav.industries}</a>
          <a href="#deployment">{content.nav.demo}</a>
        </nav>
        <a
          href={demoHref}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          {content.ctas.demo}
        </a>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pt-16">
        <div>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
            {content.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            {content.hero.body}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={demoHref}
              className="rounded-md bg-slate-950 px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {content.ctas.demo}
            </a>
            <a
              href={partnerHref}
              className="rounded-md border border-slate-300 px-5 py-3 text-center text-sm font-medium text-slate-900 transition hover:border-slate-500"
            >
              {content.ctas.partner}
            </a>
            <a
              href={founderHref}
              className="rounded-md border border-slate-300 px-5 py-3 text-center text-sm font-medium text-slate-900 transition hover:border-slate-500"
            >
              {content.ctas.founder}
            </a>
          </div>
          <p className="mt-5 max-w-2xl rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
            {content.hero.status}
          </p>
          <div className="mt-8 flex flex-wrap gap-2 text-sm text-slate-600">
            {content.hero.badges.map((badge) => (
              <span key={badge} className="rounded-md border border-slate-300 bg-white px-3 py-1.5">
                {badge}
              </span>
            ))}
          </div>
        </div>
        <DemoPanel content={content.panel} />
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              {content.owner.title}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              {content.owner.body}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {content.owner.outcomes.map((outcome) => (
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
            {content.product.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {content.product.body}
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {content.product.sections.map(({ title, body, icon: Icon }) => (
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
              {content.industries.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              {content.industries.body}
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {content.industries.verticals.map((vertical) => (
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
              {content.demo.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              {content.demo.body}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-950">{content.demo.pathsTitle}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link className="rounded-md bg-slate-50 p-4 text-sm font-medium text-slate-900 hover:bg-slate-100" href="/fr">
                {content.demo.frenchTour}
              </Link>
              <Link className="rounded-md bg-slate-50 p-4 text-sm font-medium text-slate-900 hover:bg-slate-100" href="/en">
                {content.demo.englishTour}
              </Link>
              <a className="rounded-md bg-slate-50 p-4 text-sm font-medium text-slate-900 hover:bg-slate-100" href={demoHref}>
                {content.demo.guidedDashboard}
              </a>
              <a className="rounded-md bg-slate-50 p-4 text-sm font-medium text-slate-900 hover:bg-slate-100" href={founderHref}>
                {content.demo.founderContact}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  return <PlainVoiceLanding content={englishContent} />;
}
