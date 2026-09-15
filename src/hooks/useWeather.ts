import { useState, useCallback, useRef } from 'react';
import { WeatherData, Location, SavedLocation } from '@/types/weather';
import { generateLocationId } from '@/utils/weatherUtils';

interface UseWeatherReturn {
  weatherData: WeatherData | null;
  location: Location | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  searchLocations: (query: string) => Promise<Location[]>;
  fetchWeather: (lat: number, lon: number, options?: { force?: boolean }) => Promise<void>;
  setLocation: (location: Location) => void;
  savedLocations: SavedLocation[];
  toggleFavorite: (location: Location) => void;
  removeLocation: (id: string) => void;
  reverseGeocode: (lat: number, lon: number) => Promise<Location | null>;
}

const CACHE_DURATION = 10 * 60 * 1000;
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();

function weatherConfig(): { url: string; key: string } {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Weather API is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then redeploy.'
    );
  }
  return { url, key };
}

function weatherFunctionUrl(params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  return `${weatherConfig().url}/functions/v1/weather?${query.toString()}`;
}

function authHeaders(): HeadersInit {
  const { key } = weatherConfig();
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
  };
}

function readSavedLocations(): SavedLocation[] {
  try {
    const saved = localStorage.getItem('weather-locations');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    try {
      localStorage.removeItem('weather-locations');
    } catch {
      /* ignore */
    }
    return [];
  }
}

function persistLocations(next: SavedLocation[]) {
  try {
    localStorage.setItem('weather-locations', JSON.stringify(next));
  } catch (err) {
    console.error('Could not save locations', err);
  }
  return next;
}

export const useWeather = (): UseWeatherReturn => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [location, setLocationState] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(readSavedLocations);

  const weatherDataRef = useRef<WeatherData | null>(null);
  weatherDataRef.current = weatherData;
  const weatherRequestRef = useRef(0);
  const weatherAbortRef = useRef<AbortController | null>(null);

  const searchLocations = useCallback(async (query: string): Promise<Location[]> => {
    if (!query.trim() || query.length < 2) return [];

    try {
      const response = await fetch(
        weatherFunctionUrl({ action: 'geocode', q: query }),
        { headers: authHeaders() }
      );

      if (!response.ok) {
        console.error('Geocode error:', await response.text());
        return [];
      }

      const locations = await response.json();
      if (!Array.isArray(locations)) return [];

      return locations.map((loc: Location) => ({
        name: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        country: loc.country,
        state: loc.state,
      }));
    } catch (err) {
      console.error('Search locations error:', err);
      return [];
    }
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<Location | null> => {
    try {
      const response = await fetch(
        weatherFunctionUrl({
          action: 'reverse-geocode',
          lat: String(lat),
          lon: String(lon),
        }),
        { headers: authHeaders() }
      );

      if (!response.ok) {
        console.error('Reverse geocode error:', await response.text());
        return null;
      }

      const [loc] = await response.json();
      if (!loc) return null;

      return {
        name: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        country: loc.country,
        state: loc.state,
      };
    } catch (err) {
      console.error('Reverse geocode error:', err);
      return null;
    }
  }, []);

  const fetchWeather = useCallback(async (lat: number, lon: number, options?: { force?: boolean }): Promise<void> => {
    const cacheKey = `${lat.toFixed(4)}-${lon.toFixed(4)}`;
    const cached = weatherCache.get(cacheKey);

    if (!options?.force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      weatherAbortRef.current?.abort();
      weatherRequestRef.current += 1;
      setWeatherData(cached.data);
      setLastUpdated(cached.timestamp);
      setError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    weatherAbortRef.current?.abort();
    const controller = new AbortController();
    weatherAbortRef.current = controller;
    const requestId = weatherRequestRef.current + 1;
    weatherRequestRef.current = requestId;

    const hasExisting = Boolean(weatherDataRef.current);
    if (hasExisting) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(
        weatherFunctionUrl({
          action: 'weather',
          lat: String(lat),
          lon: String(lon),
        }),
        { headers: authHeaders(), signal: controller.signal }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch weather data' }));
        throw new Error(errorData.error || 'Failed to fetch weather data');
      }

      const data: WeatherData = await response.json();
      if (requestId !== weatherRequestRef.current) return;

      const timestamp = Date.now();
      weatherCache.set(cacheKey, { data, timestamp });
      setWeatherData(data);
      setLastUpdated(timestamp);
    } catch (err) {
      if (controller.signal.aborted || requestId !== weatherRequestRef.current) return;
      console.error('Fetch weather error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      if (requestId === weatherRequestRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  const setLocation = useCallback((loc: Location) => {
    setLocationState(loc);

    const id = generateLocationId(loc);
    setSavedLocations(prev => {
      const existing = prev.find(l => l.id === id);
      const updated = prev.filter(l => l.id !== id);
      const newLocation: SavedLocation = {
        ...loc,
        id,
        lastAccessed: Date.now(),
        isFavorite: existing?.isFavorite,
      };
      const favorites = updated.filter(l => l.isFavorite);
      const recents = updated.filter(l => !l.isFavorite);
      const nextRecents = [newLocation, ...recents].slice(0, 8);
      if (newLocation.isFavorite) {
        return persistLocations([newLocation, ...favorites.filter(l => l.id !== id), ...recents].slice(0, 12));
      }
      return persistLocations([...favorites, ...nextRecents].slice(0, 12));
    });
  }, []);

  const toggleFavorite = useCallback((loc: Location) => {
    const id = generateLocationId(loc);
    setSavedLocations(prev => {
      const existing = prev.find(l => l.id === id);
      if (existing) {
        return persistLocations(
          prev.map(l => (l.id === id ? { ...l, isFavorite: !l.isFavorite } : l))
        );
      }
      const newLocation: SavedLocation = {
        ...loc,
        id,
        isFavorite: true,
        lastAccessed: Date.now(),
      };
      return persistLocations([newLocation, ...prev].slice(0, 12));
    });
  }, []);

  const removeLocation = useCallback((id: string) => {
    setSavedLocations(prev => persistLocations(prev.filter(l => l.id !== id)));
  }, []);

  return {
    weatherData,
    location,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    searchLocations,
    fetchWeather,
    setLocation,
    savedLocations,
    toggleFavorite,
    removeLocation,
    reverseGeocode,
  };
};
