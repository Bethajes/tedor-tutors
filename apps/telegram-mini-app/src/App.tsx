import { useEffect, useState } from 'react';
import { api, getTelegramWebApp, isRunningInsideTelegram } from './telegram';
import type { PublicUser } from '@tedor/types';
import { loginSchema } from '@tedor/validation';

interface ViewState {
  checking: boolean;
  user: PublicUser | null;
  telegramUser: { firstName: string; username?: string } | null;
  inTelegram: boolean;
  linked: boolean | null;
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

export default function App() {
  const [state, setState] = useState<ViewState>({
    checking: true,
    user: null,
    telegramUser: null,
    inTelegram: false,
    linked: null,
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    const inTelegram = isRunningInsideTelegram();
    if (webApp) webApp.ready();

    let dispose = true;
    (async () => {
      let user: PublicUser | null = null;
      try {
        user = await api.me();
      } catch {
        user = null;
      }
      if (!dispose) return;
      setState({
        checking: false,
        user,
        telegramUser: webApp?.initDataUnsafe.user
          ? { firstName: webApp.initDataUnsafe.user.first_name, username: webApp.initDataUnsafe.user.username }
          : null,
        inTelegram,
        linked: null,
      });
    })();
    return () => {
      dispose = false;
    };
  }, []);

  async function signIn() {
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Check your input');
      return;
    }
    setBusy(true);
    try {
      const result = await api.login(parsed.data);
      localStorage.setItem('tedor_access_token', result.tokens.accessToken);
      localStorage.setItem('tedor_refresh_token', result.tokens.refreshToken);
      setState((prev) => ({ ...prev, user: result.user }));
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  async function link() {
    const webApp = getTelegramWebApp();
    if (!webApp || !webApp.initData) {
      setError('Telegram initData is not available. Open this app inside Telegram.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.linkTelegram(webApp.initData);
      setState((prev) => ({ ...prev, linked: true }));
    } catch (err) {
      setError(messageFor(err));
      setState((prev) => ({ ...prev, linked: false }));
    } finally {
      setBusy(false);
    }
  }

  if (state.checking) {
    return <div className="card">Loading…</div>;
  }

  return (
    <div className="card">
      <h1>Tedor Path</h1>
      <p className="muted">
        {state.inTelegram
          ? `Running inside Telegram as ${state.telegramUser?.firstName ?? 'unknown user'}.`
          : 'Running outside Telegram (web preview).'}
      </p>

      {error ? <div className="error">{error}</div> : null}

      {state.user ? (
        <>
          <p>
            Signed in as <strong>{state.user.name}</strong> ({state.user.email}).
          </p>
          {state.user.telegramLinked ? (
            <p className="muted">This account is already linked to a Telegram user.</p>
          ) : state.inTelegram ? (
            <button onClick={() => void link()} disabled={busy}>
              {busy ? 'Linking…' : 'Link Telegram account'}
            </button>
          ) : (
            <p className="muted">Open this app in Telegram to link your account.</p>
          )}
          {state.linked === true ? <p>Telegram linked successfully.</p> : null}
          <button
            onClick={() => {
              localStorage.removeItem('tedor_access_token');
              localStorage.removeItem('tedor_refresh_token');
              setState((prev) => ({ ...prev, user: null, linked: null }));
            }}
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
          <button onClick={() => void signIn()} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </>
      )}
    </div>
  );
}