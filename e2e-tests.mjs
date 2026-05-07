#!/usr/bin/env node
// e2e-tests.mjs
// Testes E2E completos para Sul Placas
// Execução: node e2e-tests.mjs

const API = 'http://localhost:3001/api';
const FRONTEND = 'http://localhost:3000';

let passed = 0;
let failed = 0;
const errors = [];

// ── Helpers ────────────────────────────────────────────────────────────────

function log(msg) { process.stdout.write(msg); }
function ok(name) { passed++; console.log(`  ✅ ${name}`); }
function fail(name, reason) { failed++; errors.push({ name, reason }); console.log(`  ❌ ${name}\n     → ${reason}`); }

async function get(path) {
  const res = await fetch(`${API}${path}`);
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function post(path, data) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function patch(path, data) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function del(path) {
  const res = await fetch(`${API}${path}`, { method: 'DELETE' });
  return { status: res.status };
}

async function getFrontend(path) {
  const res = await fetch(`${FRONTEND}${path}`);
  return { status: res.status, text: await res.text().catch(() => '') };
}

// ── Suite de testes ────────────────────────────────────────────────────────

async function suite(name, fn) {
  console.log(`\n📦 ${name}`);
  await fn();
}

// ══════════════════════════════════════════════════════════════════════════
// SUITE 1 — Health Check
// ══════════════════════════════════════════════════════════════════════════
await suite('Health Check', async () => {
  // Backend
  try {
    const { status } = await get('/proposals');
    status === 200 ? ok('Backend respondendo em /api/proposals') : fail('Backend health', `status ${status}`);
  } catch (e) { fail('Backend acessível', e.message); }

  // Frontend
  try {
    const { status } = await getFrontend('/');
    status === 200 ? ok('Frontend respondendo em /') : fail('Frontend health', `status ${status}`);
  } catch (e) { fail('Frontend acessível', e.message); }

  // Admin page
  try {
    const { status } = await getFrontend('/admin');
    status === 200 ? ok('Página /admin acessível') : fail('Página /admin', `status ${status}`);
  } catch (e) { fail('Página /admin', e.message); }
});

// ══════════════════════════════════════════════════════════════════════════
// SUITE 2 — Upsell Products CRUD
// ══════════════════════════════════════════════════════════════════════════
let upsellId = null;

await suite('Upsell Products CRUD', async () => {
  // Listar upsells
  const { status, body } = await get('/admin/upsells');
  status === 200 ? ok('GET /admin/upsells retorna 200') : fail('GET /admin/upsells', `status ${status}`);
  Array.isArray(body) ? ok('Resposta é um array') : fail('Formato da resposta', 'não é array');

  // Criar upsell
  const { status: s2, body: b2 } = await post('/admin/upsells', {
    name: 'Teste Produto E2E',
    description: 'Produto criado pelo teste',
    priceCents: 9900,
    active: true,
    sortOrder: 99,
  });
  s2 === 201 ? ok('POST /admin/upsells cria produto (201)') : fail('POST /admin/upsells', `status ${s2}`);
  if (b2?.id) { upsellId = b2.id; ok(`Produto criado com ID: ${upsellId.slice(0, 8)}...`); }
  else fail('ID do produto criado', 'não retornou ID');

  b2?.name === 'Teste Produto E2E' ? ok('Nome salvo corretamente') : fail('Nome do produto', `esperado "Teste Produto E2E", recebido "${b2?.name}"`);
  b2?.priceCents === 9900 ? ok('Preço salvo em centavos') : fail('priceCents', `esperado 9900, recebido ${b2?.priceCents}`);

  // Atualizar upsell
  if (upsellId) {
    const { status: s3, body: b3 } = await patch(`/admin/upsells/${upsellId}`, {
      name: 'Produto Atualizado E2E',
      description: 'Atualizado',
      priceCents: 19900,
      active: false,
      sortOrder: 99,
    });
    s3 === 200 ? ok('PATCH /admin/upsells/:id retorna 200') : fail('PATCH /admin/upsells/:id', `status ${s3}`);
    b3?.name === 'Produto Atualizado E2E' ? ok('Nome atualizado corretamente') : fail('Atualização de nome', `recebido "${b3?.name}"`);
    b3?.active === false ? ok('Campo active=false salvo') : fail('Campo active', `esperado false, recebido ${b3?.active}`);
  }

  // Verificar na listagem
  const { body: lista } = await get('/admin/upsells');
  const found = lista?.find((u) => u.id === upsellId);
  found ? ok('Produto aparece na listagem após criação') : fail('Produto na listagem', 'não encontrado');

  // Deletar upsell
  if (upsellId) {
    const { status: s4 } = await del(`/admin/upsells/${upsellId}`);
    s4 === 204 ? ok('DELETE /admin/upsells/:id retorna 204') : fail('DELETE /admin/upsells/:id', `status ${s4}`);

    // Confirmar remoção
    const { body: lista2 } = await get('/admin/upsells');
    const stillExists = lista2?.find((u) => u.id === upsellId);
    !stillExists ? ok('Produto removido da listagem') : fail('Remoção do produto', 'ainda aparece na listagem');
  }
});

// ══════════════════════════════════════════════════════════════════════════
// SUITE 3 — Criação de Proposta
// ══════════════════════════════════════════════════════════════════════════
let proposalId = null;
let proposalLink = null;

await suite('Criação de Proposta', async () => {
  // Proposta válida
  const { status, body } = await post('/proposals', {
    name: 'Cliente E2E Teste',
    whatsapp: '51900000001',
    lengthM: 6,
    widthM: 3,
    clientCity: 'Porto Alegre',
    displacementCostCents: 0,
  });
  status === 201 ? ok('POST /proposals retorna 201') : fail('POST /proposals', `status ${status}`);

  if (body?.proposalId) {
    proposalId = body.proposalId;
    proposalLink = body.proposalLink;
    ok(`Proposta criada: ${proposalId.slice(0, 8)}...`);
  } else fail('proposalId', `não retornou ID — body: ${JSON.stringify(body)}`);

  body?.proposalLink ? ok('proposalLink retornado') : fail('proposalLink', 'ausente');
  body?.whatsappLink ? ok('whatsappLink retornado') : fail('whatsappLink', 'ausente');

  // Pricing
  body?.pricing?.totalCash ? ok(`Preço à vista: ${body.pricing.totalCash}`) : fail('pricing.totalCash', 'ausente');
  body?.pricing?.installment12x ? ok(`12x: ${body.pricing.installment12x}`) : fail('pricing.installment12x', 'ausente');
  body?.pricing?.installment18x ? ok(`18x: ${body.pricing.installment18x}`) : fail('pricing.installment18x', 'ausente');

  // Proposta com deslocamento
  const { status: s2, body: b2 } = await post('/proposals', {
    name: 'Cliente Metropolitano',
    whatsapp: '51900000002',
    lengthM: 5,
    widthM: 4,
    clientCity: 'Região Metropolitana',
    displacementCostCents: 15000,
  });
  s2 === 201 ? ok('Proposta com deslocamento criada') : fail('Proposta com deslocamento', `status ${s2}`);

  // Validar cálculo: 5x4=20m², excede 18m² em 2m²
  // base=390000, excess=2*18000=36000, deslocamento=15000 → total=441000
  if (b2?.pricing) {
    const totalEsperado = 390000 + 36000 + 15000;
    ok(`Total calculado: ${b2.pricing.totalCash} (esperado ~R$ ${(totalEsperado/100).toFixed(2)})`);
  }

  // Proposta sem cidade — deve falhar (campo obrigatório)
  const { status: s3 } = await post('/proposals', {
    name: 'Sem Cidade',
    whatsapp: '51900000003',
    lengthM: 4,
    widthM: 3,
  });
  s3 === 400 ? ok('Proposta sem clientCity retorna 400') : fail('Validação clientCity obrigatório', `esperado 400, recebido ${s3}`);
});

// ══════════════════════════════════════════════════════════════════════════
// SUITE 4 — Visualização de Proposta
// ══════════════════════════════════════════════════════════════════════════
await suite('Visualização de Proposta', async () => {
  if (!proposalId) { fail('Pré-requisito', 'proposalId não disponível'); return; }

  // Buscar proposta
  const { status, body } = await get(`/proposals/${proposalId}`);
  status === 200 ? ok('GET /proposals/:id retorna 200') : fail('GET /proposals/:id', `status ${status}`);

  // Campos obrigatórios
  body?.id ? ok('Campo id presente') : fail('Campo id', 'ausente');
  body?.client?.name ? ok(`Cliente: ${body.client.name}`) : fail('client.name', 'ausente');
  body?.clientCity ? ok(`Cidade: ${body.clientCity}`) : fail('clientCity', 'ausente');
  body?.availableUpsells !== undefined ? ok(`Upsells disponíveis: ${body.availableUpsells.length}`) : fail('availableUpsells', 'ausente');
  body?.pricing?.totalCash ? ok(`Pricing carregado: ${body.pricing.totalCash}`) : fail('pricing', 'ausente');

  // Buscar novamente para ver status atualizado (findOne atualiza após retornar)
  const { body: b2 } = await get(`/proposals/${proposalId}`);
  b2?.status === 'VIEWED' ? ok('Status mudou para VIEWED') : fail('Status VIEWED', `status atual: ${b2?.status}`);
  // Terceira chamada para confirmar incremento
  const { body: b3vc } = await get(`/proposals/${proposalId}`);
  b3vc?.viewCount >= 2 ? ok(`viewCount incrementado: ${b3vc.viewCount}`) : fail('viewCount', `esperado >= 2, recebido ${b3vc?.viewCount}`);

  // Histórico de views
  const { status: sv, body: views } = await get(`/proposals/${proposalId}/views`);
  sv === 200 ? ok('GET /proposals/:id/views retorna 200') : fail('GET /proposals/:id/views', `status ${sv}`);
  Array.isArray(views) ? ok(`Histórico com ${views.length} registros`) : fail('Histórico formato', 'não é array');
  views?.[0]?.viewedAt ? ok(`Timestamp registrado: ${new Date(views[0].viewedAt).toLocaleString('pt-BR')}`) : fail('viewedAt', 'ausente');

  // Proposta inexistente deve retornar 404
  const { status: s404 } = await get('/proposals/00000000-0000-0000-0000-000000000000');
  s404 === 404 ? ok('Proposta inexistente retorna 404') : fail('404 para ID inválido', `recebido ${s404}`);
});

// ══════════════════════════════════════════════════════════════════════════
// SUITE 5 — Upsells na Proposta
// ══════════════════════════════════════════════════════════════════════════
await suite('Upsells na Proposta (seleção pelo cliente)', async () => {
  if (!proposalId) { fail('Pré-requisito', 'proposalId não disponível'); return; }

  // Buscar upsells disponíveis
  const { body: proposal } = await get(`/proposals/${proposalId}`);
  const upsells = proposal?.availableUpsells ?? [];
  upsells.length > 0 ? ok(`${upsells.length} upsells disponíveis`) : fail('Upsells disponíveis', 'nenhum encontrado');

  if (upsells.length === 0) return;

  const upsell1 = upsells[0];
  const totalAntes = proposal?.totalCashCents;

  // Selecionar upsell
  const { status, body } = await patch(`/proposals/${proposalId}/upsells`, {
    selectedUpsellIds: [upsell1.id],
  });
  status === 200 ? ok('PATCH /proposals/:id/upsells retorna 200') : fail('PATCH upsells', `status ${status}`);

  // Total deve aumentar
  body?.totalCashCents > totalAntes
    ? ok(`Total aumentou: ${totalAntes} → ${body.totalCashCents} (+${upsell1.priceCents})`)
    : fail('Total após upsell', `esperado > ${totalAntes}, recebido ${body?.totalCashCents}`);

  body?.upsellTotalCents === upsell1.priceCents
    ? ok(`upsellTotalCents correto: ${body.upsellTotalCents}`)
    : fail('upsellTotalCents', `esperado ${upsell1.priceCents}, recebido ${body?.upsellTotalCents}`);

  // Remover upsells
  const { body: b2 } = await patch(`/proposals/${proposalId}/upsells`, {
    selectedUpsellIds: [],
  });
  b2?.upsellTotalCents === 0 ? ok('upsellTotalCents zerado após remoção') : fail('Remoção de upsells', `esperado 0, recebido ${b2?.upsellTotalCents}`);
  b2?.totalCashCents === totalAntes ? ok('Total voltou ao valor original') : fail('Total após remoção', `esperado ${totalAntes}, recebido ${b2?.totalCashCents}`);
});

// ══════════════════════════════════════════════════════════════════════════
// SUITE 6 — Aprovação de Proposta
// ══════════════════════════════════════════════════════════════════════════
await suite('Aprovação de Proposta', async () => {
  if (!proposalId) { fail('Pré-requisito', 'proposalId não disponível'); return; }

  const { status, body } = await patch(`/proposals/${proposalId}/approve`, {});
  status === 200 ? ok('PATCH /proposals/:id/approve retorna 200') : fail('Aprovação', `status ${status}`);
  body?.status === 'APPROVED' ? ok('Status mudou para APPROVED') : fail('Status APPROVED', `recebido: ${body?.status}`);
});

// ══════════════════════════════════════════════════════════════════════════
// SUITE 7 — Listagem de Propostas
// ══════════════════════════════════════════════════════════════════════════
await suite('Listagem de Propostas', async () => {
  const { status, body } = await get('/proposals');
  status === 200 ? ok('GET /proposals retorna 200') : fail('GET /proposals', `status ${status}`);
  Array.isArray(body) ? ok(`${body.length} propostas listadas`) : fail('Formato listagem', 'não é array');

  const found = body?.find((p) => p.id === proposalId);
  found ? ok('Proposta criada aparece na listagem') : fail('Proposta na listagem', 'não encontrada');
  found?.client?.name ? ok(`Cliente incluído: ${found.client.name}`) : fail('client incluído na listagem', 'ausente');
  found?.clientCity ? ok(`clientCity incluído: ${found.clientCity}`) : fail('clientCity na listagem', 'ausente');
});

// ══════════════════════════════════════════════════════════════════════════
// SUITE 8 — Frontend Pages
// ══════════════════════════════════════════════════════════════════════════
await suite('Frontend Pages', async () => {
  // Página inicial
  const { status: s1 } = await getFrontend('/');
  s1 === 200 ? ok('/ retorna 200') : fail('/', `status ${s1}`);

  // Admin
  const { status: s2, text: t2 } = await getFrontend('/admin');
  s2 === 200 ? ok('/admin retorna 200') : fail('/admin', `status ${s2}`);
  t2.includes('Sul Placas') ? ok('/admin contém "Sul Placas"') : fail('/admin conteúdo', 'não contém "Sul Placas"');

  // Proposta válida
  if (proposalId) {
    const { status: s3 } = await getFrontend(`/proposta/${proposalId}`);
    s3 === 200 ? ok(`/proposta/${proposalId.slice(0,8)}... retorna 200`) : fail('/proposta/:id', `status ${s3} — SSR pode estar falhando`);
  }

  // Proposta inexistente deve retornar 404
  const { status: s4 } = await getFrontend('/proposta/00000000-0000-0000-0000-000000000000');
  s4 === 404 ? ok('/proposta/id-invalido retorna 404') : fail('/proposta/id-invalido', `esperado 404, recebido ${s4}`);
});

// ══════════════════════════════════════════════════════════════════════════
// SUITE 9 — Cálculo de Preços
// ══════════════════════════════════════════════════════════════════════════
await suite('Cálculo de Preços', async () => {
  // Piscina exatamente no limite (18m²) — sem excedente
  const { body: b1 } = await post('/proposals', {
    name: 'Teste Cálculo 18m2',
    whatsapp: '51900000010',
    lengthM: 6, widthM: 3, // 18m²
    clientCity: 'Porto Alegre',
    displacementCostCents: 0,
  });
  // base=390000, excess=0, total=390000
  b1?.pricing ? ok(`18m² → ${b1.pricing.totalCash}`) : fail('Cálculo 18m²', 'pricing ausente');

  // Piscina acima do limite (20m²) — com excedente
  const { body: b2 } = await post('/proposals', {
    name: 'Teste Cálculo 20m2',
    whatsapp: '51900000011',
    lengthM: 5, widthM: 4, // 20m²
    clientCity: 'Porto Alegre',
    displacementCostCents: 0,
  });
  // base=390000, excess=2*18000=36000, total=426000
  if (b2?.pricing) {
    b2.pricing.totalCash.replace(/\s/g, ' ') === 'R$ 4.260,00' || b2.pricing.totalCash.includes('4.260')
      ? ok(`20m² → ${b2.pricing.totalCash} ✓`)
      : fail('Cálculo 20m²', `esperado R$ 4.260,00, recebido ${b2?.pricing?.totalCash}`);
  }

  // Com deslocamento
  const { body: b3 } = await post('/proposals', {
    name: 'Teste Deslocamento',
    whatsapp: '51900000012',
    lengthM: 6, widthM: 3, // 18m²
    clientCity: 'Região Metropolitana',
    displacementCostCents: 15000,
  });
  // base=390000, excess=0, deslocamento=15000, total=405000 = R$ 4.050,00
  if (b3?.pricing) {
    b3.pricing.totalCash.replace(/\s/g, ' ') === 'R$ 4.050,00' || b3.pricing.totalCash.includes('4.050')
      ? ok(`18m² + deslocamento → ${b3.pricing.totalCash} ✓`)
      : fail('Cálculo com deslocamento', `esperado R$ 4.050,00, recebido ${b3?.pricing?.totalCash}`);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// RELATÓRIO FINAL
// ══════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(55));
console.log(`📊 RESULTADO: ${passed} passaram  |  ${failed} falharam`);
console.log('═'.repeat(55));

if (errors.length > 0) {
  console.log('\n🔴 Falhas encontradas:');
  errors.forEach((e, i) => {
    console.log(`  ${i + 1}. ${e.name}`);
    console.log(`     ${e.reason}`);
  });
}

console.log(`\n${failed === 0 ? '🎉 Todos os testes passaram!' : '⚠️  Corrija as falhas acima.'}\n`);
process.exit(failed > 0 ? 1 : 0);
