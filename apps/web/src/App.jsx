import { Suspense, lazy, Component } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import { LanguageProvider } from './i18n';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#141414] text-white p-8">
          <h2 className="text-xl font-bold mb-2">Terjadi kesalahan</h2>
          <p className="text-[#808080] text-sm mb-4">{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="px-4 py-2 bg-[#E50914] text-white text-sm rounded hover:bg-[#f6121d]">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Home = lazy(() => import('./app/Home'));
const Movies = lazy(() => import('./app/Movies'));
const MovieDetail = lazy(() => import('./app/MovieDetail'));
const TV = lazy(() => import('./app/TV'));
const TVDetail = lazy(() => import('./app/TVDetail'));
const Anime = lazy(() => import('./app/Anime'));
const Player = lazy(() => import('./app/Player'));
const Search = lazy(() => import('./app/Search'));
const GenreDetail = lazy(() => import('./app/GenreDetail'));
const CountryDetail = lazy(() => import('./app/CountryDetail'));
const Admin = lazy(() => import('./app/Admin'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ErrorBoundary>
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen bg-[#141414]">
                <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/movies" element={<Movies />} />
                <Route path="/movies/:id" element={<MovieDetail />} />
                <Route path="/tv" element={<TV />} />
                <Route path="/tv/:id" element={<TVDetail />} />
                <Route path="/anime" element={<Anime />} />
                <Route path="/player/:type/:id" element={<Player />} />
                <Route path="/search" element={<Search />} />
                <Route path="/genre/:id" element={<GenreDetail />} />
                <Route path="/country/:code" element={<CountryDetail />} />
              </Route>
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    </LanguageProvider>
  );
}
