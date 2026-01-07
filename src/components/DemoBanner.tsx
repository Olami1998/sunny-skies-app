import { Info } from 'lucide-react';

export const DemoBanner = () => {
  return (
    <div className="glass-card rounded-xl p-4 flex items-start gap-3 animate-fade-in">
      <Info className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-white font-medium text-sm">Demo Mode Active</p>
        <p className="text-white/70 text-sm mt-1">
          Add an OpenWeatherMap API key to get real weather data. 
          Currently showing sample data for demonstration.
        </p>
      </div>
    </div>
  );
};
