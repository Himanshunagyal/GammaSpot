import { useState, useEffect, useRef, useCallback } from "react";

const BACKEND_WS   = "wss://gammaspot-2.onrender.com/ws";
const BACKEND_HTTP = "https://gammaspot-2.onrender.com";


const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #080A0F; --surface: #0D1017; --surface2: #131820;
    --border: rgba(255,255,255,0.06); --border-bright: rgba(255,255,255,0.12);
    --accent: #C8F135; --accent-dim: rgba(200,241,53,0.12);
    --text: #F0F2F5; --text-muted: #5A6270; --text-mid: #8A95A3;
    --red: #FF4D6A; --red-dim: rgba(255,77,106,0.12);
    --yellow: #FFB547; --yellow-dim: rgba(255,181,71,0.12);
    --font-display: 'Syne', sans-serif; --font-mono: 'DM Mono', monospace;
  }
  html { scroll-behavior: smooth; }
  body { background: var(--bg); color: var(--text); font-family: var(--font-display); overflow-x: hidden; -webkit-font-smoothing: antialiased; }

  @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.75)} }
  @keyframes slideIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scanbar { from{left:-100%} to{left:100%} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

  .scrollbar-thin::-webkit-scrollbar{width:3px;height:3px}
  .scrollbar-thin::-webkit-scrollbar-track{background:transparent}
  .scrollbar-thin::-webkit-scrollbar-thumb{background:var(--border-bright);border-radius:2px}

  /* ══ LANDING ══════════════════════════════ */
  .landing { min-height:100vh; min-height:100dvh; display:flex; flex-direction:column; position:relative; overflow:hidden; }
  .grid-bg { position:fixed; inset:0; z-index:0; background-image:linear-gradient(rgba(200,241,53,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(200,241,53,0.025) 1px,transparent 1px); background-size:56px 56px; }
  .glow-orb { position:fixed; border-radius:50%; width:min(700px,130vw); height:min(700px,130vw); background:radial-gradient(circle,rgba(200,241,53,0.07) 0%,transparent 70%); top:-30%; left:50%; transform:translateX(-50%); pointer-events:none; z-index:0; }

  .nav { position:relative; z-index:10; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:22px clamp(20px,5vw,60px); border-bottom:1px solid var(--border); }
  .nav-logo { display:flex; align-items:center; gap:10px; font-size:clamp(15px,2.5vw,18px); font-weight:700; letter-spacing:-0.02em; }
  .logo-dot { width:8px; height:8px; border-radius:50%; background:var(--accent); box-shadow:0 0 12px var(--accent); animation:pulse 2s ease-in-out infinite; flex-shrink:0; }
  .nav-tag { font-family:var(--font-mono); font-size:clamp(9px,1.5vw,11px); color:var(--text-muted); border:1px solid var(--border); padding:5px 12px; border-radius:20px; letter-spacing:0.08em; white-space:nowrap; }

  .hero { position:relative; z-index:5; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:clamp(48px,8vw,100px) clamp(20px,5vw,60px); text-align:center; animation:fadeUp 0.6s ease both; }
  .hero-eyebrow { font-family:var(--font-mono); font-size:clamp(9px,1.5vw,11px); color:var(--accent); letter-spacing:0.2em; text-transform:uppercase; margin-bottom:clamp(18px,3vw,28px); display:flex; align-items:center; gap:10px; }
  .hero-eyebrow::before,.hero-eyebrow::after { content:''; display:block; width:clamp(16px,3vw,32px); height:1px; background:var(--accent); opacity:0.5; }
  .hero-title { font-size:clamp(44px,10vw,96px); font-weight:800; line-height:0.95; letter-spacing:-0.04em; margin-bottom:8px; }
  .hero-title span { color:var(--accent); text-shadow:0 0 60px rgba(200,241,53,0.35); }
  .hero-sub  { font-size:clamp(28px,6vw,68px); font-weight:800; line-height:1; letter-spacing:-0.04em; color:var(--text-muted); margin-bottom:clamp(18px,3vw,32px); }
  .hero-desc { font-size:clamp(13px,2vw,16px); color:var(--text-mid); max-width:480px; line-height:1.75; margin-bottom:clamp(32px,5vw,52px); }

  .cta-btn { position:relative; background:var(--accent); color:#080A0F; border:none; padding:clamp(13px,2vw,18px) clamp(28px,5vw,52px); font-family:var(--font-display); font-size:clamp(13px,2vw,15px); font-weight:700; letter-spacing:0.02em; border-radius:4px; cursor:pointer; transition:all 0.2s ease; width:min(100%,260px); }
  .cta-btn:hover { transform:translateY(-2px); box-shadow:0 12px 40px rgba(200,241,53,0.3); }
  .cta-btn:active { transform:translateY(0); }

  .features { position:relative; z-index:5; display:flex; flex-wrap:wrap; border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
  .feature-item { flex:1 1 200px; padding:clamp(22px,3vw,36px) clamp(20px,3.5vw,40px); border-right:1px solid var(--border); border-bottom:1px solid var(--border); }
  .feature-item:last-child { border-right:none; }
  .feature-num   { font-family:var(--font-mono); font-size:10px; color:var(--accent); letter-spacing:0.15em; margin-bottom:12px; opacity:0.7; }
  .feature-title { font-size:clamp(13px,2vw,15px); font-weight:600; margin-bottom:8px; }
  .feature-desc  { font-size:clamp(11px,1.5vw,13px); color:var(--text-muted); line-height:1.6; font-family:var(--font-mono); font-weight:300; }
  .footer-bar { position:relative; z-index:5; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; padding:18px clamp(20px,5vw,60px); font-family:var(--font-mono); font-size:clamp(9px,1.5vw,11px); color:var(--text-muted); }

  /* ══ SETUP SCREEN ═════════════════════════ */
  .setup-screen { min-height:100vh; min-height:100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; position:relative; overflow:hidden; animation:fadeUp 0.5s ease both; }
  .setup-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:clamp(28px,5vw,48px); width:min(100%,480px); position:relative; z-index:5; }
  .setup-logo { display:flex; align-items:center; gap:10px; font-size:18px; font-weight:700; margin-bottom:32px; }
  .setup-title { font-size:clamp(22px,4vw,28px); font-weight:800; letter-spacing:-0.02em; margin-bottom:8px; }
  .setup-title span { color:var(--accent); }
  .setup-desc { font-size:13px; color:var(--text-mid); line-height:1.7; margin-bottom:28px; font-family:var(--font-mono); }

  .setup-steps { display:flex; flex-direction:column; gap:14px; margin-bottom:28px; }
  .setup-step { display:flex; gap:12px; align-items:flex-start; }
  .step-num { width:22px; height:22px; border-radius:50%; background:var(--accent-dim); border:1px solid rgba(200,241,53,0.3); color:var(--accent); font-family:var(--font-mono); font-size:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px; }
  .step-text { font-family:var(--font-mono); font-size:12px; color:var(--text-mid); line-height:1.6; }
  .step-text b { color:var(--text); }

  .setup-input-group { margin-bottom:12px; }
  .setup-label { font-family:var(--font-mono); font-size:10px; color:var(--text-muted); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px; display:block; }
  .setup-input { width:100%; background:var(--surface2); border:1px solid var(--border); color:var(--text); font-family:var(--font-mono); font-size:14px; padding:12px 14px; border-radius:4px; outline:none; transition:border-color 0.15s; }
  .setup-input:focus { border-color:rgba(200,241,53,0.4); }
  .setup-input::placeholder { color:var(--text-muted); }
  .setup-input.error { border-color:rgba(255,77,106,0.5); }

  .setup-btn { width:100%; background:var(--accent); color:#080A0F; border:none; padding:14px; font-family:var(--font-display); font-size:14px; font-weight:700; border-radius:4px; cursor:pointer; transition:all 0.2s; margin-top:6px; display:flex; align-items:center; justify-content:center; gap:8px; }
  .setup-btn:hover { box-shadow:0 8px 30px rgba(200,241,53,0.3); }
  .setup-btn:disabled { opacity:0.5; cursor:not-allowed; }

  .setup-error { font-family:var(--font-mono); font-size:11px; color:var(--red); margin-top:8px; padding:8px 12px; background:var(--red-dim); border:1px solid rgba(255,77,106,0.2); border-radius:4px; }
  .setup-success { font-family:var(--font-mono); font-size:11px; color:var(--accent); margin-top:8px; padding:8px 12px; background:var(--accent-dim); border:1px solid rgba(200,241,53,0.2); border-radius:4px; }
  .setup-skip { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); text-align:center; margin-top:16px; cursor:pointer; transition:color 0.15s; }
  .setup-skip:hover { color:var(--text-mid); }

  .spinner { width:14px; height:14px; border:2px solid rgba(0,0,0,0.3); border-top-color:#080A0F; border-radius:50%; animation:spin 0.7s linear infinite; }

  /* ══ DASHBOARD ════════════════════════════ */
  .dashboard { min-height:100vh; min-height:100dvh; display:flex; flex-direction:column; background:var(--bg); }
  .dash-nav { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:13px clamp(16px,4vw,40px); border-bottom:1px solid var(--border); background:var(--surface); }
  .dash-nav-left { display:flex; align-items:center; gap:clamp(8px,2vw,20px); flex-wrap:wrap; }
  .back-btn { background:none; border:1px solid var(--border); color:var(--text-muted); cursor:pointer; font-family:var(--font-mono); font-size:11px; padding:7px 12px; border-radius:4px; transition:all 0.15s; white-space:nowrap; }
  .back-btn:hover { border-color:var(--border-bright); color:var(--text); }
  .status-pill { display:flex; align-items:center; gap:7px; font-family:var(--font-mono); font-size:clamp(10px,1.5vw,12px); padding:6px 12px; border-radius:4px; border:1px solid; transition:all 0.3s; white-space:nowrap; }
  .status-pill.scanning   { background:var(--accent-dim); border-color:rgba(200,241,53,0.3); color:var(--accent); }
  .status-pill.idle       { background:var(--surface2); border-color:var(--border); color:var(--text-muted); }
  .status-pill.connecting { background:var(--yellow-dim); border-color:rgba(255,181,71,0.3); color:var(--yellow); }
  .status-dot { width:6px; height:6px; border-radius:50%; background:currentColor; flex-shrink:0; }
  .status-pill.scanning .status-dot   { animation:pulse 1.5s infinite; }
  .status-pill.connecting .status-dot { animation:blink 1s infinite; }
  .dash-controls { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .ctrl-btn { padding:8px clamp(12px,2.5vw,20px); border-radius:4px; font-family:var(--font-display); font-size:clamp(12px,1.8vw,13px); font-weight:600; cursor:pointer; border:none; transition:all 0.15s; white-space:nowrap; }
  .ctrl-btn.start { background:var(--accent); color:#080A0F; }
  .ctrl-btn.start:hover { box-shadow:0 4px 20px rgba(200,241,53,0.3); }
  .ctrl-btn.stop  { background:var(--red-dim); color:var(--red); border:1px solid rgba(255,77,106,0.25); }
  .ctrl-btn:disabled { opacity:0.4; cursor:not-allowed; }
  .provider-toggle { display:flex; background:var(--surface2); border:1px solid var(--border); border-radius:4px; overflow:hidden; }
  .prov-opt { padding:7px 12px; cursor:pointer; transition:all 0.15s; color:var(--text-muted); border:none; background:none; font-family:var(--font-mono); font-size:clamp(10px,1.5vw,11px); }
  .prov-opt.active { background:var(--accent-dim); color:var(--accent); }

  /* User badge in nav */
  .user-badge { display:flex; align-items:center; gap:6px; font-family:var(--font-mono); font-size:11px; color:var(--text-muted); padding:6px 10px; border:1px solid var(--border); border-radius:4px; cursor:pointer; transition:all 0.15s; }
  .user-badge:hover { border-color:var(--border-bright); color:var(--text-mid); }
  .user-badge-dot { width:6px; height:6px; border-radius:50%; background:var(--accent); }

  .conn-banner { display:flex; align-items:center; justify-content:center; gap:10px; padding:8px; font-family:var(--font-mono); font-size:11px; border-bottom:1px solid var(--border); }
  .conn-banner.ok   { background:rgba(200,241,53,0.04); color:var(--accent); }
  .conn-banner.warn { background:rgba(255,181,71,0.04); color:var(--yellow); }
  .conn-banner.err  { background:rgba(255,77,106,0.04); color:var(--red); }

  .scan-bar-wrap { height:2px; background:var(--surface2); position:relative; overflow:hidden; }
  .scan-bar { position:absolute; left:-100%; top:0; width:100%; height:100%; background:linear-gradient(90deg,transparent,var(--accent),transparent); animation:scanbar 2.5s linear infinite; }

  .stats-row { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); }
  .stat-box  { flex:1 1 100px; padding:clamp(12px,2vw,22px) clamp(14px,2.5vw,32px); border-right:1px solid var(--border); border-bottom:1px solid var(--border); }
  .stat-box:last-child { border-right:none; }
  .stat-label { font-family:var(--font-mono); font-size:clamp(8px,1.2vw,10px); color:var(--text-muted); letter-spacing:0.12em; text-transform:uppercase; margin-bottom:5px; }
  .stat-value { font-size:clamp(18px,3.5vw,26px); font-weight:700; letter-spacing:-0.02em; line-height:1; }
  .stat-value.green  { color:var(--accent); }
  .stat-value.yellow { color:var(--yellow); }
  .stat-sub { font-family:var(--font-mono); font-size:clamp(9px,1.2vw,11px); color:var(--text-muted); margin-top:4px; }

  .dash-body { flex:1; display:grid; grid-template-columns:1fr 310px; overflow:hidden; min-height:0; }
  .scanner-panel { padding:clamp(16px,2.5vw,28px) clamp(14px,3vw,32px); overflow-y:auto; overflow-x:auto; border-right:1px solid var(--border); }
  .panel-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
  .panel-title  { font-family:var(--font-mono); font-size:clamp(9px,1.2vw,11px); color:var(--text-muted); letter-spacing:0.12em; text-transform:uppercase; }
  .last-scan    { font-family:var(--font-mono); font-size:10px; color:var(--text-muted); }

  .scanner-table { width:100%; border-collapse:collapse; min-width:460px; }
  .scanner-table th { font-family:var(--font-mono); font-size:clamp(9px,1.2vw,10px); color:var(--text-muted); letter-spacing:0.1em; text-align:left; padding:0 14px 12px; border-bottom:1px solid var(--border); font-weight:400; }
  .scanner-table th:first-child { padding-left:0; }
  .scanner-row { border-bottom:1px solid var(--border); transition:background 0.15s; }
  .scanner-row:hover  { background:var(--surface2); }
  .scanner-row.active { background:rgba(200,241,53,0.03); }
  .scanner-table td { padding:clamp(10px,1.5vw,15px) 14px; font-family:var(--font-mono); font-size:clamp(11px,1.5vw,13px); vertical-align:middle; }
  .scanner-table td:first-child { padding-left:0; }
  .instrument-name { font-weight:500; font-size:clamp(12px,1.8vw,14px); }
  .instrument-sub  { font-size:clamp(9px,1.2vw,10px); color:var(--text-muted); margin-top:2px; }

  .condition-badges { display:flex; gap:5px; flex-wrap:wrap; }
  .badge { font-size:clamp(9px,1.2vw,10px); padding:3px 7px; border-radius:3px; font-family:var(--font-mono); border:1px solid; white-space:nowrap; }
  .badge.ok    { background:var(--accent-dim); border-color:rgba(200,241,53,0.25); color:var(--accent); }
  .badge.no    { background:var(--red-dim);    border-color:rgba(255,77,106,0.2);  color:var(--red); }
  .badge.watch { background:var(--yellow-dim); border-color:rgba(255,181,71,0.2);  color:var(--yellow); }

  .rsi-val.high { color:var(--accent); }
  .rsi-val.mid  { color:var(--yellow); }
  .rsi-val.low  { color:var(--text-muted); }

  .signal-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:4px; font-size:clamp(9px,1.2vw,11px); font-family:var(--font-mono); font-weight:500; border:1px solid; white-space:nowrap; }
  .signal-badge.fire  { background:var(--accent-dim); border-color:rgba(200,241,53,0.3); color:var(--accent); }
  .signal-badge.watch { background:var(--yellow-dim); border-color:rgba(255,181,71,0.25); color:var(--yellow); }
  .signal-badge.cold  { background:transparent; border-color:var(--border); color:var(--text-muted); }

  .alerts-panel  { padding:clamp(14px,2vw,24px) clamp(12px,2vw,22px); overflow-y:auto; display:flex; flex-direction:column; gap:10px; background:var(--surface); }
  .alert-card    { border:1px solid var(--border); border-radius:6px; padding:clamp(12px,2vw,16px); background:var(--bg); animation:slideIn 0.3s ease; flex-shrink:0; }
  .alert-card.alert-fire  { border-color:rgba(200,241,53,0.28); background:rgba(200,241,53,0.02); }
  .alert-header  { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
  .alert-name    { font-size:clamp(12px,1.8vw,14px); font-weight:600; }
  .alert-time    { font-family:var(--font-mono); font-size:10px; color:var(--text-muted); }
  .alert-action  { font-family:var(--font-mono); font-size:clamp(11px,1.5vw,12px); color:var(--accent); font-weight:500; margin-bottom:10px; }
  .alert-details { display:flex; flex-direction:column; gap:4px; }
  .alert-row     { display:flex; justify-content:space-between; gap:8px; }
  .alert-key     { font-family:var(--font-mono); font-size:10px; color:var(--text-muted); }
  .alert-val     { font-family:var(--font-mono); font-size:10px; color:var(--text); text-align:right; }
  .alert-val.accent { color:var(--accent); }
  .no-alerts { display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; gap:10px; padding:40px 0; color:var(--text-muted); font-family:var(--font-mono); font-size:12px; text-align:center; }
  .no-alerts-icon { font-size:28px; opacity:0.25; }
  .scanner-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 20px; gap:12px; color:var(--text-muted); font-family:var(--font-mono); font-size:12px; text-align:center; }

  /* Mobile */
  .mobile-cards { display:none; flex-direction:column; gap:10px; }
  .m-card { border:1px solid var(--border); border-radius:6px; padding:14px; background:var(--surface2); }
  .m-card.active { background:rgba(200,241,53,0.04); border-color:rgba(200,241,53,0.2); }
  .m-card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
  .m-card-name { font-size:15px; font-weight:600; }
  .m-card-sub  { font-size:10px; color:var(--text-muted); margin-top:2px; font-family:var(--font-mono); }
  .m-card-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px; }
  .m-stat-label { font-family:var(--font-mono); font-size:9px; color:var(--text-muted); letter-spacing:0.1em; margin-bottom:3px; text-transform:uppercase; }
  .m-stat-val   { font-family:var(--font-mono); font-size:15px; font-weight:500; }
  .m-card-badges { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:10px; }
  .m-card-action { font-family:var(--font-mono); font-size:11px; color:var(--accent); margin-top:4px; }

  @media (max-width:1024px) { .dash-body { grid-template-columns:1fr 270px; } }
  @media (max-width:768px) {
    .nav-tag { display:none; }
    .features { flex-direction:column; }
    .feature-item { border-right:none; }
    .dash-body { grid-template-columns:1fr; overflow:visible; }
    .scanner-panel { border-right:none; border-bottom:1px solid var(--border); }
    .alerts-panel  { max-height:400px; }
  }
  @media (max-width:520px) {
    .scanner-table-wrap { display:none; }
    .mobile-cards { display:flex; }
    .dash-logo-text { display:none; }
    .stat-sub { display:none; }
    .stat-box { flex:1 1 45%; }
  }
`;

// ── Helpers ────────────────────────────────────────────
function getSignal(inst) {
  if (inst.signal) return inst.signal;
  if (inst.or_breakout && inst.rsi_ok && inst.volume_ok && inst.premium_ok) return "FIRE";
  if (inst.or_breakout || inst.rsi_ok) return "WATCH";
  return "COLD";
}
function formatName(s) { return s?.includes(":") ? s.split(":")[1] : s || ""; }

// ── Mobile Card ────────────────────────────────────────
function MobileCard({ inst }) {
  const sig = getSignal(inst);
  return (
    <div className={`m-card ${sig==="FIRE"?"active":""}`}>
      <div className="m-card-top">
        <div>
          <div className="m-card-name">{inst.display_name||formatName(inst.symbol)}</div>
          <div className="m-card-sub">₹{inst.spot?.toLocaleString("en-IN")||"—"}</div>
        </div>
        <span className={`signal-badge ${sig==="FIRE"?"fire":sig==="WATCH"?"watch":"cold"}`}>
          {sig==="FIRE"?"⚡":sig==="WATCH"?"◎":"—"} {sig}
        </span>
      </div>
      <div className="m-card-grid">
        <div><div className="m-stat-label">RSI</div><div className={`m-stat-val rsi-val ${inst.rsi>60?"high":inst.rsi>55?"mid":"low"}`}>{inst.rsi?.toFixed(1)||"—"}</div></div>
        <div><div className="m-stat-label">Volume</div><div className="m-stat-val" style={{color:inst.volume_ratio>1.5?"var(--accent)":inst.volume_ratio>1?"var(--yellow)":"var(--text-muted)"}}>{inst.volume_ratio?.toFixed(1)||"—"}x</div></div>
      </div>
      <div className="m-card-badges">
        <span className={`badge ${inst.or_breakout?"ok":"no"}`}>OR {inst.or_breakout?"✓":"✗"}</span>
        <span className={`badge ${inst.rsi_ok?"ok":inst.rsi>55?"watch":"no"}`}>RSI</span>
        <span className={`badge ${inst.volume_ok?"ok":inst.volume_ratio>1?"watch":"no"}`}>VOL</span>
        <span className={`badge ${inst.premium_ok?"ok":"no"}`}>CE</span>
      </div>
      {sig==="FIRE" && <div className="m-card-action">📌 BUY {inst.atm_strike} CE · ₹{inst.entry_premium} → ₹{inst.target}</div>}
    </div>
  );
}

// ── Setup Screen ───────────────────────────────────────
function SetupScreen({ onComplete }) {
  const [chatId,   setChatId]   = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    const id = chatId.trim();
    if (!id) { setError("Please enter your Telegram Chat ID."); return; }
    if (!/^\d+$/.test(id)) { setError("Chat ID must be a number. Get it from @userinfobot on Telegram."); return; }

    setLoading(true);
    try {
      const resp = await fetch(`${BACKEND_HTTP}/user/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ chat_id: id, name: name.trim() }),
      });
      const data = await resp.json();
      if (data.ok) {
        setSuccess(data.message);
        localStorage.setItem("gs_chat_id", id);
        localStorage.setItem("gs_name",    name.trim());
        setTimeout(() => onComplete(id), 1800);
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch {
      setError("Cannot reach backend. Make sure uvicorn is running on port 8000.");
    }
    setLoading(false);
  };

  return (
    <div className="setup-screen">
      <div className="grid-bg" /><div className="glow-orb" />
      <div className="setup-card">
        <div className="setup-logo"><div className="logo-dot" />GammaSpot</div>
        <h2 className="setup-title">Get <span>Alerts</span> on Telegram</h2>
        <p className="setup-desc">
          Enter your Telegram Chat ID to receive instant alerts whenever a setup fires. Takes 30 seconds.
        </p>

        <div className="setup-steps">
          {[
            { n:"1", text: <span>Search <b>@userinfobot</b> on Telegram and press Start</span> },
            { n:"2", text: <span>It replies instantly with your <b>Chat ID</b> (a number)</span> },
            { n:"3", text: <span>Search <b>@GammaSpotAlert_bot</b> and press <b>Start</b></span> },
            { n:"4", text: <span>Paste your Chat ID below and click Register</span> },
          ].map(s => (
            <div className="setup-step" key={s.n}>
              <div className="step-num">{s.n}</div>
              <div className="step-text">{s.text}</div>
            </div>
          ))}
        </div>

        <div className="setup-input-group">
          <label className="setup-label">Your Name (optional)</label>
          <input className="setup-input" placeholder="e.g. Arjun" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div className="setup-input-group">
          <label className="setup-label">Telegram Chat ID *</label>
          <input
            className={`setup-input ${error?"error":""}`}
            placeholder="e.g. 123456789"
            value={chatId}
            onChange={e=>{setChatId(e.target.value);setError("");}}
            onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
          />
        </div>

        {error   && <div className="setup-error">⚠ {error}</div>}
        {success && <div className="setup-success">✅ {success}</div>}

        <button className="setup-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? <><div className="spinner"/>Registering...</> : "Register & Launch Dashboard →"}
        </button>

        <div className="setup-skip" onClick={()=>onComplete(null)}>
          Skip for now (no Telegram alerts)
        </div>
      </div>
    </div>
  );
}

// ── Landing Page ───────────────────────────────────────
function LandingPage({ onLaunch }) {
  return (
    <div className="landing">
      <div className="grid-bg" /><div className="glow-orb" />
      <nav className="nav">
        <div className="nav-logo"><div className="logo-dot" />GammaSpot</div>
        <div className="nav-tag">INTRADAY · OPTIONS · SCANNER</div>
      </nav>
      <section className="hero">
        <div className="hero-eyebrow">Opening Range Gamma Scalp</div>
        <h1 className="hero-title"><span>Gamma</span>Spot</h1>
        <h2 className="hero-sub">Sees what you miss.</h2>
        <p className="hero-desc">Real-time multi-index scanner that detects your exact options setup the moment it appears — and alerts you instantly.</p>
        <button className="cta-btn" onClick={onLaunch}>Launch Scanner →</button>
      </section>
      <div className="features">
        {[
          {n:"01",t:"Multi-Index Scan", d:"Monitors BANKNIFTY, NIFTY, FINNIFTY and more — simultaneously, every 60 seconds."},
          {n:"02",t:"Setup Detection",  d:"OR breakout · RSI filter · Volume spike · CE premium expansion — all in real time."},
          {n:"03",t:"Instant Alerts",   d:"Strike, entry, target and SL delivered to your Telegram the moment the setup fires."},
        ].map(f=>(
          <div className="feature-item" key={f.n}>
            <div className="feature-num">{f.n}</div>
            <div className="feature-title">{f.t}</div>
            <div className="feature-desc">{f.d}</div>
          </div>
        ))}
      </div>
      <div className="footer-bar">
        <span>GammaSpot v1.0</span>
        <span>Groq · NSE · Telegram</span>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────
function Dashboard({ onBack, chatId }) {
  const [provider,    setProvider]    = useState("groq");
  const [instruments, setInstruments] = useState([]);
  const [alerts,      setAlerts]      = useState([]);
  const [scanCount,   setScanCount]   = useState(0);
  const [alertCount,  setAlertCount]  = useState(0);
  const [userCount,   setUserCount]   = useState(0);
  const [running,     setRunning]     = useState(false);
  const [wsStatus,    setWsStatus]    = useState("connecting");
  const [lastScan,    setLastScan]    = useState(null);
  const wsRef    = useRef(null);
  const alertIds = useRef(new Set());

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus("connecting");
    const ws = new WebSocket(BACKEND_WS);
    wsRef.current = ws;

    ws.onopen  = () => { setWsStatus("connected"); };
    ws.onclose = () => { setWsStatus("error"); setRunning(false); setTimeout(connectWS, 3000); };
    ws.onerror = () => { setWsStatus("error"); };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "connected" || msg.type === "scan_update") {
          if (msg.instruments?.length > 0) setInstruments(msg.instruments);
          setScanCount(msg.scan_count   || 0);
          setAlertCount(msg.alert_count || 0);
          setUserCount(msg.user_count   || 0);
          if (msg.scanned_at) setLastScan(msg.scanned_at);
          if (msg.type === "connected") setRunning(msg.running || false);

          // Extract alerts
          const fired = (msg.instruments||[]).filter(i=>i.signal==="FIRE");
          fired.forEach(inst => {
            const aid = `${inst.symbol}-${msg.scanned_at}`;
            if (!alertIds.current.has(aid)) {
              alertIds.current.add(aid);
              setAlerts(prev=>[{
                id: aid, type:"fire",
                name:   inst.display_name||formatName(inst.symbol),
                time:   msg.scanned_at||"",
                action: `BUY ${inst.atm_strike} CE`,
                details:{
                  "Entry":    `₹${inst.entry_premium}`,
                  "Target":   `₹${inst.target} (+30%)`,
                  "Stop":     `₹${inst.stop} (-25%)`,
                  "RSI":      String(inst.rsi),
                  "Volume":   `${inst.volume_ratio}x`,
                  "AI":       inst.ai_confidence||"—",
                },
              },...prev].slice(0,50))            }
          });
        }
      } catch(e) { console.error("[WS] Parse error:", e); }
    };
  }, []);

  useEffect(() => { connectWS(); return ()=>wsRef.current?.close(); }, [connectWS]);

  const sendCmd = (action, extra={}) => {
    if (wsRef.current?.readyState===WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({action,...extra}));
    }
  };

  const handleStart = () => { sendCmd("start",{provider}); setRunning(true); };
  const handleStop  = () => { sendCmd("stop"); setRunning(false); };
  const handleProv  = (p) => { setProvider(p); sendCmd("set_provider",{provider:p}); };

  const banner = {
    connected:  {cls:"ok",   text:`● Connected · ${userCount} user${userCount!==1?"s":""} registered`},
    connecting: {cls:"warn", text:"◌ Connecting to backend..."},
    error:      {cls:"err",  text:"✗ Backend unreachable — run: uvicorn main:app --reload --port 8000"},
  }[wsStatus];

  const activeCount = instruments.filter(i=>getSignal(i)==="FIRE").length;
  const watchCount  = instruments.filter(i=>getSignal(i)==="WATCH").length;

  return (
    <div className="dashboard">
      <div className="dash-nav">
        <div className="dash-nav-left">
          <button className="back-btn" onClick={onBack}>← Back</button>
          <div className="nav-logo" style={{fontSize:15}}>
            <div className="logo-dot" style={{width:6,height:6}}/>
            <span className="dash-logo-text">GammaSpot</span>
          </div>
          <div className={`status-pill ${running?"scanning":wsStatus==="connecting"?"connecting":"idle"}`}>
            <div className="status-dot"/>
            {running?`SCANNING · ${scanCount}`:wsStatus==="connecting"?"CONNECTING":"IDLE"}
          </div>
        </div>
        <div className="dash-controls">
          {chatId && (
            <div className="user-badge" title="Your Telegram ID">
              <div className="user-badge-dot"/>
              {chatId.slice(-4) ? `···${chatId.slice(-4)}` : chatId}
            </div>
          )}
          <div className="provider-toggle">
            {["groq","claude"].map(p=>(
              <button key={p} className={`prov-opt ${provider===p?"active":""}`} onClick={()=>handleProv(p)}>{p.toUpperCase()}</button>
            ))}
          </div>
          {!running
            ? <button className="ctrl-btn start" disabled={wsStatus!=="connected"} onClick={handleStart}>▶ Start</button>
            : <button className="ctrl-btn stop" onClick={handleStop}>◼ Stop</button>
          }
        </div>
      </div>

      <div className={`conn-banner ${banner.cls}`}>{banner.text}</div>
      {running?<div className="scan-bar-wrap"><div className="scan-bar"/></div>:<div style={{height:2}}/>}

      <div className="stats-row">
        {[
          {label:"Instruments", value:instruments.length||"—", sub:"monitored",      cls:""},
          {label:"Setup Active",value:activeCount,             sub:"all conditions",  cls:"green"},
          {label:"Watching",    value:watchCount,              sub:"partial match",   cls:"yellow"},
          {label:"Alerts",      value:alertCount,              sub:"this session",    cls:activeCount>0?"green":""},
          {label:"Users",       value:userCount,               sub:"on Telegram",     cls:userCount>0?"green":""},
        ].map(s=>(
          <div className="stat-box" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash-body">
        <div className="scanner-panel scrollbar-thin">
          <div className="panel-header">
            <div className="panel-title">Live Scanner — OR Gamma Scalp</div>
            {lastScan && <div className="last-scan">Last: {lastScan}</div>}
          </div>

          {instruments.length===0 ? (
            <div className="scanner-empty">
              <div style={{fontSize:28,opacity:0.2}}>◎</div>
              <div>{wsStatus!=="connected"?"Waiting for backend...":"Start the bot to begin scanning."}</div>
            </div>
          ) : (
            <>
              <div className="scanner-table-wrap">
                <table className="scanner-table">
                  <thead><tr><th>Instrument</th><th>Conditions</th><th>RSI</th><th>Volume</th><th>Signal</th></tr></thead>
                  <tbody>
                    {instruments.map(inst=>{
                      const sig=getSignal(inst);
                      return (
                        <tr key={inst.symbol} className={`scanner-row ${sig==="FIRE"?"active":""}`}>
                          <td><div className="instrument-name">{inst.display_name||formatName(inst.symbol)}</div><div className="instrument-sub">₹{inst.spot?.toLocaleString("en-IN")||"—"}</div></td>
                          <td><div className="condition-badges">
                            <span className={`badge ${inst.or_breakout?"ok":"no"}`}>OR {inst.or_breakout?"✓":"✗"}</span>
                            <span className={`badge ${inst.rsi_ok?"ok":inst.rsi>55?"watch":"no"}`}>RSI</span>
                            <span className={`badge ${inst.volume_ok?"ok":inst.volume_ratio>1?"watch":"no"}`}>VOL</span>
                            <span className={`badge ${inst.premium_ok?"ok":"no"}`}>CE</span>
                          </div></td>
                          <td><span className={`rsi-val ${inst.rsi>60?"high":inst.rsi>55?"mid":"low"}`}>{inst.rsi?.toFixed(1)||"—"}</span></td>
                          <td><span style={{fontFamily:"var(--font-mono)",fontSize:13,color:inst.volume_ratio>1.5?"var(--accent)":inst.volume_ratio>1?"var(--yellow)":"var(--text-muted)"}}>{inst.volume_ratio?.toFixed(1)||"—"}x</span></td>
                          <td><span className={`signal-badge ${sig==="FIRE"?"fire":sig==="WATCH"?"watch":"cold"}`}>{sig==="FIRE"?"⚡":sig==="WATCH"?"◎":"—"} {sig}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mobile-cards">{instruments.map(inst=><MobileCard key={inst.symbol} inst={inst}/>)}</div>
            </>
          )}
        </div>

        <div className="alerts-panel scrollbar-thin">
          <div className="panel-title" style={{marginBottom:14}}>Alert Log</div>
          {alerts.length===0
            ? <div className="no-alerts"><div className="no-alerts-icon">◎</div><div>No alerts yet.<br/>Start the bot to begin scanning.</div></div>
            : alerts.map(a=>(
              <div key={a.id} className="alert-card alert-fire">
                <div className="alert-header"><div className="alert-name">{a.name}</div><div className="alert-time">{a.time}</div></div>
                <div className="alert-action">📌 {a.action}</div>
                <div className="alert-details">
                  {Object.entries(a.details).map(([k,v])=>(
                    <div className="alert-row" key={k}>
                      <span className="alert-key">{k}</span>
                      <span className={`alert-val ${k==="Entry"||k==="Target"?"accent":""}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────
export default function GammaSpot() {
  const [page,   setPage]   = useState("landing");
  const [chatId, setChatId] = useState(() => localStorage.getItem("gs_chat_id") || null);

  const handleLaunch = () => {
    // If already registered, go straight to dashboard
    if (chatId) { setPage("dashboard"); return; }
    setPage("setup");
  };

  const handleSetupComplete = (id) => {
    if (id) setChatId(id);
    setPage("dashboard");
  };

  return (
    <>
      <style>{styles}</style>
      {page==="landing"   && <LandingPage onLaunch={handleLaunch}/>}
      {page==="setup"     && <SetupScreen onComplete={handleSetupComplete}/>}
      {page==="dashboard" && <Dashboard onBack={()=>setPage("landing")} chatId={chatId}/>}
    </>
  );
}