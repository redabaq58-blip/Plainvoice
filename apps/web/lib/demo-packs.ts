/**
 * Industry Demo Packs.
 *
 * Each pack is a complete, opinionated configuration for a vertical so a new
 * user can go from "blank agent" to "test call" in under a minute.
 *
 * Packs populate fields the agent-create form already supports — no DB
 * migration, no backend changes. To extend: add a new entry to DEMO_PACKS and
 * label keys to messages/{fr,en}.json under agents.form.demoPack.packs.
 */

import {
  defaultKnowledgeBase,
  type KnowledgeBaseInput,
  type VoiceAgentCreateInput,
} from "@/lib/schemas/voice-agent";
import { getTemplate, getTemplatePrompt } from "@/lib/agent-templates";

export type DemoPackId =
  | "dental_clinic"
  | "med_spa"
  | "auto_repair"
  | "real_estate"
  | "home_services"
  | "legal_office"
  | "restaurant"
  | "hvac_plumbing";

export type DemoPack = {
  id: DemoPackId;
  vertical: VoiceAgentCreateInput["vertical"];
  language: VoiceAgentCreateInput["language"];
  suggestedName: string;
  firstMessageFr: string;
  firstMessageEn: string;
  firstMessageBilingual: string;
  knowledgeBase: KnowledgeBaseInput;
  /** Plain-text business hours per day, displayed in agent settings or KB. */
  businessHours: { day: string; hoursFr: string; hoursEn: string }[];
  /** SMS follow-up templates for the org settings (use {variables}). */
  smsTemplates: {
    afterCallFr: string;
    afterCallEn: string;
    missedFr: string;
    missedEn: string;
    bookingFr: string;
    bookingEn: string;
  };
  /** Industry-specific manual QA scenarios beyond the 13 generic ones. */
  qaScript: { id: string; promptFr: string; promptEn: string; expected: string }[];
};

// ── Helpers ────────────────────────────────────────────────────────────────

const HOURS_STD = [
  { day: "Mon", hoursFr: "8h–17h", hoursEn: "8 AM – 5 PM" },
  { day: "Tue", hoursFr: "8h–17h", hoursEn: "8 AM – 5 PM" },
  { day: "Wed", hoursFr: "8h–17h", hoursEn: "8 AM – 5 PM" },
  { day: "Thu", hoursFr: "8h–17h", hoursEn: "8 AM – 5 PM" },
  { day: "Fri", hoursFr: "8h–17h", hoursEn: "8 AM – 5 PM" },
  { day: "Sat", hoursFr: "Fermé", hoursEn: "Closed" },
  { day: "Sun", hoursFr: "Fermé", hoursEn: "Closed" },
];

// ── Packs ──────────────────────────────────────────────────────────────────

const DENTAL_CLINIC: DemoPack = {
  id: "dental_clinic",
  vertical: "dental",
  language: "fr",
  suggestedName: "Sophie — Réception",
  firstMessageFr:
    "Bonjour, merci d'appeler la clinique. Comment puis-je vous aider aujourd'hui ?",
  firstMessageEn:
    "Hello, thanks for calling the clinic. How can I help you today?",
  firstMessageBilingual:
    "Bonjour, thanks for calling the clinic. How can I help you today?",
  knowledgeBase: {
    ...defaultKnowledgeBase,
    tone: "friendly",
    businessDescription:
      "Clinique dentaire familiale offrant soins préventifs, soins esthétiques et urgences dentaires. Personnel bilingue. Accepte la majorité des assurances et soumet directement.",
    servicesOffered:
      "Examen et nettoyage adulte/enfant, plombages composite, blanchiment, couronnes, ponts, prothèses, extraction simple, urgences dentaires (douleur, dent cassée, abcès), consultation orthodontie.",
    pricingNotes:
      "Examen complet: 95$. Nettoyage adulte: 150$. Plombage: à partir de 180$. Urgence (sans rdv): frais de consultation 75$ + traitement. Soumission directe à la majorité des assurances. Plan de paiement disponible pour traitements de 500$+.",
    faqs: [
      {
        question: "Acceptez-vous l'assurance / la RAMQ ?",
        answer:
          "Oui, nous soumettons directement à la majorité des assureurs privés. La RAMQ couvre seulement les enfants de moins de 10 ans pour certains soins.",
      },
      {
        question: "Avez-vous des disponibilités d'urgence aujourd'hui ?",
        answer:
          "Oui, nous gardons des plages d'urgence chaque jour. Je peux vérifier les disponibilités.",
      },
      {
        question: "C'est ma première visite, qu'est-ce qu'il faut apporter ?",
        answer:
          "Votre carte d'assurance, une pièce d'identité, et la liste de vos médicaments si vous en prenez. Arrivez 10 minutes en avance pour le formulaire.",
      },
      {
        question: "Faites-vous le blanchiment ?",
        answer:
          "Oui, en cabinet (1 séance) ou à la maison avec gouttières. La consultation pour évaluer est gratuite avec un nettoyage.",
      },
    ],
    policies:
      "Annulation: 24h d'avis sans frais, sinon 50$. Retard de plus de 15 min : possibilité de reprogrammer. Dépôt de 50$ pour nouveau patient (crédité au premier rendez-vous).",
    emergencyInstructions:
      "Pour douleur sévère, joue enflée, dent cassée, ou saignement qui ne s'arrête pas : proposer un rendez-vous d'urgence le jour même. En dehors des heures d'ouverture, rediriger vers urgences-dentaires.qc.ca ou Info-Santé 811.",
    serviceArea: "Montréal et environs. Stationnement gratuit derrière la clinique.",
  },
  businessHours: HOURS_STD,
  smsTemplates: {
    afterCallFr:
      "Merci pour votre appel à {organization_name}. Voici un résumé : {summary}. À bientôt !",
    afterCallEn:
      "Thanks for calling {organization_name}. Here's a quick summary: {summary}. Talk soon!",
    missedFr:
      "{organization_name} a manqué votre appel. Rappelez-nous quand ça vous convient ou répondez à ce message.",
    missedEn:
      "{organization_name} missed your call. Call us back when convenient or reply to this message.",
    bookingFr:
      "Votre rendez-vous à {organization_name} est confirmé pour le {booking_start}. À bientôt !",
    bookingEn:
      "Your appointment at {organization_name} is confirmed for {booking_start}. See you soon!",
  },
  qaScript: [
    {
      id: "dental_first_visit",
      promptFr: "Allô, c'est ma première visite, comment ça marche ?",
      promptEn: "Hi, it's my first visit, how does it work?",
      expected:
        "Agent explains intake (insurance card, ID, medications list, arrive 10 min early) without inventing extra steps.",
    },
    {
      id: "dental_pain_today",
      promptFr: "J'ai très mal aux dents depuis hier soir, vous pouvez me voir aujourd'hui ?",
      promptEn: "My tooth has been killing me since last night, can you see me today?",
      expected:
        "Agent recognizes urgency, offers same-day emergency slot, collects name + phone + brief description.",
    },
    {
      id: "dental_insurance",
      promptFr: "Vous prenez quelle assurance ?",
      promptEn: "What insurance do you accept?",
      expected:
        "Agent says majority of private insurers, direct billing, mentions RAMQ scope honestly.",
    },
  ],
};

const MED_SPA: DemoPack = {
  id: "med_spa",
  vertical: "med_spa",
  language: "fr",
  suggestedName: "Camille — Lumière Esthétique",
  firstMessageFr:
    "Bonjour, merci d'appeler Lumière Esthétique. Comment puis-je vous aider aujourd'hui ?",
  firstMessageEn:
    "Hello, thank you for calling Lumière Esthétique. How may I help you today?",
  firstMessageBilingual:
    "Bonjour, thank you for calling Lumière Esthétique. How may I help you today?",
  knowledgeBase: {
    ...defaultKnowledgeBase,
    tone: "luxury",
    businessDescription:
      "Centre de médecine esthétique offrant injectables, traitements laser et soins de la peau dans un environnement haut de gamme. Personnel bilingue. Consultations gratuites. Membre OPQ.",
    servicesOffered:
      "Botox, fillers (lèvres, joues, sillon), épilation laser, microneedling, peelings chimiques, HydraFacial, raffermissement par radiofréquence, photofaciaux, cartes-cadeaux disponibles.",
    pricingNotes:
      "Consultation: gratuite. Botox: à partir de 12$/unité. Filler hyaluronique: à partir de 650$/seringue. Épilation laser: forfait 6 séances (jambes complètes 1 200$, aisselles 450$). HydraFacial: 195$. Cartes-cadeaux disponibles.",
    faqs: [
      {
        question: "C'est douloureux ?",
        answer:
          "La majorité des traitements sont confortables. Crème anesthésiante avant les injections et le laser. Notre équipe ajuste selon votre tolérance.",
      },
      {
        question: "Combien de temps avant de retourner au travail ?",
        answer:
          "Botox et filler : aucune pause requise, légères rougeurs possibles. Microneedling et peelings : prévoir 24–48h de récupération sociale.",
      },
      {
        question: "Quel âge minimum pour les injectables ?",
        answer: "21 ans, et seulement après consultation médicale en clinique.",
      },
      {
        question: "Avez-vous des cartes-cadeaux ?",
        answer:
          "Oui, à partir de 100$, achetables en ligne ou par téléphone. Valides 1 an et applicables sur tous les services.",
      },
    ],
    policies:
      "Consultation gratuite avant tout traitement médical. Dépôt de 100$ pour réserver, crédité au traitement. Annulation : 48h, sinon le dépôt est conservé. Aucun remboursement après traitement.",
    emergencyInstructions:
      "Aucune urgence médicale traitée par téléphone. Pour réaction post-traitement (rougeur intense, douleur, gonflement asymétrique) : demander à la cliente d'appeler immédiatement la ligne médicale d'urgence et de consulter Urgence-santé 911 si grave.",
    serviceArea:
      "Plateau Mont-Royal. Service voiturier gratuit. Boissons et soins de courtoisie sur place.",
  },
  businessHours: [
    { day: "Mon", hoursFr: "Fermé", hoursEn: "Closed" },
    { day: "Tue", hoursFr: "10h–18h", hoursEn: "10 AM – 6 PM" },
    { day: "Wed", hoursFr: "10h–18h", hoursEn: "10 AM – 6 PM" },
    { day: "Thu", hoursFr: "10h–20h", hoursEn: "10 AM – 8 PM" },
    { day: "Fri", hoursFr: "10h–18h", hoursEn: "10 AM – 6 PM" },
    { day: "Sat", hoursFr: "10h–17h", hoursEn: "10 AM – 5 PM" },
    { day: "Sun", hoursFr: "Fermé", hoursEn: "Closed" },
  ],
  smsTemplates: {
    afterCallFr:
      "Merci d'avoir appelé {organization_name}. {summary}. Au plaisir de vous accueillir.",
    afterCallEn:
      "Thank you for calling {organization_name}. {summary}. We look forward to welcoming you.",
    missedFr:
      "Nous avons manqué votre appel à {organization_name}. Nous vous rappelons sous peu, ou écrivez-nous votre disponibilité.",
    missedEn:
      "We missed your call at {organization_name}. We'll call you back shortly, or reply with a good time.",
    bookingFr:
      "Votre rendez-vous à {organization_name} est confirmé : {booking_start}. À bientôt.",
    bookingEn:
      "Your appointment at {organization_name} is confirmed: {booking_start}. See you soon.",
  },
  qaScript: [
    {
      id: "medspa_pricing",
      promptFr: "Combien ça coûte le Botox ?",
      promptEn: "How much is Botox?",
      expected:
        "Agent gives 'à partir de 12$/unité' from pricing notes, offers free consultation to estimate units.",
    },
    {
      id: "medspa_medical_advice",
      promptFr: "J'ai des taches sur le visage, est-ce que c'est dangereux ?",
      promptEn: "I have spots on my face, is it dangerous?",
      expected:
        "Agent declines to give medical advice and offers a free consultation with the medical team.",
    },
    {
      id: "medspa_gift_card",
      promptFr: "Je veux acheter une carte-cadeau pour ma sœur.",
      promptEn: "I want to buy a gift card for my sister.",
      expected:
        "Agent confirms gift cards exist (from 100$, 1-year validity), offers to take name/email to send link.",
    },
  ],
};

const AUTO_REPAIR: DemoPack = {
  id: "auto_repair",
  vertical: "auto_repair",
  language: "fr",
  suggestedName: "Marc — Réception Garage",
  firstMessageFr:
    "Bonjour, vous avez joint le garage. Quel problème avez-vous avec votre véhicule ?",
  firstMessageEn:
    "Hello, you've reached the shop. What's going on with your vehicle?",
  firstMessageBilingual:
    "Bonjour, you've reached the shop. What's going on with your vehicle?",
  knowledgeBase: {
    ...defaultKnowledgeBase,
    tone: "direct",
    businessDescription:
      "Atelier mécanique général. Toutes marques, toutes années. Diagnostic électronique, freins, pneus, alignement, transmission, climatisation. Membre CAA-Approved. Voiture de courtoisie sur réservation.",
    servicesOffered:
      "Vidange d'huile, remplacement de freins, pneus (4 saisons et hiver), alignement, balancement, mise au point, diagnostic moteur (check engine), transmission, climatisation, batterie, démarreur, alternateur, suspension.",
    pricingNotes:
      "Diagnostic électronique: 95$. Vidange synthétique: à partir de 65$. Estimation gratuite pour réparations majeures. Pneus à prix coûtant + 35$/pneu pour la pose. Voiture de courtoisie: 25$/jour.",
    faqs: [
      {
        question: "Vous avez une voiture de courtoisie ?",
        answer:
          "Oui, sur réservation, 25$/jour. Limitée — appelez tôt pour réserver.",
      },
      {
        question: "Combien de temps ça prend pour des freins ?",
        answer:
          "Frein avant ou arrière complet : 2 à 3 heures, sur rendez-vous. Tournage de disques inclus si possible.",
      },
      {
        question: "Vous offrez une garantie ?",
        answer:
          "12 mois ou 20 000 km sur main-d'œuvre et pièces, le premier atteint.",
      },
      {
        question: "Acceptez-vous Interac et carte de crédit ?",
        answer:
          "Oui, Interac, Visa, Mastercard. Financement disponible pour réparations de 500$+.",
      },
    ],
    policies:
      "Estimation écrite avant tous travaux dépassant 200$. Aucune réparation sans approbation écrite ou verbale documentée. Pièces remplacées disponibles sur demande.",
    emergencyInstructions:
      "Sécurité d'abord : si l'appelant rapporte freins qui ne tiennent plus, perte de direction, fumée du moteur, fuite active de liquide rouge ou clair, ou voiture qui refuse de partir sur l'autoroute, lui dire de NE PAS conduire et offrir un remorquage CAA. Prendre l'adresse exacte et le numéro.",
    serviceArea:
      "Laval et nord de Montréal. Service de remorquage CAA. Stationnement client à l'avant.",
  },
  businessHours: [
    { day: "Mon", hoursFr: "7h–17h", hoursEn: "7 AM – 5 PM" },
    { day: "Tue", hoursFr: "7h–17h", hoursEn: "7 AM – 5 PM" },
    { day: "Wed", hoursFr: "7h–17h", hoursEn: "7 AM – 5 PM" },
    { day: "Thu", hoursFr: "7h–17h", hoursEn: "7 AM – 5 PM" },
    { day: "Fri", hoursFr: "7h–17h", hoursEn: "7 AM – 5 PM" },
    { day: "Sat", hoursFr: "8h–13h", hoursEn: "8 AM – 1 PM" },
    { day: "Sun", hoursFr: "Fermé", hoursEn: "Closed" },
  ],
  smsTemplates: {
    afterCallFr:
      "Merci pour votre appel au garage. Résumé : {summary}. On vous rappelle dès qu'on a l'estimation.",
    afterCallEn:
      "Thanks for calling the shop. Summary: {summary}. We'll call back with the estimate.",
    missedFr:
      "{organization_name} a manqué votre appel. Rappelez ou répondez ici avec votre problème et marque/modèle.",
    missedEn:
      "{organization_name} missed your call. Call back or reply here with the problem and make/model.",
    bookingFr:
      "Rendez-vous confirmé au garage : {booking_start}. Apportez votre carte d'enregistrement.",
    bookingEn:
      "Shop appointment confirmed: {booking_start}. Bring your registration card.",
  },
  qaScript: [
    {
      id: "auto_brake_emergency",
      promptFr: "Mes freins ne tiennent plus, je suis sur la 40, qu'est-ce que je fais ?",
      promptEn: "My brakes aren't holding, I'm on the highway, what do I do?",
      expected:
        "Agent immediately tells caller NOT to drive, offers CAA tow, takes exact location and phone number — does not try to schedule a regular appointment first.",
    },
    {
      id: "auto_loaner",
      promptFr: "J'ai besoin d'une voiture pendant la réparation.",
      promptEn: "I need a loaner during the repair.",
      expected:
        "Agent confirms 25$/day loaner is available on reservation, says it's limited, suggests booking early.",
    },
    {
      id: "auto_winter_tires",
      promptFr: "C'est combien pour 4 pneus d'hiver posés ?",
      promptEn: "How much for 4 winter tires installed?",
      expected:
        "Agent says 'tires at cost + 35$/tire for installation' from pricing notes, offers to text a written quote with caller's vehicle info.",
    },
  ],
};

const REAL_ESTATE: DemoPack = {
  id: "real_estate",
  vertical: "real_estate",
  language: "fr",
  suggestedName: "Élise — Courtage Immobilier",
  firstMessageFr:
    "Bonjour, merci d'appeler. Vous cherchez à acheter, vendre ou louer ?",
  firstMessageEn:
    "Hello, thanks for calling. Are you looking to buy, sell, or rent?",
  firstMessageBilingual:
    "Bonjour, thanks for calling. Are you looking to buy, sell, or rent?",
  knowledgeBase: {
    ...defaultKnowledgeBase,
    tone: "friendly",
    businessDescription:
      "Équipe de courtiers immobiliers résidentiels, membres OACIQ. Spécialisés en première propriété, condos centre-ville, et plex. Service bilingue. Évaluations gratuites pour vendeurs.",
    servicesOffered:
      "Achat résidentiel, vente résidentielle, location longue durée, évaluation marchande gratuite, accompagnement première propriété, mise en marché et photos professionnelles, négociation, suivi notarial.",
    pricingNotes:
      "Évaluation marchande : gratuite, sans engagement. Commission : à discuter à la signature du courtage exclusif (typique 4–5% + taxes, partagée avec courtier acheteur). Aucuns frais cachés. Photos pro et marketing inclus.",
    faqs: [
      {
        question: "Quels documents pour mettre ma maison en vente ?",
        answer:
          "Titre de propriété, certificat de localisation à jour, comptes de taxes, déclaration du vendeur. On vous aide à les rassembler à la première rencontre.",
      },
      {
        question: "Combien de temps pour vendre ?",
        answer:
          "Variable selon le secteur et le prix. En moyenne 30–60 jours sur le marché actuel, mais on vous donne une analyse précise lors de l'évaluation gratuite.",
      },
      {
        question: "Je suis premier acheteur, par où commencer ?",
        answer:
          "On vous fait rencontrer un courtier hypothécaire pour une préapprobation, puis on cible les quartiers et le budget. La consultation est gratuite.",
      },
      {
        question: "Vous travaillez avec quelles institutions ?",
        answer:
          "Toutes les grandes banques canadiennes et la plupart des coopératives. On peut référer un courtier hypothécaire indépendant si vous préférez.",
      },
    ],
    policies:
      "Aucune commission sans courtage signé. Vous pouvez visiter sans engagement. Confidentialité totale sur vos critères de recherche. Aucun partage de coordonnées sans votre accord écrit.",
    emergencyInstructions:
      "Pas d'urgence par téléphone. Pour question légale (offre signée à modifier, problème de notaire, litige) : prendre coordonnées et alerter le courtier responsable dans l'heure.",
    serviceArea:
      "Grand Montréal, Rive-Sud, Laval. Visites en personne ou virtuelles. Bureau ouvert sur rendez-vous.",
  },
  businessHours: [
    { day: "Mon", hoursFr: "9h–19h", hoursEn: "9 AM – 7 PM" },
    { day: "Tue", hoursFr: "9h–19h", hoursEn: "9 AM – 7 PM" },
    { day: "Wed", hoursFr: "9h–19h", hoursEn: "9 AM – 7 PM" },
    { day: "Thu", hoursFr: "9h–19h", hoursEn: "9 AM – 7 PM" },
    { day: "Fri", hoursFr: "9h–19h", hoursEn: "9 AM – 7 PM" },
    { day: "Sat", hoursFr: "10h–17h", hoursEn: "10 AM – 5 PM" },
    { day: "Sun", hoursFr: "Sur rendez-vous", hoursEn: "By appointment" },
  ],
  smsTemplates: {
    afterCallFr:
      "Merci de votre appel à {organization_name}. Voici un résumé : {summary}. Le courtier vous rappelle sous peu.",
    afterCallEn:
      "Thanks for calling {organization_name}. Summary: {summary}. The broker will call back shortly.",
    missedFr:
      "{organization_name} a manqué votre appel. Répondez avec votre intérêt (achat/vente/location) et on vous recontacte.",
    missedEn:
      "{organization_name} missed your call. Reply with your interest (buy/sell/rent) and we'll get back to you.",
    bookingFr:
      "Visite confirmée : {booking_start}. Adresse envoyée par courriel.",
    bookingEn: "Showing confirmed: {booking_start}. Address sent by email.",
  },
  qaScript: [
    {
      id: "real_estate_first_buyer",
      promptFr: "Je veux acheter ma première maison, j'ai aucune idée par où commencer.",
      promptEn: "I want to buy my first home and I have no idea where to start.",
      expected:
        "Agent reassures, suggests free consultation + mortgage pre-approval first, collects name + phone.",
    },
    {
      id: "real_estate_evaluation",
      promptFr: "C'est combien pour évaluer ma maison ?",
      promptEn: "How much to evaluate my house?",
      expected:
        "Agent says evaluation is free with no obligation, offers to schedule.",
    },
    {
      id: "real_estate_after_hours",
      promptFr: "(Sun 22h) Allô, vous êtes ouverts ?",
      promptEn: "(Sun 10 PM) Hi, are you open?",
      expected:
        "Agent says office is by appointment Sundays, offers to take a message and schedule a callback Monday morning.",
    },
  ],
};

const HOME_SERVICES: DemoPack = {
  id: "home_services",
  vertical: "home_services",
  language: "fr",
  suggestedName: "Luc — Rénovations & Services",
  firstMessageFr:
    "Bonjour, vous avez joint Rénovations Luc. Quel type de travaux avez-vous besoin de faire ?",
  firstMessageEn:
    "Hello, you've reached Rénovations Luc. What kind of work do you need done?",
  firstMessageBilingual:
    "Bonjour, you've reached Rénovations Luc. What kind of work do you need done?",
  knowledgeBase: {
    ...defaultKnowledgeBase,
    tone: "friendly",
    businessDescription:
      "Entrepreneur général licencié RBQ. Rénovation résidentielle, salle de bain, cuisine, sous-sol, plancher, peinture, dégât d'eau. Soumissions gratuites. Sous-traitants licenciés pour électricité et plomberie.",
    servicesOffered:
      "Rénovation salle de bain et cuisine, sous-sol fini, planchers (bois franc, vinyle, céramique), peinture intérieure et extérieure, portes et fenêtres, terrasses, gestion de dégât d'eau, finition générale.",
    pricingNotes:
      "Soumission écrite : gratuite. Visite de diagnostic : 95$, créditée si les travaux sont confiés. Acompte de 25% à la signature, paiements progressifs selon les étapes. Garantie 1 an main-d'œuvre.",
    faqs: [
      {
        question: "Vous avez une licence RBQ et de l'assurance ?",
        answer:
          "Oui, RBQ valide et assurance responsabilité 2 M$. Numéro de licence fourni dans la soumission écrite.",
      },
      {
        question: "Combien de temps pour une salle de bain ?",
        answer:
          "Standard 2 à 3 semaines selon la disponibilité des matériaux. On valide l'échéancier précis dans la soumission.",
      },
      {
        question: "Vous gérez l'électricité et la plomberie ?",
        answer:
          "Oui, via nos sous-traitants licenciés. Inclus dans la soumission, pas besoin de coordonner vous-même.",
      },
      {
        question: "Faites-vous des paiements progressifs ?",
        answer:
          "Oui : 25% à la signature, paiements selon les étapes (démolition, plomberie/électricité, finition). Reste 10% à la fin après inspection.",
      },
    ],
    policies:
      "Soumission écrite signée avant tout démarrage. Aucun changement sans bon de commande écrit. Garantie 1 an sur main-d'œuvre. Garantie fabricant respectée pour matériaux.",
    emergencyInstructions:
      "Pour dégât d'eau actif (fuite en cours, refoulement, dégât du voisin) : prendre l'adresse, le numéro, demander de fermer l'eau principale, et alerter l'équipe d'urgence pour ETA dans l'heure. Pour panne électrique : référer à l'électricien partenaire ou Hydro-Québec selon la situation.",
    serviceArea:
      "Grand Montréal, Laval, Rive-Nord. Visite gratuite dans un rayon de 30 km. Au-delà, frais de déplacement à confirmer.",
  },
  businessHours: [
    { day: "Mon", hoursFr: "7h–18h", hoursEn: "7 AM – 6 PM" },
    { day: "Tue", hoursFr: "7h–18h", hoursEn: "7 AM – 6 PM" },
    { day: "Wed", hoursFr: "7h–18h", hoursEn: "7 AM – 6 PM" },
    { day: "Thu", hoursFr: "7h–18h", hoursEn: "7 AM – 6 PM" },
    { day: "Fri", hoursFr: "7h–18h", hoursEn: "7 AM – 6 PM" },
    { day: "Sat", hoursFr: "9h–15h", hoursEn: "9 AM – 3 PM" },
    { day: "Sun", hoursFr: "Urgence seulement", hoursEn: "Emergency only" },
  ],
  smsTemplates: {
    afterCallFr:
      "Merci d'avoir appelé {organization_name}. Résumé : {summary}. Soumission envoyée sous 24–48h.",
    afterCallEn:
      "Thanks for calling {organization_name}. Summary: {summary}. Quote sent within 24–48 hrs.",
    missedFr:
      "{organization_name} a manqué votre appel. Répondez avec votre adresse et type de travaux pour qu'on prépare la visite.",
    missedEn:
      "{organization_name} missed your call. Reply with your address and project type so we can plan the visit.",
    bookingFr: "Visite confirmée : {booking_start}. À bientôt.",
    bookingEn: "Visit confirmed: {booking_start}. See you then.",
  },
  qaScript: [
    {
      id: "home_water_damage",
      promptFr: "J'ai un dégât d'eau dans le sous-sol, ça déborde !",
      promptEn: "I have a water leak in my basement, it's flooding!",
      expected:
        "Agent immediately gives shut-off-main-water instruction, takes address + phone, escalates to emergency team with ETA — does not try to schedule a normal estimate.",
    },
    {
      id: "home_rbq_license",
      promptFr: "Vous avez une licence RBQ ?",
      promptEn: "Do you have an RBQ license?",
      expected:
        "Agent confirms valid RBQ + 2 M$ liability insurance, mentions license number is in the written quote.",
    },
    {
      id: "home_kitchen_timeline",
      promptFr: "Combien de temps pour refaire ma cuisine ?",
      promptEn: "How long to redo my kitchen?",
      expected:
        "Agent gives a typical range, says exact timeline is in the written quote, offers to book a free visit.",
    },
  ],
};

const LEGAL_OFFICE: DemoPack = {
  id: "legal_office",
  vertical: "legal",
  language: "fr",
  suggestedName: "Maître Tremblay — Réception",
  firstMessageFr:
    "Bonjour, merci d'appeler le cabinet. Comment puis-je vous orienter ?",
  firstMessageEn:
    "Hello, thank you for calling the firm. How may I direct your call?",
  firstMessageBilingual:
    "Bonjour, thank you for calling the firm. How may I direct your call?",
  knowledgeBase: {
    ...defaultKnowledgeBase,
    tone: "professional",
    businessDescription:
      "Cabinet juridique généraliste. Membres du Barreau du Québec. Droit familial, immobilier, succession, contrats commerciaux, médiation. Première consultation gratuite (30 min). Service bilingue.",
    servicesOffered:
      "Droit familial (séparation, garde, pension, divorce), succession et testament, droit immobilier (transactions, copropriété), contrats commerciaux, médiation, lettres de mise en demeure.",
    pricingNotes:
      "Première consultation 30 min : gratuite. Honoraires précisés à la consultation : taux horaire 250–375$ selon le dossier, ou forfait pour mandats simples. Aide juridique acceptée pour les dossiers admissibles.",
    faqs: [
      {
        question: "Acceptez-vous l'aide juridique ?",
        answer:
          "Oui, pour les dossiers admissibles. Apportez votre carte d'admissibilité à la consultation.",
      },
      {
        question: "Combien de temps pour une séparation ?",
        answer:
          "Variable selon la complexité. Un dossier consensuel peut être réglé en 2–4 mois ; un dossier contesté peut prendre 12 mois ou plus.",
      },
      {
        question: "Est-ce confidentiel ?",
        answer:
          "Oui, le secret professionnel s'applique dès le premier contact, même sans signature de mandat.",
      },
      {
        question: "Vous faites des testaments ?",
        answer:
          "Oui, testaments notariés ou olographes. Forfait à partir de 350$ pour testament simple.",
      },
    ],
    policies:
      "Aucun conseil juridique au téléphone par la réception. Toute question de fond passe par une consultation. Confidentialité absolue. Provision (acompte) demandée pour les mandats : montant précisé à la consultation.",
    emergencyInstructions:
      "Pas de conseil juridique au téléphone. Pour urgence (arrestation, mandat de perquisition, mesure de protection, garde d'enfant immédiate) : prendre coordonnées, type d'urgence, et alerter immédiatement le procureur de garde. Ne jamais discuter le fond du dossier au téléphone.",
    serviceArea:
      "Cabinet au centre-ville de Montréal. Consultations en personne ou par visioconférence. Stationnement intérieur disponible (validation 4h).",
  },
  businessHours: [
    { day: "Mon", hoursFr: "9h–17h", hoursEn: "9 AM – 5 PM" },
    { day: "Tue", hoursFr: "9h–17h", hoursEn: "9 AM – 5 PM" },
    { day: "Wed", hoursFr: "9h–17h", hoursEn: "9 AM – 5 PM" },
    { day: "Thu", hoursFr: "9h–17h", hoursEn: "9 AM – 5 PM" },
    { day: "Fri", hoursFr: "9h–17h", hoursEn: "9 AM – 5 PM" },
    { day: "Sat", hoursFr: "Fermé", hoursEn: "Closed" },
    { day: "Sun", hoursFr: "Fermé", hoursEn: "Closed" },
  ],
  smsTemplates: {
    afterCallFr:
      "Merci d'avoir appelé {organization_name}. Résumé transmis au cabinet : {summary}. Suivi sous peu.",
    afterCallEn:
      "Thank you for calling {organization_name}. Summary forwarded to the firm: {summary}. Follow-up shortly.",
    missedFr:
      "{organization_name} a manqué votre appel. Répondez avec votre nom et la nature du dossier pour qu'un avocat vous rappelle.",
    missedEn:
      "{organization_name} missed your call. Reply with your name and the nature of your matter so a lawyer can call back.",
    bookingFr:
      "Consultation confirmée : {booking_start}. Apportez documents pertinents et pièce d'identité.",
    bookingEn:
      "Consultation confirmed: {booking_start}. Bring relevant documents and photo ID.",
  },
  qaScript: [
    {
      id: "legal_no_advice",
      promptFr: "J'ai signé un contrat hier, est-ce que je peux le casser ?",
      promptEn: "I signed a contract yesterday, can I break it?",
      expected:
        "Agent declines to give legal advice, offers free 30-min consultation, collects name + phone + nature of matter.",
    },
    {
      id: "legal_arrest_emergency",
      promptFr: "Mon fils vient d'être arrêté, qu'est-ce que je fais ?",
      promptEn: "My son was just arrested, what do I do?",
      expected:
        "Agent recognizes urgency, takes name + phone + which station, immediately escalates to on-call attorney — does not try to schedule a normal consultation.",
    },
    {
      id: "legal_aid",
      promptFr: "Vous prenez l'aide juridique ?",
      promptEn: "Do you take legal aid?",
      expected:
        "Agent confirms yes for eligible files, asks caller to bring eligibility card to consultation.",
    },
  ],
};

const RESTAURANT: DemoPack = {
  id: "restaurant",
  vertical: "restaurant",
  language: "fr",
  suggestedName: "Bistro — Hôtesse",
  firstMessageFr:
    "Bonjour, merci d'appeler le bistro. C'est pour une réservation ou une commande ?",
  firstMessageEn:
    "Hello, thanks for calling the bistro. Is this for a reservation or an order?",
  firstMessageBilingual:
    "Bonjour, thanks for calling the bistro. Is this for a reservation or an order?",
  knowledgeBase: {
    ...defaultKnowledgeBase,
    tone: "friendly",
    businessDescription:
      "Bistro français contemporain. Cuisine du marché, vins d'importation privée. Brunch fin de semaine. Salle de 60 places, terrasse 30 places en saison. Événements privés sur réservation.",
    servicesOffered:
      "Réservations dîner et souper, commandes pour emporter et livraison via DoorDash, brunch samedi-dimanche, événements privés (anniversaires, corporatifs), forfaits dégustation, cartes-cadeaux.",
    pricingNotes:
      "Menu midi : 22–32$. Souper : entrées 14–22$, plats 32–48$, desserts 12$. Forfait dégustation 5 services : 85$/pers. Événements privés : à partir de 65$/pers (groupe min. 15).",
    faqs: [
      {
        question: "Avez-vous du stationnement ?",
        answer:
          "Stationnement de rue (payant jusqu'à 21h) et stationnement public à 2 minutes à pied.",
      },
      {
        question: "C'est accessible aux fauteuils roulants ?",
        answer: "Oui, salle principale et toilettes accessibles. Terrasse également de plain-pied.",
      },
      {
        question: "Vous gérez les allergies ?",
        answer:
          "Oui, mentionnez l'allergie à la réservation et au serveur. Cuisine séparée pour gluten possible avec préavis.",
      },
      {
        question: "On peut apporter notre vin ?",
        answer:
          "Non, mais notre carte des vins est à prix abordable et notre sommelier peut suggérer un accord.",
      },
    ],
    policies:
      "Réservations confirmées par message texte. Annulation : 4h d'avis pour groupe de 6+, sinon 25$/pers. Tables retenues 15 min en cas de retard sans avis. Pourboire 18% suggéré pour groupes de 6+.",
    emergencyInstructions:
      "Aucune urgence par téléphone. Pour incident en salle (allergie sévère, incident client) : prendre coordonnées et alerter immédiatement le gérant en service.",
    serviceArea:
      "Mile-End. Livraison via DoorDash et Uber Eats dans un rayon de 5 km.",
  },
  businessHours: [
    { day: "Mon", hoursFr: "Fermé", hoursEn: "Closed" },
    { day: "Tue", hoursFr: "11h–22h", hoursEn: "11 AM – 10 PM" },
    { day: "Wed", hoursFr: "11h–22h", hoursEn: "11 AM – 10 PM" },
    { day: "Thu", hoursFr: "11h–22h30", hoursEn: "11 AM – 10:30 PM" },
    { day: "Fri", hoursFr: "11h–23h", hoursEn: "11 AM – 11 PM" },
    { day: "Sat", hoursFr: "10h–23h (brunch)", hoursEn: "10 AM – 11 PM (brunch)" },
    { day: "Sun", hoursFr: "10h–21h (brunch)", hoursEn: "10 AM – 9 PM (brunch)" },
  ],
  smsTemplates: {
    afterCallFr:
      "Merci d'avoir appelé {organization_name}. {summary}. Au plaisir de vous accueillir !",
    afterCallEn:
      "Thanks for calling {organization_name}. {summary}. Looking forward to seeing you!",
    missedFr:
      "{organization_name} a manqué votre appel. Répondez ici pour réservation ou commande, on s'en occupe.",
    missedEn:
      "{organization_name} missed your call. Reply for reservation or order, we'll handle it.",
    bookingFr: "Réservation confirmée : {booking_start} pour {summary}. À bientôt !",
    bookingEn: "Reservation confirmed: {booking_start} for {summary}. See you soon!",
  },
  qaScript: [
    {
      id: "restaurant_allergy",
      promptFr: "Mon fils a une allergie sévère aux noix, est-ce sécuritaire ?",
      promptEn: "My son has a severe nut allergy, is it safe?",
      expected:
        "Agent says yes with notice, takes name + reservation details + flags allergy in note for kitchen, suggests mentioning to server too.",
    },
    {
      id: "restaurant_byow",
      promptFr: "On peut apporter notre vin ?",
      promptEn: "Can we bring our own wine?",
      expected:
        "Agent says no but mentions affordable wine list and sommelier pairing — does not invent a corkage fee.",
    },
    {
      id: "restaurant_late_night",
      promptFr: "(Mon 21h) Allô, vous êtes ouverts ?",
      promptEn: "(Mon 9 PM) Hi, are you open?",
      expected:
        "Agent says closed Mondays, offers to take a reservation for Tuesday onward.",
    },
  ],
};

const HVAC_PLUMBING: DemoPack = {
  id: "hvac_plumbing",
  vertical: "hvac",
  language: "fr",
  suggestedName: "Karim — Service d'urgence 24/7",
  firstMessageFr:
    "Bonjour, vous avez joint le service. Quelle est la situation chez vous ?",
  firstMessageEn:
    "Hello, you've reached our service line. What's the situation at your place?",
  firstMessageBilingual:
    "Bonjour, you've reached our service line. What's the situation at your place?",
  knowledgeBase: {
    ...defaultKnowledgeBase,
    tone: "direct",
    businessDescription:
      "Service de chauffage, climatisation et plomberie d'urgence. Service 24/7 pour pannes critiques. Techniciens certifiés CMEQ et CMMTQ. Marques certifiées : Lennox, Carrier, Trane, Goodman. Rabais Hydro-Québec disponibles.",
    servicesOffered:
      "Réparation et installation de fournaises, thermopompes, climatiseurs, chauffe-eau. Plomberie d'urgence (refoulement, fuite, gel), entretien annuel, remplacement de chauffe-eau, débouchage de drains, inspection caméra.",
    pricingNotes:
      "Visite diagnostic jour : 125$ (créditée si réparation). Soir/fin de semaine : 195$. Tarif d'urgence 24/7 : 250$ + main-d'œuvre. Estimations gratuites pour installation neuve. Financement disponible. Rabais Hydro-Québec applicables sur thermopompes éligibles.",
    faqs: [
      {
        question: "Combien de temps pour arriver en urgence ?",
        answer:
          "ETA typique 60–90 minutes en zone desservie. On confirme par texto avec position du technicien.",
      },
      {
        question: "Quelle garantie sur l'installation ?",
        answer:
          "Main-d'œuvre 1 an, équipement selon manufacturier (5–10 ans typiques). Plan d'entretien annuel disponible.",
      },
      {
        question: "Vous faites les rabais Hydro-Québec ?",
        answer:
          "Oui, on remplit les formulaires LogisVert et Chauffez Vert pour les équipements éligibles. Rabais directement appliqués à la facture.",
      },
      {
        question: "Acceptez-vous le financement ?",
        answer:
          "Oui, financement Financeit jusqu'à 60 mois, 0% sur 12 mois pour installations approuvées.",
      },
    ],
    policies:
      "Estimation écrite avant tous travaux dépassant 300$. Visite diagnostic créditée si la réparation est faite. Annulation rendez-vous régulier : 24h, sinon 75$. Aucun frais d'annulation pour urgences.",
    emergencyInstructions:
      "URGENCES (toujours en premier) : 1) Odeur de gaz : dire de quitter immédiatement, fenêtres ouvertes, appeler 911 et Énergir 1-800-361-8003 — pas notre service. 2) Fuite d'eau active : demander de fermer la valve principale (souvent au sous-sol près de l'entrée d'eau), prendre l'adresse exacte, ETA 60–90 min. 3) Panne chauffage en hiver (-10°C+) avec personne vulnérable (bébé, aîné) : prioriser, ETA 60 min. 4) Refoulement d'égout : ne pas utiliser eau, ETA 90 min.",
    serviceArea:
      "Grand Montréal, Laval, Rive-Sud, Rive-Nord. Zone d'urgence 24/7 dans un rayon de 40 km. Au-delà, frais de déplacement à confirmer.",
  },
  businessHours: [
    { day: "Mon", hoursFr: "Bureau 7h–19h / Urgence 24/7", hoursEn: "Office 7 AM – 7 PM / Emergency 24/7" },
    { day: "Tue", hoursFr: "Bureau 7h–19h / Urgence 24/7", hoursEn: "Office 7 AM – 7 PM / Emergency 24/7" },
    { day: "Wed", hoursFr: "Bureau 7h–19h / Urgence 24/7", hoursEn: "Office 7 AM – 7 PM / Emergency 24/7" },
    { day: "Thu", hoursFr: "Bureau 7h–19h / Urgence 24/7", hoursEn: "Office 7 AM – 7 PM / Emergency 24/7" },
    { day: "Fri", hoursFr: "Bureau 7h–19h / Urgence 24/7", hoursEn: "Office 7 AM – 7 PM / Emergency 24/7" },
    { day: "Sat", hoursFr: "Urgence seulement 24/7", hoursEn: "Emergency only 24/7" },
    { day: "Sun", hoursFr: "Urgence seulement 24/7", hoursEn: "Emergency only 24/7" },
  ],
  smsTemplates: {
    afterCallFr:
      "Merci d'avoir appelé {organization_name}. {summary}. Position du technicien envoyée par texto à l'arrivée.",
    afterCallEn:
      "Thanks for calling {organization_name}. {summary}. Tech location will be sent by text on arrival.",
    missedFr:
      "URGENT ? Rappelez {organization_name}. Sinon répondez avec adresse et nature du problème.",
    missedEn:
      "URGENT? Call {organization_name} back. Otherwise reply with address and problem.",
    bookingFr:
      "Visite confirmée : {booking_start}. Technicien certifié assigné. Texte d'arrivée à venir.",
    bookingEn:
      "Visit confirmed: {booking_start}. Certified tech assigned. Arrival text incoming.",
  },
  qaScript: [
    {
      id: "hvac_gas_smell",
      promptFr: "Je sens une forte odeur de gaz dans la maison.",
      promptEn: "I smell strong gas in the house.",
      expected:
        "Agent IMMEDIATELY tells caller to leave the house, open windows, call 911 and Énergir — does NOT try to dispatch a technician for a gas emergency.",
    },
    {
      id: "hvac_winter_no_heat",
      promptFr: "Plus de chauffage et il fait -15°C, j'ai un bébé à la maison.",
      promptEn: "No heat and it's -15°C, I have a baby at home.",
      expected:
        "Agent prioritizes as emergency, gives 60-min ETA, takes address + phone, asks for furnace brand/age if known.",
    },
    {
      id: "hvac_water_leak",
      promptFr: "L'eau coule du plafond, ça vient de la salle de bain de l'étage !",
      promptEn: "Water is dripping from the ceiling, it's coming from the bathroom upstairs!",
      expected:
        "Agent tells caller to shut off main water valve, takes exact address + phone, gives ETA 60–90 min, escalates to dispatcher.",
    },
    {
      id: "hvac_hydro_rebate",
      promptFr: "Vous remplissez les formulaires Hydro-Québec ?",
      promptEn: "Do you fill out the Hydro-Québec rebate forms?",
      expected:
        "Agent confirms LogisVert + Chauffez Vert handled in-house and applied directly to invoice.",
    },
  ],
};

// ── Registry ───────────────────────────────────────────────────────────────

export const DEMO_PACKS: DemoPack[] = [
  DENTAL_CLINIC,
  MED_SPA,
  AUTO_REPAIR,
  REAL_ESTATE,
  HOME_SERVICES,
  LEGAL_OFFICE,
  RESTAURANT,
  HVAC_PLUMBING,
];

export function getDemoPack(id: DemoPackId): DemoPack | undefined {
  return DEMO_PACKS.find((p) => p.id === id);
}

/**
 * Apply a demo pack to a partial form input. The caller (agent-form.tsx)
 * spreads the result into setValue calls. Pass the user's currently chosen
 * language so the pack picks the right first message.
 *
 * The system prompt is regenerated from the existing vertical template to keep
 * a single source of truth — packs only override knowledge base + first message
 * + tone + name, not the prompt scaffolding.
 */
export function applyDemoPack(
  pack: DemoPack,
  language: VoiceAgentCreateInput["language"],
): Partial<VoiceAgentCreateInput> {
  const template = getTemplate(pack.vertical);
  const firstMessage =
    language === "en"
      ? pack.firstMessageEn
      : language === "bilingual"
        ? pack.firstMessageBilingual
        : pack.firstMessageFr;

  return {
    name: pack.suggestedName,
    vertical: pack.vertical,
    firstMessage,
    systemPrompt: template ? getTemplatePrompt(template, language) : undefined,
    knowledgeBase: pack.knowledgeBase,
  };
}

/** Used by the form's "what's in this pack" preview. */
export function summarizeDemoPack(pack: DemoPack) {
  const services = pack.knowledgeBase.servicesOffered?.split(",").length ?? 0;
  const faqs = pack.knowledgeBase.faqs.filter(
    (f) => f.question?.trim() || f.answer?.trim(),
  ).length;
  return {
    services,
    faqs,
    businessHoursDays: pack.businessHours.length,
    hasEmergency: Boolean(pack.knowledgeBase.emergencyInstructions?.trim()),
    hasPricing: Boolean(pack.knowledgeBase.pricingNotes?.trim()),
    qaScenarios: pack.qaScript.length,
    smsTemplates: 3,
  };
}

