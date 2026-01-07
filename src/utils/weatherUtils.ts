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

export const formatDay = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { weekday: 'short' });
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
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
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
  sunset: number
): boolean => {
  return currentTime < sunrise || currentTime > sunset;
};

export const generateLocationId = (location: { name: string; lat: number; lon: number }): string => {
  return `${location.name}-${location.lat.toFixed(2)}-${location.lon.toFixed(2)}`;
};
