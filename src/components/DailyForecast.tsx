import { useState } from 'react';
import { DailyWeather, TemperatureUnit } from '@/types/weather';
import { formatTemp, formatDay, formatWindSpeed } from '@/utils/weatherUtils';
import { WeatherIcon } from './WeatherIcon';
import { Droplets, Wind } from 'lucide-react';

interface DailyForecastProps {
  daily: DailyWeather[];
  unit: TemperatureUnit;
  timezoneOffset: number;
}

export const DailyForecast = ({ daily, unit, timezoneOffset }: DailyForecastProps) => {
  const [openDay, setOpenDay] = useState<number | null>(null);
  const forecast = daily.slice(0, 7);
  const heading = `${forecast.length}-Day Forecast`;

  const allTemps = forecast.flatMap(d => [d.temp.min, d.temp.max]);
  const minTemp = Math.min(...allTemps);
  const maxTemp = Math.max(...allTemps);
  const tempRange = maxTemp - minTemp || 1;

  return (
    <div className="w-full animate-fade-up" style={{ animationDelay: '0.2s' }}>
      <h2 className="text-lg font-display font-semibold text-white mb-4">
        {heading}
      </h2>

      <div className="glass-card rounded-2xl overflow-hidden">
        {forecast.map((day) => {
          const lowPosition = ((day.temp.min - minTemp) / tempRange) * 100;
          const highPosition = ((day.temp.max - minTemp) / tempRange) * 100;
          const pop = day.pop ?? 0;
          const isOpen = openDay === day.dt;

          return (
            <div key={day.dt} className="border-b border-white/10 last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenDay(isOpen ? null : day.dt)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                aria-expanded={isOpen}
              >
                <span className="text-white font-medium w-20 flex-shrink-0">
                  {formatDay(day.dt, timezoneOffset)}
                </span>

                <div className="flex items-center gap-2 w-16 flex-shrink-0">
                  <WeatherIcon
                    condition={day.weather[0]}
                    size="sm"
                  />
                  {pop > 0.1 && (
                    <div className="flex items-center gap-0.5 text-blue-200">
                      <Droplets className="w-3 h-3" />
                      <span className="text-xs">{Math.round(pop * 100)}%</span>
                    </div>
                  )}
                </div>

                <span className="text-white/70 text-sm w-10 text-right">
                  {formatTemp(day.temp.min, unit)}
                </span>

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

                <span className="text-white font-medium w-10">
                  {formatTemp(day.temp.max, unit)}
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-3 text-sm text-white/80 flex flex-wrap gap-4">
                  <span className="capitalize">{day.weather[0]?.description}</span>
                  <span className="flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5" />
                    {formatWindSpeed(day.wind_speed ?? 0, unit)}
                  </span>
                  <span>Humidity {day.humidity ?? '—'}%</span>
                  <span>Rain {Math.round(pop * 100)}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
