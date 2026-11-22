// Supabase Edge Function: place-order
// Receives an order from the website, re-prices it from the database, stores it and emails the owner.
//
// Secrets (Dashboard -> Edge Functions -> Secrets), never commit them:
//   RESEND_API_KEY     API key from resend.com
//   ORDER_TO_EMAIL     where orders are sent (the owner's email)
//   ORDER_FROM_EMAIL   optional, default "Candle & Charm <onboarding@resend.dev>"
//   ALLOWED_ORIGINS    optional, comma-separated, e.g. "https://theairo.github.io"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by Supabase.
//
// Deploy with "Verify JWT" OFF (the site calls it with the publishable key, which is not a JWT).

import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const ok = !allowed.length || allowed.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin || "*" : allowed[0],
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method" }, 405);

  let b: any;
  try { b = await req.json(); } catch { return json(req, { error: "bad_json" }, 400); }

  // Honeypot: real users never fill this hidden field. Pretend success so bots don't retry.
  if (b.website) return json(req, { ok: true });

  const name = String(b.name ?? "").trim().slice(0, 100);
  const comment = String(b.comment ?? "").trim().slice(0, 500) || null;
  const digits = String(b.phone ?? "").replace(/\D/g, "");
  if (name.length < 2) return json(req, { error: "name" }, 400);
  if (digits.length < 9 || digits.length > 15) return json(req, { error: "phone" }, 400);
  // Normalise Ukrainian numbers to +380XXXXXXXXX
  const phone = "+" + (digits.length === 10 && digits.startsWith("0") ? "38" + digits : digits.length === 9 ? "380" + digits : digits);

  // Delivery: Nova Poshta or Ukrposhta, paid by the customer on receipt (cash on delivery).
  const carrier = String(b.carrier ?? "");
  if (carrier !== "nova" && carrier !== "ukr") return json(req, { error: "carrier" }, 400);
  const city = String(b.city ?? "").trim().slice(0, 100);
  const branch = String(b.branch ?? "").trim().slice(0, 150);
  if (city.length < 2) return json(req, { error: "city" }, 400);
  if (branch.length < 1) return json(req, { error: "branch" }, 400);
  const carrierName = carrier === "nova" ? "Нова пошта" : "Укрпошта";

  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 30) return json(req, { error: "items" }, 400);
  const wanted = new Map<number, number>();
  for (const it of b.items) {
    const id = Number(it?.id), qty = Math.floor(Number(it?.qty));
    if (!Number.isInteger(id) || !(qty >= 1 && qty <= 20)) return json(req, { error: "items" }, 400);
    wanted.set(id, (wanted.get(id) ?? 0) + qty);
  }

  // Rate limits: 3 orders per phone per hour, 40 per hour overall.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const [{ count: perPhone }, { count: overall }] = await Promise.all([
    db.from("orders").select("id", { count: "exact", head: true }).eq("phone", phone).gte("created_at", since),
    db.from("orders").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  if ((perPhone ?? 0) >= 3 || (overall ?? 0) >= 40) return json(req, { error: "rate" }, 429);

  // Prices come from the database, never from the browser.
  const { data: products, error: perr } = await db
    .from("candles").select("id,name,price").in("id", [...wanted.keys()]).eq("is_active", true);
  if (perr || !products || products.length !== wanted.size) return json(req, { error: "unavailable" }, 400);

  const items = products.map((p) => ({ id: p.id, name: p.name, price: Number(p.price), qty: wanted.get(p.id)! }));
  const total = items.reduce((a, i) => a + i.price * i.qty, 0);

  const { data: order, error: ierr } = await db
    .from("orders")
    .insert({ name, phone, comment, items, total, delivery_carrier: carrier, delivery_city: city, delivery_branch: branch })
    .select("id").single();
  if (ierr || !order) { console.error("insert failed", ierr); return json(req, { error: "server" }, 500); }

  // Email the owner. The order is already saved, so a mail failure does not lose it.
  let emailed = false;
  try {
    const key = Deno.env.get("RESEND_API_KEY"), to = Deno.env.get("ORDER_TO_EMAIL");
    if (key && to) {
      const rows = items.map((i) =>
        `<tr><td style="padding:4px 12px 4px 0">${esc(i.name)}</td><td style="padding:4px 12px">× ${i.qty}</td><td style="padding:4px 0;text-align:right">${i.price * i.qty} ₴</td></tr>`).join("");
      const html = `
        <h2 style="margin:0 0 12px">Нове замовлення №${order.id}</h2>
        <table style="border-collapse:collapse;font-size:15px">${rows}
          <tr><td colspan="2" style="padding:10px 12px 0 0"><b>Разом</b></td><td style="padding-top:10px;text-align:right"><b>${total} ₴</b></td></tr></table>
        <p style="margin:18px 0 4px"><b>Ім'я:</b> ${esc(name)}</p>
        <p style="margin:4px 0"><b>Телефон:</b> <a href="tel:${esc(phone)}">${esc(phone)}</a>
           · <a href="viber://chat?number=${encodeURIComponent(phone)}">написати у Viber</a></p>
        <p style="margin:4px 0"><b>Доставка:</b> ${esc(carrierName)}, ${esc(city)}, ${esc(branch)}</p>
        <p style="margin:4px 0"><b>Оплата:</b> при отриманні (накладений платіж)</p>
        ${comment ? `<p style="margin:4px 0"><b>Коментар:</b> ${esc(comment)}</p>` : ""}`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("ORDER_FROM_EMAIL") ?? "Candle & Charm <onboarding@resend.dev>",
          to: [to], subject: `Нове замовлення №${order.id}, ${total} ₴`, html,
        }),
      });
      emailed = r.ok;
      if (!r.ok) console.error("resend failed", r.status, await r.text());
    }
  } catch (e) { console.error("email error", e); }
  if (emailed) await db.from("orders").update({ emailed: true }).eq("id", order.id);

  return json(req, { ok: true, id: order.id });
});
