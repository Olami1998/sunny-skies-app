import { CurrentWeather as CurrentWeatherType, Location, TemperatureUnit } from '@/types/weather';
import { formatTemp, formatTime, isNightTime } from '@/utils/weatherUtils';
import { WeatherIcon } from './WeatherIcon';
import { MapPin, Droplets, Wind, Eye, Gauge } from 'lucide-react';

interface CurrentWeatherProps {
  weather: CurrentWeatherType;
  location: Location;
  unit: TemperatureUnit;
  timezoneOffset: number;
}

export const CurrentWeather = ({
  weather,
  location,
  unit,
  timezoneOffset,
}: CurrentWeatherProps) => {
  const isNight = isNightTime(weather.dt, weather.sunrise, weather.sunset);
  
  return (
    <div className="flex flex-col items-center text-center animate-fade-up">
      {/* Location */}
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-white/80" />
        <h1 className="text-xl md:text-2xl font-display font-semibold text-white text-shadow">
          {location.name}
          {location.country && <span className="text-white/70 ml-2">{location.country}</span>}
        </h1>
      </div>
      
      {/* Current Time */}
      <p className="text-white/70 text-sm mb-6">
        {formatTime(weather.dt, timezoneOffset)}
      </p>

      {/* Main Weather Display */}
      <div className="flex flex-col items-center mb-8">
        <WeatherIcon 
          condition={weather.weather[0]} 
          isNight={isNight}
          size="xl" 
          animated
        />
        
        <div className="mt-4">
          <span className="text-7xl md:text-8xl font-display font-bold text-white text-shadow">
            {formatTemp(weather.temp, unit)}
          </span>
        </div>
        
        <p className="text-xl text-white/90 capitalize mt-2 font-medium">
          {weather.weather[0].description}
        </p>
        
        <p className="text-white/70 mt-1">
          Feels like {formatTemp(weather.feels_like, unit)}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-lg">
        <QuickStat
          icon={<Droplets className="w-5 h-5" />}
          label="Humidity"
          value={`${weather.humidity}%`}
        />
        <QuickStat
          icon={<Wind className="w-5 h-5" />}
          label="Wind"
          value={`${Math.round(weather.wind_speed * 3.6)} km/h`}
        />
        <QuickStat
          icon={<Eye className="w-5 h-5" />}
          label="Visibility"
          value={`${(weather.visibility / 1000).toFixed(1)} km`}
        />
        <QuickStat
          icon={<Gauge className="w-5 h-5" />}
          label="Pressure"
          value={`${weather.pressure} hPa`}
        />
      </div>
    </div>
  );
};

interface QuickStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const QuickStat = ({ icon, label, value }: QuickStatProps) => (
  <div className="glass-card rounded-xl p-3 flex flex-col items-center gap-1">
    <div className="text-white/70">{icon}</div>
    <span className="text-white font-semibold text-sm">{value}</span>
    <span className="text-white/60 text-xs">{label}</span>
  </div>
);
