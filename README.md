# HIJISTREAM

A streaming platform for movies and TV shows built with React, Vite, and Tailwind CSS. Browse 89,155+ movies and 19,012+ TV shows with a responsive, modern interface.

## Deploy

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rickicode/HIJISTREAM&root-directory=apps/web&build-command=bun%20run%20build&output-directory=dist)

### Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/rickicode/HIJISTREAM)

### Deploy to Cloudflare Pages

1. Install Wrangler CLI:
   ```bash
   bun add -g wrangler
   ```

2. Build the project:
   ```bash
   cd apps/web
   bun install
   bun run build
   ```

3. Deploy with Wrangler:
   ```bash
   wrangler pages deploy dist --project-name=hijistream
   ```

## Features

- Movies browsing with categories (Latest, Trending, Top Rated, Upcoming)
- TV Shows browsing with season and episode selection
- Search with search history
- Watch progress tracking and resume
- Responsive design (mobile, tablet, desktop)
- Keyboard shortcuts for navigation
- Intelligent caching for fast page loads
- Skeleton loading states for smooth UX

## Tech Stack

- React 18
- Vite 5
- Tailwind CSS
- React Query (TanStack Query)
- React Router
- Lucide React (icons)
- Vitest (testing)
- Bun (package manager and runtime)

## Project Structure

```
HIJISTREAM/
├── apps/
│   ├── web/              # React SPA (Vite + Tailwind)
│   │   ├── src/
│   │   │   ├── app/          # Page components
│   │   │   ├── components/   # Shared UI components
│   │   │   ├── hooks/        # Custom hooks
│   │   │   └── utils/        # API, cache, storage utilities
│   │   ├── tests/            # Integration tests
│   │   ├── vercel.json       # Vercel deployment config
│   │   └── wrangler.toml     # Cloudflare deployment config
│   └── mobile/           # React Native app (Expo Router)
│       └── src/
│           ├── app/          # Expo Router screens
│           ├── components/   # Shared components
│           └── utils/        # API, cache, storage utilities
├── render.yaml           # Render.com deployment config
├── PRD.md                # Product Requirements Document
├── TDD.md                # Technical Design Document
└── README.md
```

## Local Development

```bash
git clone https://github.com/rickicode/HIJISTREAM.git
cd HIJISTREAM/apps/web
bun install
bun run dev
```

### Build

```bash
bun run build
```

### Run Tests

```bash
bun run test
```

### Lint

```bash
bun run lint
```

### Type Check

```bash
bun run typecheck
```

## License

MIT
