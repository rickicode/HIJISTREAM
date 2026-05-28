import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import { LanguageProvider } from './i18n';

const Home = lazy(() => import('./app/Home'));
const Movies = lazy(() => import('./app/Movies'));
const MovieDetail = lazy(() => import('./app/MovieDetail'));
const TV = lazy(() => import('./app/TV'));
const TVDetail = lazy(() => import('./app/TVDetail'));
const Anime = lazy(() => import('./app/Anime'));
const Player = lazy(() => import('./app/Player'));
const Search = lazy(() => import('./app/Search'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
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
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
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
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </LanguageProvider>
  );
}
