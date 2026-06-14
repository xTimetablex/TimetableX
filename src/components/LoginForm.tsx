'use client';

import { useState } from 'react';
import Image from 'next/image';
import { School, User, Lock, ArrowRight } from 'lucide-react';
import { Credentials } from '@/lib/types';
import { Button } from './button';

interface LoginFormProps {
  onLogin: (creds: Credentials) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [input, setInput] = useState<Credentials>({ school: '', user: '', pass: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.school && input.user && input.pass) {
      onLogin(input);
    }
  };

  return (
    <div className="app-shell flex flex-col items-center justify-center min-h-dvh px-4 py-12">
      <div
        className="w-full max-w-sm panel"
        style={{ padding: '2.5rem' }}
      >
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-5">
            <Image
              src="/pfp.png"
              alt="TimetableX Logo"
              width={64}
              height={64}
              className="rounded-[10px]"
              priority
            />
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight mb-1 display"
            style={{ color: 'var(--color-text)' }}
          >
            TimetableX
          </h1>
          <p className="text-base" style={{ color: 'var(--color-text-secondary)' }}>
            Bitte melde dich an
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* School */}
          <div className="space-y-2">
            <label
              htmlFor="school"
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: 'var(--color-text)' }}
            >
              <School className="size-4" style={{ color: 'var(--color-primary)' }} />
              Schulnummer
            </label>
            <input
              id="school"
              type="text"
              required
              autoComplete="organization"
              placeholder="z.B. 12345678"
              value={input.school}
              onChange={e => setInput(prev => ({ ...prev, school: e.target.value }))}
              className="input-field"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label
              htmlFor="user"
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: 'var(--color-text)' }}
            >
              <User className="size-4" style={{ color: 'var(--color-primary)' }} />
              Benutzername
            </label>
            <input
              id="user"
              type="text"
              required
              autoComplete="username"
              placeholder="Benutzername"
              value={input.user}
              onChange={e => setInput(prev => ({ ...prev, user: e.target.value }))}
              className="input-field"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label
              htmlFor="pass"
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: 'var(--color-text)' }}
            >
              <Lock className="size-4" style={{ color: 'var(--color-primary)' }} />
              Passwort
            </label>
            <input
              id="pass"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={input.pass}
              onChange={e => setInput(prev => ({ ...prev, pass: e.target.value }))}
              className="input-field"
            />
          </div>

          <Button
            type="submit"
            variant="primary" className="w-full text-base"
            style={{ padding: '0.9375rem 1.5rem', marginTop: '0.5rem' }}
          >
            Anmelden
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
