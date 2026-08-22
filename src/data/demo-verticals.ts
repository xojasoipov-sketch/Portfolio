/**
 * The five fictional businesses the /demo page runs on.
 *
 * Everything here is invented on purpose and labelled as such in the UI — it
 * exists so a visitor can operate a working system without a real client's
 * data being on display. The real portfolio numbers live in projects.ts and
 * services-catalog.ts and are never mixed with these.
 *
 * The AI operator's copy of the services, address and phone lives server-side
 * in supabase/functions/demo-ai. It has to: a system prompt sent from the
 * browser could be rewritten by anyone, which would turn the endpoint into a
 * general-purpose model proxy. When a price changes here, change it there too.
 */
import {
  Scissors,
  UtensilsCrossed,
  GraduationCap,
  Stethoscope,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const DEMO_TIMES = [
  "09:00",
  "10:30",
  "12:00",
  "14:00",
  "15:30",
  "17:00",
] as const;
export const DEMO_DAYS = ["Bugun", "Ertaga"] as const;

export type DemoDay = (typeof DEMO_DAYS)[number];

export interface DemoService {
  name: string;
  price: string;
  share: number;
}

export interface DemoClient {
  id: number;
  name: string;
  phone: string;
  note: string;
  src: "admin" | "telegram";
}

export interface DemoMenuItem {
  label: string;
  action: string;
}

export interface Vertical {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Two accent stops; every gradient and glow on the page derives from them. */
  hex: string;
  hex2: string;
  brand: string;
  botHandle: string;
  slug: string;
  intro: string;
  menu: DemoMenuItem[];
  services: DemoService[];
  address: string;
  phone: string;
  /** Section headings change with the trade: a clinic has patients, not clients. */
  crmTitle: string;
  bookingTitle: string;
  bookingNoun: string;
  leadContext: string;
  revenue: string;
  growth: number;
  staff: string[];
  crmSeed: DemoClient[];
}

const MENU = (book: string, prices: string): DemoMenuItem[] => [
  { label: book, action: "book" },
  { label: prices, action: "prices" },
  { label: "📍 Manzil", action: "address" },
  { label: "💬 AI operator", action: "ai" },
];

export const VERTICALS: Vertical[] = [
  {
    key: "salon",
    label: "Salon",
    icon: Scissors,
    hex: "#f43f5e",
    hex2: "#a855f7",
    brand: "Lola Beauty Studio",
    botHandle: "Lola Beauty Bot",
    slug: "lola_beauty",
    intro:
      "Salom! Men Lola Beauty Studio botiman. Quyidagilardan birini tanlang yoki savolingizni yozing.",
    menu: MENU("📅 Navbat olish", "💅 Narxlar"),
    services: [
      { name: "Soch turmagi", price: "60 000", share: 45 },
      { name: "Manikyur", price: "90 000", share: 25 },
      { name: "Make up", price: "150 000", share: 20 },
      { name: "Boshqalar", price: "120 000", share: 10 },
    ],
    address: "Toshkent, Chilonzor 9-kvartal, 42-uy\nHar kuni 09:00–20:00",
    phone: "+998 71 200 40 40",
    crmTitle: "Mijozlar",
    bookingTitle: "Navbatlar",
    bookingNoun: "Navbat",
    leadContext: "salon",
    revenue: "35 750 000",
    growth: 12,
    staff: [
      "Dilnoza — usta",
      "Kamola — usta",
      "Sevara — administrator",
      "Nigora — usta",
      "Zarina — usta",
      "Aziza — kassir",
    ],
    crmSeed: [
      {
        id: 1,
        name: "Nilufar Yusupova",
        phone: "+998 90 123 45 67",
        note: "Soch bo'yash — muntazam",
        src: "admin",
      },
      {
        id: 2,
        name: "Kamola Saidova",
        phone: "+998 93 456 78 90",
        note: "Manikyur",
        src: "admin",
      },
      {
        id: 3,
        name: "Shahnoza Umarova",
        phone: "+998 94 789 01 23",
        note: "Pedikyur",
        src: "telegram",
      },
    ],
  },
  {
    key: "restaurant",
    label: "Restoran",
    icon: UtensilsCrossed,
    hex: "#f59e0b",
    hex2: "#f43f5e",
    brand: "Choyxona Navro'z",
    botHandle: "Navro'z Bot",
    slug: "navroz",
    intro:
      "Salom! Men Choyxona Navro'z botiman. Stol band qiling yoki menyuni ko'ring.",
    menu: MENU("🍽 Stol band qilish", "📋 Menyu"),
    services: [
      { name: "Osh", price: "45 000", share: 40 },
      { name: "Norin", price: "40 000", share: 25 },
      { name: "Lag'mon", price: "38 000", share: 20 },
      { name: "Shashlik", price: "25 000", share: 15 },
    ],
    address: "Toshkent, Buyuk Ipak Yo'li 12\nHar kuni 10:00–23:00",
    phone: "+998 71 233 55 66",
    crmTitle: "Mijozlar",
    bookingTitle: "Stollar",
    bookingNoun: "Stol",
    leadContext: "restoran",
    revenue: "128 400 000",
    growth: 8,
    staff: [
      "Jasur — menejer",
      "Aziza — administrator",
      "Bekzod — oshpaz",
      "Sardor — ofitsiant",
      "Kamron — ofitsiant",
    ],
    crmSeed: [
      {
        id: 1,
        name: "Jahongir Tosheev",
        phone: "+998 91 234 56 78",
        note: "Stol #4, doimiy mijoz",
        src: "admin",
      },
      {
        id: 2,
        name: "Zilola Mirzayeva",
        phone: "+998 97 345 67 89",
        note: "Yetkazib berish",
        src: "admin",
      },
      {
        id: 3,
        name: "Rustam Qodirov",
        phone: "+998 90 555 66 77",
        note: "Korporativ buyurtma",
        src: "telegram",
      },
    ],
  },
  {
    key: "taalim",
    label: "Ta'lim",
    icon: GraduationCap,
    hex: "#3b82f6",
    hex2: "#06b6d4",
    brand: "Bilim Plus",
    botHandle: "Bilim Plus Bot",
    slug: "bilim_plus",
    intro:
      "Salom! Men Bilim Plus o'quv markazi botiman. Sinov darsiga yoziling yoki narxlarni ko'ring.",
    menu: MENU("📅 Sinov darsi", "💵 Kurslar narxi"),
    services: [
      { name: "Ingliz tili", price: "600 000", share: 40 },
      { name: "Matematika", price: "500 000", share: 25 },
      { name: "IT boshlang'ich", price: "750 000", share: 22 },
      { name: "Rus tili", price: "550 000", share: 13 },
    ],
    address: "Toshkent, Yunusobod 4-mavze, 15-uy\nDush–Shanba 09:00–19:00",
    phone: "+998 71 244 77 88",
    crmTitle: "O'quvchilar",
    bookingTitle: "Darslar",
    bookingNoun: "Sinov darsi",
    leadContext: "o'quv markazi",
    revenue: "94 200 000",
    growth: 15,
    staff: [
      "Aziza — ingliz tili",
      "Bekzod — matematika",
      "Nodira — administrator",
      "Javlon — IT",
      "Malika — rus tili",
    ],
    crmSeed: [
      {
        id: 1,
        name: "Aziz Karimov",
        phone: "+998 90 111 22 33",
        note: "Matematika, 9-guruh",
        src: "admin",
      },
      {
        id: 2,
        name: "Malika Rahimova",
        phone: "+998 93 222 33 44",
        note: "Ingliz tili, 5-guruh",
        src: "admin",
      },
      {
        id: 3,
        name: "Sanjar Umarov",
        phone: "+998 99 888 77 66",
        note: "Sinov darsiga yozildi",
        src: "telegram",
      },
    ],
  },
  {
    key: "klinika",
    label: "Klinika",
    icon: Stethoscope,
    hex: "#14b8a6",
    hex2: "#3b82f6",
    brand: "Shifo Med",
    botHandle: "Shifo Med Bot",
    slug: "shifo_med",
    intro:
      "Salom! Men Shifo Med klinikasi botiman. Shifokorga yoziling yoki narxlarni ko'ring.",
    menu: MENU("🩺 Shifokorga yozilish", "💵 Narxlar"),
    services: [
      { name: "Terapevt", price: "100 000", share: 35 },
      { name: "Kardiolog", price: "150 000", share: 30 },
      { name: "UZI", price: "120 000", share: 22 },
      { name: "Tahlillar", price: "80 000", share: 13 },
    ],
    address: "Toshkent, Navoiy ko'chasi 30\nDush–Shanba 08:00–18:00",
    phone: "+998 71 255 99 00",
    crmTitle: "Bemorlar",
    bookingTitle: "Qabullar",
    bookingNoun: "Qabul",
    leadContext: "klinika",
    revenue: "212 800 000",
    growth: 6,
    staff: [
      "Dr. Aliyeva — kardiolog",
      "Dr. Rahimov — terapevt",
      "Zuhra — registratura",
      "Dr. Yusupov — UZI",
      "Feruza — hamshira",
    ],
    crmSeed: [
      {
        id: 1,
        name: "Sardor Nazarov",
        phone: "+998 94 333 44 55",
        note: "Kardiolog, nazorat",
        src: "admin",
      },
      {
        id: 2,
        name: "Gulnora Yusupova",
        phone: "+998 95 444 55 66",
        note: "Dr. Aliyeva, birinchi qabul",
        src: "admin",
      },
      {
        id: 3,
        name: "Otabek Sharipov",
        phone: "+998 88 222 11 00",
        note: "Telegram orqali yozildi",
        src: "telegram",
      },
    ],
  },
  {
    key: "avtoservis",
    label: "Avtoservis",
    icon: Wrench,
    hex: "#8b5cf6",
    hex2: "#ec4899",
    brand: "Turbo Auto Servis",
    botHandle: "Turbo Auto Bot",
    slug: "turbo_auto",
    intro:
      "Salom! Men Turbo Auto Servis botiman. Ta'mirlashga yoziling yoki narxlarni ko'ring.",
    menu: MENU("🔧 Ta'mirlashga yozilish", "💵 Narxlar"),
    services: [
      { name: "Moy almashtirish", price: "250 000", share: 38 },
      { name: "Diagnostika", price: "150 000", share: 27 },
      { name: "Tormoz kolodka", price: "400 000", share: 22 },
      { name: "Yuvish", price: "60 000", share: 13 },
    ],
    address: "Toshkent, Sergeli, Yangi Sanoat 8\nHar kuni 08:00–20:00",
    phone: "+998 71 266 33 22",
    crmTitle: "Mijozlar",
    bookingTitle: "Ta'mirlash",
    bookingNoun: "Ta'mirlash",
    leadContext: "avtoservis",
    revenue: "76 500 000",
    growth: 9,
    staff: [
      "Bobur — usta",
      "Sherzod — usta",
      "Dilshod — administrator",
      "Anvar — diagnostika",
    ],
    crmSeed: [
      {
        id: 1,
        name: "Ulug'bek Sobirov",
        phone: "+998 90 777 88 99",
        note: "Cobalt — moy almashtirish",
        src: "admin",
      },
      {
        id: 2,
        name: "Farrux Ergashev",
        phone: "+998 93 111 00 22",
        note: "Malibu — diagnostika",
        src: "admin",
      },
      {
        id: 3,
        name: "Doniyor Rasulov",
        phone: "+998 97 333 22 11",
        note: "Telegram orqali yozildi",
        src: "telegram",
      },
    ],
  },
];

export const VERTICAL_BY_KEY = Object.fromEntries(
  VERTICALS.map((v) => [v.key, v]),
) as Record<string, Vertical>;

/** Fourteen fortnightly points; the shape is illustrative, not measured. */
export const REVENUE_SERIES = [
  12, 18, 15, 22, 19, 26, 24, 31, 28, 34, 30, 38, 35, 44,
];
