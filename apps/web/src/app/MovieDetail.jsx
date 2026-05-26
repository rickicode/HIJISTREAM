import { useParams } from 'react-router-dom';

export default function MovieDetail() {
  const { id } = useParams();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-text-primary">Movie Detail</h1>
      <p className="mt-2 text-text-muted">Movie ID: {id}</p>
    </div>
  );
}
