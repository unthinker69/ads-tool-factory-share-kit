const INDEX_HTML = __INDEX_HTML_JSON__;
const APP_SECRET = __APP_SECRET_JSON__;
const DEFAULT_MODEL_OPENAI = "deepseek-chat";
const DEFAULT_MODEL_ANTHROPIC = "claude-sonnet-4-6";
const MAX_QTY_PER_TYPE = 50;
const PRODUCT_NAME = "__PRODUCT_NAME__";
const PRODUCT_CONTEXT = "a personal finance app for everyday money control in Mexico";
const PRODUCT_POOL_KEY_PREFIX = "provider_pool:__PRODUCT_SLUG__:";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-provider-api-key,x-anthropic-api-key",
  "access-control-max-age": "86400"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function htmlResponse() {
  return new Response(INDEX_HTML, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function getBearerToken(request) {
  const auth = request.headers.get("authorization") || "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}

function isAccountTokenValue(token) {
  return /^(rn_|mc_)/.test(String(token || ""));
}

function getDirectProviderBearerToken(request) {
  const token = getBearerToken(request);
  return token && !isAccountTokenValue(token) ? token : "";
}

function requireKv(env) {
  if (!env.CONFIG_KV) throw new Error("Cloud storage is not configured.");
  return env.CONFIG_KV;
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function base64Url(bytes) {
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(prefix = "rn") {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return prefix + "_" + base64Url(bytes);
}

function randomId(prefix = "id") {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return prefix + "_" + base64Url(bytes);
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function bytesToB64(bytes) {
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

function b64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function appAesKey() {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(APP_SECRET));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptSecret(value) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await appAesKey();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(String(value || "")));
  return { iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(encrypted)) };
}

async function decryptSecret(payload) {
  if (!payload || !payload.iv || !payload.data) return "";
  const key = await appAesKey();
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(payload.iv) }, key, b64ToBytes(payload.data));
  return new TextDecoder().decode(decrypted);
}

async function passwordHash(password, saltB64) {
  const salt = saltB64 ? b64ToBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(password || "")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, baseKey, 256);
  return { salt: bytesToB64(salt), hash: bytesToB64(new Uint8Array(bits)) };
}

async function verifyPassword(password, user) {
  const attempt = await passwordHash(password, user.salt);
  return attempt.hash === user.password_hash;
}

async function loadUserByUsername(kv, username) {
  const normalized = normalizeUsername(username);
  return kv.get("user_name:" + normalized, { type: "json" });
}

async function saveUser(kv, user) {
  await kv.put("user:" + user.id, JSON.stringify(user));
  await kv.put("user_name:" + user.username, JSON.stringify(user));
}

async function issueAccountToken(kv, userId, type = "session", label = "") {
  const prefix = type === "pat" ? "rn_pat" : "rn_sess";
  const token = randomToken(prefix);
  const hash = await sha256Hex(token);
  await kv.put("token:" + hash, JSON.stringify({ user_id: userId, type, label, created_at: nowIso() }));
  return token;
}

async function authAccount(request, env) {
  const token = getBearerToken(request);
  if (!token || !isAccountTokenValue(token)) return null;
  const kv = requireKv(env);
  const record = await kv.get("token:" + await sha256Hex(token), { type: "json" });
  if (!record || !record.user_id) return null;
  const user = await kv.get("user:" + record.user_id, { type: "json" });
  if (!user) return null;
  return { user, token: record };
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    active_profile_id: user.active_profile_id || "",
    active_provider_pool_ids: []
  };
}

function publicProfile(profile) {
  return {
    id: profile.id,
    name: profile.name,
    mode: profile.mode,
    base_url: profile.base_url,
    model: profile.model,
    disguise: profile.disguise || "none",
    key_preview: profile.key_preview || "",
    created_at: profile.created_at,
    updated_at: profile.updated_at
  };
}

function publicProviderPoolFromIds(ids, profiles) {
  const selectedIds = Array.isArray(ids) ? ids : [];
  const selected = selectedIds.map(id => profiles.find(p => p.id === id)).filter(Boolean).map(publicProfile);
  return { ids: selectedIds, profiles: selected, count: selected.length, scope: "__PRODUCT_SLUG__" };
}

async function loadProductProviderPoolIds(kv, userId) {
  return await kv.get(PRODUCT_POOL_KEY_PREFIX + userId, { type: "json" }) || [];
}

async function saveProductProviderPoolIds(kv, userId, ids) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).map(String).filter(Boolean))];
  await kv.put(PRODUCT_POOL_KEY_PREFIX + userId, JSON.stringify(uniqueIds));
  return uniqueIds;
}

async function loadProfiles(kv, userId) {
  return await kv.get("profiles:" + userId, { type: "json" }) || [];
}

async function saveProfiles(kv, userId, profiles) {
  await kv.put("profiles:" + userId, JSON.stringify(profiles));
}

async function profileWithApiKey(profile) {
  return {
    mode: profile.mode || "openai",
    base_url: profile.base_url,
    model: profile.model,
    api_key: await decryptSecret(profile.api_key_encrypted),
    profile_id: profile.id || "",
    profile_name: profile.name || ""
  };
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function asArray(value, fallback = []) {
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return fallback;
}

function isDeepSeekProvider(baseUrl, model) {
  return /deepseek/i.test(baseUrl || "") || /deepseek/i.test(model || "");
}

function normalizeOpenAIBaseUrl(rawUrl) {
  let value = String(rawUrl || "").trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) value = "https://" + value;
  const u = new URL(value);
  u.hash = "";
  u.search = "";
  let path = u.pathname.replace(/\/+/g, "/").replace(/\/+$/, "");
  path = path.replace(/\/(chat\/completions|models)$/i, "");
  path = path.replace(/\/v1\/(chat\/completions|models)$/i, "/v1");
  path = path.replace(/\/+$/, "");
  if (!path || path === "/") path = "/v1";
  if (!/(^|\/)v1$/i.test(path) && !/\/v1\//i.test(path)) path += "/v1";
  u.pathname = path;
  return u.toString().replace(/\/+$/, "");
}

function buildPrompt(params, category) {
  const regions = ["MX"];
  const lang = "es-MX";
  const device = params.device || "android";
  const benefits = asArray(params.benefits, ["Pay water, electricity and gas bills from the app"]);
  const type = params.type || "both";
  const tone = params.tone || "clear, calm, and protective";
  const qty = clampInt(params.qty, 1, MAX_QTY_PER_TYPE, 5);
  const control = params.score_control || params.scoreControl || {};
  const targets = control.targets || params.targets || {};

  const lmap = { "es-MX":"Mexican Spanish", es:"Mexican Spanish" };
  const rmap = { MX:"Mexico" };
  const rstr = regions.map(r => rmap[r] || r).join(", ");
  const dev = device === "both" ? "iOS and Android" : device === "ios" ? "iOS" : "Android";
  const tstr = type === "short"
    ? `${qty} short headlines (each <=25 bytes)`
    : type === "long"
    ? `${qty} long descriptions (each <=75 bytes)`
    : `${qty} short headlines (each <=25 bytes) AND ${qty} long descriptions (each <=75 bytes)`;

  const hints = [
    regions.includes("MX") ? "Mexican users may live with limited or variable income and need clarity, control, calm, and practical help for daily money friction." : "",
    
  ].filter(Boolean).join(" ");

  const tg = defaultTargets(targets);
  const scoreGuide = `QUALITY SCORING SYSTEM. Meet every minimum target before output:
- Hook >= ${tg.hook}/10: opening must grab attention. Score uses power words in the first third (+5), number in first half (+3), or question mark (+2).
- Relevance >= ${tg.rel}/10: include the selected __PRODUCT_NAME__ function in natural Mexican Spanish, using concrete action words such as pagar servicios, recargar celular, consultar saldo, transferir, agregar efectivo, retirar efectivo, revisar movimientos, or programar pagos.
- CTA >= ${tg.cta}/10: include a natural es-MX action verb such as Descarga, Usa, Paga, Recarga, Consulta, Revisa, Transfiere, Agrega, Retira, Programa, or Conoce.
- Space use >= ${tg.space}/10: aim for 75-100% of the byte limit. Over limit fails.
- Overall weighted score >= ${tg.total}/10: Hook, product relevance, CTA, space use, and __PRODUCT_NAME__ brand fit.
The minimum targets are the caller's explicit acceptance floor. Do not silently raise the target above what the caller asked for.
If any candidate is below target, rewrite it before returning JSON. When the caller requests large volume or lower targets, prioritize passing the explicit targets and returning enough usable copy over chasing a perfect score.`;

  return `You are a senior Google Ads specialist creating compliant, conversion-oriented copy for __PRODUCT_NAME__ - a personal finance app that helps people in Mexico manage everyday money, payments, bills, transfers, and cash access - targeting ${rstr}.

Platform: Google App Campaign ads for ${dev}
Language: ${lmap[lang] || lang}
Category: ${category}
Selected product functions to highlight: ${benefits.join(", ")}
Tone: ${tone}
Local market context: ${hints || "Use natural local phrasing without unsupported claims."}
Brand voice: clear, calm, protective, direct, warm without slang, realistic optimism. Help users feel in control rather than sold to.

Task: Write ${tstr}.

BYTE COUNTING RULE: CJK characters = 2 bytes each. ASCII letters, numbers, spaces, punctuation = 1 byte each. Every copy MUST be within its byte limit.

${scoreGuide}

COPYWRITING RULES:
- Headlines: clear, benefit-first, and easy to understand. No filler.
- Descriptions: practical daily money benefit + natural CTA. Specific to the selected job-to-be-done, not generic.
- Write about the selected concrete product functions only. Do not turn abstract jobs like control or tranquilidad into standalone claims; connect them to a real action such as paying utilities, topping up airtime, checking balance, transferring money, paying services, adding cash, withdrawing cash, reviewing transactions, or scheduling recurring payments.
- Supported __PRODUCT_NAME__ function facts: water/electricity/gas bill pay; phone airtime top-ups; contactless store payments; pay from home; internet/phone/TV providers; tuition/school payments; taxes/government fees; catalog sales payments; insurance/tolls/transport payments; 377+ bill-pay services in 42 categories; transfers to any account; 28,531+ cash-in points; 6,984+ cash-out points; balance checks; transaction history; recurring payments; cashback on purchases; $100 welcome cashback where campaign terms apply; 24/7 support; backed by Clip.
- Do NOT invent licenses, regulated status, bank partnerships, card-network relationships, security certifications, encryption standards, fee advantages, exchange-rate advantages, arrival speed, approval likelihood, savings guarantees, cashback amounts beyond supplied facts, rewards beyond supplied facts, investment returns, risk-free claims, or guaranteed approval.
- Do NOT use exclamation marks.
- Every copy must be unique and varied.
- Use natural Mexican Spanish only, with simple words a Mexican Android user would understand.
- Never present roadmap-only items as live features. If evidence is missing, keep it as a neutral scenario rather than a product claim.

Respond ONLY with valid JSON, no markdown, no preamble:
{"short":["...","..."],"long":["...","..."]}
Include only the keys needed for the requested type(s).`;
}

async function callModel(request, provider, prompt, wantsJson) {
  const mode = provider.mode || "openai";
  const suppliedBaseUrl = provider.base_url || provider.baseUrl || provider.url || "";
  const baseUrl = mode === "anthropic"
    ? String(suppliedBaseUrl || "https://api.anthropic.com/v1").replace(/\/+$/, "")
    : (suppliedBaseUrl ? normalizeOpenAIBaseUrl(suppliedBaseUrl) : "https://api.deepseek.com");
  const model = provider.model || (mode === "anthropic" ? DEFAULT_MODEL_ANTHROPIC : DEFAULT_MODEL_OPENAI);
  const apiKey = provider.api_key || provider.apiKey || request.headers.get("x-provider-api-key") || request.headers.get("x-anthropic-api-key") || getDirectProviderBearerToken(request);

  if (!/^https:\/\//i.test(baseUrl)) throw new Error("provider.base_url must start with https://");
  if (!apiKey) throw new Error("Provider API key is required. Use Authorization: Bearer <key>, x-provider-api-key, or provider.api_key.");

  if (mode === "anthropic") {
    const response = await fetch(baseUrl + "/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: wantsJson ? 3000 : 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.error?.message || `Provider request failed with ${response.status}`);
    return Array.isArray(data.content) ? data.content.map(b => b.text || "").join("") : "";
  }

  const body = {
    model,
    max_tokens: wantsJson ? 3000 : 1000,
    temperature: Number.isFinite(Number(provider.temperature)) ? Number(provider.temperature) : (wantsJson ? 0.95 : 0.7),
    top_p: Number.isFinite(Number(provider.top_p || provider.topP)) ? Number(provider.top_p || provider.topP) : 0.92,
    messages: [{ role: "user", content: prompt }]
  };
  if (wantsJson && isDeepSeekProvider(baseUrl, model)) body.response_format = { type: "json_object" };

  const response = await fetch(baseUrl + "/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer " + apiKey
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error?.message || JSON.stringify(data.error || {}) || `Provider request failed with ${response.status}`);
  const msg = data.choices?.[0]?.message || {};
  return msg.content || msg.reasoning_content || "";
}

function blen(s) {
  let n = 0;
  for (let i = 0; i < String(s).length; i++) n += String(s).charCodeAt(i) > 127 ? 2 : 1;
  return n;
}

const HOOK_WORDS = [
  "discover", "find", "explore", "unlock", "join", "get", "try", "see", "now", "free",
  "new", "best", "top", "real", "true", "only", "must", "why", "how", "what",
  "descubre", "descarga", "instala", "encuentra", "conoce", "prueba", "usa", "empieza", "paga", "recarga", "consulta",
  "transfiere", "retira", "agrega", "controla", "administra", "organiza", "revisa", "resuelve",
  "hoy", "ahora", "facil", "claro", "tranquilo", "seguro", "dinero", "saldo",
  "\u53d1\u73b0", "\u63a2\u7d22", "\u514d\u8d39", "\u7acb\u5373", "\u6700\u597d", "\u771f\u5b9e", "\u52a0\u5165", "\u83b7\u53d6", "\u4e86\u89e3", "\u5f00\u59cb",
  "entdecke", "finde", "kostenlos", "jetzt", "beste", "echte", "neu",
  "d\u00e9couvrez", "trouvez", "gratuit", "maintenant", "meilleur", "vrai", "nouveau"
];

const CTA_WORDS = [
  "download", "install", "get", "try", "join", "start", "explore", "discover", "find", "see",
  "shop", "browse", "learn", "watch", "read", "sign up", "open", "use",
  "download now", "get it", "try it", "install now",
  "descarga", "instala", "usa", "empieza", "prueba", "conoce", "abre", "paga", "recarga",
  "consulta", "revisa", "transfiere", "envia", "recibe", "agrega", "deposita", "retira",
  "programa", "cobra", "maneja", "controla", "administra",
  "\u4e0b\u8f7d", "\u5b89\u88c5", "\u5f00\u59cb", "\u52a0\u5165", "\u63a2\u7d22", "\u53d1\u73b0", "\u7acb\u5373", "\u514d\u8d39\u4e0b\u8f7d", "\u4f53\u9a8c",
  "herunterladen", "installieren", "jetzt", "starten", "entdecken",
  "t\u00e9l\u00e9charger", "installer", "commencer", "d\u00e9couvrir", "essayer"
];

const MI_CLIP_BENEFIT_CONCEPTS = [
  { keys: ["bill", "bills", "utility", "utilities", "water", "electricity", "gas", "services", "service", "cfe", "naturgy"], terms: ["servicio", "servicios", "recibo", "recibos", "agua", "luz", "gas", "cfe", "naturgy", "ecogas", "z-gas", "pagar", "paga"] },
  { keys: ["airtime", "top-up", "top-ups", "phone", "carrier", "telcel", "movistar", "at&t"], terms: ["recarga", "recargas", "celular", "telefono", "telcel", "movistar", "at&t", "saldo"] },
  { keys: ["balance", "available", "foresight", "spending", "money"], terms: ["saldo", "dinero", "disponible", "consulta", "revisa", "antes de gastar", "control"] },
  { keys: ["history", "transaction", "transactions", "movement", "movements"], terms: ["movimientos", "historial", "transacciones", "pagas", "recibes"] },
  { keys: ["transfer", "transfers", "send", "receive", "account"], terms: ["transferencia", "transferencias", "transfiere", "envia", "recibe", "cuenta"] },
  { keys: ["cash-in", "cash in", "add cash", "deposit", "points", "7-eleven", "soriana", "kiosko"], terms: ["agrega efectivo", "deposita", "efectivo", "saldo", "7-eleven", "soriana", "kiosko", "farmacias del ahorro", "puntos"] },
  { keys: ["cash-out", "cash out", "withdraw", "withdrawal"], terms: ["retira efectivo", "retira", "retiro", "efectivo", "soriana", "kiosko", "willys"] },
  { keys: ["cashback", "reward", "rewards", "promo", "promos"], terms: ["cashback", "reembolso", "recompensa", "recompensas", "promo", "promociones", "compras"] },
  { keys: ["contactless", "tap", "store", "payment", "payments"], terms: ["pago", "pagos", "sin contacto", "tienda", "telefono", "celular"] },
  { keys: ["school", "tuition", "education"], terms: ["colegiatura", "colegiaturas", "escuela", "escuelas", "educacion"] },
  { keys: ["tax", "taxes", "government", "fees"], terms: ["predial", "tenencia", "impuestos", "gobierno", "tramites"] },
  { keys: ["recurring", "schedule", "on time", "late"], terms: ["programa", "recurrentes", "a tiempo", "recuerda", "pagos"] },
  { keys: ["support", "24/7", "help"], terms: ["ayuda", "soporte", "atencion", "24/7", "respaldo"] },
  { keys: ["clip", "backed"], terms: ["clip", "respaldo"] }
];

const MI_CLIP_BRAND_TERMS = [
  "control", "tranquilidad", "claro", "clara", "claridad", "seguro", "segura", "confianza",
  "facil", "simple", "diario", "dia a dia", "dinero", "saldo", "sin salir", "desde casa"
];

const MI_CLIP_CONCRETE_FUNCTION_TERMS = [
  "paga", "pagar", "recarga", "recargas", "consulta", "revisa", "transfiere", "envia",
  "recibe", "agrega", "deposita", "retira", "programa", "historial", "movimientos",
  "servicios", "recibos", "agua", "luz", "gas", "saldo", "efectivo", "cashback"
];

const MI_CLIP_HYPERBOLE_TERMS = [
  "milagro", "increible", "nunca", "jamas", "garantizado", "asegurado", "sin riesgo",
  "al instante", "instantaneo", "gratis siempre", "el mejor", "la mejor", "numero 1"
];

function defaultTargets(targets = {}) {
  return {
    hook: clampInt(targets.hook, 0, 10, 6),
    rel: clampInt(targets.rel, 0, 10, 6),
    cta: clampInt(targets.cta, 0, 10, 7),
    space: clampInt(targets.space, 0, 10, 5),
    total: clampInt(targets.total, 0, 10, 7)
  };
}

function scoreText(text, type, benefits) {
  const source = String(text || "");
  const t = source.toLowerCase();
  const normalized = normalizeForScore(source);
  const kind = type === "long" ? "long" : "short";
  const max = kind === "short" ? 25 : 75;
  const bytes = blen(source);

  const firstThird = normalized.slice(0, Math.ceil(normalized.length / 3));
  const hasHook = HOOK_WORDS.some(w => firstThird.includes(normalizeForScore(w)));
  const hasNumber = /\d/.test(source.slice(0, Math.ceil(source.length / 2)));
  const hasQuestion = source.includes("?");
  const hookScore = Math.min(10, (hasHook ? 6 : 0) + (hasNumber ? 2 : 0) + (hasQuestion ? 2 : 0));

  const relScore = miClipRelevanceScore(normalized, benefits);

  const hasCTA = CTA_WORDS.some(w => normalized.includes(normalizeForScore(w)));
  const ctaScore = hasCTA ? 10 : (kind === "short" ? 4 : 2);

  const pct = bytes / max;
  const spaceScore = bytes > max ? 0 : pct >= 0.75 ? 10 : pct >= 0.55 ? 7 : pct >= 0.35 ? 4 : 2;
  const brandScore = miClipBrandFitScore(normalized);
  const total = Math.round(hookScore * 0.22 + relScore * 0.34 + ctaScore * 0.18 + spaceScore * 0.10 + brandScore * 0.16);

  return {
    hook: hookScore,
    rel: relScore,
    relevance: relScore,
    cta: ctaScore,
    space: spaceScore,
    space_use: spaceScore,
    brand_fit: brandScore,
    total
  };
}

function normalizeForScore(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¡!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function miClipRelevanceScore(normalizedText, benefits) {
  const selected = asArray(benefits, []);
  const selectedNeedles = normalizeForScore(selected.join(" ")).split(/[\s,&/()·+.-]+/).filter(w => w.length > 3);
  const directMatches = selectedNeedles.filter(w => normalizedText.includes(w)).length;
  let conceptMatches = 0;
  const selectedText = normalizeForScore(selected.join(" "));
  MI_CLIP_BENEFIT_CONCEPTS.forEach(group => {
    const relevant = group.keys.some(key => selectedText.includes(normalizeForScore(key)));
    if (!relevant) return;
    if (group.terms.some(term => normalizedText.includes(normalizeForScore(term)))) conceptMatches++;
  });
  const concreteMatches = MI_CLIP_CONCRETE_FUNCTION_TERMS.filter(term => normalizedText.includes(normalizeForScore(term))).length;
  const weighted = conceptMatches * 2 + Math.min(2, directMatches) + Math.min(2, concreteMatches);
  return Math.min(10, weighted >= 6 ? 10 : weighted >= 4 ? 8 : weighted >= 2 ? 6 : concreteMatches ? 5 : 2);
}

function miClipBrandFitScore(normalizedText) {
  const brandHits = MI_CLIP_BRAND_TERMS.filter(term => normalizedText.includes(normalizeForScore(term))).length;
  const concreteHits = MI_CLIP_CONCRETE_FUNCTION_TERMS.filter(term => normalizedText.includes(normalizeForScore(term))).length;
  const hyperboleHits = MI_CLIP_HYPERBOLE_TERMS.filter(term => normalizedText.includes(normalizeForScore(term))).length;
  const vaguePronounPenalty = /\b(esto|eso|esta app|estas funciones)\b/.test(normalizedText) ? 1 : 0;
  let score = 4 + Math.min(3, brandHits) + Math.min(3, concreteHits);
  score -= Math.min(4, hyperboleHits * 2 + vaguePronounPenalty);
  return Math.max(0, Math.min(10, score));
}

function inferCopyType(text, type) {
  if (type === "short" || type === "long") return type;
  return blen(text) <= 25 ? "short" : "long";
}

function scorePasses(score, targets = {}) {
  const tg = defaultTargets(targets);
  return score.hook >= tg.hook && score.rel >= tg.rel && score.cta >= tg.cta && score.space >= tg.space && score.total >= tg.total;
}


const FINANCIAL_FORBIDDEN_PATTERNS = [
  /\b(fdic|fca|mas|pci|soc\s*2|iso\s*27001|bank[-\s]?grade|licensed|regulated|certified|insured)\b/i,
  /\b(bank partner|bank partnership|official partner|visa partner|mastercard partner|approved lender)\b/i,
  /\b(no fees?|zero fees?|free transfers?|lowest fees?|best rates?|better exchange rates?|no hidden fees?)\b/i,
  /\b(instant transfer|instant payout|arrives instantly|same[-\s]?day transfer|real[-\s]?time transfer)\b/i,
  /\b(guaranteed approval|instant approval|pre[-\s]?approved|risk[-\s]?free|guaranteed savings?|guaranteed returns?|earn yields?|investment returns?)\b/i,
  /\b(safest|fully secure|secure by default|encrypted payments?|military[-\s]?grade)\b/i,
  /牌照|持牌|监管认证|银行合作|官方合作|安全认证|银行级|零手续费|免手续费|最低费率|最优汇率|实时到账|秒到账|即时到账|保证通过| guaranteed approval|无风险|保证省钱|稳赚|收益|返现/i
];

function financialComplianceViolations(text) {
  const source = String(text || "");
  return FINANCIAL_FORBIDDEN_PATTERNS
    .filter(pattern => pattern.test(source))
    .map(pattern => pattern.source.slice(0, 80));
}

function annotateCopy(text, type, benefits, targets = {}, extra = {}) {
  const copyType = inferCopyType(text, type);
  const limit = copyType === "short" ? 25 : 75;
  const bytes = blen(text);
  const score = scoreText(text, copyType, benefits);
  const complianceViolations = financialComplianceViolations(text);
  return {
    ...extra,
    text: String(text || ""),
    type: copyType,
    bytes,
    limit,
    over_limit: bytes > limit,
    compliance: { passed: complianceViolations.length === 0, violations: complianceViolations },
    score,
    passes_targets: bytes <= limit && complianceViolations.length === 0 && scorePasses(score, targets)
  };
}

function scoreRangePasses(score, ranges = {}) {
  return ["hook", "rel", "cta", "space", "total"].every(key => {
    const alias = key === "rel" ? "relevance" : key === "space" ? "space_use" : key;
    const range = ranges[key] || ranges[alias];
    if (!Array.isArray(range)) return true;
    const lo = Number.isFinite(Number(range[0])) ? Number(range[0]) : 0;
    const hi = Number.isFinite(Number(range[1])) ? Number(range[1]) : 10;
    return score[key] >= lo && score[key] <= hi;
  });
}

function parseCopyJson(raw, expectedType = "both") {
  const source = String(raw || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/gi, "```")
    .trim();
  const candidates = [];
  const fenced = source.match(/```[\s\S]*?```/g) || [];
  fenced.forEach(block => candidates.push(block.replace(/^```[a-z]*\s*/i, "").replace(/```$/i, "").trim()));
  candidates.push(source);

  for (const text of candidates) {
    try { return normalizeCopyJson(JSON.parse(text.trim()), expectedType); } catch(e) {}
    const extracted = extractFirstJsonObject(text);
    if (extracted) {
      try { return normalizeCopyJson(JSON.parse(extracted), expectedType); } catch(e) {}
    }
  }
  const fallback = parsePlainCopyList(source, expectedType);
  if (fallback.short.length || fallback.long.length) return fallback;
  throw new Error("Unexpected response format. Raw response: " + previewRawResponse(source));
}

function extractFirstJsonObject(text) {
  let start = -1, depth = 0, inString = false, escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (start < 0) {
      if (ch === "{") { start = i; depth = 1; }
      continue;
    }
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === "\"") { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) return text.slice(start, i + 1);
  }
  return "";
}

function normalizeCopyJson(parsed, expectedType = "both") {
  if (Array.isArray(parsed)) return classifyCopyArray(parsed, expectedType);
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON object.");
  const short = normalizeCopyArray([parsed.short, parsed.shorts, parsed.headlines, parsed.short_headlines, parsed.shortHeadlines, parsed.short_titles, parsed.shortTitles, parsed.titles]);
  const long = normalizeCopyArray([parsed.long, parsed.longs, parsed.descriptions, parsed.long_descriptions, parsed.longDescriptions, parsed.long_copy, parsed.longCopy, parsed.desc, parsed.description]);
  if (short.length || long.length) return { short, long };
  const nested = [parsed.data, parsed.result, parsed.results, parsed.items, parsed.copies, parsed.copy].filter(Boolean);
  for (const item of nested) {
    try {
      const normalized = normalizeCopyJson(item, expectedType);
      if (normalized.short.length || normalized.long.length) return normalized;
    } catch(e) {}
  }
  if (parsed.text) return parsePlainCopyList(String(parsed.text), expectedType);
  throw new Error("No copy arrays found.");
}

function normalizeCopyArray(candidates) {
  const found = candidates.find(v => Array.isArray(v) || typeof v === "string") || [];
  const arr = Array.isArray(found) ? found : splitPlainCopyLines(found);
  return arr.map(item => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") return item.text || item.copy || item.content || item.title || item.description || "";
    return "";
  }).map(cleanCopyLine).filter(Boolean);
}

function classifyCopyArray(items, expectedType = "both") {
  const lines = items.map(item => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") return item.text || item.copy || item.content || item.title || item.description || "";
    return "";
  }).map(cleanCopyLine).filter(Boolean);
  const out = { short: [], long: [] };
  lines.forEach(line => {
    if (expectedType === "short") out.short.push(line);
    else if (expectedType === "long") out.long.push(line);
    else if (blen(line) <= 25) out.short.push(line);
    else out.long.push(line);
  });
  return out;
}

function parsePlainCopyList(text, expectedType = "both") {
  return classifyCopyArray(splitPlainCopyLines(text), expectedType);
}

function splitPlainCopyLines(text) {
  return String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```[\s\S]*?```/g, block => block.replace(/^```[a-z]*\s*/i, "").replace(/```$/i, ""))
    .split(/\r?\n|[；;]/)
    .map(cleanCopyLine)
    .filter(line => line && !/^(short|long|headline|description|json|output|result|以下|这里|当然|好的)[:：]?$/i.test(line))
    .filter(line => !/^\{|\}|\[|\]$/.test(line));
}

function cleanCopyLine(line) {
  return String(line || "")
    .replace(/^[\s"'“”‘’`]+|[\s"'“”‘’`]+$/g, "")
    .replace(/^\s*(?:[-*•]|\d+[\).、]|[A-Za-z]\)|短标题|长描述|标题|描述|headline|description|short|long)\s*[:：-]?\s*/i, "")
    .trim();
}

function previewRawResponse(text) {
  return String(text || "").replace(/\s+/g, " ").slice(0, 500) || "(empty)";
}

function scoreControlConfig(params = {}) {
  const control = params.score_control || params.scoreControl || {};
  const hasTargets = Boolean(params.targets || control.targets);
  const hasQualityGoal = Boolean(control.quality_goal || control.qualityGoal || params.quality_goal || params.qualityGoal);
  const enabled = params.enforce_targets === true || params.enforceTargets === true || control.enforce === true || control.enabled === true || hasTargets;
  const targets = defaultTargets(control.targets || params.targets || {});
  return {
    enabled,
    targets,
    max_attempts: enabled ? clampInt(control.max_attempts || control.maxAttempts || params.max_attempts || params.maxAttempts, 1, 5, 3) : 1,
    return_rejected: Boolean(control.return_rejected || control.returnRejected || params.return_rejected || params.returnRejected),
    candidate_multiplier: clampInt(control.candidate_multiplier || control.candidateMultiplier || params.candidate_multiplier || params.candidateMultiplier, 1, 4, enabled ? 3 : 1),
    quality_goal_explicit: hasQualityGoal,
    quality_goal: qualityGoal(control.quality_goal || control.qualityGoal || params.quality_goal || params.qualityGoal || {}, targets, hasQualityGoal)
  };
}

function desiredCounts(type, qty) {
  return {
    short: type === "long" ? 0 : qty,
    long: type === "short" ? 0 : qty
  };
}

function enoughItems(shortItems, longItems, desired) {
  return shortItems.length >= desired.short && longItems.length >= desired.long;
}

function appendAccepted(target, item, desiredCount, seen) {
  const key = item.type + "::" + item.text.toLowerCase();
  if (seen.has(key) || target.length >= desiredCount) return false;
  seen.add(key);
  target.push(item);
  return true;
}

function insertBestAccepted(target, item, desiredCount, seen) {
  const key = item.type + "::" + item.text.toLowerCase();
  if (seen.has(key) || desiredCount <= 0) return false;
  if (target.length < desiredCount) {
    seen.add(key);
    target.push(item);
    target.sort((a, b) => scoreSortValue(b) - scoreSortValue(a));
    return true;
  }

  let worstIndex = -1;
  let worstScore = Infinity;
  target.forEach((candidate, index) => {
    const value = scoreSortValue(candidate);
    if (value < worstScore) {
      worstScore = value;
      worstIndex = index;
    }
  });
  const itemScore = scoreSortValue(item);
  if (worstIndex < 0 || itemScore <= worstScore) return false;

  const removed = target[worstIndex];
  seen.delete(removed.type + "::" + removed.text.toLowerCase());
  seen.add(key);
  target[worstIndex] = item;
  target.sort((a, b) => scoreSortValue(b) - scoreSortValue(a));
  return true;
}

function rejectionReason(item) {
  if (item.over_limit) return "over_limit";
  if (item.compliance && item.compliance.passed === false) return "financial_compliance_violation";
  if (!item.passes_targets) return "below_score_targets";
  return "not_needed";
}

function candidateMultiplier(control, params = {}) {
  const explicit = control.candidate_multiplier || control.candidateMultiplier || params.candidate_multiplier || params.candidateMultiplier;
  if (explicit) return clampInt(explicit, 1, 4, 2);
  return control.enabled ? 3 : 1;
}

function scoreSortValue(item) {
  const score = item.score || {};
  return (Number(score.total) || 0) * 100
    + (Number(score.hook) || 0) * 8
    + (Number(score.rel) || Number(score.relevance) || 0) * 6
    + (Number(score.cta) || 0) * 4
    + (Number(score.space) || Number(score.space_use) || 0) * 2
    - (item.over_limit ? 1000 : 0);
}

function sortCandidates(items) {
  return items.slice().sort((a, b) => scoreSortValue(b) - scoreSortValue(a));
}

function qualityGoal(rawGoal = {}, targets = {}, explicit = false) {
  const tg = defaultTargets(targets);
  const relGoal = rawGoal.rel ?? rawGoal.relevance;
  const spaceGoal = rawGoal.space ?? rawGoal.space_use;
  const defaultLift = explicit ? 2 : 1;
  return {
    hook: clampInt(rawGoal.hook, 0, 10, Math.min(10, Math.max(tg.hook + defaultLift, explicit ? 8 : 7))),
    rel: clampInt(relGoal, 0, 10, Math.min(10, Math.max(tg.rel + defaultLift, explicit ? 8 : 7))),
    cta: clampInt(rawGoal.cta, 0, 10, Math.min(10, Math.max(tg.cta + 1, explicit ? 8 : 7))),
    space: clampInt(spaceGoal, 0, 10, Math.min(10, Math.max(tg.space + defaultLift, explicit ? 7 : 6))),
    total: clampInt(rawGoal.total, 0, 10, Math.min(10, Math.max(tg.total + defaultLift, explicit ? 9 : 7)))
  };
}

function selectedQualityStats(shortItems, longItems) {
  const items = shortItems.concat(longItems);
  if (!items.length) return { count: 0, min_total: 0, avg_total: 0, best_total: 0 };
  const totals = items.map(item => Number(item.score?.total) || 0);
  const sum = totals.reduce((acc, value) => acc + value, 0);
  return {
    count: items.length,
    min_total: Math.min(...totals),
    avg_total: Math.round((sum / totals.length) * 10) / 10,
    best_total: Math.max(...totals)
  };
}

function meetsQualityGoal(shortItems, longItems, goal) {
  const items = shortItems.concat(longItems);
  return items.length > 0 && items.every(item => (Number(item.score?.total) || 0) >= goal.total);
}

function failureCounts(items = [], targets = {}, goal = {}) {
  const tg = defaultTargets(targets);
  const qg = qualityGoal(goal, tg);
  const counts = { hook: 0, rel: 0, cta: 0, space: 0, total: 0, over: 0, compliance: 0 };
  items.slice(-40).forEach(item => {
    const score = item.score || {};
    if (item.over_limit) counts.over++;
    if (item.compliance && item.compliance.passed === false) counts.compliance++;
    if ((score.hook || 0) < Math.max(tg.hook, qg.hook - 1)) counts.hook++;
    if ((score.rel || score.relevance || 0) < Math.max(tg.rel, qg.rel - 1)) counts.rel++;
    if ((score.cta || 0) < Math.max(tg.cta, qg.cta - 1)) counts.cta++;
    if ((score.space || score.space_use || 0) < Math.max(tg.space, qg.space - 1)) counts.space++;
    if ((score.total || 0) < qg.total) counts.total++;
  });
  return Object.entries(counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
}

function failureSummary(items = [], targets = {}, goal = {}) {
  return failureCounts(items, targets, goal).map(([k]) => k);
}

function retryGuidance(items = [], selectedItems = [], targets = {}, goal = {}) {
  const source = items.length ? items : selectedItems;
  const ranked = failureCounts(source, targets, goal).slice(0, 3);
  const actions = {
    over: "Shorten first: remove side clauses, adjectives, repeated brand words, and keep one benefit plus one CTA only.",
    compliance: "Remove unsupported finance claims: no license, bank partnership, security certification, instant arrival, fee advantage, guaranteed approval, risk-free, or guaranteed savings language.",
    hook: "Strengthen the opening: start with a natural Mexican Spanish action word, a simple question, or a useful number within the first third of the copy.",
    rel: "Increase relevance: name the selected __PRODUCT_NAME__ action in es-MX, such as pagar servicios, recargar celular, consultar saldo, transferir, agregar efectivo, retirar efectivo, revisar movimientos, or programar pagos.",
    cta: "Add a clear Mexican Spanish action verb near the end: Descarga, Usa, Paga, Recarga, Consulta, Revisa, Transfiere, Agrega, Retira, Programa, or Conoce.",
    space: "Improve byte utilization: target roughly 80-95% of the byte limit without exceeding it; add one concrete function word if too short.",
    total: "Raise overall quality: combine a stronger hook, one exact benefit keyword, and a direct CTA instead of changing only wording."
  };
  const focus = ranked.length ? ranked.map(([key]) => key) : ["total"];
  const lines = focus.map(key => actions[key]).filter(Boolean);
  return {
    focus,
    lines: lines.slice(0, 3),
    source_count: source.length
  };
}

function creativeBrief(attempt, categoryIndex, rejectedItems, targets, selectedItems = [], goal = {}) {
  const frameworks = [
    "Use direct-action es-MX hooks: Descarga, Usa, Paga, Recarga, Consulta, Revisa, Transfiere, Agrega, Retira, Programa, or Conoce. Put the action in the first third of every line.",
    "Use curiosity hooks with a natural question or useful number early, then tie directly to the selected __PRODUCT_NAME__ function.",
    "Use problem-solution copy: start with the user's daily money friction, then one concrete __PRODUCT_NAME__ action, then a clear es-MX CTA verb.",
    "Use social-discovery copy only when it fits the product: concrete user action, benefit keyword, and no unsupported claims.",
    "Use utility-first copy: what the user can do today, concrete benefit words, and a simple CTA."
  ];
  const style = frameworks[(attempt + categoryIndex - 1) % frameworks.length];
  const guidance = retryGuidance(rejectedItems, selectedItems, targets, goal);
  const fixes = guidance.lines.length
    ? guidance.lines.map(line => `- ${line}`).join("\n")
    : "- Avoid generic brand slogans and produce structurally different candidates.";
  return `CREATIVE DIVERSITY BRIEF:
- ${style}
ADAPTIVE RETRY GUIDANCE (bounded; do not add extra constraints beyond these):
${fixes}
- Aim above the caller's explicit target when possible, but do not sacrifice usable volume, natural Mexican Spanish, byte limits, or product accuracy just to chase a perfect score.
- Produce multiple distinct angles, not small wording variants.
- For weak copywriting models, use this formula: es-MX action word or question first, concrete __PRODUCT_NAME__ function in the middle, natural CTA verb near the end.
- Keep each item within byte limit; do not explain.`;
}

function pickProvider(providerPool, categoryIndex, attempt) {
  const pool = Array.isArray(providerPool) && providerPool.length ? providerPool : [{}];
  return pool[(categoryIndex + attempt - 1) % pool.length];
}

function providerPublicInfo(provider, index) {
  return {
    index,
    assigned_pool_index: Number.isFinite(provider.assigned_pool_index) ? provider.assigned_pool_index : index,
    profile_id: provider.profile_id || provider.profileId || "",
    profile_name: provider.profile_name || provider.profileName || provider.name || "",
    mode: provider.mode || "openai",
    base_url: provider.base_url || provider.baseUrl || provider.url || "",
    model: provider.model || ""
  };
}

function stableHash(value) {
  const text = String(value || "");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getAgentId(request, body = {}) {
  const control = body.provider_pool || body.providerPool || {};
  return String(body.agent_id || body.agentId || control.agent_id || control.agentId || request.headers.get("x-agent-id") || "").trim();
}

function getProviderPoolMode(request, body = {}) {
  const control = body.provider_pool || body.providerPool || {};
  const agentId = getAgentId(request, body);
  const mode = String(body.provider_pool_mode || body.providerPoolMode || control.mode || request.headers.get("x-provider-pool-mode") || "").trim().toLowerCase();
  if (mode) return mode;
  return agentId ? "agent_sticky" : "parallel";
}

function getProviderIndex(request, body = {}) {
  const control = body.provider_pool || body.providerPool || {};
  const raw = body.provider_index ?? body.providerIndex ?? control.provider_index ?? control.providerIndex ?? request.headers.get("x-provider-index");
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function assignProviderPool(request, body, providerPool) {
  const pool = Array.isArray(providerPool) && providerPool.length ? providerPool : [{}];
  const mode = getProviderPoolMode(request, body);
  const agentId = getAgentId(request, body);
  const explicitIndex = getProviderIndex(request, body);
  if (["agent_sticky", "agent", "per_agent", "single", "single_provider"].includes(mode) || explicitIndex !== null) {
    const assignedIndex = ((explicitIndex !== null ? explicitIndex : stableHash(agentId || "default-agent")) % pool.length + pool.length) % pool.length;
    const selected = { ...pool[assignedIndex], assigned_pool_index: assignedIndex };
    const next = [selected];
    next.__pool_meta = {
      mode: "agent_sticky",
      strategy: "agent_sticky_single_provider",
      agent_id: agentId,
      assigned_pool_index: assignedIndex,
      source_pool_size: pool.length
    };
    return next;
  }
  pool.__pool_meta = { mode: "parallel", strategy: "parallel_round_robin_by_category_and_attempt", source_pool_size: pool.length };
  return pool;
}

async function generateCategoryWithScoreControl(request, providerPool, params, category, categoryIndex = 0) {
  const type = params.type || "both";
  const qty = clampInt(params.qty, 1, MAX_QTY_PER_TYPE, 5);
  const control = scoreControlConfig(params);
  const benefits = asArray(params.benefits, ["Mobile payment convenience"]);
  const desired = desiredCounts(type, qty);
  const shortItems = [];
  const longItems = [];
  const rejectedItems = [];
  const providerErrors = [];
  const seen = new Set();
  const pool = Array.isArray(providerPool) && providerPool.length ? providerPool : [{}];
  const multiplier = candidateMultiplier(control, params);
  let rawPreview = "";
  let attempts = 0;
  let providerCalls = 0;
  const retryHistory = [];

  for (let attempt = 1; attempt <= control.max_attempts; attempt++) {
    attempts = attempt;
    const remaining = Math.max(
      desired.short ? Math.max(1, desired.short - shortItems.length) : 0,
      desired.long ? Math.max(1, desired.long - longItems.length) : 0,
      1
    );
    const parallelCount = Math.max(1, Math.min(pool.length, remaining));
    const perCallQty = Math.min(MAX_QTY_PER_TYPE, Math.ceil(remaining / parallelCount) * multiplier);
    const attemptAccepted = [];
    const attemptRejected = [];

    const callTasks = Array.from({ length: parallelCount }, async (_, offset) => {
      const provider = pool[(categoryIndex + attempt - 1 + offset) % pool.length];
      const promptParams = { ...params, qty: perCallQty };
      let prompt = buildPrompt(promptParams, category);
      prompt += "\n\n" + creativeBrief(attempt, categoryIndex + offset, rejectedItems, control.targets, shortItems.concat(longItems), control.quality_goal);
      const raw = await callModel(request, provider, prompt, true);
      const parsed = parseCopyJson(raw, type);
      const candidates = [];
      (parsed.short || []).forEach(copy => candidates.push(annotateCopy(copy, "short", benefits, control.targets, { category, attempt, provider_index: offset })));
      (parsed.long || []).forEach(copy => candidates.push(annotateCopy(copy, "long", benefits, control.targets, { category, attempt, provider_index: offset })));
      return { raw, candidates, provider };
    });

    const settledCalls = await Promise.allSettled(callTasks);
    providerCalls += settledCalls.length;
    settledCalls.forEach((settled, offset) => {
      if (settled.status === "rejected") {
        const provider = pool[(categoryIndex + attempt - 1 + offset) % pool.length];
        providerErrors.push({ ...providerPublicInfo(provider, offset), attempt, error: settled.reason?.message || String(settled.reason) });
        return;
      }
      rawPreview = previewRawResponse(settled.value.raw);
      settled.value.candidates.forEach(item => {
        const accepted = !control.enabled || item.passes_targets;
        if (accepted) attemptAccepted.push(item);
        else attemptRejected.push({ ...item, reject_reason: rejectionReason(item) });
      });
    });

    sortCandidates(attemptAccepted).forEach(item => {
      if (item.type === "short") {
        if (!insertBestAccepted(shortItems, item, desired.short, seen)) attemptRejected.push({ ...item, reject_reason: rejectionReason(item) });
      } else if (item.type === "long") {
        if (!insertBestAccepted(longItems, item, desired.long, seen)) attemptRejected.push({ ...item, reject_reason: rejectionReason(item) });
      } else {
        attemptRejected.push({ ...item, reject_reason: rejectionReason(item) });
      }
    });
    rejectedItems.push(...sortCandidates(attemptRejected));
    retryHistory.push({
      attempt,
      accepted_count: attemptAccepted.length,
      rejected_count: attemptRejected.length,
      adaptive_focus: retryGuidance(attemptRejected, shortItems.concat(longItems), control.targets, control.quality_goal).focus
    });

    const enough = enoughItems(shortItems, longItems, desired);
    if (enough && (!control.enabled || !control.quality_goal_explicit || meetsQualityGoal(shortItems, longItems, control.quality_goal) || attempt >= control.max_attempts)) break;
  }

  if (!shortItems.length && !longItems.length && providerErrors.length && !rejectedItems.length) {
    throw new Error(providerErrors.map(e => e.error).join(" | "));
  }

  const response = {
    category,
    short: shortItems.map(item => item.text),
    long: longItems.map(item => item.text),
    short_items: shortItems,
    long_items: longItems,
    items: shortItems.concat(longItems),
    score_control: {
      enabled: control.enabled,
      targets: control.targets,
      quality_goal: control.quality_goal,
      quality_goal_explicit: control.quality_goal_explicit,
      quality_stats: selectedQualityStats(shortItems, longItems),
      max_attempts: control.max_attempts,
      candidate_multiplier: multiplier,
      selection_strategy: "score_ranked_candidate_pool_quality_optimized",
      attempts,
      requested: desired,
      accepted: { short: shortItems.length, long: longItems.length },
      rejected_count: rejectedItems.length,
      fulfilled: enoughItems(shortItems, longItems, desired),
      retry_history: retryHistory
    },
    provider_pool: {
      size: pool.length,
      source_pool_size: (pool.__pool_meta && pool.__pool_meta.source_pool_size) || pool.length,
      mode: (pool.__pool_meta && pool.__pool_meta.mode) || "parallel",
      strategy: (pool.__pool_meta && pool.__pool_meta.strategy) || "parallel_round_robin_by_category_and_attempt",
      agent_id: (pool.__pool_meta && pool.__pool_meta.agent_id) || "",
      assigned_pool_index: pool.__pool_meta ? pool.__pool_meta.assigned_pool_index : undefined,
      provider_calls: providerCalls,
      providers: pool.map(providerPublicInfo)
    },
    raw_preview: rawPreview
  };
  if (providerErrors.length) response.provider_errors = providerErrors;
  if (control.return_rejected) response.rejected_items = rejectedItems;
  return response;
}

async function handleAdCopy(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body." }, 400);
  }

  let providerPool;
  try {
    providerPool = assignProviderPool(request, body, await resolveRequestProviders(request, env, body.provider || {}, body.providers || []));
  } catch(e) {
    return jsonResponse({ success: false, error: e.message }, 400);
  }
  const type = body.type || "both";
  const categories = asArray(body.categories || body.category, ["Paying without stress"]).slice(0, 20);
  const params = { ...body, type };

  const tasks = categories.map((category, idx) => generateCategoryWithScoreControl(request, providerPool, params, category, idx));

  const settled = await Promise.allSettled(tasks);
  const results = settled.map((item, idx) => item.status === "fulfilled"
    ? item.value
    : { category: categories[idx], error: item.reason?.message || String(item.reason) });
  const okCount = results.filter(r => !r.error).length;
  return jsonResponse({
    success: okCount > 0,
    categories_requested: categories.length,
    categories_succeeded: okCount,
    results
  }, okCount > 0 ? 200 : 502);
}

function uniqueProfiles(profiles) {
  const seen = new Set();
  return profiles.filter(profile => {
    if (!profile || !profile.id || seen.has(profile.id)) return false;
    seen.add(profile.id);
    return true;
  });
}

async function resolveCloudProviders(env, user, provider) {
  const kv = requireKv(env);
  const profiles = await loadProfiles(kv, user.id);
  const wantedIds = asArray(provider.profile_ids || provider.profileIds || provider.profile_id || provider.profileId, []);
  const wantedNames = asArray(provider.profile_names || provider.profileNames || provider.profile_name || provider.profileName || provider.name, []);
  let matched = [];

  if (provider.use_all_profiles || provider.useAllProfiles || provider.all_profiles || provider.allProfiles) {
    matched = profiles;
  } else {
    if (wantedIds.length) matched = matched.concat(wantedIds.map(id => profiles.find(p => p.id === id)).filter(Boolean));
    if (wantedNames.length) {
      matched = matched.concat(wantedNames.map(name => profiles.find(p => String(p.name).toLowerCase() === String(name).toLowerCase())).filter(Boolean));
    }
    matched = uniqueProfiles(matched);
  }

  if (!matched.length) {
    const poolIds = await loadProductProviderPoolIds(kv, user.id);
    if (poolIds.length) matched = poolIds.map(id => profiles.find(p => p.id === id)).filter(Boolean);
  }
  if (!matched.length) {
    const fallback = user.active_profile_id ? profiles.find(p => p.id === user.active_profile_id) : null;
    if (fallback) matched = [fallback];
    else if (profiles.length === 1) matched = [profiles[0]];
  }
  if (!matched.length) throw new Error("No cloud provider profile matched. Pass provider.profile_id/profile_name or provider.profile_ids/profile_names.");
  return Promise.all(matched.map(profileWithApiKey));
}

async function resolveRequestProviders(request, env, provider = {}, providers = []) {
  const explicitProviders = Array.isArray(providers) ? providers.filter(p => p && typeof p === "object") : [];
  if (explicitProviders.length) return explicitProviders;

  const account = await authAccount(request, env);
  const bearer = getBearerToken(request);
  const hasDirectProviderKey = Boolean(provider.api_key || provider.apiKey || request.headers.get("x-provider-api-key") || request.headers.get("x-anthropic-api-key") || getDirectProviderBearerToken(request));
  const wantsCloudProfile = Boolean(
    provider.profile_id || provider.profileId || provider.profile_ids || provider.profileIds ||
    provider.profile_name || provider.profileName || provider.profile_names || provider.profileNames ||
    provider.name || provider.use_all_profiles || provider.useAllProfiles || provider.all_profiles || provider.allProfiles
  );
  if (account && !hasDirectProviderKey) return resolveCloudProviders(env, account.user, provider);
  if (!account && isAccountTokenValue(bearer) && !hasDirectProviderKey) {
    throw new Error("Invalid or expired account API token. Use a real rn_pat_... token created from the web UI or /api/auth/token.");
  }
  return [provider];
}

async function resolveRequestProvider(request, env, provider = {}) {
  const providers = await resolveRequestProviders(request, env, provider, []);
  return providers[0] || provider;
}

function collectScoreInputs(body) {
  const out = [];
  const push = (item, forcedType) => {
    if (typeof item === "string") out.push({ text: item, type: forcedType || body.type });
    else if (item && typeof item === "object") out.push({ ...item, type: item.type || forcedType || body.type });
  };
  asArray(body.short || body.shorts || body.headlines, []).forEach(v => push(v, "short"));
  asArray(body.long || body.longs || body.descriptions, []).forEach(v => push(v, "long"));
  if (Array.isArray(body.copies)) body.copies.forEach(v => push(v));
  if (Array.isArray(body.items)) body.items.forEach(v => push(v));
  if (body.text) push(body.text);
  return out.filter(v => String(v.text || "").trim());
}

async function handleScore(request) {
  let body;
  try { body = await readJson(request); } catch(e) { return jsonResponse({ success: false, error: e.message }, 400); }
  const benefits = asArray(body.benefits, []);
  const targets = body.targets || {};
  const ranges = body.ranges || body.filters || {};
  const items = collectScoreInputs(body).map(input => {
    const annotated = annotateCopy(input.text, input.type, input.benefits || benefits, targets, {
      category: input.category || body.category || "",
      region: input.region || "",
      language: input.language || body.language || ""
    });
    return { ...annotated, passes_ranges: scoreRangePasses(annotated.score, ranges) };
  });
  const averageTotal = items.length ? Math.round((items.reduce((sum, item) => sum + item.score.total, 0) / items.length) * 10) / 10 : 0;
  return jsonResponse({
    success: true,
    count: items.length,
    passed_targets: items.filter(item => item.passes_targets).length,
    passed_ranges: items.filter(item => item.passes_ranges).length,
    average_total: averageTotal,
    targets: defaultTargets(targets),
    items
  });
}

function languageName(code) {
  return ({ en: "English", "zh-TW": "Traditional Chinese", "zh-CN": "Simplified Chinese", de: "German", fr: "French" })[code] || code || "Simplified Chinese";
}

async function handleTranslate(request, env) {
  let body;
  try { body = await readJson(request); } catch(e) { return jsonResponse({ success: false, error: e.message }, 400); }
  const texts = Array.isArray(body.texts) ? body.texts.map(String).filter(Boolean) : body.text ? [String(body.text)] : [];
  if (!texts.length) return jsonResponse({ success: false, error: "text or texts is required." }, 400);
  if (texts.length > 30) return jsonResponse({ success: false, error: "texts accepts at most 30 items." }, 400);
  let providerPool;
  try { providerPool = await resolveRequestProviders(request, env, body.provider || {}, body.providers || []); } catch(e) { return jsonResponse({ success: false, error: e.message }, 400); }
  const pool = assignProviderPool(request, body, Array.isArray(providerPool) && providerPool.length ? providerPool : [{}]);
  const target = languageName(body.target_language || body.targetLanguage || "zh-CN");
  const source = body.source_language || body.sourceLanguage || "auto";
  const tasks = texts.map(async (text, idx) => {
    const provider = pool[idx % pool.length];
    const prompt = `Translate the following ${source} Google ad copy into natural ${target}. Keep it concise, punchy, and suitable for ad copy. Output ONLY the translated text, nothing else.

"${text}"`;
    const raw = await callModel(request, provider, prompt, false);
    return raw.trim().replace(/^[\s"'`]+|[\s"'`]+$/g, "");
  });
  const settled = await Promise.allSettled(tasks);
  const translations = settled.map(item => item.status === "fulfilled" ? item.value : "");
  const providerErrors = settled.map((item, idx) => item.status === "rejected" ? ({ ...providerPublicInfo(pool[idx % pool.length], idx % pool.length), text_index: idx, error: item.reason?.message || String(item.reason) }) : null).filter(Boolean);
  const okCount = translations.filter(Boolean).length;
  return jsonResponse({
    success: okCount > 0,
    count: okCount,
    target_language: body.target_language || body.targetLanguage || "zh-CN",
    translations,
    provider_pool: {
      size: pool.length,
      source_pool_size: (pool.__pool_meta && pool.__pool_meta.source_pool_size) || pool.length,
      mode: (pool.__pool_meta && pool.__pool_meta.mode) || "parallel",
      strategy: (pool.__pool_meta && pool.__pool_meta.strategy) || "parallel_round_robin_by_text",
      agent_id: (pool.__pool_meta && pool.__pool_meta.agent_id) || "",
      assigned_pool_index: pool.__pool_meta ? pool.__pool_meta.assigned_pool_index : undefined,
      provider_calls: texts.length,
      providers: pool.map(providerPublicInfo)
    },
    ...(providerErrors.length ? { provider_errors: providerErrors } : {})
  }, okCount > 0 ? 200 : 502);
}

async function readJson(request) {
  try { return await request.json(); } catch { throw new Error("Invalid JSON body."); }
}

async function handleRegister(request, env) {
  try {
    const kv = requireKv(env);
    const body = await readJson(request);
    const username = normalizeUsername(body.username);
    const password = String(body.password || "");
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) return jsonResponse({ success: false, error: "Username must be 3-40 chars: letters, numbers, dot, underscore, hyphen." }, 400);
    if (password.length < 8) return jsonResponse({ success: false, error: "Password must be at least 8 characters." }, 400);
    if (await loadUserByUsername(kv, username)) return jsonResponse({ success: false, error: "Username already exists." }, 409);
    const ph = await passwordHash(password);
    const user = { id: randomId("usr"), username, salt: ph.salt, password_hash: ph.hash, created_at: nowIso(), active_profile_id: "", active_provider_pool_ids: [] };
    await saveUser(kv, user);
    const token = await issueAccountToken(kv, user.id, "session");
    return jsonResponse({ success: true, token, user: publicUser(user) });
  } catch(e) {
    return jsonResponse({ success: false, error: e.message || String(e) }, 500);
  }
}

async function handleLogin(request, env) {
  try {
    const kv = requireKv(env);
    const body = await readJson(request);
    const username = normalizeUsername(body.username);
    const user = await loadUserByUsername(kv, username);
    if (!user || !(await verifyPassword(String(body.password || ""), user))) {
      return jsonResponse({ success: false, error: "Invalid username or password." }, 401);
    }
    const token = await issueAccountToken(kv, user.id, "session");
    return jsonResponse({ success: true, token, user: publicUser(user) });
  } catch(e) {
    return jsonResponse({ success: false, error: e.message || String(e) }, 500);
  }
}

async function requireAccount(request, env) {
  const account = await authAccount(request, env);
  if (!account) throw new Error("Account token required. Login first or use a personal API token.");
  return account;
}

async function handleMe(request, env) {
  try {
    const account = await requireAccount(request, env);
    return jsonResponse({ success: true, user: publicUser(account.user) });
  } catch(e) {
    return jsonResponse({ success: false, error: e.message }, 401);
  }
}

async function handleListProfiles(request, env) {
  try {
    const account = await requireAccount(request, env);
    const kv = requireKv(env);
    const profiles = await loadProfiles(kv, account.user.id);
    const poolIds = await loadProductProviderPoolIds(kv, account.user.id);
    return jsonResponse({
      success: true,
      profiles: profiles.map(publicProfile),
      active_profile_id: account.user.active_profile_id || "",
      provider_pool: publicProviderPoolFromIds(poolIds, profiles)
    });
  } catch(e) {
    return jsonResponse({ success: false, error: e.message }, 401);
  }
}

async function upsertProfile(request, env) {
  try {
    const account = await requireAccount(request, env);
    const kv = requireKv(env);
    const body = await readJson(request);
    const profiles = await loadProfiles(kv, account.user.id);
    const id = body.id || randomId("prof");
    const existing = profiles.find(p => p.id === id) || {};
    const apiKey = body.api_key || body.apiKey || existing.api_key_plain;
    if (!body.name && !existing.name) return jsonResponse({ success: false, error: "Profile name is required." }, 400);
    if (!apiKey && !existing.api_key_encrypted) return jsonResponse({ success: false, error: "Provider API key is required for a new profile." }, 400);
    const encrypted = apiKey ? await encryptSecret(apiKey) : existing.api_key_encrypted;
    const now = nowIso();
    const profileMode = body.mode || existing.mode || "openai";
    const rawProfileBaseUrl = body.base_url || body.baseUrl || body.url || existing.base_url || (profileMode === "anthropic" ? "https://api.anthropic.com/v1" : "https://api.deepseek.com");
    const profileBaseUrl = profileMode === "anthropic"
      ? String(rawProfileBaseUrl).replace(/\/+$/, "")
      : normalizeOpenAIBaseUrl(rawProfileBaseUrl);
    const profile = {
      id,
      name: String(body.name || existing.name).trim(),
      mode: profileMode,
      base_url: profileBaseUrl,
      model: body.model || existing.model || DEFAULT_MODEL_OPENAI,
      disguise: body.disguise || existing.disguise || "none",
      api_key_encrypted: encrypted,
      key_preview: apiKey ? String(apiKey).slice(0, 6) + "••••" + String(apiKey).slice(-4) : existing.key_preview,
      created_at: existing.created_at || now,
      updated_at: now
    };
    const next = profiles.filter(p => p.id !== id).concat(profile);
    await saveProfiles(kv, account.user.id, next);
    let userChanged = false;
    if (body.set_active !== false) {
      account.user.active_profile_id = id;
      userChanged = true;
    }
    let poolIds = await loadProductProviderPoolIds(kv, account.user.id);
    if (body.add_to_provider_pool || body.addToProviderPool) {
      if (!poolIds.includes(id)) {
        poolIds = await saveProductProviderPoolIds(kv, account.user.id, poolIds.concat(id));
      }
    }
    if (userChanged) await saveUser(kv, account.user);
    return jsonResponse({
      success: true,
      profile: publicProfile(profile),
      active_profile_id: account.user.active_profile_id,
      provider_pool: publicProviderPoolFromIds(poolIds, next)
    });
  } catch(e) {
    return jsonResponse({ success: false, error: e.message }, /token|required|Login/i.test(e.message) ? 401 : 400);
  }
}

async function deleteProfile(request, env) {
  try {
    const account = await requireAccount(request, env);
    const kv = requireKv(env);
    const id = new URL(request.url).pathname.split("/").pop();
    const profiles = await loadProfiles(kv, account.user.id);
    await saveProfiles(kv, account.user.id, profiles.filter(p => p.id !== id));
    let userChanged = false;
    if (account.user.active_profile_id === id) {
      account.user.active_profile_id = "";
      userChanged = true;
    }
    const currentPool = await loadProductProviderPoolIds(kv, account.user.id);
    const nextPool = currentPool.filter(pid => pid !== id);
    if (nextPool.length !== currentPool.length) {
      await saveProductProviderPoolIds(kv, account.user.id, nextPool);
    }
    if (userChanged) await saveUser(kv, account.user);
    return jsonResponse({ success: true });
  } catch(e) {
    return jsonResponse({ success: false, error: e.message }, 401);
  }
}

async function handleGetProviderPool(request, env) {
  try {
    const account = await requireAccount(request, env);
    const kv = requireKv(env);
    const profiles = await loadProfiles(kv, account.user.id);
    const poolIds = await loadProductProviderPoolIds(kv, account.user.id);
    return jsonResponse({ success: true, provider_pool: publicProviderPoolFromIds(poolIds, profiles) });
  } catch(e) {
    return jsonResponse({ success: false, error: e.message }, 401);
  }
}

async function handleGetProviderAssignment(request, env) {
  try {
    const account = await requireAccount(request, env);
    const kv = requireKv(env);
    const profiles = await loadProfiles(kv, account.user.id);
    const poolIds = await loadProductProviderPoolIds(kv, account.user.id);
    let pool = poolIds.map(id => profiles.find(p => p.id === id)).filter(Boolean);
    if (!pool.length) {
      const fallback = account.user.active_profile_id ? profiles.find(p => p.id === account.user.active_profile_id) : null;
      if (fallback) pool = [fallback];
      else if (profiles.length === 1) pool = [profiles[0]];
    }
    if (!pool.length) return jsonResponse({ success: false, error: "No saved provider pool or active profile is available." }, 400);
    const url = new URL(request.url);
    const body = request.method === "POST" ? await readJson(request).catch(() => ({})) : {};
    const agentId = String(url.searchParams.get("agent_id") || url.searchParams.get("agentId") || body.agent_id || body.agentId || request.headers.get("x-agent-id") || "").trim();
    const explicitRaw = url.searchParams.get("provider_index") || url.searchParams.get("providerIndex") || body.provider_index || body.providerIndex || request.headers.get("x-provider-index");
    const explicitIndex = Number.parseInt(explicitRaw, 10);
    const assignedIndex = ((Number.isFinite(explicitIndex) ? explicitIndex : stableHash(agentId || "default-agent")) % pool.length + pool.length) % pool.length;
    return jsonResponse({
      success: true,
      agent_id: agentId,
      assigned_pool_index: assignedIndex,
      source_pool_size: pool.length,
      profile: publicProfile(pool[assignedIndex])
    });
  } catch(e) {
    return jsonResponse({ success: false, error: e.message }, /token|required|Login/i.test(e.message) ? 401 : 400);
  }
}

async function handleSetProviderPool(request, env) {
  try {
    const account = await requireAccount(request, env);
    const kv = requireKv(env);
    const body = await readJson(request);
    const profiles = await loadProfiles(kv, account.user.id);
    const ids = asArray(body.profile_ids || body.profileIds || body.ids, []);
    const names = asArray(body.profile_names || body.profileNames || body.names, []);
    let selected = [];
    if (body.use_all_profiles || body.useAllProfiles) selected = profiles;
    if (ids.length) selected = selected.concat(ids.map(id => profiles.find(p => p.id === id)).filter(Boolean));
    if (names.length) selected = selected.concat(names.map(name => profiles.find(p => String(p.name).toLowerCase() === String(name).toLowerCase())).filter(Boolean));
    selected = uniqueProfiles(selected);
    if ((ids.length || names.length || body.use_all_profiles || body.useAllProfiles) && !selected.length) {
      return jsonResponse({ success: false, error: "No matching profiles found for provider pool." }, 400);
    }
    const selectedIds = await saveProductProviderPoolIds(kv, account.user.id, selected.map(p => p.id));
    return jsonResponse({ success: true, provider_pool: publicProviderPoolFromIds(selectedIds, profiles), user: publicUser(account.user) });
  } catch(e) {
    return jsonResponse({ success: false, error: e.message }, /token|required|Login/i.test(e.message) ? 401 : 400);
  }
}

async function createPersonalToken(request, env) {
  try {
    const account = await requireAccount(request, env);
    const body = await readJson(request).catch(() => ({}));
    const token = await issueAccountToken(requireKv(env), account.user.id, "pat", body.label || "api");
    return jsonResponse({ success: true, token, note: "Store this token now. It can call /api/ad-copy with cloud profiles." });
  } catch(e) {
    return jsonResponse({ success: false, error: e.message }, 401);
  }
}

function openApiSpec(request) {
  const origin = new URL(request.url).origin;
  return {
    openapi: "3.1.0",
    info: { title: "__PRODUCT_NAME__ Ads Generator API", version: "1.0.0" },
    servers: [{ url: origin }],
    paths: {
      "/api/ad-copy": {
        post: {
          operationId: "generateMiClipAdCopy",
          summary: "Generate __PRODUCT_NAME__ Google Ads copy. AI callers should dynamically set qty to the requested output volume, pass agent_id for sticky model-pool assignment, and tune score_control targets/quality_goal when higher-scoring output is needed.",
          description: "For external AI agents: qty controls requested output count per type and accepts 1-50. If type is both, qty means qty short headlines plus qty long descriptions per category. When using a saved provider pool, pass a stable agent_id so different agents can be assigned different saved models in agent_sticky mode; omit agent_id or use provider_pool_mode=parallel when one request should use the pool concurrently. score_control.targets are the minimum accepted scores. Omit quality_goal for throughput; set quality_goal only when the user explicitly asks for higher quality or stricter screening. If the user asks to lower targets to 6, lower both targets and quality_goal to around 6-7 instead of keeping quality_goal at 9. Always keep __PRODUCT_NAME__ compliance limits: Mexico only, Mexican Spanish, no unsupported financial claims.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    provider: { type: "object", properties: { profile_name: { type: "string" }, profile_id: { type: "string" }, profile_names: { type: "array", items: { type: "string" }, description: "Cloud profile names to use as a provider pool." }, profile_ids: { type: "array", items: { type: "string" }, description: "Cloud profile IDs to use as a provider pool." }, use_all_profiles: { type: "boolean", description: "Use all cloud-saved profiles in the account as a provider pool." }, mode: { type: "string", enum: ["openai", "anthropic"], default: "openai" }, base_url: { type: "string", default: "https://api.deepseek.com" }, model: { type: "string", default: "deepseek-chat" }, api_key: { type: "string" } } },
                    providers: { type: "array", items: { type: "object" }, description: "Direct provider pool. Each item can include mode, base_url, model, and api_key." },
                    agent_id: { type: "string", description: "Stable caller/agent identifier. If present, default provider_pool_mode becomes agent_sticky, assigning this agent to one deterministic saved model from the current product provider pool. Use different agent_id values for different AI agents to distribute work across saved models." },
                    provider_index: { type: "integer", description: "Optional explicit pool index for this request." },
                    provider_pool_mode: { type: "string", enum: ["parallel", "agent_sticky"], default: "parallel", description: "parallel uses the saved model pool concurrently/round-robin; agent_sticky maps a stable agent_id to one saved model. If agent_id is supplied and this field is omitted, the API defaults to agent_sticky." },
                    categories: { type: "array", items: { type: "string" }, default: ["Paying without stress"] },
                    regions: { type: "array", items: { type: "string", enum: ["MX"] }, default: ["MX"], description: "__PRODUCT_NAME__ only targets Mexico; other region inputs are ignored." },
                    language: { type: "string", enum: ["es-MX"], default: "es-MX", description: "Mexican Spanish only." },
                    device: { type: "string", enum: ["android", "ios", "both"], default: "android" },
                    benefits: { type: "array", items: { type: "string" }, default: ["Pay water, electricity and gas bills from the app"] },
                    type: { type: "string", enum: ["both", "short", "long"], default: "both" },
                    tone: { type: "string", default: "clear and practical" },
                    qty: { type: "integer", minimum: 1, maximum: 50, default: 5, description: "Requested output count per type per category. AI callers should set this dynamically from the user's requested quantity instead of leaving the default. For type=both, qty returns up to qty short headlines and qty long descriptions." },
                    targets: { type: "object", description: "Legacy shortcut. If present, score control is enabled.", properties: { hook: { type: "integer" }, rel: { type: "integer" }, cta: { type: "integer" }, space: { type: "integer" }, total: { type: "integer" } } },
                    score_control: {
                      type: "object",
                      properties: {
                        enabled: { type: "boolean", default: true },
                        targets: { type: "object", description: "Minimum score floor for accepted copy. AI callers may raise these when the user asks for stricter, higher-quality output; overly high targets can increase retries or reduce returned volume.", properties: { hook: { type: "integer" }, rel: { type: "integer" }, cta: { type: "integer" }, space: { type: "integer" }, total: { type: "integer" } } },
                        quality_goal: { type: "object", description: "Optional aspirational quality target used for ranking and adaptive improvement attempts. Omit this for faster high-volume generation. If targets are lowered to 6, set quality_goal around 6-7, not 9. High quality_goal values can cause extra attempts and low apparent pass rates.", properties: { hook: { type: "integer", minimum: 0, maximum: 10 }, rel: { type: "integer", minimum: 0, maximum: 10 }, cta: { type: "integer", minimum: 0, maximum: 10 }, space: { type: "integer", minimum: 0, maximum: 10 }, total: { type: "integer", minimum: 0, maximum: 10, default: 7 } } },
                        max_attempts: { type: "integer", minimum: 1, maximum: 5, default: 3 },
                        candidate_multiplier: { type: "integer", minimum: 1, maximum: 4, default: 3, description: "Generate extra internal candidates per attempt, then select by the existing scoring rules." },
                        return_rejected: { type: "boolean", default: false }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: { "200": { description: "Generated copy grouped by category with short_items, long_items, and score metadata" } }
        }
      },
      "/api/provider-pool": {
        get: {
          operationId: "getMiClipProviderPool",
          summary: "Get the saved concurrent cloud-profile pool for the authenticated account",
          responses: { "200": { description: "Saved provider pool" } }
        },
        post: {
          operationId: "setMiClipProviderPool",
          summary: "Save selected cloud profiles as the default concurrent provider pool",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { profile_ids: { type: "array", items: { type: "string" } }, profile_names: { type: "array", items: { type: "string" } }, use_all_profiles: { type: "boolean" } } } } } },
          responses: { "200": { description: "Saved provider pool" } }
        }
      },
      "/api/provider-pool/assignment": {
        get: {
          operationId: "getMiClipProviderAssignment",
          summary: "Show the saved profile assigned to an agent_id without exposing the provider key",
          parameters: [{ name: "agent_id", in: "query", required: false, schema: { type: "string" } }],
          responses: { "200": { description: "Assigned profile for the agent" } }
        },
        post: {
          operationId: "postMiClipProviderAssignment",
          summary: "Show the saved profile assigned to an agent_id without exposing the provider key",
          requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { agent_id: { type: "string" }, provider_index: { type: "integer" } } } } } },
          responses: { "200": { description: "Assigned profile for the agent" } }
        }
      },
      "/api/models": {
        post: {
          operationId: "listMiClipProviderModels",
          summary: "List provider models through the Worker to avoid browser CORS limits",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { base_url: { type: "string" }, api_key: { type: "string" }, mode: { type: "string", enum: ["openai", "anthropic"], default: "openai" } } } } } },
          responses: { "200": { description: "Provider model IDs" } }
        }
      },
      "/api/score": {
        post: {
          operationId: "scoreMiClipAdCopy",
          summary: "Score existing ad copy with the same scoring logic as the web UI",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { copies: { type: "array", items: { type: "object", properties: { text: { type: "string" }, type: { type: "string", enum: ["short", "long"] } } } }, benefits: { type: "array", items: { type: "string" } }, targets: { type: "object" }, ranges: { type: "object" } } } } } },
          responses: { "200": { description: "Scored copy items" } }
        }
      },
      "/api/translate": {
        post: {
          operationId: "translateMiClipAdCopy",
          summary: "Translate __PRODUCT_NAME__ ad copy into Simplified Chinese by default using a direct provider key or cloud-saved profile",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { provider: { type: "object" }, text: { type: "string" }, texts: { type: "array", items: { type: "string" } }, target_language: { type: "string", default: "zh-CN", description: "Default translation target is Simplified Chinese." }, source_language: { type: "string", default: "es-MX" } } } } } },
          responses: { "200": { description: "Translations" } }
        }
      }
    }
  };
}

function apiSchema(request) {
  return {
    endpoints: {
      "POST /api/ad-copy": "Generate __PRODUCT_NAME__ ad copy for one or more neutral payment scenarios. AI callers should set qty from the user's requested volume, pass agent_id for sticky model-pool assignment, and tune score_control for stricter quality targets.",
      "POST /api/models": "List provider models through this Worker so browser CORS does not block model sniffing.",
      "POST /api/prompt": "Run an arbitrary prompt through an authenticated cloud-saved provider profile without exposing API keys to the browser.",
      "POST /api/score": "Score existing copy with the same Hook/Relevance/CTA/Space/Total logic as the web UI.",
      "POST /api/translate": "Translate ad copy using a direct provider key or a cloud-saved profile.",
      "GET /api/openapi.json": "Machine-readable OpenAPI schema.",
      "POST /api/auth/register": "Create an account for cloud-stored model profiles.",
      "POST /api/auth/login": "Login and receive a session token.",
      "POST /api/profiles": "Save or update an encrypted model profile.",
      "GET /api/profiles": "List saved model profiles without exposing provider API keys.",
      "POST /api/auth/token": "Create a personal API token for external AI tools.",
      "GET /api/provider-pool": "Show the cloud-saved provider pool used by API calls by default.",
      "POST /api/provider-pool": "Save selected cloud profiles as the default concurrent provider pool.",
      "GET /api/provider-pool/assignment": "Show which saved profile an agent_id will use in agent_sticky mode."
    },
    auth: "Direct mode: pass provider key with x-provider-api-key or provider.api_key. Cloud-profile mode: pass account token with Authorization: Bearer rn_pat_.... If provider.profile_id/profile_name is omitted, the API uses the saved __PRODUCT_NAME__ provider pool, then active/single profile fallback.",
    ai_usage_guidance: {
      dynamic_quantity: {
        field: "qty",
        rule: "Do not leave qty at the default when the user asked for a specific volume. Set qty to the requested number, clamped to 1-50 per type per category.",
        note: "If type is both, qty means up to qty short headlines and qty long descriptions for each category."
      },
      multi_agent_model_pool: {
        fields: ["agent_id", "provider_pool_mode", "provider_index"],
        rule: "When several AI agents call this tool, each agent should send a stable unique agent_id such as codex-__PRODUCT_SLUG__-copywriter-1. With agent_id and no explicit provider_pool_mode, the API uses agent_sticky and assigns that agent to one deterministic saved model from the __PRODUCT_NAME__ provider pool.",
        alternatives: "Use provider_pool_mode=parallel when a single request should use the pool concurrently. Use GET /api/provider-pool/assignment?agent_id=... to inspect the model assignment without exposing provider keys."
      },
      score_target_control: {
        fields: ["score_control.targets", "score_control.quality_goal", "score_control.max_attempts", "score_control.candidate_multiplier"],
        rule: "AI callers may raise score_control.targets and quality_goal when the user asks for higher-scoring, more polished, or stricter copy. For high-volume generation, omit quality_goal or keep it only slightly above targets. If the user says lower targets to 6, set all relevant targets to 6 and quality_goal.total to 6-7, not 9.",
        safe_defaults: { targets: { hook: 6, rel: 6, cta: 6, space: 6, total: 6 }, quality_goal: { total: 7 }, max_attempts: 2, candidate_multiplier: 2 },
        caution: "Higher targets and quality_goal can increase latency/cost and may reduce returned volume. quality_goal is not the pass/fail floor. Never keep quality_goal at 9 after the user asked to lower scoring requirements. Never use scoring goals to override product facts, Mexico-only targeting, es-MX language, byte limits, or financial compliance restrictions."
      },
      compliance_limits: [
        "Mexico only; use regions ['MX'].",
        "Mexican Spanish only; use language 'es-MX'.",
        "Android is the default device unless the user explicitly asks otherwise.",
        "Do not invent licenses, bank partnerships, certifications, fee advantages, arrival speed, guaranteed approval, guaranteed returns, risk-free claims, or unsupported financial promises."
      ]
    },
    example: {
      agent_id: "external-ai-agent-1",
      provider_pool_mode: "agent_sticky",
      categories: ["Not running out too soon", "Paying without stress", "Feeling in control"],
      regions: ["MX"],
      language: "es-MX",
      device: "android",
      benefits: ["Pay water, electricity and gas bills from the app", "Check your balance before spending and see your available money"],
      type: "both",
      tone: "clear and practical",
      qty: 12,
      score_control: { enabled: true, targets: { hook: 6, rel: 6, cta: 6, space: 6, total: 6 }, quality_goal: { total: 7 }, max_attempts: 2, candidate_multiplier: 2 }
    },
    openapi: new URL("/api/openapi.json", request.url).toString()
  };
}

async function handlePrompt(request, env) {
  try {
    const body = await readJson(request);
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return jsonResponse({ success: false, error: "Prompt is required." }, 400);
    const provider = body.provider || {};
    const hasDirectProviderKey = Boolean(provider.api_key || provider.apiKey || request.headers.get("x-provider-api-key") || request.headers.get("x-anthropic-api-key") || getDirectProviderBearerToken(request));
    let providers;
    if (hasDirectProviderKey || (Array.isArray(body.providers) && body.providers.length)) {
      providers = await resolveRequestProviders(request, env, provider, body.providers || []);
    } else {
      const account = await requireAccount(request, env);
      providers = await resolveCloudProviders(env, account.user, provider);
    }
    const pool = assignProviderPool(request, body, providers);
    const selected = pool[0] || providers[0];
    if (!selected) return jsonResponse({ success: false, error: "No provider profile matched." }, 400);
    const text = await callModel(request, selected, prompt, Boolean(body.json || body.wants_json || body.wantsJson));
    return jsonResponse({ success: true, text, provider: providerPublicInfo(selected, 0) });
  } catch(e) {
    return jsonResponse({ success: false, error: e.message || String(e) }, /token|required|Login/i.test(e.message || "") ? 401 : 400);
  }
}
async function handleGenerate(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return jsonResponse({ error: "Prompt is required." }, 400);
  const raw = await callModel(request, { mode: "anthropic" }, prompt, false);
  return jsonResponse({ text: raw });
}

async function handleProviderModels(request) {
  try {
    const body = await readJson(request);
    const mode = body.mode || "openai";
    const apiKey = body.api_key || body.apiKey || body.key || request.headers.get("x-provider-api-key") || getDirectProviderBearerToken(request);
    if (mode === "anthropic") {
      return jsonResponse({
        success: true,
        base_url: String(body.base_url || body.baseUrl || body.url || "https://api.anthropic.com/v1").replace(/\/+$/, ""),
        models: [
          "claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5",
          "claude-opus-4-6", "claude-sonnet-4-6",
          "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022",
          "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"
        ]
      });
    }
    const baseUrl = normalizeOpenAIBaseUrl(body.base_url || body.baseUrl || body.url);
    if (!/^https:\/\//i.test(baseUrl)) return jsonResponse({ success: false, error: "base_url must start with https://." }, 400);
    if (!apiKey) return jsonResponse({ success: false, error: "Provider API key is required." }, 400);
    const response = await fetch(baseUrl + "/models", {
      headers: { "authorization": "Bearer " + apiKey }
    });
    const contentType = response.headers.get("content-type") || "";
    if (response.ok && !contentType.includes("json")) {
      return jsonResponse({ success: false, error: "Provider /models returned HTML or non-JSON content. Use an OpenAI-compatible API base URL." }, 502);
    }
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      return jsonResponse({ success: false, error: data?.error?.message || data?.message || `Provider models request failed with ${response.status}` }, response.status === 401 || response.status === 403 ? 401 : 502);
    }
    const raw = data.data || data.models || [];
    const models = raw.map(m => typeof m === "string" ? m : (m.id || m.name || "")).filter(Boolean).sort();
    return jsonResponse({ success: true, base_url: baseUrl, models });
  } catch(e) {
    return jsonResponse({ success: false, error: e.message || String(e) }, 400);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    const url = new URL(request.url);
    if (url.pathname === "/api/schema") return jsonResponse(apiSchema(request));
    if (url.pathname === "/api/openapi.json") return jsonResponse(openApiSpec(request));
    if (url.pathname === "/api/auth/register" && request.method === "POST") return handleRegister(request, env);
    if (url.pathname === "/api/auth/login" && request.method === "POST") return handleLogin(request, env);
    if (url.pathname === "/api/auth/me" && request.method === "GET") return handleMe(request, env);
    if (url.pathname === "/api/auth/token" && request.method === "POST") return createPersonalToken(request, env);
    if (url.pathname === "/api/models" && request.method === "POST") return handleProviderModels(request);
    if (url.pathname === "/api/prompt" && request.method === "POST") return handlePrompt(request, env);
    if (url.pathname === "/api/profiles" && request.method === "GET") return handleListProfiles(request, env);
    if (url.pathname === "/api/profiles" && request.method === "POST") return upsertProfile(request, env);
    if (url.pathname === "/api/provider-pool" && request.method === "GET") return handleGetProviderPool(request, env);
    if (url.pathname === "/api/provider-pool" && request.method === "POST") return handleSetProviderPool(request, env);
    if (url.pathname === "/api/provider-pool/assignment" && (request.method === "GET" || request.method === "POST")) return handleGetProviderAssignment(request, env);
    if (url.pathname.startsWith("/api/profiles/") && request.method === "DELETE") return deleteProfile(request, env);
    if (url.pathname === "/api/ad-copy" || url.pathname === "/api/copy") {
      if (request.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed." }, 405);
      return handleAdCopy(request, env);
    }
    if (url.pathname === "/api/score") {
      if (request.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed." }, 405);
      return handleScore(request);
    }
    if (url.pathname === "/api/translate") {
      if (request.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed." }, 405);
      return handleTranslate(request, env);
    }
    if (url.pathname === "/api/generate") {
      if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
      return handleGenerate(request);
    }
    return htmlResponse();
  }
};









