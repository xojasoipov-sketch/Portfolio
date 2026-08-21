/**
 * The AI agent's single source of truth (item 22-23: hallucination
 * protection). Every fact the agent states about Saidburxon, his projects,
 * services, pricing, or process must trace back to this file — nothing here
 * is invented; it mirrors the approved content already shipped on the
 * portfolio site and the services catalog document.
 *
 * `seedKnowledge.ts` upserts this into xbot.knowledge_items; the AI agent
 * loads from the DB at runtime so updates don't require a redeploy.
 */

export const PROFILE = {
  name: "Saidburxon Xojasoipov",
  title: "Full-stack Developer & AI Solutions Developer",
  tagline: "Bizneslarni raqamli raqobatda yetakchi qilaman",
  location: "Toshkent, O'zbekiston",
  bio:
    "Men — to'liq stack (frontend, backend, mobil) dasturchiman. So'nggi yillarda asosiy yo'nalishim — " +
    "sun'iy intellekt bilan integratsiya qilingan tizimlar: AI mijozlarga xizmat botlari, ko'p-provayderli AI " +
    "infratuzilma (OmniRoute — 251 ta AI provayderni boshqaruvchi router), avtomatlashtirilgan SMM tizimlari " +
    "va CRM'lar. Zamonaviy AI-yordamchi vositalar bilan ishlaganim uchun loyihalarni an'anaviy agentliklarga " +
    "nisbatan sezilarli tezroq yetkazib bera olaman.",
  principle: "Ishimning yadrosi — avval chuqur audit, keyin aniq yechim. Har bir taklif taxmin emas, real tekshiruv natijasiga asoslanadi.",
} as const;

export const DIFFERENTIATORS = [
  {
    title: "To'liq qamrov",
    desc: "Sayt, mobil ilova, Telegram bot/mini-app, AI integratsiya va CRM'ni bitta qo'ldan, izchil arxitektura bilan quradi.",
  },
  {
    title: "Tezkor yetkazib berish",
    desc: "Zamonaviy AI-quvvatli ishlab chiqish jarayoni tufayli birinchi ishlaydigan natija odatda 3–7 kun ichida ko'rinadi.",
  },
  {
    title: "Audit-birinchi yondashuv",
    desc: "Pul sarflashdan oldin, aniq nima buzilganini va nega buzilganini ko'rsatadi, keyingina yechim taklif qiladi.",
  },
  {
    title: "Xavfsizlik va brend nazorati",
    desc: "Noma'lum/klon botlar, eskirgan kanallar kabi ko'rinmas xavflarni aniqlash — ishining ajralmas qismi.",
  },
] as const;

export const DIRECTIONS = [
  { title: "Audit & Strategiya", desc: "Tezkor audit, to'liq ekotizim auditi, xavfsizlik va brend auditi." },
  { title: "Veb & Marketplace", desc: "Landing/korporativ sayt, e-commerce qurish, SEO/ASO optimallashtirish." },
  { title: "Mobil & Telegram Bot Ekotizimi", desc: "Bot konsolidatsiyasi, onboarding UX, native mobil ilova." },
  { title: "AI Integratsiyasi", desc: "AI mijozlarga xizmat, AI-SMM avtomatlashtirish, AI xarid yordamchisi." },
  { title: "CRM & Ichki Tizimlar", desc: "Buyurtma va mijozlar uchun yagona ma'lumot bazasi." },
  { title: "Doimiy Hamkorlik", desc: "Oylik texnik qo'llab-quvvatlash va rivojlantirish." },
] as const;

export const PROCESS = [
  { step: "01", title: "Bepul dastlabki suhbat", desc: "Muammo va maqsadni aniqlash (30–40 daqiqa)." },
  { step: "02", title: "Audit / taklif", desc: "Aniq topilmalar va narx-muddat bilan yozma hujjat." },
  { step: "03", title: "Ishlab chiqish", desc: "Muntazam oraliq demolar bilan, har bosqichda ko'rib-tasdiqlanadi." },
  { step: "04", title: "Sifat tekshiruvi", desc: "Har bir yechim xavfsizlik va ishonchlilik nuqtai nazaridan tekshiriladi." },
  { step: "05", title: "Topshirish va kuzatuv", desc: "Birinchi 1–2 hafta bepul monitoring va tez tuzatish." },
] as const;

export const TECH_STACK = [
  "React", "Next.js", "TypeScript", "JavaScript", "TanStack Start", "Tailwind CSS",
  "Node.js", "Python", "FastAPI", "Hono",
  "PostgreSQL", "Supabase", "MongoDB",
  "LLM API integration", "AI agents", "AI automation",
  "Docker", "Cloudflare Workers", "Vercel", "Railway", "Hetzner",
  "Telegram Bot API", "REST API",
] as const;

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

/** Full services catalog — from Xojasoipov_Xizmatlar_Katalogi.docx. All prices are approved figures; the AI must quote them verbatim, never invent or round differently. */
export const SERVICE_CATALOG = [
  {
    group: "Audit va strategiya",
    items: [
      { name: "Tezkor audit (1 kanal/mahsulot)", duration: "3-5 kun", price: "3 000 000 – 6 000 000 so'm", usd: "$250 – $500" },
      { name: "To'liq raqamli ekotizim auditi (sayt + bot + ilova + SMM)", duration: "1-2 hafta", price: "8 000 000 – 15 000 000 so'm", usd: "$650 – $1 250" },
      { name: "Xavfsizlik va brend auditi (klon bot, domen tekshiruvi)", duration: "3-5 kun", price: "4 000 000 – 8 000 000 so'm", usd: "$350 – $650" },
    ],
  },
  {
    group: "Veb va marketplace",
    items: [
      { name: "Landing / korporativ sayt", duration: "2-3 hafta", price: "6 000 000 – 20 000 000 so'm", usd: "$500 – $1 700" },
      { name: "E-commerce/marketplace qurish yoki qayta qurish", duration: "4-8 hafta", price: "20 000 000 – 45 000 000 so'm", usd: "$1 700 – $3 800" },
      { name: "SEO / ASO optimallashtirish", duration: "2-3 hafta", price: "5 000 000 – 10 000 000 so'm", usd: "$400 – $850" },
    ],
  },
  {
    group: "Mobil va Telegram bot ekotizimi",
    items: [
      { name: "Bot ekotizimini konsolidatsiya qilish", duration: "2-3 hafta", price: "10 000 000 – 20 000 000 so'm", usd: "$850 – $1 700" },
      { name: "Onboarding UX qayta qurish", duration: "1-2 hafta", price: "5 000 000 – 9 000 000 so'm", usd: "$400 – $750" },
      { name: "Native mobil ilova — yangi funksiya / yaxshilash", duration: "loyihaga qarab", price: "15 000 000 so'mdan", usd: "$1 250 dan" },
    ],
  },
  {
    group: "AI integratsiyasi",
    items: [
      { name: "AI mijozlarga xizmat (real buyurtma bazasiga ulangan)", duration: "3-5 hafta", price: "15 000 000 – 30 000 000 so'm", usd: "$1 250 – $2 500" },
      { name: "AI-SMM avtomatlashtirish (oylik xizmat)", duration: "doimiy", price: "3 000 000 – 7 000 000 so'm/oy", usd: "$250 – $600 /oy" },
      { name: "AI xarid/narx yordamchisi (kalkulyator)", duration: "2-3 hafta", price: "8 000 000 – 20 000 000 so'm", usd: "$650 – $1 700" },
    ],
  },
  {
    group: "CRM va ichki tizimlar",
    items: [
      { name: "Buyurtma/mijoz CRM (yagona ma'lumot bazasi)", duration: "6-10 hafta", price: "35 000 000 – 95 000 000 so'm", usd: "$3 000 – $8 000+" },
    ],
  },
  {
    group: "Doimiy hamkorlik",
    items: [
      { name: "Oylik texnik qo'llab-quvvatlash (retainer)", duration: "doimiy", price: "4 000 000 – 12 000 000 so'm/oy", usd: "$350 – $1 000 /oy" },
    ],
  },
] as const;

export const PACKAGES = [
  {
    name: "Boshlang'ich",
    price: "12 000 000 so'm (~$1 000)",
    duration: "2 hafta",
    features: [
      "To'liq raqamli ekotizim auditi",
      "Eng kritik 2 muammoni tuzatish",
      "Yozma hisobot va ustuvorlik rejasi",
      "1 haftalik bepul tuzatish kafolati",
    ],
  },
  {
    name: "O'sish",
    price: "35 000 000 so'm (~$2 900)",
    duration: "4-5 hafta",
    popular: true,
    features: [
      "Boshlang'ich paketning barchasi",
      "Bot ekotizimini to'liq konsolidatsiya qilish",
      "Onboarding UX qayta qurish",
      "1 oy texnik qo'llab-quvvatlash",
      "14 kunlik tuzatish kafolati",
    ],
  },
  {
    name: "Raqobatbardosh ekotizim",
    price: "95 000 000 so'm (~$8 000)",
    duration: "8-12 hafta",
    features: [
      "O'sish paketining barchasi",
      "AI mijozlarga xizmat",
      "Marketplace UX yangilanishi",
      "SEO/ASO to'liq optimallashtirish",
      "3 oy doimiy hamkorlik",
    ],
  },
] as const;

export const TERMS = [
  "Loyihaviy ishlar: 50% oldindan avans, 50% yetkazib berilgandan keyin.",
  "Oylik xizmatlar: oy boshida oldindan to'lov, 30 kun oldin ogohlantirib istalgan vaqtda bekor qilish huquqi.",
  "Yetkazilgan har bir ish uchun 14 kunlik bepul tuzatish kafolati.",
  "Yakuniy to'lovdan so'ng barcha kod va material to'liq mijoz mulki bo'ladi.",
  "Xohlasa, ishni boshlashdan oldin maxfiylik shartnomasi (NDA) imzolanadi.",
] as const;

export const FAQ = [
  { q: "Loyiha qancha turadi?", a: "Har bir loyiha individual baholanadi. Katalogdagi narxlar boshlang'ich narxlar hisoblanadi." },
  { q: "Ishni boshlash uchun nima kerak?", a: "Loyihaning maqsadi, kerakli funksiyalar va kutilayotgan natija haqida qisqacha ma'lumot yetarli." },
  { q: "AI'ni mavjud biznesga qo'sha oladimi?", a: "Ha. Mavjud web sayt, Telegram bot, CRM yoki boshqa tizimlarga AI imkoniyatlarini integratsiya qilish mumkin." },
  { q: "Tayyor loyihani o'zgartirib bera oladimi?", a: "Ha. Mavjud web loyiha, bot yoki biznes tizimini tahlil qilib, yangi funksiyalar qo'shish yoki muammolarni tuzatish mumkin." },
] as const;

export const CONTACT = {
  email: "xojasoipov@gmail.com",
  telegram: "@xojasoipov",
} as const;
