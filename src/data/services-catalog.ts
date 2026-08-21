/**
 * Full pricing catalog — sourced verbatim from
 * Xojasoipov_Xizmatlar_Katalogi.docx (the approved services catalog).
 *
 * This mirrors the same figures the AI bot quotes from
 * (bot/src/ai/knowledgeData.ts / supabase/functions/xojasoipov-bot/ai/knowledgeData.ts)
 * so the public site and the bot never disagree on a price. Kept as a
 * separate file (not imported cross-app) since the site and the bot are two
 * different deploy targets — update both together when the catalog changes.
 */

export interface CatalogItem {
  name: string;
  duration: string;
  som: string;
  usd: string;
}

export interface CatalogCategory {
  key: "audit" | "web" | "mobile" | "ai" | "crm" | "retainer";
  num: string;
  title: string;
  items: CatalogItem[];
}

export const CATALOG: CatalogCategory[] = [
  {
    key: "audit",
    num: "4.1",
    title: "Audit va strategiya",
    items: [
      {
        name: "Tezkor audit (1 kanal/mahsulot)",
        duration: "3–5 kun",
        som: "3 000 000 – 6 000 000 so'm",
        usd: "$250 – $500",
      },
      {
        name: "To'liq raqamli ekotizim auditi (sayt + bot + ilova + SMM)",
        duration: "1–2 hafta",
        som: "8 000 000 – 15 000 000 so'm",
        usd: "$650 – $1 250",
      },
      {
        name: "Xavfsizlik va brend auditi (klon bot, domen tekshiruvi)",
        duration: "3–5 kun",
        som: "4 000 000 – 8 000 000 so'm",
        usd: "$350 – $650",
      },
    ],
  },
  {
    key: "web",
    num: "4.2",
    title: "Veb va marketplace",
    items: [
      {
        name: "Landing / korporativ sayt",
        duration: "2–3 hafta",
        som: "6 000 000 – 20 000 000 so'm",
        usd: "$500 – $1 700",
      },
      {
        name: "E-commerce/marketplace qurish yoki qayta qurish",
        duration: "4–8 hafta",
        som: "20 000 000 – 45 000 000 so'm",
        usd: "$1 700 – $3 800",
      },
      {
        name: "SEO / ASO optimallashtirish (Google + App Store)",
        duration: "2–3 hafta",
        som: "5 000 000 – 10 000 000 so'm",
        usd: "$400 – $850",
      },
    ],
  },
  {
    key: "mobile",
    num: "4.3",
    title: "Mobil va Telegram bot ekotizimi",
    items: [
      {
        name: "Bot ekotizimini konsolidatsiya qilish (bir nechtasini birlashtirish)",
        duration: "2–3 hafta",
        som: "10 000 000 – 20 000 000 so'm",
        usd: "$850 – $1 700",
      },
      {
        name: "Onboarding UX qayta qurish (og'ir video → tugma-oqim)",
        duration: "1–2 hafta",
        som: "5 000 000 – 9 000 000 so'm",
        usd: "$400 – $750",
      },
      {
        name: "Native mobil ilova — yangi funksiya / yaxshilash",
        duration: "loyihaga qarab",
        som: "15 000 000 so'mdan",
        usd: "$1 250 dan",
      },
    ],
  },
  {
    key: "ai",
    num: "4.4",
    title: "AI integratsiyasi",
    items: [
      {
        name: "AI mijozlarga xizmat (real buyurtma bazasiga ulangan)",
        duration: "3–5 hafta",
        som: "15 000 000 – 30 000 000 so'm",
        usd: "$1 250 – $2 500",
      },
      {
        name: "AI-SMM avtomatlashtirish (oylik xizmat)",
        duration: "doimiy",
        som: "3 000 000 – 7 000 000 so'm/oy",
        usd: "$250 – $600 /oy",
      },
      {
        name: "AI xarid/narx yordamchisi (kalkulyator)",
        duration: "2–3 hafta",
        som: "8 000 000 – 20 000 000 so'm",
        usd: "$650 – $1 700",
      },
    ],
  },
  {
    key: "crm",
    num: "4.5",
    title: "CRM va ichki tizimlar",
    items: [
      {
        name: "Buyurtma/mijoz CRM (yagona ma'lumot bazasi)",
        duration: "6–10 hafta",
        som: "35 000 000 – 95 000 000 so'm",
        usd: "$3 000 – $8 000+",
      },
    ],
  },
  {
    key: "retainer",
    num: "4.6",
    title: "Doimiy hamkorlik",
    items: [
      {
        name: "Oylik texnik qo'llab-quvvatlash (retainer)",
        duration: "doimiy",
        som: "4 000 000 – 12 000 000 so'm/oy",
        usd: "$350 – $1 000 /oy",
      },
    ],
  },
];

export interface Package {
  name: string;
  price: string;
  priceUsd: string;
  duration: string;
  popular?: boolean;
  features: string[];
}

export const PACKAGES: Package[] = [
  {
    name: "Boshlang'ich",
    price: "12 000 000 so'm",
    priceUsd: "~$1 000",
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
    price: "35 000 000 so'm",
    priceUsd: "~$2 900",
    duration: "4–5 hafta",
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
    price: "95 000 000 so'm",
    priceUsd: "~$8 000",
    duration: "8–12 hafta",
    features: [
      "O'sish paketining barchasi",
      "AI mijozlarga xizmat (real ma'lumotga ulangan)",
      "Marketplace UX yangilanishi",
      "SEO/ASO to'liq optimallashtirish",
      "3 oy doimiy hamkorlik va rivojlantirish",
      "Bosqichma-bosqich to'lov imkoniyati",
    ],
  },
];

export const PROCESS: { step: string; title: string; desc: string }[] = [
  { step: "01", title: "Bepul dastlabki suhbat", desc: "Muammo va maqsadni aniqlaymiz (30–40 daqiqa)." },
  { step: "02", title: "Audit / taklif", desc: "Aniq topilmalar va narx-muddat bilan yozma hujjat." },
  { step: "03", title: "Ishlab chiqish", desc: "Muntazam oraliq demolar bilan, har bosqichda ko'rib-tasdiqlanadi." },
  { step: "04", title: "Sifat tekshiruvi", desc: "Har bir yechim xavfsizlik va ishonchlilik nuqtai nazaridan tekshiriladi." },
  { step: "05", title: "Topshirish va kuzatuv", desc: "Birinchi 1–2 hafta bepul monitoring va tez tuzatish." },
];

export const TERMS: string[] = [
  "Loyihaviy ishlar: 50% oldindan avans, 50% yetkazib berilgandan keyin.",
  "Oylik xizmatlar: oy boshida oldindan to'lov, 30 kun oldin ogohlantirib istalgan vaqtda bekor qilish huquqi.",
  "Yetkazilgan har bir ish uchun 14 kunlik bepul tuzatish kafolati.",
  "Yakuniy to'lovdan so'ng barcha kod va material to'liq mijoz mulki bo'ladi.",
  "Xohlasa, ishni boshlashdan oldin maxfiylik shartnomasi (NDA) imzolanadi.",
];
