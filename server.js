// ─────────────────────────────────────────────────────────────────────────────
//  SIGNAL AGENT — Agent #1 of the Gallegos agent operating system.
//
//  Finds meaningful cultural/category/audience signals for a selected client,
//  scores each on 6 dimensions, and produces a Weekly Signal Report.
//  Reads all client context from a swappable BRAND BRAIN (brand-brains/*.json).
//
//  Jobs:
//    1. Serves the front-end (public/).
//    2. Pulls LIVE social posts from EnsembleData (TikTok/IG) + Scrape Creators (X).
//    3. Hands posts + the client's Brand Brain to Claude, which scores & structures signals.
//
//  Keys live ONLY here as environment variables (see .env.example / README).
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ── Brand Brain loading ────────────────────────────────────────────────────────
//  Each client is one JSON file in brand-brains/. Files starting with "_" (like
//  the template) are ignored. The Signal Agent reads the selected client's brain
//  and injects it into every analysis so outputs are grounded in real context.

const BRAINS_DIR = path.join(__dirname, "brand-brains");

function listBrains() {
  try {
    return fs.readdirSync(BRAINS_DIR)
      .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
      .map((f) => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(BRAINS_DIR, f), "utf8"));
          return { id: f.replace(/\.json$/, ""), client: data.client || f, version: data.version || "" };
        } catch { return null; }
      })
      .filter(Boolean);
  } catch { return []; }
}

function loadBrain(id) {
  const safe = String(id || "").replace(/[^a-z0-9_-]/gi, "");
  const fp = path.join(BRAINS_DIR, safe + ".json");
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, "utf8")); } catch { return null; }
}

// ── config / secrets ─────────────────────────────────────────────────────────

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SC_KEY        = process.env.SCRAPECREATORS_API_KEY;   // used for X / Twitter search
const ED_TOKEN      = process.env.ENSEMBLEDATA_TOKEN;       // used for TikTok + Instagram
const PORT          = process.env.PORT || 3000;

const SC_ROOT = "https://api.scrapecreators.com";
const ED_ROOT = "https://ensembledata.com/apis";

// HYBRID DATA SOURCES:
//   TikTok    → EnsembleData (you have units; it's cheap here, ~4 units/scan)
//   Instagram → EnsembleData (works, but ~60 units/scan — the expensive one)
//   X/Twitter → Scrape Creators (EnsembleData has no X keyword search)
// Toggling Instagram off in the UI is the main lever for conserving EnsembleData units.

// How many results to keep per search call.
const PER_QUERY_LIMIT = parseInt(process.env.PER_QUERY_LIMIT || "25", 10);

// EnsembleData TikTok hashtag depth. Higher = more posts but more units.
const ED_TT_MAXCURSOR = parseInt(process.env.ED_TT_MAX_CURSOR || "10", 10);
// How many days back EnsembleData should look for hashtag posts.
const ED_LOOKBACK_DAYS = parseInt(process.env.ED_LOOKBACK_DAYS || "7", 10);

// ─────────────────────────────────────────────────────────────────────────────
//  SEARCH CONFIG — broad culture-watching terms. The tool scans what's trending
//  and Claude filters for brand-relevant opportunities. Users can add their own
//  focus per scan via the search box in the UI.
//  keywords  → free-text search (TikTok keyword search)
//  hashtags  → hashtag lookups (TikTok hashtag + Instagram hashtag)
// ─────────────────────────────────────────────────────────────────────────────
const SEARCH = {
  keywords: ["viral trend", "trending now", "tiktok made me try"],
  hashtags: ["viral", "trending", "fyp", "foodtok", "throwback"],
};

// X/Twitter has no public keyword search (it's behind X's login, which compliant
// scrapers don't touch). So for X we pull recent popular tweets from a curated set
// of culture/trend accounts that surface brand-relevant moments, then let Claude
// pick what's rising. Edit this list to tune X coverage (use handles without the @).
const X_ACCOUNTS = ["PopBase", "PopCrave", "Complex"];

// ── small helpers ──────────────────────────────────────────────────────────────

const num = (v) => {
  const n = typeof v === "string" ? parseFloat(v.replace(/[^0-9.]/g, "")) : v;
  return typeof n === "number" && isFinite(n) ? n : 0;
};

// Turn a free-text term into a hashtag-safe token, e.g. "ticket prices" → "ticketprices".
const toHashtag = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

// Per-call timeout (ms). A single slow upstream call can't stall the whole scan.
const CALL_TIMEOUT_MS = parseInt(process.env.CALL_TIMEOUT_MS || "25000", 10);

async function fetchWithTimeout(url, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Generic GET against EnsembleData. Auth is the `token` query parameter.
async function edGet(endpoint, params) {
  const url = new URL(ED_ROOT + endpoint);
  Object.entries({ ...(params || {}), token: ED_TOKEN }).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  const res = await fetchWithTimeout(url, { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`EnsembleData ${endpoint} → HTTP ${res.status} ${body.slice(0, 100)}`);
  }
  return res.json();
}

// Generic GET against Scrape Creators. Auth is the x-api-key header.
async function scGet(endpoint, params) {
  const url = new URL(SC_ROOT + endpoint);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: { "x-api-key": SC_KEY, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ScrapeCreators ${endpoint} → HTTP ${res.status} ${body.slice(0, 120)}`);
  }
  return res.json();
}

// Scrape Creators wraps results in slightly different keys per endpoint. Find the
// array of items wherever it lives so we're resilient to shape differences.
function pickArray(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  // common containers, in order of likelihood
  const candidates = [
    obj.search_item_list, obj.item_list, obj.items, obj.aweme_list,
    obj.videos, obj.posts, obj.data, obj.results, obj.media,
    obj.tweets, obj.statuses,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;
  // nested: data.items, data.posts, etc.
  if (obj.data && typeof obj.data === "object") {
    const nested = pickArray(obj.data);
    if (nested.length) return nested;
  }
  return [];
}

// Some fields are sometimes a plain string, sometimes an object like {text:"..."}.
// This coerces either form to a string.
const asText = (v) => (typeof v === "string" ? v : v && typeof v === "object" ? v.text || "" : "");

// Scraped social text sometimes contains a half-emoji (a "lone surrogate") where
// the other half was truncated. That's invalid in JSON and crashes the request to
// Claude. Strip any unpaired surrogate code units so the digest is always safe.
function stripBrokenChars(s) {
  if (!s) return "";
  // remove a high surrogate not followed by a low surrogate, and a low surrogate
  // not preceded by a high surrogate
  return String(s)
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

// Pull a text/caption from many possible field shapes, always sanitized.
function pickText(p) {
  const raw =
    asText(p.desc) || asText(p.description) || asText(p.text) ||
    asText(p.caption) || asText(p.title) || asText(p.full_text) ||
    asText(p.content) || asText(p.aweme_info?.desc) || asText(p.video?.desc) ||
    asText(p.node?.caption?.text) || asText(p.caption?.text) || "";
  return stripBrokenChars(raw);
}

// Normalizers — each returns { platform, text, likes, views, url, author }.

function normTikTok(p) {
  const stats = p.statistics || p.stats || p.statisticsV2 || p;
  const id = p.aweme_id || p.id || p.video_id || p.aweme_info?.aweme_id;
  const author = p.author || p.author_info || {};
  return {
    platform: "TikTok",
    text: pickText(p),
    likes: num(stats.digg_count ?? stats.like_count ?? p.like_count ?? p.likes),
    views: num(stats.play_count ?? p.play_count ?? p.views ?? p.view_count),
    url: id ? `https://www.tiktok.com/@/video/${id}` : (p.url || p.share_url || ""),
    author: author.unique_id || author.nickname || author.uniqueId || p.username || "",
  };
}

function normInstagram(p) {
  const node = p.node || p;
  const text = pickText(node) ||
    node.edge_media_to_caption?.edges?.[0]?.node?.text || "";
  const code = node.code || node.shortcode || node.pk;
  return {
    platform: "Instagram",
    text,
    likes: num(node.like_count ?? node.likes ?? node.edge_liked_by?.count),
    views: num(node.view_count ?? node.video_view_count ?? node.play_count),
    url: code ? `https://www.instagram.com/p/${code}/` : (node.url || ""),
    author: node.user?.username || node.owner?.username || node.username || "",
  };
}

function normTwitter(p) {
  const u = p.user || p.author || {};
  return {
    platform: "X",
    text: pickText(p),
    likes: num(p.favorite_count ?? p.like_count ?? p.likes ?? p.favoriteCount),
    views: num(p.views_count ?? p.view_count ?? p.views ?? p.viewCount),
    url: p.url || (p.id_str ? `https://x.com/i/status/${p.id_str}` : (p.id ? `https://x.com/i/status/${p.id}` : "")),
    author: u.screen_name || u.username || p.screen_name || p.username || "",
  };
}

// ── platform fetchers ──────────────────────────────────────────────────────────
//  Each is wrapped in try/catch by the caller, so one platform failing never kills
//  the whole scan. HYBRID: TikTok + Instagram use EnsembleData; X uses Scrape Creators.
//  All calls within a fetcher run CONCURRENTLY (Promise.all) so total time ≈ one
//  call, not the sum — this is what keeps the scan under the request timeout.

async function fetchTikTok(keywords, hashtags) {
  const jobs = [];
  // EnsembleData TikTok keyword search (free-text)
  for (const kw of keywords) {
    jobs.push(
      edGet("/tt/keyword/search", { name: kw, period: ED_LOOKBACK_DAYS, country: "us", cursor: 0 })
        .then((r) => pickArray(r).slice(0, PER_QUERY_LIMIT).map(normTikTok))
        .catch((e) => (console.warn("TikTok keyword failed:", kw, "→", e.message), []))
    );
  }
  // EnsembleData TikTok hashtag recent-posts
  for (const tag of hashtags) {
    jobs.push(
      edGet("/tt/hashtag/recent-posts", { name: tag, days: ED_LOOKBACK_DAYS, max_cursor: ED_TT_MAXCURSOR, remap_output: true })
        .then((r) => pickArray(r).slice(0, PER_QUERY_LIMIT).map(normTikTok))
        .catch((e) => (console.warn("TikTok hashtag failed:", tag, "→", e.message), []))
    );
  }
  return (await Promise.all(jobs)).flat();
}

async function fetchInstagram(hashtags) {
  // EnsembleData Instagram hashtag posts. NOTE: the unit-expensive call (~60
  // units/scan). Toggle Instagram off in the UI to conserve EnsembleData units.
  const jobs = hashtags.map((tag) =>
    edGet("/instagram/hashtag/posts", { name: tag })
      .then((r) => pickArray(r).slice(0, PER_QUERY_LIMIT).map(normInstagram))
      .catch((e) => (console.warn("Instagram hashtag failed:", tag, "→", e.message), []))
  );
  return (await Promise.all(jobs)).flat();
}

async function fetchTwitter() {
  // Pull popular tweets from each curated official account via Scrape Creators.
  const jobs = X_ACCOUNTS.map((handle) =>
    scGet("/v1/twitter/user-tweets", { handle })
      .then((r) => pickArray(r).slice(0, PER_QUERY_LIMIT).map(normTwitter))
      .catch((e) => (console.warn("X/Twitter account failed:", handle, "→", e.message), []))
  );
  return (await Promise.all(jobs)).flat();
}

// ── Claude analysis ────────────────────────────────────────────────────────────

const CATEGORY_IDS = ["VIRAL_FORMATS", "FOOD_DRINK", "POP_CULTURE", "HEALTH_WELLNESS", "NOSTALGIA"];

async function callClaude({ system, messages, maxTokens = 4096 }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic HTTP ${res.status}`);
  }
  return res.json();
}

// Remove unpaired surrogate halves (e.g. an emoji cut in half by truncation) and
// other characters that make a JSON request body invalid. Truncate FIRST, then clean,
// so a slice through an emoji can't leave a dangling half-character in the payload.
function cleanText(s, maxLen) {
  let t = String(s || "").replace(/\s+/g, " ");
  if (maxLen) t = t.slice(0, maxLen);
  // strip any lone high or low surrogate that isn't part of a valid pair
  t = t.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")  // high surrogate not followed by low
       .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, ""); // low surrogate not preceded by high
  return t;
}

function buildDigest(posts) {
  const ranked = posts
    .filter((p) => p.text && p.text.trim().length > 0)
    .sort((a, b) => b.likes + b.views * 0.01 - (a.likes + a.views * 0.01))
    .slice(0, 120);
  return ranked
    .map(
      (p, i) =>
        `${i + 1}. [${p.platform}] ${cleanText(p.text, 240)}` +
        ` (likes:${p.likes}${p.views ? `, views:${p.views}` : ""})`
    )
    .join("\n");
}

// Compress a Brand Brain into a compact context block for the prompt.
function brainContext(brain) {
  const b = brain || {};
  const j = (x) => Array.isArray(x) ? x.join("; ") : (x || "");
  return [
    `CLIENT: ${b.client || "Unknown"}`,
    `BRAND ROLE: ${b.brand_core?.brand_role || ""}`,
    `POSITIONING: ${b.brand_core?.positioning || ""}`,
    `TONE: ${b.brand_core?.tone || ""}`,
    `AUDIENCE SEGMENTS: ${j(b.audience?.segments)}`,
    `AUDIENCE NEEDS/MOTIVATIONS: ${j(b.audience?.needs)} / ${j(b.audience?.motivations)}`,
    `AUDIENCE CULTURE: ${b.audience?.culture || ""}`,
    `CATEGORY: ${b.category?.space || ""} | COMPETITORS: ${j(b.category?.competitors)}`,
    `CATEGORY CONTEXT: ${b.category?.category_context || ""}`,
    `CHANNEL PRIORITIES: ${j(b.channels?.priorities)}`,
    `MESSAGE PILLARS: ${j(b.messaging?.pillars)}`,
    `BANNED LANGUAGE: ${j(b.messaging?.banned_language)}`,
    `CLAIMS RULES: ${b.messaging?.claims_rules || ""}`,
    `DO-NOT: ${j(b.governance?.do_not)}`,
    `SENSITIVE TOPICS: ${j(b.governance?.sensitive_topics)}`,
    `PERFORMANCE MEMORY (winning): ${j(b.performance_memory?.winning_hooks)}`,
    `PERFORMANCE MEMORY (avoid): ${j(b.performance_memory?.avoid)}`,
  ].filter((l) => l.split(": ")[1]).join("\n");
}

// Signal Agent analysis: score each signal on 6 dimensions, apply the client's
// do-not rules, and attach the shared-agent-requirement fields (confidence,
// review flag, sources).
async function analyzeSignals(posts, brain) {
  const digest = buildDigest(posts);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const ctx = brainContext(brain);
  const client = brain?.client || "the client";

  const system =
    `You are the SIGNAL AGENT, agent #1 in an agency operating system. Your job: find meaningful, ` +
    `rising cultural/category/audience signals for a specific client and score each so a Cultural ` +
    `Intelligence Strategist can decide what matters. You are given (a) the client's BRAND BRAIN and ` +
    `(b) a digest of real, live social posts (TikTok, Instagram, X) collected today, ${today}.\n\n` +
    `RULES (non-negotiable):\n` +
    `- Base every signal ONLY on what appears in the posts. Never invent events, stats, quotes, ` +
    `product features, pricing, or cultural assumptions.\n` +
    `- Respect the client's DO-NOT list, banned language, and claims rules.\n` +
    `- Label confidence honestly. If the data is thin for a signal, say so.\n` +
    `- Flag anything needing strategy, creative, legal, or cultural review.\n\n` +
    `Score each signal 1-5 (integers) on these SIX dimensions:\n` +
    `audience_relevance, brand_fit, cultural_momentum, commercial_opportunity, content_potential, risk_level ` +
    `(risk_level: 5 = highest risk).\n\n` +
    `Respond with ONLY a valid JSON object (no markdown fences, no prose) shaped exactly:\n` +
    `{"signals":[{ "title": (<=12 words), "what_changed": (1-2 sentences on the signal), ` +
    `"why_it_matters": (1-2 sentences), "recommended_action": (one concrete next step), ` +
    `"scores": {"audience_relevance":n,"brand_fit":n,"cultural_momentum":n,"commercial_opportunity":n,"content_potential":n,"risk_level":n}, ` +
    `"confidence": ("high"|"medium"|"low"), "review_flag": (what human review this needs, or ""), ` +
    `"platforms": [which of TikTok/Instagram/X], "evidence": (short paraphrase of a representative post) }], ` +
    `"opportunity_summary": (3-4 sentences: what changed, why it matters, what to do), ` +
    `"content_implications": [3-5 short suggested content angles/formats — angles only, not full scripts], ` +
    `"risk_flags": [any cultural-sensitivity, misinformation, overused-trend, or low-brand-fit warnings] }`;

  const user =
    `BRAND BRAIN for ${client}:\n${ctx}\n\n` +
    `LIVE SOCIAL DIGEST (${posts.length} posts):\n${digest || "(no posts returned)"}\n\n` +
    `Produce 5-8 signals ranked by overall relevance to ${client}. Where the data supports it, ` +
    `include at least one signal informed by each platform present. Return the JSON object only.`;

  const data = await callClaude({ system, messages: [{ role: "user", content: user }], maxTokens: 4096 });
  const textBlocks = (data.content || []).filter((b) => b.type === "text");
  if (!textBlocks.length) throw new Error("Claude returned no text");
  let txt = textBlocks[textBlocks.length - 1].text.trim();
  txt = txt.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
  if (s !== -1 && e > s) txt = txt.slice(s, e + 1);
  const parsed = JSON.parse(txt);
  return {
    signals: Array.isArray(parsed.signals) ? parsed.signals : [],
    opportunity_summary: parsed.opportunity_summary || "",
    content_implications: Array.isArray(parsed.content_implications) ? parsed.content_implications : [],
    risk_flags: Array.isArray(parsed.risk_flags) ? parsed.risk_flags : [],
  };
}

// ── routes ───────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    anthropic_key: Boolean(ANTHROPIC_KEY),
    ensembledata_token: Boolean(ED_TOKEN),   // TikTok + Instagram
    scrapecreators_key: Boolean(SC_KEY),     // X / Twitter
  });
});

app.get("/api/clients", (_req, res) => {
  res.json({ clients: listBrains() });
});

app.post("/api/scan", async (req, res) => {
  // Anthropic is always required. EnsembleData powers TikTok+IG, Scrape Creators powers X.
  if (!ANTHROPIC_KEY || (!ED_TOKEN && !SC_KEY)) {
    return res.status(500).json({
      error:
        "Server is missing API keys. Set ANTHROPIC_API_KEY plus ENSEMBLEDATA_TOKEN (TikTok/Instagram) and/or SCRAPECREATORS_API_KEY (X) in your host's environment variables.",
    });
  }
  try {
    const { client, extraTerms, platforms, sprint } = req.body || {};

    // Load the selected client's Brand Brain (required — the agent is client-specific).
    const brain = loadBrain(client);
    if (!brain) {
      return res.status(400).json({ error: "No Brand Brain selected or found. Pick a client first." });
    }

    // Build the search sets: culture base terms + any user-supplied focus.
    const extras = Array.isArray(extraTerms)
      ? extraTerms.map((t) => String(t).trim()).filter(Boolean).slice(0, 6)
      : [];
    const keywords = [...SEARCH.keywords, ...extras];
    const hashtags = [...SEARCH.hashtags, ...extras.map(toHashtag).filter(Boolean)];

    // Which platforms to scan (default: all three).
    const want = Array.isArray(platforms) && platforms.length
      ? platforms
      : ["TikTok", "Instagram", "X"];
    const runTT = want.includes("TikTok") && Boolean(ED_TOKEN);
    const runIG = want.includes("Instagram") && Boolean(ED_TOKEN);
    const runX  = want.includes("X") && Boolean(SC_KEY);

    const [tt, ig, tw] = await Promise.all([
      runTT ? fetchTikTok(keywords, hashtags).catch((e) => (console.warn("TikTok block failed:", e.message), [])) : [],
      runIG ? fetchInstagram(hashtags).catch((e) => (console.warn("Instagram block failed:", e.message), [])) : [],
      runX  ? fetchTwitter().catch((e) => (console.warn("Twitter block failed:", e.message), [])) : [],
    ]);
    const posts = [...tt, ...ig, ...tw];
    const breakdown = { TikTok: tt.length, Instagram: ig.length, X: tw.length };

    if (posts.length === 0) {
      return res.status(502).json({
        error:
          "No posts came back from any platform. Check your EnsembleData units (TikTok/Instagram) and Scrape Creators credits (X), or that the search terms match active content.",
        breakdown,
      });
    }

    const report = await analyzeSignals(posts, brain);

    // Shared-agent requirements: source transparency + version stamp.
    const sources_used = [
      breakdown.TikTok ? `TikTok (${breakdown.TikTok} posts, EnsembleData)` : null,
      breakdown.Instagram ? `Instagram (${breakdown.Instagram} posts, EnsembleData)` : null,
      breakdown.X ? `X (${breakdown.X} posts, Scrape Creators)` : null,
      extras.length ? `Added focus: ${extras.join(", ")}` : null,
      `Brand Brain: ${brain.client} (v${brain.version || "n/a"})`,
    ].filter(Boolean);

    res.json({
      ...report,
      breakdown,
      postCount: posts.length,
      generatedAt: Date.now(),
      version: {
        client: brain.client,
        client_id: String(client),
        brain_version: brain.version || "",
        sprint: sprint || "",
        generated: new Date().toISOString(),
      },
      sources_used,
    });
  } catch (e) {
    console.error("scan error:", e);
    res.status(500).json({ error: e.message || "Unknown server error during scan." });
  }
});

app.post("/api/ideas", async (req, res) => {
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "Server missing ANTHROPIC_API_KEY." });
  try {
    const { trends } = req.body || {};
    if (!Array.isArray(trends) || !trends.length) {
      return res.status(400).json({ error: "No trends provided to ideate from." });
    }
    const trendList = trends
      .map((t, i) =>
        `${i + 1}. [${t.momentum}] ${t.headline} — ${t.summary} ` +
        `(Why now: ${t.why_now}; seen on: ${(t.platforms || []).join(", ") || "social"})`
      )
      .join("\n");

    const system =
      `You are a creative strategist at an ad agency, ideating social content for the "got milk?" brand ` +
      `(the iconic milk-mustache campaign run by MilkPEP). Voice: playful, nostalgic, pop-culture-fluent, ` +
      `self-aware, never preachy. Your job: turn live cultural trends into ORIGINAL, proposed content ` +
      `concepts that ride those trends while staying true to got milk?. These are agency proposals for ` +
      `consideration — never imply they are officially approved or endorsed. Hard rules: invent no fake ` +
      `quotes from real people; put no words in the mouths of real athletes or celebrities; do not depict ` +
      `real public figures endorsing the brand; keep claims about milk general and non-medical. Each idea ` +
      `must clearly connect to one of the supplied trends. Produce a MIX: 2-3 "detailed" concepts and 4-5 ` +
      `"quick" concepts. Cover TikTok, Instagram, and X across the set. Respond with ONLY a valid JSON ` +
      `array (no markdown fences, no prose). Each element must have exactly these fields: ` +
      `"tier" (one of "detailed" or "quick"), "trend" (the headline of the trend it riffs on), ` +
      `"platform" (one of TikTok, Instagram, X), "format" (e.g. Reel, Duet, Meme, Carousel, Thread, Stitch), ` +
      `"title" (short concept name, <=8 words), "concept" (1-2 sentences describing the idea). ` +
      `For "detailed" tier ONLY, also include: "caption" (sample post copy, <=200 chars), ` +
      `"visual" (one sentence of art direction), "cta" (a short call to action). ` +
      `For "quick" tier, set caption/visual/cta to empty strings.`;

    const user =
      `Here are the rising cultural trends from today's scan. Generate got milk? content ideas ` +
      `grounded in them.\n\nTRENDS:\n${trendList}\n\nReturn the JSON array only.`;

    const data = await callClaude({ system, messages: [{ role: "user", content: user }], maxTokens: 2000 });
    const blocks = (data.content || []).filter((b) => b.type === "text");
    if (!blocks.length) throw new Error("Claude returned no text");
    let txt = blocks[blocks.length - 1].text.trim();
    txt = txt.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const a = txt.indexOf("["), b = txt.lastIndexOf("]");
    if (a !== -1 && b > a) txt = txt.slice(a, b + 1);
    const parsed = JSON.parse(txt);
    const ideas = Array.isArray(parsed) ? parsed : parsed.ideas || [];
    res.json({ ideas });
  } catch (e) {
    console.error("ideas error:", e);
    res.status(500).json({ error: e.message || "Unknown server error during ideation." });
  }
});

app.post("/api/summary", async (req, res) => {
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "Server missing ANTHROPIC_API_KEY." });
  try {
    const { trends, dateLabel } = req.body || {};
    if (!Array.isArray(trends) || !trends.length) {
      return res.status(400).json({ error: "No trends provided to summarize." });
    }
    const list = trends
      .map((t, i) => `${i + 1}. [${t.momentum}] ${t.headline} — ${t.summary} (Why now: ${t.why_now})`)
      .join("\n");
    const data = await callClaude({
      maxTokens: 400,
      system:
        "You are a senior strategy analyst at United Collective, a sports and entertainment consultancy. " +
        "Write crisp, insight-driven executive summaries with no filler — specific, authoritative, actionable.",
      messages: [
        {
          role: "user",
          content:
            `Write a 3-4 sentence executive summary for this cultural trend intelligence brief (for the brand got milk?). ` +
            `Surface the single most important strategic takeaway for a brand or rights holder. ` +
            `Date: ${dateLabel || new Date().toLocaleDateString()}.\n\nTrends:\n${list}\n\n` +
            `Return only the summary paragraph — no heading, no bullets, no preamble.`,
        },
      ],
    });
    const blocks = (data.content || []).filter((b) => b.type === "text");
    const summary = blocks.length ? blocks[blocks.length - 1].text.trim() : "";
    res.json({ summary });
  } catch (e) {
    console.error("summary error:", e);
    res.status(500).json({ error: e.message || "Unknown server error during summary." });
  }
});

app.listen(PORT, () => {
  console.log(`Culture Trend Wire running on port ${PORT}`);
  if (!ANTHROPIC_KEY) console.warn("⚠  ANTHROPIC_API_KEY is not set.");
  if (!ED_TOKEN) console.warn("⚠  ENSEMBLEDATA_TOKEN is not set (TikTok + Instagram will be skipped).");
  if (!SC_KEY) console.warn("⚠  SCRAPECREATORS_API_KEY is not set (X will be skipped).");
});
