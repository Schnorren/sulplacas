// frontend/pages/api/auth/login.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'sulplacas2025';

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  // Valor do cookie = secret de sessão (não a string fixa "authenticated", que
  // qualquer um poderia forjar). O cookie é httpOnly, então não vaza para o JS.
  const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? 'dev-session-secret';
  const isProd = process.env.NODE_ENV === 'production';
  const maxAge = 60 * 60 * 24 * 7;
  const cookie = `sulplacas_auth=${SESSION_SECRET}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;

  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({ ok: true });
}
