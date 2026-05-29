import { Link } from 'react-router-dom';

export default function Logo({ className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <img
        src="/icon-192.png"
        alt="HIJISTREAM"
        width={32}
        height={32}
        className="shrink-0 rounded-md"
      />
      <span className="text-xl font-bold text-primary">HIJISTREAM</span>
    </Link>
  );
}
