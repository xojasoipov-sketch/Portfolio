# Saidburxon Xojasoipov — Portfolio

Editorial personal portfolio. Off-white / black canvas, deep editorial red
accent, oversized grotesk typography, curved section transitions.

Built on TanStack Start + Vite + React + Tailwind.

## Ishga tushirish

```bash
npm install
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint + prettier
npm run format   # prettier --write
```

## Telegram kontakt formasi

Kontakt formasi `src/lib/api/contact.functions.ts` dagi server function orqali
Telegramga xabar yuboradi. Bot tokeni **hech qachon** brauzerga chiqmaydi —
u faqat serverda, handler ichida o'qiladi.

Sozlash:

1. [@BotFather](https://t.me/BotFather) da bot yarating va tokenni oling.
2. Botga bir marta yozing, so'ng chat id ni oling:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. `.env` faylini yarating (`.env.example` dan nusxa oling):

```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

`.env` gitignore qilingan — tokenni repoga commit qilmang. Agar token
bir marta ochiq joyda ko'rinib qolsa, @BotFather da `/revoke` qiling.

Env o'zgaruvchilari yo'q bo'lsa forma ishlamay qolmaydi — foydalanuvchiga
email orqali yozish taklif qilinadi.

## Portret rasmi

Portret bitta joydan boshqariladi: `src/components/editorial/portrait.ts`.

Rasmni `src/assets/portrait.png` ga qo'ying va faylni shunday yangilang:

```ts
import portrait from "@/assets/portrait.png";
export const PORTRAIT: string | null = portrait;
```

Shundan keyin hero (natural), about (oq-qora) va contact (qizil duotone)
bo'limlari avtomatik ravishda rasmni oladi. Rasm yo'q bo'lsa, kompozitsiyani
saqlab turuvchi placeholder ko'rsatiladi.

## Loyiha skrinshotlari

`src/data/projects.ts` dagi har bir loyihaning `shot` maydoni
`src/assets/projects/` ichidagi rasmga ishora qiladi. `null` bo'lsa,
tipografik plate ko'rsatiladi.

```ts
import zetShot from "@/assets/projects/zet.png";
// ...
{ id: "zet", /* ... */ shot: zetShot }
```

## Struktura

```
src/
├─ components/editorial/   # Redesign komponentlari
│  ├─ Nav · Hero · Intro · About · Skills
│  ├─ Services · Projects · Contact · Footer
│  ├─ Curve.tsx            # SVG curved dividers + red arcs
│  ├─ Portrait.tsx         # Portret + treatment (natural/mono/duotone)
│  └─ useReveal.ts         # IntersectionObserver reveal hook
├─ data/projects.ts        # Loyiha ma'lumotlari
├─ lib/api/contact.functions.ts
└─ styles.css              # Editorial design system (--ed-* tokenlar)
```
