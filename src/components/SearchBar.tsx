import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, MapPin, X, Navigation } from 'lucide-react';
import { Location } from '@/types/weather';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onLocationSelect: (location: Location) => void;
  searchLocations: (query: string) => Promise<Location[]>;
  onGeolocation: () => void;
  isLoading?: boolean;
  geoError?: string | null;
}

export const SearchBar = ({
  onLocationSelect,
  searchLocations,
  onGeolocation,
  isLoading,
  geoError,
}: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (value: string) => {
    if (value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setNoResults(false);
      return;
    }

    setIsSearching(true);
    const results = await searchLocations(value);
    setSuggestions(results);
    setNoResults(results.length === 0);
    setIsOpen(true);
    setActiveIndex(-1);
    setIsSearching(false);
  }, [searchLocations]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  }, [handleSearch]);

  const handleSelectLocation = useCallback((location: Location) => {
    onLocationSelect(location);
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setNoResults(false);
    inputRef.current?.blur();
  }, [onLocationSelect]);

  const handleClear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setNoResults(false);
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      handleSelectLocation(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div
        className={cn(
          'glass-card flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300',
          isFocused && 'ring-2 ring-white/40'
        )}
      >
        <Search className="w-5 h-5 text-white/80 flex-shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a city..."
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="city-suggestions"
          className="flex-1 bg-transparent text-white placeholder:text-white/60 outline-none text-sm font-medium"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        )}
        <button
          type="button"
          onClick={onGeolocation}
          disabled={isLoading}
          className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
          title="Use my location"
          aria-label="Use my location"
        >
          <Navigation className={cn('w-4 h-4 text-white/80', isLoading && 'animate-pulse')} />
        </button>
      </div>

      {geoError && (
        <p className="mt-2 text-sm text-amber-100 bg-black/20 rounded-lg px-3 py-2">{geoError}</p>
      )}

      {isOpen && (
        <div
          id="city-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 glass-card rounded-xl overflow-hidden z-50 animate-fade-in"
        >
          {isSearching && (
            <p className="px-4 py-3 text-white/80 text-sm">Searching…</p>
          )}
          {!isSearching && noResults && (
            <p className="px-4 py-3 text-white/80 text-sm">No cities found. Try another name.</p>
          )}
          {suggestions.map((location, index) => (
            <button
              key={`${location.name}-${location.lat}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => handleSelectLocation(location)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left',
                index === activeIndex && 'bg-white/15'
              )}
            >
              <MapPin className="w-4 h-4 text-white/70 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{location.name}</p>
                <p className="text-white/70 text-sm truncate">
                  {[location.state, location.country].filter(Boolean).join(', ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
