# Product Requirements Document (PRD)
## VidStream - Video Streaming Platform

**Version:** 1.0  
**Date:** May 26, 2026  
**Author:** Product Team  
**Status:** Approved

---

## 1. Executive Summary

VidStream is a cross-platform video streaming application that provides access to 89,155+ movies and 19,012+ TV shows through the VidAPI service. The platform targets both Android TV/Google TV users and web browser users, offering a premium streaming experience with intelligent caching and seamless playback.

### 1.1 Vision
To deliver a fast, reliable, and beautiful streaming experience across TV and web platforms with minimal API overhead through intelligent caching.

### 1.2 Goals
- Provide instant access to vast content library (100K+ titles)
- Minimize API calls through smart caching (80% cache hit rate target)
- Deliver stable, high-quality video playback
- Support both TV remote and mouse/keyboard navigation
- Enable watch progress tracking and resume functionality

---

## 2. Target Users

### 2.1 Primary Personas

**Persona 1: TV Viewer (Android TV/Google TV)**
- Age: 25-55
- Device: Smart TV, Google TV, Android TV Box
- Input: Remote control (D-pad navigation)
- Use Case: Casual evening entertainment, binge-watching series
- Pain Points: Slow loading, complex navigation, buffering issues

**Persona 2: Web Browser User**
- Age: 18-45
- Device: Desktop, Laptop
- Input: Mouse, Keyboard
- Use Case: Quick movie searches, watch on computer
- Pain Points: Repetitive loading, data usage, slow search

---

## 3. Features & Requirements

### 3.1 Core Features (Must Have - P0)

#### 3.1.1 Content Browsing
- **Movies Section**
  - Latest Movies (paginated, 24 per page)
  - Trending Movies (daily/weekly)
  - Top Rated Movies (all time)
  - Upcoming Movies (release calendar)
  
- **TV Shows Section**
  - Latest TV Shows (paginated, 24 per page)
  - Trending TV Shows (daily/weekly)
  - Top Rated TV Shows (all time)

#### 3.1.2 Search
- Standard text-based search (no AI)
- Search by title
- Real-time search results
- Search history (last 10 searches)

#### 3.1.3 Content Details
- **Movie Details:**
  - Poster image (high resolution)
  - Title, Year, Rating (IMDB/TMDB)
  - Genre tags
  - Overview/Synopsis
  - Runtime
  - Play button (direct to player)

- **TV Show Details:**
  - Poster image
  - Title, Year, Rating
  - Genre tags
  - Overview/Synopsis
  - Season selector
  - Episode list with thumbnails
  - Play episode button

#### 3.1.4 Video Player
- Embed-based player (VidAPI iframe)
- Playback controls (play, pause, seek)
- Quality selection (auto, 1080p, 720p, 480p, 360p)
- Subtitle support (.srt, .vtt)
- Resume playback from last position
- Fullscreen mode
- Player events tracking:
  - Playing (progress updates every ~5s)
  - Paused
  - Completed
  - Seeked

#### 3.1.5 Caching System
- **Cache Strategy:**
  - Cache TTL: 24 hours for content lists
  - Cache TTL: 7 days for detail pages
  - Cache TTL: 30 days for images/posters
  - Persistent cache (survives app restart)
  
- **Cache Logic:**
  1. Check cache on every API request
  2. If cache exists and not expired → serve from cache
  3. If cache missing or expired → fetch from API and update cache
  4. Cache invalidation on manual refresh

- **Storage:**
  - Mobile: AsyncStorage (React Native)
  - Web: localStorage + IndexedDB for images

#### 3.1.6 Watch Progress
- Track playback position every 5 seconds
- Store progress locally (per user device)
- Resume from last position on replay
- "Continue Watching" section on home
- Progress indicator on thumbnails (e.g., "45% watched")

### 3.2 Navigation (Must Have - P0)

#### 3.2.1 TV/Mobile Navigation
- D-pad support (Up, Down, Left, Right, Enter, Back)
- Clear focus indicators (border highlight)
- Focus memory (remembers last focused item)
- Tab navigation between sections
- Remote-friendly large touch targets (min 80x80dp)

#### 3.2.2 Web Navigation
- Mouse hover states
- Keyboard shortcuts:
  - Arrow keys: Navigate grid
  - Enter: Select/Play
  - Escape: Back
  - Space: Play/Pause (in player)
  - F: Fullscreen
- Breadcrumb navigation
- Browser back button support

### 3.3 UI/UX Requirements (Must Have - P0)

- Follow High-Fidelity SaaS design system
- Inter font family
- Color palette:
  - Background: #FFFFFF
  - Canvas Muted: #F9FAFB
  - Text Primary: #111827
  - Text Muted: #6B7280
  - Border: #E5E7EB
  - Primary Action: #2563EB
- Ghost borders (1px solid #E5E7EB)
- Pill taxonomy for metadata
- Tab navigation with active indicator
- No drop shadows (except floating modals)
- Responsive grid layout
- Loading states (skeleton screens)
- Error states with retry button
- Empty states with helpful messaging

### 3.4 Performance Requirements (Must Have - P0)

- Initial page load: < 2 seconds
- Navigation transition: < 300ms
- Cache hit rate: > 80%
- API response caching: 100% of GET requests
- Image lazy loading
- Infinite scroll with pagination
- Video player ready: < 3 seconds

### 3.5 Platform-Specific Requirements

#### 3.5.1 Android TV/Google TV (Mobile)
- Expo React Native
- react-native-webview for player
- AsyncStorage for caching
- TV-optimized layouts (16:9 aspect ratio)
- Focus handling with react-native-gesture-handler
- Safe area handling
- Minimum Android 7.0 (API 24)

#### 3.5.2 Web Browser
- React web app (Next.js/Vite)
- iframe embed for player
- localStorage for caching
- Responsive breakpoints: 1920px, 1366px, 1024px, 768px
- Modern browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## 4. Technical Requirements

### 4.1 API Integration
- Base URL: `https://vidapi.ru`
- Player URL: `https://vaplayer.ru/embed`
- Endpoints:
  - GET `/movies/latest/page-{PAGE}.json`
  - GET `/movies/trending/page-{PAGE}.json`
  - GET `/movies/top-rated/page-{PAGE}.json`
  - GET `/movies/upcoming/page-{PAGE}.json`
  - GET `/tv/latest/page-{PAGE}.json`
  - GET `/tv/trending/page-{PAGE}.json`
  - GET `/tv/top-rated/page-{PAGE}.json`
  - GET `/search?query={QUERY}`
  - GET `/movie/{TMDB_ID}` (details)
  - GET `/tv/{TMDB_ID}` (details)
  - GET `/imdb/api/?action=stats` (library stats)

### 4.2 Data Models

#### Movie Model
```javascript
{
  tmdb_id: string,
  imdb_id: string,
  title: string,
  year: string,
  poster_url: string,
  rating: string,
  genre: string,
  popularity: string,
  overview: string,
  runtime: number,
  embed_url: string
}
```

#### TV Show Model
```javascript
{
  tmdb_id: string,
  imdb_id: string,
  title: string,
  year: string,
  poster_url: string,
  rating: string,
  genre: string,
  popularity: string,
  overview: string,
  seasons: number,
  episodes: Array<{
    season: number,
    episode: number,
    title: string,
    thumbnail: string,
    embed_url: string
  }>
}
```

#### Cache Model
```javascript
{
  key: string,           // cache key (e.g., "movies_latest_page_1")
  data: any,             // cached response data
  timestamp: number,     // unix timestamp when cached
  ttl: number,           // time-to-live in seconds
  expiresAt: number      // timestamp when cache expires
}
```

### 4.3 Security & Privacy
- No user authentication (public content)
- No personal data collection
- Watch progress stored locally only
- HTTPS only for API calls
- Content Security Policy (CSP) for web
- No third-party tracking

---

## 5. Success Metrics

### 5.1 Key Performance Indicators (KPIs)

- **Engagement:**
  - Daily Active Users (DAU)
  - Average Session Duration > 30 minutes
  - Content views per session > 3
  - Completion rate (% of videos watched > 80%)

- **Performance:**
  - Cache hit rate > 80%
  - Page load time < 2 seconds
  - API error rate < 1%
  - Player startup time < 3 seconds

- **User Satisfaction:**
  - App crash rate < 0.5%
  - Video buffering incidents < 5% of sessions
  - Navigation responsiveness > 95% (< 300ms)

---

## 6. Out of Scope (Future Considerations)

- User accounts and profiles
- Multi-device sync
- Social features (comments, ratings, sharing)
- Offline downloads
- Parental controls
- Custom playlists
- Recommendations engine
- Native mobile apps (iOS, Android phones)
- Chromecast / AirPlay support
- Payment / Premium features
- Admin dashboard

---

## 7. Launch Plan

### 7.1 Phase 1: MVP (Week 1-2)
- Core browsing (Movies, TV Shows)
- Detail pages
- Video player (basic)
- Caching system
- TV navigation

### 7.2 Phase 2: Enhancement (Week 3-4)
- Search functionality
- Watch progress tracking
- Continue watching
- Web version optimization

### 7.3 Phase 3: Polish (Week 5-6)
- Performance optimization
- Cache efficiency improvements
- UI/UX refinements
- Bug fixes and stability

---

## 8. Approval & Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | [Name] | 2026-05-26 | ✓ Approved |
| Engineering Lead | [Name] | 2026-05-26 | ✓ Approved |
| Design Lead | [Name] | 2026-05-26 | ✓ Approved |

---

**Document Status:** ✅ Approved for Development



