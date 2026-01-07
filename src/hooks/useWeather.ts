import { useState, useCallback } from 'react';
import { WeatherData, Location, SavedLocation } from '@/types/weather';
import { generateLocationId } from '@/utils/weatherUtils';

const API_KEY = ''; // Will be set by user
const BASE_URL = 'https://api.openweathermap.org';

// Demo data for when API key is not set
const DEMO_WEATHER: WeatherData = {
  lat: 40.7128,
  lon: -74.006,
  timezone: 'America/New_York',
  timezone_offset: -18000,
  current: {
    dt: Date.now() / 1000,
    temp: 22,
    feels_like: 24,
    humidity: 65,
    pressure: 1013,
    wind_speed: 5.5,
    wind_deg: 180,
    visibility: 10000,
    uvi: 6,
    clouds: 25,
    weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
    sunrise: Date.now() / 1000 - 21600,
    sunset: Date.now() / 1000 + 21600,
  },
  hourly: Array.from({ length: 24 }, (_, i) => ({
    dt: Date.now() / 1000 + i * 3600,
    temp: 20 + Math.sin(i / 4) * 5,
    feels_like: 21 + Math.sin(i / 4) * 5,
    humidity: 60 + Math.random() * 20,
    weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: i < 6 || i > 18 ? '01n' : '01d' }],
    pop: Math.random() * 0.3,
    wind_speed: 3 + Math.random() * 5,
  })),
  daily: Array.from({ length: 7 }, (_, i) => ({
    dt: Date.now() / 1000 + i * 86400,
    temp: { min: 15 + i, max: 25 + i, day: 22 + i, night: 16 + i },
    feels_like: { day: 23 + i, night: 17 + i },
    humidity: 55 + Math.random() * 20,
    weather: [{ id: 800 + i * 2, main: i % 3 === 0 ? 'Clouds' : 'Clear', description: 'weather', icon: '01d' }],
    pop: Math.random() * 0.4,
    sunrise: Date.now() / 1000 + i * 86400 - 21600,
    sunset: Date.now() / 1000 + i * 86400 + 21600,
    uvi: 5 + Math.random() * 4,
    wind_speed: 4 + Math.random() * 6,
  })),
};

const DEMO_LOCATION: Location = {
  name: 'New York',
  lat: 40.7128,
  lon: -74.006,
  country: 'US',
  state: 'New York',
};

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
  isDemo: boolean;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();

export const useWeather = (apiKey: string = API_KEY): UseWeatherReturn => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [location, setLocationState] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => {
    const saved = localStorage.getItem('weather-locations');
    return saved ? JSON.parse(saved) : [];
  });

  const isDemo = !apiKey;

  const searchLocations = useCallback(async (query: string): Promise<Location[]> => {
    if (!query.trim()) return [];
    
    if (isDemo) {
      // Return demo suggestions
      return [
        { name: 'New York', lat: 40.7128, lon: -74.006, country: 'US', state: 'New York' },
        { name: 'London', lat: 51.5074, lon: -0.1278, country: 'GB' },
        { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'JP' },
        { name: 'Paris', lat: 48.8566, lon: 2.3522, country: 'FR' },
        { name: 'Sydney', lat: -33.8688, lon: 151.2093, country: 'AU' },
      ].filter(loc => loc.name.toLowerCase().includes(query.toLowerCase()));
    }

    try {
      const response = await fetch(
        `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`
      );
      if (!response.ok) throw new Error('Failed to search locations');
      return await response.json();
    } catch {
      return [];
    }
  }, [apiKey, isDemo]);

  const fetchWeather = useCallback(async (lat: number, lon: number): Promise<void> => {
    const cacheKey = `${lat.toFixed(2)}-${lon.toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setWeatherData(cached.data);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (isDemo) {
      // Use demo data
      await new Promise(resolve => setTimeout(resolve, 500));
      setWeatherData(DEMO_WEATHER);
      setLocationState(DEMO_LOCATION);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=metric&appid=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data: WeatherData = await response.json();
      weatherCache.set(cacheKey, { data, timestamp: Date.now() });
      setWeatherData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, isDemo]);

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
    isDemo,
  };
};
