# Sul Placas — Mini-SaaS de Orçamentos
> Geração de propostas comerciais interativas para aquecimento solar de piscinas.

---

## Arquitetura Geral

```
sulplacas/
├── backend/                  # NestJS + Prisma + PostgreSQL
│   ├── src/
│   │   ├── proposals/
│   │   │   ├── dto/
│   │   │   │   ├── create-proposal.dto.ts
│   │   │   │   └── update-upsells.dto.ts
│   │   │   ├── pdf/
│   │   │   │   └── proposal-pdf.service.ts
│   │   │   ├── proposals.controller.ts
│   │   │   ├── proposals.module.ts
│   │   │   └── proposals.service.ts       ← motor de cálculo
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   └── app.module.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── scripts/
│       └── generate_proposal_pdf.py       ← gerador Python (ReportLab)
│
└── frontend/                 # Next.js + TailwindCSS
    └── pages/
        ├── admin/
        │   └── index.tsx                  ← painel admin mobile
        └── proposta/
            ├── [id].tsx                   ← visão do cliente (React)
            └── [id].html                  ← versão HTML pura (alternativa)
```

---

## Arquivos Entregues

| Arquivo | Descrição |
|---|---|
| `schema.prisma` | Models: Client, Proposal, PricingConfig + enums Region/Status |
| `proposals.service.ts` | Motor de cálculo puro + CRUD + rastreamento de views |
| `proposals.controller-module-dto.ts` | Controller REST, DTOs validados, Module |
| `proposal-pdf.service.ts` | Service NestJS que chama o script Python via stdin/stdout |
| `seed.ts` | Seed inicial com todas as constantes de preço |
| `generate_proposal_pdf.py` | Gerador PDF com ReportLab (modo dev + modo servidor --stdin) |
| `AdminPage.tsx` | Painel admin mobile — formulário + resultado com links |
| `ProposalPage.tsx` | Página de proposta para o cliente (Next.js + SSR) |
| `proposta.html` | Landing page HTML pura, limpa, editável, com design tokens em CSS vars |
| `proposta_sulplacas_completa.pdf` | PDF de exemplo gerado (com todos os upsells) |

---

## Setup Rápido

### Pré-requisitos
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+

### 1. Backend (NestJS)

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar DATABASE_URL no .env:
# DATABASE_URL="postgresql://usuario:senha@localhost:5432/sulplacas"

# Instalar dependência Python para o PDF
pip install reportlab

# Rodar migrations e seed
npx prisma migrate dev --name init
npx prisma db seed

# Iniciar em desenvolvimento
npm run start:dev
```

### 2. Frontend (Next.js)

```bash
cd frontend

npm install

# Configurar variável de ambiente
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

# Iniciar em desenvolvimento
npm run dev
```

### 3. Configurar `package.json` (backend) — seed

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## Variáveis de Ambiente

### Backend (`.env`)

```env
# Banco de dados
DATABASE_URL="postgresql://usuario:senha@localhost:5432/sulplacas"

# Segurança
INTERNAL_SECRET="seu-secret-aqui"

# WhatsApp da empresa Sul Placas (número para CTA da proposta)
EMPRESA_WHATSAPP="5551999999999"

# URL pública do frontend (para montar o link da proposta)
FRONTEND_URL="https://sulplacas.com.br"
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL="https://api.sulplacas.com.br"
INTERNAL_SECRET="seu-secret-aqui"
```

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/proposals` | Cria proposta + cliente (upsert WhatsApp) |
| `GET` | `/proposals` | Lista todas as propostas (admin) |
| `GET` | `/proposals/:id` | Busca proposta + registra view |
| `PATCH` | `/proposals/:id/upsells` | Atualiza upsells escolhidos pelo cliente |
| `PATCH` | `/proposals/:id/approve` | Marca proposta como aprovada |
| `GET` | `/proposals/:id/pdf` | Gera e baixa o PDF personalizado |

### Exemplo: Criar proposta

```bash
curl -X POST http://localhost:3001/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carlos Mendonça",
    "whatsapp": "51999990000",
    "lengthM": 8,
    "widthM": 4,
    "region": "REGIAO_METRO"
  }'
```

Resposta:
```json
{
  "proposalId": "uuid-aqui",
  "proposalLink": "https://sulplacas.com.br/proposta/uuid-aqui",
  "whatsappLink": "https://wa.me/5551999990000?text=...",
  "pricing": {
    "areaM2": 32,
    "totalCash": "R$ 6.570,00",
    "installment12x": "R$ 614,00",
    "installment18x": "R$ 424,00"
  }
}
```

---

## Lógica de Cálculo (Regras de Negócio)

```
Área = Comprimento × Largura

Base = R$ 3.900,00  (piscinas até 18m²)

Excedente = max(0, Área - 18) × R$ 180,00

Deslocamento:
  Porto Alegre (Raio 1)    = R$ 0,00
  Região Metro (Raio 2)    = R$ 150,00
  Interior/Litoral (Raio 3) = R$ 400,00

Total à Vista = Base + Excedente + Deslocamento

12x = (Total × 1.12) ÷ 12
18x = (Total × 1.16) ÷ 18

Upsells (somados ao Total):
  Capa Térmica      = + R$ 600,00
  Controlador Wi-Fi = + R$ 450,00
```

> Todos os valores são armazenados em **centavos (Int)** no banco para evitar erros de ponto flutuante.

---

## Rastreamento de Propostas

O campo `view_count` é incrementado automaticamente toda vez que o endpoint `GET /proposals/:id` é chamado. O `status` muda de `SENT` → `VIEWED` na primeira abertura.

Isso permite ao admin saber:
- Quantas vezes o cliente abriu a proposta
- Quando foi a última visualização (`last_viewed_at`)
- Se o cliente aprovou (`status: APPROVED`)

---

## Personalizar o Design

### Landing HTML (`proposta.html`)

Todos os tokens de design ficam em `:root` no topo do arquivo:

```css
:root {
  --color-brand:     #F59E0B;   /* ← muda aqui para trocar a cor principal */
  --font-display:    'Fraunces', serif;
  --font-body:       'DM Sans', sans-serif;
  --radius-lg:       20px;
  /* ... */
}
```

Basta alterar as variáveis CSS — o design inteiro atualiza automaticamente.

### PDF (`generate_proposal_pdf.py`)

As cores ficam nas constantes no topo do arquivo:

```python
AMBER       = colors.HexColor("#F59E0B")
SLATE_950   = colors.HexColor("#020617")
# ...
```

---

## Roadmap Sugerido

- [ ] Autenticação JWT simples para rota `/admin`
- [ ] Dashboard admin com lista de propostas + status
- [ ] Job cron para expirar propostas após 48h (`status → EXPIRED`)
- [ ] Notificação por WhatsApp quando cliente abre proposta (`view_count = 1`)
- [ ] Edição de preços via interface admin (usando `PricingConfig`)
- [ ] Histórico de propostas por cliente
- [ ] Relatório semanal de conversão (enviado no WhatsApp do admin)
