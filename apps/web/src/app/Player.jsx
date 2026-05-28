import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Player() {
  const { type, id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (type === 'movie') {
      navigate(`/movies/${id}?autoplay=true`, { replace: true });
    } else {
      navigate(`/tv/${id}?autoplay=true`, { replace: true });
    }
  }, [type, id, navigate]);

  return null;
}
