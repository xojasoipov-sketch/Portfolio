import sadiprimeShot from "@/assets/projects/sadiprime.webp";
import dliShot from "@/assets/projects/dli.webp";
import hisobimShot from "@/assets/projects/hisobim.webp";
import sahnaStudioShot from "@/assets/projects/sahna-studio.webp";

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
  /**
   * True when `shot` is a drawn poster rather than a real screenshot. The
   * home page shows posters in grey tones, so only real screens carry colour.
   */
  poster?: boolean;
};

export const PROJECTS: Project[] = [
  {
    id: "sadiprime",
    index: "01",
    title: "SADIPRIME",
    category: "AI SaaS / Education",
    summary: "O'quv markazlari uchun AI-quvvatli boshqaruv platformasi.",
    detail:
      "Ko'p-tenantli CRM: o'qituvchilar, guruhlar, o'quvchilar, davomat, to'lov davrlari va obunalarni boshqaruvchi super-admin paneli. Ishlab turgan mahsulot: sadiprime-tizim.uz.",
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
    id: "dli",
    index: "02",
    title: "DLI",
    titleAlt: "SHOP",
    category: "E-Commerce",
    summary: "To'liq e-commerce platformasi va unga ulangan Telegram do'koni.",
    detail:
      "Katalog, qidiruv, narx oralig'i va saralash filtrlari; JWT autentifikatsiya, ko'p tilli interfeys va admin dashboard. \"Look\" tizimi tayyor kiyim to'plamlarini bitta mahsulot sifatida ko'rsatadi: katalogda ham, Telegram mini-ilovasida ham.",
    tech: ["React", "FastAPI", "MongoDB", "Telegram Mini App", "JWT", "i18n"],
    bot: "Dli_shinebot",
    shot: dliShot,
  },
  {
    id: "hisobim",
    index: "03",
    title: "HISOBIM",
    category: "Moliya / Hisob-kitob",
    summary:
      "Telegram'dagi AI shaxsiy buxgalter: ovoz yoki matn bilan yozasiz, hisobni o'zi yuritadi.",
    detail:
      "\"Taksiga 25 ming, ovqatga 48 ming ketdi, mijozdan 900 ming oldim\": bitta xabardan uchta alohida tranzaksiya. AI faqat o'zbekcha nutqni tuzilmaga aylantiradi; balans, foyda va qarz qoldiqlari backend va PostgreSQL'da aniq matematika bilan hisoblanadi, UZS va USD hech qachon aralashmaydi. Qarzlar, tabiiy tilda tuzatish, audit jurnali, Markaziy bank kursi bilan Telegram Mini App va o'rnatiladigan PWA.",
    tech: [
      "TypeScript",
      "Hono",
      "grammY",
      "React",
      "Supabase PostgreSQL",
      "Whisper",
      "Telegram Mini App",
      "PWA",
    ],
    bot: "Hisobimaibot",
    site: "https://hisobimai.uz",
    shot: hisobimShot,
  },
  {
    id: "sahna-studio",
    index: "04",
    title: "SAHNA",
    titleAlt: "STUDIO",
    category: "Studio / Kreativ loyiha",
    summary:
      "Google Flow uchun Chrome kengaytmasi: AI video promptlarini navbat bilan ishlatadigan studiya paneli.",
    detail:
      "Brauzer yon panelida ishlaydi: promptlar ro'yxati navbatga qo'yiladi va Flow'da birma-bir bajariladi, tayyor media galereyaga yig'iladi va yuklab olinadi. AI yordamchi promptlarni yozib beradi: OpenAI, Gemini yoki OpenRouter kaliti bilan, ruxsat faqat kerak bo'lganda so'raladi. Ovozli boshqaruv, Excel'dan prompt import va video montaj bo'limi bor.",
    tech: [
      "Chrome Extension (MV3)",
      "JavaScript",
      "Side Panel API",
      "OpenAI / Gemini / OpenRouter",
      "Web Speech",
      "SheetJS",
    ],
    shot: sahnaStudioShot,
    poster: true,
  },
];
