import { AlertTriangle, Thermometer, Wind, CloudRain, Snowflake, Sun, Eye } from 'lucide-react';
import { CurrentWeather, DailyWeather, TemperatureUnit } from '@/types/weather';
import { convertTemp } from '@/utils/weatherUtils';
import { cn } from '@/lib/utils';

export interface WeatherAlert {
  id: string;
  type: 'extreme-heat' | 'extreme-cold' | 'high-wind' | 'storm' | 'heavy-rain' | 'snow' | 'low-visibility' | 'high-uv';
  severity: 'warning' | 'watch' | 'advisory';
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface WeatherAlertsProps {
  current: CurrentWeather;
  daily: DailyWeather[];
  unit: TemperatureUnit;
}

const getSeverityStyles = (severity: WeatherAlert['severity']) => {
  switch (severity) {
    case 'warning':
      return 'bg-red-500/20 border-red-500/50 text-red-100';
    case 'watch':
      return 'bg-orange-500/20 border-orange-500/50 text-orange-100';
    case 'advisory':
      return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-100';
  }
};

const getSeverityIconStyles = (severity: WeatherAlert['severity']) => {
  switch (severity) {
    case 'warning':
      return 'text-red-400';
    case 'watch':
      return 'text-orange-400';
    case 'advisory':
      return 'text-yellow-400';
  }
};

export const generateAlerts = (
  current: CurrentWeather,
  daily: DailyWeather[],
  unit: TemperatureUnit
): WeatherAlert[] => {
  const alerts: WeatherAlert[] = [];
  const tempC = current.temp;
  const windSpeedMs = current.wind_speed;
  const weatherId = current.weather[0]?.id || 0;
  const visibility = current.visibility;
  const uvi = current.uvi;

  // Extreme Heat (> 35°C / 95°F)
  if (tempC > 35) {
    alerts.push({
      id: 'extreme-heat',
      type: 'extreme-heat',
      severity: tempC > 40 ? 'warning' : 'watch',
      title: 'Extreme Heat Alert',
      description: `Temperature of ${Math.round(convertTemp(tempC, unit))}°${unit === 'celsius' ? 'C' : 'F'} detected. Stay hydrated and avoid prolonged sun exposure.`,
      icon: <Thermometer className="w-5 h-5" />,
    });
  }

  // Extreme Cold (< -10°C / 14°F)
  if (tempC < -10) {
    alerts.push({
      id: 'extreme-cold',
      type: 'extreme-cold',
      severity: tempC < -20 ? 'warning' : 'watch',
      title: 'Extreme Cold Alert',
      description: `Temperature of ${Math.round(convertTemp(tempC, unit))}°${unit === 'celsius' ? 'C' : 'F'} detected. Dress warmly and limit outdoor exposure.`,
      icon: <Snowflake className="w-5 h-5" />,
    });
  }

  // High Wind (> 15 m/s / 33 mph)
  if (windSpeedMs > 15) {
    alerts.push({
      id: 'high-wind',
      type: 'high-wind',
      severity: windSpeedMs > 25 ? 'warning' : 'watch',
      title: 'High Wind Alert',
      description: `Wind speeds of ${Math.round(windSpeedMs * 3.6)} km/h detected. Secure loose objects and use caution outdoors.`,
      icon: <Wind className="w-5 h-5" />,
    });
  }

  // Thunderstorm (weather ID 200-232)
  if (weatherId >= 200 && weatherId <= 232) {
    alerts.push({
      id: 'storm',
      type: 'storm',
      severity: weatherId >= 210 && weatherId <= 221 ? 'warning' : 'watch',
      title: 'Thunderstorm Alert',
      description: 'Thunderstorm activity detected. Seek shelter and avoid open areas.',
      icon: <AlertTriangle className="w-5 h-5" />,
    });
  }

  // Heavy Rain (weather ID 502-504, 522)
  if ((weatherId >= 502 && weatherId <= 504) || weatherId === 522) {
    alerts.push({
      id: 'heavy-rain',
      type: 'heavy-rain',
      severity: 'watch',
      title: 'Heavy Rain Alert',
      description: 'Heavy rainfall detected. Watch for flooding in low-lying areas.',
      icon: <CloudRain className="w-5 h-5" />,
    });
  }

  // Snow (weather ID 600-622)
  if (weatherId >= 600 && weatherId <= 622) {
    const isHeavy = weatherId >= 615 || (weatherId >= 600 && weatherId <= 602 && weatherId !== 600);
    alerts.push({
      id: 'snow',
      type: 'snow',
      severity: isHeavy ? 'watch' : 'advisory',
      title: 'Snow Alert',
      description: 'Snow conditions detected. Roads may be slippery.',
      icon: <Snowflake className="w-5 h-5" />,
    });
  }

  // Low Visibility (< 1000m)
  if (visibility < 1000) {
    alerts.push({
      id: 'low-visibility',
      type: 'low-visibility',
      severity: visibility < 500 ? 'warning' : 'watch',
      title: 'Low Visibility Alert',
      description: `Visibility of ${visibility}m detected. Drive carefully and use fog lights if needed.`,
      icon: <Eye className="w-5 h-5" />,
    });
  }

  // High UV (> 8)
  if (uvi > 8) {
    alerts.push({
      id: 'high-uv',
      type: 'high-uv',
      severity: uvi > 10 ? 'warning' : 'advisory',
      title: 'High UV Index Alert',
      description: `UV index of ${Math.round(uvi)} detected. Use sunscreen and limit sun exposure.`,
      icon: <Sun className="w-5 h-5" />,
    });
  }

  return alerts;
};

export const WeatherAlerts = ({ current, daily, unit }: WeatherAlertsProps) => {
  const alerts = generateAlerts(current, daily, unit);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-400" />
        Weather Alerts ({alerts.length})
      </h3>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'p-4 rounded-xl border backdrop-blur-md transition-all duration-300 hover:scale-[1.01]',
              getSeverityStyles(alert.severity)
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn('mt-0.5', getSeverityIconStyles(alert.severity))}>
                {alert.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold">{alert.title}</h4>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full uppercase font-medium',
                      alert.severity === 'warning' && 'bg-red-500/30',
                      alert.severity === 'watch' && 'bg-orange-500/30',
                      alert.severity === 'advisory' && 'bg-yellow-500/30'
                    )}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="text-sm mt-1 opacity-90">{alert.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
