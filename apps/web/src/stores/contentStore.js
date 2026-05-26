import { create } from 'zustand';

const useContentStore = create((set) => ({
  movies: [],
  tvShows: [],
  currentMovie: null,
  currentTVShow: null,
  searchResults: [],
  searchHistory: [],
  isLoading: false,
  error: null,

  setMovies: (movies) => set({ movies }),
  setTVShows: (tvShows) => set({ tvShows }),
  setCurrentMovie: (currentMovie) => set({ currentMovie }),
  setCurrentTVShow: (currentTVShow) => set({ currentTVShow }),
  setSearchResults: (searchResults) => set({ searchResults }),
  addSearchHistory: (query) =>
    set((state) => ({
      searchHistory: [
        query,
        ...state.searchHistory.filter((q) => q !== query),
      ].slice(0, 10),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      movies: [],
      tvShows: [],
      currentMovie: null,
      currentTVShow: null,
      searchResults: [],
      searchHistory: [],
      isLoading: false,
      error: null,
    }),
}));

export default useContentStore;
