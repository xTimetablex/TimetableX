'use client';

import { isSameEntity } from '@/lib/preferences';
import { Favorite, Selection } from '@/lib/types';
import { Button } from './button';
import { MODE_LABEL } from '@/lib/modeLabels';
import { ModeIcon } from './ModeIcon';

/** One-tap switching between favorites, right under the header. */
export default function FavoritesBar({
  favorites,
  selection,
  onSelect,
}: {
  favorites: Favorite[];
  selection: Selection | null;
  onSelect: (favorite: Favorite) => void;
}) {
  if (favorites.length === 0) return null;

  return (
    <nav className="favorites-bar" aria-label="Favoriten">
      <div className="favorites-bar-inner">
        {favorites.map(favorite => {
          const isActive = isSameEntity(favorite, selection);
          return (
            <Button
              key={`${favorite.mode}-${favorite.value}`}
              onClick={() => onSelect(favorite)}
              variant="chip"
              className={isActive ? 'chip-active' : undefined}
              aria-pressed={isActive}
              aria-label={`${MODE_LABEL[favorite.mode]} ${favorite.value}`}
            >
              <ModeIcon mode={favorite.mode} size={14} />
              <span>{favorite.value}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
