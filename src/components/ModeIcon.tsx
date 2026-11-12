import { MapPin, User, Users } from 'lucide-react';
import { FilterMode } from '@/lib/types';

export const MODE_LABEL: Record<FilterMode, string> = {
  class: 'Klasse',
  room: 'Raum',
  teacher: 'Lehrer',
};

export const MODE_LABEL_PLURAL: Record<FilterMode, string> = {
  class: 'Klassen',
  room: 'Räume',
  teacher: 'Lehrer',
};

export function ModeIcon({ mode, size = 16 }: { mode: FilterMode; size?: number }) {
  const props = { width: size, height: size, strokeWidth: 1.75, 'aria-hidden': true } as const;
  if (mode === 'class') return <Users {...props} />;
  if (mode === 'room') return <MapPin {...props} />;
  return <User {...props} />;
}
