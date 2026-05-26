# Technical Design Document (TDD)
## VidStream - Video Streaming Platform

**Version:** 1.0  
**Date:** May 26, 2026  
**Author:** Engineering Team  
**Status:** Approved

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
├──────────────────────────┬──────────────────────────────────┤
│   Web (React/Next.js)    │   Mobile (React Native/Expo)     │
│   - Browser Interface    │   - Android TV/Google TV         │
│   - Mouse/Keyboard Nav   │   - Remote Control Nav           │
└──────────────────────────┴──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Cache Layer                             │
│  Web: localStorage + IndexedDB                               │
│  Mobile: AsyncStorage                                        │
│  TTL: 24h (lists) / 7d (details) / 30d (images)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  Base URL: https://vidapi.ru                                 │
│  Player URL: https://vaplayer.ru/embed                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   VidAPI Service                             │
│  - Content Library (89K+ movies, 19K+ TV shows)              │
│  - Embed Player (iframe-based streaming)                     │
│  - IMDB/TMDB Integration                                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

#### Web Platform
- **Framework:** React (with Vite)
- **Routing:** React Router DOM
- **State Management:** Zustand
- **Data Fetching:** @tanstack/react-query
- **Styling:** Tailwind CSS
- **Fonts:** Inter (Google Fonts)
- **Icons:** lucide-react
- **Caching:** localStorage + IndexedDB (for images)
- **Player:** iframe embed (VidAPI)

#### Mobile Platform (Android TV/Google TV)
- **Framework:** Expo / React Native
- **Routing:** Expo Router
- **State Management:** Zustand
- **Data Fetching:** @tanstack/react-query
- **Styling:** React Native StyleSheet (Tailwind-inspired)
- **Fonts:** Inter (expo-google-fonts)
- **Icons:** lucide-react-native
- **Caching:** AsyncStorage
- **Player:** react-native-webview (iframe embed)
- **TV Navigation:** react-native-gesture-handler

---

## 2. Component Architecture

### 2.1 Directory Structure

```
/apps
├── web
│   └── src
│       ├── app
│       │   ├── home
│       │   │   └── page.jsx              # Home page
│       │   ├── movies
│       │   │   ├── page.jsx              # Movies browse
│       │   │   ├── latest
│       │   │   │   └── page.jsx          # Latest movies
│       │   │   ├── trending
│       │   │   │   └── page.jsx          # Trending movies
│       │   │   ├── top-rated
│       │   │   │   └── page.jsx          # Top rated movies
│       │   │   ├── upcoming
│       │   │   │   └── page.jsx          # Upcoming movies
│       │   │   └── [id]
│       │   │       └── page.jsx          # Movie detail
│       │   ├── tv
│       │   │   ├── page.jsx              # TV shows browse
│       │   │   ├── latest
│       │   │   │   └── page.jsx          # Latest TV shows
│       │   │   ├── trending
│       │   │   │   └── page.jsx          # Trending TV shows
│       │   │   ├── top-rated
│       │   │   │   └── page.jsx          # Top rated TV shows
│       │   │   └── [id]
│       │   │       └── page.jsx          # TV show detail
│       │   ├── player
│       │   │   └── page.jsx              # Video player page
│       │   ├── search
│       │   │   └── page.jsx              # Search results
│       │   └── layout.jsx                # Root layout
│       ├── components
│       │   ├── ContentCard.jsx           # Movie/TV card component
│       │   ├── ContentGrid.jsx           # Grid layout component
│       │   ├── VideoPlayer.jsx           # Player wrapper
│       │   ├── SearchBar.jsx             # Search input
│       │   ├── TabNavigation.jsx         # Category tabs
│       │   ├── DetailHero.jsx            # Detail page hero
│       │   ├── EpisodeList.jsx           # TV episode selector
│       │   ├── LoadingState.jsx          # Skeleton loader
│       │   └── ErrorState.jsx            # Error display
│       ├── utils
│       │   ├── api.js                    # API client
│       │   ├── cache.js                  # Cache manager
│       │   ├── player.js                 # Player utilities
│       │   └── storage.js                # Storage wrapper
│       └── stores
│           ├── contentStore.js           # Content state
│           └── playerStore.js            # Player state
│
└── mobile
    └── src
        ├── app
        │   ├── _layout.jsx               # Root layout
        │   ├── index.jsx                 # Entry point
        │   ├── (tabs)
        │   │   ├── _layout.jsx           # Tab layout
        │   │   ├── home.jsx              # Home tab
        │   │   ├── movies.jsx            # Movies tab
        │   │   ├── tv.jsx                # TV shows tab
        │   │   └── search.jsx            # Search tab
        │   ├── movie
        │   │   └── [id].jsx              # Movie detail
        │   ├── tv
        │   │   └── [id].jsx              # TV show detail
        │   └── player.jsx                # Video player
        ├── components
        │   ├── ContentCard.jsx           # Movie/TV card
        │   ├── ContentGrid.jsx           # Grid layout
        │   ├── VideoPlayer.jsx           # Player wrapper
        │   ├── SearchBar.jsx             # Search input
        │   ├── TabBar.jsx                # Bottom tabs
        │   ├── DetailHero.jsx            # Detail hero
        │   ├── EpisodeList.jsx           # Episode selector
        │   ├── LoadingState.jsx          # Skeleton loader
        │   ├── ErrorState.jsx            # Error display
        │   └── TVFocusable.jsx           # TV focus wrapper
        └── utils
            ├── api.js                    # API client
            ├── cache.js                  # Cache manager
            ├── player.js                 # Player utilities
            └── storage.js                # AsyncStorage wrapper
```

### 2.2 Core Components

#### 2.2.1 ContentCard Component
**Purpose:** Display movie/TV show thumbnail with metadata

**Props:**
```typescript
{
  id: string,
  type: 'movie' | 'tv',
  title: string,
  posterUrl: string,
  rating: string,
  year: string,
  genre: string,
  onPress: () => void,
  watchProgress?: number  // 0-100 percentage
}
```

**Design:**
- Ghost border (1px #E5E7EB)
- Rounded corners (12px)
- Hover: border-gray-300
- Focus (TV): border-blue-600 (3px)
- Progress bar overlay if watchProgress exists

#### 2.2.2 VideoPlayer Component
**Purpose:** Embed VidAPI player with event tracking

**Props:**
```typescript
{
  embedUrl: string,
  title: string,
  onProgress: (time: number, duration: number) => void,
  onComplete: () => void,
  resumeAt?: number,
  subtitleUrl?: string
}
```

**Implementation:**
- Web: iframe with postMessage listener
- Mobile: WebView with onMessage handler
- Event forwarding: playing, paused, completed, seeked
- Local progress storage every 5 seconds

#### 2.2.3 TabNavigation Component
**Purpose:** Category navigation (Latest, Trending, Top Rated, Upcoming)

**Props:**
```typescript
{
  tabs: Array<{ id: string, label: string }>,
  activeTab: string,
  onTabChange: (tabId: string) => void
}
```

**Design:**
- Horizontal flex row
- Active: border-b-2 border-blue-600, text-gray-900, font-medium
- Inactive: border-transparent, text-gray-500, hover:text-gray-700
- Overlapping border technique (-mb-[1px])

---

## 3. Data Management

### 3.1 Caching System

#### 3.1.1 Cache Architecture

```javascript
// Cache Entry Structure
{
  key: string,           // e.g., "movies_latest_page_1"
  data: any,             // API response
  timestamp: number,     // Date.now() when cached
  ttl: number,           // seconds (e.g., 86400 for 24h)
  expiresAt: number      // timestamp + ttl
}
```

#### 3.1.2 Cache Manager Implementation

**File: `/apps/web/src/utils/cache.js`**

```javascript
// Cache TTL Constants (in seconds)
const TTL = {
  CONTENT_LIST: 24 * 60 * 60,      // 24 hours
  CONTENT_DETAIL: 7 * 24 * 60 * 60, // 7 days
  IMAGES: 30 * 24 * 60 * 60,       // 30 days
  SEARCH: 1 * 60 * 60              // 1 hour
};

class CacheManager {
  constructor(storage) {
    this.storage = storage;  // localStorage or AsyncStorage
  }

  // Get cached data
  async get(key) {
    const cached = await this.storage.getItem(key);
    if (!cached) return null;
    
    const entry = JSON.parse(cached);
    const now = Date.now();
    
    // Check if expired
    if (now > entry.expiresAt) {
      await this.storage.removeItem(key);
      return null;
    }
    
    return entry.data;
  }

  // Set cache entry
  async set(key, data, ttl) {
    const entry = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      expiresAt: Date.now() + (ttl * 1000)
    };
    
    await this.storage.setItem(key, JSON.stringify(entry));
  }

  // Clear all cache
  async clear() {
    await this.storage.clear();
  }

  // Clear expired entries
  async cleanup() {
    const keys = await this.storage.getAllKeys();
    const now = Date.now();
    
    for (const key of keys) {
      const cached = await this.storage.getItem(key);
      if (!cached) continue;
      
      const entry = JSON.parse(cached);
      if (now > entry.expiresAt) {
        await this.storage.removeItem(key);
      }
    }
  }
}
```

#### 3.1.3 Cache Key Convention

```javascript
// Format: {resource}_{category}_{page}_{params}

// Examples:
"movies_latest_page_1"
"movies_trending_page_1"
"movies_toprated_page_2"
"tv_latest_page_1"
"movie_detail_tt1517268"
"tv_detail_205715"
"search_fast_x"
```

### 3.2 API Client with Caching

**File: `/apps/web/src/utils/api.js`**

```javascript
import CacheManager from './cache';

const BASE_URL = 'https://vidapi.ru';
const cache = new CacheManager(localStorage);

export const api = {
  // Fetch with cache
  async fetchWithCache(endpoint, cacheKey, ttl) {
    // 1. Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return cached;
    }
    
    // 2. Cache miss - fetch from API
    console.log(`[Cache MISS] ${cacheKey}`);
    const response = await fetch(`${BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 3. Store in cache
    await cache.set(cacheKey, data, ttl);
    
    return data;
  },

  // Get latest movies
  async getLatestMovies(page = 1) {
    const cacheKey = `movies_latest_page_${page}`;
    return this.fetchWithCache(
      `/movies/latest/page-${page}.json`,
      cacheKey,
      TTL.CONTENT_LIST
    );
  },

  // Get trending movies
  async getTrendingMovies(page = 1) {
    const cacheKey = `movies_trending_page_${page}`;
    return this.fetchWithCache(
      `/movies/trending/page-${page}.json`,
      cacheKey,
      TTL.CONTENT_LIST
    );
  },

  // Get movie details
  async getMovieDetails(id) {
    const cacheKey = `movie_detail_${id}`;
    return this.fetchWithCache(
      `/movie/${id}.json`,
      cacheKey,
      TTL.CONTENT_DETAIL
    );
  },

  // Search (with shorter TTL)
  async search(query) {
    const cacheKey = `search_${query.toLowerCase().replace(/\s+/g, '_')}`;
    return this.fetchWithCache(
      `/search?query=${encodeURIComponent(query)}`,
      cacheKey,
      TTL.SEARCH
    );
  },

  // Clear cache
  async clearCache() {
    await cache.clear();
  }
};
```

### 3.3 State Management (Zustand)

#### 3.3.1 Content Store

**File: `/apps/web/src/stores/contentStore.js`**

```javascript
import { create } from 'zustand';

const useContentStore = create((set) => ({
  // State
  movies: [],
  tvShows: [],
  currentMovie: null,
  currentTVShow: null,
  searchResults: [],
  isLoading: false,
  error: null,

  // Actions
  setMovies: (movies) => set({ movies }),
  setTVShows: (tvShows) => set({ tvShows }),
  setCurrentMovie: (movie) => set({ currentMovie: movie }),
  setCurrentTVShow: (show) => set({ currentTVShow: show }),
  setSearchResults: (results) => set({ searchResults: results }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  // Reset
  reset: () => set({
    movies: [],
    tvShows: [],
    currentMovie: null,
    currentTVShow: null,
    searchResults: [],
    isLoading: false,
    error: null
  })
}));

export default useContentStore;
```

#### 3.3.2 Player Store

**File: `/apps/web/src/stores/playerStore.js`**

```javascript
import { create } from 'zustand';

const usePlayerStore = create((set) => ({
  // State
  watchProgress: {},  // { movieId: { time: 125, duration: 7200 } }
  currentlyPlaying: null,
  playerStatus: 'idle',  // idle, playing, paused, completed
  
  // Actions
  setWatchProgress: (id, time, duration) => set((state) => ({
    watchProgress: {
      ...state.watchProgress,
      [id]: { time, duration, updatedAt: Date.now() }
    }
  })),
  
  getWatchProgress: (id) => {
    const state = usePlayerStore.getState();
    return state.watchProgress[id];
  },
  
  setCurrentlyPlaying: (content) => set({ currentlyPlaying: content }),
  setPlayerStatus: (status) => set({ playerStatus: status }),
  
  clearProgress: (id) => set((state) => {
    const { [id]: removed, ...rest } = state.watchProgress;
    return { watchProgress: rest };
  })
}));

export default usePlayerStore;
```

---

## 4. Player Implementation

### 4.1 Embed URL Generation

```javascript
// Generate embed URL for movies
function getMovieEmbedUrl(id, resumeAt = null) {
  const baseUrl = 'https://vaplayer.ru/embed/movie';
  const url = `${baseUrl}/${id}`;
  
  if (resumeAt) {
    return `${url}?resumeAt=${Math.floor(resumeAt)}`;
  }
  
  return url;
}

// Generate embed URL for TV episodes
function getTVEmbedUrl(id, season, episode, resumeAt = null) {
  const baseUrl = 'https://vaplayer.ru/embed/tv';
  const url = `${baseUrl}/${id}/${season}/${episode}`;
  
  if (resumeAt) {
    return `${url}?resumeAt=${Math.floor(resumeAt)}`;
  }
  
  return url;
}
```

### 4.2 Player Event Handling

```javascript
// Web: window.postMessage listener
useEffect(() => {
  function handlePlayerEvent(event) {
    if (event.data.type !== 'PLAYER_EVENT') return;
    
    const { player_info, player_status, player_progress, player_duration } = event.data.data;
    
    switch (player_status) {
      case 'playing':
        // Save progress every ~5 seconds
        const id = player_info.imdb || player_info.tmdb;
        saveWatchProgress(id, player_progress, player_duration);
        break;
        
      case 'completed':
        // Mark as completed, show next episode (if TV)
        handleVideoCompleted(player_info);
        break;
        
      case 'paused':
        // Update UI state
        setPlayerStatus('paused');
        break;
        
      case 'seeked':
        // User manually seeked
        console.log('Seeked to', player_progress);
        break;
    }
  }
  
  window.addEventListener('message', handlePlayerEvent);
  return () => window.removeEventListener('message', handlePlayerEvent);
}, []);
```

### 4.3 Watch Progress Persistence

```javascript
// Save progress to localStorage
function saveWatchProgress(id, time, duration) {
  const progress = {
    id,
    time,
    duration,
    percentage: (time / duration) * 100,
    updatedAt: Date.now()
  };
  
  localStorage.setItem(`watch_progress_${id}`, JSON.stringify(progress));
  
  // Also update Zustand store
  usePlayerStore.getState().setWatchProgress(id, time, duration);
}

// Load progress from localStorage
function loadWatchProgress(id) {
  const stored = localStorage.getItem(`watch_progress_${id}`);
  if (!stored) return null;
  
  const progress = JSON.parse(stored);
  
  // Check if expired (e.g., after 30 days)
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (Date.now() - progress.updatedAt > thirtyDays) {
    localStorage.removeItem(`watch_progress_${id}`);
    return null;
  }
  
  return progress;
}
```

---

## 5. TV Navigation (Android TV/Google TV)

### 5.1 Focus Management

```javascript
// TVFocusable component wrapper
import { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';

export default function TVFocusable({ children, onPress, style, focusStyle }) {
  const ref = useRef(null);
  
  return (
    <TouchableOpacity
      ref={ref}
      onPress={onPress}
      style={style}
      activeOpacity={0.8}
      // TV focus styles
      tvParallaxProperties={{
        enabled: true,
        magnification: 1.05,
        shiftDistanceX: 10,
        shiftDistanceY: 10
      }}
      // Custom focus border
      onFocus={() => {
        // Apply focus styles
      }}
      onBlur={() => {
        // Remove focus styles
      }}
    >
      {children}
    </TouchableOpacity>
  );
}
```

### 5.2 D-pad Navigation

**Grid Navigation Logic:**
- Up/Down: Move to adjacent row
- Left/Right: Move within row
- Enter: Select item
- Back: Return to previous screen

**Focus Memory:**
- Store last focused item per screen
- Restore focus when navigating back

### 5.3 TV-Optimized Layouts

**Guidelines:**
- Minimum touch target: 80x80dp
- Focus border: 3px solid #2563EB
- Grid columns: 4-6 items per row (depending on screen size)
- Padding: 40dp from screen edges (safe area)

---

## 6. Performance Optimization

### 6.1 Lazy Loading & Pagination

```javascript
// Infinite scroll with React Query
import { useInfiniteQuery } from '@tanstack/react-query';

function useMovies(category) {
  return useInfiniteQuery({
    queryKey: ['movies', category],
    queryFn: ({ pageParam = 1 }) => api.getMovies(category, pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60 * 24 // 24 hours
  });
}
```

### 6.2 Image Optimization

```javascript
// Lazy load images with placeholder
import { useState } from 'react';

function LazyImage({ src, alt, placeholder }) {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <div className="relative">
      {!loaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
```

### 6.3 Bundle Size Optimization

**Code Splitting:**
- Route-based splitting (automatic with Next.js)
- Component lazy loading for heavy components (player, search)
- Dynamic imports for non-critical features

**Tree Shaking:**
- Import only needed components from libraries
- Use ES6 modules for better tree shaking

---

## 7. Error Handling

### 7.1 API Error Handling

```javascript
// Centralized error handler
async function fetchWithErrorHandling(url) {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Content not found');
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    }
    
    return await response.json();
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}
```

### 7.2 Error UI Components

```javascript
// ErrorState component
function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6">
      <div className="text-gray-400 mb-4">
        {/* Error icon */}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-gray-500 text-center mb-6 max-w-md">
        {error.message}
      </p>
      <button
        onClick={onRetry}
        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests
- Cache manager functions
- API client methods
- Player utilities
- State management actions

### 8.2 Integration Tests
- API + Cache integration
- Player events flow
- Navigation flows
- Search functionality

### 8.3 E2E Tests
- Browse movies → detail → play
- Search → results → play
- Resume playback flow
- TV navigation flow

---

## 9. Deployment

### 9.1 Web Deployment
- Platform: Vercel / Netlify
- Build command: `npm run build`
- Environment variables: None required (public API)
- CDN: Automatic via platform

### 9.2 Mobile Deployment (Android TV)
- Build: Expo EAS Build
- Target: Android 7.0+ (API 24+)
- Distribution: APK file for sideloading
- Future: Google Play Store (TV category)

---

## 10. Security Considerations

### 10.1 Content Security Policy (Web)
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               img-src 'self' https://image.tmdb.org https://vidapi.ru https://vaplayer.ru; 
               frame-src https://vaplayer.ru; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';">
```

### 10.2 Data Privacy
- No user authentication
- No personal data collection
- Watch progress stored locally only (not shared)
- No analytics or tracking by default

---

## 11. Monitoring & Logging

### 11.1 Cache Metrics
- Cache hit rate calculation
- Cache size monitoring
- Expired entry cleanup logs

### 11.2 Player Metrics
- Player load time
- Buffering incidents
- Completion rate
- Error rate

### 11.3 API Metrics
- Request count per endpoint
- Error rate per endpoint
- Average response time
- Cache vs. API request ratio

---

## 12. Future Enhancements

### 12.1 Phase 2 Features
- Watchlist / Favorites
- Multi-profile support
- Sync across devices (requires backend)
- Advanced filters (genre, year, rating)

### 12.2 Phase 3 Features
- Offline mode (download for later)
- Chromecast support
- Recommendations engine
- Social features (sharing, comments)

---

## Appendix A: API Response Examples

### Movies Latest Response
```json
{
  "page": 1,
  "per_page": 24,
  "total": 89155,
  "total_pages": 3715,
  "items": [
    {
      "tmdb_id": "385687",
      "imdb_id": "tt1517268",
      "title": "Fast X",
      "year": "2023",
      "poster_url": "https://image.tmdb.org/t/p/original/...",
      "rating": "7.1",
      "genre": "Action, Crime, Thriller",
      "popularity": "2847.12",
      "embed_url": "https://vaplayer.ru/embed/movie/tt1517268"
    }
  ]
}
```

### Player Event Example
```json
{
  "type": "PLAYER_EVENT",
  "data": {
    "player_info": {
      "imdb": "tt1517268",
      "tmdb": "385687",
      "mediaType": "movie",
      "title": "Fast X",
      "poster": "https://..."
    },
    "player_status": "playing",
    "player_progress": 125.4,
    "player_duration": 7200,
    "quality": {
      "label": "1080p",
      "width": 1920,
      "height": 1080
    }
  }
}
```

---

**Document Status:** ✅ Approved for Implementation



