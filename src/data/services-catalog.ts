/**
 * Full pricing catalog. The audit-through-retainer categories are sourced
 * verbatim from Xojasoipov_Xizmatlar_Katalogi.docx (the approved services
 * catalog) and mirror the same figures the AI bot quotes from
 * (bot/src/ai/knowledgeData.ts / supabase/functions/xojasoipov-bot/ai/knowledgeData.ts)
 * so the public site and the bot never disagree on a price.
 *
 * "quick" is new: small, fast-turnaround jobs a solo full-stack/AI developer
 * actually takes on between the larger engagements above -- a bug fix, one
 * API hookup, a bot command -- priced and scoped for that, not padded down
 * from a bigger package.
 *
 * Every price is USD-only by design: this catalog's audience includes
 * clients outside Uzbekistan, and a single currency is one less thing to
 * mentally convert. Kept as a separate file (not imported cross-app) since
 * the site and the bot are two different deploy targets -- update both
 * together when the catalog changes.
 */

export interface CatalogItem {
  name: string;
  duration: string;
  price: string;
}

export interface CatalogCategory {
  key: "quick" | "audit" | "web" | "mobile" | "ai" | "crm" | "retainer";
  num: string;
  title: string;
  items: CatalogItem[];
}

export const CATALOG: CatalogCategory[] = [
  {
    key: "quick",
    num: "4.0",
    title: "Mayda ishlar va tezkor tuzatishlar",
    items: [
      {
        name: "Tezkor bug tuzatish (1 ta xato, mavjud loyihada)",
        duration: "1 kun",
        price: "$40 – $80",
      },
      {
        name: "Telegram botga yangi buyruq yoki funksiya qo'shish",
        duration: "1–2 kun",
        price: "$80 – $200",
      },
      {
        name: "Mavjud saytga kichik UI/dizayn tuzatish",
        duration: "1 kun",
        price: "$50 – $120",
      },
      {
        name: "Bitta tashqi API integratsiyasi (to'lov, xarita, SMS va h.k.)",
        duration: "2–3 kun",
        price: "$150 – $350",
      },
      {
        name: "Server/hosting sozlash va deploy qilish",
        duration: "1 kun",
        price: "$60 – $150",
      },
      {
        name: "Texnik konsultatsiya",
        duration: "1 soat",
        price: "$40 /soat",
      },
    ],
  },
  {
    key: "audit",
    num: "4.1",
    title: "Audit va strategiya",
    items: [
      {
        name: "Tezkor audit (1 kanal/mahsulot)",
        duration: "3–5 kun",
        price: "$250 – $500",
      },
      {
        name: "To'liq raqamli ekotizim auditi (sayt + bot + ilova + SMM)",
        duration: "1–2 hafta",
        price: "$650 – $1 250",
      },
      {
        name: "Xavfsizlik va brend auditi (klon bot, domen tekshiruvi)",
        duration: "3–5 kun",
        price: "$350 – $650",
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
        price: "$500 – $1 700",
      },
      {
        name: "E-commerce/marketplace qurish yoki qayta qurish",
        duration: "4–8 hafta",
        price: "$1 700 – $3 800",
      },
      {
        name: "SEO / ASO optimallashtirish (Google + App Store)",
        duration: "2–3 hafta",
        price: "$400 – $850",
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
        price: "$850 – $1 700",
      },
      {
        name: "Onboarding UX qayta qurish (og'ir video → tugma-oqim)",
        duration: "1–2 hafta",
        price: "$400 – $750",
      },
      {
        name: "Native mobil ilova — yangi funksiya / yaxshilash",
        duration: "loyihaga qarab",
        price: "$1 250 dan",
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
        price: "$1 250 – $2 500",
      },
      {
        name: "AI-SMM avtomatlashtirish (oylik xizmat)",
        duration: "doimiy",
        price: "$250 – $600 /oy",
      },
      {
        name: "AI xarid/narx yordamchisi (kalkulyator)",
        duration: "2–3 hafta",
        price: "$650 – $1 700",
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
        price: "$3 000 – $8 000+",
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
        price: "$350 – $1 000 /oy",
      },
    ],
  },
];

export interface Package {
  name: string;
  price: string;
  duration: string;
  popular?: boolean;
  features: string[];
}

export const PACKAGES: Package[] = [
  {
    name: "Boshlang'ich",
    price: "$1 000",
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
    price: "$2 900",
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
    price: "$8 000",
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
