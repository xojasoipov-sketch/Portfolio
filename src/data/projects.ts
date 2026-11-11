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
};

export const PROJECTS: Project[] = [
  {
    id: "sadiprime",
    index: "01",
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
    id: "dli",
    index: "02",
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
    id: "hisobim",
    index: "03",
    title: "HISOBIM",
    category: "Moliya / Hisob-kitob",
    summary: "Shaxsiy hisob-kitob loyihasi.",
    detail:
      "Hisob-kitobni tartibli yuritish uchun ishlab chiqilgan loyiha. Batafsil tavsif va texnologiyalar muallif tomonidan tasdiqlanadi.",
    tech: [],
    shot: hisobimShot,
  },
  {
    id: "sahna-studio",
    index: "04",
    title: "SAHNA",
    titleAlt: "STUDIO",
    category: "Studio / Kreativ loyiha",
    summary: "Sahna va vizual kontent yaratish uchun studiya loyihasi.",
    detail:
      "Studiya loyihasi sifatida ishlab chiqilgan. Batafsil tavsif, texnologiyalar va havola muallif tomonidan tasdiqlanadi.",
    tech: [],
    shot: sahnaStudioShot,
  },
];
