'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AlertCircle, ArrowRight, Loader2, Lock, School, Sparkles, User } from 'lucide-react';
import { Credentials } from '@/lib/types';
import { Button } from './button';

interface LoginFormProps {
  onLogin: (creds: Credentials) => Promise<void>;
}

const DEMO_CREDENTIALS: Credentials = { school: 'demo', user: 'demo', pass: 'demo' };

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [input, setInput] = useState<Credentials>({ school: '', user: '', pass: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (credentials: Credentials) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onLogin(credentials);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Anmeldung fehlgeschlagen.');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.school && input.user && input.pass) void submit(input);
  };

  return (
    <div className="app-shell flex flex-col items-center justify-center min-h-dvh px-4 py-12">
      <div className="w-full max-w-sm panel" style={{ padding: '2.25rem' }}>
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5">
            <Image src="/pfp.png" alt="TimetableX Logo" width={64} height={64} className="rounded-[10px]" priority />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1 display" style={{ color: 'var(--color-text)' }}>
            TimetableX
          </h1>
          <p className="text-base text-center" style={{ color: 'var(--color-text-secondary)' }}>
            Melde dich mit den Zugangsdaten deiner Schule an
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isSubmitting}>
          <div className="space-y-2">
            <label htmlFor="school" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              <School className="size-4" style={{ color: 'var(--color-primary)' }} aria-hidden />
              Schulnummer
            </label>
            <input
              id="school"
              name="school"
              type="text"
              inputMode="numeric"
              required
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="z.B. 12345678"
              value={input.school}
              onChange={e => setInput(prev => ({ ...prev, school: e.target.value }))}
              className="input-field"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="user" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              <User className="size-4" style={{ color: 'var(--color-primary)' }} aria-hidden />
              Benutzername
            </label>
            <input
              id="user"
              name="username"
              type="text"
              required
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Benutzername"
              value={input.user}
              onChange={e => setInput(prev => ({ ...prev, user: e.target.value }))}
              className="input-field"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="pass" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              <Lock className="size-4" style={{ color: 'var(--color-primary)' }} aria-hidden />
              Passwort
            </label>
            <input
              id="pass"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={input.pass}
              onChange={e => setInput(prev => ({ ...prev, pass: e.target.value }))}
              className="input-field"
            />
          </div>

          {error && (
            <p className="login-error" role="alert">
              <AlertCircle className="size-4 flex-shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full text-base"
            style={{ padding: '0.9375rem 1.5rem', marginTop: '0.5rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Anmeldedaten werden geprüft…
              </>
            ) : (
              <>
                Anmelden
                <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-xs text-center leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Das sind dieselben Zugangsdaten wie für VPMobil bzw. stundenplan24.de. Du bekommst sie von
          deiner Schule.
        </p>

        <button
          type="button"
          className="footer-action mx-auto mt-4"
          onClick={() => void submit(DEMO_CREDENTIALS)}
          disabled={isSubmitting}
        >
          <Sparkles className="size-3.5" strokeWidth={2} aria-hidden />
          Ohne Zugangsdaten ausprobieren (Demo)
        </button>
      </div>
    </div>
  );
}
