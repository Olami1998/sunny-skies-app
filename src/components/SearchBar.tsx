import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, MapPin, X, Navigation } from 'lucide-react';
import { Location } from '@/types/weather';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onLocationSelect: (location: Location) => void;
  searchLocations: (query: string) => Promise<Location[]>;
  onGeolocation: () => void;
  isLoading?: boolean;
}

export const SearchBar = ({
  onLocationSelect,
  searchLocations,
  onGeolocation,
  isLoading,
}: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (value: string) => {
    if (value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const results = await searchLocations(value);
    setSuggestions(results);
    setIsOpen(results.length > 0);
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
    inputRef.current?.blur();
  }, [onLocationSelect]);

  const handleClear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }, []);

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
          isFocused && 'ring-2 ring-white/30'
        )}
      >
        <Search className="w-5 h-5 text-white/70 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          placeholder="Search for a city..."
          className="flex-1 bg-transparent text-white placeholder:text-white/50 outline-none text-sm font-medium"
        />
        {query && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        )}
        <button
          onClick={onGeolocation}
          disabled={isLoading}
          className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
          title="Use my location"
        >
          <Navigation className={cn('w-4 h-4 text-white/70', isLoading && 'animate-pulse')} />
        </button>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-xl overflow-hidden z-50 animate-fade-in">
          {suggestions.map((location, index) => (
            <button
              key={`${location.name}-${location.lat}-${index}`}
              onClick={() => handleSelectLocation(location)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
            >
              <MapPin className="w-4 h-4 text-white/60 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{location.name}</p>
                <p className="text-white/60 text-sm truncate">
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
