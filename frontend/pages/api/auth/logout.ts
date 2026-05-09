// frontend/pages/api/auth/logout.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookie = serialize('sulplacas_auth', '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   -1, // expira imediatamente
    path:     '/',
  });

  res.setHeader('Set-Cookie', cookie);
  res.redirect(307, '/admin/login');
}
