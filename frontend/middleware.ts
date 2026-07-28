// frontend/middleware.ts
// Coloque este arquivo na RAIZ do frontend (mesmo nível que pages/)

import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME    = 'sulplacas_auth';
// Deve bater com o valor setado no login (pages/api/auth/login.ts).
const COOKIE_VALUE   = process.env.ADMIN_SESSION_SECRET ?? 'dev-session-secret';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Só protege rotas /admin
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Rota de login: deixa passar sempre
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Verifica cookie de autenticação
  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value === COOKIE_VALUE) {
    return NextResponse.next();
  }

  // Não autenticado → redireciona para login
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
