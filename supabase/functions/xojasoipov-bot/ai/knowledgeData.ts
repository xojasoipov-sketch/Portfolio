/**
 * Identity facts the deployed bot imports directly: PROJECTS for /post and
 * CONTACT for the contact reply.
 *
 * The rest of the knowledge base -- catalogue, packages, terms, FAQ -- lives
 * in knowledgeSeed.ts, which seedKnowledge.ts upserts into
 * xbot_knowledge_items. The agent reads that table at runtime, so shipping a
 * second copy inside the edge function duplicated the source of truth, and
 * meant a pricing edit could be live in one place and stale in the other.
 * Nothing here is invented; it mirrors the portfolio site.
 */

export const PROFILE = {
  name: "Saidburxon Xojasoipov",
  title: "Full-stack Developer & AI Solutions Developer",
  tagline: "Bizneslarni raqamli raqobatda yetakchi qilaman",
  location: "Toshkent, O'zbekiston",
  bio:
    "Men — to'liq stack (frontend, backend, mobil) dasturchiman. So'nggi yillarda asosiy yo'nalishim — " +
    "sun'iy intellekt bilan integratsiya qilingan tizimlar: AI mijozlarga xizmat botlari, ko'p-provayderli AI " +
    "infratuzilma, avtomatlashtirilgan SMM tizimlari " +
    "va CRM'lar. Zamonaviy AI-yordamchi vositalar bilan ishlaganim uchun loyihalarni an'anaviy agentliklarga " +
    "nisbatan sezilarli tezroq yetkazib bera olaman.",
  principle: "Ishimning yadrosi — avval chuqur audit, keyin aniq yechim. Har bir taklif taxmin emas, real tekshiruv natijasiga asoslanadi.",
} as const;

/** Real project data — mirrors src/data/projects.ts in the portfolio site. */
export const PROJECTS = [
  {
    key: "zet",
    title: "ZET",
    category: "AI Operating System",
    summary: "Shaxsiy AI operatsion tizimi — bitta egaga tegishli, ommaviy SaaS emas.",
    detail:
      "Buyruq -> Reja -> Harakat -> Tekshirish -> Natija modeli. To'rt bosqichli model strategiyasi (lokal -> bepul -> arzon -> kuchli) va qattiq budjet chegaralari bilan.",
    tech: ["Python 3.12", "FastAPI", "PostgreSQL", "pgvector", "Redis", "Multi-agent"],
  },
  {
    key: "sadiprime",
    title: "SadiPrime",
    category: "AI SaaS / Education",
    summary: "O'quv markazlari uchun AI-quvvatli boshqaruv platformasi.",
    detail: "Ko'p-tenantli CRM: o'qituvchilar, guruhlar, o'quvchilar, davomat, to'lov davrlari va obunalar. Ishlab turgan mahsulot: sadiprime-tizim.uz",
    tech: ["TanStack Start", "TypeScript", "PostgreSQL", "Cloudflare", "Docker"],
  },
  {
    key: "pari",
    title: "Pari AI",
    category: "AI Assistant / Telegram",
    summary: "Next.js asosidagi shaxsiy AI assistant.",
    detail: "Chat, Telegram bot, knowledge base, SMM va biznes vositalari bitta tizimda. Bulutli LLM bilan bir qatorda lokal model (Ollama) qo'llab-quvvatlanadi.",
    tech: ["Next.js", "TypeScript", "Python", "Telegram Bot API", "Ollama", "Railway"],
  },
  {
    key: "dli",
    title: "DLI Shop",
    category: "E-Commerce",
    summary: "To'liq e-commerce platformasi va unga ulangan Telegram do'koni.",
    detail: "Katalog, qidiruv, narx oralig'i va saralash filtrlari; JWT autentifikatsiya, ko'p tilli interfeys va admin dashboard.",
    tech: ["React", "FastAPI", "MongoDB", "Telegram Mini App", "JWT", "i18n"],
  },
] as const;

export const CONTACT = {
  email: "xojasoipov@gmail.com",
  telegram: "@xojasoipov",
} as const;
