import { CurrentWeather, DailyWeather, TemperatureUnit } from '@/types/weather';
import { formatTemp, formatTime, getWindDirection, getUVIndexLevel, formatWindSpeed, formatVisibility, formatDay } from '@/utils/weatherUtils';
import {
  Sunrise,
  Sunset,
  Wind,
  Droplets,
  Eye,
  Gauge,
  Thermometer,
  Sun,
  CloudRain,
  Cloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherDetailsProps {
  current: CurrentWeather;
  daily?: DailyWeather;
  unit: TemperatureUnit;
  timezoneOffset: number;
}

export const WeatherDetails = ({
  current,
  daily,
  unit,
  timezoneOffset,
}: WeatherDetailsProps) => {
  const uvInfo = getUVIndexLevel(current.uvi ?? 0);
  const pop = daily?.pop ?? 0;
  const rain = current.rain_1h ?? 0;
  const dayLabel = daily ? formatDay(daily.dt, timezoneOffset) : 'Today';
  const precipLabel = rain > 0 ? `${rain.toFixed(1)} mm/h` : `${Math.round(pop * 100)}%`;
  const precipSubtitle = rain > 0
    ? 'Falling now'
    : dayLabel === 'Today'
      ? 'Chance today'
      : `Chance ${dayLabel.toLowerCase()}`;

  return (
    <div className="w-full animate-fade-up" style={{ animationDelay: '0.3s' }}>
      <h2 className="text-lg font-display font-semibold text-white mb-4">
        Weather Details
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <DetailCard
          icon={<Sun className="w-5 h-5" />}
          title="UV Index"
          value={Math.round(current.uvi ?? 0).toString()}
          subtitle={`${uvInfo.level} (est.)`}
          valueClassName={uvInfo.color}
        />

        <DetailCard
          icon={<Sunrise className="w-5 h-5 text-orange-300" />}
          title="Sunrise"
          value={current.sunrise ? formatTime(current.sunrise, timezoneOffset) : '—'}
        />

        <DetailCard
          icon={<Sunset className="w-5 h-5 text-orange-400" />}
          title="Sunset"
          value={current.sunset ? formatTime(current.sunset, timezoneOffset) : '—'}
        />

        <DetailCard
          icon={<Wind className="w-5 h-5" />}
          title="Wind"
          value={formatWindSpeed(current.wind_speed, unit)}
          subtitle={getWindDirection(current.wind_deg ?? 0)}
        />

        <DetailCard
          icon={<Droplets className="w-5 h-5 text-blue-300" />}
          title="Humidity"
          value={`${current.humidity}%`}
          subtitle={current.humidity > 70 ? 'High' : current.humidity < 30 ? 'Low' : 'Normal'}
        />

        <DetailCard
          icon={<Thermometer className="w-5 h-5 text-red-300" />}
          title="Feels Like"
          value={formatTemp(current.feels_like, unit)}
        />

        <DetailCard
          icon={<Eye className="w-5 h-5" />}
          title="Visibility"
          value={formatVisibility(current.visibility ?? 0, unit)}
        />

        <DetailCard
          icon={<Gauge className="w-5 h-5" />}
          title="Pressure"
          value={`${current.pressure}`}
          subtitle="hPa"
        />

        <DetailCard
          icon={<CloudRain className="w-5 h-5 text-blue-300" />}
          title="Precipitation"
          value={precipLabel}
          subtitle={precipSubtitle}
        />

        <DetailCard
          icon={<Cloud className="w-5 h-5" />}
          title="Cloud cover"
          value={`${current.clouds ?? 0}%`}
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
    <div className="flex items-center gap-2 text-white/80">
      {icon}
      <span className="text-sm">{title}</span>
    </div>
    <div className="flex items-baseline gap-1 flex-wrap">
      <span className={cn("text-2xl font-semibold text-white", valueClassName)}>
        {value}
      </span>
      {subtitle && (
        <span className="text-white/70 text-sm">{subtitle}</span>
      )}
    </div>
  </div>
);
