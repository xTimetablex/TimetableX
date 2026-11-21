import type { ComponentType, ReactNode } from 'react';

interface EmptyStateProps {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
  tone?: 'primary' | 'danger';
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  tone = 'primary',
  compact = false,
}: EmptyStateProps) {
  const size = compact ? 44 : 56;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'gap-3 px-5 py-8' : 'gap-5 px-6 py-16 sm:py-20'}`}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: tone === 'danger' ? 'var(--color-danger-bg)' : 'var(--color-primary-light)',
          color: tone === 'danger' ? 'var(--color-danger)' : 'var(--color-primary)',
        }}
      >
        <Icon className={compact ? 'size-5' : 'size-7'} strokeWidth={1.75} />
      </div>
      <div className="max-w-sm">
        <p
          className={`${compact ? 'text-sm' : 'text-base'} font-semibold`}
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </p>
        {text ? (
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {text}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
