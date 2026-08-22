import zetShot from "@/assets/projects/zet.webp";
import sadiprimeShot from "@/assets/projects/sadiprime.webp";
import pariShot from "@/assets/projects/pari.webp";
import dliShot from "@/assets/projects/dli.webp";
import businessHubShot from "@/assets/projects/business-hub.webp";

/**
 * Project data — sourced from the actual repositories, not marketing copy.
 * `shot` points at a screenshot in src/assets/projects; when it is null the
 * panel falls back to its typographic composition.
 */
export type Project = {
  id: string;
  index: string;
  title: string;
  /** Second line of the display title, when the name breaks across two lines. */
  titleAlt?: string;
  category: string;
  summary: string;
  detail: string;
  tech: string[];
  /** Telegram username (no @) of the project's own bot, when it has one. */
  bot?: string;
  site?: string;
  /** Route on this site, for a project a visitor can open and operate here. */
  demo?: string;
  shot?: string | null;
};

export const PROJECTS: Project[] = [
  {
    id: "zet",
    index: "01",
    title: "ZET",
    category: "AI Operating System",
    summary:
      "Shaxsiy AI operatsion tizimi — bitta egaga tegishli, ommaviy SaaS emas.",
    detail:
      "An'anaviy AI savolga javob beradi. ZET buyruqni rejaga, rejani harakatga, harakatni tekshirilgan natijaga aylantiradi: Buyruq → Reja → Harakat → Tekshirish → Natija. To'rt bosqichli model strategiyasi (lokal → bepul → arzon → kuchli) va qattiq budjet chegaralari bilan.",
    tech: [
      "Python 3.12",
      "FastAPI",
      "PostgreSQL",
      "pgvector",
      "Redis",
      "Multi-agent",
    ],
    bot: "zetassbot",
    shot: zetShot,
  },
  {
    id: "sadiprime",
    index: "02",
    title: "SADIPRIME",
    category: "AI SaaS / Education",
    summary: "O'quv markazlari uchun AI-quvvatli boshqaruv platformasi.",
    detail:
      "Ko'p-tenantli CRM: o'qituvchilar, guruhlar, o'quvchilar, davomat, to'lov davrlari va obunalarni boshqaruvchi super-admin paneli. Ishlab turgan mahsulot — sadiprime-tizim.uz.",
    tech: [
      "TanStack Start",
      "TypeScript",
      "PostgreSQL",
      "Cloudflare",
      "Docker",
    ],
    bot: "sadiprimebot",
    site: "https://sadiprime-tizim.uz",
    shot: sadiprimeShot,
  },
  {
    id: "pari",
    index: "03",
    title: "PARI AI",
    category: "AI Assistant / Telegram",
    summary: "Next.js asosidagi shaxsiy AI assistant.",
    detail:
      "Chat, Telegram bot, knowledge base, SMM va biznes vositalari bitta tizimda. Bulutli LLM'lar bilan bir qatorda lokal model (Ollama) qo'llab-quvvatlanadi, shuning uchun maxfiy ma'lumot qurilmadan chiqmasligi mumkin.",
    tech: [
      "Next.js",
      "TypeScript",
      "Python",
      "Telegram Bot API",
      "Ollama",
      "Railway",
    ],
    bot: "Pariaiuzbot",
    shot: pariShot,
  },
  {
    id: "dli",
    index: "04",
    title: "DLI",
    titleAlt: "SHOP",
    category: "E-Commerce",
    summary: "To'liq e-commerce platformasi va unga ulangan Telegram do'koni.",
    detail:
      "Katalog, qidiruv, narx oralig'i va saralash filtrlari; JWT autentifikatsiya, ko'p tilli interfeys va admin dashboard. \"Look\" tizimi tayyor kiyim to'plamlarini bitta mahsulot sifatida ko'rsatadi — katalogda ham, Telegram mini-ilovasida ham.",
    tech: ["React", "FastAPI", "MongoDB", "Telegram Mini App", "JWT", "i18n"],
    bot: "Dli_shinebot",
    shot: dliShot,
  },
  {
    id: "business-hub",
    index: "05",
    title: "BUSINESS",
    titleAlt: "HUB",
    category: "Bot + panel / Demo",
    summary:
      "Telegram bot va boshqaruv paneli bitta tizim sifatida — ochib, o'zingiz ishlatib ko'rasiz.",
    detail:
      "Xizmat ko'rsatuvchi bizneslar uchun tayyor asos: botda navbat olinadi, u shu zahoti paneldagi kalendar, mijozlar bazasi va xabarnomalarda paydo bo'ladi. Besh yo'nalish uchun sozlangan — salon, restoran, o'quv markazi, klinika, avtoservis. AI operator haqiqiy model bilan ishlaydi; savol serverdagi funksiyaga boradi, kalit brauzerga chiqmaydi.",
    tech: [
      "TanStack Start",
      "TypeScript",
      "Recharts",
      "Supabase Edge Functions",
      "Gemini",
      "Telegram Bot API",
    ],
    demo: "/demo",
    shot: businessHubShot,
  },
];
