# Redesign Goal Workflow

## Mode
- goal
- max cycles: 5
- assumed approval: full-auto

## Redesign Plan
1. **Design System & Components**: Define compact dimensions for TV components (widths, heights, font sizes).
2. **Components Refactor**:
   - `TVFocusable.jsx`: Verify focus state behavior.
   - `ContentCard.jsx`: Refactor to compact size (`CARD_WIDTH = 160`, `CARD_IMAGE_HEIGHT = 240`) and clean overlay.
   - `ContentRail.jsx`: Refactor headers and scroll spacing.
   - `HeroBanner.jsx`: Reduce sizes (height, titles, buttons) for a premium, less intrusive look.
   - `CustomPlayerOverlay.jsx`: Compact the overlay text, buttons, and settings modals.
3. **Screens Refactor**:
   - `(tabs)/home.jsx`: Refactor layout.
   - `(tabs)/browse.jsx`: Compact tabs and grid cards, adjust emoji/flag sizes.
   - `(tabs)/mylist.jsx`: Implement dynamic column grid layout matching the design system.
   - `(tabs)/profile.jsx`: Compact list items, text sizes, and paddings.
   - `(tabs)/_layout.jsx`: Redesign top navigation bar with compact height and labels.
   - `movie/[id].jsx`: Compact hero backdrop, buttons, metadata row, and list items.
   - `tv/[id].jsx`: Compact hero, buttons, metadata, season selector, episode thumbnails/titles, and recommendations list.
   - `genre/[id].jsx`: Add consistent header with Back Button and Title, implement dynamic responsive grid layout.
   - `country/[id].jsx`: Add consistent header with Back Button and Title, implement dynamic responsive grid layout.
   - `list/[type].jsx`: Add consistent header and back navigation, implement dynamic grid.
   - `search.jsx`: Compact the search text input and align the results grid dynamically.

## Success Criteria
- [x] TV UI is compact and scales beautifully on standard TV screens (typically simulated as 960dp or 1280dp width).
- [x] Visual hierarchy is consistent across all views: Home, Browse, My List, Settings, Movie/TV Details, Genre, Country, See All, Search, and Player.
- [x] No more raw grids without titles/headers (specifically `genre/[id].jsx` and `country/[id].jsx` must have a Back Button and Title).
- [x] Navigation via TV D-pad works seamlessly with clear focused borders.
- [x] The app builds successfully after all updates.
