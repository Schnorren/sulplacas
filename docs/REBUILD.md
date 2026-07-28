# Reconstrução em contas próprias

Objetivo: subir banco + backend em contas que **você controla**, reimportando o
backup das 13 propostas, e apontar a Vercel (frontend já é seu) pro backend novo.

Frontend (Vercel) e GitHub (`Schnorren/sulplacas`) continuam como estão.

---

## Parte 1 — Banco novo (Supabase, sua conta)

1. Entre em [supabase.com](https://supabase.com) com seu GitHub (`Schnorren`) ou Google.
2. **New project** → nome `sulplacas`, gere uma senha forte (guarde-a), região **South America (São Paulo)**.
3. Crie as tabelas: **SQL Editor** → cole TODO o conteúdo de
   [`backend/prisma/schema.sql`](../backend/prisma/schema.sql) → **Run**.
   (Cria o enum, todas as tabelas e os índices.)
4. Pegue a connection string: **Settings → Database → Connection pooling →
   Session mode** (compatível com IPv4 e com servidor persistente). Algo como:
   `postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`

---

## Parte 2 — Popular o banco (local)

```bash
cd backend
# crie backend/.env com:
#   DATABASE_URL="<string Session pooler da Parte 1>"
npm install
npx prisma generate
npm run db:seed                                   # preços + upsells padrão
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/import-backup.ts
```
O import traz os 10 clientes + 13 propostas e ajusta o contador de códigos.

---

## Parte 3 — Backend novo no Render (conta `moicanloko`)

1. [dashboard.render.com](https://dashboard.render.com) (conta moicanloko) → **New → Web Service**.
2. Conecte o repo `Schnorren/sulplacas`. **Não** use Blueprint (ele criaria 2 serviços); crie um Web Service único.
3. Configuração:
   - **Runtime:** Docker · **Dockerfile path:** `./backend/Dockerfile` · **Docker context:** `./backend`
   - **Plan:** Free · **Health Check Path:** `/api/health`
4. **Environment** (variáveis):
   | Chave | Valor |
   |---|---|
   | `DATABASE_URL` | string Session pooler da Parte 1 |
   | `FRONTEND_URL` | `https://solarsulrs.com.br` |
   | `EMPRESA_WHATSAPP` | seu número (ex: `5551...`) |
   | `ADMIN_API_SECRET` | **gere** um aleatório (`openssl rand -hex 32`) — anote |
   | `PORT` | `3001` |
5. Deploy. Anote a URL nova, ex.: `https://sulplacas-api-xxxx.onrender.com`.

---

## Parte 4 — Apontar a Vercel pro backend novo

Vercel → projeto do frontend → **Settings → Environment Variables**:

| Chave | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<backend-novo>.onrender.com/api` |
| `INTERNAL_API_URL` | `https://<backend-novo>.onrender.com/api` |
| `ADMIN_API_SECRET` | **o mesmo** valor do Render |
| `ADMIN_SESSION_SECRET` | gere **outro** aleatório |
| `ADMIN_PASSWORD` | sua senha do admin |
| `NEXT_PUBLIC_FRONTEND_URL` | `https://solarsulrs.com.br` |
| `NEXT_PUBLIC_EMPRESA_WHATSAPP` | seu número |

Depois: **Redeploy** do frontend.

---

## Parte 5 — keep-alive

Em [`.github/workflows/keep-alive.yml`](../.github/workflows/keep-alive.yml),
troque a URL antiga pela do backend novo.

---

## Parte 6 — Subir o código (com a proteção)

Com `ADMIN_API_SECRET` já configurado no backend novo **e** na Vercel, é seguro
commitar e dar push de todas as melhorias. O backend novo sobe automaticamente.
(O backend antigo também sobe e vai dar 401 — tudo bem, a Vercel já aponta pro novo.)
