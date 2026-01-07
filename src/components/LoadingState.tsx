import { Cloud } from 'lucide-react';

export const LoadingState = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] animate-pulse-subtle">
      <Cloud className="w-20 h-20 text-white/50 animate-float" />
      <p className="text-white/70 mt-4 font-medium">Loading weather data...</p>
    </div>
  );
};
