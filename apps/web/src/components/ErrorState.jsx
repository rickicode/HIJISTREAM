import { AlertCircle } from 'lucide-react';

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="text-[#6B6B6B]" size={48} />
      <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
      <p className="text-sm text-[#A1A1A1] text-center max-w-md">
        {error?.message || 'An unexpected error occurred.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-[#6366F1] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#818CF8] transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
