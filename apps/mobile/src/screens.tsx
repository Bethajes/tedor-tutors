import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PublicUser, RegisterRequest } from '@tedor/types';
import { loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from '@tedor/validation';
import { api } from './api';
import { Card, ErrorText, Field, LinkButton, PrimaryButton, useFormState, withKeyboard } from './components';
import type { Screen, Session } from './session';

type Navigate = (screen: Screen) => void;
type Authed = (session: Session) => void;

function extractMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

function LoginScreen({ onNavigate, onAuthed }: { onNavigate: Navigate; onAuthed: Authed }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, setBusy, error, setError } = useFormState();

  async function submit() {
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Check your input');
      return;
    }
    setBusy(true);
    try {
      const result = await api.login(parsed.data);
      await storageSet(result.tokens.accessToken, result.tokens.refreshToken);
      onAuthed({ user: result.user, screen: result.user.emailVerified ? { name: 'dashboard' } : { name: 'verify-email' } });
    } catch (err) {
      setError(extractMessage(err));
      setBusy(false);
    }
  }

  return withKeyboard(
    <Card title="Sign in">
      <ErrorText message={error} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <PrimaryButton label="Sign in" onPress={() => void submit()} busy={busy} />
      <View style={styles.links}>
        <LinkButton label="Forgot password?" onPress={() => onNavigate({ name: 'forgot-password' })} />
        <LinkButton label="Create account" onPress={() => onNavigate({ name: 'register' })} />
      </View>
    </Card>,
  );
}

function RegisterScreen({ onNavigate, onAuthed }: { onNavigate: Navigate; onAuthed: Authed }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CLIENT' | 'TUTOR'>('CLIENT');
  const { busy, setBusy, error, setError } = useFormState();

  async function submit() {
    setError(null);
    const parsed = registerSchema.safeParse({ name, email, phone: phone || undefined, password, role });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Check your input');
      return;
    }
    setBusy(true);
    try {
      const result = await api.register(parsed.data as RegisterRequest);
      await storageSet(result.tokens.accessToken, result.tokens.refreshToken);
      onAuthed({ user: result.user, screen: { name: 'verify-email' } });
    } catch (err) {
      setError(extractMessage(err));
      setBusy(false);
    }
  }

  return withKeyboard(
    <Card title="Create account">
      <ErrorText message={error} />
      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <View style={styles.row}>
        <RoleChip active={role === 'CLIENT'} label="Student" onPress={() => setRole('CLIENT')} />
        <RoleChip active={role === 'TUTOR'} label="Tutor" onPress={() => setRole('TUTOR')} />
      </View>
      <PrimaryButton label="Create account" onPress={() => void submit()} busy={busy} />
      <LinkButton label="Already have an account? Sign in" onPress={() => onNavigate({ name: 'login' })} />
    </Card>,
  );
}

function ForgotPasswordScreen({ onNavigate }: { onNavigate: Navigate }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { busy, setBusy, error, setError } = useFormState();

  async function submit() {
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Enter a valid email');
      return;
    }
    setBusy(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(extractMessage(err));
      setBusy(false);
    }
  }

  return withKeyboard(
    <Card title={sent ? 'Check your email' : 'Reset password'}>
      {sent ? (
        <Text>If an account exists, a reset link has been sent to {email}.</Text>
      ) : (
        <>
          <ErrorText message={error} />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <PrimaryButton label="Send reset link" onPress={() => void submit()} busy={busy} />
        </>
      )}
      <LinkButton label="Back to sign in" onPress={() => onNavigate({ name: 'login' })} />
    </Card>,
  );
}

function ResetPasswordScreen({ onNavigate, onAuthed }: { onNavigate: Navigate; onAuthed: Authed }) {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const { busy, setBusy, error, setError } = useFormState();

  async function submit() {
    setError(null);
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Check your input');
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(parsed.data.token, parsed.data.password);
      onNavigate({ name: 'login' });
    } catch (err) {
      setError(extractMessage(err));
      setBusy(false);
    }
  }

  return withKeyboard(
    <Card title="Set a new password">
      <ErrorText message={error} />
      <Field label="Reset token (from your email link)" value={token} onChangeText={setToken} autoCapitalize="none" />
      <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry />
      <PrimaryButton label="Set new password" onPress={() => void submit()} busy={busy} />
      <LinkButton label="Back to sign in" onPress={() => onNavigate({ name: 'login' })} />
    </Card>,
  );
}

function VerifyEmailScreen({ onAuthed, user }: { onAuthed: Authed; user: PublicUser | null }) {
  const [token, setToken] = useState('');
  const [done, setDone] = useState(false);
  const { busy, setBusy, error, setError } = useFormState();

  async function submit() {
    setError(null);
    const parsed = verifyEmailSchema.safeParse({ token });
    if (!parsed.success) {
      setError('Paste the link or token from your verification email');
      return;
    }
    setBusy(true);
    try {
      await api.verifyEmail(parsed.data.token);
      setDone(true);
      setBusy(false);
    } catch (err) {
      setError(extractMessage(err));
      setBusy(false);
    }
  }

  async function resend() {
    if (!user) return;
    setError(null);
    try {
      await api.resendVerification(user.email);
      setError('Verification email sent.');
    } catch (err) {
      setError(extractMessage(err));
    }
  }

  return withKeyboard(
    <Card title={done ? 'Email verified!' : 'Verify your email'}>
      {done ? (
        <>
          <Text>Your email has been verified.</Text>
          <PrimaryButton label="Continue" onPress={() => user && onAuthed({ user, screen: { name: 'login' } })} />
        </>
      ) : (
        <>
          <Text style={styles.hint}>Paste the token/link from your verification email.</Text>
          <ErrorText message={error} />
          <Field label="Verification token" value={token} onChangeText={setToken} autoCapitalize="none" />
          <PrimaryButton label="Verify email" onPress={() => void submit()} busy={busy} />
          {user ? <LinkButton label="Resend verification email" onPress={() => void resend()} /> : null}
        </>
      )}
    </Card>,
  );
}

function AuthenticatedHome({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const role = session.user.role;
  return (
    <View style={styles.home}>
      <Text style={styles.screenTitle}>Hello, {session.user.name}</Text>
      <Text style={styles.muted}>Role: {role}</Text>
      <Text style={styles.muted}>Email verified: {session.user.emailVerified ? 'Yes' : 'No'}</Text>
      <Text style={styles.muted}>
        {role === 'ADMIN' || role === 'SUPER_ADMIN'
          ? 'Admin dashboard base screen (RBAC confirmed server-side on the API).'
          : 'Your dashboard will appear here after onboarding branches land.'}
      </Text>
      <LinkButton label="Sign out" onPress={onLogout} />
    </View>
  );
}

function RoleChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

async function storageSet(accessToken: string, refreshToken: string) {
  const { storage } = await import('./api');
  await storage.setTokens(accessToken, refreshToken);
}

export function AuthNavigator({
  screen,
  session,
  onNavigate,
  onAuthed,
  onLogout,
}: {
  screen: Screen;
  session: Session | null;
  onNavigate: Navigate;
  onAuthed: Authed;
  onLogout: () => void;
}) {
  switch (screen.name) {
    case 'login':
      return <LoginScreen onNavigate={onNavigate} onAuthed={onAuthed} />;
    case 'register':
      return <RegisterScreen onNavigate={onNavigate} onAuthed={onAuthed} />;
    case 'forgot-password':
      return <ForgotPasswordScreen onNavigate={onNavigate} />;
    case 'reset-password':
      return <ResetPasswordScreen onNavigate={onNavigate} onAuthed={onAuthed} />;
    case 'verify-email':
      return <VerifyEmailScreen onAuthed={onAuthed} user={session?.user ?? null} />;
    case 'dashboard':
    case 'admin':
      return session ? <AuthenticatedHome session={session} onLogout={onLogout} /> : null;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  chipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  chipLabel: { color: '#334155', fontWeight: '600' },
  chipLabelActive: { color: '#ffffff' },
  hint: { color: '#64748b' },
  home: { flex: 1, justifyContent: 'center', gap: 8, padding: 20 },
  muted: { color: '#64748b' },
});