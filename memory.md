# HIJISTREAM — Subtitle System State

> Dibuat: Juni 2025

## Ringkasan Perubahan

Sistem subtitle di-rework total: dari vaplayer auto-search (`ds_lang`) menjadi **sistem sendiri** berbasis R2 + OpenSubtitles API. User bisa memilih subtitle dari berbagai bahasa, admin bisa manage semua subtitle via dashboard lengkap dengan statistik.

---

## 1. File Baru

### `apps/web/src/components/SubtitlePicker.jsx`
Component dropdown untuk memilih subtitle di halaman detail Movie/TV:
- Tombol trigger: globe icon + flag + nama bahasa + jumlah subtitle tersedia
- Dropdown naik ke atas (positioned above), auto-close saat klik di luar
- Opsi "No Subtitles" untuk nonaktifkan subtitle
- Setiap subtitle: flag + nama bahasa + badge "Cached" (jika sudah di R2) + centang
- Disable saat player aktif
- Support 7 bahasa: id, en, es, pt, hi, ja, ko

### `memory.md`
File ini — dokumentasi state perubahan.

---

## 2. File Dimodifikasi

### `apps/web/src/app/Admin.jsx`
Halaman admin panel dengan fitur lengkap:

**Login Screen:**
- Basic Auth via `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars
- Validasi credentials dengan test call ke API

**Admin Dashboard:**
- **StatsCards**: 4 card (Total/Movies/TV/Languages) dengan hitungan real-time
- **ChartsSection** (via `recharts`):
  - Daily Downloads — bar chart 30 hari, bar merah untuk yang ada download
  - Top Languages — horizontal bar chart dengan warna per bahasa
  - Content Type — donut chart Movie vs TV Show
  - Download Source — donut chart OpenSubtitles vs Manual Upload
- **Search bar**: cari by judul, TMDB ID, IMDB ID
- **Filter panel**: Type, Language, Sort
- **Table**: data per subtitle dengan action Download + Delete
- **UploadModal**: multi-file drag & drop:
  - Drag & drop zone dengan visual feedback (border + background berubah)
  - Multiple file selection (`.srt` / `.vtt`)
  - File queue dengan status per-item: pending → uploading (spin) → done (hijau) / error (merah)
  - Batch submit sequential, auto-close jika semua sukses
  - Duplicate detection (by name + size), hapus per-file
  - Validasi ukuran file (max 5MB)
  - Form: Type (Movie/TV) → TMDB ID → Bahasa → Season/Episode (TV) → Title/IMDB (opsional)

### `apps/web/src/app/MovieDetail.jsx`
- Hapus `dsLang` dari embed options — subtitle hanya via sistem kita
- Pre-fetch subtitle untuk 7 bahasa sekaligus (`ALL_SUBTITLE_LANGS`)
- `availableSubtitles[]` + `selectedSubtitle` state
- Auto-select berdasarkan bahasa user saat ini
- Render `SubtitlePicker` di atas konten detail (antara PlayerBox dan detail)
- Snapshot pattern: embed URL di-capture saat user klik play, tidak reaktif
- Guard autoplay: useRef prevents re-capture when subtitle arrives async

### `apps/web/src/app/TVDetail.jsx`
- Sama seperti MovieDetail, plus:
- Re-fetch subtitle saat ganti season/episode
- `handlePlayEpisode` snapshot dengan season/episode yang benar

### `apps/web/src/utils/subtitle.js`
Subtitle service lengkap:

**R2 Storage (AWS SigV4):**
- `sha256Hex`, `hmac`, `getSignatureKey`, `signS3` — signing S3 requests via Web Crypto
- `r2PutObject` — upload file ke R2
- `getR2PublicUrl` — generate public URL
- `deleteSubtitleFile` — hapus file dari R2

**OpenSubtitles API:**
- `openSubtitlesLogin` — login + get token
- `openSubtitlesSearch` — search by TMDB ID, fallback ke IMDB ID
- `openSubtitlesDownload` — get download link + fetch file content

**Subtitle Processing:**
- `srtToVtt` — convert SRT → VTT (BOM strip, koma → titik, tambah WEBVTT header)

**Metadata Management (R2 JSON):**
- `readMetadata`, `writeMetadata`, `addToMetadata`, `removeFromMetadata`
- Struktur: `{ version, updatedAt, subtitleCount, subtitles: [...] }`

**Public API:**
- `getOrFetchSubtitle` — cek R2 → download OpenSubtitles → convert → upload R2 → catat metadata
- `getOrFetchSubtitles` — batch untuk multiple languages
- `handleUploadSubtitle` — manual upload: detect SRT, convert, upload R2, update metadata

### `apps/web/src/utils/api.js`
- `getSubtitles()` — endpoint `/api/subtitles` dengan cache
- Admin methods: `setAdminAuth`, `clearAdminAuth`, `isAdminAuthenticated`, `getAdminSubtitles`, `deleteAdminSubtitle`, `uploadAdminSubtitle`

### `apps/web/src/utils/player.js`
- Hapus `ds_lang` dari `getMovieEmbedUrl` dan `getTVEmbedUrl`
- Subtitle hanya via `sub_url` / `sub_lang` / `sub_default`

### `apps/web/middleware.js` (Vercel Edge)
- Route `/subtitles` — handler multi-language subtitle fetch
- Route `GET /api/admin/subtitles` — baca metadata dari R2
- Route `DELETE /api/admin/subtitles` — hapus file + metadata
- Route `POST /api/admin/subtitles/upload` — upload manual
- `checkAdminAuth()` — Basic Auth validator
- CORS: tambah `Authorization` ke allowed headers

### `apps/web/functions/api/[[path]].js` (Cloudflare Workers)
Sama persis seperti middleware.js — dual-runtime support

### `apps/web/tests/player.test.js`
- Ganti semua test `ds_lang` dengan test `sub_url`
- Test kombinasi sub_url + sub_lang + sub_default

### `package.json` (web)
- Tambah dependency: `recharts@^3.8.1`

---

## 3. Arsitektur Subtitle Flow

```
User buka Movie/TV Detail
  ↓
GET /api/subtitles?type=movie&tmdbId=550&lang=id,en,ja,ko,es,pt,hi
  ↓
Backend (middleware.js / [[path]].js):
  for each language:
    Cek R2: subtitles/movie/550/id.vtt
      → ADA? return public URL (cached:true)
      → TIDAK ADA? download OpenSubtitles → convert → upload R2 → catat metadata
  ↓
Response: [{url, lang, cached}, {url, lang, cached}, ...]
  ↓
Auto-select: cari bahasa user → fallback ke pertama
  ↓
SubtitlePicker muncul: "🇮🇩 Bahasa Indonesia" — user bisa ganti manual
  ↓
User klik Play → captureEmbedUrl(selectedSubtitle)
  ↓
vaplayer iframe: ?sub_url=https://pub-xxx.r2.dev/...&sub_lang=id&sub_default=true
  ↓
✅ Subtitle dari sistem kita langsung tampil — tanpa reload
```

### Key Design Decisions

| Keputusan | Alasan |
|-----------|--------|
| `ds_lang` dihapus total | Gagal sering, subtitle tidak ter-cache, tidak bisa di-manage |
| Subtitle via R2 public URL langsung | Zero latency via Cloudflare CDN, no bandwidth cost ke server |
| Snapshot pattern (capture di play time) | Mencegah iframe reload saat state berubah |
| 7 bahasa di-fetch sekaligus | User bisa ganti subtitle tanpa reload halaman |
| Metadata JSON di R2 | No database needed — sederhana, portable |
| AWS SigV4 via Web Crypto | Bisa jalan di Vercel Edge + Cloudflare Workers |
| Dual runtime (middleware.js + [[path]].js) | Support Vercel dan Cloudflare Pages |

---

## 4. R2 Storage Structure

```
Bucket: hijistream-subtitles
├── subtitles/
│   ├── metadata.json          ← JSON database
│   ├── movie/
│   │   ├── {tmdbId}/
│   │   │   ├── id.vtt
│   │   │   ├── en.vtt
│   │   │   └── ja.vtt
│   └── tv/
│       └── {tmdbId}/
│           └── {season}/
│               └── {episode}/
│                   ├── id.vtt
│                   └── en.vtt
```

### Metadata JSON Structure (`subtitles/metadata.json`)
```json
{
  "version": 1,
  "updatedAt": "2025-06-01T00:00:00Z",
  "subtitleCount": 5,
  "subtitles": [
    {
      "id": "movie_550_id",
      "type": "movie",
      "tmdbId": 550,
      "imdbId": "tt0137523",
      "title": "Fight Club",
      "lang": "id",
      "langName": "Indonesian",
      "key": "subtitles/movie/550/id.vtt",
      "url": "https://pub-xxx.r2.dev/subtitles/movie/550/id.vtt",
      "format": "vtt",
      "season": null,
      "episode": null,
      "downloadedAt": "2025-06-01T00:00:00Z",
      "source": "opensubtitles"
    }
  ]
}
```

---

## 5. Env Vars

```env
# TMDB
TMDB_API_KEY=

# OpenSubtitles (download otomatis)
OPENSUBTITLES_API_KEY=
OPENSUBTITLES_USERNAME=
OPENSUBTITLES_PASSWORD=

# Cloudflare R2 (storage subtitle)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=hijistream-subtitles
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# Admin login
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

---

## 6. Status Tests

- ✅ Typecheck: clean
- ✅ Unit tests: 42/42 pass
- ✅ Code review: approved
- ✅ Build: success
