import { create } from 'zustand';
import { saveWatchProgress, loadWatchProgress, getAllWatchProgress } from '../utils/player';

const usePlayerStore = create((set, get) => ({
  watchProgress: {},
  currentlyPlaying: null,
  playerStatus: 'idle',

  setWatchProgress: (id, time, duration) => {
    saveWatchProgress(id, time, duration);
    const percentage = duration > 0 ? Math.round((time / duration) * 100) : 0;
    set((state) => ({
      watchProgress: {
        ...state.watchProgress,
        [id]: { time, duration, percentage, updatedAt: Date.now() },
      },
    }));
  },

  getWatchProgress: (id) => {
    const state = get();
    if (state.watchProgress[id]) return state.watchProgress[id];
    return loadWatchProgress(id);
  },

  setCurrentlyPlaying: (content) => set({ currentlyPlaying: content }),

  setPlayerStatus: (playerStatus) => set({ playerStatus }),

  clearProgress: (id) => {
    set((state) => {
      const watchProgress = { ...state.watchProgress };
      delete watchProgress[id];
      return { watchProgress };
    });
  },

  getContinueWatching: () => {
    return getAllWatchProgress();
  },
}));

export default usePlayerStore;
