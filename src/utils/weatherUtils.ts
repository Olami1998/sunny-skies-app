import { WeatherCondition, WeatherType, TemperatureUnit } from '@/types/weather';

export const getWeatherType = (
  condition: WeatherCondition,
  isNight: boolean
): WeatherType => {
  const main = condition.main.toLowerCase();
  const id = condition.id;

  if (isNight && main === 'clear') return 'night';
  if (main === 'thunderstorm' || id >= 200 && id < 300) return 'storm';
  if (main === 'snow' || id >= 600 && id < 700) return 'snow';
  if (main === 'rain' || main === 'drizzle' || id >= 300 && id < 600) return 'rainy';
  if (main === 'clouds' && id >= 803) return 'cloudy';
  if (main === 'clouds') return isNight ? 'night' : 'cloudy';
  if (isNight) return 'night';
  return 'sunny';
};

export const getGradientClass = (weatherType: WeatherType): string => {
  const gradients: Record<WeatherType, string> = {
    sunny: 'weather-gradient-sunny',
    cloudy: 'weather-gradient-cloudy',
    rainy: 'weather-gradient-rainy',
    night: 'weather-gradient-night',
    snow: 'weather-gradient-snow',
    storm: 'weather-gradient-storm',
  };
  return gradients[weatherType];
};

export const convertTemp = (
  temp: number,
  unit: TemperatureUnit
): number => {
  if (unit === 'fahrenheit') {
    return Math.round((temp * 9) / 5 + 32);
  }
  return Math.round(temp);
};

export const formatTemp = (
  temp: number,
  unit: TemperatureUnit
): string => {
  const converted = convertTemp(temp, unit);
  return `${converted}°`;
};

export const formatTime = (
  timestamp: number,
  timezoneOffset: number
): string => {
  const date = new Date((timestamp + timezoneOffset) * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
};

export const formatDay = (timestamp: number, timezoneOffset = 0): string => {
  const localMs = (timestamp + timezoneOffset) * 1000;
  const date = new Date(localMs);
  const now = new Date((Date.now() / 1000 + timezoneOffset) * 1000);

  const dateKey = date.toISOString().slice(0, 10);
  const todayKey = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);

  if (dateKey === todayKey) return 'Today';
  if (dateKey === tomorrowKey) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
};

export const formatFullDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

export const getWindDirection = (degrees: number): string => {
  if (!Number.isFinite(degrees)) return '—';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
  return directions[index];
};

export const getUVIndexLevel = (uvi: number): { level: string; color: string } => {
  if (uvi <= 2) return { level: 'Low', color: 'text-green-400' };
  if (uvi <= 5) return { level: 'Moderate', color: 'text-yellow-400' };
  if (uvi <= 7) return { level: 'High', color: 'text-orange-400' };
  if (uvi <= 10) return { level: 'Very High', color: 'text-red-400' };
  return { level: 'Extreme', color: 'text-purple-400' };
};

export const isNightTime = (
  currentTime: number,
  sunrise: number,
  sunset: number,
  timezoneOffset = 0
): boolean => {
  if (sunrise && sunset) {
    return currentTime < sunrise || currentTime > sunset;
  }

  const hour = new Date((currentTime + timezoneOffset) * 1000).getUTCHours();
  return hour < 6 || hour >= 18;
};

export const formatWindSpeed = (
  metersPerSecond: number,
  unit: TemperatureUnit
): string => {
  if (unit === 'fahrenheit') {
    return `${Math.round(metersPerSecond * 2.237)} mph`;
  }
  return `${Math.round(metersPerSecond * 3.6)} km/h`;
};

export const formatRelativeTime = (timestampMs: number): string => {
  const seconds = Math.round((Date.now() - timestampMs) / 1000);
  if (seconds < 15) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
};

export const generateLocationId = (location: { name: string; lat: number; lon: number }): string => {
  return `${location.name}-${location.lat.toFixed(2)}-${location.lon.toFixed(2)}`;
};
