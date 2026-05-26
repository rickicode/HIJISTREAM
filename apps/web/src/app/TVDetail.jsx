import { useParams } from 'react-router-dom';

export default function TVDetail() {
  const { id } = useParams();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-text-primary">TV Show Detail</h1>
      <p className="mt-2 text-text-muted">TV Show ID: {id}</p>
    </div>
  );
}
