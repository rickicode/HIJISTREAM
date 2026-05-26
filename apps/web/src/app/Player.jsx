import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getMovieEmbedUrl, getTVEmbedUrl, loadWatchProgress } from '../utils/player';
import VideoPlayer from '../components/VideoPlayer';

export default function Player() {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  const progress = loadWatchProgress(id);
  const resumeAt = progress?.time || undefined;

  let embedUrl = '';
  let title = '';
  let contentId = id;

  if (type === 'movie') {
    embedUrl = getMovieEmbedUrl(id, resumeAt);
    title = `Movie - ${id}`;
  } else {
    const s = season || '1';
    const e = episode || '1';
    embedUrl = getTVEmbedUrl(id, s, e, resumeAt);
    title = `TV - S${s}E${e}`;
    contentId = `${id}_s${s}e${e}`;
  }

  const handleBack = () => {
    if (type === 'movie') {
      navigate(-1);
    } else {
      navigate(`/tv/${id}`);
    }
  };

  return (
    <VideoPlayer
      embedUrl={embedUrl}
      title={title}
      contentId={contentId}
      onBack={handleBack}
    />
  );
}
