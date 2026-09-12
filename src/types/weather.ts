export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface CurrentWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  visibility: number;
  uvi: number;
  clouds: number;
  weather: WeatherCondition[];
  sunrise: number;
  sunset: number;
  dt: number;
  rain_1h?: number;
  snow_1h?: number;
}

export interface HourlyWeather {
  dt: number;
  temp: number;
  feels_like: number;
  humidity: number;
  weather: WeatherCondition[];
  pop: number;
  wind_speed: number;
}

export interface DailyWeather {
  dt: number;
  temp: {
    min: number;
    max: number;
    day: number;
    night: number;
  };
  feels_like: {
    day: number;
    night: number;
  };
  humidity: number;
  weather: WeatherCondition[];
  pop: number;
  sunrise: number;
  sunset: number;
  uvi: number;
  wind_speed: number;
}

export interface WeatherData {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
}

export interface Location {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export interface SavedLocation extends Location {
  id: string;
  isFavorite?: boolean;
  lastAccessed?: number;
}

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'night' | 'snow' | 'storm';
