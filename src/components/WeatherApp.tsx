import { useState, useEffect, useCallback } from 'react';
import { TemperatureUnit, Location } from '@/types/weather';
import { getWeatherType, getGradientClass, isNightTime, generateLocationId, formatRelativeTime } from '@/utils/weatherUtils';
import { useWeather } from '@/hooks/useWeather';
import { SearchBar } from './SearchBar';
import { CurrentWeather } from './CurrentWeather';
import { HourlyForecast } from './HourlyForecast';
import { DailyForecast } from './DailyForecast';
import { WeatherDetails } from './WeatherDetails';
import { TemperatureToggle } from './TemperatureToggle';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { SavedLocations } from './SavedLocations';
import { WeatherAlerts } from './WeatherAlerts';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

const DEFAULT_LOCATION: Location = {
  name: 'New York',
  lat: 40.7128,
  lon: -74.006,
  country: 'US',
  state: 'New York',
};

export const WeatherApp = () => {
  const [unit, setUnit] = useState<TemperatureUnit>(() => {
    try {
      const saved = localStorage.getItem('weather-unit');
      return saved === 'fahrenheit' ? 'fahrenheit' : 'celsius';
    } catch {
      return 'celsius';
    }
  });
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  const {
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
  } = useWeather();

  const getBackgroundClass = useCallback(() => {
    if (!weatherData) return 'weather-gradient-sunny';

    const isNight = isNightTime(
      weatherData.current.dt,
      weatherData.current.sunrise,
      weatherData.current.sunset,
      weatherData.timezone_offset
    );

    const weatherType = getWeatherType(weatherData.current.weather?.[0], isNight);
    return getGradientClass(weatherType);
  }, [weatherData]);

  useEffect(() => {
    try {
      localStorage.setItem('weather-unit', unit);
    } catch {
      /* private mode / quota */
    }
  }, [unit]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const applyCoords = useCallback(async (latitude: number, longitude: number) => {
    const loc = await reverseGeocode(latitude, longitude);
    const resolved = loc ?? {
      name: 'Current Location',
      lat: latitude,
      lon: longitude,
      country: '',
    };
    setLocation(resolved);
    await fetchWeather(latitude, longitude, { force: true });
  }, [reverseGeocode, setLocation, fetchWeather]);

  useEffect(() => {
    const loadInitialWeather = async () => {
      const saved = localStorage.getItem('weather-locations');
      if (saved) {
        try {
          const locations = JSON.parse(saved) as Location[];
          if (locations.length > 0) {
            const lastLocation = [...locations].sort(
              (a, b) => ((b as { lastAccessed?: number }).lastAccessed || 0) - ((a as { lastAccessed?: number }).lastAccessed || 0)
            )[0];
            setLocation(lastLocation);
            fetchWeather(lastLocation.lat, lastLocation.lon);
            return;
          }
        } catch {
          localStorage.removeItem('weather-locations');
        }
      }

      if ('geolocation' in navigator) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            setIsLocating(false);
            await applyCoords(position.coords.latitude, position.coords.longitude);
          },
          (err) => {
            setIsLocating(false);
            if (err.code === err.PERMISSION_DENIED) {
              setGeoError('Location access is off. Search for a city, or allow location and tap the compass.');
            } else {
              setGeoError('Could not read your location. Showing New York instead.');
            }
            setLocation(DEFAULT_LOCATION);
            fetchWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
          },
          { timeout: 8000 }
        );
      } else {
        setGeoError('This browser cannot share location. Search for a city instead.');
        setLocation(DEFAULT_LOCATION);
        fetchWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
      }
    };

    loadInitialWeather();
  }, []);

  const handleLocationSelect = useCallback((loc: Location) => {
    setGeoError(null);
    setLocation(loc);
    fetchWeather(loc.lat, loc.lon, { force: true });
  }, [setLocation, fetchWeather]);

  const handleGeolocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoError('This browser cannot share location.');
      return;
    }

    setGeoError(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsLocating(false);
        await applyCoords(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Enable it in the browser, then try again.');
        } else {
          setGeoError('Could not get your location. Try searching for a city.');
        }
      },
      { timeout: 8000 }
    );
  }, [applyCoords]);

  const handleRetry = useCallback(() => {
    if (location) {
      fetchWeather(location.lat, location.lon, { force: true });
    }
  }, [location, fetchWeather]);

  const currentId = location ? generateLocationId(location) : undefined;
  const isFavorite = savedLocations.some((l) => l.id === currentId && l.isFavorite);

  return (
    <div
      className={cn(
        'min-h-screen transition-all duration-700',
        getBackgroundClass()
      )}
    >
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4">
          <SearchBar
            onLocationSelect={handleLocationSelect}
            searchLocations={searchLocations}
            onGeolocation={handleGeolocation}
            isLoading={isLoading || isRefreshing || isLocating}
            geoError={geoError}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRetry}
              disabled={!location || isLoading || isRefreshing}
              className="glass-card p-2.5 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
              aria-label="Refresh weather"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4 text-white', isRefreshing && 'animate-spin')} />
            </button>
            <TemperatureToggle unit={unit} onChange={setUnit} />
          </div>
        </header>

        {(isLoading || isLocating) && !weatherData ? (
          <LoadingState />
        ) : error && !weatherData ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : weatherData && location ? (
          <main className="space-y-8">
            {error && (
              <p className="text-sm text-amber-100 bg-black/25 rounded-lg px-3 py-2">
                Latest refresh failed: {error}
              </p>
            )}

            {lastUpdated && (
              <p className="text-white/70 text-xs text-center md:text-right -mb-4" data-tick={nowTick}>
                Updated {formatRelativeTime(lastUpdated)}
              </p>
            )}

            <WeatherAlerts
              current={weatherData.current}
              daily={weatherData.daily}
              unit={unit}
            />

            <CurrentWeather
              weather={weatherData.current}
              location={location}
              unit={unit}
              timezoneOffset={weatherData.timezone_offset}
              isFavorite={isFavorite}
              onToggleFavorite={() => toggleFavorite(location)}
            />

            <HourlyForecast
              hourly={weatherData.hourly}
              current={weatherData.current}
              unit={unit}
              timezoneOffset={weatherData.timezone_offset}
            />

            <DailyForecast
              daily={weatherData.daily}
              unit={unit}
              timezoneOffset={weatherData.timezone_offset}
            />

            <WeatherDetails
              current={weatherData.current}
              daily={weatherData.daily[0]}
              unit={unit}
              timezoneOffset={weatherData.timezone_offset}
            />

            <SavedLocations
              locations={savedLocations}
              onSelect={handleLocationSelect}
              onRemove={removeLocation}
              onToggleFavorite={toggleFavorite}
              currentLocationId={currentId}
            />
          </main>
        ) : null}
      </div>
    </div>
  );
};
