# HIJISTREAM

A streaming platform for movies and TV shows built with React, Vite, and Tailwind CSS.

## Deploy

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/user/HIJISTREAM&root-directory=apps/web)

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

   Or use Workers Sites:
   ```bash
   wrangler deploy
   ```

## Tech Stack

- React 18
- Vite 5
- Tailwind CSS
- React Query
- React Router
- lucide-react
- Bun

## Project Structure

```
HIJISTREAM/
├── apps/
│   ├── web/          # React SPA (Vite + Tailwind)
│   │   ├── src/
│   │   │   ├── app/        # Page components
│   │   │   ├── components/ # Shared UI components
│   │   │   ├── hooks/      # Custom hooks
│   │   │   └── utils/      # API, cache, storage utilities
│   │   ├── vercel.json     # Vercel deployment config
│   │   └── wrangler.toml   # Cloudflare deployment config
│   └── mobile/       # React Native app (Expo Router)
│       └── src/
│           ├── app/        # Expo Router screens
│           ├── components/ # Shared components
│           └── utils/      # API, cache, storage utilities
├── PRD.md            # Product Requirements Document
├── TDD.md            # Technical Design Document
└── README.md
```

## Features

- Movies browsing with categories (Latest, Trending, Top Rated)
- TV Shows browsing and episode selection
- Search with search history
- Watch Progress tracking
- Responsive design (mobile, tablet, desktop)
- Keyboard shortcuts for navigation

## Local Development

```bash
git clone https://github.com/user/HIJISTREAM.git
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

## License

MIT
