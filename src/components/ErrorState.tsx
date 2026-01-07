import { CloudOff, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <CloudOff className="w-16 h-16 text-white/50 mb-4" />
      <h3 className="text-xl font-display font-semibold text-white mb-2">
        Unable to load weather
      </h3>
      <p className="text-white/70 mb-6 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="glass-card px-6 py-3 rounded-full flex items-center gap-2 text-white font-medium hover:bg-white/20 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
};
