import { useState, useCallback } from 'react';
import { WeatherData, Location, SavedLocation } from '@/types/weather';
import { generateLocationId } from '@/utils/weatherUtils';
import { supabase } from '@/integrations/supabase/client';

interface UseWeatherReturn {
  weatherData: WeatherData | null;
  location: Location | null;
  isLoading: boolean;
  error: string | null;
  searchLocations: (query: string) => Promise<Location[]>;
  fetchWeather: (lat: number, lon: number) => Promise<void>;
  setLocation: (location: Location) => void;
  savedLocations: SavedLocation[];
  saveLocation: (location: Location) => void;
  removeLocation: (id: string) => void;
  reverseGeocode: (lat: number, lon: number) => Promise<Location | null>;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();

export const useWeather = (): UseWeatherReturn => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [location, setLocationState] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => {
    const saved = localStorage.getItem('weather-locations');
    return saved ? JSON.parse(saved) : [];
  });

  const searchLocations = useCallback(async (query: string): Promise<Location[]> => {
    if (!query.trim() || query.length < 2) return [];

    try {
      const { data, error } = await supabase.functions.invoke('weather', {
        body: null,
        headers: {},
      });

      // Use query params approach
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather?action=geocode&q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Geocode error:', await response.text());
        return [];
      }

      const locations = await response.json();
      return locations.map((loc: any) => ({
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather?action=reverse-geocode&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Reverse geocode error:', await response.text());
        return null;
      }

      const [loc] = await response.json();
      if (loc) {
        return {
          name: loc.name,
          lat: loc.lat,
          lon: loc.lon,
          country: loc.country,
          state: loc.state,
        };
      }
      return null;
    } catch (err) {
      console.error('Reverse geocode error:', err);
      return null;
    }
  }, []);

  const fetchWeather = useCallback(async (lat: number, lon: number): Promise<void> => {
    const cacheKey = `${lat.toFixed(2)}-${lon.toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setWeatherData(cached.data);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather?action=weather&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch weather data');
      }

      const data: WeatherData = await response.json();
      weatherCache.set(cacheKey, { data, timestamp: Date.now() });
      setWeatherData(data);
    } catch (err) {
      console.error('Fetch weather error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setLocation = useCallback((loc: Location) => {
    setLocationState(loc);
    
    // Update recent locations
    const id = generateLocationId(loc);
    setSavedLocations(prev => {
      const updated = prev.filter(l => l.id !== id);
      const newLocation: SavedLocation = { ...loc, id, lastAccessed: Date.now() };
      const result = [newLocation, ...updated].slice(0, 5);
      localStorage.setItem('weather-locations', JSON.stringify(result));
      return result;
    });
  }, []);

  const saveLocation = useCallback((loc: Location) => {
    const id = generateLocationId(loc);
    setSavedLocations(prev => {
      const existing = prev.find(l => l.id === id);
      if (existing) {
        const updated = prev.map(l => 
          l.id === id ? { ...l, isFavorite: true } : l
        );
        localStorage.setItem('weather-locations', JSON.stringify(updated));
        return updated;
      }
      const newLocation: SavedLocation = { ...loc, id, isFavorite: true, lastAccessed: Date.now() };
      const result = [newLocation, ...prev].slice(0, 10);
      localStorage.setItem('weather-locations', JSON.stringify(result));
      return result;
    });
  }, []);

  const removeLocation = useCallback((id: string) => {
    setSavedLocations(prev => {
      const result = prev.filter(l => l.id !== id);
      localStorage.setItem('weather-locations', JSON.stringify(result));
      return result;
    });
  }, []);

  return {
    weatherData,
    location,
    isLoading,
    error,
    searchLocations,
    fetchWeather,
    setLocation,
    savedLocations,
    saveLocation,
    removeLocation,
    reverseGeocode,
  };
};
