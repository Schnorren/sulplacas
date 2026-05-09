// frontend/pages/api/auth/logout.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookie = `sulplacas_auth=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
  res.setHeader('Set-Cookie', cookie);
  res.redirect(307, '/admin/login');
}
