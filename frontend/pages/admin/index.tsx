// frontend/pages/admin/index.tsx

import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000';
const EMPRESA_WA   = process.env.NEXT_PUBLIC_EMPRESA_WHATSAPP ?? '5551999999999';

type Tab = 'nova' | 'propostas' | 'config';

type ProposalStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'APPROVED' | 'EXPIRED' | 'NEGOTIATING' | 'LOST';

interface UpsellProduct {
  id: string; name: string; description: string;
  priceCents: number; active: boolean; sortOrder: number;
}
interface CityConfig { name: string; displacementCents: number; }
interface ProposalView { id: string; viewedAt: string; userAgent: string | null; ip: string | null; }
interface PricingConfig { id: string; key: string; value: number; label: string; }
interface PricingPreview {
  areaM2: number;
  pricing: {
    totalCash: string; totalCard: string | null;
    installment12x: string; installment18x: string;
    cardInstallment12x: string | null; cardInstallment18x: string | null;
    breakdown: { base: string; excess: string; displacement: string; upsells: string; hiddenMargin: string | null; };
  };
}

const DEFAULT_CITIES: CityConfig[] = [
  { name: 'Porto Alegre',         displacementCents: 0 },
  { name: 'Região Metropolitana', displacementCents: 15000 },
  { name: 'Interior / Litoral',   displacementCents: 40000 },
];

const ALL_STATUSES: ProposalStatus[] = ['DRAFT','SENT','VIEWED','APPROVED','EXPIRED','NEGOTIATING','LOST'];

const STATUS_LABEL: Record<ProposalStatus, string> = {
  DRAFT: 'Rascunho', SENT: 'Enviada', VIEWED: 'Visualizada',
  APPROVED: 'Aprovada', EXPIRED: 'Expirada', NEGOTIATING: 'Em negociação', LOST: 'Perdida',
};
const STATUS_COLOR: Record<ProposalStatus, string> = {
  DRAFT: '#475569', SENT: '#3b82f6', VIEWED: '#f59e0b',
  APPROVED: '#22c55e', EXPIRED: '#94a3b8', NEGOTIATING: '#a855f7', LOST: '#ef4444',
};

const fmt = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('nova');

  // ── Nova proposta ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '', whatsapp: '', email: '',
    lengthM: '', widthM: '',
    clientCity: '', displacementCostCents: 0, customDisplacement: false,
    hiddenMarginCents: 0, hiddenMarginInput: '',
    validityDays: '7',
  });
  const [cities, setCities]   = useState<CityConfig[]>(DEFAULT_CITIES);
  const [result, setResult]   = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [preview, setPreview] = useState<PricingPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Propostas ──────────────────────────────────────────────────────────────
  const [proposals, setProposals]         = useState<any[]>([]);
  const [statusCounts, setStatusCounts]   = useState<Record<string, number>>({});
  const [search, setSearch]               = useState('');
  const [filterStatus, setFilterStatus]   = useState('ALL');
  const [filterDate, setFilterDate]       = useState('');
  const [sortBy, setSortBy]               = useState('createdAt');
  const [sortDir, setSortDir]             = useState('desc');
  const [viewsMap, setViewsMap]           = useState<Record<string, ProposalView[]>>({});
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [notesMap, setNotesMap]           = useState<Record<string, string>>({});
  const [editingNotes, setEditingNotes]   = useState<string | null>(null);
  const [savingNotes, setSavingNotes]     = useState<string | null>(null);
  const [savingStatus, setSavingStatus]   = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Config ─────────────────────────────────────────────────────────────────
  const [upsells, setUpsells]             = useState<UpsellProduct[]>([]);
  const [upsellForm, setUpsellForm]       = useState({ id: '', name: '', description: '', priceCents: '', active: true, sortOrder: '0' });
  const [editingUpsell, setEditingUpsell] = useState(false);
  const [cityForm, setCityForm]           = useState<CityConfig>({ name: '', displacementCents: 0 });
  const [editingCityIdx, setEditingCityIdx] = useState<number | null>(null);
  const [pricingConfigs, setPricingConfigs] = useState<PricingConfig[]>([]);
  const [savingPricing, setSavingPricing]   = useState<string | null>(null);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('sulplacas_cities');
    if (saved) setCities(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (tab === 'propostas') { fetchProposals(); fetchStatusCounts(); }
    if (tab === 'config')    { fetchUpsells(); fetchPricingConfigs(); }
  }, [tab]);

  // Preview debounce
  useEffect(() => {
    const l = parseFloat(form.lengthM), w = parseFloat(form.widthM);
    if (!l || !w || l <= 0 || w <= 0) { setPreview(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPreview(l, w), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.lengthM, form.widthM, form.displacementCostCents, form.hiddenMarginCents]);

  // Busca com debounce
  useEffect(() => {
    if (tab !== 'propostas') return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => fetchProposals(), 350);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [search, filterStatus, filterDate, sortBy, sortDir]);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  async function fetchProposals() {
    const params = new URLSearchParams();
    if (search)       params.set('search',    search);
    if (filterStatus && filterStatus !== 'ALL') params.set('status', filterStatus);
    if (filterDate)   params.set('dateRange', filterDate);
    if (sortBy)       params.set('orderBy',   sortBy);
    if (sortDir)      params.set('orderDir',  sortDir);
    const res = await fetch(`${API}/proposals?${params}`);
    const data = await res.json();
    setProposals(data);
  }

  async function fetchStatusCounts() {
    const res = await fetch(`${API}/proposals/status-counts`);
    setStatusCounts(await res.json());
  }

  async function fetchPreview(l: number, w: number) {
    setPreviewLoading(true);
    try {
      const res = await fetch(`${API}/proposals/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lengthM: l, widthM: w,
          displacementCostCents: form.displacementCostCents,
          hiddenMarginCents: form.hiddenMarginCents,
        }),
      });
      if (res.ok) setPreview(await res.json());
    } catch {}
    setPreviewLoading(false);
  }

  async function fetchUpsells() {
    const res = await fetch(`${API}/admin/upsells`);
    setUpsells(await res.json());
  }

  async function fetchViews(proposalId: string) {
    if (viewsMap[proposalId]) { setExpandedId(expandedId === proposalId ? null : proposalId); return; }
    const res  = await fetch(`${API}/proposals/${proposalId}/views`);
    const data = await res.json();
    setViewsMap((m) => ({ ...m, [proposalId]: data }));
    setExpandedId(proposalId);
  }

  async function fetchPricingConfigs() {
    const res = await fetch(`${API}/admin/pricing`);
    setPricingConfigs(await res.json());
  }

  // ── Ações nas propostas ────────────────────────────────────────────────────
  async function handleStatusChange(id: string, status: string) {
    setSavingStatus(id);
    await fetch(`${API}/proposals/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSavingStatus(null);
    fetchProposals();
    fetchStatusCounts();
  }

  async function handleSaveNotes(id: string) {
    setSavingNotes(id);
    const notes = notesMap[id] ?? '';
    await fetch(`${API}/proposals/${id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(null);
    setEditingNotes(null);
    fetchProposals();
  }

  async function handleMarkContacted(id: string) {
    await fetch(`${API}/proposals/${id}/contacted`, { method: 'PATCH' });
    fetchProposals();
  }

  async function handleDuplicate(id: string) {
    const res  = await fetch(`${API}/proposals/${id}/duplicate`, { method: 'POST' });
    const data = await res.json();
    alert(`Proposta duplicada: ${data.proposalCode}\n${data.proposalLink}`);
    fetchProposals();
    fetchStatusCounts();
  }

  function getWhatsAppLink(p: any) {
    const link = `${FRONTEND_URL}/proposta/${p.id}`;
    return `https://wa.me/${p.client?.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${p.client?.name}! Segue sua proposta ${p.proposalCode}: ${link}`)}`;
  }

  // ── Config helpers ─────────────────────────────────────────────────────────
  async function savePricingConfig(key: string, rawValue: string) {
    setSavingPricing(key);
    let value: number;
    if (key === 'CARD_MACHINE_RATE')   value = Math.round(parseFloat(rawValue) * 100);
    else if (key === 'BASE_AREA_LIMIT_M2') value = Math.round(parseFloat(rawValue) * 100);
    else if (key === 'INSTALLMENT_12X_RATE' || key === 'INSTALLMENT_18X_RATE')
      value = Math.round(100 + parseFloat(rawValue));
    else value = Math.round(parseFloat(rawValue) * 100);
    await fetch(`${API}/admin/pricing/${key}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    fetchPricingConfigs();
    setSavingPricing(null);
  }

  function handleCitySelect(cityName: string) {
    const city = cities.find((c) => c.name === cityName);
    setForm((f) => ({ ...f, clientCity: cityName, displacementCostCents: city?.displacementCents ?? 0, customDisplacement: false }));
  }

  async function handleSubmit() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/proposals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, whatsapp: form.whatsapp,
          email: form.email || undefined,
          lengthM: parseFloat(form.lengthM), widthM: parseFloat(form.widthM),
          clientCity: form.clientCity,
          displacementCostCents: form.displacementCostCents,
          hiddenMarginCents: form.hiddenMarginCents,
          validityDays: parseInt(form.validityDays) || 7,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function startNewUpsell() {
    setUpsellForm({ id: '', name: '', description: '', priceCents: '', active: true, sortOrder: '0' });
    setEditingUpsell(true);
  }
  function startEditUpsell(u: UpsellProduct) {
    setUpsellForm({ id: u.id, name: u.name, description: u.description, priceCents: String(u.priceCents / 100), active: u.active, sortOrder: String(u.sortOrder) });
    setEditingUpsell(true);
  }
  async function saveUpsell() {
    const payload = { name: upsellForm.name, description: upsellForm.description, priceCents: Math.round(parseFloat(upsellForm.priceCents) * 100), active: upsellForm.active, sortOrder: parseInt(upsellForm.sortOrder) };
    const isNew = !upsellForm.id;
    const url   = isNew ? `${API}/admin/upsells` : `${API}/admin/upsells/${upsellForm.id}`;
    const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { setEditingUpsell(false); fetchUpsells(); }
  }
  async function deleteUpsell(id: string) {
    if (!confirm('Remover este produto?')) return;
    await fetch(`${API}/admin/upsells/${id}`, { method: 'DELETE' });
    fetchUpsells();
  }
  function saveCity() {
    const updated = editingCityIdx !== null ? cities.map((c, i) => i === editingCityIdx ? cityForm : c) : [...cities, cityForm];
    setCities(updated);
    localStorage.setItem('sulplacas_cities', JSON.stringify(updated));
    setCityForm({ name: '', displacementCents: 0 }); setEditingCityIdx(null);
  }
  function deleteCity(idx: number) {
    const updated = cities.filter((_, i) => i !== idx);
    setCities(updated);
    localStorage.setItem('sulplacas_cities', JSON.stringify(updated));
  }

  const totalProposals = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 580, margin: '0 auto', padding: 16, color: '#F8FAFC', background: '#0f172a', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>⚡ Sul Placas — Admin</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['nova', 'propostas', 'config'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t ? '#F59E0B' : '#1e293b',
            color: tab === t ? '#000' : '#cbd5e1', fontWeight: tab === t ? 700 : 400,
          }}>
            {t === 'nova' ? '+ Nova' : t === 'propostas' ? '📋 Propostas' : '⚙️ Config'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ABA: Nova Proposta                                            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'nova' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Nome do cliente" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input label="WhatsApp (c/ DDD)" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} type="tel" />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="E-mail (opcional)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Input label="Comprimento (m)" value={form.lengthM} onChange={(v) => setForm({ ...form, lengthM: v })} type="number" />
            <Input label="Largura (m)" value={form.widthM} onChange={(v) => setForm({ ...form, widthM: v })} type="number" />
          </div>

          {/* Cidade */}
          <div>
            <label style={labelStyle}>Cidade do cliente</label>
            <select value={form.clientCity} onChange={(e) => handleCitySelect(e.target.value)} style={selectStyle}>
              <option value="">Selecione a cidade...</option>
              {cities.map((c) => (
                <option key={c.name} value={c.name}>{c.name} — {fmt(c.displacementCents)} deslocamento</option>
              ))}
            </select>
          </div>

          {/* Deslocamento editável */}
          {form.clientCity && (
            <div>
              <label style={labelStyle}>
                Deslocamento (R$)
                <span style={{ fontSize: 11, color: form.customDisplacement ? '#fbbf24' : '#94a3b8', marginLeft: 6 }}>
                  {form.customDisplacement ? '— valor personalizado' : '— padrão da cidade, pode editar'}
                </span>
              </label>
              <input type="number" value={String(form.displacementCostCents / 100)}
                onChange={(e) => {
                  const cents = Math.round(parseFloat(e.target.value || '0') * 100);
                  setForm((f) => ({ ...f, displacementCostCents: isNaN(cents) ? 0 : cents, customDisplacement: true }));
                }}
                style={inputStyle} />
            </div>
          )}

          {/* Validade */}
          <div>
            <label style={labelStyle}>Validade da proposta (dias)</label>
            <input type="number" min="1" value={form.validityDays}
              onChange={(e) => setForm({ ...form, validityDays: e.target.value })}
              style={{ ...inputStyle, width: 100 }} />
          </div>

          {/* Margem oculta */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 12 }}>
            <label style={{ ...labelStyle, color: '#fbbf24' }}>🔒 Acréscimo interno (R$)</label>
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>Valor embutido no total — não aparece na proposta do cliente</p>
            <input type="number" placeholder="0,00" value={form.hiddenMarginInput}
              onChange={(e) => {
                const raw = e.target.value;
                const cents = raw === '' ? 0 : Math.round(parseFloat(raw) * 100);
                setForm((f) => ({ ...f, hiddenMarginInput: raw, hiddenMarginCents: isNaN(cents) ? 0 : cents }));
              }}
              style={inputStyle} />
          </div>

          {/* Preview */}
          {(parseFloat(form.lengthM) > 0 && parseFloat(form.widthM) > 0) && (
            <div style={{ background: '#0f2744', border: '1px solid #1d4ed8', borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', margin: '0 0 10px' }}>
                📊 Preview do orçamento
                {previewLoading && <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>calculando...</span>}
              </p>
              {preview && !previewLoading ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <PreviewCard label="Área"   value={`${preview.areaM2} m²`} />
                    <PreviewCard label="À vista" value={preview.pricing.totalCash} highlight />
                    <PreviewCard label="12×"    value={preview.pricing.installment12x} />
                    <PreviewCard label="18×"    value={preview.pricing.installment18x} />
                    {preview.pricing.totalCard && <PreviewCard label="c/ máquina" value={preview.pricing.totalCard} />}
                  </div>
                  <details>
                    <summary style={{ fontSize: 11, color: '#64748b', cursor: 'pointer' }}>Ver detalhamento</summary>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <BRow label="Base"          value={preview.pricing.breakdown.base} />
                      <BRow label="Excedente"     value={preview.pricing.breakdown.excess} />
                      <BRow label="Deslocamento"  value={preview.pricing.breakdown.displacement} />
                      <BRow label="Upsells"       value={preview.pricing.breakdown.upsells} />
                      {preview.pricing.breakdown.hiddenMargin && (
                        <BRow label="🔒 Acréscimo" value={preview.pricing.breakdown.hiddenMargin} highlight />
                      )}
                    </div>
                  </details>
                </>
              ) : !previewLoading && (
                <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>Preencha as dimensões para ver o preview</p>
              )}
            </div>
          )}

          {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

          <button onClick={handleSubmit} disabled={loading} style={{
            background: loading ? '#78350f' : '#F59E0B', border: 'none', borderRadius: 10,
            padding: '14px 0', fontWeight: 700, fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer', color: '#000',
          }}>
            {loading ? 'Gerando...' : 'Gerar Proposta'}
          </button>

          {result && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 16, color: '#111827' }}>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>✅ Proposta gerada!</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 6px' }}>
                Código: <strong style={{ fontFamily: 'monospace', color: '#111827', fontSize: 14 }}>{result.proposalCode}</strong>
              </p>
              <p style={{ fontSize: 13, marginBottom: 4 }}>
                Área: <strong>{result.pricing?.areaM2} m²</strong> | À vista: <strong>{result.pricing?.totalCash}</strong>
              </p>
              <p style={{ fontSize: 13, marginBottom: 4 }}>12×: {result.pricing?.installment12x} | 18×: {result.pricing?.installment18x}</p>
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

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ABA: Propostas                                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'propostas' && (
        <div>
          {/* Contadores por status */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 14 }}>
            <StatusCounter label="Total" count={totalProposals} color="#64748b"
              active={filterStatus === 'ALL'} onClick={() => setFilterStatus('ALL')} />
            {ALL_STATUSES.map((s) => statusCounts[s] ? (
              <StatusCounter key={s} label={STATUS_LABEL[s]} count={statusCounts[s]}
                color={STATUS_COLOR[s]} active={filterStatus === s}
                onClick={() => setFilterStatus(filterStatus === s ? 'ALL' : s)} />
            ) : null)}
          </div>

          {/* Barra de busca */}
          <div style={{ marginBottom: 10 }}>
            <input
              type="text"
              placeholder="🔍 Buscar por nome, telefone, email, código, cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, fontSize: 13 }}
            />
          </div>

          {/* Filtros: data + ordenação */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' as const }}>
            <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
              style={{ ...selectStyle, flex: 1, fontSize: 12, padding: '7px 8px' }}>
              <option value="">Qualquer data</option>
              <option value="today">Hoje</option>
              <option value="week">Últimos 7 dias</option>
              <option value="month">Últimos 30 dias</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              style={{ ...selectStyle, flex: 1, fontSize: 12, padding: '7px 8px' }}>
              <option value="createdAt">Data</option>
              <option value="totalCashCents">Valor</option>
              <option value="status">Status</option>
            </select>
            <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13 }}>
              {sortDir === 'desc' ? '↓' : '↑'}
            </button>
          </div>

          {proposals.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', marginTop: 32 }}>Nenhuma proposta encontrada.</p>
          ) : proposals.map((p) => (
            <ProposalCard
              key={p.id}
              p={p}
              expanded={expandedId === p.id}
              views={viewsMap[p.id]}
              editingNotes={editingNotes === p.id}
              notesValue={notesMap[p.id] ?? p.internalNotes ?? ''}
              savingNotes={savingNotes === p.id}
              savingStatus={savingStatus === p.id}
              onToggleExpand={() => fetchViews(p.id)}
              onStatusChange={(s) => handleStatusChange(p.id, s)}
              onEditNotes={() => {
                setNotesMap((m) => ({ ...m, [p.id]: p.internalNotes ?? '' }));
                setEditingNotes(p.id);
              }}
              onNotesChange={(v) => setNotesMap((m) => ({ ...m, [p.id]: v }))}
              onSaveNotes={() => handleSaveNotes(p.id)}
              onCancelNotes={() => setEditingNotes(null)}
              onMarkContacted={() => handleMarkContacted(p.id)}
              onDuplicate={() => handleDuplicate(p.id)}
              getWhatsAppLink={() => getWhatsAppLink(p)}
            />
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ABA: Config                                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'config' && (
        <div>
          {/* Upsells */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={sectionTitle}>Produtos Extras (Upsells)</h2>
              <button onClick={startNewUpsell} style={btn('#F59E0B', '#000')}>+ Novo</button>
            </div>
            {editingUpsell && (
              <div style={{ background: '#1e293b', border: '1px solid #fcd34d', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <Input label="Nome" value={upsellForm.name} onChange={(v) => setUpsellForm({ ...upsellForm, name: v })} />
                <Input label="Descrição" value={upsellForm.description} onChange={(v) => setUpsellForm({ ...upsellForm, description: v })} />
                <Input label="Preço (R$)" value={upsellForm.priceCents} onChange={(v) => setUpsellForm({ ...upsellForm, priceCents: v })} type="number" />
                <Input label="Ordem" value={upsellForm.sortOrder} onChange={(v) => setUpsellForm({ ...upsellForm, sortOrder: v })} type="number" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <input type="checkbox" checked={upsellForm.active} id="upsell-active"
                    onChange={(e) => setUpsellForm({ ...upsellForm, active: e.target.checked })} />
                  <label htmlFor="upsell-active" style={{ fontSize: 14, color: '#f1f5f9' }}>Visível para clientes</label>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveUpsell} style={btn('#16a34a', '#fff')}>Salvar</button>
                  <button onClick={() => setEditingUpsell(false)} style={btn('#475569', '#fff')}>Cancelar</button>
                </div>
              </div>
            )}
            {upsells.map((u) => (
              <div key={u.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{u.name}</strong>
                    {!u.active && <span style={{ fontSize: 11, color: '#ef4444', marginLeft: 6 }}>(inativo)</span>}
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0' }}>{u.description}</p>
                    <p style={{ fontSize: 13, margin: 0 }}>{fmt(u.priceCents)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEditUpsell(u)} style={btnSm('#2563eb')}>✏️</button>
                    <button onClick={() => deleteUpsell(u.id)} style={btnSm('#ef4444')}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <hr style={{ margin: '20px 0', borderColor: '#334155' }} />

          {/* Cidades */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={sectionTitle}>Cidades e Deslocamento</h2>
              <button onClick={() => { setCityForm({ name: '', displacementCents: 0 }); setEditingCityIdx(null); }} style={btn('#F59E0B', '#000')}>+ Nova</button>
            </div>
            {(editingCityIdx !== null || cityForm.name !== '') && (
              <div style={{ background: '#1e293b', border: '1px solid #fcd34d', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <Input label="Nome da cidade / região" value={cityForm.name} onChange={(v) => setCityForm({ ...cityForm, name: v })} />
                <Input label="Deslocamento (R$)" value={String(cityForm.displacementCents / 100)}
                  onChange={(v) => setCityForm({ ...cityForm, displacementCents: Math.round(parseFloat(v || '0') * 100) })} type="number" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveCity} style={btn('#16a34a', '#fff')}>Salvar</button>
                  <button onClick={() => { setCityForm({ name: '', displacementCents: 0 }); setEditingCityIdx(null); }} style={btn('#475569', '#fff')}>Cancelar</button>
                </div>
              </div>
            )}
            {cities.map((c, i) => (
              <div key={i} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{c.name}</strong>
                    <p style={{ fontSize: 13, margin: '2px 0', color: '#94a3b8' }}>Deslocamento: {fmt(c.displacementCents)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setCityForm(c); setEditingCityIdx(i); }} style={btnSm('#2563eb')}>✏️</button>
                    <button onClick={() => deleteCity(i)} style={btnSm('#ef4444')}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <hr style={{ margin: '20px 0', borderColor: '#334155' }} />

          {/* Precificação */}
          <section>
            <h2 style={sectionTitle}>Precificação</h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px' }}>Valores usados no cálculo automático das propostas.</p>

            <SectionLabel>Valores base</SectionLabel>
            {pricingConfigs.filter((c) => ['BASE_PRICE','EXCESS_PER_M2','COLLECTOR_EXTRA_PER_M2'].includes(c.key))
              .map((c) => <PricingRow key={c.key} config={c} saving={savingPricing === c.key} onSave={(r) => savePricingConfig(c.key, r)} />)}

            <SectionLabel>Taxas de parcelamento</SectionLabel>
            <p style={{ fontSize: 11, color: '#64748b', margin: '-4px 0 10px' }}>
              Digite o percentual de acréscimo. Ex: 12 = 12% de juros no 12×.
            </p>
            {pricingConfigs.filter((c) => ['INSTALLMENT_12X_RATE','INSTALLMENT_18X_RATE'].includes(c.key))
              .map((c) => <PricingRow key={c.key} config={c} saving={savingPricing === c.key} onSave={(r) => savePricingConfig(c.key, r)} />)}

            <SectionLabel>Maquininha</SectionLabel>
            {pricingConfigs.filter((c) => ['CARD_MACHINE_RATE'].includes(c.key))
              .map((c) => <PricingRow key={c.key} config={c} saving={savingPricing === c.key} onSave={(r) => savePricingConfig(c.key, r)} />)}
          </section>
        </div>
      )}
    </div>
  );
}

// ── ProposalCard ───────────────────────────────────────────────────────────────
function ProposalCard({
  p, expanded, views, editingNotes, notesValue, savingNotes, savingStatus,
  onToggleExpand, onStatusChange, onEditNotes, onNotesChange,
  onSaveNotes, onCancelNotes, onMarkContacted, onDuplicate, getWhatsAppLink,
}: any) {
  const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000';
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 14, marginBottom: 12, color: '#f1f5f9' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
            <strong style={{ fontSize: 15 }}>{p.client?.name}</strong>
            <span style={{ fontSize: 11, fontFamily: 'monospace', background: '#0f172a', color: '#fbbf24', borderRadius: 4, padding: '1px 6px', border: '1px solid #334155' }}>
              {p.proposalCode ?? '—'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0' }}>
            📱 {p.client?.whatsapp}
            {p.client?.email && <span style={{ marginLeft: 8 }}>✉️ {p.client.email}</span>}
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0' }}>
            📍 {p.clientCity} | {p.areaM2} m²
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 2px' }}>
            {fmt(p.totalCashCents)}
          </p>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
            Criada: {fmtDate(p.createdAt)}
            {p.lastContactedAt && (
              <span style={{ marginLeft: 8, color: '#a855f7' }}>
                📞 Contactado: {fmtDateShort(p.lastContactedAt)}
              </span>
            )}
          </p>
          {p.expiresAt && (
            <p style={{ fontSize: 11, color: new Date(p.expiresAt) < new Date() ? '#ef4444' : '#64748b', margin: '2px 0' }}>
              ⏱ Válida até: {fmtDateShort(p.expiresAt)}
            </p>
          )}
        </div>
        {/* Status dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <select
            value={p.status}
            disabled={savingStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            style={{
              background: (STATUS_COLOR as any)[p.status] ?? '#334155',
              color: '#fff', border: 'none', borderRadius: 6,
              padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {(['SENT','VIEWED','NEGOTIATING','APPROVED','LOST','EXPIRED'] as ProposalStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notas internas */}
      {editingNotes ? (
        <div style={{ marginTop: 10 }}>
          <textarea
            value={notesValue}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Anotações internas (não aparecem para o cliente)..."
            rows={3}
            style={{ width: '100%', background: '#0f172a', color: '#f1f5f9', border: '1px solid #475569', borderRadius: 8, padding: 8, fontSize: 13, boxSizing: 'border-box' as const, resize: 'vertical' as const }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button onClick={onSaveNotes} disabled={savingNotes}
              style={btn('#16a34a', '#fff')}>{savingNotes ? '...' : '💾 Salvar nota'}</button>
            <button onClick={onCancelNotes} style={btn('#475569', '#fff')}>Cancelar</button>
          </div>
        </div>
      ) : p.internalNotes ? (
        <div style={{ marginTop: 8, background: '#0f172a', borderRadius: 8, padding: '8px 10px', borderLeft: '3px solid #475569' }}>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>📝 {p.internalNotes}</p>
        </div>
      ) : null}

      {/* Botões de ação */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' as const }}>
        <a href={`${FRONTEND_URL}/proposta/${p.id}`} target="_blank" rel="noreferrer"
          style={linkBadge('#eff6ff', '#bfdbfe', '#2563eb')}>🔗 Ver</a>
        <a href={`${API}/proposals/${p.id}/pdf`} target="_blank" rel="noreferrer"
          style={linkBadge('#fef2f2', '#fecaca', '#dc2626')}>📄 PDF</a>
        <a href={getWhatsAppLink()} target="_blank" rel="noreferrer"
          style={linkBadge('#f0fdf4', '#86efac', '#16a34a')}>📲 WhatsApp</a>
        <button onClick={onEditNotes}
          style={{ ...linkBadge('#1e293b', '#334155', '#94a3b8'), background: '#0f172a' }}>
          📝 Nota
        </button>
        <button onClick={onMarkContacted}
          style={{ ...linkBadge('#1e293b', '#334155', '#a855f7'), background: '#0f172a' }}>
          📞 Contactei
        </button>
        <button onClick={onDuplicate}
          style={{ ...linkBadge('#1e293b', '#334155', '#f59e0b'), background: '#0f172a' }}>
          📋 Duplicar
        </button>
      </div>

      {/* Visualizações */}
      <button onClick={onToggleExpand}
        style={{ marginTop: 8, fontSize: 12, background: '#0f172a', color: '#64748b', border: '1px solid #334155', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
        👁️ {p.viewCount} visualização{p.viewCount !== 1 ? 'ões' : ''} {expanded ? '▲' : '▼'}
      </button>

      {expanded && (
        <div style={{ marginTop: 8, borderTop: '1px solid #1e293b', paddingTop: 8 }}>
          {!views || views.length === 0 ? (
            <p style={{ fontSize: 12, color: '#64748b' }}>Nenhuma visualização registrada.</p>
          ) : views.map((v: any, i: number) => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: i < views.length - 1 ? '1px solid #1e293b' : 'none' }}>
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>📅 {fmtDate(v.viewedAt)}</span>
              <span style={{ color: '#64748b', fontSize: 11 }}>{v.ip ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Contador de status ─────────────────────────────────────────────────────────
function StatusCounter({ label, count, color, active, onClick }: { label: string; count: number; color: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? color : '#1e293b',
      border: `1px solid ${active ? color : '#334155'}`,
      borderRadius: 20, padding: '3px 10px', cursor: 'pointer',
      color: active ? '#fff' : '#94a3b8', fontSize: 12, fontWeight: active ? 700 : 400,
    }}>
      {label} <span style={{ fontWeight: 700 }}>{count}</span>
    </button>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────
function PreviewCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ background: highlight ? '#1d4ed8' : '#0f172a', borderRadius: 8, padding: '8px 10px', border: `1px solid ${highlight ? '#3b82f6' : '#1e293b'}` }}>
      <p style={{ fontSize: 10, color: highlight ? '#bfdbfe' : '#64748b', margin: '0 0 2px', textTransform: 'uppercase' as const }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: highlight ? '#fff' : '#f1f5f9', margin: 0 }}>{value}</p>
    </div>
  );
}
function BRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: highlight ? '#fbbf24' : '#94a3b8' }}>
      <span>{label}</span><span style={{ fontWeight: highlight ? 700 : 400 }}>{value}</span>
    </div>
  );
}
function PricingRow({ config, saving, onSave }: { config: { key: string; value: number; label: string }; saving: boolean; onSave: (raw: string) => void }) {
  const labels: Record<string, { name: string; hint: string; display: (v: number) => string }> = {
    BASE_PRICE:             { name: 'Preço base', hint: 'Valor cobrado até o limite de área (R$)', display: (v) => String(v / 100) },
    EXCESS_PER_M2:          { name: 'Excedente por m²', hint: 'Valor adicional por m² acima do limite (R$)', display: (v) => String(v / 100) },
    COLLECTOR_EXTRA_PER_M2: { name: 'Extra por m² (coletores)', hint: 'Custo extra por m² — embutido no total (R$)', display: (v) => String(v / 100) },
    CARD_MACHINE_RATE:      { name: 'Taxa da maquininha (%)', hint: 'Ex: 3.5 = 3,50%', display: (v) => String(v / 100) },
    INSTALLMENT_12X_RATE:   { name: 'Acréscimo 12×', hint: 'Ex: 12 = 12% de juros no parcelamento 12×', display: (v) => String(v - 100) },
    INSTALLMENT_18X_RATE:   { name: 'Acréscimo 18×', hint: 'Ex: 16 = 16% de juros no parcelamento 18×', display: (v) => String(v - 100) },
  };
  const meta = labels[config.key];
  if (!meta) return null;
  const [val, setVal] = useState(meta.display(config.value));
  useEffect(() => { setVal(meta.display(config.value)); }, [config.value]);
  return (
    <div style={{ ...cardStyle, marginBottom: 10 }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>{meta.name}</p>
      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>{meta.hint}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="number" value={val} onChange={(e) => setVal(e.target.value)}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', fontSize: 14, background: '#0f172a', color: '#f1f5f9' }} />
        <button onClick={() => onSave(val)} disabled={saving}
          style={{ background: saving ? '#475569' : '#F59E0B', color: '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, whiteSpace: 'nowrap' as const }}>
          {saving ? '...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', margin: '16px 0 8px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>{children}</p>;
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4, color: '#cbd5e1' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 8px', borderRadius: 8, border: '1px solid #334155', fontSize: 15, boxSizing: 'border-box', color: '#f1f5f9', background: '#0f172a' };
const selectStyle: React.CSSProperties = { width: '100%', padding: '10px 8px', borderRadius: 8, border: '1px solid #334155', fontSize: 15, color: '#f1f5f9', background: '#0f172a' };
const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: 700, margin: 0, color: '#f1f5f9' };
const cardStyle: React.CSSProperties = { background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 12, marginBottom: 8, color: '#f1f5f9' };
function btn(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, border: 'none', borderRadius: 8, padding: '7px 13px', fontWeight: 600, cursor: 'pointer', fontSize: 12 };
}
function btnSm(bg: string): React.CSSProperties {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 13 };
}
function linkBadge(bg: string, border: string, color: string): React.CSSProperties {
  return { fontSize: 12, color, background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '5px 10px', textDecoration: 'none', fontWeight: 600, cursor: 'pointer' };
}
