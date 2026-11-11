/**
 * CV content.
 *
 * Every fact here traces back to something already published on this site or
 * in the bot's approved knowledge base (src/data/projects.ts,
 * bot/src/ai/knowledgeData.ts). Nothing is invented: there is deliberately no
 * fabricated employment history, no invented dates, and no "N years of
 * experience" claim, because none of that is on record anywhere. A
 * project-led CV is the honest shape for a freelance developer, and it is
 * also the shape a client actually reads.
 */

export const CV_PROFILE = {
  name: "Saidburxon Xojasoipov",
  title: "Full-stack Developer & AI Solutions Developer",
  location: "Toshkent, O'zbekiston",
  email: "xojasoipov@gmail.com",
  telegram: "@xojasoipov",
  // No web address on purpose. The only host this site currently has is the
  // code-hosting URL, which carries the owner's account name -- that name is
  // closed information the bot is explicitly instructed never to reveal
  // (bot/src/ai/systemPrompt.ts), so printing it on the CV would be the site
  // leaking what the bot guards. Restore a `site` field once a neutral domain exists.
  summary:
    "To'liq stack dasturchi — frontend, backend va mobil. Asosiy yo'nalish: sun'iy intellekt bilan integratsiya qilingan tizimlar — AI mijozlarga xizmat botlari, ko'p-provayderli AI infratuzilma, avtomatlashtirilgan SMM tizimlari va CRM'lar. Ishning yadrosi — avval chuqur audit, keyin aniq yechim.",
} as const;

export interface CvHighlight {
  label: string;
  detail: string;
}

/** What differentiates the work — mirrors the site's DIFFERENTIATORS. */
export const CV_HIGHLIGHTS: CvHighlight[] = [
  {
    label: "To'liq qamrov",
    detail:
      "Sayt, mobil ilova, Telegram bot/mini-app, AI integratsiya va CRM — bitta qo'ldan, izchil arxitektura bilan.",
  },
  {
    label: "Tezkor yetkazib berish",
    detail:
      "AI-quvvatli ishlab chiqish jarayoni tufayli birinchi ishlaydigan natija odatda 3–7 kun ichida ko'rinadi.",
  },
  {
    label: "Audit-birinchi yondashuv",
    detail:
      "Pul sarflashdan oldin nima va nega buzilganini ko'rsatadi, keyingina yechim taklif qiladi.",
  },
  {
    label: "Xavfsizlik va brend nazorati",
    detail:
      "Klon botlar, eskirgan kanallar va domen xavflarini aniqlash — ishning ajralmas qismi.",
  },
];

export interface CvProject {
  title: string;
  category: string;
  summary: string;
  tech: string[];
  link?: string;
}

/** Selected work — the same projects the site shows, condensed. */
export const CV_PROJECTS: CvProject[] = [
  {
    title: "SadiPrime",
    category: "AI SaaS / Education",
    summary:
      "O'quv markazlari uchun ko'p-tenantli boshqaruv platformasi: o'qituvchilar, guruhlar, davomat, to'lov davrlari va obunalar. Ishlab turgan mahsulot.",
    tech: [
      "TanStack Start",
      "TypeScript",
      "PostgreSQL",
      "Cloudflare",
      "Docker",
    ],
    link: "sadiprime-tizim.uz",
  },
  {
    title: "DLI Shop",
    category: "E-Commerce",
    summary:
      "To'liq e-commerce platformasi va unga ulangan Telegram do'koni: katalog, filtrlar, JWT autentifikatsiya, ko'p tilli interfeys va admin dashboard.",
    tech: ["React", "FastAPI", "MongoDB", "Telegram Mini App", "JWT", "i18n"],
    link: "t.me/Dli_shinebot",
  },
  {
    title: "Hisobim",
    category: "AI Moliya / Telegram",
    summary:
      "O'zbekcha ovozli xabardan tranzaksiyalarni ajratib oluvchi Telegram buxgalter va Mini App. AI faqat gapni strukturaga soladi; balans, foyda va valyuta hisobini backend bilan PostgreSQL deterministik sanaydi. Qarzlar, tabiiy tilda tuzatish va audit jurnali bilan.",
    tech: [
      "TypeScript",
      "Hono",
      "grammY",
      "Supabase PostgreSQL",
      "React",
      "Whisper STT",
    ],
    link: "t.me/Hisobimaibot",
  },
  {
    title: "Sahna Studio",
    category: "Chrome kengaytma / AI video",
    summary:
      "Google Flow uchun yon panel: promptlarni navbatga qo'yib ishlatish, XLSX'dan import, chiqmagan sahnani avtomatik qayta yuborish, prompt ustaxonasi va ovoz bilan boshqaruv. Kalit va promptlar foydalanuvchi qurilmasida qoladi.",
    tech: [
      "Chrome MV3",
      "Side Panel API",
      "JavaScript",
      "Service Worker",
      "Web Speech API",
    ],
    // Not on the Chrome Web Store yet, so there is no address to print.
  },
];

export interface CvSkillGroup {
  group: string;
  items: string[];
}

export const CV_SKILLS: CvSkillGroup[] = [
  {
    group: "Frontend",
    items: ["React", "Next.js", "TanStack Start", "TypeScript", "Tailwind CSS"],
  },
  {
    group: "Backend",
    items: ["Node.js", "Python", "FastAPI", "Hono", "REST API"],
  },
  {
    group: "Ma'lumotlar bazasi",
    items: ["PostgreSQL", "Supabase", "MongoDB", "Redis", "pgvector"],
  },
  {
    group: "AI",
    items: [
      "LLM API integratsiya",
      "AI agentlar",
      "Multi-provider routing",
      "Ollama",
    ],
  },
  {
    group: "Infratuzilma",
    items: ["Docker", "Cloudflare Workers", "Vercel", "Railway", "Hetzner"],
  },
  {
    group: "Telegram",
    items: ["Bot API", "Mini App", "Webhook arxitektura", "grammY"],
  },
];

/** Service directions offered — matches /xizmatlar. */
export const CV_SERVICES: string[] = [
  "Audit va strategiya",
  "Veb va marketplace",
  "Mobil va Telegram bot ekotizimi",
  "AI integratsiyasi",
  "CRM va ichki tizimlar",
  "Doimiy texnik hamkorlik",
];
