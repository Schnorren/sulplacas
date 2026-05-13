// frontend/pages/proposta/[id].tsx

import { useState } from 'react';
import Head from 'next/head';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface UpsellProduct {
  id: string; name: string; description: string; priceCents: number; active: boolean;
}
interface Pricing {
  areaM2: number; totalCash: string; installment12x: string; installment18x: string;
}
interface ProposalData {
  id: string; proposalCode: string; clientCity: string;
  displacementCostCents: number; areaM2: number; lengthM: number; widthM: number;
  selectedUpsellIds: string[]; availableUpsells: UpsellProduct[];
  pricing: Pricing; client: { name: string; whatsapp: string };
  status: string; expiresAt?: string;
}

export async function getServerSideProps({ params }: { params: { id: string } }) {
  try {
    const SSR_API = process.env.INTERNAL_API_URL || 'http://backend:3001/api';
    const res = await fetch(`${SSR_API}/proposals/${params.id}`);
    if (!res.ok) return { notFound: true };
    return { props: { proposal: await res.json() } };
  } catch { return { notFound: true }; }
}

const fmt = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

export default function ProposalPage({ proposal }: { proposal: ProposalData }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(proposal.selectedUpsellIds));
  const [pricing, setPricing]   = useState<Pricing>(proposal.pricing);
  const [saving, setSaving]     = useState(false);
  const [approved, setApproved] = useState(proposal.status === 'APPROVED');
  const [revertedMsg, setRevertedMsg] = useState(false);

  const whatsapp = process.env.NEXT_PUBLIC_EMPRESA_WHATSAPP ?? '5551999999999';
  const firstName = proposal.client.name.split(' ')[0];

  const isExpired = proposal.expiresAt ? new Date(proposal.expiresAt) < new Date() : false;
  const daysLeft = proposal.expiresAt
    ? Math.max(0, Math.ceil((new Date(proposal.expiresAt).getTime() - Date.now()) / 86400000))
    : null;

  async function toggleUpsell(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
    setSaving(true);
    const res = await fetch(`${API}/proposals/${proposal.id}/upsells`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedUpsellIds: Array.from(next) }),
    });
    if (res.ok) {
      const data = await res.json();
      setPricing(data.pricing);
      if (data.statusReverted) {
        setApproved(false); setRevertedMsg(true);
        setTimeout(() => setRevertedMsg(false), 5000);
      }
    }
    setSaving(false);
  }

  async function handleApprove() {
    const res = await fetch(`${API}/proposals/${proposal.id}/approve`, { method: 'PATCH' });
    if (res.ok) { setApproved(true); setRevertedMsg(false); }
  }

  const waMsg = encodeURIComponent(
    `Olá! Quero aprovar meu orçamento Sul Placas.\nProposta: ${proposal.proposalCode}\nTotal: ${pricing.totalCash}`
  );

  return (
    <>
      <Head>
        <title>Proposta Sul Placas — {proposal.client.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={`Orçamento personalizado de aquecimento solar para sua piscina em ${proposal.clientCity}`} />
      </Head>

      <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: 480, margin: '0 auto', background: '#f8fafc', color: '#111827', minHeight: '100vh', paddingBottom: 48 }}>

        {/* HEADER */}
        <header style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)', position: 'relative', overflow: 'hidden' }}>
          {!isExpired && daysLeft !== null && daysLeft <= 3 && (
            <div style={{ background: '#dc2626', padding: '8px 20px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>
              ⏰ OFERTA EXPIRA EM {daysLeft === 0 ? 'HOJE' : `${daysLeft} DIA${daysLeft > 1 ? 'S' : ''}`}
            </div>
          )}
          <div style={{ padding: '28px 20px 24px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F59E0B', borderRadius: 12, padding: '7px 18px', marginBottom: 16 }}>
              <span style={{ fontSize: 18 }}>☀️</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Sul Placas</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 16px', letterSpacing: 0.5 }}>AQUECIMENTO SOLAR DE PISCINAS</p>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 6px', lineHeight: 1.3 }}>
              Olá, {firstName}! 👋
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>
              Sua piscina de <strong style={{ color: '#F59E0B' }}>{proposal.areaM2} m²</strong> em{' '}
              <strong style={{ color: '#fff' }}>{proposal.clientCity}</strong> pronta para aquecimento solar.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' as const }}>
              <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
                {proposal.proposalCode}
              </span>
              {proposal.expiresAt && (
                <span style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 20, padding: '3px 12px', fontSize: 11 }}>
                  Válida até {fmtDate(proposal.expiresAt)}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* COMO FUNCIONA */}
        <section style={{ background: '#fff', margin: '12px 16px', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 16px', color: '#0f172a', textAlign: 'center' }}>
            ☀️ Como funciona o aquecimento solar
          </h2>
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { icon: '🔧', title: 'Instalação', desc: 'Equipe especializada instala placas e tubulação completa em 1 dia' },
              { icon: '🌡️', title: 'Aquecimento', desc: 'O sol aquece a água que circula pelas placas coletoras no telhado' },
              { icon: '📱', title: 'Controle', desc: 'Programe horários pelo app e controle do celular' },
            ].map((step, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: '0 8px', position: 'relative' as const }}>
                {i < 2 && <div style={{ position: 'absolute' as const, right: 0, top: 20, width: 1, height: 40, background: '#e5e7eb' }} />}
                <div style={{ width: 40, height: 40, background: '#fffbeb', border: '2px solid #fde68a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 18 }}>
                  {step.icon}
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{step.title}</p>
                <p style={{ fontSize: 11, color: '#6b7280', margin: 0, lineHeight: 1.4 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* O QUE ESTÁ INCLUSO */}
        <section style={{ background: '#fff', margin: '12px 16px', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>✅ O que está incluso</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 14px' }}>
            Sistema dimensionado para {proposal.lengthM}m × {proposal.widthM}m ({proposal.areaM2} m²)
          </p>
          {[
            { icon: '☀️', title: 'Placas coletoras', desc: `Dimensionadas especificamente para ${proposal.areaM2} m² — máxima eficiência` },
            { icon: '🔩', title: 'Tubulação premium completa', desc: 'Alta qualidade com fixações e conexões inclusas' },
            { icon: '📱', title: 'Automação com aplicativo', desc: 'Tomada inteligente com horários programáveis pelo celular' },
            { icon: '🔄', title: 'Sistema bypass', desc: 'Para piscinas sem espera — garante circulação correta da água' },
            { icon: '🛡️', title: 'Garantia de 5 anos nas placas', desc: 'Uma das melhores garantias do mercado' },
            { icon: '🔧', title: 'Instalação completa inclusa', desc: 'Nossa equipe realiza toda a instalação sem custo adicional' },
          ].map((item, i, arr) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ width: 36, height: 36, background: '#fffbeb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {item.icon}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{item.title}</p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* COMPARATIVO */}
        <section style={{ background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)', margin: '12px 16px', borderRadius: 16, padding: 20, border: '1px solid #bfdbfe', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 14px', color: '#1e3a8a', textAlign: 'center' }}>
            📅 Quanto tempo você vai usar sua piscina?
          </h2>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>❌ Sem aquecimento</span>
              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>~90 dias/ano</span>
            </div>
            <div style={{ background: '#fee2e2', borderRadius: 8, height: 12, overflow: 'hidden' }}>
              <div style={{ background: '#ef4444', height: '100%', width: '25%', borderRadius: 8 }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✅ Com Sul Placas</span>
              <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>~270 dias/ano</span>
            </div>
            <div style={{ background: '#d1fae5', borderRadius: 8, height: 12, overflow: 'hidden' }}>
              <div style={{ background: '#22c55e', height: '100%', width: '90%', borderRadius: 8 }} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#1e40af', margin: '12px 0 0', textAlign: 'center', fontWeight: 600 }}>
            3× mais lazer para você e sua família 🏊
          </p>
        </section>

        {/* PREÇO */}
        <section style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)', margin: '12px 16px', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 4px', letterSpacing: 1, textTransform: 'uppercase' as const }}>Investimento Total</p>
          <p style={{ color: '#F59E0B', fontSize: 42, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-1px' }}>{pricing.totalCash}</p>
          <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 16px' }}>à vista — melhor condição</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '10px 16px', flex: 1 }}>
              <p style={{ color: '#94a3b8', fontSize: 10, margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>12× cartão</p>
              <p style={{ color: '#F59E0B', fontSize: 18, fontWeight: 800, margin: 0 }}>{pricing.installment12x}</p>
            </div>
            <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '10px 16px', flex: 1 }}>
              <p style={{ color: '#94a3b8', fontSize: 10, margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>18× cartão</p>
              <p style={{ color: '#F59E0B', fontSize: 18, fontWeight: 800, margin: 0 }}>{pricing.installment18x}</p>
            </div>
          </div>
          {saving && <p style={{ color: '#64748b', fontSize: 12, margin: '10px 0 0' }}>Atualizando valores...</p>}
        </section>

        {/* UPSELLS */}
        {proposal.availableUpsells.length > 0 && (
          <section style={{ background: '#fff', margin: '12px 16px', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>⭐ Potencialize seu sistema</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 14px' }}>Selecione itens extras — o valor é atualizado automaticamente:</p>
            {proposal.availableUpsells.map((u) => {
              const isSel = selected.has(u.id);
              return (
                <div key={u.id} onClick={() => !saving && toggleUpsell(u.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, marginBottom: 10,
                  border: isSel ? '2px solid #F59E0B' : '2px solid #e5e7eb',
                  background: isSel ? '#fffbeb' : '#f9fafb',
                  cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.15s',
                }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: isSel ? '#F59E0B' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {isSel ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{u.name}</p>
                    {u.description && <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.4 }}>{u.description}</p>}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: isSel ? '#b45309' : '#374151', margin: 0, flexShrink: 0 }}>
                    + {fmt(u.priceCents)}
                  </p>
                </div>
              );
            })}
          </section>
        )}

        {/* DIFERENCIAIS */}
        <section style={{ margin: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '🏆', title: '10+ anos', sub: 'de experiência no RS' },
              { icon: '🏠', title: '500+', sub: 'instalações realizadas' },
              { icon: '🛡️', title: '5 anos', sub: 'de garantia nas placas' },
              { icon: '📞', title: 'Suporte', sub: 'pós-instalação incluso' },
            ].map((d, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {d.icon}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>{d.title}</p>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{d.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: '#fff', margin: '12px 16px', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {revertedMsg && (
            <div style={{ background: '#fefce8', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 14, textAlign: 'center' as const }}>
              ⚠️ Você alterou os itens — confirme novamente para aprovar.
            </div>
          )}
          {approved ? (
            <div style={{ textAlign: 'center', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: 14, padding: '24px 20px', border: '1px solid #86efac' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>🎉</p>
              <p style={{ fontWeight: 800, fontSize: 18, color: '#14532d', margin: '0 0 6px' }}>Orçamento aprovado!</p>
              <p style={{ fontSize: 13, color: '#166534', margin: '0 0 16px', lineHeight: 1.5 }}>
                Obrigado, {firstName}! Nossa equipe entrará em contato em breve para agendar a instalação.
              </p>
              <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Acabei de aprovar o orçamento ${proposal.proposalCode}. Aguardo contato!`)}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'inline-block', background: '#16a34a', color: '#fff', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                💬 Falar no WhatsApp
              </a>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', textAlign: 'center' }}>
                Pronto para transformar sua piscina?
              </p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', textAlign: 'center', lineHeight: 1.5 }}>
                Confirme o orçamento ou tire suas dúvidas pelo WhatsApp.
              </p>
              <button onClick={handleApprove} style={{ display: 'block', width: '100%', background: 'linear-gradient(135deg, #F59E0B, #d97706)', color: '#0f172a', border: 'none', borderRadius: 14, padding: '16px 0', fontSize: 16, fontWeight: 800, cursor: 'pointer', marginBottom: 10, boxShadow: '0 4px 14px rgba(245,158,11,0.4)' }}>
                ✅ Aprovar Orçamento — {pricing.totalCash}
              </button>
              <a href={`https://wa.me/${whatsapp}?text=${waMsg}`} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#16a34a', color: '#fff', borderRadius: 14, padding: '14px 0', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box' as const }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Tirar dúvidas no WhatsApp
              </a>
            </>
          )}
        </section>

        {/* FOOTER */}
        <footer style={{ textAlign: 'center', padding: '20px 16px 0', fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#6b7280' }}>Sul Placas — Aquecimento Solar</p>
          <p style={{ margin: 0 }}>Proposta personalizada · Não possui valor fiscal</p>
          {proposal.expiresAt && (
            <p style={{ margin: '4px 0 0', color: isExpired ? '#ef4444' : '#9ca3af' }}>
              {isExpired ? '⚠️ Esta proposta expirou' : `Válida até ${fmtDate(proposal.expiresAt)}`}
            </p>
          )}
        </footer>
      </div>
    </>
  );
}
