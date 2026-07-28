Deploy to Vercel

1) Prepare env vars in Vercel (Settings → Environment Variables):
- ADMIN_API_SECRET (server-only)
- ADMIN_SESSION_SECRET (server-only)
- ADMIN_PASSWORD (server-only)
- DATABASE_URL (server-only) or PRISMA_DATA_PROXY_URL (server-only)
- NEXT_PUBLIC_FRONTEND_URL (public)
- NEXT_PUBLIC_EMPRESA_WHATSAPP (public)

2) In Vercel, import this repository and set `Root Directory` to the project root. The `vercel.json` provided points the build to `frontend` package.

3) If using Prisma in serverless, prefer Prisma Data Proxy or a serverless-friendly DB (Neon). Set `PRISMA_DATA_PROXY_URL` and remove direct `DATABASE_URL` if using the proxy.

4) After deploy, add any secrets in the Vercel dashboard matching the names used in `vercel.json`.

Notes
- The admin UI authenticates via `POST /api/auth/login` which sets a `sulplacas_auth` cookie. Keep `ADMIN_SESSION_SECRET` identical across environments.
- For local development, run Postgres and the existing backend or point `DATABASE_URL` to your local DB and run `cd frontend && npm run dev`.
