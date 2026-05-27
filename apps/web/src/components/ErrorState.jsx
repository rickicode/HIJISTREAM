import { AlertCircle } from 'lucide-react';

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="text-gray-400" size={48} />
      <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
      <p className="text-sm text-gray-500 text-center max-w-md">
        {error?.message || 'An unexpected error occurred.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
