// pages/admin/index.tsx  (Next.js)
// Sul Placas — Painel Admin Mobile
// Formulário de criação de orçamento + resultado com links

"use client";

import { useState, useRef } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Region = "PORTO_ALEGRE" | "REGIAO_METRO" | "INTERIOR_LITORAL";

interface ProposalResult {
  proposalId: string;
  proposalLink: string;
  whatsappLink: string;
  client: { name: string; whatsapp: string };
  pricing: {
    areaM2: number;
    totalCash: string;
    installment12x: string;
    installment18x: string;
  };
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const REGIONS: { value: Region; label: string; desc: string; badge: string }[] = [
  { value: "PORTO_ALEGRE",     label: "Porto Alegre",       desc: "POA e arredores", badge: "Grátis" },
  { value: "REGIAO_METRO",     label: "Região Metropolitana", desc: "+R$ 150,00",    badge: "+150" },
  { value: "INTERIOR_LITORAL", label: "Interior / Litoral",  desc: "+R$ 400,00",     badge: "+400" },
];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// ─── Ícones SVG ───────────────────────────────────────────────────────────────

const IconSun = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="5" fill="currentColor"/>
    {[0,45,90,135,180,225,270,315].map(d => {
      const r = (d * Math.PI) / 180;
      return <line key={d} x1={12+Math.cos(r)*7} y1={12+Math.sin(r)*7}
               x2={12+Math.cos(r)*10} y2={12+Math.sin(r)*10}
               stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>;
    })}
  </svg>
);

const IconCopy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const IconWhatsApp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.57a.5.5 0 0 0 .61.61l5.712-1.476A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.027-1.381l-.36-.214-3.734.965.988-3.618-.235-.372A9.818 9.818 0 1 1 12 21.818z"/>
  </svg>
);

const IconPDF = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
    <polyline points="9 14 12 17 15 14"/>
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─── Campo de input reutilizável ──────────────────────────────────────────────

interface FieldProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  error?: string;
}

function Field({ label, id, type = "text", value, onChange, placeholder, suffix, error }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8",
        letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id} type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: suffix ? "12px 48px 12px 14px" : "12px 14px",
            background: "rgba(255,255,255,0.06)",
            border: `1.5px solid ${error ? "#EF4444" : "rgba(255,255,255,0.14)"}`,
            borderRadius: 10, color: "#F8FAFC",
            fontSize: 16, fontFamily: "inherit",
            outline: "none", transition: "border-color 0.2s",
            WebkitAppearance: "none",
          }}
          onFocus={e => e.target.style.borderColor = "#F59E0B"}
          onBlur={e => e.target.style.borderColor = error ? "#EF4444" : "rgba(255,255,255,0.14)"}
        />
        {suffix && (
          <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
            color: "#64748B", fontSize: 13, fontWeight: 600, pointerEvents: "none" }}>
            {suffix}
          </span>
        )}
      </div>
      {error && <span style={{ fontSize: 11, color: "#EF4444" }}>{error}</span>}
    </div>
  );
}

// ─── Botão de copiar com feedback ─────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "10px 16px", borderRadius: 10, border: "none",
      background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.08)",
      color: copied ? "#6EE7B7" : "#CBD5E1",
      fontSize: 13, fontWeight: 600, cursor: "pointer",
      transition: "all 0.2s", fontFamily: "inherit",
      flex: 1,
    }}>
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? "Copiado!" : "Copiar Link"}
    </button>
  );
}

// ─── Resultado da proposta gerada ─────────────────────────────────────────────

function ProposalResult({ result, onNew }: { result: ProposalResult; onNew: () => void }) {
  const handleDownloadPDF = async () => {
    const res = await fetch(`${API}/proposals/${result.proposalId}/pdf`);
    if (!res.ok) return alert("Erro ao gerar PDF");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposta-sulplacas-${result.client.name.replace(/\s+/g,"-").toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header de sucesso */}
      <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(16,185,129,0.15)", border: "2px solid #10B981",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
        }}>
          <IconCheck />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: "#F8FAFC", margin: "0 0 4px" }}>
          Proposta gerada!
        </h2>
        <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>
          Para <strong style={{ color: "#F8FAFC" }}>{result.client.name}</strong>
        </p>
      </div>

      {/* Resumo de preços */}
      <div style={{
        background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
        borderRadius: 14, padding: "16px 18px",
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center",
      }}>
        {[
          { label: "À Vista",  value: result.pricing.totalCash },
          { label: "12×",      value: result.pricing.installment12x },
          { label: "18×",      value: result.pricing.installment18x },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#F59E0B" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Link da proposta */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B",
          textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Link da Proposta
        </span>
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 10, padding: "10px 14px",
          fontSize: 13, color: "#F59E0B", wordBreak: "break-all",
          fontFamily: "monospace",
        }}>
          {result.proposalLink}
        </div>

        {/* Botões de ação */}
        <div style={{ display: "flex", gap: 8 }}>
          <CopyButton text={result.proposalLink} />
          <a
            href={result.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 16px", borderRadius: 10, border: "none",
              background: "#22C55E", color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              textDecoration: "none", fontFamily: "inherit",
            }}
          >
            <IconWhatsApp /> Enviar WhatsApp
          </a>
        </div>

        {/* Baixar PDF */}
        <button onClick={handleDownloadPDF} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "10px 16px", borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "transparent", color: "#94A3B8",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", transition: "all 0.2s",
        }}
          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "#F59E0B"; (e.target as HTMLElement).style.color = "#F59E0B"; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.target as HTMLElement).style.color = "#94A3B8"; }}
        >
          <IconPDF /> Baixar Proposta em PDF
        </button>
      </div>

      {/* Botão nova proposta */}
      <button onClick={onNew} style={{
        padding: "13px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.15)",
        background: "transparent", color: "#F8FAFC",
        fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        marginTop: 4, transition: "border-color 0.2s",
      }}>
        + Nova Proposta
      </button>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function AdminPage() {
  // Formulário
  const [name,     setName]     = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [length,   setLength]   = useState("");
  const [width,    setWidth]    = useState("");
  const [region,   setRegion]   = useState<Region>("PORTO_ALEGRE");

  // Estado
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<ProposalResult | null>(null);
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  // Preview calculado ao vivo
  const areaPreview = length && width
    ? parseFloat(length) * parseFloat(width)
    : null;

  // ── Validação ────────────────────────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())                          e.name = "Nome obrigatório";
    if (!whatsapp.replace(/\D/g,"").match(/^\d{10,11}$/)) e.whatsapp = "Número inválido (10 ou 11 dígitos)";
    if (!length || parseFloat(length) <= 0)    e.length = "Comprimento inválido";
    if (!width  || parseFloat(width)  <= 0)    e.width  = "Largura inválida";
    return e;
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(`${API}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:    name.trim(),
          whatsapp: whatsapp.replace(/\D/g,""),
          lengthM:  parseFloat(length),
          widthM:   parseFloat(width),
          region,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Erro desconhecido");
      }
      const data: ProposalResult = await res.json();
      setResult(data);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setName(""); setWhatsapp(""); setLength(""); setWidth("");
    setRegion("PORTO_ALEGRE"); setErrors({});
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100svh",
      background: "linear-gradient(160deg, #020617 0%, #0F172A 60%, #020617 100%)",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: "#F8FAFC",
      padding: "0 0 40px",
    }}>

      {/* Topbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(2,6,23,0.80)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{
          background: "#F59E0B", color: "#1E293B",
          padding: "5px 12px", borderRadius: 99,
          fontWeight: 900, fontSize: 14,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <IconSun /> Sul Placas
        </div>
        <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
          Admin · Novo orçamento
        </span>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>

        {result ? (
          <ProposalResult result={result} onNew={handleReset} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

            {/* Título */}
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px" }}>
                Novo Orçamento
              </h1>
              <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
                Preencha os dados para gerar o link da proposta.
              </p>
            </div>

            {/* ── Dados do cliente ──────────────────────────────────── */}
            <section>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#475569",
                letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 14 }}>
                Cliente
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Nome completo" id="name" value={name} onChange={setName}
                  placeholder="Ex: Carlos Mendonça" error={errors.name} />
                <Field label="WhatsApp" id="whatsapp" type="tel" value={whatsapp}
                  onChange={setWhatsapp} placeholder="51 99999-0000" error={errors.whatsapp} />
              </div>
            </section>

            {/* ── Dados da piscina ──────────────────────────────────── */}
            <section>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#475569",
                letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 14 }}>
                Piscina
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Comprimento" id="length" type="number" value={length}
                  onChange={setLength} placeholder="6" suffix="m" error={errors.length} />
                <Field label="Largura" id="width" type="number" value={width}
                  onChange={setWidth} placeholder="3" suffix="m" error={errors.width} />
              </div>

              {/* Preview de área ao vivo */}
              {areaPreview !== null && (
                <div style={{
                  marginTop: 10, padding: "8px 14px", borderRadius: 8,
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)",
                  fontSize: 13, color: "#FBBF24", display: "flex", justifyContent: "space-between",
                }}>
                  <span>Área calculada</span>
                  <strong>{areaPreview.toFixed(2)} m²
                    {areaPreview > 18 && (
                      <span style={{ color: "#94A3B8", fontWeight: 400 }}>
                        {" "}(+{(areaPreview - 18).toFixed(2)} m² excedente)
                      </span>
                    )}
                  </strong>
                </div>
              )}
            </section>

            {/* ── Região ────────────────────────────────────────────── */}
            <section>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#475569",
                letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 14 }}>
                Região de deslocamento
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {REGIONS.map(r => (
                  <button key={r.value} onClick={() => setRegion(r.value)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "13px 16px", borderRadius: 12,
                    border: `2px solid ${region === r.value ? "#F59E0B" : "rgba(255,255,255,0.10)"}`,
                    background: region === r.value ? "rgba(245,158,11,0.10)" : "rgba(255,255,255,0.04)",
                    color: "#F8FAFC", cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.18s",
                  }}>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{r.desc}</div>
                    </div>
                    <div style={{
                      background: region === r.value ? "#F59E0B" : "rgba(255,255,255,0.08)",
                      color: region === r.value ? "#1E293B" : "#94A3B8",
                      fontSize: 11, fontWeight: 700,
                      padding: "3px 10px", borderRadius: 99,
                      transition: "all 0.18s",
                    }}>
                      {r.badge}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* ── Botão submit ──────────────────────────────────────── */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: "16px", borderRadius: 14, border: "none",
                background: loading ? "rgba(245,158,11,0.50)" : "#F59E0B",
                color: "#1E293B", fontWeight: 900, fontSize: 17,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "background 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
                  Gerando…
                </>
              ) : (
                "☀️  Gerar Proposta"
              )}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          </div>
        )}
      </div>
    </div>
  );
}
