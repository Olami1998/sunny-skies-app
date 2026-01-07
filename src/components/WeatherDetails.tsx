import { CurrentWeather, DailyWeather, TemperatureUnit } from '@/types/weather';
import { formatTime, getWindDirection, getUVIndexLevel } from '@/utils/weatherUtils';
import { 
  Sunrise, 
  Sunset, 
  Wind, 
  Droplets, 
  Eye, 
  Gauge, 
  Thermometer,
  Sun,
  CloudRain
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherDetailsProps {
  current: CurrentWeather;
  daily: DailyWeather;
  unit: TemperatureUnit;
  timezoneOffset: number;
}

export const WeatherDetails = ({
  current,
  daily,
  timezoneOffset,
}: WeatherDetailsProps) => {
  const uvInfo = getUVIndexLevel(current.uvi);

  return (
    <div className="w-full animate-fade-up" style={{ animationDelay: '0.3s' }}>
      <h2 className="text-lg font-display font-semibold text-white mb-4">
        Weather Details
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* UV Index */}
        <DetailCard
          icon={<Sun className="w-5 h-5" />}
          title="UV Index"
          value={current.uvi.toString()}
          subtitle={uvInfo.level}
          valueClassName={uvInfo.color}
        />

        {/* Sunrise */}
        <DetailCard
          icon={<Sunrise className="w-5 h-5 text-orange-300" />}
          title="Sunrise"
          value={formatTime(current.sunrise, timezoneOffset)}
        />

        {/* Sunset */}
        <DetailCard
          icon={<Sunset className="w-5 h-5 text-orange-400" />}
          title="Sunset"
          value={formatTime(current.sunset, timezoneOffset)}
        />

        {/* Wind */}
        <DetailCard
          icon={<Wind className="w-5 h-5" />}
          title="Wind"
          value={`${Math.round(current.wind_speed * 3.6)} km/h`}
          subtitle={getWindDirection(current.wind_deg)}
        />

        {/* Humidity */}
        <DetailCard
          icon={<Droplets className="w-5 h-5 text-blue-300" />}
          title="Humidity"
          value={`${current.humidity}%`}
          subtitle={current.humidity > 70 ? 'High' : current.humidity < 30 ? 'Low' : 'Normal'}
        />

        {/* Feels Like */}
        <DetailCard
          icon={<Thermometer className="w-5 h-5 text-red-300" />}
          title="Feels Like"
          value={`${Math.round(current.feels_like)}°`}
        />

        {/* Visibility */}
        <DetailCard
          icon={<Eye className="w-5 h-5" />}
          title="Visibility"
          value={`${(current.visibility / 1000).toFixed(1)} km`}
        />

        {/* Pressure */}
        <DetailCard
          icon={<Gauge className="w-5 h-5" />}
          title="Pressure"
          value={`${current.pressure}`}
          subtitle="hPa"
        />

        {/* Precipitation */}
        <DetailCard
          icon={<CloudRain className="w-5 h-5 text-blue-300" />}
          title="Precipitation"
          value={`${Math.round(daily.pop * 100)}%`}
          subtitle="Chance today"
        />
      </div>
    </div>
  );
};

interface DetailCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  valueClassName?: string;
}

const DetailCard = ({ icon, title, value, subtitle, valueClassName }: DetailCardProps) => (
  <div className="glass-card rounded-xl p-4 flex flex-col gap-2">
    <div className="flex items-center gap-2 text-white/70">
      {icon}
      <span className="text-sm">{title}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className={cn("text-2xl font-semibold text-white", valueClassName)}>
        {value}
      </span>
      {subtitle && (
        <span className="text-white/60 text-sm">{subtitle}</span>
      )}
    </div>
  </div>
);
