export default function LoadingState({ type = 'grid' }) {
  if (type === 'detail') {
    return (
      <div>
        <div className="h-[450px] shimmer-bg animate-shimmer rounded w-full mb-6" />
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-[200px] md:w-[250px] aspect-[2/3] shimmer-bg animate-shimmer rounded shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 shimmer-bg animate-shimmer rounded w-3/4" />
            <div className="flex gap-3">
              <div className="h-5 shimmer-bg animate-shimmer rounded w-16" />
              <div className="h-5 shimmer-bg animate-shimmer rounded w-16" />
              <div className="h-5 shimmer-bg animate-shimmer rounded w-20" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 shimmer-bg animate-shimmer rounded w-20" />
              <div className="h-7 shimmer-bg animate-shimmer rounded w-24" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 shimmer-bg animate-shimmer rounded w-full" />
              <div className="h-4 shimmer-bg animate-shimmer rounded w-full" />
              <div className="h-4 shimmer-bg animate-shimmer rounded w-2/3" />
            </div>
            <div className="h-12 shimmer-bg animate-shimmer rounded w-40 mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div>
        <div className="aspect-[2/3] shimmer-bg animate-shimmer rounded-sm" />
        <div className="mt-1.5 space-y-1">
          <div className="h-4 shimmer-bg animate-shimmer rounded w-3/4" />
          <div className="h-3 shimmer-bg animate-shimmer rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] shimmer-bg animate-shimmer rounded-sm" />
          <div className="mt-1.5 space-y-1">
            <div className="h-4 shimmer-bg animate-shimmer rounded w-3/4" />
            <div className="h-3 shimmer-bg animate-shimmer rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
