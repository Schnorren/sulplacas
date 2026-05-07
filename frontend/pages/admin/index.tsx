// frontend/pages/admin/index.tsx

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type Tab = 'nova' | 'propostas' | 'config';

interface UpsellProduct {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  active: boolean;
  sortOrder: number;
}

interface CityConfig {
  name: string;
  displacementCents: number;
}

interface ProposalView {
  id: string;
  viewedAt: string;
  userAgent: string | null;
  ip: string | null;
}

interface PricingConfig {
  id: string;
  key: string;
  value: number;
  label: string;
}

const DEFAULT_CITIES: CityConfig[] = [
  { name: 'Porto Alegre',          displacementCents: 0 },
  { name: 'Região Metropolitana',  displacementCents: 15000 },
  { name: 'Interior / Litoral',    displacementCents: 40000 },
];

const fmt = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('nova');

  // Nova proposta
  const [form, setForm] = useState({
    name: '', whatsapp: '', lengthM: '', widthM: '', clientCity: '', displacementCostCents: 0,
  });
  const [cities, setCities] = useState<CityConfig[]>(DEFAULT_CITIES);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Propostas
  const [proposals, setProposals] = useState<any[]>([]);
  const [viewsMap, setViewsMap] = useState<Record<string, ProposalView[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Config
  const [upsells, setUpsells] = useState<UpsellProduct[]>([]);
  const [upsellForm, setUpsellForm] = useState({
    id: '', name: '', description: '', priceCents: '', active: true, sortOrder: '0',
  });
  const [editingUpsell, setEditingUpsell] = useState(false);
  const [cityForm, setCityForm] = useState<CityConfig>({ name: '', displacementCents: 0 });
  const [editingCityIdx, setEditingCityIdx] = useState<number | null>(null);

  // Pricing
  const [pricingConfigs, setPricingConfigs] = useState<PricingConfig[]>([]);
  const [savingPricing, setSavingPricing] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sulplacas_cities');
    if (saved) setCities(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (tab === 'propostas') fetchProposals();
    if (tab === 'config') {
      fetchUpsells();
      fetchPricingConfigs();
    }
  }, [tab]);

  async function fetchProposals() {
    const res = await fetch(`${API}/proposals`);
    const data = await res.json();
    setProposals(data);
  }

  async function fetchUpsells() {
    const res = await fetch(`${API}/admin/upsells`);
    setUpsells(await res.json());
  }

  async function fetchViews(proposalId: string) {
    if (viewsMap[proposalId]) {
      // toggle
      setExpandedId(expandedId === proposalId ? null : proposalId);
      return;
    }
    const res = await fetch(`${API}/proposals/${proposalId}/views`);
    const data = await res.json();
    setViewsMap((m) => ({ ...m, [proposalId]: data }));
    setExpandedId(proposalId);
  }

  async function fetchPricingConfigs() {
    const res = await fetch(`${API}/admin/pricing`);
    setPricingConfigs(await res.json());
  }

  async function savePricingConfig(key: string, rawValue: string) {
    setSavingPricing(key);
    // Converter valor de entrada para centésimos conforme a chave
    let value: number;
    if (key === 'CARD_MACHINE_RATE') {
      // usuário digita 3.5 → salva 350 (centésimos de %)
      value = Math.round(parseFloat(rawValue) * 100);
    } else if (key === 'BASE_AREA_LIMIT_M2') {
      // usuário digita 18 (m²) → salva 1800 (m² × 100)
      value = Math.round(parseFloat(rawValue) * 100);
    } else {
      // usuário digita R$ → salva centavos
      value = Math.round(parseFloat(rawValue) * 100);
    }
    await fetch(`${API}/admin/pricing/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    fetchPricingConfigs();
    setSavingPricing(null);
  }

  function handleCitySelect(cityName: string) {
    const city = cities.find((c) => c.name === cityName);
    setForm((f) => ({ ...f, clientCity: cityName, displacementCostCents: city?.displacementCents ?? 0 }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, whatsapp: form.whatsapp,
          lengthM: parseFloat(form.lengthM), widthM: parseFloat(form.widthM),
          clientCity: form.clientCity, displacementCostCents: form.displacementCostCents,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function startNewUpsell() {
    setUpsellForm({ id: '', name: '', description: '', priceCents: '', active: true, sortOrder: '0' });
    setEditingUpsell(true);
  }

  function startEditUpsell(u: UpsellProduct) {
    setUpsellForm({
      id: u.id, name: u.name, description: u.description,
      priceCents: String(u.priceCents / 100), active: u.active, sortOrder: String(u.sortOrder),
    });
    setEditingUpsell(true);
  }

  async function saveUpsell() {
    const payload = {
      name: upsellForm.name, description: upsellForm.description,
      priceCents: Math.round(parseFloat(upsellForm.priceCents) * 100),
      active: upsellForm.active, sortOrder: parseInt(upsellForm.sortOrder),
    };
    const isNew = !upsellForm.id;
    const url    = isNew ? `${API}/admin/upsells` : `${API}/admin/upsells/${upsellForm.id}`;
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) { setEditingUpsell(false); fetchUpsells(); }
  }

  async function deleteUpsell(id: string) {
    if (!confirm('Remover este produto?')) return;
    await fetch(`${API}/admin/upsells/${id}`, { method: 'DELETE' });
    fetchUpsells();
  }

  function saveCity() {
    const updated = editingCityIdx !== null
      ? cities.map((c, i) => (i === editingCityIdx ? cityForm : c))
      : [...cities, cityForm];
    setCities(updated);
    localStorage.setItem('sulplacas_cities', JSON.stringify(updated));
    setCityForm({ name: '', displacementCents: 0 });
    setEditingCityIdx(null);
  }

  function deleteCity(idx: number) {
    const updated = cities.filter((_, i) => i !== idx);
    setCities(updated);
    localStorage.setItem('sulplacas_cities', JSON.stringify(updated));
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 520, margin: '0 auto', padding: 16, color: '#F8FAFC' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>⚡ Sul Placas — Admin</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['nova', 'propostas', 'config'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t ? '#F59E0B' : '#f3f4f6',
            color: tab === t ? '#fff' : '#111827',
            fontWeight: tab === t ? 700 : 400,
          }}>
            {t === 'nova' ? '+ Nova' : t === 'propostas' ? '📋 Propostas' : '⚙️ Config'}
          </button>
        ))}
      </div>

      {/* ── Nova Proposta ── */}
      {tab === 'nova' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Nome do cliente" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="WhatsApp (c/ DDD)" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} type="tel" />
          <div style={{ display: 'flex', gap: 8 }}>
            <Input label="Comprimento (m)" value={form.lengthM} onChange={(v) => setForm({ ...form, lengthM: v })} type="number" />
            <Input label="Largura (m)" value={form.widthM} onChange={(v) => setForm({ ...form, widthM: v })} type="number" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4, color: '#F8FAFC' }}>Cidade do cliente</label>
            <select value={form.clientCity} onChange={(e) => handleCitySelect(e.target.value)}
              style={{ width: '100%', padding: '10px 8px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, color: '#111827', background: '#fff' }}>
              <option value="">Selecione a cidade...</option>
              {cities.map((c) => (
                <option key={c.name} value={c.name}>{c.name} — {fmt(c.displacementCents)} deslocamento</option>
              ))}
            </select>
          </div>
          {form.clientCity && (
            <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>
              Deslocamento: <strong>{fmt(form.displacementCostCents)}</strong>
            </p>
          )}
          {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
          <button onClick={handleSubmit} disabled={loading} style={{
            background: '#F59E0B', border: 'none', borderRadius: 10, padding: '14px 0',
            fontWeight: 700, fontSize: 16, cursor: 'pointer', marginTop: 4, color: '#fff'
          }}>
            {loading ? 'Gerando...' : 'Gerar Proposta'}
          </button>
          {result && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 16, color: '#111827' }}>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>✅ Proposta gerada!</p>
              <p style={{ fontSize: 13, marginBottom: 4 }}>
                Área: <strong>{result.pricing?.areaM2} m²</strong> | À vista: <strong>{result.pricing?.totalCash}</strong>
              </p>
              <p style={{ fontSize: 13, marginBottom: 4 }}>
                12x: {result.pricing?.installment12x} | 18x: {result.pricing?.installment18x}
              </p>
              <a href={result.proposalLink} target="_blank" rel="noreferrer"
                style={{ display: 'block', marginTop: 8, color: '#2563eb', wordBreak: 'break-all', fontSize: 13 }}>
                🔗 {result.proposalLink}
              </a>
              <a href={result.whatsappLink} target="_blank" rel="noreferrer"
                style={{ display: 'block', marginTop: 4, color: '#16a34a', fontSize: 13 }}>
                📲 Enviar via WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Propostas ── */}
      {tab === 'propostas' && (
        <div>
          {proposals.length === 0
            ? <p style={{ color: '#9ca3af' }}>Nenhuma proposta ainda.</p>
            : proposals.map((p) => (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 12, color: '#111827' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong>{p.client?.name}</strong>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0' }}>
                      📍 {p.clientCity} | {p.areaM2} m²
                    </p>
                    <p style={{ fontSize: 13, margin: '3px 0' }}>
                      Total: <strong>{fmt(p.totalCashCents)}</strong>
                    </p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0' }}>
                      Criada: {fmtDate(p.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                {/* Links da proposta */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' as const }}>
                  <a
                    href={`${process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000'}/proposta/${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '5px 10px', textDecoration: 'none', fontWeight: 600 }}
                  >
                    🔗 Ver proposta
                  </a>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/proposals/${p.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 10px', textDecoration: 'none', fontWeight: 600 }}
                  >
                    📄 Baixar PDF
                  </a>
                </div>

                {/* Botão histórico de views */}
                <button
                  onClick={() => fetchViews(p.id)}
                  style={{
                    marginTop: 8, fontSize: 12, background: '#f3f4f6', color: '#111827',
                    border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                  }}
                >
                  👁️ {p.viewCount} visualização{p.viewCount !== 1 ? 'ões' : ''}
                  {expandedId === p.id ? ' ▲' : ' ▼'}
                </button>

                {/* Histórico expandido */}
                {expandedId === p.id && (
                  <div style={{ marginTop: 8, borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
                    {viewsMap[p.id]?.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#9ca3af' }}>Nenhuma visualização registrada.</p>
                    ) : (
                      viewsMap[p.id]?.map((v, i) => (
                        <div key={v.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          fontSize: 12, padding: '4px 0',
                          borderBottom: i < viewsMap[p.id].length - 1 ? '1px solid #f9fafb' : 'none',
                        }}>
                          <span style={{ color: '#374151', fontWeight: 600 }}>
                            📅 {fmtDate(v.viewedAt)}
                          </span>
                          <span style={{ color: '#9ca3af', fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {v.ip ?? '—'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* ── Config ── */}
      {tab === 'config' && (
        <div>
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Produtos Extras (Upsells)</h2>
              <button onClick={startNewUpsell} style={btnStyle('#F59E0B')}>+ Novo</button>
            </div>
            {editingUpsell && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: 14, marginBottom: 12, color: '#111827' }}>
                <Input labelColor="#111827" label="Nome" value={upsellForm.name} onChange={(v) => setUpsellForm({ ...upsellForm, name: v })} />
                <Input labelColor="#111827" label="Descrição" value={upsellForm.description} onChange={(v) => setUpsellForm({ ...upsellForm, description: v })} />
                <Input labelColor="#111827" label="Preço (R$)" value={upsellForm.priceCents} onChange={(v) => setUpsellForm({ ...upsellForm, priceCents: v })} type="number" />
                <Input labelColor="#111827" label="Ordem" value={upsellForm.sortOrder} onChange={(v) => setUpsellForm({ ...upsellForm, sortOrder: v })} type="number" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <input type="checkbox" checked={upsellForm.active}
                    onChange={(e) => setUpsellForm({ ...upsellForm, active: e.target.checked })} id="active" />
                  <label htmlFor="active" style={{ fontSize: 14 }}>Visível para clientes</label>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveUpsell} style={btnStyle('#16a34a')}>Salvar</button>
                  <button onClick={() => setEditingUpsell(false)} style={btnStyle('#6b7280')}>Cancelar</button>
                </div>
              </div>
            )}
            {upsells.map((u) => (
              <div key={u.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8, color: '#111827' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{u.name}</strong>
                    {!u.active && <span style={{ fontSize: 11, color: '#ef4444', marginLeft: 6 }}>(inativo)</span>}
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0' }}>{u.description}</p>
                    <p style={{ fontSize: 13, margin: 0 }}>{fmt(u.priceCents)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <button onClick={() => startEditUpsell(u)} style={btnSmall('#2563eb')}>✏️</button>
                    <button onClick={() => deleteUpsell(u.id)} style={btnSmall('#ef4444')}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <hr style={{ margin: '20px 0', borderColor: '#e5e7eb' }} />

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Cidades e Deslocamento</h2>
              <button onClick={() => { setCityForm({ name: '', displacementCents: 0 }); setEditingCityIdx(null); }}
                style={btnStyle('#F59E0B')}>+ Nova</button>
            </div>
            {(editingCityIdx !== null || (cityForm.name === '' && cityForm.displacementCents === 0)) && editingCityIdx !== null || cityForm.name !== '' ? (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: 14, marginBottom: 12, color: '#111827' }}>
                <Input labelColor="#111827" label="Nome da cidade / região" value={cityForm.name}
                  onChange={(v) => setCityForm({ ...cityForm, name: v })} />
                <Input labelColor="#111827" label="Deslocamento (R$)" value={String(cityForm.displacementCents / 100)}
                  onChange={(v) => setCityForm({ ...cityForm, displacementCents: Math.round(parseFloat(v || '0') * 100) })}
                  type="number" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveCity} style={btnStyle('#16a34a')}>Salvar</button>
                  <button onClick={() => { setCityForm({ name: '', displacementCents: 0 }); setEditingCityIdx(null); }}
                    style={btnStyle('#6b7280')}>Cancelar</button>
                </div>
              </div>
            ) : null}
            {cities.map((c, i) => (
              <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8, color: '#111827' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{c.name}</strong>
                    <p style={{ fontSize: 13, margin: '2px 0' }}>Deslocamento: {fmt(c.displacementCents)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setCityForm(c); setEditingCityIdx(i); }} style={btnSmall('#2563eb')}>✏️</button>
                    <button onClick={() => deleteCity(i)} style={btnSmall('#ef4444')}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <hr style={{ margin: '20px 0', borderColor: '#e5e7eb' }} />

          <section>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Precificação</h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 14px' }}>
              Valores usados no cálculo automático das propostas.
            </p>

            {pricingConfigs
              .filter((c) => ['BASE_PRICE', 'EXCESS_PER_M2', 'COLLECTOR_EXTRA_PER_M2', 'CARD_MACHINE_RATE'].includes(c.key))
              .map((c) => (
                <PricingRow
                  key={c.key}
                  config={c}
                  saving={savingPricing === c.key}
                  onSave={(raw) => savePricingConfig(c.key, raw)}
                />
              ))}
          </section>

        </div>
      )}
    </div>
  );
}

function PricingRow({ config, saving, onSave }: {
  config: { key: string; value: number; label: string };
  saving: boolean;
  onSave: (raw: string) => void;
}) {
  const labels: Record<string, { name: string; hint: string; display: (v: number) => string; parse: (v: number) => string }> = {
    BASE_PRICE: {
      name: 'Preço base',
      hint: 'Valor cobrado até o limite de área (R$)',
      display: (v) => String(v / 100),
      parse:   (v) => String(v / 100),
    },
    EXCESS_PER_M2: {
      name: 'Excedente por m²',
      hint: 'Valor adicional por m² acima do limite (R$)',
      display: (v) => String(v / 100),
      parse:   (v) => String(v / 100),
    },
    COLLECTOR_EXTRA_PER_M2: {
      name: 'Extra por m² de placas coletoras',
      hint: 'Custo extra por m² — embutido no total, sem exibição separada (R$)',
      display: (v) => String(v / 100),
      parse:   (v) => String(v / 100),
    },
    CARD_MACHINE_RATE: {
      name: 'Taxa da maquininha (%)',
      hint: 'Percentual cobrado pela maquininha (ex: 3.5 = 3,50%)',
      display: (v) => String(v / 100),
      parse:   (v) => String(v / 100),
    },
  };

  const meta = labels[config.key];
  if (!meta) return null;

  const [val, setVal] = useState(meta.display(config.value));

  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 10, color: '#111827' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>{meta.name}</p>
      <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 8px' }}>{meta.hint}</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#fff', color: '#111827' }}
        />
        <button
          onClick={() => onSave(val)}
          disabled={saving}
          style={{ background: saving ? '#9ca3af' : '#F59E0B', color: '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, whiteSpace: 'nowrap' as const }}
        >
          {saving ? '...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', labelColor = '#F8FAFC' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; labelColor?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4, color: labelColor }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 8px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, boxSizing: 'border-box', color: '#111827', background: '#fff' }} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: '#9ca3af', SENT: '#3b82f6', VIEWED: '#f59e0b', APPROVED: '#22c55e', EXPIRED: '#ef4444',
  };
  return (
    <span style={{ fontSize: 11, background: colors[status] ?? '#e5e7eb', color: '#fff', borderRadius: 6, padding: '2px 8px' }}>
      {status}
    </span>
  );
}

function btnStyle(bg: string) {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, cursor: 'pointer', fontSize: 13 };
}
function btnSmall(bg: string) {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 13 };
}