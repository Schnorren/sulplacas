// frontend/pages/api/auth/login.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'sulplacas2025';

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  // Seta cookie seguro com validade de 7 dias
  const cookie = serialize('sulplacas_auth', 'authenticated', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7, // 7 dias
    path:     '/',
  });

  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({ ok: true });
}
