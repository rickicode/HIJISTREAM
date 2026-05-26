import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import './index.css';

const Home = lazy(() => import('./app/Home'));
const Movies = lazy(() => import('./app/Movies'));
const MovieDetail = lazy(() => import('./app/MovieDetail'));
const TV = lazy(() => import('./app/TV'));
const TVDetail = lazy(() => import('./app/TVDetail'));
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-text-muted">Loading...</div>
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
              <Route path="/player/:type/:id" element={<Player />} />
              <Route path="/search" element={<Search />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
