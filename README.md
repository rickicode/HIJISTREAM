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

## CI/CD

### Auto Build APK (GitHub Actions)

The project includes automated APK building via GitHub Actions:

- **Trigger:** Create a release (or push a tag like `v1.0.0`, `v1.0.1`, etc.)
- **Output:** Separate APKs for `arm64-v8a` (64-bit ARM), `armeabi-v7a` (32-bit ARM), and a universal APK
- **Artifacts:** APKs are available as build artifacts in the Actions tab
- **Release:** When you create a GitHub Release with a tag (e.g., `v1.0.1`), APKs are automatically attached to the release

To trigger a release build:
1. Go to GitHub Releases
2. Create a new release with a tag (e.g., `v1.0.1`)
3. The workflow builds APKs and attaches them to the release automatically

You can also trigger a build manually from the Actions tab using "Run workflow".

### Web CI (Lint, Typecheck, Build, Test)

On every push to `main` and every pull request:
- Lint check
- TypeScript type check
- Production build
- Integration tests (Vitest)

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
├── .github/
│   └── workflows/
│       ├── build-apk.yml     # Auto build Android APK on release/tag
│       └── build-web.yml     # Web CI (lint, typecheck, build, test)
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
