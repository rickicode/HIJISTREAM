import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X } from 'lucide-react';

function NavLink({ to, children }) {
  const { pathname } = useLocation();
  const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors ${
        isActive
          ? 'text-blue-600'
          : 'text-gray-900 hover:text-blue-600'
      }`}
    >
      {children}
    </Link>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold text-blue-600">
                HIJISTREAM
              </Link>
              <nav className="hidden sm:flex items-center gap-6">
                <NavLink to="/">Home</NavLink>
                <NavLink to="/movies">Movies</NavLink>
                <NavLink to="/tv">TV Shows</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/search')}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 bg-white">
            <nav className="flex flex-col px-4 py-3 gap-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Home
              </Link>
              <Link
                to="/movies"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Movies
              </Link>
              <Link
                to="/tv"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              >
                TV Shows
              </Link>
            </nav>
          </div>
        )}
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
