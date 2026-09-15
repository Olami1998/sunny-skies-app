import { useRef } from 'react';
import { HourlyWeather, TemperatureUnit, CurrentWeather } from '@/types/weather';
import { formatTemp, formatTime, isNightTime } from '@/utils/weatherUtils';
import { WeatherIcon } from './WeatherIcon';
import { ChevronLeft, ChevronRight, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HourlyForecastProps {
  hourly: HourlyWeather[];
  current: CurrentWeather;
  unit: TemperatureUnit;
  timezoneOffset: number;
}

export const HourlyForecast = ({
  hourly,
  current,
  unit,
  timezoneOffset,
}: HourlyForecastProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const upcoming = hourly.slice(0, 16);

  return (
    <div className="w-full animate-fade-up" style={{ animationDelay: '0.1s' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-display font-semibold text-white">
            Upcoming
          </h2>
          <p className="text-white/70 text-xs mt-0.5">3-hour steps from the forecast</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll forecast left"
            className="p-2 glass-card rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll forecast right"
            className="p-2 glass-card rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
      >
        {upcoming.map((hour, index) => {
          const isNight = isNightTime(hour.dt, current.sunrise, current.sunset, timezoneOffset);
          const isNow = index === 0;
          const pop = hour.pop ?? 0;

          return (
            <div
              key={hour.dt}
              className={cn(
                'glass-card rounded-2xl p-4 min-w-[90px] flex flex-col items-center gap-2 flex-shrink-0 transition-all',
                isNow && 'ring-2 ring-white/40 bg-white/20'
              )}
            >
              <span className="text-white/80 text-sm font-medium">
                {isNow ? 'Next' : formatTime(hour.dt, timezoneOffset)}
              </span>

              <WeatherIcon
                condition={hour.weather?.[0]}
                isNight={isNight}
                size="sm"
              />

              <span className="text-white font-semibold text-lg">
                {formatTemp(hour.temp, unit)}
              </span>

              {pop > 0 && (
                <div className="flex items-center gap-1 text-blue-200">
                  <Droplets className="w-3 h-3" />
                  <span className="text-xs">{Math.round(pop * 100)}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
