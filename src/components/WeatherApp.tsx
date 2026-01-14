import { useState, useEffect, useCallback } from 'react';
import { TemperatureUnit, Location } from '@/types/weather';
import { getWeatherType, getGradientClass, isNightTime, generateLocationId } from '@/utils/weatherUtils';
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

export const WeatherApp = () => {
  const [unit, setUnit] = useState<TemperatureUnit>(() => {
    const saved = localStorage.getItem('weather-unit');
    return (saved as TemperatureUnit) || 'celsius';
  });

  const {
    weatherData,
    location,
    isLoading,
    error,
    searchLocations,
    fetchWeather,
    setLocation,
    savedLocations,
    removeLocation,
    reverseGeocode,
  } = useWeather();

  // Determine background gradient based on weather
  const getBackgroundClass = useCallback(() => {
    if (!weatherData) return 'weather-gradient-sunny';
    
    const isNight = isNightTime(
      weatherData.current.dt,
      weatherData.current.sunrise,
      weatherData.current.sunset
    );
    
    const weatherType = getWeatherType(weatherData.current.weather[0], isNight);
    return getGradientClass(weatherType);
  }, [weatherData]);

  // Save unit preference
  useEffect(() => {
    localStorage.setItem('weather-unit', unit);
  }, [unit]);

  // Initial load - try geolocation or default location
  useEffect(() => {
    const loadInitialWeather = async () => {
      // Check for saved locations first
      const saved = localStorage.getItem('weather-locations');
      if (saved) {
        const locations = JSON.parse(saved);
        if (locations.length > 0) {
          const lastLocation = locations[0];
          setLocation(lastLocation);
          fetchWeather(lastLocation.lat, lastLocation.lon);
          return;
        }
      }

      // Try geolocation
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Reverse geocode to get location name
            const loc = await reverseGeocode(latitude, longitude);
            if (loc) {
              setLocation(loc);
            } else {
              setLocation({
                name: 'Current Location',
                lat: latitude,
                lon: longitude,
                country: '',
              });
            }
            
            fetchWeather(latitude, longitude);
          },
          () => {
            // Geolocation denied or error, use default
            const defaultLocation: Location = {
              name: 'New York',
              lat: 40.7128,
              lon: -74.006,
              country: 'US',
              state: 'New York',
            };
            setLocation(defaultLocation);
            fetchWeather(defaultLocation.lat, defaultLocation.lon);
          }
        );
      } else {
        // No geolocation, use default
        const defaultLocation: Location = {
          name: 'New York',
          lat: 40.7128,
          lon: -74.006,
          country: 'US',
          state: 'New York',
        };
        setLocation(defaultLocation);
        fetchWeather(defaultLocation.lat, defaultLocation.lon);
      }
    };

    loadInitialWeather();
  }, []);

  const handleLocationSelect = useCallback((loc: Location) => {
    setLocation(loc);
    fetchWeather(loc.lat, loc.lon);
  }, [setLocation, fetchWeather]);

  const handleGeolocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          const loc = await reverseGeocode(latitude, longitude);
          if (loc) {
            setLocation(loc);
          } else {
            setLocation({
              name: 'Current Location',
              lat: latitude,
              lon: longitude,
              country: '',
            });
          }
          
          fetchWeather(latitude, longitude);
        },
        (err) => {
          console.error('Geolocation error:', err);
        }
      );
    }
  }, [setLocation, fetchWeather, reverseGeocode]);

  const handleRetry = useCallback(() => {
    if (location) {
      fetchWeather(location.lat, location.lon);
    }
  }, [location, fetchWeather]);

  return (
    <div
      className={cn(
        'min-h-screen transition-all duration-700',
        getBackgroundClass()
      )}
    >
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4">
          <SearchBar
            onLocationSelect={handleLocationSelect}
            searchLocations={searchLocations}
            onGeolocation={handleGeolocation}
            isLoading={isLoading}
          />
          <TemperatureToggle unit={unit} onChange={setUnit} />
        </header>

        {/* Content */}
        {isLoading && !weatherData ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : weatherData && location ? (
          <main className="space-y-8">
            {/* Weather Alerts */}
            <WeatherAlerts
              current={weatherData.current}
              daily={weatherData.daily}
              unit={unit}
            />

            {/* Current Weather */}
            <CurrentWeather
              weather={weatherData.current}
              location={location}
              unit={unit}
              timezoneOffset={weatherData.timezone_offset}
            />

            {/* Hourly Forecast */}
            <HourlyForecast
              hourly={weatherData.hourly}
              current={weatherData.current}
              unit={unit}
              timezoneOffset={weatherData.timezone_offset}
            />

            {/* Daily Forecast */}
            <DailyForecast
              daily={weatherData.daily}
              unit={unit}
            />

            {/* Weather Details */}
            <WeatherDetails
              current={weatherData.current}
              daily={weatherData.daily[0]}
              unit={unit}
              timezoneOffset={weatherData.timezone_offset}
            />

            {/* Saved Locations */}
            <SavedLocations
              locations={savedLocations}
              onSelect={handleLocationSelect}
              onRemove={removeLocation}
              currentLocationId={location ? generateLocationId(location) : undefined}
            />
          </main>
        ) : null}
      </div>
    </div>
  );
};
