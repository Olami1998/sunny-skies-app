import { TemperatureUnit } from '@/types/weather';
import { cn } from '@/lib/utils';

interface TemperatureToggleProps {
  unit: TemperatureUnit;
  onChange: (unit: TemperatureUnit) => void;
}

export const TemperatureToggle = ({ unit, onChange }: TemperatureToggleProps) => {
  return (
    <div className="glass-card rounded-full p-1 flex gap-1">
      <button
        onClick={() => onChange('celsius')}
        className={cn(
          'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
          unit === 'celsius'
            ? 'bg-white/30 text-white'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        )}
      >
        °C
      </button>
      <button
        onClick={() => onChange('fahrenheit')}
        className={cn(
          'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
          unit === 'fahrenheit'
            ? 'bg-white/30 text-white'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        )}
      >
        °F
      </button>
    </div>
  );
};
