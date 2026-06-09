# Taskboard: Android TV UI Redesign

This board tracks the total redesign of the Android TV UI to make it compact, neat, and consistent like Netflix.

| Task ID | Component / Screen | Description | Status | Verifier |
| --- | --- | --- | --- | --- |
| TS-001 | Design System & Cards | Redesign `ContentCard` to be compact (`160x240`), adjust overlay styling, and ensure focus styles are clean. | DONE | Code review & scale |
| TS-002 | Navigation Bar | Redesign `(tabs)/_layout.jsx` to have a compact height (`56` or `60`), smaller logo, and smaller nav item labels. | DONE | Code review |
| TS-003 | Hero Banner | Refactor `HeroBanner.jsx` to reduce height to `60%` of screen, shrink title/button text, and use compact buttons. | DONE | Code review |
| TS-004 | Home Screen | Refactor `(tabs)/home.jsx` and `ContentRail.jsx` to match new spacing and header sizes. | DONE | Code review |
| TS-005 | Browse Screen | Refactor `(tabs)/browse.jsx` to compact tab switchers, genre card heights (`100dp` instead of `160dp`), and grid structure. | DONE | Code review |
| TS-006 | Movie Detail Screen | Refactor `movie/[id].jsx` to compact hero section, details info overlay, action buttons, and recommendation list. | DONE | Code review |
| TS-007 | TV Show Detail Screen | Refactor `tv/[id].jsx` to compact hero section, season selector list, episode list items (thumbnails `160x90`, titles, description), and recommendations. | DONE | Code review |
| TS-008 | Discovery Screens | Redesign `genre/[id].jsx` and `country/[id].jsx` to add a consistent Header Bar (with Back Button + Title) and dynamic column grid. | DONE | Code review |
| TS-009 | List & My List Screens | Redesign `list/[type].jsx` and `(tabs)/mylist.jsx` to align with the back button header style and dynamic column grid. | DONE | Code review |
| TS-010 | Profile Screen | Refactor `(tabs)/profile.jsx` to compact menu items, avatars, and fonts. | DONE | Code review |
| TS-011 | Search Screen | Compact `search.jsx` input field and results grid to match others. | DONE | Code review |
| TS-012 | Video Player Overlay | Compact `CustomPlayerOverlay.jsx` icons, play button, and settings modal spacing. | DONE | Code review |
| TS-013 | Build Validation | Verify the TV app builds successfully and passes formatting/TypeScript checks. | DONE | CLI build test |
