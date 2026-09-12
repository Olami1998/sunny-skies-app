import { 
  Sun, 
  Moon, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Wind,
  Cloudy
} from 'lucide-react';
import { WeatherCondition } from '@/types/weather';
import { cn } from '@/lib/utils';

interface WeatherIconProps {
  condition?: WeatherCondition;
  isNight?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export const WeatherIcon = ({
  condition,
  isNight = false,
  size = 'md',
  className,
  animated = false,
}: WeatherIconProps) => {
  if (!condition) {
    return <Cloud className={cn(sizeClasses[size], 'text-white drop-shadow-lg', className)} />;
  }

  const main = condition.main.toLowerCase();
  const id = condition.id;
  
  const iconClass = cn(
    sizeClasses[size],
    'text-white drop-shadow-lg',
    animated && 'animate-float',
    className
  );

  // Thunderstorm
  if (id >= 200 && id < 300) {
    return <CloudLightning className={cn(iconClass, 'text-yellow-200')} />;
  }

  // Drizzle
  if (id >= 300 && id < 400) {
    return <CloudDrizzle className={iconClass} />;
  }

  // Rain
  if (id >= 500 && id < 600) {
    return <CloudRain className={cn(iconClass, 'text-blue-200')} />;
  }

  // Snow
  if (id >= 600 && id < 700) {
    return <CloudSnow className={cn(iconClass, 'text-blue-100')} />;
  }

  // Atmosphere (fog, mist, etc.)
  if (id >= 700 && id < 800) {
    if (id === 781) return <Wind className={iconClass} />; // Tornado
    return <CloudFog className={iconClass} />;
  }

  // Clear
  if (id === 800) {
    return isNight 
      ? <Moon className={cn(iconClass, 'text-yellow-100')} />
      : <Sun className={cn(iconClass, 'text-yellow-300')} />;
  }

  // Clouds
  if (id >= 801 && id <= 802) {
    return isNight
      ? <Cloud className={iconClass} />
      : <Cloud className={iconClass} />;
  }

  if (id >= 803) {
    return <Cloudy className={cn(iconClass, 'text-gray-200')} />;
  }

  // Default
  return <Sun className={iconClass} />;
};
