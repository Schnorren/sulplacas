import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// Sul Placas — Dashboard Admin
// Features: #1 Rastreamento em tempo real · #5 Histórico por cliente
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Mock de dados (substitua por fetch real) ─────────────────────────────────
const MOCK_PROPOSALS = [
  {
    id: "p1", status: "APPROVED", viewCount: 7, lastViewedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    client: { id: "c1", name: "Carlos Mendonça", whatsapp: "51999990001" },
    pool: { lengthM: 8, widthM: 4, areaM2: 32, region: "REGIAO_METRO", city: "Canoas" },
    pricing: { totalCashCents: 657000 },
    upsells: { thermalCover: { selected: true }, wifiController: { selected: false } },
    signedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    signatureName: "Carlos Mendonça",
  },
  {
    id: "p2", status: "VIEWED", viewCount: 4, lastViewedAt: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
    client: { id: "c2", name: "Paulo Rodrigues", whatsapp: "51988880002" },
    pool: { lengthM: 6, widthM: 3, areaM2: 18, region: "PORTO_ALEGRE", city: "Porto Alegre" },
    pricing: { totalCashCents: 390000 },
    upsells: { thermalCover: { selected: false }, wifiController: { selected: false } },
    signedAt: null, signatureName: null,
  },
  {
    id: "p3", status: "VIEWED", viewCount: 11, lastViewedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    client: { id: "c3", name: "Renata Oliveira", whatsapp: "51977770003" },
    pool: { lengthM: 10, widthM: 5, areaM2: 50, region: "INTERIOR_LITORAL", city: "Torres" },
    pricing: { totalCashCents: 1022000 },
    upsells: { thermalCover: { selected: true }, wifiController: { selected: true } },
    signedAt: null, signatureName: null,
  },
  {
    id: "p4", status: "SENT", viewCount: 0, lastViewedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
    client: { id: "c4", name: "Marcos Figueiredo", whatsapp: "51966660004" },
    pool: { lengthM: 7, widthM: 3.5, areaM2: 24.5, region: "REGIAO_METRO", city: "Gravataí" },
    pricing: { totalCashCents: 548000 },
    upsells: { thermalCover: { selected: false }, wifiController: { selected: false } },
    signedAt: null, signatureName: null,
  },
  {
    id: "p5", status: "EXPIRED", viewCount: 2, lastViewedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    client: { id: "c1", name: "Carlos Mendonça", whatsapp: "51999990001" },
    pool: { lengthM: 6, widthM: 3, areaM2: 18, region: "REGIAO_METRO", city: "Canoas" },
    pricing: { totalCashCents: 405000 },
    upsells: { thermalCover: { selected: false }, wifiController: { selected: false } },
    signedAt: null, signatureName: null,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function brl(cents) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)   return "agora mesmo";
  if (m < 60)  return `há ${m} min`;
  if (h < 24)  return `há ${h}h`;
  return `há ${d}d`;
}
function daysLeft(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}
function buildWaLink(whatsapp, msg) {
  return `https://wa.me/55${whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`;
}

// ─── Configuração de status ───────────────────────────────────────────────────
const STATUS_CONFIG = {
  APPROVED: { label: "Aprovada",  bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.4)",  dot: "#10B981", text: "#6EE7B7" },
  VIEWED:   { label: "Visualizada", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", dot: "#F59E0B", text: "#FCD34D" },
  SENT:     { label: "Enviada",   bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.35)", dot: "#3B82F6", text: "#93C5FD" },
  EXPIRED:  { label: "Expirada", bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.3)", dot: "#64748B", text: "#94A3B8" },
  LOST:     { label: "Perdida",   bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)",   dot: "#EF4444", text: "#FCA5A5" },
};

// ─── Ícones ───────────────────────────────────────────────────────────────────
const Icon = {
  Sun: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4.5" fill="currentColor"/>
      {[0,45,90,135,180,225,270,315].map(d => {
        const r = d*Math.PI/180;
        return <line key={d} x1={12+Math.cos(r)*6.5} y1={12+Math.sin(r)*6.5}
          x2={12+Math.cos(r)*9.5} y2={12+Math.sin(r)*9.5}
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>;
      })}
    </svg>
  ),
  Eye: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  WhatsApp: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.57a.5.5 0 0 0 .61.61l5.712-1.476A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.027-1.381l-.36-.214-3.734.965.988-3.618-.235-.372A9.818 9.818 0 1 1 12 21.818z"/>
    </svg>
  ),
  History: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Check: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Search: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ExternalLink: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.SENT;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot,
        ...(status === "VIEWED" ? { animation: "pulse 1.5s ease-in-out infinite" } : {}) }}/>
      {cfg.label}
    </span>
  );
}

// ─── HeatBar — visualizações ──────────────────────────────────────────────────
function HeatBar({ count }) {
  const max = 12;
  const pct = Math.min(count / max, 1);
  const color = pct > 0.7 ? "#EF4444" : pct > 0.4 ? "#F59E0B" : "#10B981";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct*100}%`, background: color,
          borderRadius: 99, transition: "width 0.8s ease" }}/>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: count > 0 ? color : "#475569",
        minWidth: 24, textAlign: "right" }}>{count}×</span>
    </div>
  );
}

// ─── Card de proposta ─────────────────────────────────────────────────────────
function ProposalCard({ p, onSelectClient, onFollowUp }) {
  const [expanded, setExpanded] = useState(false);
  const isHot = p.viewCount >= 5 && p.status === "VIEWED";
  const notOpened = p.viewCount === 0 && p.status === "SENT";
  const days = daysLeft(p.expiresAt);

  const followUpMsg = `Olá ${p.client.name}! 👋\n\nPassando para saber se teve alguma dúvida sobre a proposta de aquecimento solar que enviei para sua piscina em ${p.pool.city}.\n\nQualquer coisa estou à disposição! ☀️\nsulplacas.com.br/proposta/${p.id}`;

  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      border: isHot ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.09)",
      background: isHot ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.03)",
      transition: "all 0.2s",
    }}>
      {/* Barra de alerta para propostas quentes */}
      {isHot && (
        <div style={{ background: "rgba(239,68,68,0.15)", padding: "6px 16px",
          display: "flex", alignItems: "center", gap: 6 }}>
          <Icon.Alert/>
          <span style={{ fontSize: 11, color: "#FCA5A5", fontWeight: 700 }}>
            🔥 Cliente abrindo muito — hora de ligar!
          </span>
        </div>
      )}
      {notOpened && (
        <div style={{ background: "rgba(59,130,246,0.10)", padding: "6px 16px",
          display: "flex", alignItems: "center", gap: 6 }}>
          <Icon.Alert/>
          <span style={{ fontSize: 11, color: "#93C5FD", fontWeight: 700 }}>
            Ainda não foi aberta — considere um follow-up
          </span>
        </div>
      )}

      {/* Corpo principal */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#F8FAFC",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.client.name}
              </span>
              <StatusBadge status={p.status}/>
            </div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              📍 {p.pool.city} · 🏊 {p.pool.lengthM}×{p.pool.widthM}m ({p.pool.areaM2}m²) · {brl(p.pricing.totalCashCents)}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 2 }}>
              {p.status === "EXPIRED" ? "expirou" : `${days}d restantes`}
            </div>
            <div style={{ fontSize: 11, color: "#475569" }}>
              {timeAgo(p.createdAt)}
            </div>
          </div>
        </div>

        {/* Visualizações */}
        <div style={{ margin: "12px 0 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            fontSize: 11, color: "#475569", marginBottom: 5 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Icon.Eye/> Visualizações
            </span>
            <span style={{ color: "#64748B" }}>
              última: {timeAgo(p.lastViewedAt)}
            </span>
          </div>
          <HeatBar count={p.viewCount}/>
        </div>

        {/* Upsells + assinatura */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {p.upsells.thermalCover.selected && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99,
              background: "rgba(245,158,11,0.12)", color: "#FBBF24", border: "1px solid rgba(245,158,11,0.25)" }}>
              🌡️ Capa Térmica
            </span>
          )}
          {p.upsells.wifiController.selected && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99,
              background: "rgba(59,130,246,0.12)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.25)" }}>
              📶 Wi-Fi
            </span>
          )}
          {p.signedAt && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99,
              background: "rgba(16,185,129,0.12)", color: "#6EE7B7", border: "1px solid rgba(16,185,129,0.25)",
              display: "flex", alignItems: "center", gap: 4 }}>
              <Icon.Check/> Assinado
            </span>
          )}
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: 8 }}>
          <a href={buildWaLink(p.client.whatsapp, followUpMsg)}
            target="_blank" rel="noopener noreferrer"
            onClick={() => onFollowUp(p.id)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 12px", borderRadius: 10,
              background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)",
              color: "#4ADE80", fontSize: 12, fontWeight: 700, textDecoration: "none",
              transition: "background 0.15s",
            }}>
            <Icon.WhatsApp/> Follow-up
          </a>
          <button onClick={() => setExpanded(!expanded)} style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
            color: "#94A3B8", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            <Icon.ExternalLink/> Detalhes
          </button>
          <button onClick={() => onSelectClient(p.client.id)} style={{
            padding: "8px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
            color: "#94A3B8", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }} title="Ver histórico do cliente">
            <Icon.History/>
          </button>
        </div>

        {/* Detalhe expandido */}
        {expanded && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { l: "WhatsApp", v: p.client.whatsapp },
                { l: "Região", v: { PORTO_ALEGRE: "POA", REGIAO_METRO: "Região Metro", INTERIOR_LITORAL: "Interior/Litoral" }[p.pool.region] },
                { l: "Criado em", v: new Date(p.createdAt).toLocaleDateString("pt-BR") },
                { l: "Expira em", v: new Date(p.expiresAt).toLocaleDateString("pt-BR") },
                ...(p.signedAt ? [{ l: "Assinado por", v: p.signatureName }, { l: "Assinado em", v: new Date(p.signedAt).toLocaleDateString("pt-BR") }] : []),
              ].map(({ l, v }) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase",
                    letterSpacing: "0.08em", marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 13, color: "#CBD5E1", fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
            <a href={`https://sulplacas.com.br/proposta/${p.id}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12,
                fontSize: 12, color: "#F59E0B", textDecoration: "none" }}>
              <Icon.ExternalLink/> Abrir proposta do cliente
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Painel histórico do cliente ──────────────────────────────────────────────
function ClientHistoryPanel({ clientId, proposals, onClose }) {
  const clientProposals = proposals.filter(p => p.client.id === clientId);
  const client = clientProposals[0]?.client;
  if (!client) return null;

  const totalValue = clientProposals
    .filter(p => p.status === "APPROVED")
    .reduce((s, p) => s + p.pricing.totalCashCents, 0);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(2,6,23,0.85)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 520, margin: "0 auto",
        background: "#0F172A", borderRadius: "20px 20px 0 0",
        border: "1px solid rgba(255,255,255,0.10)",
        padding: "24px 20px 40px", maxHeight: "80vh", overflowY: "auto",
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.15)",
          borderRadius: 99, margin: "0 auto 20px" }}/>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 4px" }}>{client.name}</h2>
          <div style={{ fontSize: 13, color: "#64748B" }}>
            📱 {client.whatsapp} · {clientProposals.length} proposta{clientProposals.length > 1 ? "s" : ""}
          </div>
          {totalValue > 0 && (
            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10,
              background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <span style={{ fontSize: 12, color: "#6EE7B7" }}>Total aprovado: </span>
              <strong style={{ color: "#4ADE80", fontSize: 14 }}>{brl(totalValue)}</strong>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {clientProposals.map(p => (
            <div key={p.id} style={{
              borderRadius: 12, padding: "14px 16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <StatusBadge status={p.status}/>
                <span style={{ fontSize: 12, color: "#475569" }}>
                  {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#CBD5E1", marginBottom: 4 }}>
                🏊 {p.pool.lengthM}×{p.pool.widthM}m · {brl(p.pricing.totalCashCents)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569" }}>
                <span><Icon.Eye/> {p.viewCount}×</span>
                <span>Última: {timeAgo(p.lastViewedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, value, label, sub, color }) {
  return (
    <div style={{
      borderRadius: 14, padding: "16px 14px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.09)",
    }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: color || "#F8FAFC", lineHeight: 1.1, marginBottom: 3 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [proposals]       = useState(MOCK_PROPOSALS);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("ALL");
  const [selectedClient, setSelectedClient] = useState(null);
  const [followedUp, setFollowedUp] = useState(new Set());

  // KPIs
  const approved  = proposals.filter(p => p.status === "APPROVED");
  const viewed    = proposals.filter(p => p.status === "VIEWED");
  const sent      = proposals.filter(p => p.status === "SENT");
  const hot       = proposals.filter(p => p.viewCount >= 5 && p.status === "VIEWED");
  const convRate  = proposals.length ? Math.round((approved.length / proposals.length) * 100) : 0;
  const totalApproved = approved.reduce((s,p) => s + p.pricing.totalCashCents, 0);

  // Filtro + busca
  const filtered = proposals.filter(p => {
    const matchSearch = p.client.name.toLowerCase().includes(search.toLowerCase()) ||
      p.pool.city.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" || p.status === filter ||
      (filter === "HOT" && p.viewCount >= 5 && p.status === "VIEWED");
    return matchSearch && matchFilter;
  });

  const handleFollowUp = useCallback((id) => {
    setFollowedUp(prev => new Set([...prev, id]));
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #020617 0%, #0F172A 50%, #020617 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "#F8FAFC",
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
      `}</style>

      {/* Blob decorativo */}
      <div style={{ position: "fixed", top: -60, right: -60, width: 300, height: 300,
        background: "radial-gradient(circle, rgba(245,158,11,0.09) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none", zIndex: 0 }}/>

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(2,6,23,0.90)", backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#F59E0B", color: "#1E293B", padding: "5px 12px",
            borderRadius: 99, fontWeight: 900, fontSize: 14,
            display: "flex", alignItems: "center", gap: 6 }}>
            <Icon.Sun/> Sul Placas
          </div>
          <span style={{ fontSize: 13, color: "#475569" }}>Dashboard</span>
        </div>
        <a href="/admin/new" style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "7px 14px", borderRadius: 10,
          background: "#F59E0B", color: "#1E293B",
          fontSize: 13, fontWeight: 800, textDecoration: "none",
        }}>
          <Icon.Plus/> Novo
        </a>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto", padding: "20px 16px 40px" }}>

        {/* ── KPIs ───────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20,
          animation: "fadeIn 0.4s ease both" }}>
          <KpiCard icon="💰" value={brl(totalApproved)} label="Aprovado no período"
            sub={`${approved.length} proposta${approved.length !== 1 ? "s" : ""}`} color="#4ADE80"/>
          <KpiCard icon="📊" value={`${convRate}%`} label="Taxa de conversão"
            sub={`${proposals.length} propostas totais`} color="#FBBF24"/>
          <KpiCard icon="🔥" value={hot.length} label="Propostas quentes"
            sub="Vistas 5+ vezes" color="#F87171"/>
          <KpiCard icon="📤" value={sent.length} label="Aguardando abertura"
            sub="Nunca visualizadas" color="#93C5FD"/>
        </div>

        {/* ── BUSCA + FILTRO ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10,
          animation: "fadeIn 0.4s 0.1s ease both" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "#475569", pointerEvents: "none" }}>
              <Icon.Search/>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou cidade…"
              style={{
                width: "100%", padding: "11px 14px 11px 36px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 12, color: "#F8FAFC", fontSize: 14,
                outline: "none", fontFamily: "inherit",
              }}/>
          </div>

          {/* Filtros por status */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {[
              { key: "ALL",      label: "Todas",         count: proposals.length },
              { key: "HOT",      label: "🔥 Quentes",    count: hot.length },
              { key: "VIEWED",   label: "Visualizadas",  count: viewed.length },
              { key: "APPROVED", label: "Aprovadas",     count: approved.length },
              { key: "SENT",     label: "Enviadas",      count: sent.length },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                flexShrink: 0, padding: "6px 12px", borderRadius: 99, border: "none",
                background: filter === f.key ? "#F59E0B" : "rgba(255,255,255,0.06)",
                color: filter === f.key ? "#1E293B" : "#94A3B8",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
              }}>
                {f.label}
                <span style={{ marginLeft: 5, opacity: 0.7 }}>({f.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── LISTA DE PROPOSTAS ──────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12,
          animation: "fadeIn 0.4s 0.15s ease both" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#475569" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <div>Nenhuma proposta encontrada</div>
            </div>
          ) : filtered.map(p => (
            <ProposalCard
              key={p.id} p={p}
              onSelectClient={setSelectedClient}
              onFollowUp={handleFollowUp}
            />
          ))}
        </div>
      </div>

      {/* ── PAINEL HISTÓRICO ────────────────────────────────────────────── */}
      {selectedClient && (
        <ClientHistoryPanel
          clientId={selectedClient}
          proposals={proposals}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}
