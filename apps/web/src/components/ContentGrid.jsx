import ContentCard from './ContentCard';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

export default function ContentGrid({ items = [], type = 'movie', isLoading, error, onRetry }) {
  if (isLoading && items.length === 0) {
    return <LoadingState type="grid" />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {items.map((item) => (
        <ContentCard key={item.tmdb_id} item={item} type={type} />
      ))}
    </div>
  );
}
