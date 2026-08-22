# Kanal kontent rejasi

Kanalga avtomatik joylanadigan postlar ro'yxati. Rejalashtirilgan Routine har
safar uyg'onganda shu ro'yxatdan navbatdagisini oladi va kanalga yuboradi.

## Qat'iy qoida: hech narsa o'ylab topilmaydi

Har bir postdagi har bir raqam, narx va da'vo quyidagi **real manbalardan**
olinadi:

| Manba | Nima bor |
|---|---|
| `bot/src/ai/knowledgeData.ts` | Profil, 4 ta real loyiha, aloqa |
| `bot/src/ai/knowledgeSeed.ts` | Xizmatlar katalogi, 3 paket, 5 bosqichli jarayon, shartlar, FAQ |
| `src/data/` (sayt) | Saytdagi tasdiqlangan kontent |
| `public/projects/*.jpg` | Loyiha rasmlari |

**Hech qachon yozilmaydi:**

- Mijozlar soni ("50+ mijoz", "100 ta loyiha") — hisob yuritilmagan
- Tajriba yillari ("5 yillik tajriba") — hech qayerda qayd etilmagan
- Mijoz fikrlari va tavsiyalari — hozircha real fikr yo'q
- Soxta shoshilinchlik ("faqat 3 kun", "oxirgi 2 o'rin")
- Katalogda yo'q narx yoki chegirma

Sababi oddiy: bitta tekshirib bo'lmaydigan da'vo butun portfolioga bo'lgan
ishonchni yo'qotadi. Sayt va bot ham xuddi shu qoida bilan qurilgan.

---

## Matnlar qayerda turadi

Postlarning to'liq matni **`xbot_channel_posts` jadvalida** — kodda emas.
Sababi: matn eng ko'p o'zgaradigan qism, va uni bazada saqlash o'zgartirish
uchun qayta deploy talab qilmaydi. Bitta post matnini tahrirlash = bitta
`update` so'rovi.

Jadval ustunlari: `slot` (tartib), `kind`, `title`, `body`, `photo_path`,
`status` (`pending` → `posted` / `skipped`).

Quyidagi ro'yxat — o'sha jadvalning qisqacha ko'rinishi.

## Kontent aylanmasi (16 post)

Loyiha → xizmat → foyda → loyiha… tartibida ketadi, ya'ni ketma-ket ikkita
sotuv posti chiqmaydi.

### A. Loyihalar (4 ta) — rasm bilan

Manba: `PROJECTS`. `/post <kalit>` buyrug'i allaqachon shuni yuboradi:
rasm + nom + kategoriya + tavsif + texnologiyalar + sayt havolasi.

| # | Post | Kalit |
|---|---|---|
| 1 | **ZET** — shaxsiy AI operatsion tizimi | `/post zet` |
| 5 | **SadiPrime** — o'quv markazlari uchun CRM (ishlab turibdi: sadiprime-tizim.uz) | `/post sadiprime` |
| 9 | **Pari AI** — shaxsiy AI assistant | `/post pari` |
| 13 | **DLI Shop** — e-commerce + Telegram do'kon | `/post dli` |

### B. Xizmat yo'nalishlari (6 ta)

Manba: `DIRECTIONS`. Har biri bitta post: yo'nalish nima, kimga kerak, qaysi
muammoni yechadi. Narx aytilmaydi — katalog havolasi beriladi.

| # | Yo'nalish |
|---|---|
| 2 | Audit va strategiya |
| 6 | Veb va marketplace |
| 10 | Mobil va Telegram bot ekotizimi |
| 14 | AI integratsiyasi |
| 3 | CRM va ichki tizimlar |
| 7 | Doimiy hamkorlik |

### C. Ishlash uslubi (4 ta)

Manba: `PROCESS`, `TERMS`, `DIFFERENTIATORS`, `FAQ`.

| # | Post | Nimadan olinadi |
|---|---|---|
| 4 | **Qanday ishlayman** — 5 bosqich: bepul suhbat → audit → ishlab chiqish → sifat tekshiruvi → topshirish va kuzatuv | `PROCESS` |
| 8 | **Kafolat va shartlar** — 50/50 to'lov, 14 kunlik bepul tuzatish, yakuniy to'lovdan keyin kod to'liq mijozniki, so'ralsa NDA | `TERMS` |
| 11 | **Nega audit birinchi** — pul sarflashdan oldin nima buzilganini ko'rsatish | `DIFFERENTIATORS` |
| 15 | **Ko'p so'raladigan savollar** — narx qanday belgilanadi, boshlash uchun nima kerak | `FAQ` |

### D. Paketlar (2 ta)

Manba: `PACKAGES`. Narxlar katalogdagidek so'zma-so'z, o'zgartirilmaydi.

| # | Post |
|---|---|
| 12 | **Boshlang'ich paket** — 12 000 000 so'm (~$1 000), 2 hafta |
| 16 | **O'sish paketi** — 35 000 000 so'm (~$2 900), 4–5 hafta |

> Uchinchi paket (Raqobatbardosh ekotizim, 95 000 000 so'm) alohida post
> qilinmaydi — bu hajmdagi ish kanal posti orqali emas, suhbat orqali
> boshlanadi. Katalog havolasida baribir ko'rinadi.

---

## Har bir postning tuzilishi

```
<Sarlavha — bitta aniq fikr>

<2–4 qator: muammo va yechim. Sifatlash emas, aniqlik.>

🔗 Portfolio: xojasoipov-sketch.github.io/Portfolio/
📋 Narxlar: .../xizmatlar
💬 Savol: @Xojasoipovbot
```

Ohang: xotirjam va aniq. Baqiriq yo'q, emoji ko'p emas, "ENG ZO'R!!!" yo'q.
Katalogdagi narxlar allaqachon o'zi haqida gapiradi.

---

## Jadval

Boshlang'ich taklif: **haftasiga 2 post** (seshanba va shanba). 16 post ≈ 2 oy.

Nega tez-tez emas: kanal hali kichik, kuniga post obunachini charchatadi.
Kamroq va yaxshiroq post ko'proq o'qiladi.

Aylanma tugagach, Routine to'xtaydi va sizdan so'raydi — takrorlash emas,
yangi kontent (yangi loyiha, yangi natija) kerak bo'ladi.

---

## Siz nazorat qilasiz

- **To'xtatish:** "kanalni to'xtat" — Routine o'chiriladi
- **Jadvalni o'zgartirish:** "haftasiga bir marta" / "har kuni"
- **Postni o'zgartirish:** shu faylni tahrirlaysiz yoki menga aytasiz
- **Avval ko'rish:** xohlasangiz, har bir post joylanishdan oldin sizga
  yuboriladi va siz tasdiqlaganingizdan keyingina kanalga chiqadi

---

## Yangi loyiha qo'shish

Yangi ish qilganingizda menga shu 5 narsani yuboring:

1. **Nomi**
2. **Nima qiladi** — 1–2 gap
3. **Texnologiyalar**
4. **Havola** — ishlab turgan sayt yoki bot (bo'lsa)
5. **Rasm** — skrinshot (bo'lmasa o'zim tayyorlayman)

Men shularni bir yo'la quyidagi joylarga qo'shaman:

- Sayt: `src/data/projects.ts` → bosh sahifadagi "Ishlarim" bo'limi
- CV: `src/data/cv.ts` → `/cv` sahifasi va PDF
- Bot bilim bazasi: `knowledgeData.ts` + `xbot_knowledge_items` → AI shu
  loyiha haqida javob bera oladi
- Kanal: yangi post

Yo'q ma'lumotni o'zim to'ldirmayman — masalan havola bermasangiz, postda
havola bo'lmaydi.
