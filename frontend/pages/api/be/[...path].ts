// frontend/pages/api/be/[...path].ts
// Proxy de admin (BFF): roda no servidor da Vercel, valida o cookie de login e
// encaminha a chamada para o backend com o secret de admin. Assim o secret NUNCA
// chega ao navegador e a API de admin deixa de ser acessível publicamente.

import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { api: { bodyParser: false } };

const BACKEND =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api';
const API_SECRET = process.env.ADMIN_API_SECRET;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? 'dev-session-secret';

const PASS_THROUGH = ['content-type', 'content-disposition', 'content-length', 'cache-control'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Autenticação: exige o cookie de sessão setado no login do admin.
  if (req.cookies['sulplacas_auth'] !== SESSION_SECRET) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  if (!API_SECRET) {
    return res.status(500).json({ error: 'ADMIN_API_SECRET não configurado no servidor' });
  }

  // 2. Monta a URL de destino (path + querystring originais).
  const path = (req.query.path as string[]).join('/');
  const qIndex = req.url?.indexOf('?') ?? -1;
  const qs = qIndex >= 0 ? req.url!.slice(qIndex) : '';
  const target = `${BACKEND}/${path}${qs}`;

  // 3. Lê o corpo da requisição (bodyParser desligado). Os corpos do admin são
  // sempre JSON/texto, então lemos como string (BodyInit válido).
  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    body = chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined;
  }

  // 4. Encaminha ao backend com o secret de admin (server-to-server).
  const headers: Record<string, string> = { 'x-admin-secret': API_SECRET };
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'] as string;

  try {
    const backendRes = await fetch(target, { method: req.method, headers, body });
    res.status(backendRes.status);
    backendRes.headers.forEach((value, key) => {
      if (PASS_THROUGH.includes(key)) res.setHeader(key, value);
    });
    res.send(Buffer.from(await backendRes.arrayBuffer()));
  } catch {
    res.status(502).json({ error: 'Backend indisponível' });
  }
}
