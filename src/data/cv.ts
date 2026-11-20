/**
 * CV content for /cv and the downloadable PDF (public/Saidburxon-Xojasoipov-CV.pdf).
 *
 * Every fact here traces back to shipped work: the projects on this site,
 * the bot's approved knowledge base (bot/src/ai/knowledgeData.ts) and the
 * source of those projects (Docker image, CI pipeline, migrations, RLS,
 * auth). Nothing is invented: no employment history, no dates, no "N years
 * of experience", because none of that is on record anywhere.
 *
 * No code-hosting address on purpose: that URL carries the owner's account
 * name, which the bot is instructed never to reveal (bot/src/ai/systemPrompt.ts).
 * Restore a `site` field once a neutral domain exists.
 */

export const CV_PROFILE = {
  name: "Saidburxon Xojasoipov",
  firstName: "Saidburxon",
  lastName: "Xojasoipov",
  title: "Full-stack dasturchi · AI integratsiya",
  location: "Toshkent, O'zbekiston",
  email: "xojasoipov@gmail.com",
  telegram: "@xojasoipov",
  phone: "+998 88 555 66 04",
  phoneHref: "+998885556604",
  about: [
    "G'oyadan ishlab turgan mahsulotgacha bo'lgan yo'lni yolg'iz bosib o'taman: arxitektura, backend, frontend, ma'lumotlar bazasi, deploy va AI.",
    "LLM'ni biznesga xavfsiz ulayman: model gapni tushunadi, pul va hisob-kitobni esa aniq backend sanaydi.",
    "Muammoni avval tahlil qilaman, keyin tizim quraman.",
  ],
} as const;

export interface CvHighlight {
  label: string;
  detail: string;
}

/** Strengths, each backed by shipped code. */
export const CV_HIGHLIGHTS: CvHighlight[] = [
  {
    label: "Mahsulotni boshidan oxirigacha quraman",
    detail:
      "Ishlab turgan mahsulotlar: ta'lim SaaS, AI buxgalter, e-commerce, AI agent tizimi va Chrome kengaytma.",
  },
  {
    label: "AI'ni real biznesga ulayman",
    detail:
      "OpenAI va Gemini routing, o'zbekcha nutqni tanish (Whisper), sxema bilan tekshirilgan javoblar.",
  },
  {
    label: "Production intizomi",
    detail:
      "Docker, CI/CD, avtomatik testlar, versiyalangan migratsiyalar. Kod ishlab turgan holda yetkaziladi.",
  },
  {
    label: "Xavfsizlikni o'ylab yozaman",
    detail:
      "PostgreSQL RLS, JWT, HMAC tekshiruvi, sirlarni himoyalash, audit jurnali.",
  },
  {
    label: "Telegram ekotizimi",
    detail:
      "Bot, Mini App, webhook arxitektura, to'lov va CRM integratsiyasi.",
  },
  {
    label: "Tezlik",
    detail:
      "AI yordamidagi ishlab chiqish: birinchi ishlaydigan natija 3–7 kunda.",
  },
];

export interface CvProject {
  title: string;
  category: string;
  summary: string;
  tech: string[];
  link?: string;
  href?: string;
}

/** Selected work — the same projects the site shows, condensed. */
export const CV_PROJECTS: CvProject[] = [
  {
    title: "Hisobim",
    category: "AI buxgalter",
    summary:
      "Ovozli xabardan tranzaksiya ajratadigan Telegram bot va Mini App. AI faqat gapni strukturaga soladi, balans va valyutani backend sanaydi. Docker, CI (36 test fayli, npm audit), 26 ta migratsiya, RLS.",
    tech: ["TypeScript", "Hono", "grammY", "PostgreSQL", "React", "Whisper", "Docker"],
    link: "hisobimai.uz",
    href: "https://hisobimai.uz",
  },
  {
    title: "SadiPrime",
    category: "Ta'lim SaaS",
    summary:
      "O'quv markazlari uchun ko'p-tenantli platforma: o'qituvchilar, guruhlar, davomat, to'lov davrlari va obunalar.",
    tech: ["TanStack Start", "TypeScript", "PostgreSQL", "Cloudflare", "Docker"],
    link: "sadiprime-tizim.uz",
    href: "https://sadiprime-tizim.uz",
  },
  {
    title: "JARVIS",
    category: "AI operatsion tizim",
    summary:
      "Ovoz bilan boshqariladigan 12 agentli shaxsiy AI. Muhim amallardan oldin tasdiq so'raydi va har amalni jurnalga yozadi.",
    tech: ["Python", "JavaScript", "Chrome Extension", "Telegram"],
    link: "myjarvis.uz",
    href: "https://myjarvis.uz",
  },
  {
    title: "DLI Shop",
    category: "E-commerce",
    summary:
      "E-commerce platforma va Telegram do'kon: katalog, filtrlar, JWT autentifikatsiya, ko'p tilli interfeys, admin panel.",
    tech: ["React", "FastAPI", "MongoDB", "Telegram Mini App"],
    link: "t.me/Dli_shinebot",
    href: "https://t.me/Dli_shinebot",
  },
  {
    title: "Sahna Studio",
    category: "Chrome kengaytma",
    summary:
      "Google Flow uchun yon panel: promptlar navbati, XLSX import, avtomatik qayta yuborish, ovoz bilan boshqaruv. Kalitlar foydalanuvchi qurilmasida qoladi.",
    tech: ["Chrome MV3", "Service Worker", "JavaScript", "Web Speech API"],
  },
];

/** Headline skills, shown as chips. */
export const CV_CHIPS: string[] = [
  "AI integratsiya",
  "Backend",
  "Frontend",
  "CI/CD",
  "Docker",
  "Xavfsizlik",
];

export interface CvSkillGroup {
  group: string;
  items: string[];
}

export const CV_SKILLS: CvSkillGroup[] = [
  { group: "Til", items: ["Python", "TypeScript", "JavaScript"] },
  { group: "Backend", items: ["Node.js", "Hono", "FastAPI", "REST API"] },
  { group: "Frontend", items: ["React", "Next.js", "TanStack Start", "Tailwind CSS"] },
  { group: "Ma'lumot", items: ["PostgreSQL", "Supabase", "MongoDB", "Redis"] },
  { group: "AI", items: ["OpenAI", "Gemini", "Whisper", "Ollama", "AI agentlar"] },
  {
    group: "Infra",
    items: ["Docker", "GitHub Actions", "Linux", "Railway", "Cloudflare", "Hetzner"],
  },
  { group: "Telegram", items: ["Bot API", "Mini App", "grammY", "Webhook"] },
];
