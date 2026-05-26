import { useParams } from 'react-router-dom';

export default function Player() {
  const { type, id } = useParams();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-text-primary">Player</h1>
      <p className="mt-2 text-text-muted">
        Playing {type} - ID: {id}
      </p>
    </div>
  );
}
