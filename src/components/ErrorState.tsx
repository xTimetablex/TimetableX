'use client';

import { AlertCircle, LogIn, RefreshCw } from 'lucide-react';
import { isAuthError, TimetableRequestError } from '@/lib/timetableQuery';
import { Button } from './button';
import EmptyState from './EmptyState';

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
  /** Logs out so the login form shows (for rejected or expired credentials). */
  onRelogin: () => void;
  compact?: boolean;
}

export default function ErrorState({ error, onRetry, onRelogin, compact = false }: ErrorStateProps) {
  if (isAuthError(error)) {
    return (
      <EmptyState
        icon={AlertCircle}
        tone="danger"
        compact={compact}
        title="Bitte melde dich neu an"
        text={`${error.message} Vielleicht wurde dein Passwort geändert oder die Anmeldung ist abgelaufen.`}
        action={
          <Button onClick={onRelogin} variant="primary" className="text-sm" style={{ padding: '0.75rem 1.5rem' }}>
            <LogIn className="size-4" strokeWidth={2} />
            Neu anmelden
          </Button>
        }
      />
    );
  }

  const unreachable = error instanceof TimetableRequestError && error.status === 502;

  return (
    <EmptyState
      icon={AlertCircle}
      tone="danger"
      compact={compact}
      title={unreachable ? 'stundenplan24.de ist nicht erreichbar' : 'Plan konnte nicht geladen werden'}
      text={unreachable ? 'Der Server der Schule antwortet gerade nicht. Versuch es gleich noch einmal.' : error.message}
      action={
        <Button onClick={onRetry} variant={compact ? 'outline' : 'primary'} className="text-sm" style={{ padding: compact ? '0.5rem 1rem' : '0.75rem 1.5rem' }}>
          <RefreshCw className="size-4" strokeWidth={2} />
          Erneut versuchen
        </Button>
      }
    />
  );
}
