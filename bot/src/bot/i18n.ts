import type { Language } from "../db/types.js";

/**
 * Fixed UI strings (menus, buttons, system messages) — kept out of the AI's
 * hands entirely, so navigation never depends on model output being well
 * formed. Free-text replies go through the AI agent; these don't.
 */
export const STRINGS = {
  uz: {
    welcome:
      "👋 Assalomu alaykum!\nMen Saidburxon Xojasoipovning personal AI assistantiman.\nLoyiha, hamkorlik yoki Saidburxonning ishlari haqida istalgan savolingizni berishingiz mumkin.",
    menuPortfolio: "🚀 Portfolio",
    menuAI: "🤖 AI Assistant",
    menuHire: "💼 Loyiha taklif qilish",
    menuCV: "📄 CV",
    menuContact: "📞 Bog'lanish",
    menuCatalog: "📋 Xizmatlar katalogi",
    menuAdmin: "⚙️ Admin panel",
    catalogPrompt: "📋 To'liq xizmatlar katalogi va narxlar — quyidagi tugmani bosing:",
    catalogOpen: "📋 Katalogni ochish",
    aiPrompt: "🤖 Menga istalgan savolingizni yozing — masalan \"Menga CRM kerak\" yoki \"Siz nima bilan shug'ullanasiz?\"",
    cvText: "📄 To'liq CV — tajriba, loyihalar va texnologiyalar. Quyidagi tugmani bosing:",
    cvView: "📄 CV'ni ochish",
    cvDownload: "⬇️ PDF yuklab olish",
    cvPdfFailed: "PDF hozir yuborilmadi. Birozdan so'ng qayta urinib ko'ring.",
    contactHeader: "📞 Bog'lanish",
    startHint: "💼 Boshlash",
    smartMenuHint: "💼 Siz loyiha boshlamoqchi ko'rinyapsiz.\nXohlasangiz, loyiha talablarini birga aniqlab, Saidburxonga yuboraman.",
    confirmSend: "✅ Yuborish",
    confirmEdit: "✏️ O'zgartirish",
    confirmCancel: "❌ Bekor qilish",
    leadSent: "✅ Rahmat! Ma'lumotlaringiz Saidburxonga yuborildi. U tez orada siz bilan bog'lanadi.",
    leadCancelled: "Bekor qilindi. Istalgan payt qayta boshlashingiz mumkin.",
    leadDuplicate: "Bu loyiha haqida ma'lumotni allaqachon yubordingiz — Saidburxon tez orada bog'lanadi. Qo'shimcha aytmoqchi bo'lsangiz, yozavering.",
    handoffOffer: "Bu masalani Saidburxonning o'zi bilan aniqlashtirish eng to'g'ri bo'ladi. Murojaatingizni unga yuboraymi?",
    handoffSend: "📩 Yuborish",
    handoffCancel: "❌ Bekor qilish",
    handoffSent: "✅ Murojaatingiz Saidburxonga yuborildi.",
    rateLimited: "Biroz tez yozyapsiz 🙂 Birozdan so'ng qayta urinib ko'ring.",
    notAdmin: "Bu buyruq faqat admin uchun.",
    editPrompt: "Nimani o'zgartirmoqchisiz? Yozib qoldiring — masalan \"budjet 3000 dollar\" yoki \"muddat 1 oy\".",
  },
  en: {
    welcome:
      "👋 Hello!\nI'm Saidburxon Xojasoipov's personal AI assistant.\nAsk me anything about his work, projects, or collaboration.",
    menuPortfolio: "🚀 Portfolio",
    menuAI: "🤖 AI Assistant",
    menuHire: "💼 Hire Me",
    menuCV: "📄 CV",
    menuContact: "📞 Contact",
    menuCatalog: "📋 Services Catalog",
    menuAdmin: "⚙️ Admin panel",
    catalogPrompt: "📋 Full services catalog and pricing — tap the button below:",
    catalogOpen: "📋 Open Catalog",
    aiPrompt: "🤖 Ask me anything — e.g. \"I need a CRM\" or \"What do you work on?\"",
    cvText: "📄 Full CV — experience, projects and stack. Tap below:",
    cvView: "📄 Open CV",
    cvDownload: "⬇️ Download PDF",
    cvPdfFailed: "The PDF could not be sent just now. Please try again shortly.",
    contactHeader: "📞 Contact",
    startHint: "💼 Start",
    smartMenuHint: "💼 Looks like you're starting a project.\nI can help gather the requirements and pass them to Saidburxon.",
    confirmSend: "✅ Send",
    confirmEdit: "✏️ Edit",
    confirmCancel: "❌ Cancel",
    leadSent: "✅ Thanks! Your details were sent to Saidburxon. He'll reach out soon.",
    leadCancelled: "Cancelled. You can start again anytime.",
    leadDuplicate: "You already sent this project earlier — Saidburxon will reach out soon. Feel free to add more details.",
    handoffOffer: "This is best clarified directly with Saidburxon. Should I send him your request?",
    handoffSend: "📩 Send",
    handoffCancel: "❌ Cancel",
    handoffSent: "✅ Your request was sent to Saidburxon.",
    rateLimited: "You're sending messages quite fast 🙂 Please try again shortly.",
    notAdmin: "This command is admin-only.",
    editPrompt: "What would you like to change? Just type it — e.g. \"budget is $3000\" or \"deadline 1 month\".",
  },
} as const satisfies Record<Language, Record<string, string>>;

export function t(lang: Language, key: keyof (typeof STRINGS)["uz"]): string {
  return STRINGS[lang][key];
}
