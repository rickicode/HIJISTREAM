import { AlertCircle } from 'lucide-react';

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="text-muted" size={48} />
      <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {error?.message || 'An unexpected error occurred.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-primary text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
