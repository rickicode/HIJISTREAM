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
| Provider | 6 (OS.com, OS.org, subdl, podnapisi, yify, subtitlecat) | 5 (YIFY, SubtitleCat, OpenSubtitles, SubDL, Podnapisi) |
| Penjadwalan provider | `Promise.allSettled` — 6 serentak | Per-provider, dinilai berbobot |
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

Dampak: **semua** jalur
- `src/utils/subtitle.js:488` (subdl)
- `:527`, `:541` (podnapisi)
- `:577` (yify)
- `:710` (`extractAllSubtitlesFromZip` — subtitlecat)
- `:1223` (fallback saat unduhan vendor gagal)

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
3. **Provider paralel vs berurutan.** hijistream menembak 6 provider serentak melalui
   `Promise.allSettled` (`:1300`); hijitv memanggil per-provider lalu menilai berbobot. Paralel
   lebih cepat kalah latency; berurutan lebih hemat kuota API per unduhan.
4. **Pemilihan hasil.** hijistream menyortir berdasarkan prioritas sumber
   (`opensubtitles_com > opensubtitles_org > subdl > yify > subtitlecat > podnapisi`, `:1321`)
   setelah skor seed. hijitv memakai skor berbobot `downloadCount` + `langmatch` + format — lebih
   tahan terhadap provider yang "menang karena prioritas" walau kualitas cue lebih rendah.
5. **Ekstraksi ZIP.** hijistream kini memakai fflate (pure JS) untuk memenuhi batasan Edge;
   hijitv memakai `archive/zip` native Go — lebih sedikit kode dan tanpa ketergantungan platform.
6. **Titik masuk.** hijistream merutekan subtitle lewat Vercel Edge middleware
   (`middleware.js` `/subtitles/*`) dan `functions/api/[[path]].js` sebagai jalur cadangan;
   hijitv seluruhnya di satu biner Go yang juga melayani berkas lewat `/api/subtitles/file/{file}`.

---

## 4. Rekomendasi

| Prioritas | Aksi |
|---|---|
| Tinggi | Pantau kuota OS.com; tambah rotasi akun / `apiKey` berbayar. |
| Tinggi | Tambah `console.error` pada cabang `catch` ekstraksi agar kegagalan seperti §2.1 tidak senyap. |
| Sedang | Kembalikan pesan error provider-spesifik di `/subtitles/download` (sekarang generik "Download failed"). |
| Sedang | Adopsi skor berbobot ala hijitv (downloadCount + langmatch) agar tidak bergantung urutan prioritas. |
| Rendah | Simpan preferensi sumber per judul di metadata R2 (setara `active_*.txt` hijitv) agar pilihan provider terbaik tidak bergantung state klien. |

---

## 5. Catatan verifikasi

- Lint: 42 masalah (34 error) di `apps/web` — **semua pre-existing** (`91c90de` punya 5 error
  identik di `src/utils/subtitle.js`; sisanya di komponen lain). Nol regresi.
- Typecheck: 42 error, semuanya pre-existing (`seasonFilter`, properti `error` pada objek
  progress, `PromiseSettledResult.value`). Nol regresi.
- Test: **92/92 lulus** (88 lama + 4 baru di `tests/subtitle-zip.test.js`).
- Build: `vite build` sukses.
- Commit: `301d401` (fix), `0c898ef` (bersihkan probe).

Test regresi baru (`tests/subtitle-zip.test.js`) mensimulasikan host tanpa `DecompressionStream`
(`delete globalThis.DecompressionStream`) — persis kondisi Edge yang menyebabkan kegagalan.