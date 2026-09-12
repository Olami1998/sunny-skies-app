import { SavedLocation, Location } from '@/types/weather';
import { MapPin, X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SavedLocationsProps {
  locations: SavedLocation[];
  onSelect: (location: Location) => void;
  onRemove: (id: string) => void;
  onToggleFavorite?: (location: Location) => void;
  currentLocationId?: string;
}

export const SavedLocations = ({
  locations,
  onSelect,
  onRemove,
  onToggleFavorite,
  currentLocationId,
}: SavedLocationsProps) => {
  if (locations.length === 0) return null;

  const favorites = locations.filter(l => l.isFavorite);
  const recent = locations.filter(l => !l.isFavorite);

  return (
    <div className="w-full animate-fade-up" style={{ animationDelay: '0.4s' }}>
      {favorites.length > 0 && (
        <>
          <h2 className="text-lg font-display font-semibold text-white mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            Favorite Locations
          </h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {favorites.map((location) => (
              <LocationChip
                key={location.id}
                location={location}
                isActive={location.id === currentLocationId}
                onSelect={onSelect}
                onRemove={onRemove}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </>
      )}

      {recent.length > 0 && (
        <>
          <h2 className="text-lg font-display font-semibold text-white mb-3">
            Recent Searches
          </h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((location) => (
              <LocationChip
                key={location.id}
                location={location}
                isActive={location.id === currentLocationId}
                onSelect={onSelect}
                onRemove={onRemove}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface LocationChipProps {
  location: SavedLocation;
  isActive: boolean;
  onSelect: (location: Location) => void;
  onRemove: (id: string) => void;
  onToggleFavorite?: (location: Location) => void;
}

const LocationChip = ({ location, isActive, onSelect, onRemove, onToggleFavorite }: LocationChipProps) => (
  <div
    className={cn(
      'glass-card rounded-full flex items-center gap-2 pl-3 pr-1 py-1.5 group transition-all',
      isActive && 'ring-2 ring-white/40 bg-white/20'
    )}
  >
    <button
      type="button"
      onClick={() => onSelect(location)}
      className="flex items-center gap-2 text-white hover:text-white/80 transition-colors"
    >
      <MapPin className="w-3 h-3" />
      <span className="text-sm font-medium">{location.name}</span>
      <span className="text-white/70 text-xs">{location.country}</span>
    </button>
    {onToggleFavorite && (
      <button
        type="button"
        aria-label={location.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(location);
        }}
        className="p-1 rounded-full hover:bg-white/20"
      >
        <Star className={cn('w-3 h-3', location.isFavorite ? 'fill-yellow-300 text-yellow-300' : 'text-white/50')} />
      </button>
    )}
    <button
      type="button"
      aria-label={`Remove ${location.name}`}
      onClick={(e) => {
        e.stopPropagation();
        onRemove(location.id);
      }}
      className="p-1 rounded-full hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-all"
    >
      <X className="w-3 h-3 text-white/70" />
    </button>
  </div>
);
