// frontend/pages/admin/login.tsx

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/admin');
      } else {
        setError('Senha incorreta.');
      }
    } catch {
      setError('Erro ao conectar. Tente novamente.');
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLogin();
  }

  return (
    <>
      <Head>
        <title>Login — Sul Placas Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{
        minHeight: '100vh', background: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif', padding: 16,
      }}>
        <div style={{
          background: '#1e293b', borderRadius: 16, padding: 40,
          width: '100%', maxWidth: 380, border: '1px solid #334155',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#F59E0B', borderRadius: 12, padding: '8px 20px', marginBottom: 16,
            }}>
              <span style={{ fontSize: 20 }}>☀️</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Sul Placas</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              Área administrativa
            </p>
          </div>

          {/* Campo de senha */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: '#cbd5e1', marginBottom: 6,
            }}>
              Senha de acesso
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua senha..."
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: error ? '1px solid #ef4444' : '1px solid #334155',
                background: '#0f172a', color: '#f1f5f9', fontSize: 15,
                boxSizing: 'border-box', outline: 'none',
              }}
            />
            {error && (
              <p style={{ color: '#ef4444', fontSize: 13, margin: '6px 0 0' }}>
                {error}
              </p>
            )}
          </div>

          {/* Botão */}
          <button
            onClick={handleLogin}
            disabled={loading || !password}
            style={{
              width: '100%', padding: '13px 0',
              background: loading || !password ? '#78350f' : '#F59E0B',
              color: '#0f172a', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </>
  );
}
