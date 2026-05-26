import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold text-primary">
                HIJISTREAM
              </Link>
              <nav className="hidden sm:flex items-center gap-6">
                <Link
                  to="/"
                  className="text-sm font-medium text-text-primary hover:text-primary transition-colors"
                >
                  Home
                </Link>
                <Link
                  to="/movies"
                  className="text-sm font-medium text-text-primary hover:text-primary transition-colors"
                >
                  Movies
                </Link>
                <Link
                  to="/tv"
                  className="text-sm font-medium text-text-primary hover:text-primary transition-colors"
                >
                  TV Shows
                </Link>
              </nav>
            </div>
            <button
              onClick={() => navigate('/search')}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas transition-colors"
              aria-label="Search"
            >
              <Search size={20} />
            </button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
