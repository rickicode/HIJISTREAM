export default function LoadingState({ type = 'grid' }) {
  if (type === 'detail') {
    return (
      <div className="animate-pulse">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-[300px] aspect-[2/3] bg-gray-200 rounded-xl shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-gray-200 rounded-xl w-3/4" />
            <div className="flex gap-3">
              <div className="h-5 bg-gray-200 rounded-full w-16" />
              <div className="h-5 bg-gray-200 rounded-full w-16" />
              <div className="h-5 bg-gray-200 rounded-full w-20" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 bg-gray-200 rounded-full w-20" />
              <div className="h-7 bg-gray-200 rounded-full w-24" />
              <div className="h-7 bg-gray-200 rounded-full w-16" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
            <div className="h-12 bg-gray-200 rounded-xl w-40 mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="animate-pulse">
        <div className="aspect-[2/3] bg-gray-200 rounded-xl" />
        <div className="mt-3 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  // grid type - 12 skeleton cards
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] bg-gray-200 rounded-xl" />
          <div className="mt-3 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
