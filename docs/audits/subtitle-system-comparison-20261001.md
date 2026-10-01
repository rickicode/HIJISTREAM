# Analisis & Perbandingan Sistem Subtitle — hijistream vs hijitv

**Tanggal:** 2026-10-01
**Scope:** `hijistream/apps/web` (middleware Edge + `src/utils/subtitle.js`) vs `hijitv/internal/subtitle`
**Mode:** audit + perbaikan bug produksi. Verifikasi terhadap deploy live `hijistream-web.vercel.app`.

---

## 1. Ringkasan eksekutif

Dua sistem menyelesaikan masalah yang sama dengan kompromi berbeda:

| | **hijistream** (web) | **hijitv** (Go native) |
|---|---|---|
| Runtime | Vercel Edge middleware (`apps/web/middleware.js`) | Go service (`kiosk-hijitv.service`) |
| Penyimpanan | Cloudflare R2 (object store) | Filesystem lokal (`.cache/subtitles`, `/storage/subtitles`) |
| Metadata | `metadata.json` di R2 (indeks global) | Nama file (`.vtt`) + `CacheFile` hasil pemindaian |
| Kunci file | `subtitles/{type}/{id}/{lang}.vtt` | `{type}_{id}_{lang}[-s_se].vtt` (mis. `movie_385687_id.vtt`) |
| Override pilihan | Tidak ada — `/subtitles/download` menyimpan langsung file yang dipilih user | File penanda `active_movie_385687.txt` / `active_tv_1399_s1_e1.txt` |
| Provider | 5 dikonfigurasi (OS.com, OS.org, subdl, yify, subtitlecat) + AI translate; podnapisi dihapus 2026-10-01 | 5 (YIFY, SubtitleCat, OpenSubtitles, SubDL, Podnapisi) |
| Penjadwalan provider | Jalur otomatis `Promise.allSettled` 5 serentak; jalur pencarian berurutan | Per-provider, dinilai berbobot |
| Pemilihan hasil | Prioritas sumber, lalu skor seed | Skor berbobot (downloadCount, langmatch, format) |
| AI translate | Fallback otomatis saat lang=`id` | Otomatis saat Indo (`subtitle.go:977`) |
| Konversi SRT→VTT | JS (`srtToVtt`) | Go (`SRTToVTT`, `subtitle.go:57`) |
| Ekstraksi ZIP | `fflate` (pure JS) — **baru diperbaiki** | `archive/zip` native Go |

**Temuan utama:** semua unduhan provider yang mengembalikan ZIP (subdl, podnapisi, yify, subtitlecat)
**gagal di produksi** karena runtime Edge tidak menyediakan `DecompressionStream`. Perbaikan sudah
di-commit (`301d401`) dan diverifikasi live.

---

## 2. Temuan produksi (bug + bukti)

### 2.1 `DecompressionStream` tidak ada di Edge runtime

`extractSubtitleFromZip` / `extractAllSubtitlesFromZip` mengandalkan
`new DecompressionStream('deflate-raw')` untuk isi ZIP terdeflate. Di runtime middleware Vercel,
konstruktor itu **tidak ada**.

Probe live (`/debug/ziptest`, commit sementara `4dad32b`, kini dihapus):

```json
{"zipStatus":200,"zipBytes":51462,"firstSig":"ok","comp":8,"csize":51274,
 "decompressionStream":false,"extractedLen":null,"exErr":null}
```

`decompressionStream:false` + `extractedLen:null` = ekstraksi mengembalikan `null` tanpa error
(`catch { text = null; }` menelan kegagalan). Akibatnya `downloadSubtitleByProvider` → `null` →
HTTP 500 `{"error":"Download failed"}`.

Dampak: **semua** jalur berikut (sebelum perbaikan):

- `src/utils/subtitle.js:488` (subdl)
- `:527`, `:541` (podnapisi — sudah dihapus)
- `:710` (`extractAllSubtitlesFromZip` — subtitlecat)
- `:1223` (fallback saat unduhan vendor gagal)

Catatan: nomor baris mengacu ke kode **sebelum** perbaikan; `fflate` memindahkan semuanya.

### 2.2 Perbaikan

Ganti parser ZIP manual + `DecompressionStream` dengan **`fflate`** (inflate murni-JS, tanpa API
platform):

```js
import { unzipSync, strFromU8 } from 'fflate';

export function extractSubtitlesFromZip(buffer) {
  const MAX_SIZE = 4 * 1024 * 1024;
  let archive;
  try { archive = unzipSync(new Uint8Array(buffer)); } catch { return []; }
  const entries = [];
  for (const [filename, data] of Object.entries(archive)) {
    if (!/\.(srt|vtt|ass|ssa)$/i.test(filename)) continue;
    if (data.length > MAX_SIZE) continue;
    const content = strFromU8(data);
    if (content.includes('-->')) entries.push({ filename, content });
  }
  return entries;
}
```

Verifikasi live setelah deploy (`301d401`):

```json
{"zipStatus":200,"zipBytes":51462,"firstSig":"ok","comp":8,"csize":51274,
 "decompressionStream":false,"extractedLen":126504,"exErr":null}
```

`extractedLen` `null → 126504`. End-to-end:

```
POST /api/subtitles/download {provider:"subdl", file_id:"...subdl...zip", type:"movie", tmdb_id:550, lang:"en"}
HTTP 200 {"success":true,"subtitle":{"url":"https://subs.hijitoko.com/subtitles/movie/550/en.vtt","format":"vtt","cached":false}}
```

### 2.3 Bug terpisah yang **bukan** bug kode

`opensubtitles_com` tetap 500. Probe stage-by-stage (`/debug/oscom`):

```json
{"step":"login","status":200,"hasToken":true}
{"step":"download","status":406,"hasLink":false,
 "sample":"{\"requests\":20,\"remaining\":0,\"message\":\"You have downloaded your allowed 20 subtitles for 24h. ... renewed in 13 hours\"}"}
```

Login OK; kuota akun gratis (20 unduhan/24 jam) habis, reset ~13 jam. **Perbaikan:** tier
berbayar / rotasi akun / andalkan provider lain (kini subdl berfungsi).

---

## 3. Perbandingan arsitektur & alur

```mermaid
graph TD
  subgraph HS[hijistream / Edge]
    A[Client] --> B[middleware.js /subtitles/download]
    B --> C[downloadSubtitleByProvider]
    C --> D{provider: subdl / podnapisi / yify ...}
    D --> E[extractSubtitlesFromZip - fflate]
    E --> F[srtToVtt]
    F --> G[(R2: subtitles/type/id/lang.vtt)]
    B --> H[getOrFetchSubtitle -> translateSrtToIndonesian bila lang=id]
  end
  subgraph HT[hijitv / Go]
    J[TV Client] --> K[/api/subtitles/download]
    K --> L[Service search+download]
    L --> M[archive/zip native]
    M --> N[(.cache/subtitles)]
    N --> O[/api/subtitles/file/name.vtt]
    L -.isIndo & CanTranslateAI.-> P[TranslateSRTToIndonesian]
  end
```

### Kesenjangan operasional

1. **Storage & indeks.** hijistream menyimpan satu `metadata.json` + `.vtt` di R2 — indeks global
   instan, cocok multi-device, tapi tulis metadata bersama tanpa transaksi sehingga rawan *race*.
   hijitv memakai berkas `.vtt` di disk; daftar dihasilkan dari pemindaian direktori dan
   sumber/AI disimpulkan dari **nama file** (`ParseSourceFromName`, `manage.go:35`) — atomik
   per-item, tanpa indeks global.
2. **Pilihan aktif.** hijistream tidak menyimpan estado pilihan: `/subtitles/download` memanggil
   `downloadSubtitleByProvider` dengan `provider` + `file_id` persis yang dikirim klien lalu
   menyimpan hasilnya sebagai `.vtt` untuk `{type}/{id}/{lang}`. Pilihan hidup di state klien.
   hijitv mempersistensinya sebagai file `active_*.txt`, jadi pilihan bertahan lintas sesi/klien.
3. **Provider paralel vs berurutan.** jalur otomatis `getOrFetchSubtitle` menembak 5 provider
   serentak melalui `Promise.allSettled` (`subtitle.js:1280`); jalur pencarian modal memanggil
   per-provider secara berurutan (`:925`). hijitv memanggil per-provider lalu menilai
   berbobot. Paralel lebih cepat kalah latency; berurutan lebih hemat kuota API per unduhan.
4. **Pemilihan hasil.** jalur pencarian modal mengurutkan `downloadCount` menurun
   (`subtitle.js:1100`); jalur otomatis memilih lewat `sourcePriority`
   (`opensubtitles_com > opensubtitles_org > subdl > yify > subtitlecat`, `:1301`).
   hijitv memakai skor berbobot `downloadCount` + `langmatch` + format — lebih tahan
   terhadap provider yang "menang karena prioritas" walau kualitas cue lebih rendah.
5. **Ekstraksi ZIP.** hijistream kini memakai fflate (pure JS) untuk memenuhi batasan Edge;
   hijitv memakai `archive/zip` native Go — lebih sedikit kode dan tanpa ketergantungan platform.
6. **Titik masuk.** hijistream merutekan subtitle lewat Vercel Edge middleware
   (`middleware.js` `/subtitles/*`) dan `functions/api/[[path]].js` sebagai jalur cadangan;
   hijitv seluruhnya di satu biner Go yang juga melayani berkas lewat `/api/subtitles/file/{file}`.

### 3.2 Temuan live 2026-10-01: tiga provider tidak pernah berkontribusi

Probe produksi (`hijistream-web.vercel.app`, 6 judul, dengan dan tanpa `imdb_id`) selalu
mengembalikan set identik:

```
tmdb_id=27205|155|550|680|496243 ± imdb_id  ->  25 hasil
{opensubtitles_com: 15, subdl: 10}          ->  0 dari opensubtitles_org, yify, subtitlecat
```

`opensubtitles_org`, `yify`, `subtitlecat` **tidak pernah** muncul di satu pun hasil. Ketiganya
bergantung pada `DOMParser` (OS.org, `subtitle.js:415`) atau regex atas HTML situs pihak ketiga
(YIFY, SubtitleCat).

Uji terpisah **dari mesin ini** dengan User-Agent identik dengan kode menunjukkan situs-situs itu
sehat dan markup-nya cocok:

| Host | HTTP | Markup yang dicari kode |
|---|---|---|
| `yifysubtitles.ch/movie-imdb/tt1375666` | 200, 980 KB | `href="/subtitles/inception-2010-english-yify-244676"` cocok |
| `subtitlecat.com/index.php?search=Inception` | 200, 67 KB | `href="subs/1655/Inception.2010....html"` cocok |
| `podnapisi.net` (sudah dihapus) | DNS NXDOMAIN | tak punya alamat A/AAAA (DoH Google + Cloudflare) |

**Belum terbukti** penyebab pastinya; hipotesis yang masih hidup dan cara membedakannya:

1. `DOMParser` tidak ada di runtime function (Edge/Node) sehingga `xmlRpcRequest` selalu gagal
   → OS.org 0 hasil. Node 22 dan Bun 1.4.2 di mesin ini: `typeof DOMParser === 'undefined'`;
   runtime Vercel belum diverifikasi. Bukti lebih lanjut: `try/catch` di `xmlRpcRequest`
   (`:419`) jatuh ke regex fallback yang hanya mengenali dua bentuk `<member>` — cukup untuk
   token `LogIn`, tetapi seluruh payload `SearchSubtitles` akan hilang.
2. Egress function ke domain non-API diblokir/timeout. Ini tidak bisa diverifikasi tanpa
   men-deploy probe, jadi **tidak** diklaim.
3. SubtitleCat bergantung pada `title` dari TMDB di dalam `searchSubtitlesFromProviders`
   (`:1070-1080`); bila `TMDB_API_KEY` tidak terpasang di environment function, cabang itu
   di-skip diam-diam.

Yang pasti: ketiga provider gagal **tanpa jejak** karena setiap cabang dibungkus
`catch { /* skip */ }`, dan pesan kegagalan tidak pernah sampai ke klien.

**Rekomendasi penambahan:** cabang `catch` di `searchSubtitlesFromProviders` harus mencatat
kegagalan per-provider (`[Subtitle] <provider> search:`) seperti jalur unduhan sudah melakukannya
(`subtitle.js:1286`), supaya provider mati terlihat dan bukan sekadar "hasil kosong".

---

## 4. Rekomendasi

| Prioritas | Aksi |
|---|---|
| Tinggi | Pantau kuota OS.com; tambah rotasi akun / `apiKey` berbayar. |
| Tinggi | Tambah `console.error` pada cabang `catch` ekstraksi agar kegagalan seperti §2.1 tidak senyap. |
| Sedang | Kembalikan pesan error provider-spesifik di `/subtitles/download` (**selesai 2026-10-01**; §2.2). |
| Tinggi | Investigasi provider yang tidak berkontribusi (§3.2): OS.org, YIFY, SubtitleCat selalu 0 hasil di produksi. |
| Sedang | Adopsi skor berbobot ala hijitv (downloadCount + langmatch) agar tidak bergantung urutan prioritas. |
| Rendah | Simpan preferensi sumber per judul di metadata R2 (setara `active_*.txt` hijitv) agar pilihan provider terbaik tidak bergantung state klien. |

**Status implementasi (2026-10-01, sesi perbaikan):**

| Rekomendasi | Status |
|---|---|
| `console.error` pada cabang `catch` ekstraksi | **Selesai** — `extractSubtitlesFromZip` kini mencatat `ZIP inflate failed` sebelum mengembalikan `[]`. |
| Pesan error provider-spesifik di `/subtitles/download` | **Selesai** — HTTP 500 membawa pesan provider (kuota OS.com, `HTTP 403` Subdl, dst.); 404 bila provider tak menghasilkan apa pun. Berlaku di `middleware.js` dan `functions/api/[[path]].js`. |
| Hapus provider Podnapisi | **Selesai** — domain upstream `podnapisi.net` tidak lagi punya alamat A/AAAA (NXDOMAIN di DoH Google + Cloudflare); setiap pencarian/unduhan pasti gagal. |
| Pantau kuota OS.com | **Belum** — masih operasional (rotasi akun / `apiKey` berbayar). |
| Skor berbobot ala hijitv | **Belum** — `rankSubtitles`/`computeScore` ada di `subtitle-providers.js` tetapi tidak terpasang di jalur mana pun. |
| Preferensi sumber per judul | **Belum** — pilihan tetap hidup di state klien. |
| Provider yang selalu 0 hasil (§3.2) | **Belum** — perlu logging per-provider lebih dulu agar penyebabnya terlihat. |


---

## 5. Catatan verifikasi

- Lint: **26 masalah (20 error, 6 warning)** di `apps/web`, turun dari 42 (34 error). Diff
  per-finding terhadap baseline HEAD: **0 temuan baru, 12 temuan hilang** (mis. unused
  import `Captions`/`Loader`/`Check`, unused `getCurrentLanguage`/`getLangLabel`/
  `getLangFlag`, dan peringatan `useEffect ... 'selectedSubtitle'` dari perbaikan autoplay).
- Test: **99/99 lulus** di 9 berkas. Termasuk `tests/subtitle-search-modal.test.jsx` baru
  (3 tes), yang **gagal 3/3 di baseline** `b810acf` dan lulus setelah perubahan.
- Build: `vite build` sukses.
- Live: `/api/subtitles/search` mengembalikan 25 hasil stabil di 6 judul (§3.2).
- Verifikasi live produksi (`hijistream-web.vercel.app`, commit `28a91cd` terkonfirmasi di
  chunk `SubtitleSearchModal-09ax3_S7.js`): halaman `/pengatur` 200; `/api/subtitles/search`
  19-25 hasil (OS.com + Subdl); unduh Subdl di UI → baris "Gagal" + banner
  `Subdl menolak unduhan: HTTP 429`; unduh OS.com → banner kuota harian asli
  (`...allowed 20 subtitles for 24h...`). Tidak ada lagi pesan generik "Download failed".
- Pipeline unduh end-to-end dibuktikan lokal (smoke throwaway, jaringan di-stub): pilih berkas →
  SRT→VTT → PUT R2 → metadata → baca balik `cached:true`; 8 pemeriksaan lulus.
- Catatan: dua provider sama-sama tidak bisa mengunggah saat verifikasi (Subdl free tier 429,
  kuota 24 jam OS.com habis), jadi bukti sukses-unggah berasal dari smoke, bukan produksi.
- Commit: `301d401` (fflate fix), `0c898ef` (bersihkan probe), `28a91cd` (sesi perbaikan
  2026-10-01: error provider, loading model, hapus Podnapisi).

Test regresi baru (`tests/subtitle-zip.test.js`) mensimulasikan host tanpa `DecompressionStream`
(`delete globalThis.DecompressionStream`) — persis kondisi Edge yang menyebabkan kegagalan.