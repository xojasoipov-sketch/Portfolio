/**
 * A working demo of the Telegram-bot + admin-panel systems this studio builds.
 *
 * The point is that the two halves are one system: take a booking in the bot
 * on the right and it appears in the panel's calendar, client list and
 * notifications immediately — which is the thing a screenshot cannot show.
 *
 * Five fictional businesses (src/data/demo-verticals.ts) so a visitor sees the
 * trade they actually run. Nothing here is a real client's data, and the panel
 * labels every invented figure as "namuna".
 *
 * State is the visitor's own and stays in their browser (src/lib/demo-store).
 * The AI operator is real: it goes to an edge function that holds the prompt
 * and the key server-side and caps how many questions one visitor gets a day.
 */
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type CSSProperties,
} from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Home,
  Users,
  CalendarDays,
  Sparkles,
  BarChart3,
  Bell,
  Wallet,
  Settings,
  Send,
  Bot,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Plus,
  Check,
  CheckCheck,
  Loader2,
  MessageCircle,
  MapPin,
  Phone,
  Paperclip,
  Smile,
  Mic,
  MoreVertical,
  Pin,
  RotateCcw,
  LayoutGrid,
  TrendingUp,
  Clock,
  UserPlus,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DEMO_DAYS,
  DEMO_TIMES,
  REVENUE_SERIES,
  VERTICALS,
  VERTICAL_BY_KEY,
  type DemoClient,
  type DemoDay,
  type Vertical,
} from "@/data/demo-verticals";
import { askDemoAI } from "@/lib/api/demo-ai";
import { sendContactMessage } from "@/lib/api/contact";
import { loadDemo, saveDemo } from "@/lib/demo-store";

const TITLE = "Jonli demo — Telegram bot va boshqaruv paneli";
const DESCRIPTION =
  "Ishlab turgan namuna: Telegram botda navbat oling, u shu zahoti admin panelidagi kalendar, mijozlar bazasi va xabarnomalarda paydo bo'ladi. Salon, restoran, o'quv markazi, klinika va avtoservis uchun.";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoPage,
});

// ---------------------------------------------------------------- types ----

interface Slot {
  name: string;
  src: "admin" | "telegram" | "adminBlock";
}
type BookingState = Record<string, Record<string, Slot | null>>;

interface ChatMessage {
  id: number;
  from: "bot" | "user";
  text: string;
  buttons?: { label: string; action: string }[] | null;
  ts: number;
}

interface Notif {
  id: number;
  type: "booking" | "chat";
  text: string;
  ts: number;
  read: boolean;
}

type PageKey =
  | "dashboard"
  | "crm"
  | "booking"
  | "services"
  | "stats"
  | "notifs"
  | "finance"
  | "settings"
  | "telegram"
  | "ai"
  | "help";

// ------------------------------------------------------------- helpers ----

const hhmm = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** One booked slot per day at the start, so the panel is never empty on arrival. */
function seedBooking(v: Vertical): BookingState {
  const day = (fill: Record<number, Slot>) =>
    Object.fromEntries(DEMO_TIMES.map((t, i) => [t, fill[i] ?? null]));
  return {
    Bugun: day({
      1: { name: v.crmSeed[0]!.name, src: "admin" },
      4: { name: v.crmSeed[2]!.name, src: "telegram" },
    }),
    Ertaga: day({ 0: { name: v.crmSeed[1]!.name, src: "admin" } }),
  };
}

const key = (kind: string, vertical: string) => `${kind}:${vertical}`;

// ---------------------------------------------------------------- page ----

function DemoPage() {
  const [vKey, setVKey] = useState("salon");
  const v = VERTICAL_BY_KEY[vKey]!;
  const VIcon = v.icon;

  const [page, setPage] = useState<PageKey>("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  /** 0 until the client takes over, so the prerendered HTML has no clock in it. */
  const [clock, setClock] = useState(0);

  const [crmList, setCrmList] = useState<DemoClient[]>([]);
  const [crmQuery, setCrmQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "" });

  const [booking, setBooking] = useState<BookingState>({});
  const [bookingDay, setBookingDay] = useState<DemoDay>("Bugun");

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const [gq, setGq] = useState("");
  const [gqOpen, setGqOpen] = useState(false);

  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [botStep, setBotStep] = useState<
    "menu" | "day" | "slot" | "name" | "ai"
  >("menu");
  const [pending, setPending] = useState<{
    day: DemoDay | null;
    slot: string | null;
  }>({
    day: null,
    slot: null,
  });
  const [thinking, setThinking] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEnd = useRef<HTMLDivElement | null>(null);
  const mid = useRef(1);

  const [leadOpen, setLeadOpen] = useState(false);
  const [lead, setLead] = useState({ name: "", contact: "" });
  const [sendingLead, setSendingLead] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadError, setLeadError] = useState("");

  useEffect(() => {
    setClock(Date.now());
    const t = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const botMsg = (
    text: string,
    buttons?: ChatMessage["buttons"],
  ): ChatMessage => ({
    id: mid.current++,
    from: "bot",
    text,
    buttons: buttons ?? null,
    ts: Date.now(),
  });
  const usrMsg = (text: string): ChatMessage => ({
    id: mid.current++,
    from: "user",
    text,
    ts: Date.now(),
  });

  // Switching business reloads that business's own saved state, so each of the
  // five keeps its bookings instead of sharing one set.
  useEffect(() => {
    const cfg = VERTICAL_BY_KEY[vKey]!;
    setCrmList(loadDemo(key("crm", vKey), cfg.crmSeed));
    setBooking(loadDemo(key("booking", vKey), seedBooking(cfg)));
    setNotifs(loadDemo<Notif[]>(key("notif", vKey), []));
    setCrmQuery("");
    setBookingDay("Bugun");
    setShowAdd(false);
    setNotifOpen(false);
    setGq("");
    setGqOpen(false);
    setBotStep("menu");
    setPending({ day: null, slot: null });
    setChatError("");
    mid.current = 1;
    setMsgs([
      {
        id: mid.current++,
        from: "bot",
        text: cfg.intro,
        buttons: cfg.menu,
        ts: Date.now(),
      },
    ]);
    setReady(true);
  }, [vKey]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, thinking]);

  function pushNotif(type: Notif["type"], text: string) {
    setNotifs((prev) => {
      const next = [
        {
          id: Date.now() + Math.random(),
          type,
          text,
          ts: Date.now(),
          read: false,
        },
        ...prev,
      ].slice(0, 30);
      saveDemo(key("notif", vKey), next);
      return next;
    });
  }

  function markRead() {
    setNotifs((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveDemo(key("notif", vKey), next);
      return next;
    });
  }

  function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newClient.name.trim()) return;
    const entry: DemoClient = {
      id: Date.now(),
      name: newClient.name.trim(),
      phone: newClient.phone.trim() || "—",
      note: "Qo'lda qo'shildi",
      src: "admin",
    };
    const next = [entry, ...crmList];
    setCrmList(next);
    setNewClient({ name: "", phone: "" });
    setShowAdd(false);
    setToast(
      saveDemo(key("crm", vKey), next)
        ? `${entry.name} bazaga qo'shildi`
        : `${entry.name} qo'shildi — lekin brauzer saqlay olmadi`,
    );
  }

  /** An admin can block or free a slot, but not take back one a client booked. */
  function adminToggle(day: DemoDay, time: string) {
    const cur = booking[day]?.[time];
    if (cur && cur.src !== "adminBlock") return;
    const next: BookingState = {
      ...booking,
      [day]: {
        ...booking[day],
        [time]: cur ? null : { name: "Band (admin)", src: "adminBlock" },
      },
    };
    setBooking(next);
    saveDemo(key("booking", vKey), next);
    setToast(
      cur ? `${day} ${time} bo'shatildi` : `${day} ${time} band qilindi`,
    );
  }

  /** The whole point of the demo: one bot action, three panels updated. */
  function confirmBooking(name: string, day: DemoDay, slot: string) {
    const nb: BookingState = {
      ...booking,
      [day]: { ...booking[day], [slot]: { name, src: "telegram" } },
    };
    setBooking(nb);
    saveDemo(key("booking", vKey), nb);

    const entry: DemoClient = {
      id: Date.now(),
      name,
      phone: "Telegram",
      note: `${v.bookingNoun}: ${day} ${slot}`,
      src: "telegram",
    };
    const nc = [entry, ...crmList];
    setCrmList(nc);
    saveDemo(key("crm", vKey), nc);

    pushNotif("booking", `${name} — ${day} ${slot}`);
    setPending({ day: null, slot: null });
    setBotStep("menu");
  }

  const freeSlots = (day: DemoDay) =>
    DEMO_TIMES.filter((t) => !booking[day]?.[t]);

  function handleAction(action: string) {
    if (action === "book") {
      setMsgs((m) => [
        ...m,
        botMsg(
          `${v.bookingNoun} uchun kunni tanlang:`,
          DEMO_DAYS.map((d) => ({ label: `📆 ${d}`, action: `day:${d}` })),
        ),
      ]);
      setBotStep("day");
      return;
    }
    if (action.startsWith("day:")) {
      const day = action.slice(4) as DemoDay;
      const free = freeSlots(day);
      if (!free.length) {
        setMsgs((m) => [
          ...m,
          botMsg(
            `${day} kuni bo'sh vaqt qolmadi.`,
            DEMO_DAYS.map((d) => ({ label: `📆 ${d}`, action: `day:${d}` })),
          ),
        ]);
        return;
      }
      setPending({ day, slot: null });
      setMsgs((m) => [
        ...m,
        botMsg(
          `${day} uchun bo'sh vaqtlar:`,
          free.map((t) => ({ label: `🕐 ${t}`, action: `slot:${t}` })),
        ),
      ]);
      setBotStep("slot");
      return;
    }
    if (action.startsWith("slot:")) {
      const slot = action.slice(5);
      setPending((p) => ({ ...p, slot }));
      setMsgs((m) => [
        ...m,
        botMsg(`${pending.day} — ${slot} tanlandi.\nIsmingizni yozing:`),
      ]);
      setBotStep("name");
      return;
    }
    if (action === "prices") {
      setMsgs((m) => [
        ...m,
        botMsg(
          "Xizmatlar narxi:\n" +
            v.services.map((s) => `• ${s.name} — ${s.price} so'm`).join("\n"),
          v.menu,
        ),
      ]);
      return;
    }
    if (action === "address") {
      setMsgs((m) => [...m, botMsg(`${v.address}\nTel: ${v.phone}`, v.menu)]);
      return;
    }
    if (action === "ai") {
      setMsgs((m) => [
        ...m,
        botMsg("Savolingizni yozing — AI operator javob beradi."),
      ]);
      setBotStep("ai");
      return;
    }
    if (action === "menu") {
      setMsgs((m) => [...m, botMsg("Asosiy menyu:", v.menu)]);
      setBotStep("menu");
    }
  }

  async function askAI(text: string) {
    setThinking(true);
    setChatError("");
    // Only real turns go up: the button cards are UI, not conversation.
    const history = msgs
      .filter((m) => !m.buttons)
      .slice(-5)
      .map((m) => ({
        role: m.from === "bot" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      }));
    const result = await askDemoAI(vKey, [
      ...history,
      { role: "user", content: text },
    ]);
    if (result.ok) {
      setMsgs((m) => [
        ...m,
        botMsg(result.reply, [{ label: "☰ Menyu", action: "menu" }]),
      ]);
      pushNotif(
        "chat",
        `AI savol: ${text.slice(0, 38)}${text.length > 38 ? "…" : ""}`,
      );
    } else {
      setChatError(result.error);
    }
    setThinking(false);
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    setMsgs((m) => [...m, usrMsg(text)]);

    if (botStep === "name" && pending.day && pending.slot) {
      const { day, slot } = pending;
      confirmBooking(text, day, slot);
      setMsgs((m) => [
        ...m,
        botMsg(
          `✅ ${v.bookingNoun} band qilindi!\n\n👤 ${text}\n📆 ${day}, ${slot}\n\nEslatma 1 soat oldin yuboriladi.`,
          [{ label: "☰ Menyu", action: "menu" }],
        ),
      ]);
      return;
    }
    await askAI(text);
  }

  /** Goes to the same endpoint as the site's contact form, so it is a real lead. */
  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!lead.name.trim() || !lead.contact.trim() || sendingLead) return;
    setSendingLead(true);
    setLeadError("");
    try {
      const res = await sendContactMessage({
        name: lead.name.trim(),
        contact: lead.contact.trim(),
        message: `Demo so'rovi — ${v.leadContext} (${v.brand} namunasi ko'rildi).`,
      });
      if (res.ok) setLeadSent(true);
      else setLeadError(res.error || "Yuborilmadi. Qayta urinib ko'ring.");
    } catch {
      setLeadError("Yuborilmadi. To'g'ridan-to'g'ri yozing: @Xojasoipovbot");
    } finally {
      setSendingLead(false);
    }
  }

  function resetDemo() {
    const cfg = VERTICAL_BY_KEY[vKey]!;
    const bk = seedBooking(cfg);
    saveDemo(key("crm", vKey), cfg.crmSeed);
    saveDemo(key("booking", vKey), bk);
    saveDemo(key("notif", vKey), []);
    setCrmList(cfg.crmSeed);
    setBooking(bk);
    setNotifs([]);
    mid.current = 1;
    setMsgs([
      {
        id: mid.current++,
        from: "bot",
        text: cfg.intro,
        buttons: cfg.menu,
        ts: Date.now(),
      },
    ]);
    setBotStep("menu");
    setPending({ day: null, slot: null });
    setToast("Demo boshlang'ich holatga qaytarildi");
  }

  // ------------------------------------------------------------ derived ----

  const bookedAll = Object.values(booking)
    .flatMap((d) => Object.values(d ?? {}))
    .filter(Boolean) as Slot[];
  const tgBookings = bookedAll.filter((b) => b.src === "telegram").length;
  const todayBooked = Object.values(booking["Bugun"] ?? {}).filter(
    Boolean,
  ).length;
  const unread = notifs.filter((n) => !n.read).length;
  const aiCount = notifs.filter((n) => n.type === "chat").length;

  const NAV: {
    key: PageKey;
    icon: LucideIcon;
    label: string;
    badge?: number;
  }[] = [
    { key: "dashboard", icon: Home, label: "Bosh sahifa" },
    { key: "crm", icon: Users, label: v.crmTitle },
    { key: "booking", icon: CalendarDays, label: v.bookingTitle },
    { key: "services", icon: Sparkles, label: "Xizmatlar" },
    { key: "stats", icon: BarChart3, label: "Statistika" },
    { key: "notifs", icon: Bell, label: "Xabarnomalar", badge: unread },
    { key: "finance", icon: Wallet, label: "Moliyaviy" },
    { key: "settings", icon: Settings, label: "Sozlamalar" },
    { key: "telegram", icon: Send, label: "Telegram Bot" },
    { key: "ai", icon: Bot, label: "AI Operator" },
    { key: "help", icon: HelpCircle, label: "Yordam" },
  ];

  const revData = useMemo(
    () =>
      REVENUE_SERIES.map((n, i) => ({
        d: String(i * 2 + 1).padStart(2, "0"),
        v: n,
      })),
    [],
  );
  const donut = v.services.map((s) => ({ name: s.name, value: s.share }));
  const donutColors = [v.hex, v.hex2, "#8b5cf6", "#6366f1"];
  const grad: CSSProperties = {
    backgroundImage: `linear-gradient(135deg, ${v.hex}, ${v.hex2})`,
  };
  const gradText: CSSProperties = {
    ...grad,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };
  const glow = (rgba: string): CSSProperties => ({
    boxShadow: `0 0 30px -8px ${rgba}`,
  });

  // Not memoized: eleven nav entries and a short client list, filtered on
  // keystrokes the user is already waiting on. Memoizing it would mean listing
  // NAV as a dependency, and NAV is rebuilt every render — the cache would
  // never hit and the code would only look careful.
  const results = (() => {
    const q = gq.trim().toLowerCase();
    if (!q) return { clients: [] as DemoClient[], pages: [] as typeof NAV };
    return {
      clients: crmList
        .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
        .slice(0, 4),
      pages: NAV.filter((n) => n.label.toLowerCase().includes(q)).slice(0, 3),
    };
  })();

  const filteredCrm = crmList.filter(
    (c) =>
      !crmQuery.trim() ||
      c.name.toLowerCase().includes(crmQuery.toLowerCase()) ||
      c.phone.includes(crmQuery),
  );

  // Only the newest card's buttons stay live, so an old card cannot be
  // re-tapped halfway through a later flow.
  const activeBtnId =
    [...msgs].reverse().find((m) => m.from === "bot" && m.buttons)?.id ?? null;

  // --------------------------------------------------------------- chat ----

  const TelegramCard = ({ tall }: { tall?: boolean }) => (
    <div
      className="relative rounded-3xl overflow-hidden border border-white/[0.07]"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.03), transparent 40%), rgba(255,255,255,0.025)",
      }}
    >
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.07]">
        <ChevronLeft size={18} className="text-neutral-500 shrink-0" />
        <div
          style={{ ...grad, ...glow(`${v.hex}88`) }}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
        >
          <VIcon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold leading-tight truncate">
            {v.botHandle}
          </div>
          <div
            className="text-[10.5px] leading-tight mt-0.5"
            style={{ color: v.hex }}
          >
            {thinking ? "yozmoqda…" : "bot"}
          </div>
        </div>
        <Search size={16} className="text-neutral-500 shrink-0" />
        <Pin size={16} className="text-neutral-500 shrink-0" />
        <MoreVertical size={16} className="text-neutral-500 shrink-0" />
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at 88% 20%, ${v.hex}22, transparent 50%), radial-gradient(circle at 95% 75%, ${v.hex2}20, transparent 50%)`,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          className={`relative px-3 py-4 overflow-y-auto ${tall ? "h-[440px]" : "h-[340px]"}`}
        >
          <div className="flex justify-center mb-3">
            <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] text-neutral-300">
              Bugun
            </span>
          </div>
          {!ready ? (
            <div className="space-y-2">
              <div className="h-14 w-3/5 rounded-2xl bg-white/[0.05] animate-pulse motion-reduce:animate-none" />
              <div className="h-9 w-2/5 rounded-2xl bg-white/[0.05] animate-pulse motion-reduce:animate-none" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {msgs.map((m) =>
                m.from === "bot" ? (
                  <div key={m.id}>
                    <div className="flex">
                      <div className="max-w-[86%] rounded-2xl rounded-bl-md bg-[#16161d]/95 border border-white/[0.06] px-3 py-2 backdrop-blur-sm">
                        <div className="text-[12.5px] leading-snug whitespace-pre-line text-neutral-100">
                          {m.text}
                        </div>
                        <div className="text-[9.5px] text-neutral-500 text-right mt-1 tabular-nums">
                          {hhmm(m.ts)}
                        </div>
                      </div>
                    </div>
                    {m.buttons && (
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        {m.buttons.map((b) => {
                          const live = m.id === activeBtnId && !thinking;
                          return (
                            <button
                              key={b.label}
                              type="button"
                              onClick={() => live && handleAction(b.action)}
                              disabled={!live}
                              className={`rounded-2xl border px-3 py-2.5 text-[11.5px] font-medium text-left leading-tight transition-colors ${
                                live
                                  ? "border-white/[0.10] bg-[#16161d] text-neutral-100 hover:bg-[#1c1c26]"
                                  : "border-white/[0.04] bg-[#121218] text-neutral-600"
                              }`}
                            >
                              {b.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div key={m.id} className="flex justify-end">
                    <div
                      style={grad}
                      className="max-w-[80%] rounded-2xl rounded-br-md px-3 py-2"
                    >
                      <div className="text-[12.5px] leading-snug text-white">
                        {m.text}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[9.5px] text-white/70 mt-1 tabular-nums">
                        {hhmm(m.ts)}
                        <CheckCheck size={11} />
                      </div>
                    </div>
                  </div>
                ),
              )}
              {thinking && (
                <div className="flex">
                  <div className="rounded-2xl rounded-bl-md bg-[#16161d]/95 border border-white/[0.06] px-3 py-3 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{ animationDelay: `${-0.2 + i * 0.1}s` }}
                        className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce motion-reduce:animate-none"
                      />
                    ))}
                  </div>
                </div>
              )}
              {chatError && (
                <p className="text-[11px] text-red-400 px-1">{chatError}</p>
              )}
              <div ref={chatEnd} />
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={onSend}
        className="flex items-center gap-2 px-3 py-2.5 border-t border-white/[0.07]"
      >
        <button
          type="button"
          onClick={() => handleAction("menu")}
          aria-label="Menyu"
          className="text-neutral-500 shrink-0"
        >
          <Paperclip size={17} />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 rounded-full border border-white/[0.07] bg-black/40 px-3.5 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              botStep === "name" ? "Ismingizni yozing…" : "Xabar yozing..."
            }
            aria-label="Xabar"
            disabled={thinking}
            className="flex-1 min-w-0 bg-transparent text-[12.5px] outline-none placeholder:text-neutral-600 disabled:opacity-50"
          />
          <Smile size={15} className="text-neutral-600 shrink-0" />
        </div>
        <button
          type="submit"
          disabled={thinking}
          aria-label="Yuborish"
          style={{ ...grad, ...glow(`${v.hex}88`) }}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-60"
        >
          {thinking ? (
            <Loader2 size={15} className="animate-spin" />
          ) : input.trim() ? (
            <Send size={15} />
          ) : (
            <Mic size={15} />
          )}
        </button>
      </form>
    </div>
  );

  const Card = ({
    className = "",
    children,
    style,
  }: {
    className?: string;
    children: React.ReactNode;
    style?: CSSProperties;
  }) => (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.03), transparent 40%), rgba(255,255,255,0.025)",
        ...style,
      }}
      className={`rounded-3xl border border-white/[0.07] ${className}`}
    >
      {children}
    </div>
  );

  // --------------------------------------------------------------- view ----

  return (
    <div
      className="min-h-screen text-neutral-100 relative overflow-x-hidden"
      style={{
        backgroundColor: "#06070c",
        fontFeatureSettings: '"cv11","ss01","tnum"',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -right-32 w-[420px] h-[420px] rounded-full transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${v.hex}, transparent 70%)`,
          filter: "blur(120px)",
          opacity: 0.16,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-32 -left-32 w-[360px] h-[360px] rounded-full transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${v.hex2}, transparent 70%)`,
          filter: "blur(120px)",
          opacity: 0.12,
        }}
      />

      <div className="relative flex">
        {navOpen && (
          <div
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
        <aside
          className={`fixed lg:sticky top-0 z-50 h-screen w-[240px] shrink-0 border-r border-white/[0.07] backdrop-blur-xl flex flex-col transition-transform duration-300 lg:translate-x-0 ${
            navOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ backgroundColor: "rgba(10,11,18,0.95)" }}
        >
          <div className="flex items-center gap-2.5 px-4 py-4">
            <div
              style={{ ...grad, ...glow(v.hex) }}
              className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
            >
              <LayoutGrid size={16} className="text-white" />
            </div>
            <div className="leading-none">
              <div className="text-[12.5px] font-extrabold tracking-tight">
                BUSINESS
              </div>
              <div className="text-[12.5px] font-extrabold tracking-tight mt-0.5">
                HUB
              </div>
            </div>
            <button
              onClick={() => setNavOpen(false)}
              aria-label="Yopish"
              className="ml-auto lg:hidden text-neutral-500"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-0.5">
            {NAV.map((it) => {
              const I = it.icon;
              const on = page === it.key;
              return (
                <button
                  key={it.key}
                  onClick={() => {
                    setPage(it.key);
                    setNavOpen(false);
                  }}
                  style={
                    on
                      ? {
                          background: `linear-gradient(90deg, ${v.hex}22, transparent)`,
                        }
                      : {}
                  }
                  className={`relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    on ? "" : "hover:bg-white/[0.03]"
                  }`}
                >
                  {on && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r"
                      style={{
                        backgroundColor: v.hex,
                        boxShadow: `0 0 12px ${v.hex}`,
                      }}
                    />
                  )}
                  <I
                    size={16}
                    className="shrink-0"
                    style={{ color: on ? v.hex : "#7a7a85" }}
                  />
                  <span
                    className="text-[12.5px] truncate"
                    style={{
                      color: on ? "#fff" : "#a1a1aa",
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    {it.label}
                  </span>
                  {(it.badge ?? 0) > 0 && (
                    <span
                      style={{ ...grad, ...glow(`${v.hex}66`) }}
                      className="ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full text-[9.5px] font-bold text-white flex items-center justify-center shrink-0"
                    >
                      {it.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mx-2.5 mb-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 relative overflow-hidden">
            <div
              aria-hidden
              className="absolute top-0 left-3 right-3 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${v.hex}, transparent)`,
              }}
            />
            <div className="text-[10px] text-neutral-500">Bu — namoyish</div>
            <div style={gradText} className="text-[15px] font-bold mt-0.5">
              Business Hub
            </div>
            <p className="text-[10.5px] text-neutral-500 mt-2 leading-relaxed">
              Ma'lumotlar o'ylab topilgan va faqat shu brauzerda saqlanadi.
            </p>
            <Link
              to="/"
              className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.04] py-1.5 text-[11px] text-neutral-200"
            >
              <ArrowLeft size={11} style={{ color: v.hex }} />
              Portfolioga qaytish
            </Link>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col pb-32">
          <header
            className="sticky top-0 z-30 flex items-center gap-2 px-3 lg:px-5 py-3 border-b border-white/[0.07] backdrop-blur-xl"
            style={{ backgroundColor: "rgba(6,7,12,0.85)" }}
          >
            <button
              onClick={() => setNavOpen(true)}
              aria-label="Menyu"
              className="lg:hidden text-neutral-400 shrink-0"
            >
              <Menu size={20} />
            </button>
            <div className="relative flex-1 max-w-md mx-auto">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                <Search size={14} className="text-neutral-500 shrink-0" />
                <input
                  value={gq}
                  onChange={(e) => {
                    setGq(e.target.value);
                    setGqOpen(true);
                  }}
                  onFocus={() => setGqOpen(true)}
                  onBlur={() => setTimeout(() => setGqOpen(false), 160)}
                  placeholder="Qidirish..."
                  aria-label="Qidirish"
                  className="flex-1 min-w-0 bg-transparent text-[12.5px] outline-none placeholder:text-neutral-600"
                />
              </div>
              {gqOpen && gq.trim() && (
                <div
                  className="absolute left-0 right-0 top-11 z-40 rounded-xl border border-white/[0.10] shadow-2xl overflow-hidden"
                  style={{ backgroundColor: "#101018" }}
                >
                  {results.clients.length === 0 &&
                  results.pages.length === 0 ? (
                    <div className="px-3 py-3 text-[11.5px] text-neutral-500">
                      Natija topilmadi
                    </div>
                  ) : (
                    <>
                      {results.pages.map((p) => (
                        <button
                          key={p.key}
                          onMouseDown={() => {
                            setPage(p.key);
                            setGq("");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04]"
                        >
                          <p.icon
                            size={13}
                            className="text-neutral-500 shrink-0"
                          />
                          <span className="text-[12px] truncate">
                            {p.label}
                          </span>
                          <span className="ml-auto text-[9.5px] text-neutral-600 shrink-0">
                            bo'lim
                          </span>
                        </button>
                      ))}
                      {results.clients.map((c) => (
                        <button
                          key={c.id}
                          onMouseDown={() => {
                            setPage("crm");
                            setCrmQuery(c.name);
                            setGq("");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04]"
                        >
                          <span
                            style={{ background: `${v.hex}22`, color: v.hex }}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                          >
                            {c.name.charAt(0)}
                          </span>
                          <span className="text-[12px] truncate">{c.name}</span>
                          <span className="ml-auto text-[9.5px] text-neutral-600 shrink-0 font-mono">
                            {c.phone}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="relative shrink-0">
              <button
                onClick={() => {
                  setNotifOpen((o) => !o);
                  if (!notifOpen) markRead();
                }}
                aria-label="Xabarnomalar"
                className="relative w-9 h-9 rounded-xl border border-white/[0.07] bg-white/[0.03] flex items-center justify-center text-neutral-400"
              >
                <Bell size={15} />
                {unread > 0 && (
                  <span
                    style={{ ...grad, ...glow(`${v.hex}66`) }}
                    className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                  >
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div
                  className="absolute right-0 top-11 z-40 w-64 rounded-xl border border-white/[0.10] shadow-2xl overflow-hidden"
                  style={{ backgroundColor: "#101018" }}
                >
                  <div className="px-3 py-2 border-b border-white/[0.07] text-[11.5px] font-semibold">
                    Xabarnomalar
                  </div>
                  {notifs.length === 0 ? (
                    <div className="px-3 py-4 text-[11px] text-neutral-500">
                      Hozircha bo'sh.
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto">
                      {notifs.slice(0, 8).map((n) => (
                        <div
                          key={n.id}
                          className="flex items-start gap-2 px-3 py-2 border-b border-white/[0.05] last:border-0"
                        >
                          {n.type === "booking" ? (
                            <CalendarDays
                              size={12}
                              className="mt-0.5 shrink-0"
                              style={{ color: v.hex }}
                            />
                          ) : (
                            <MessageCircle
                              size={12}
                              className="mt-0.5 shrink-0"
                              style={{ color: v.hex2 }}
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-[11px] leading-tight truncate">
                              {n.text}
                            </div>
                            <div className="text-[9px] text-neutral-600 tabular-nums">
                              {hhmm(n.ts)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div
                style={{ ...grad, ...glow(`${v.hex}66`) }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              >
                SX
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-[12px] font-semibold">Administrator</div>
                <div className="text-[10px] text-neutral-500">{v.brand}</div>
              </div>
              <ChevronDown
                size={13}
                className="hidden sm:block text-neutral-600"
              />
            </div>
          </header>

          <main className="flex-1 px-3 lg:px-6 py-5 space-y-5 max-w-[1400px] w-full mx-auto">
            {page === "dashboard" && (
              <>
                <div className="relative rounded-3xl border border-white/[0.07] overflow-hidden">
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, #0a0b12, #0d0f1a 42%, ${v.hex}18 68%, ${v.hex2}25 100%)`,
                    }}
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(ellipse at 78% 25%, ${v.hex}44, transparent 60%)`,
                    }}
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-50"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
                      backgroundSize: "28px 28px",
                    }}
                  />
                  <div className="relative p-6 lg:p-10">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 mb-5">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                        style={{ boxShadow: "0 0 8px #34d399" }}
                      />
                      <span className="text-[11px] text-emerald-300">
                        Namoyish rejimi — jonli ishlaydi
                      </span>
                    </div>
                    <h1
                      className="font-light tracking-tight leading-[1.1]"
                      style={{ fontSize: "clamp(28px, 5.5vw, 46px)" }}
                    >
                      Bot va panel
                      <br />
                      <span style={{ ...gradText, fontWeight: 500 }}>
                        bitta tizim
                      </span>
                    </h1>
                    <p className="text-[12.5px] lg:text-[13.5px] text-neutral-400 mt-3 max-w-md leading-relaxed">
                      O'ngdagi botda navbat oling — u shu zahoti kalendarda,
                      mijozlar bazasida va xabarnomalarda paydo bo'ladi.
                    </p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-6 max-w-2xl">
                      {[
                        {
                          n: todayBooked,
                          l: `Bugungi ${v.bookingNoun.toLowerCase()}`,
                        },
                        { n: unread, l: "Yangi xabarnoma" },
                        { n: v.staff.length, l: "Faol xodim" },
                        { n: crmList.length, l: v.crmTitle },
                      ].map((k, i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-white/[0.10] px-3 py-3 backdrop-blur"
                          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                        >
                          <div className="text-[22px] font-light leading-none tabular-nums tracking-tight">
                            {k.n}
                          </div>
                          <div className="text-[10px] text-neutral-500 mt-2 uppercase tracking-wider">
                            {k.l}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[15px] font-semibold">
                      Biznesingizni tanlang
                    </span>
                    <button
                      onClick={resetDemo}
                      className="flex items-center gap-1 text-[11.5px] text-neutral-500"
                    >
                      <RotateCcw size={11} />
                      Tozalash
                    </button>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
                    {VERTICALS.map((it) => {
                      const I = it.icon;
                      const on = it.key === vKey;
                      return (
                        <button
                          key={it.key}
                          onClick={() => setVKey(it.key)}
                          style={
                            on
                              ? {
                                  borderColor: `${it.hex}55`,
                                  background: `linear-gradient(160deg, ${it.hex}22, transparent)`,
                                  boxShadow: `0 0 30px -8px ${it.hex}`,
                                }
                              : {}
                          }
                          className={`shrink-0 w-[104px] lg:w-[112px] h-[112px] rounded-2xl border flex flex-col items-center justify-center gap-2.5 transition-all duration-300 ${
                            on ? "" : "border-white/[0.07] bg-white/[0.025]"
                          }`}
                        >
                          <I
                            size={22}
                            style={{ color: on ? it.hex : "#7a7a85" }}
                          />
                          <span
                            className="text-[12px]"
                            style={{
                              color: on ? it.hex : "#a1a1aa",
                              fontWeight: on ? 600 : 500,
                            }}
                          >
                            {it.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Card className="p-4 lg:p-5">
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-[12.5px] text-neutral-400">
                      Namuna biznes:
                    </span>
                    <span className="text-[14px] font-semibold truncate">
                      {v.brand}
                    </span>
                    <span
                      style={{ background: `${v.hex}22`, color: v.hex }}
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-medium shrink-0"
                    >
                      {v.label}
                    </span>
                    <button
                      onClick={() => setPage("settings")}
                      className="ml-auto flex items-center gap-1 text-[11.5px] text-neutral-500 shrink-0"
                    >
                      <Settings size={12} />
                      Sozlash
                    </button>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-neutral-400">
                          Daromad (oy)
                        </span>
                        <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[8.5px] text-neutral-500">
                          namuna
                        </span>
                      </div>
                      <div className="flex items-end gap-1.5 mt-2">
                        <span className="text-[26px] font-light leading-none tracking-tight tabular-nums">
                          {v.revenue}
                        </span>
                        <span className="text-[11px] text-neutral-500 mb-0.5">
                          so'm
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10.5px] text-emerald-400 mt-1.5">
                        <TrendingUp size={10} />+{v.growth}%{" "}
                        <span className="text-neutral-500">
                          o'tgan oyga nisbatan
                        </span>
                      </div>
                      <div className="mt-3 -ml-2">
                        <ResponsiveContainer width="100%" height={90}>
                          <AreaChart
                            data={revData}
                            margin={{ top: 4, right: 6, bottom: 0, left: 0 }}
                          >
                            <defs>
                              <linearGradient
                                id={`rev-${vKey}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={v.hex}
                                  stopOpacity={0.5}
                                />
                                <stop
                                  offset="100%"
                                  stopColor={v.hex}
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#ffffff0a"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="d"
                              tick={{ fill: "#5a5a66", fontSize: 8.5 }}
                              axisLine={false}
                              tickLine={false}
                              interval={3}
                            />
                            <YAxis
                              tick={{ fill: "#5a5a66", fontSize: 8.5 }}
                              axisLine={false}
                              tickLine={false}
                              width={26}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "#101018",
                                border: "1px solid #ffffff14",
                                borderRadius: 8,
                                fontSize: 11,
                              }}
                              labelStyle={{ color: "#e5e5e5" }}
                              itemStyle={{ color: v.hex }}
                              formatter={(x) => [`${x}M so'm`, "Daromad"]}
                            />
                            <Area
                              type="monotone"
                              dataKey="v"
                              stroke={v.hex}
                              strokeWidth={2}
                              fill={`url(#rev-${vKey})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] text-neutral-400">
                          Xizmatlar bo'yicha
                        </span>
                        <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[8.5px] text-neutral-500">
                          namuna
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative w-[118px] h-[118px] shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={donut}
                                dataKey="value"
                                innerRadius={36}
                                outerRadius={54}
                                paddingAngle={2}
                                stroke="none"
                              >
                                {donut.map((_, i) => (
                                  <Cell key={i} fill={donutColors[i % 4]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[18px] font-light leading-none tabular-nums">
                              {todayBooked}
                            </span>
                            <span className="text-[9px] text-neutral-500 mt-1">
                              Bugun
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {v.services.map((s, i) => (
                            <div
                              key={s.name}
                              className="flex items-center gap-1.5"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: donutColors[i % 4] }}
                              />
                              <span className="text-[11px] text-neutral-300 truncate flex-1">
                                {s.name}
                              </span>
                              <span className="text-[11px] text-neutral-500 shrink-0">
                                {s.share}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                    {[
                      {
                        n: todayBooked,
                        l: `Bugungi ${v.bookingNoun.toLowerCase()}`,
                        i: CalendarDays,
                      },
                      { n: unread, l: "Kutilayotgan", i: Clock },
                      { n: v.staff.length, l: "Xodimlar", i: Users },
                      { n: crmList.length, l: v.crmTitle, i: UserPlus },
                    ].map((s, i) => {
                      const SI = s.i;
                      return (
                        <div
                          key={i}
                          className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5"
                        >
                          <div
                            className="w-[26px] h-[26px] rounded-lg flex items-center justify-center"
                            style={{ background: `${v.hex}1f`, color: v.hex }}
                          >
                            <SI size={12} />
                          </div>
                          <div className="text-[24px] font-light mt-2 tabular-nums leading-none tracking-tight">
                            {s.n}
                          </div>
                          <div className="text-[10.5px] text-neutral-500 mt-1.5">
                            {s.l}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                    <button
                      onClick={() => setPage("telegram")}
                      style={{ ...grad, ...glow(`${v.hex}66`) }}
                      className="flex items-center justify-center gap-2 rounded-2xl py-3 text-[12px] font-semibold text-white"
                    >
                      <MessageCircle size={14} />
                      Botni ochish
                    </button>
                    <button
                      onClick={() => setPage("booking")}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] py-3 text-[12px] font-medium text-neutral-100"
                    >
                      <LayoutGrid size={14} className="text-neutral-400" />
                      {v.bookingTitle}
                    </button>
                    <button
                      onClick={() => setPage("stats")}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] py-3 text-[12px] font-medium text-neutral-100"
                    >
                      <BarChart3 size={14} className="text-neutral-400" />
                      Statistika
                    </button>
                  </div>
                </Card>

                <TelegramCard />
              </>
            )}

            {page === "crm" && (
              <Card className="p-4 lg:p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[16px] font-semibold">
                    {v.crmTitle}
                  </span>
                  <button
                    onClick={() => setShowAdd((s) => !s)}
                    style={showAdd ? {} : { ...grad, ...glow(`${v.hex}55`) }}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold ${
                      showAdd
                        ? "border border-white/[0.10] text-neutral-400"
                        : "text-white"
                    }`}
                  >
                    {showAdd ? <X size={12} /> : <Plus size={12} />}
                    {showAdd ? "Yopish" : "Qo'shish"}
                  </button>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2 mb-3">
                  <Search size={13} className="text-neutral-600 shrink-0" />
                  <input
                    value={crmQuery}
                    onChange={(e) => setCrmQuery(e.target.value)}
                    placeholder="Ism yoki raqam bo'yicha qidirish"
                    aria-label="Bazadan qidirish"
                    className="flex-1 min-w-0 bg-transparent text-[12px] outline-none placeholder:text-neutral-600"
                  />
                  {crmQuery && (
                    <button
                      onClick={() => setCrmQuery("")}
                      aria-label="Tozalash"
                    >
                      <X size={12} className="text-neutral-600" />
                    </button>
                  )}
                </div>

                {showAdd && (
                  <form
                    onSubmit={addClient}
                    className="mb-3 grid sm:grid-cols-3 gap-2 rounded-2xl border border-white/[0.07] bg-black/25 p-3"
                  >
                    <input
                      value={newClient.name}
                      onChange={(e) =>
                        setNewClient((c) => ({ ...c, name: e.target.value }))
                      }
                      placeholder="Ism"
                      aria-label="Ism"
                      className="rounded-lg border border-white/[0.07] bg-black/40 px-3 py-2 text-[12px] outline-none placeholder:text-neutral-600"
                    />
                    <input
                      value={newClient.phone}
                      onChange={(e) =>
                        setNewClient((c) => ({ ...c, phone: e.target.value }))
                      }
                      placeholder="Telefon"
                      aria-label="Telefon"
                      className="rounded-lg border border-white/[0.07] bg-black/40 px-3 py-2 text-[12px] outline-none placeholder:text-neutral-600"
                    />
                    <button
                      type="submit"
                      style={grad}
                      className="flex items-center justify-center rounded-lg py-2 text-[12px] font-semibold text-white"
                    >
                      Saqlash
                    </button>
                  </form>
                )}

                {!ready ? (
                  <div className="space-y-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-14 rounded-2xl bg-white/[0.03] animate-pulse motion-reduce:animate-none"
                      />
                    ))}
                  </div>
                ) : filteredCrm.length === 0 ? (
                  <div className="text-center py-10">
                    <Users
                      size={22}
                      className="text-neutral-700 mx-auto mb-2"
                    />
                    <p className="text-[12px] text-neutral-500">
                      Mos yozuv topilmadi.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredCrm.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                      >
                        <span
                          style={{ ...grad, ...glow(`${v.hex}44`) }}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                        >
                          {c.name.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium truncate">
                            {c.name}
                          </div>
                          <div className="text-[10.5px] text-neutral-500 truncate">
                            {c.note}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10.5px] text-neutral-400 font-mono">
                            {c.phone}
                          </div>
                          {c.src === "telegram" && (
                            <span
                              style={{ background: `${v.hex}1f`, color: v.hex }}
                              className="inline-flex items-center gap-0.5 mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                            >
                              <Send size={7} />
                              Telegram
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {page === "booking" && (
              <Card className="p-4 lg:p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[16px] font-semibold">
                    {v.bookingTitle}
                  </span>
                  <div className="flex gap-1.5">
                    {DEMO_DAYS.map((d) => (
                      <button
                        key={d}
                        onClick={() => setBookingDay(d)}
                        style={
                          bookingDay === d
                            ? { ...grad, ...glow(`${v.hex}55`) }
                            : {}
                        }
                        className={`rounded-lg px-3 py-1.5 text-[11.5px] font-medium ${
                          bookingDay === d
                            ? "text-white"
                            : "border border-white/[0.07] text-neutral-400"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEMO_TIMES.map((t) => {
                    const s = booking[bookingDay]?.[t];
                    const blocked = s?.src === "adminBlock";
                    const taken = s && !blocked;
                    return (
                      <button
                        key={t}
                        onClick={() => adminToggle(bookingDay, t)}
                        disabled={!!taken}
                        style={
                          blocked
                            ? {
                                ...grad,
                                ...glow(`${v.hex}66`),
                                border: "1px solid transparent",
                              }
                            : {}
                        }
                        className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                          blocked
                            ? "text-white"
                            : taken
                              ? "border-white/[0.06] bg-white/[0.02]"
                              : "border-dashed border-white/[0.12] hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Clock
                            size={11}
                            className={
                              blocked ? "text-white" : "text-neutral-500"
                            }
                          />
                          <span className="text-[13px] font-semibold tabular-nums">
                            {t}
                          </span>
                          {blocked && <Check size={12} className="ml-auto" />}
                        </div>
                        <div
                          className={`text-[10.5px] mt-1 truncate ${
                            taken
                              ? "text-neutral-400"
                              : blocked
                                ? "text-white/80"
                                : "text-neutral-600"
                          }`}
                        >
                          {s ? s.name : "bo'sh"}
                        </div>
                        {s?.src === "telegram" && (
                          <span
                            style={{ color: v.hex }}
                            className="inline-flex items-center gap-0.5 mt-1 text-[9px]"
                          >
                            <Send size={7} />
                            Telegram
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-neutral-500 mt-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded border border-dashed border-white/20" />
                    bo'sh
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-white/10" />
                    mijoz bandi
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded" style={grad} />
                    admin bloki
                  </span>
                </div>
              </Card>
            )}

            {page === "services" && (
              <Card className="p-4 lg:p-5">
                <div className="text-[16px] font-semibold mb-4">
                  Xizmatlar va narxlar
                </div>
                <div className="space-y-2">
                  {v.services.map((s, i) => (
                    <div
                      key={s.name}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
                    >
                      <span
                        className="w-1.5 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: donutColors[i % 4] }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium truncate">
                          {s.name}
                        </div>
                        <div className="text-[10.5px] text-neutral-500">
                          Ulush: {s.share}%
                        </div>
                      </div>
                      <div className="text-[13px] font-semibold tabular-nums shrink-0">
                        {s.price}{" "}
                        <span className="text-[10px] text-neutral-500">
                          so'm
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10.5px] text-neutral-600 mt-3">
                  Bu ro'yxat botdagi "Narxlar" tugmasiga va AI operatorga
                  ulangan — mijoz aynan shuni ko'radi va AI aynan shundan javob
                  beradi.
                </p>
              </Card>
            )}

            {page === "stats" && (
              <>
                <Card className="p-4 lg:p-5">
                  <div className="text-[16px] font-semibold mb-1">
                    Real vaqtdagi ko'rsatkichlar
                  </div>
                  <p className="text-[10.5px] text-neutral-500 mb-4">
                    Shu demodagi haqiqiy harakatlaringizdan hisoblanadi.
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[
                        { name: v.crmTitle, value: crmList.length },
                        { name: "Bandlik", value: bookedAll.length },
                        { name: "AI savol", value: aiCount },
                      ]}
                      margin={{ top: 6, right: 6, bottom: 0, left: -16 }}
                    >
                      <defs>
                        <linearGradient
                          id={`bar-${vKey}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={v.hex} />
                          <stop
                            offset="100%"
                            stopColor={v.hex2}
                            stopOpacity={0.65}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#ffffff0a"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#6b6b78", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#6b6b78", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "#ffffff08" }}
                        contentStyle={{
                          background: "#101018",
                          border: "1px solid #ffffff14",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                        labelStyle={{ color: "#e5e5e5" }}
                        itemStyle={{ color: "#e5e5e5" }}
                      />
                      <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
                        fill={`url(#bar-${vKey})`}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-4 lg:p-5">
                  <div className="text-[14px] font-semibold mb-3">
                    Bronlar kanali
                  </div>
                  {bookedAll.length === 0 ? (
                    <p className="text-[11.5px] text-neutral-500">
                      Hali bron yo'q.
                    </p>
                  ) : (
                    <>
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-white/[0.06] mb-2">
                        <div
                          style={{
                            width: `${(tgBookings / bookedAll.length) * 100}%`,
                            backgroundColor: v.hex,
                          }}
                        />
                        <div
                          style={{
                            width: `${((bookedAll.length - tgBookings) / bookedAll.length) * 100}%`,
                            backgroundColor: v.hex2,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded"
                            style={{ backgroundColor: v.hex }}
                          />
                          Telegram — {tgBookings}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded"
                            style={{ backgroundColor: v.hex2 }}
                          />
                          Panel — {bookedAll.length - tgBookings}
                        </span>
                      </div>
                    </>
                  )}
                </Card>
              </>
            )}

            {page === "notifs" && (
              <Card className="p-4 lg:p-5">
                <div className="text-[16px] font-semibold mb-4">
                  Xabarnomalar
                </div>
                {notifs.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell
                      size={24}
                      className="text-neutral-700 mx-auto mb-2.5"
                    />
                    <p className="text-[12.5px] text-neutral-400 mb-1">
                      Hozircha harakat yo'q
                    </p>
                    <p className="text-[11px] text-neutral-600 leading-relaxed">
                      Telegram botda navbat oling yoki savol yozing —
                      <br />
                      natija shu yerda darhol chiqadi.
                    </p>
                    <button
                      onClick={() => setPage("telegram")}
                      style={{ ...grad, ...glow(`${v.hex}55`) }}
                      className="mt-3 rounded-lg px-4 py-2 text-[12px] font-semibold text-white"
                    >
                      Telegram botga o'tish
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {notifs.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background:
                              n.type === "booking"
                                ? `${v.hex}1f`
                                : `${v.hex2}1f`,
                          }}
                        >
                          {n.type === "booking" ? (
                            <CalendarDays size={12} style={{ color: v.hex }} />
                          ) : (
                            <MessageCircle
                              size={12}
                              style={{ color: v.hex2 }}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] leading-tight">
                            {n.text}
                          </div>
                          <div className="text-[9.5px] text-neutral-600 mt-0.5 tabular-nums">
                            {n.type === "booking"
                              ? "Yangi bron"
                              : "AI operator"}{" "}
                            · {hhmm(n.ts)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {page === "finance" && (
              <Card className="p-4 lg:p-5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[16px] font-semibold">Moliyaviy</span>
                  <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-neutral-500">
                    namunaviy ma'lumot
                  </span>
                </div>
                <div className="flex items-end gap-1.5 mt-2">
                  <span className="text-[30px] font-light leading-none tracking-tight tabular-nums">
                    {v.revenue}
                  </span>
                  <span className="text-[12px] text-neutral-500 mb-1">
                    so'm
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1.5 mb-4">
                  <TrendingUp size={11} />+{v.growth}%{" "}
                  <span className="text-neutral-500">o'tgan oyga nisbatan</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart
                    data={revData}
                    margin={{ top: 4, right: 6, bottom: 0, left: -16 }}
                  >
                    <defs>
                      <linearGradient
                        id={`rev2-${vKey}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={v.hex} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={v.hex} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#ffffff0a"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="d"
                      tick={{ fill: "#6b6b78", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      tick={{ fill: "#6b6b78", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#101018",
                        border: "1px solid #ffffff14",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      labelStyle={{ color: "#e5e5e5" }}
                      itemStyle={{ color: v.hex }}
                      formatter={(x) => [`${x}M so'm`, "Daromad"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={v.hex}
                      strokeWidth={2}
                      fill={`url(#rev2-${vKey})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-[10.5px] text-neutral-600 mt-2">
                  Real loyihada bu bo'lim to'lov tizimi va kassa bilan
                  bog'lanadi.
                </p>
              </Card>
            )}

            {page === "settings" && (
              <>
                <Card className="p-4 lg:p-5">
                  <div className="text-[16px] font-semibold mb-4">
                    Sozlamalar
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          style={{ ...grad, ...glow(`${v.hex}55`) }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                        >
                          <Send size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-semibold">
                            Telegram Bot
                          </div>
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            ulangan · webhook aktiv
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Bot:{" "}
                        <span className="text-neutral-300">@{v.slug}_bot</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1">
                        So'nggi harakat:{" "}
                        <span className="text-neutral-300 tabular-nums">
                          {clock ? hhmm(clock) : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          style={{ background: `${v.hex}1f`, color: v.hex }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        >
                          <MapPin size={13} />
                        </div>
                        <div className="text-[12.5px] font-semibold">
                          Manzil va aloqa
                        </div>
                      </div>
                      <div className="text-[11px] text-neutral-400 whitespace-pre-line leading-relaxed">
                        {v.address}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-2 flex items-center gap-1">
                        <Phone size={10} />
                        {v.phone}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 lg:p-5">
                  <div className="text-[14px] font-semibold mb-3">
                    Xodimlar ({v.staff.length})
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {v.staff.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                      >
                        <span
                          style={{ ...grad, ...glow(`${v.hex}44`) }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        >
                          {s.charAt(0)}
                        </span>
                        <span className="text-[11.5px] text-neutral-300 truncate">
                          {s}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 lg:p-5">
                  <div className="text-[14px] font-semibold mb-1">
                    Demo boshqaruvi
                  </div>
                  <p className="text-[11px] text-neutral-500 mb-3">
                    Barcha mijozlar, bronlar va xabarnomalarni boshlang'ich
                    holatga qaytaring.
                  </p>
                  <button
                    onClick={resetDemo}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.10] bg-white/[0.03] px-3 py-2 text-[12px] text-neutral-200"
                  >
                    <RotateCcw size={12} />
                    Demoni tozalash
                  </button>
                </Card>
              </>
            )}

            {page === "telegram" && (
              <>
                <Card className="p-4 flex items-center gap-3">
                  <div
                    style={{ ...grad, ...glow(`${v.hex}66`) }}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                  >
                    <VIcon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold truncate">
                      {v.botHandle}
                    </div>
                    <div className="text-[10.5px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      onlayn · webhook aktiv
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500 shrink-0">
                    @{v.slug}_bot
                  </span>
                </Card>
                <TelegramCard tall />
              </>
            )}

            {page === "ai" && (
              <Card className="p-4 lg:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    style={{ ...grad, ...glow(`${v.hex}55`) }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                  >
                    <Bot size={14} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold">
                      AI Operator jurnali
                    </div>
                    <div className="text-[10.5px] text-neutral-500">
                      Botga tushgan AI savollari
                    </div>
                  </div>
                </div>
                {aiCount === 0 ? (
                  <div className="text-center py-10">
                    <Bot size={22} className="text-neutral-700 mx-auto mb-2" />
                    <p className="text-[12px] text-neutral-400 mb-1">
                      Hozircha AI savol yo'q
                    </p>
                    <p className="text-[11px] text-neutral-600 mb-3">
                      Botda "AI operator" tugmasini bosib savol yozib ko'ring —
                      javob haqiqiy modeldan keladi.
                    </p>
                    <button
                      onClick={() => setPage("telegram")}
                      style={{ ...grad, ...glow(`${v.hex}55`) }}
                      className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white"
                    >
                      Botga o'tish
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {notifs
                      .filter((n) => n.type === "chat")
                      .map((n) => (
                        <div
                          key={n.id}
                          className="flex items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                        >
                          <MessageCircle
                            size={13}
                            className="mt-0.5 shrink-0"
                            style={{ color: v.hex2 }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] leading-tight">
                              {n.text}
                            </div>
                            <div className="text-[9.5px] text-neutral-600 mt-0.5 tabular-nums">
                              {hhmm(n.ts)}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </Card>
            )}

            {page === "help" && (
              <Card className="p-4 lg:p-5">
                <div className="text-[16px] font-semibold mb-1">
                  Demoni qanday sinaymiz?
                </div>
                <p className="text-[11px] text-neutral-500 mb-4">
                  4 qadam — o'zingiz ko'ring qanday ishlashini.
                </p>
                <div className="space-y-2">
                  {[
                    {
                      n: 1,
                      t: `"Telegram Bot" bo'limiga o'ting`,
                      d: "Chap menyudagi Telegram Bot bandini tanlang.",
                    },
                    {
                      n: 2,
                      t: `"${v.menu[0]!.label}" tugmasini bosing`,
                      d: "Kun va vaqtni tanlab, ismingizni yozing.",
                    },
                    {
                      n: 3,
                      t: "Panelga qaytib ko'ring",
                      d: `${v.bookingTitle}, ${v.crmTitle} va Xabarnomalar bo'limlarida yangi yozuv paydo bo'ladi.`,
                    },
                    {
                      n: 4,
                      t: `"AI operator"ga savol bering`,
                      d: "Narx yoki ish vaqti haqida so'rang — javob haqiqiy modeldan keladi.",
                    },
                  ].map((s) => (
                    <div
                      key={s.n}
                      className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div
                        style={{ ...grad, ...glow(`${v.hex}44`) }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                      >
                        {s.n}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold">{s.t}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                          {s.d}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </main>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t border-white/[0.07]"
        style={{ backgroundColor: "rgba(6,7,12,0.90)" }}
      >
        <div className="max-w-[1400px] mx-auto px-3 py-3 flex items-center justify-center gap-3 lg:gap-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-widest text-neutral-500">
            Shu tizim sizning biznesingizga
          </span>
          <button
            onClick={() => setLeadOpen(true)}
            style={{ ...grad, ...glow(`${v.hex}77`) }}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12.5px] font-semibold text-white"
          >
            Bog'lanish
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {leadOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => {
            if (!sendingLead) {
              setLeadOpen(false);
              setLeadSent(false);
              setLeadError("");
              setLead({ name: "", contact: "" });
            }
          }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border border-white/[0.10] p-6"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
              ...glow(`${v.hex}44`),
            }}
          >
            <button
              onClick={() => {
                setLeadOpen(false);
                setLeadSent(false);
                setLeadError("");
                setLead({ name: "", contact: "" });
              }}
              aria-label="Yopish"
              className="absolute top-3 right-3 text-neutral-500 hover:text-neutral-300"
            >
              <X size={18} />
            </button>
            {leadSent ? (
              <div className="text-center py-4">
                <div
                  style={{ ...grad, ...glow(`${v.hex}55`) }}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white mx-auto mb-3"
                >
                  <Check size={22} />
                </div>
                <div className="text-[16px] font-semibold mb-1">Yuborildi</div>
                <p className="text-[12px] text-neutral-400 leading-relaxed">
                  Tez orada bog'lanaman va shu tizimni sizning {v.leadContext}
                  ingizga moslab beraman.
                </p>
              </div>
            ) : (
              <form onSubmit={submitLead}>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.03] px-2.5 py-1 text-[10.5px] text-neutral-400 mb-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: v.hex,
                      boxShadow: `0 0 8px ${v.hex}`,
                    }}
                  />
                  Bir bosishda so'rov
                </div>
                <div className="text-[18px] font-semibold mb-1 tracking-tight">
                  Biznesingizga moslab beray
                </div>
                <p className="text-[11.5px] text-neutral-500 mb-4 leading-relaxed">
                  Aynan shu tizim — sizning {v.leadContext}ingizga. Ma'lumot
                  qoldiring, tez orada bog'lanaman.
                </p>
                <div className="space-y-2">
                  <input
                    value={lead.name}
                    onChange={(e) =>
                      setLead((l) => ({ ...l, name: e.target.value }))
                    }
                    placeholder="Ismingiz"
                    aria-label="Ismingiz"
                    required
                    className="w-full rounded-xl border border-white/[0.07] bg-black/40 px-3 py-2.5 text-[13px] outline-none placeholder:text-neutral-600 focus:border-white/20"
                  />
                  <input
                    value={lead.contact}
                    onChange={(e) =>
                      setLead((l) => ({ ...l, contact: e.target.value }))
                    }
                    placeholder="Telegram yoki telefon raqam"
                    aria-label="Telegram yoki telefon raqam"
                    required
                    className="w-full rounded-xl border border-white/[0.07] bg-black/40 px-3 py-2.5 text-[13px] outline-none placeholder:text-neutral-600 focus:border-white/20"
                  />
                </div>
                {leadError && (
                  <p className="text-[11px] text-red-400 mt-2">{leadError}</p>
                )}
                <button
                  type="submit"
                  disabled={sendingLead}
                  style={{ ...grad, ...glow(`${v.hex}77`) }}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-full py-3 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  {sendingLead ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      Yuborish
                      <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] rounded-full border border-white/[0.10] bg-black/85 backdrop-blur px-4 py-2 text-[12px] text-neutral-100 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
