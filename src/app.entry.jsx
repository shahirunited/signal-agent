import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

const LOGO_LIGHT = "data:image/png;base64,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";
const LOGO_DARK = "data:image/png;base64,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";

const DIMENSIONS = [
  { key: "audience_relevance",      label: "Audience" },
  { key: "brand_fit",              label: "Brand fit" },
  { key: "cultural_momentum",      label: "Momentum" },
  { key: "commercial_opportunity", label: "Commercial" },
  { key: "content_potential",      label: "Content" },
  { key: "risk_level",             label: "Risk" },
];

const CONFIDENCE = {
  high:   { label: "High confidence",   color: "#2bd9c7" },
  medium: { label: "Medium confidence", color: "#f2b705" },
  low:    { label: "Low confidence",    color: "#ff5a3c" },
};

const LOADING_STEPS = [
  "Pulling live posts…",
  "Reading the culture…",
  "Scoring against the Brand Brain…",
  "Filing the signal report…",
];

// overall score = weighted blend; risk counts against.
function overallScore(s) {
  if (!s) return 0;
  const pos = (s.audience_relevance||0) + (s.brand_fit||0) + (s.cultural_momentum||0) +
              (s.commercial_opportunity||0) + (s.content_potential||0);
  const risk = s.risk_level || 0;
  return Math.max(0, Math.round(((pos / 25) * 100) - (risk - 1) * 6));
}

function scoreColor(n) {
  if (n >= 4) return "#2bd9c7";
  if (n >= 3) return "#f2b705";
  return "#ff5a3c";
}

function normalizeSignal(raw, idx) {
  const s = raw.scores || {};
  const conf = String(raw.confidence || "medium").toLowerCase();
  return {
    id: idx + "-" + String(raw.title || "").slice(0, 20),
    title: raw.title || "Untitled signal",
    what_changed: raw.what_changed || "",
    why_it_matters: raw.why_it_matters || "",
    recommended_action: raw.recommended_action || "",
    scores: {
      audience_relevance: +s.audience_relevance || 0,
      brand_fit: +s.brand_fit || 0,
      cultural_momentum: +s.cultural_momentum || 0,
      commercial_opportunity: +s.commercial_opportunity || 0,
      content_potential: +s.content_potential || 0,
      risk_level: +s.risk_level || 0,
    },
    confidence: CONFIDENCE[conf] ? conf : "medium",
    review_flag: raw.review_flag || "",
    platforms: Array.isArray(raw.platforms) ? raw.platforms : [],
    evidence: raw.evidence || "",
  };
}

function esc(s){ return String(s||"").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function buildReportHTML(report) {
  const v = report.version || {};
  const date = new Date(report.generatedAt || Date.now()).toLocaleDateString("en-US",
    { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const dimLabel = { audience_relevance:"Audience", brand_fit:"Brand fit", cultural_momentum:"Momentum",
    commercial_opportunity:"Commercial", content_potential:"Content", risk_level:"Risk" };
  const confColor = { high:"#0d9488", medium:"#d97706", low:"#dc2626" };

  const sigRows = (report.signals||[]).map((sig, i) => {
    const sc = sig.scores || {};
    const scoreCells = Object.keys(dimLabel).map(k => {
      const n = sc[k]||0; const c = n>=4?"#0d9488":n>=3?"#d97706":"#dc2626";
      return `<td style="text-align:center;padding:4px 8px;font-size:12px;color:${c};font-weight:700;">${n}</td>`;
    }).join("");
    const headCells = Object.values(dimLabel).map(l =>
      `<th style="text-align:center;padding:4px 8px;font-size:9px;letter-spacing:.04em;text-transform:uppercase;color:#94a3b8;font-weight:600;">${l}</th>`).join("");
    return `
    <div style="page-break-inside:avoid;margin-bottom:22px;border:1px solid #e2e8f0;border-radius:8px;padding:18px 22px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${confColor[sig.confidence]||"#64748b"};">${esc(sig.confidence)} confidence</div>
        <div style="font-size:10px;color:#94a3b8;font-weight:600;">S${String(i+1).padStart(2,"0")}</div>
      </div>
      <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 8px;line-height:1.3;">${esc(sig.title)}</h3>
      <p style="font-size:13px;color:#334155;line-height:1.6;margin:0 0 6px;"><strong style="color:#0f172a;">What changed:</strong> ${esc(sig.what_changed)}</p>
      <p style="font-size:13px;color:#334155;line-height:1.6;margin:0 0 6px;"><strong style="color:#0f172a;">Why it matters:</strong> ${esc(sig.why_it_matters)}</p>
      <p style="font-size:13px;color:#334155;line-height:1.6;margin:0 0 10px;"><strong style="color:#0f172a;">Recommended action:</strong> ${esc(sig.recommended_action)}</p>
      <table style="border-collapse:collapse;margin:0 0 8px;"><tr>${headCells}</tr><tr>${scoreCells}</tr></table>
      ${sig.review_flag ? `<div style="font-size:11px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:4px;padding:6px 10px;margin-top:8px;"><strong>Human review:</strong> ${esc(sig.review_flag)}</div>` : ""}
      ${sig.platforms&&sig.platforms.length ? `<div style="font-size:11px;color:#94a3b8;margin-top:8px;">Signal on: ${esc(sig.platforms.join(" · "))}</div>` : ""}
    </div>`;
  }).join("");

  const implications = (report.content_implications||[]).map(c =>
    `<li style="font-size:13px;color:#334155;line-height:1.6;margin-bottom:4px;">${esc(c)}</li>`).join("");
  const risks = (report.risk_flags||[]).map(r =>
    `<li style="font-size:13px;color:#991b1b;line-height:1.6;margin-bottom:4px;">${esc(r)}</li>`).join("");
  const sources = (report.sources_used||[]).map(s =>
    `<li style="font-size:11px;color:#64748b;line-height:1.5;">${esc(s)}</li>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Weekly Signal Report — ${esc(v.client||"")}</title>
  <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box}body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a;margin:0}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head>
  <body><div style="max-width:800px;margin:0 auto;padding:52px 40px;">
    <div style="border-bottom:2px solid #0f172a;padding-bottom:24px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end;">
      <div><img src="${LOGO_DARK}" alt="United Collective" style="height:50px;width:auto;display:block;margin-bottom:14px;" />
      <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Signal Agent · Weekly Report</div>
      <h1 style="font-size:26px;font-weight:800;margin:0;line-height:1.1;">${esc(v.client||"Client")}<br>Signal Report</h1></div>
      <div style="text-align:right;font-size:11px;color:#64748b;"><div>${date}</div>${v.sprint?`<div>Sprint: ${esc(v.sprint)}</div>`:""}<div>Brain v${esc(v.brain_version||"n/a")}</div><div>${(report.signals||[]).length} signals · ${report.postCount||0} posts</div></div>
    </div>
    <div style="background:#f8fafc;border-radius:8px;padding:22px 26px;margin-bottom:28px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">Opportunity Summary</div>
      <div style="font-size:14px;color:#334155;line-height:1.7;">${esc(report.opportunity_summary||"")}</div>
    </div>
    <h2 style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin:0 0 18px;">Ranked Signals</h2>
    ${sigRows}
    ${implications?`<div style="margin-top:28px;"><h2 style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin:0 0 12px;">Content Implications</h2><ul style="margin:0;padding-left:20px;">${implications}</ul></div>`:""}
    ${risks?`<div style="margin-top:24px;"><h2 style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#991b1b;margin:0 0 12px;">Risk Flags</h2><ul style="margin:0;padding-left:20px;">${risks}</ul></div>`:""}
    ${sources?`<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;"><div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Sources Used</div><ul style="margin:0;padding-left:20px;">${sources}</ul></div>`:""}
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;">
      <span>Signal Agent · United Collective · Live data via EnsembleData + Scrape Creators, scored by OpenAI</span><span>Human review required before action · Confidential</span>
    </div>
  </div></body></html>`;
}

function App() {
  const [clients, setClients] = useState([]);
  const [client, setClient] = useState("");
  const [sprint, setSprint] = useState("");
  const [extraTerms, setExtraTerms] = useState("");
  const [platforms, setPlatforms] = useState({ TikTok: true, Instagram: true, X: true });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then(d => {
      const list = d.clients || [];
      setClients(list);
      if (list.length && !client) setClient(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (loading) {
      setLoadStep(0);
      timer.current = setInterval(() => setLoadStep(i => (i + 1) % LOADING_STEPS.length), 1800);
    } else clearInterval(timer.current);
    return () => clearInterval(timer.current);
  }, [loading]);

  function togglePlatform(name) {
    setPlatforms(prev => {
      const next = { ...prev, [name]: !prev[name] };
      if (!next.TikTok && !next.Instagram && !next.X) return prev;
      return next;
    });
  }

  async function runScan() {
    if (!client) { setError("Select a client Brand Brain first."); return; }
    setLoading(true); setError(null);
    try {
      const terms = extraTerms.split(",").map(s => s.trim()).filter(Boolean);
      const res = await fetch("/api/scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client, sprint, extraTerms: terms,
          platforms: Object.keys(platforms).filter(p => platforms[p]) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("Scan failed (" + res.status + ")"));
      const signals = (data.signals || []).map(normalizeSignal)
        .sort((a, b) => overallScore(b.scores) - overallScore(a.scores));
      if (!signals.length) throw new Error("No signals came back. Try again or widen the focus.");
      setReport({ ...data, signals });
    } catch (e) {
      setError(e.message || "Unknown error.");
    } finally { setLoading(false); }
  }

  function exportReport() {
    if (!report) return;
    setExporting(true);
    try {
      const html = buildReportHTML(report);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cid = (report.version && report.version.client_id) || "client";
      a.href = url;
      a.download = "SignalReport_" + cid + "_" + new Date().toISOString().slice(0,10) + ".html";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert("Export failed: " + (e.message||"error")); }
    finally { setExporting(false); }
  }

  const clientName = (clients.find(c => c.id === client) || {}).client || "";

  return (
    <div className="wrap">
      <div className="brandbar">
        <img className="brand-logo" src={LOGO_LIGHT} alt="United Collective" />
        <span className="brand-div" />
        <span className="brand-tag">Signal Agent</span>
      </div>
      <div className="kicker">
        <span className="dot" />
        <span>Agent 01 · Signal · {report ? "report ready" : "awaiting scan"}</span>
      </div>
      <h1 className="title">Signal <span>Agent</span></h1>
      <p className="subtitle">Finds and scores rising cultural signals for a client, grounded in their Brand Brain — then files a Weekly Signal Report for strategist review.</p>

      <div className="setup">
        <div className="setup-row">
          <label className="fld">
            <span className="fld-label">Client Brand Brain</span>
            <select className="fld-input" value={client} onChange={e => setClient(e.target.value)}>
              {!clients.length && <option value="">No Brand Brains found</option>}
              {clients.map(c => <option key={c.id} value={c.id}>{c.client} {c.version ? "· v"+c.version : ""}</option>)}
            </select>
          </label>
          <label className="fld fld-sprint">
            <span className="fld-label">Sprint / Project (optional)</span>
            <input className="fld-input" type="text" placeholder="e.g. Q3 Always-On" value={sprint} onChange={e => setSprint(e.target.value)} />
          </label>
        </div>
        <input className="fld-input search-input" type="text"
          placeholder="Add a focus to the scan — e.g. summer drinks, Gen Z slang (comma-separated)"
          value={extraTerms} onChange={e => setExtraTerms(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !loading) runScan(); }} />
        <div className="setup-actions">
          <div className="platform-toggles">
            {["TikTok","Instagram","X"].map(p => (
              <button key={p} className={"ptog"+(platforms[p]?" on":"")} onClick={() => togglePlatform(p)}>
                <span className="ptog-dot" />{p}
              </button>
            ))}
          </div>
          <div className="run-actions">
            {report && <button className="btn btn-export" onClick={exportReport} disabled={exporting}>
              {exporting ? "Exporting…" : "⤓ Export Report"}</button>}
            <button className="btn btn-scan" onClick={runScan} disabled={loading}>
              <span className={loading?"spin":""}>⟳</span>{loading?"Scanning":(report?"Rescan":"Run Signal Scan")}
            </button>
          </div>
        </div>
      </div>

      {report && report.breakdown && (
        <div className="breakdown">
          Analyzed <b>{report.postCount}</b> live posts for <b>{clientName}</b> · TikTok <b>{report.breakdown.TikTok||0}</b> · Instagram <b>{report.breakdown.Instagram||0}</b> · X <b>{report.breakdown.X||0}</b>
        </div>
      )}

      {loading && (
        <div>
          <div className="loadlabel">{LOADING_STEPS[loadStep]}</div>
          {[0,1,2].map(i => (
            <div className="skel" key={i}>
              <div className="skel-bar" style={{width:"45%"}} />
              <div className="skel-bar" style={{width:"88%",height:16}} />
              <div className="skel-bar" style={{width:"95%"}} />
              <div className="skel-bar" style={{width:"55%"}} />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="state err">
          <div className="state-h">The signal dropped</div>
          <p className="msg">{error}</p>
          <button className="retry" onClick={runScan}>Try again</button>
        </div>
      )}

      {!loading && !error && !report && (
        <div className="state">
          <div className="state-h">No report yet</div>
          <p className="msg">Pick a client, choose your platforms, and run a scan to generate a scored Weekly Signal Report.</p>
        </div>
      )}

      {!loading && !error && report && (
        <div>
          {report.opportunity_summary && (
            <div className="summary-box">
              <div className="summary-label">Opportunity Summary</div>
              <p className="summary-text">{report.opportunity_summary}</p>
            </div>
          )}

          <div className="section-label">Ranked Signals</div>
          {report.signals.map((sig, i) => (
            <div className="sigcard" key={sig.id}>
              <div className="sig-meta">
                <span className="sig-num">S{String(i+1).padStart(2,"0")}</span>
                <span className="conf-badge" style={{ "--cc": CONFIDENCE[sig.confidence].color }}>
                  {CONFIDENCE[sig.confidence].label}
                </span>
                <span className="sig-overall">{overallScore(sig.scores)}<span className="sig-overall-max">/100 fit</span></span>
                {sig.platforms.length > 0 && <span className="sig-plats">{sig.platforms.join(" · ")}</span>}
              </div>
              <h2 className="sig-title">{sig.title}</h2>
              {sig.what_changed && <p className="sig-line"><b>What changed</b> {sig.what_changed}</p>}
              {sig.why_it_matters && <p className="sig-line"><b>Why it matters</b> {sig.why_it_matters}</p>}
              {sig.recommended_action && <p className="sig-line sig-action"><b>Recommended action</b> {sig.recommended_action}</p>}
              <div className="scores">
                {DIMENSIONS.map(d => (
                  <div className="score" key={d.key}>
                    <div className="score-label">{d.label}</div>
                    <div className="score-bar"><div className="score-fill" style={{ width:(sig.scores[d.key]*20)+"%", background:scoreColor(sig.scores[d.key]) }} /></div>
                    <div className="score-num" style={{ color:scoreColor(sig.scores[d.key]) }}>{sig.scores[d.key]}</div>
                  </div>
                ))}
              </div>
              {sig.review_flag && <div className="review-flag"><b>⚑ Human review</b> {sig.review_flag}</div>}
              {sig.evidence && <p className="sig-ev"><b>From the feed</b><br/>{sig.evidence}</p>}
            </div>
          ))}

          {report.content_implications && report.content_implications.length > 0 && (
            <div className="listblock">
              <div className="section-label">Content Implications</div>
              <ul className="imp-list">{report.content_implications.map((c,i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
          {report.risk_flags && report.risk_flags.length > 0 && (
            <div className="listblock">
              <div className="section-label risk">Risk Flags</div>
              <ul className="risk-list">{report.risk_flags.map((r,i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {report.sources_used && report.sources_used.length > 0 && (
            <div className="sources-block">
              <div className="sources-label">Sources Used · {report.version && report.version.generated ? new Date(report.version.generated).toLocaleString() : ""}</div>
              <ul className="sources-list">{report.sources_used.map((s,i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <div className="footer">
        Signal Agent reads the selected client's Brand Brain and scores live signals for a human strategist to act on. It never gives final approval — review flags mark anything needing strategy, creative, legal, or cultural sign-off.
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(React.createElement(App));
