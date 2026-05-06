import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// Sul Placas — Proposta do Cliente v2
// Features integradas:
//   #3  Campo cidade na saudação
//   #4  Página de confirmação pós-aprovação (estado interno)
//   #6  Foto real de instalação
//   #7  Bloco de ROI personalizado
//   #8  Assinatura digital antes do CTA
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Constantes ───────────────────────────────────────────────────────────────
const RATE_12X             = 0.12;
const RATE_18X             = 0.16;
const WIFI_PRICE_CENTS     = 30000;   // R$ 300,00
const THERMAL_PRICE_CENTS  = 60000;   // R$ 600,00
const EMPRESA_WHATSAPP     = "5551999999999"; // ← número Sul Placas

// ─── Mock de proposta (em produção vem do getServerSideProps/API) ─────────────
const PROPOSAL = {
  id:          "abc123-uuid",
  expiresAt:   new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  client: {
    name:      "Paulo Rodrigues",
    whatsapp:  "51988880002",
    city:      "Candiota",            // Feature 3
  },
  pool: {
    lengthM: 8, widthM: 4, areaM2: 32,
    region:  "REGIAO_METRO",
  },
  pricing: {
    totalCashCents:      657000,
    installment12xCents: 61404,
    installment18xCents: 42378,
  },
  upsells: {
    thermalCover:   { priceCents: THERMAL_PRICE_CENTS, selected: false },
    wifiController: { priceCents: WIFI_PRICE_CENTS,    selected: false },
  },
  // Feature 6 — foto real da instalação
  installationPhotoUrl: "https://images.unsplash.com/photo-1572969519524-bf6ca3f4e6c0?w=800&q=80",
  // Feature 7 — ROI calculado pelo backend
  roi: {
    extraDays:              180,
    yearlyLeisureGainCents: 2700000,  // R$ 27.000/ano
    paybackMonths:          3,
    savingsMonthCents:      28000,    // R$ 280/mês vs elétrico
    headline:               "Sua piscina vai trabalhar por você",
    subheadline:            "Com 180 dias a mais de uso por ano, o sistema se paga em aproximadamente 3 meses — só em lazer que você já teria.",
    bullets: [
      "🏊 +180 dias de piscina por ano (de 90 para 270 dias)",
      "💰 R$ 27.000/ano em lazer que você passa a aproveitar",
      "⚡ Economia de ~R$ 280/mês vs aquecedor elétrico",
      "📅 Investimento se paga em ~3 meses",
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function brl(cents) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function installment(totalCents, rate, n) {
  return brl(Math.round((totalCents * (1 + rate)) / n));
}
function expireLabel(iso) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// ─── Ícones ───────────────────────────────────────────────────────────────────
function SunIcon({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ display: "block" }}>
      <circle cx="12" cy="12" r="4.8" fill="currentColor"/>
      {[0,45,90,135,180,225,270,315].map(d => {
        const r = d * Math.PI / 180;
        return <line key={d}
          x1={12+Math.cos(r)*6.8} y1={12+Math.sin(r)*6.8}
          x2={12+Math.cos(r)*9.8} y2={12+Math.sin(r)*9.8}
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>;
      })}
    </svg>
  );
}
function CheckCircle({ color = "#10B981" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, marginTop:1 }}>
      <circle cx="12" cy="12" r="10" fill={`${color}22`} stroke={color} strokeWidth="1.5"/>
      <path d="M7.5 12L10.5 15L16.5 9" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.57a.5.5 0 0 0 .61.61l5.712-1.476A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.027-1.381l-.36-.214-3.734.965.988-3.618-.235-.372A9.818 9.818 0 1 1 12 21.818z"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── PriceCard ────────────────────────────────────────────────────────────────
function PriceCard({ label, main, sub, highlight, badge }) {
  return (
    <div style={{
      position: "relative", borderRadius: 16, padding: "18px 14px",
      background: highlight ? "#F59E0B" : "rgba(255,255,255,0.06)",
      border:     highlight ? "none"     : "1px solid rgba(255,255,255,0.11)",
      transform:  highlight ? "scale(1.03)" : "none",
      boxShadow:  highlight ? "0 10px 40px rgba(245,158,11,0.28)" : "none",
      transition: "all 0.3s",
    }}>
      {badge && (
        <div style={{
          position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
          background: "#10B981", color: "#fff", fontSize: 10, fontWeight: 800,
          padding: "2px 12px", borderRadius: 99, whiteSpace: "nowrap",
        }}>{badge}</div>
      )}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", marginBottom: 5,
        color: highlight ? "rgba(30,41,59,0.6)" : "#64748B" }}>{label}</div>
      <div style={{ fontSize: highlight ? 26 : 20, fontWeight: 900, lineHeight: 1.1,
        color: highlight ? "#1E293B" : "#F8FAFC" }}>{main}</div>
      {sub && <div style={{ fontSize: 11, marginTop: 3,
        color: highlight ? "rgba(30,41,59,0.55)" : "#64748B" }}>{sub}</div>}
    </div>
  );
}

// ─── UpsellToggle ─────────────────────────────────────────────────────────────
function UpsellToggle({ icon, label, description, priceCents, checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      width: "100%", textAlign: "left", borderRadius: 14, padding: "13px 15px",
      border: `2px solid ${checked ? "#F59E0B" : "rgba(255,255,255,0.11)"}`,
      background: checked ? "rgba(245,158,11,0.09)" : "rgba(255,255,255,0.03)",
      cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 11,
      transition: "all 0.18s", color: "white", fontFamily: "inherit",
    }}>
      <div style={{
        flexShrink: 0, marginTop: 2, width: 20, height: 20, borderRadius: 6,
        border: `2px solid ${checked ? "#F59E0B" : "rgba(255,255,255,0.28)"}`,
        background: checked ? "#F59E0B" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.18s",
      }}>
        {checked && (
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
            <path d="M2.5 8L6.5 12L13.5 4" stroke="#1E293B" strokeWidth="2.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontWeight: 800, fontSize: 13 }}>{label}</span>
        </div>
        <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, lineHeight: 1.4 }}>{description}</p>
      </div>
      <span style={{ flexShrink: 0, fontWeight: 900, fontSize: 13,
        color: checked ? "#FBBF24" : "#64748B", paddingTop: 2 }}>
        + {brl(priceCents)}
      </span>
    </button>
  );
}

// ─── Feature 6: Foto real de instalação ──────────────────────────────────────
function InstallationPhoto({ url }) {
  if (!url) return null;
  return (
    <div style={{ marginBottom: 20, borderRadius: 18, overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.10)", position: "relative" }}>
      <img src={url} alt="Instalação Sul Placas"
        style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}/>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, rgba(2,6,23,0.85) 0%, transparent 100%)",
        padding: "20px 16px 12px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 13, color: "#FEF3C7", fontWeight: 700 }}>
          📸 Instalação real Sul Placas
        </span>
        <span style={{ fontSize: 11, color: "#94A3B8" }}>— mesmo padrão para o seu projeto</span>
      </div>
    </div>
  );
}

// ─── Feature 7: Bloco ROI ─────────────────────────────────────────────────────
function RoiBlock({ roi }) {
  return (
    <div style={{
      borderRadius: 18, overflow: "hidden", marginBottom: 20,
      border: "1px solid rgba(16,185,129,0.20)",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.08) 100%)",
        padding: "16px 18px",
        borderBottom: "1px solid rgba(16,185,129,0.15)",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#6EE7B7",
          letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
          Retorno do seu investimento
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 900, color: "#F8FAFC", margin: "0 0 6px",
          lineHeight: 1.3 }}>{roi.headline}</h3>
        <p style={{ fontSize: 13, color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>
          {roi.subheadline}
        </p>
      </div>

      {/* KPIs */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        {[
          { icon: "🏊", value: `+${roi.extraDays} dias`,    label: "a mais por ano" },
          { icon: "📅", value: `~${roi.paybackMonths} meses`, label: "para se pagar" },
          { icon: "💰", value: brl(roi.yearlyLeisureGainCents), label: "em lazer/ano" },
          { icon: "⚡", value: brl(roi.savingsMonthCents),  label: "economizados/mês" },
        ].map(({ icon, value, label }, i) => (
          <div key={i} style={{
            padding: "14px 16px", textAlign: "center",
            borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.07)" : "none",
            borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#4ADE80" }}>{value}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Bullets */}
      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        {roi.bullets.map((b, i) => (
          <div key={i} style={{ fontSize: 13, color: "#CBD5E1" }}>{b}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature 8: Assinatura digital ───────────────────────────────────────────
function SignatureBlock({ onSigned, clientName }) {
  const [name,    setName]    = useState("");
  const [agreed,  setAgreed]  = useState(false);
  const [signed,  setSigned]  = useState(false);
  const [signedAt, setSignedAt] = useState(null);
  const [error,   setError]   = useState("");

  const handleSign = useCallback(async () => {
    if (!name.trim()) { setError("Digite seu nome completo para assinar."); return; }
    if (!agreed)      { setError("Marque que leu e concorda com a proposta."); return; }
    setError("");

    const now = new Date();
    setSignedAt(now);
    setSigned(true);

    // Persiste no backend
    try {
      await fetch(`/api/proposals/${PROPOSAL.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureName: name.trim() }),
      });
    } catch { /* falha silenciosa */ }

    onSigned(name.trim(), now);
  }, [name, agreed, onSigned]);

  if (signed) {
    return (
      <div style={{
        borderRadius: 14, padding: "16px 18px", marginBottom: 20,
        background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: "rgba(16,185,129,0.15)", border: "1.5px solid #10B981",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981"
            strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#4ADE80" }}>Proposta assinada digitalmente</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            {name} · {signedAt?.toLocaleDateString("pt-BR")} às {signedAt?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 18, overflow: "hidden", marginBottom: 20,
      border: "1px solid rgba(255,255,255,0.11)",
    }}>
      <div style={{ background: "rgba(255,255,255,0.04)", padding: "14px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B",
          letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
          Aceite digital da proposta
        </div>
        <p style={{ fontSize: 13, color: "#94A3B8", margin: 0, lineHeight: 1.45 }}>
          Assine abaixo para confirmar que leu e concorda com as condições desta proposta.
          Isso não substitui o contrato formal, mas registra seu interesse de forma segura.
        </p>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Campo de nome */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B",
            letterSpacing: "0.08em", textTransform: "uppercase",
            display: "block", marginBottom: 6 }}>
            Seu nome completo
          </label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder={`Ex: ${clientName}`}
            style={{
              width: "100%", padding: "11px 14px",
              background: "rgba(255,255,255,0.05)",
              border: `1.5px solid ${error && !name ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 10, color: "#F8FAFC",
              fontSize: 15, fontFamily: "inherit", outline: "none",
            }}
            onFocus={e => e.target.style.borderColor = "#F59E0B"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
          />
        </div>

        {/* Checkbox de aceite */}
        <button onClick={() => setAgreed(!agreed)} style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          background: "none", border: "none", cursor: "pointer",
          color: "#CBD5E1", textAlign: "left", padding: 0, fontFamily: "inherit",
        }}>
          <div style={{
            flexShrink: 0, marginTop: 2, width: 20, height: 20, borderRadius: 6,
            border: `2px solid ${agreed ? "#F59E0B" : error && !agreed ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.25)"}`,
            background: agreed ? "#F59E0B" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.18s",
          }}>
            {agreed && (
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path d="M2.5 8L6.5 12L13.5 4" stroke="#1E293B" strokeWidth="2.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{ fontSize: 13, lineHeight: 1.45 }}>
            Li e concordo com as condições desta proposta, incluindo valores, prazos e escopo dos serviços.
          </span>
        </button>

        {error && (
          <div style={{ fontSize: 12, color: "#F87171", display: "flex", alignItems: "center", gap: 6 }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleSign} style={{
          padding: "13px", borderRadius: 12, border: "none",
          background: agreed && name.trim() ? "#F59E0B" : "rgba(255,255,255,0.07)",
          color: agreed && name.trim() ? "#1E293B" : "#475569",
          fontWeight: 900, fontSize: 15, cursor: "pointer",
          fontFamily: "inherit", transition: "all 0.2s",
        }}>
          ✍️ Assinar Proposta
        </button>
      </div>
    </div>
  );
}

// ─── Feature 4: Página pós-aprovação ─────────────────────────────────────────
function ThankYouPage({ clientName, signatureName, totalCents, extras }) {
  const waMsg = encodeURIComponent(
    `Olá! Acabei de assinar e aprovar minha proposta Sul Placas! ☀️\n\n` +
    `👤 *${signatureName}*\n` +
    `💰 Valor à vista: *${brl(totalCents)}*\n` +
    (extras.length ? `✅ Adicionais: ${extras.join(", ")}\n\n` : "\n") +
    `Aguardo contato para agendar a instalação!`
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(150deg, #020617 0%, #0F172A 55%, #020617 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "32px 20px",
    }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center",
        animation: "fadeUp 0.5s ease both" }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Ícone de sucesso animado */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px",
          background: "rgba(16,185,129,0.12)", border: "2px solid #10B981",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 40px rgba(16,185,129,0.20)",
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
            stroke="#10B981" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 7,
          background: "#F59E0B", color: "#1E293B", padding: "6px 16px",
          borderRadius: 99, fontWeight: 900, fontSize: 14, marginBottom: 20 }}>
          <SunIcon size={16}/> Sul Placas
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px", lineHeight: 1.2 }}>
          Proposta aceita! 🎉
        </h1>
        <p style={{ fontSize: 14, color: "#94A3B8", margin: "0 0 28px", lineHeight: 1.6 }}>
          Obrigado, <strong style={{ color: "#FBBF24" }}>{clientName}</strong>!{" "}
          Recebemos sua confirmação e nossa equipe entrará em contato em{" "}
          <strong style={{ color: "#F8FAFC" }}>até 2 horas</strong> para agendar a vistoria técnica.
        </p>

        {/* Próximos passos */}
        <div style={{
          borderRadius: 16, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.09)",
          marginBottom: 24, textAlign: "left",
        }}>
          {[
            { icon: "📞", step: "1", title: "Contato em até 2h", desc: "Nossa equipe liga para confirmar os detalhes" },
            { icon: "🔍", step: "2", title: "Vistoria técnica", desc: "Avaliamos o local para a instalação ideal" },
            { icon: "🔧", step: "3", title: "Instalação", desc: "Equipe especializada, rápida e sem bagunça" },
            { icon: "☀️", step: "4", title: "Curtir!", desc: "Piscina aquecida por até 270 dias no ano" },
          ].map(({ icon, step, title, desc }, i, arr) => (
            <div key={step} style={{
              padding: "14px 16px",
              borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
              background: i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
              display: "flex", gap: 12, alignItems: "flex-start",
            }}>
              <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#F8FAFC", marginBottom: 2 }}>
                  <span style={{ color: "#F59E0B", marginRight: 6 }}>{step}.</span>{title}
                </div>
                <div style={{ fontSize: 12, color: "#64748B" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA WhatsApp */}
        <a href={`https://wa.me/${EMPRESA_WHATSAPP}?text=${waMsg}`}
          target="_blank" rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "16px", borderRadius: 14,
            background: "#22C55E", color: "#fff",
            fontSize: 16, fontWeight: 900, textDecoration: "none",
            boxShadow: "0 8px 24px rgba(34,197,94,0.28)",
            marginBottom: 12,
          }}>
          <WhatsAppIcon/> Falar com a Sul Placas
        </a>
        <p style={{ fontSize: 12, color: "#475569" }}>
          Ou aguarde — nossa equipe entra em contato proativamente.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function ProposalPageV2() {
  const [thermalCover,   setThermalCover]   = useState(PROPOSAL.upsells.thermalCover.selected);
  const [wifiController, setWifiController] = useState(PROPOSAL.upsells.wifiController.selected);
  const [signatureName,  setSignatureName]  = useState(null);
  const [approved,       setApproved]       = useState(false);

  const extrasCents    = (thermalCover ? THERMAL_PRICE_CENTS : 0) + (wifiController ? WIFI_PRICE_CENTS : 0);
  const totalCashCents = PROPOSAL.pricing.totalCashCents + extrasCents;

  const selectedExtras = [
    thermalCover   && "Capa Térmica",
    wifiController && "Controlador Wi-Fi",
  ].filter(Boolean);

  // Persiste upsells (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        await fetch(`/api/proposals/${PROPOSAL.id}/upsells`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thermalCover, wifiController }),
        });
      } catch {}
    }, 1500);
    return () => clearTimeout(t);
  }, [thermalCover, wifiController]);

  // Feature 4: redireciona para tela de confirmação
  const handleApprove = useCallback(async () => {
    try {
      await fetch(`/api/proposals/${PROPOSAL.id}/approve`, { method: "PATCH" });
    } catch {}
    setApproved(true);
  }, []);

  // Feature 8: assinatura concluída → ativa CTA
  const handleSigned = useCallback((name) => {
    setSignatureName(name);
  }, []);

  // Feature 4: tela pós-aprovação
  if (approved) {
    return (
      <ThankYouPage
        clientName={PROPOSAL.client.name}
        signatureName={signatureName || PROPOSAL.client.name}
        totalCents={totalCashCents}
        extras={selectedExtras}
      />
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(150deg, #020617 0%, #0F172A 55%, #020617 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "white", overflowX: "hidden",
    }}>
      <style>{`* { box-sizing: border-box; } @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* Blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 360, height: 360,
          background: "radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)", borderRadius: "50%" }}/>
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 280, height: 280,
          background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)", borderRadius: "50%" }}/>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto",
        padding: "32px 16px 160px" }}>

        {/* ══ HEADER — Feature 3: cidade ══════════════════════════════ */}
        <div style={{ textAlign: "center", marginBottom: 28, animation: "fadeUp 0.4s ease both" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#F59E0B", color: "#1E293B",
            padding: "7px 18px", borderRadius: 99, fontWeight: 900, fontSize: 16, marginBottom: 16,
          }}>
            <SunIcon/> Sul Placas
          </div>
          <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 4px",
            textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
            Proposta exclusiva para
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "#FBBF24", margin: "0 0 6px", lineHeight: 1.1 }}>
            {PROPOSAL.client.name}
          </h1>
          {/* Feature 3 — cidade na saudação */}
          <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 12px" }}>
            📍 {PROPOSAL.client.city}
          </p>
          <div style={{
            display: "inline-flex", flexWrap: "wrap", justifyContent: "center",
            alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.11)",
            padding: "6px 16px", borderRadius: 99, fontSize: 12,
          }}>
            <span style={{ color: "#94A3B8" }}>🏊</span>
            <span style={{ fontWeight: 700, color: "#F8FAFC" }}>
              {PROPOSAL.pool.lengthM}m × {PROPOSAL.pool.widthM}m — {PROPOSAL.pool.areaM2} m²
            </span>
          </div>
        </div>

        {/* ══ PRICING ═════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 22, animation: "fadeUp 0.4s 0.05s ease both" }}>
          <p style={{ fontSize: 10, color: "#64748B", letterSpacing: "0.14em",
            textTransform: "uppercase", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
            Condições de pagamento
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <PriceCard label="À Vista" main={brl(totalCashCents)}
              sub="Melhor custo-benefício" highlight badge="✨ Recomendado"/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <PriceCard label="12× no cartão"
                main={installment(totalCashCents, RATE_12X, 12)} sub="Taxa 12%"/>
              <PriceCard label="18× no cartão"
                main={installment(totalCashCents, RATE_18X, 18)} sub="Taxa 16%"/>
            </div>
          </div>
        </div>

        {/* ══ UPSELLS ═════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 22, animation: "fadeUp 0.4s 0.10s ease both" }}>
          <p style={{ fontSize: 10, color: "#64748B", letterSpacing: "0.14em",
            textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
            Personalize seu projeto
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <UpsellToggle icon="🌡️" label="Capa Térmica"
              description="Reduz até 70% da evaporação e mantém a temperatura por mais tempo."
              priceCents={THERMAL_PRICE_CENTS} checked={thermalCover} onChange={setThermalCover}/>
            <UpsellToggle icon="📶" label="Controlador Wi-Fi"
              description="Controle a temperatura pelo celular, de qualquer lugar e a qualquer hora."
              priceCents={WIFI_PRICE_CENTS} checked={wifiController} onChange={setWifiController}/>
          </div>
        </div>

        {/* ══ Feature 6: Foto de instalação ═══════════════════════════ */}
        <div style={{ animation: "fadeUp 0.4s 0.15s ease both" }}>
          <InstallationPhoto url={PROPOSAL.installationPhotoUrl}/>
        </div>

        {/* ══ O QUE ESTÁ INCLUSO ══════════════════════════════════════ */}
        <div style={{ marginBottom: 22, borderRadius: 18, padding: "18px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
          animation: "fadeUp 0.4s 0.18s ease both" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#64748B", margin: "0 0 12px" }}>
            O que está incluso
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Placas coletoras KS com garantia de 5 anos",
              "Instalação completa com canos Tigre — qualidade e durabilidade garantidas",
              "Automatização da casa de máquinas para controle eficiente do sistema",
              "Configuração, testes e treinamento para pleno funcionamento",
              "Garantia do fabricante e instalação profissional especializada",
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <CheckCircle/>
                <span style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.45 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ Feature 7: ROI ══════════════════════════════════════════ */}
        <div style={{ animation: "fadeUp 0.4s 0.20s ease both" }}>
          <RoiBlock roi={PROPOSAL.roi}/>
        </div>

        {/* ══ Gatilho emocional ═══════════════════════════════════════ */}
        <div style={{
          borderRadius: 18, padding: "18px", marginBottom: 20,
          background: "linear-gradient(135deg, rgba(30,58,138,0.45) 0%, rgba(15,23,42,0.75) 100%)",
          border: "1px solid rgba(59,130,246,0.18)",
          animation: "fadeUp 0.4s 0.22s ease both",
        }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>☀️</span>
            <div>
              <p style={{ fontWeight: 900, fontSize: 14, margin: "0 0 7px", lineHeight: 1.4 }}>
                No Rio Grande do Sul, sem aquecimento, você usa sua piscina em média{" "}
                <span style={{ color: "#F87171" }}>90 dias por ano</span>.
              </p>
              <p style={{ color: "#CBD5E1", fontSize: 13, margin: "0 0 14px", lineHeight: 1.5 }}>
                Com o sistema Sul Placas, esse tempo sobe para até{" "}
                <strong style={{ color: "#FBBF24", fontSize: 15 }}>270 dias de lazer</strong> — 3× mais.
              </p>
              {[
                { label: "Sem aquecimento", days: "~90 dias", w: "33%", c: "rgba(239,68,68,0.7)" },
                { label: "Com Sul Placas",  days: "270 dias", w: "99%", c: "#F59E0B" },
              ].map(({ label, days, w, c }) => (
                <div key={label} style={{ marginBottom: 7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    fontSize: 11, color: "#94A3B8", marginBottom: 3 }}>
                    <span>{label}</span><span>{days}</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: w, background: c, borderRadius: 99 }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ Validade ════════════════════════════════════════════════ */}
        <div style={{
          borderRadius: 14, padding: "14px 18px", marginBottom: 20,
          background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)",
          display: "flex", alignItems: "center", gap: 14,
          animation: "fadeUp 0.4s 0.24s ease both",
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>📋</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#FBBF24",
              letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
              Proposta válida até
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#FEF3C7" }}>
              {expireLabel(PROPOSAL.expiresAt)}
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
              Condições de pagamento garantidas por 7 dias.
            </div>
          </div>
        </div>

        {/* ══ Social proof ════════════════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10,
          marginBottom: 28, animation: "fadeUp 0.4s 0.26s ease both" }}>
          {[
            { icon: "🏆", v: "10+ anos",  s: "de experiência" },
            { icon: "✅", v: "500+",       s: "instalações" },
            { icon: "🔧", v: "5 anos",     s: "garantia nas placas" },
          ].map(({ icon, v, s }) => (
            <div key={v} style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: "12px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontWeight: 900, fontSize: 13 }}>{v}</div>
              <div style={{ color: "#64748B", fontSize: 11 }}>{s}</div>
            </div>
          ))}
        </div>

        {/* ══ Feature 8: Assinatura digital ═══════════════════════════ */}
        <div style={{ animation: "fadeUp 0.4s 0.28s ease both" }}>
          <SignatureBlock onSigned={handleSigned} clientName={PROPOSAL.client.name}/>
        </div>
      </div>

      {/* ══ CTA FLUTUANTE ═══════════════════════════════════════════════ */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        padding: "18px 16px 16px",
        background: "linear-gradient(to top, #020617 55%, transparent)",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {extrasCents > 0 && (
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 8, padding: "5px 12px",
              background: "rgba(245,158,11,0.08)", borderRadius: 8,
              border: "1px solid rgba(245,158,11,0.18)",
            }}>
              <span style={{ color: "#94A3B8", fontSize: 12 }}>Total com adicionais</span>
              <strong style={{ color: "#FBBF24", fontSize: 13 }}>{brl(totalCashCents)}</strong>
            </div>
          )}
          <button onClick={handleApprove}
            disabled={!signatureName}
            style={{
              width: "100%", background: signatureName ? "#F59E0B" : "rgba(245,158,11,0.30)",
              color: signatureName ? "#1E293B" : "#78716C",
              fontWeight: 900, fontSize: 17, padding: "17px 24px",
              borderRadius: 16, border: "none",
              cursor: signatureName ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: signatureName ? "0 8px 32px rgba(245,158,11,0.35)" : "none",
              transition: "all 0.2s", fontFamily: "inherit",
            }}>
            {signatureName ? "☀️ Aprovar e Agendar Instalação" : "✍️ Assine acima para aprovar"}
          </button>
          {!signatureName && (
            <p style={{ textAlign: "center", color: "#475569", fontSize: 11, margin: "6px 0 0" }}>
              Assine a proposta acima para liberar o botão de aprovação
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
