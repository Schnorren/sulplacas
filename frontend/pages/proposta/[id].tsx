// frontend/pages/proposta/[id].tsx
// Substitui o arquivo existente

import { useState } from 'react';
import Head from 'next/head';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ── Types ──────────────────────────────────────────────────────────────────

interface UpsellProduct {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  active: boolean;
}

interface Pricing {
  areaM2: number;
  totalCash: string;
  installment12x: string;
  installment18x: string;
}

interface ProposalData {
  id: string;
  clientCity: string;
  displacementCostCents: number;
  areaM2: number;
  lengthM: number;
  widthM: number;
  selectedUpsellIds: string[];
  availableUpsells: UpsellProduct[];
  pricing: Pricing;
  client: { name: string; whatsapp: string };
  status: string;
}

// ── SSR ────────────────────────────────────────────────────────────────────

export async function getServerSideProps({ params }: { params: { id: string } }) {
  try {
    const SSR_API = process.env.INTERNAL_API_URL || 'http://backend:3001/api';
    const res = await fetch(`${SSR_API}/proposals/${params.id}`);
    if (!res.ok) return { notFound: true };
    const proposal: ProposalData = await res.json();
    return { props: { proposal } };
  } catch {
    return { notFound: true };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

// ── Componente ─────────────────────────────────────────────────────────────

export default function ProposalPage({ proposal }: { proposal: ProposalData }) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(proposal.selectedUpsellIds),
  );
  const [pricing, setPricing] = useState<Pricing>(proposal.pricing);
  const [saving, setSaving] = useState(false);
  const [approved, setApproved] = useState(proposal.status === 'APPROVED');

  const whatsapp = process.env.NEXT_PUBLIC_EMPRESA_WHATSAPP ?? '5551999999999';

  // Toggle upsell e envia para o backend
  async function toggleUpsell(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
    setSaving(true);

    const res = await fetch(`${API}/proposals/${proposal.id}/upsells`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedUpsellIds: Array.from(next) }),
    });

    if (res.ok) {
      const data = await res.json();
      setPricing(data.pricing);
    }
    setSaving(false);
  }

  async function handleApprove() {
    await fetch(`${API}/proposals/${proposal.id}/approve`, { method: 'PATCH' });
    setApproved(true);
  }

  const whatsappMsg = encodeURIComponent(
    `Olá! Quero aprovar meu orçamento Sul Placas.\nProposta: ${proposal.id}\nTotal: ${pricing.totalCash}`,
  );

  return (
    <>
      <Head>
        <title>Orçamento Sul Placas — {proposal.client.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.page}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.logo}>☀️ Sul Placas</div>
          <p style={styles.tagline}>Aquecimento Solar de Piscinas</p>
        </header>

        {/* Saudação */}
        <section style={styles.card}>
          <h1 style={styles.h1}>Olá, {proposal.client.name}!</h1>
          <p style={styles.text}>
            Preparamos este orçamento personalizado para a sua piscina em{' '}
            <strong>{proposal.clientCity}</strong>.
          </p>
          <div style={styles.specRow}>
            <Spec label="Dimensões" value={`${proposal.lengthM}m × ${proposal.widthM}m`} />
            <Spec label="Área" value={`${proposal.areaM2} m²`} />
            {proposal.displacementCostCents > 0 && (
              <Spec label="Deslocamento" value={fmt(proposal.displacementCostCents)} />
            )}
          </div>
        </section>

        {/* Preço */}
        <section style={styles.priceCard}>
          <p style={styles.priceLabel}>Valor à Vista</p>
          <p style={styles.priceValue}>{pricing.totalCash}</p>
          <div style={styles.installRow}>
            <span style={styles.installBadge}>12x {pricing.installment12x}</span>
            <span style={styles.installBadge}>18x {pricing.installment18x}</span>
          </div>
          {saving && <p style={styles.savingText}>Atualizando...</p>}
        </section>

        {/* Upsells */}
        {proposal.availableUpsells.length > 0 && (
          <section style={styles.card}>
            <h2 style={styles.h2}>Adicione ao seu orçamento</h2>
            <p style={styles.text}>Selecione os itens que deseja incluir:</p>

            {proposal.availableUpsells.map((u) => {
              const isSelected = selected.has(u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => toggleUpsell(u.id)}
                  style={{
                    ...styles.upsellItem,
                    border: isSelected ? '2px solid #F59E0B' : '2px solid #e5e7eb',
                    background: isSelected ? '#fffbeb' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={styles.upsellCheck}>
                    <div style={{
                      ...styles.checkbox,
                      background: isSelected ? '#F59E0B' : '#e5e7eb',
                      color: '#fff',
                    }}>
                      {isSelected ? '✓' : ''}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 15 }}>{u.name}</strong>
                    {u.description && (
                      <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>{u.description}</p>
                    )}
                  </div>
                  <div style={styles.upsellPrice}>+ {fmt(u.priceCents)}</div>
                </div>
              );
            })}
          </section>
        )}

        {/* CTA */}
        <section style={styles.card}>
          {approved ? (
            <div style={styles.approvedBox}>
              <p style={{ fontSize: 20 }}>🎉</p>
              <p style={{ fontWeight: 700, fontSize: 16 }}>Orçamento aprovado!</p>
              <p style={{ fontSize: 13, color: '#166534' }}>
                Nossa equipe entrará em contato em breve.
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={handleApprove}
                style={styles.btnPrimary}
              >
                ✅ Aprovar Orçamento
              </button>
              <a
                href={`https://wa.me/${whatsapp}?text=${whatsappMsg}`}
                target="_blank"
                rel="noreferrer"
                style={styles.btnWhatsapp}
              >
                💬 Falar no WhatsApp
              </a>
            </>
          )}
        </section>

        <footer style={styles.footer}>
          <p>Sul Placas — Aquecimento Solar</p>
          <p style={{ fontSize: 11, color: '#9ca3af' }}>
            Orçamento válido por 48h · {proposal.clientCity}
          </p>
        </footer>
      </div>
    </>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{value}</p>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    maxWidth: 480,
    margin: '0 auto',
    padding: '0 0 40px',
    background: '#f9fafb',
    minHeight: '100vh',
  },
  header: {
    background: '#020617',
    padding: '24px 20px 20px',
    textAlign: 'center',
  },
  logo: {
    fontSize: 22,
    fontWeight: 800,
    color: '#F59E0B',
    letterSpacing: '-0.5px',
  },
  tagline: {
    fontSize: 12,
    color: '#94a3b8',
    margin: '4px 0 0',
  },
  card: {
    background: '#fff',
    margin: '12px 16px',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  priceCard: {
    background: '#020617',
    margin: '12px 16px',
    borderRadius: 16,
    padding: 24,
    textAlign: 'center',
  },
  h1: { fontSize: 20, fontWeight: 700, margin: '0 0 8px' },
  h2: { fontSize: 16, fontWeight: 700, margin: '0 0 6px' },
  text: { fontSize: 14, color: '#374151', margin: '0 0 12px' },
  specRow: { display: 'flex', justifyContent: 'space-around', marginTop: 12, gap: 8 },
  priceLabel: { color: '#94a3b8', fontSize: 13, margin: '0 0 4px' },
  priceValue: { color: '#F59E0B', fontSize: 36, fontWeight: 800, margin: '0 0 12px' },
  installRow: { display: 'flex', justifyContent: 'center', gap: 12 },
  installBadge: {
    background: 'rgba(245,158,11,0.15)',
    color: '#F59E0B',
    borderRadius: 8,
    padding: '4px 12px',
    fontSize: 13,
    fontWeight: 600,
  },
  savingText: { color: '#94a3b8', fontSize: 12, marginTop: 8 },
  upsellItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    transition: 'all 0.15s',
  },
  upsellCheck: { flexShrink: 0 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    transition: 'all 0.15s',
  },
  upsellPrice: { fontSize: 14, fontWeight: 700, color: '#374151', flexShrink: 0 },
  btnPrimary: {
    display: 'block',
    width: '100%',
    background: '#F59E0B',
    color: '#020617',
    border: 'none',
    borderRadius: 12,
    padding: '16px 0',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    marginBottom: 10,
  },
  btnWhatsapp: {
    display: 'block',
    width: '100%',
    background: '#16a34a',
    color: '#fff',
    borderRadius: 12,
    padding: '14px 0',
    fontSize: 15,
    fontWeight: 700,
    textAlign: 'center',
    textDecoration: 'none',
  },
  approvedBox: {
    textAlign: 'center',
    background: '#f0fdf4',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #86efac',
  },
  footer: {
    textAlign: 'center',
    padding: '20px 16px 0',
    fontSize: 13,
    color: '#6b7280',
  },
};
