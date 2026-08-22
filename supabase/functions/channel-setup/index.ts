// One-shot channel setup: title, description, photo, and the opening posts.
//
// A separate function rather than a bot command because the work is a
// migration, not a feature -- it runs once against an empty channel and then
// has no reason to exist. Keeping it out of the bot also keeps the bot's
// deployed bundle from carrying a code path that can rename the channel.
//
// The bot token is read server-side from xbot_bot_config and never leaves this
// process, which is the whole reason the work happens here instead of from a
// shell holding the token.
//
// Auth: POST with ?key=<TELEGRAM_WEBHOOK_SECRET>. verify_jwt is off because a
// one-off admin call has no Supabase JWT to present; the key is the boundary.
// That secret lives in xbot_bot_config, not in the function environment, so it
// is read the same way the bot reads it -- an env var of the same name still
// wins, so promoting it to a real function secret later needs no code change.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const SITE_ORIGIN = "https://xojasoipov-sketch.github.io/Portfolio";
const AVATAR_URL = `${SITE_ORIGIN}/channel-avatar.png`;

// Name first, discipline second: the name is the thing being built, and a
// Telegram chat list truncates the tail anyway.
const TITLE = "Saidburxon Xojasoipov | Full-stack & AI";

// The title already carries the name, so the description spends its budget on
// what the title cannot say: the work, the method, and where to go next.
// Telegram caps it at 255 characters; this is 252.
const ABOUT = [
  "Veb-saytlar, Telegram bot va mini-app, AI integratsiya, CRM va ichki tizimlar.",
  "",
  "Har bir loyiha auditdan boshlanadi — avval muammo aniqlanadi, keyin yechim quriladi.",
  "",
  `Narxlar: ${SITE_ORIGIN}/xizmatlar`,
  "Aloqa: @Xojasoipovbot",
].join("\n");

/** Published in this order; the first one is pinned. */
const OPENING_SLOTS = [0, 1, 5, 9, 13];

const FOOTER = `\n\n🔗 ${SITE_ORIGIN}/\n📋 Narxlar: ${SITE_ORIGIN}/xizmatlar\n💬 @Xojasoipovbot`;

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

async function config(key: string): Promise<string | null> {
  const { data } = await db.from("xbot_bot_config").select("value").eq("key", key).maybeSingle();
  return (data?.value as string | null) ?? null;
}

interface Post {
  id: string;
  slot: number;
  title: string;
  body: string;
  photo_path: string | null;
  status: string;
}

/** Every Bot API call goes through here so one failure shape is handled once. */
async function tg(
  token: string,
  method: string,
  payload: Record<string, unknown> | FormData,
): Promise<{ ok: boolean; result?: Record<string, unknown>; error?: string }> {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const init: RequestInit =
    payload instanceof FormData
      ? { method: "POST", body: payload }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        };
  try {
    const res = await fetch(url, init);
    const json = await res.json();
    if (!json.ok) return { ok: false, error: json.description ?? `HTTP ${res.status}` };
    return { ok: true, result: json.result };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const adminKey =
    Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? (await config("TELEGRAM_WEBHOOK_SECRET"));
  if (!adminKey || url.searchParams.get("key") !== adminKey) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = await config("TELEGRAM_BOT_TOKEN");
  const channel = await config("TELEGRAM_CHANNEL");
  if (!token) return Response.json({ ok: false, error: "TELEGRAM_BOT_TOKEN yo'q" }, { status: 500 });
  if (!channel) {
    return Response.json(
      { ok: false, error: "TELEGRAM_CHANNEL yo'q — bot kanalga admin qilinmagan" },
      { status: 409 },
    );
  }

  // `dry` reports what the bot can see without changing anything, so the
  // wiring can be checked before it renames someone's channel.
  const dry = url.searchParams.get("dry") === "1";
  const steps: Record<string, string> = {};

  const chat = await tg(token, "getChat", { chat_id: channel });
  if (!chat.ok) {
    return Response.json({ ok: false, error: `getChat: ${chat.error}` }, { status: 502 });
  }
  steps.chat = String(chat.result?.title ?? "(nomsiz)");

  const { data: postRows } = await db
    .from("xbot_channel_posts")
    .select("id,slot,title,body,photo_path,status")
    .in("slot", OPENING_SLOTS)
    .order("slot", { ascending: true });
  const posts = (postRows ?? []) as Post[];
  steps.queue = `${posts.filter((p) => p.status === "pending").length} ta post nashrga tayyor`;

  if (dry) return Response.json({ ok: true, dry: true, steps });

  const title = await tg(token, "setChatTitle", { chat_id: channel, title: TITLE });
  steps.title = title.ok ? `"${TITLE}"` : `XATO: ${title.error}`;

  const about = await tg(token, "setChatDescription", { chat_id: channel, description: ABOUT });
  steps.description = about.ok ? `${ABOUT.length} belgi` : `XATO: ${about.error}`;

  // setChatPhoto takes an upload, not a URL, so the file is pulled from the
  // deployed site and forwarded as multipart.
  try {
    const img = await fetch(AVATAR_URL);
    if (!img.ok) throw new Error(`avatar HTTP ${img.status}`);
    const form = new FormData();
    form.append("chat_id", channel);
    form.append("photo", new Blob([await img.arrayBuffer()], { type: "image/png" }), "avatar.png");
    const photo = await tg(token, "setChatPhoto", form);
    steps.photo = photo.ok ? "o'rnatildi" : `XATO: ${photo.error}`;
  } catch (err) {
    steps.photo = `XATO: ${String(err)}`;
  }

  const published: string[] = [];
  const failed: string[] = [];
  let pinned = false;

  for (const post of posts) {
    if (post.status !== "pending") continue;

    // Claim first: if the send succeeds but this process dies before the
    // update, a rerun would post a duplicate. Claiming first means a rerun
    // skips it instead, which is the safer way to be wrong.
    const { data: claimed } = await db
      .from("xbot_channel_posts")
      .update({ status: "posted", posted_at: new Date().toISOString() })
      .eq("id", post.id)
      .eq("status", "pending")
      .select("id");
    if (!claimed?.length) continue;

    const text = post.body + FOOTER;
    const sent = post.photo_path
      ? await tg(token, "sendPhoto", {
          chat_id: channel,
          photo: `${SITE_ORIGIN}/${post.photo_path}`,
          caption: text,
          parse_mode: "HTML",
        })
      : await tg(token, "sendMessage", {
          chat_id: channel,
          text,
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        });

    if (!sent.ok) {
      await db
        .from("xbot_channel_posts")
        .update({ status: "pending", posted_at: null })
        .eq("id", post.id);
      failed.push(`#${post.slot} ${post.title}: ${sent.error}`);
      continue;
    }
    published.push(`#${post.slot} ${post.title}`);

    // The opener is the first thing a new subscriber should read, so it goes
    // to the top rather than scrolling away under the project posts.
    if (post.slot === 0 && sent.result?.message_id) {
      const pin = await tg(token, "pinChatMessage", {
        chat_id: channel,
        message_id: sent.result.message_id,
        disable_notification: true,
      });
      pinned = pin.ok;
      if (!pin.ok) failed.push(`pin: ${pin.error}`);
    }
    // Telegram throttles bulk posting to a chat; a short gap keeps every send
    // inside the limit instead of having the last ones bounce.
    await new Promise((r) => setTimeout(r, 1200));
  }

  steps.published = published.join(", ") || "(hech narsa)";
  steps.pinned = pinned ? "ha" : "yo'q";
  if (failed.length) steps.failed = failed.join(" | ");

  return Response.json({ ok: failed.length === 0, steps });
});
