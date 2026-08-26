/**
 * A private dashboard onto site-analytics' admin read -- the closest honest
 * answer this project can give to "who has visited and what did they look
 * at": since the tracker deliberately stores no IP, no cookie and no stable
 * identifier (see the migration comment on xbot_site_pageviews), "who" can
 * only ever mean an anonymous visitor tag, never a name. What this page
 * actually shows: how many visits, from where, on what device, through
 * which pages, over time, and a reverse-chronological feed of the visits
 * themselves grouped by that anonymous tag.
 *
 * Not linked from the nav, excluded from the sitemap and robots.txt, and
 * carries its own noindex meta -- but the real boundary is the key: nothing
 * below this component ever renders without one that the edge function has
 * already accepted. The key is entered once and kept in this browser's own
 * localStorage (this origin only) so it does not have to be retyped on
 * every visit; it is never hardcoded into this file.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

const ENDPOINT =
  "https://tomkxsdkerpbvlumubbg.supabase.co/functions/v1/site-analytics";

const KEY_STORAGE = "sx-admin:v1:key";

const RANGES = [7, 30, 90] as const;

interface AnalyticsPayload {
  ok: true;
  days: number;
  pageviews: number;
  visitors: number;
  telegram: number;
  paths: Record<string, number>;
  devices: Record<string, number>;
  referrers: Record<string, number>;
  byDay: Record<string, number>;
  recent: {
    time: string;
    path: string;
    device: string;
    telegram: boolean;
    referrer: string | null;
    visitor: string;
  }[];
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — tashrifchilar" },
      // Keeps this out of search results even if a crawler ignores
      // robots.txt's Disallow; the key is still the real access control.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboard,
});

function readStoredKey(): string {
  try {
    return window.localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

function storeKey(key: string) {
  try {
    window.localStorage.setItem(KEY_STORAGE, key);
  } catch {
    /* private mode or blocked storage -- the key just will not be remembered */
  }
}

function clearStoredKey() {
  try {
    window.localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* nothing to do */
  }
}

function AdminDashboard() {
  // Starts empty on every render, server and client alike, and never reads
  // localStorage here: the initializer form of useState runs during the
  // very first render, and this page is prerendered, so on the server (no
  // window) it would always be empty while the client's first render could
  // already see a stored key -- two different trees for the same markup,
  // which is a hydration mismatch (React error #418) the moment a returning
  // visitor has one saved. A key found in storage is instead picked up by
  // the effect below, which only ever runs after hydration.
  const [key, setKey] = useState("");
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = readStoredKey();
    if (stored) setKey(stored);
  }, []);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}&days=${days}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          // A stored key that no longer works (rotated, or never valid) --
          // drop it rather than leave the visitor stuck retrying silently.
          clearStoredKey();
          setKey("");
          setError("Kalit noto'g'ri yoki eskirgan.");
          return;
        }
        if (!res.ok) {
          setError(`Server xatosi: ${res.status}`);
          return;
        }
        const json = (await res.json()) as AnalyticsPayload;
        setData(json);
        storeKey(key);
      })
      .catch(() => {
        if (!cancelled) setError("Ulanib bo'lmadi. Internetni tekshiring.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, days]);

  if (!key) {
    return <KeyGate onSubmit={setKey} error={error} />;
  }

  return (
    <main
      data-surface="black"
      style={{
        minHeight: "100vh",
        background: "var(--ed-black)",
        color: "var(--ed-offwhite)",
        paddingBlock: "clamp(3rem, 8vw, 5rem)",
      }}
    >
      <div className="ed-shell" style={{ maxWidth: "60rem" }}>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "1.5rem",
            marginBottom: "clamp(2rem, 5vw, 3rem)",
          }}
        >
          <div>
            <p
              className="ed-label"
              style={{ color: "var(--ed-red-tx)", margin: 0 }}
            >
              Admin
            </p>
            <h1
              className="ed-display"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.2rem)",
                margin: "0.4rem 0 0",
              }}
            >
              Tashrifchilar
            </h1>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <div className="ed-admin-range">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={days === r}
                  onClick={() => setDays(r)}
                >
                  {r} kun
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                clearStoredKey();
                setKey("");
                setData(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(245, 242, 239, 0.4)",
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Chiqish
            </button>
          </div>
        </header>

        {error && (
          <p style={{ color: "var(--ed-red-tx)", marginBottom: "1.5rem" }}>
            {error}
          </p>
        )}

        {!data && loading && <p style={{ opacity: 0.6 }}>Yuklanmoqda…</p>}

        {data && (
          <>
            <StatRow data={data} />
            <Section title="Kunlar bo'yicha">
              <TrendChart byDay={data.byDay} />
            </Section>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "clamp(1.5rem, 4vw, 3rem)",
                marginTop: "clamp(2rem, 5vw, 3rem)",
              }}
            >
              <Section title="Ko'p ochilgan sahifalar">
                <RankedBars entries={data.paths} />
              </Section>
              <Section title="Qurilma">
                <RankedBars entries={data.devices} />
              </Section>
            </div>
            {Object.keys(data.referrers).length > 0 && (
              <Section title="Qayerdan kelishgan">
                <RankedBars entries={data.referrers} />
              </Section>
            )}
            <Section title="So'nggi tashriflar">
              <ActivityFeed rows={data.recent} />
            </Section>
          </>
        )}
      </div>
    </main>
  );
}

function KeyGate({
  onSubmit,
  error,
}: {
  onSubmit: (key: string) => void;
  error: string | null;
}) {
  const [value, setValue] = useState("");
  return (
    <main
      data-surface="black"
      style={{
        minHeight: "100vh",
        background: "var(--ed-black)",
        color: "var(--ed-offwhite)",
        display: "grid",
        placeItems: "center",
        padding: "var(--ed-gutter)",
      }}
    >
      <form
        className="ed-admin-gate"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
      >
        <p
          className="ed-label"
          style={{ color: "var(--ed-red-tx)", margin: 0 }}
        >
          Admin
        </p>
        <input
          type="password"
          autoComplete="off"
          autoFocus
          className="ed-admin-key-field"
          placeholder="Kalitni kiriting"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {error && (
          <p style={{ color: "var(--ed-red-tx)", fontSize: "0.85rem" }}>
            {error}
          </p>
        )}
        <button type="submit" className="ed-btn">
          Kirish
        </button>
      </form>
    </main>
  );
}

function StatRow({ data }: { data: AnalyticsPayload }) {
  const telegramPct = data.pageviews
    ? Math.round((data.telegram / data.pageviews) * 100)
    : 0;
  return (
    <div className="ed-admin-stats">
      <div className="ed-admin-stat">
        <div className="ed-admin-stat-value">
          {data.pageviews.toLocaleString("uz-UZ")}
        </div>
        <div className="ed-admin-stat-label ed-label">Ko'rishlar</div>
      </div>
      <div className="ed-admin-stat">
        <div className="ed-admin-stat-value">
          {data.visitors.toLocaleString("uz-UZ")}
        </div>
        <div className="ed-admin-stat-label ed-label">Tashrifchilar</div>
      </div>
      <div className="ed-admin-stat">
        <div className="ed-admin-stat-value">{telegramPct}%</div>
        <div className="ed-admin-stat-label ed-label">Telegram orqali</div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: "clamp(2rem, 5vw, 3rem)" }}>
      <p className="ed-label" style={{ opacity: 0.6, marginBottom: "0.75rem" }}>
        {title}
      </p>
      {children}
    </section>
  );
}

/** A single-series ranking: one hue, no legend -- the label carries identity. */
function RankedBars({ entries }: { entries: Record<string, number> }) {
  const rows = Object.entries(entries);
  const max = Math.max(1, ...rows.map(([, v]) => v));
  if (rows.length === 0) {
    return <p style={{ opacity: 0.5, fontSize: "0.85rem" }}>Ma'lumot yo'q.</p>;
  }
  return (
    <div>
      {rows.map(([label, value]) => (
        <div key={label} className="ed-admin-bar-row">
          <div className="ed-admin-bar-label">
            <span>{label}</span>
            <span>{value}</span>
          </div>
          <div className="ed-admin-bar-track">
            <div
              className="ed-admin-bar-fill"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ byDay }: { byDay: Record<string, number> }) {
  const days = useMemo(() => Object.keys(byDay).sort(), [byDay]);
  const max = Math.max(1, ...Object.values(byDay));
  if (days.length === 0) {
    return <p style={{ opacity: 0.5, fontSize: "0.85rem" }}>Ma'lumot yo'q.</p>;
  }
  return (
    <div>
      <div className="ed-admin-trend">
        {days.map((day) => {
          const v = byDay[day] ?? 0;
          const pct = Math.max(4, (v / max) * 100);
          return (
            <div
              key={day}
              className="ed-admin-trend-col"
              style={{ height: `${pct}%` }}
              title={`${day}: ${v}`}
            />
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "0.4rem",
          fontSize: "0.7rem",
          opacity: 0.4,
        }}
      >
        <span>{days[0]}</span>
        <span>{days[days.length - 1]}</span>
      </div>
    </div>
  );
}

/** "5 daqiqa oldin" style relative time, in Uzbek, without a date library --
 *  the feed only ever shows the last 100 rows, so precision beyond a rough
 *  "how long ago" has no reader who needs it. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "hozir";
  if (min < 60) return `${min} daq oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} kun oldin`;
  return new Date(iso).toLocaleDateString("uz-UZ");
}

function ActivityFeed({ rows }: { rows: AnalyticsPayload["recent"] }) {
  if (rows.length === 0) {
    return (
      <p style={{ opacity: 0.5, fontSize: "0.85rem" }}>Hali tashrif yo'q.</p>
    );
  }
  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} className="ed-admin-feed-row">
          <span className="ed-admin-feed-time">{relativeTime(r.time)}</span>
          <span className="ed-admin-feed-path">{r.path}</span>
          <span className="ed-admin-feed-meta">
            <span title={`Anonim tashrifchi belgisi: ${r.visitor}`}>
              #{r.visitor}
            </span>
            <span>·</span>
            <span>{r.device}</span>
            {r.telegram && <span className="ed-admin-feed-tg">· Telegram</span>}
            {r.referrer && <span>· {r.referrer}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
