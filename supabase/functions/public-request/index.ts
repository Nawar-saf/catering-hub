import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const allowedOrigins = new Set([
  "https://www.gulfcateringhub.com",
  "https://gulfcateringhub.com",
  "https://nawar-saf.github.io",
  "http://localhost:8000",
  "http://localhost:3000",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:3000",
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = allowedOrigins.has(origin) ? origin : "https://www.gulfcateringhub.com";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}
function text(v: unknown, max = 1000) {
  return String(v ?? "").trim().slice(0, max);
}
function phoneOk(v: string) {
  const d = v.replace(/\D/g, "");
  return d.length >= 8 && d.length <= 15;
}
function toNum(v: unknown) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function asDate(v: unknown) {
  const s = text(v, 10);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T23:59:59Z");
  if (Number.isNaN(d.getTime())) return null;
  return s;
}
async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function clientIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "origin_not_allowed" }, 403);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const secretBundle = Deno.env.get("SUPABASE_SECRET_KEYS");
    let secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (secretBundle) {
      try {
        secret = JSON.parse(secretBundle)?.default || secret;
      } catch (_) {}
    }
    if (!url || !secret) throw new Error("server_config");
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

    const hash = await sha256(clientIp(req));
    const { data: allowed, error: rateErr } = await admin.rpc("consume_public_request_rate_limit", { p_ip_hash: hash });
    if (rateErr) throw rateErr;
    if (!allowed) return json(req, { error: "rate_limited" }, 429);

    const body = await req.json();
    const requestType = text(body.request_type, 30);
    if (!["package", "custom", "employee_meals"].includes(requestType)) {
      return json(req, { error: "invalid_request_type" }, 400);
    }

    const name = text(body.contact_name, 160);
    const phone = text(body.contact_phone, 40);
    const email = text(body.contact_email, 254) || null;
    const location = text(body.location, 300) || null;
    const people = toNum(body.people_count);
    const eventDate = asDate(body.event_date);
    const budget = toNum(body.budget);
    const details = typeof body.details === "object" && body.details && !Array.isArray(body.details) ? body.details : {};

    if (name.length < 2 || !phoneOk(phone)) return json(req, { error: "invalid_contact" }, 400);
    if (people != null && (!Number.isInteger(people) || people < 1 || people > 100000)) {
      return json(req, { error: "invalid_people_count" }, 400);
    }
    if (body.event_date && !eventDate) return json(req, { error: "invalid_event_date" }, 400);
    if (eventDate && new Date(eventDate + "T23:59:59Z").getTime() < Date.now()) {
      return json(req, { error: "past_event_date" }, 400);
    }
    if (budget != null && (budget < 0 || budget > 100000000)) return json(req, { error: "invalid_budget" }, 400);

    let packageId: string | null = null;
    let providerId: string | null = null;
    let estimatedTotal: number | null = null;
    let safeDetails: Record<string, unknown> = { ...details };

    if (requestType === "package") {
      packageId = text(body.package_id, 50);
      if (!packageId || !people || !eventDate || !location) return json(req, { error: "missing_package_fields" }, 400);
      const { data: pkg, error: pkgErr } = await admin
        .from("catering_packages")
        .select("id,provider_id,name,name_en,price_per_person,min_people,max_people,lead_time_hours,delivery_fee,minimum_spend,active,review_status")
        .eq("id", packageId)
        .eq("active", true)
        .eq("review_status", "approved")
        .maybeSingle();
      if (pkgErr) throw pkgErr;
      if (!pkg) return json(req, { error: "package_unavailable" }, 409);
      const { data: publicProvider } = await admin
        .from("public_provider_profiles")
        .select("provider_id")
        .eq("provider_id", pkg.provider_id)
        .maybeSingle();
      if (!publicProvider) return json(req, { error: "package_unavailable" }, 409);
      if (people < Number(pkg.min_people || 1) || people > Number(pkg.max_people || 999999)) {
        return json(req, { error: "people_out_of_range" }, 400);
      }
      const leadMs = Number(pkg.lead_time_hours || 0) * 3600000;
      if (new Date(eventDate + "T23:59:59Z").getTime() < Date.now() + leadMs) {
        return json(req, { error: "lead_time_required" }, 400);
      }
      providerId = pkg.provider_id;
      const raw = people * Number(pkg.price_per_person || 0) + Number(pkg.delivery_fee || 0);
      estimatedTotal = Math.max(raw, Number(pkg.minimum_spend || 0));
      safeDetails = {
        ...safeDetails,
        package_name: pkg.name,
        package_name_en: pkg.name_en,
        price_per_person: Number(pkg.price_per_person || 0),
        delivery_fee: Number(pkg.delivery_fee || 0),
      };
    }

    if (requestType === "custom") {
      if (!people || !eventDate || !location) return json(req, { error: "missing_custom_fields" }, 400);
    }

    if (requestType === "employee_meals") {
      if (!people || !location) return json(req, { error: "missing_meal_fields" }, 400);
      const daysPerWeek = toNum(details.days_per_week);
      const pricePerEmployee = toNum(details.price_per_employee);
      if (!daysPerWeek || daysPerWeek < 1 || daysPerWeek > 7 || !pricePerEmployee || pricePerEmployee <= 0) {
        return json(req, { error: "invalid_meal_plan" }, 400);
      }
      estimatedTotal = Math.round(people * daysPerWeek * 4.33 * pricePerEmployee * 100) / 100;
    }

    const { data: inserted, error: insertErr } = await admin
      .from("catering_requests")
      .insert({
        source: "web",
        request_type: requestType,
        package_id: packageId,
        provider_id: providerId,
        contact_name: name,
        contact_phone: phone,
        contact_email: email,
        event_date: eventDate,
        people_count: people,
        location,
        budget,
        budget_unit: text(body.budget_unit, 30) || "total",
        estimated_total: estimatedTotal,
        details: safeDetails,
        status: "new",
      })
      .select("id,status")
      .single();
    if (insertErr) throw insertErr;

    return json(req, { ok: true, id: inserted.id, status: inserted.status }, 201);
  } catch (err) {
    console.error("public-request failed", err);
    return json(req, { error: "request_failed" }, 500);
  }
});