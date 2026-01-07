import { DailyWeather, TemperatureUnit } from '@/types/weather';
import { formatTemp, formatDay } from '@/utils/weatherUtils';
import { WeatherIcon } from './WeatherIcon';
import { Droplets } from 'lucide-react';

interface DailyForecastProps {
  daily: DailyWeather[];
  unit: TemperatureUnit;
}

export const DailyForecast = ({ daily, unit }: DailyForecastProps) => {
  // Take next 7 days (including today)
  const forecast = daily.slice(0, 7);

  // Find min and max temps for the range bar
  const allTemps = forecast.flatMap(d => [d.temp.min, d.temp.max]);
  const minTemp = Math.min(...allTemps);
  const maxTemp = Math.max(...allTemps);
  const tempRange = maxTemp - minTemp;

  return (
    <div className="w-full animate-fade-up" style={{ animationDelay: '0.2s' }}>
      <h2 className="text-lg font-display font-semibold text-white mb-4">
        7-Day Forecast
      </h2>

      <div className="glass-card rounded-2xl overflow-hidden">
        {forecast.map((day, index) => {
          const lowPosition = ((day.temp.min - minTemp) / tempRange) * 100;
          const highPosition = ((day.temp.max - minTemp) / tempRange) * 100;
          
          return (
            <div
              key={day.dt}
              className="flex items-center gap-4 px-4 py-3 border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors"
            >
              {/* Day */}
              <span className="text-white font-medium w-20 flex-shrink-0">
                {formatDay(day.dt)}
              </span>

              {/* Icon and Pop */}
              <div className="flex items-center gap-2 w-16 flex-shrink-0">
                <WeatherIcon
                  condition={day.weather[0]}
                  size="sm"
                />
                {day.pop > 0.1 && (
                  <div className="flex items-center gap-0.5 text-blue-200">
                    <Droplets className="w-3 h-3" />
                    <span className="text-xs">{Math.round(day.pop * 100)}%</span>
                  </div>
                )}
              </div>

              {/* Low Temp */}
              <span className="text-white/60 text-sm w-10 text-right">
                {formatTemp(day.temp.min, unit)}
              </span>

              {/* Temperature Bar */}
              <div className="flex-1 h-1.5 bg-white/10 rounded-full relative mx-2">
                <div
                  className="absolute h-full rounded-full"
                  style={{
                    left: `${lowPosition}%`,
                    right: `${100 - highPosition}%`,
                    background: 'linear-gradient(to right, hsl(200, 80%, 60%), hsl(35, 95%, 55%))',
                  }}
                />
              </div>

              {/* High Temp */}
              <span className="text-white font-medium w-10">
                {formatTemp(day.temp.max, unit)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
