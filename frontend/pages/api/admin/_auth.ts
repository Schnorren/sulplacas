import type { NextApiRequest, NextApiResponse } from 'next';

export function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? 'dev-session-secret';
  if (req.cookies['sulplacas_auth'] !== SESSION_SECRET) {
    res.status(401).json({ error: 'Não autenticado' });
    return false;
  }
  return true;
}
