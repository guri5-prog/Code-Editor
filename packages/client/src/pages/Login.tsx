import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clearAccessToken, isAuthenticated, setAccessToken } from '../services/auth';
import { getApiUrl } from '../config/runtime';

interface TokenExchangeResponse {
  accessToken: string;
}

export function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const authProviders = useMemo(
    () => [
      { id: 'google', label: 'Continue with Google' },
      { id: 'github', label: 'Continue with GitHub' },
    ],
    [],
  );

  useEffect(() => {
    if (isAuthenticated() && !code) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!code) return;

    let cancelled = false;
    setBusy(true);
    setError('');

    fetch(getApiUrl('/api/auth/token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        const text = await res.text();
        const data = text ? (JSON.parse(text) as unknown) : undefined;
        if (!res.ok) {
          const message =
            typeof data === 'object' &&
            data !== null &&
            'error' in data &&
            typeof (data as { error?: { message?: unknown } }).error?.message === 'string'
              ? (data as { error: { message: string } }).error.message
              : `Login failed (${res.status})`;
          throw new Error(message);
        }
        return data as TokenExchangeResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setAccessToken(data.accessToken);
        navigate('/dashboard', { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        clearAccessToken();
        setError(err instanceof Error ? err.message : 'Failed to exchange login code');
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Code Editor</h1>
        <p style={subtitleStyle}>
          Sign in to access your dashboard, templates, and collaborative projects.
        </p>

        <div style={actionsStyle}>
          {authProviders.map((provider) => (
            <a
              key={provider.id}
              href={getApiUrl(`/api/auth/${provider.id}`)}
              style={providerBtnStyle}
              aria-disabled={busy}
            >
              {provider.label}
            </a>
          ))}
        </div>

        {busy && <p style={infoStyle}>Completing sign-in…</p>}
        {error && <p style={errorStyle}>{error}</p>}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background:
    'radial-gradient(circle at 10% 0%, rgba(148,226,213,0.2), transparent 35%), radial-gradient(circle at 90% 100%, rgba(249,226,175,0.2), transparent 35%), var(--bg-primary)',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  backgroundColor: 'var(--bg-surface)',
  padding: '20px',
  boxShadow: '0 18px 50px var(--shadow-color)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 900,
  marginBottom: '6px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
  marginBottom: '14px',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const providerBtnStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '8px',
  textDecoration: 'none',
  textAlign: 'center',
  fontWeight: 700,
  fontSize: '13px',
  backgroundColor: 'var(--accent)',
  color: 'var(--accent-text)',
};

const infoStyle: React.CSSProperties = {
  marginTop: '12px',
  color: 'var(--text-muted)',
  fontSize: '12px',
};

const errorStyle: React.CSSProperties = {
  marginTop: '12px',
  color: 'var(--error)',
  fontSize: '12px',
};
