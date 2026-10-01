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

#### Akar masalah dikonfirmasi (2026-10-01, sesi ketiga)

Diagnostics dari produksi (`hijistream-web.vercel.app`, commit `3c6c43d`) mempersempit §3.2:

```
opensubtitles_com ok  n=15 — kuota unduhan tersisa 20
opensubtitles_org error n=0 — login XML-RPC gagal (status bukan 200)   <-- BUKAN DOMParser
subdl             ok  n=10
yify              skipped n=0 — butuh imdb_id
subtitlecat       error n=0 — TMDB menolak lookup (HTTP 401)
```

Hipotesis #1 (DOMParser absen) **terbantah**: `xmlRpcRequest` sudah dirombak jadi parser XML-RPC
murni-JS (`makeXmlRpcParser`, `subtitle.js:392`) dan berhasil memparse live. Yang gagal justru
`osOrgLogin` versi ter-deploy (`3c6c43d:437`):

```js
const result = await xmlRpcRequest(xmlRpcCall('LogIn', [creds.username, creds.password, 'en', OS_ORG_UA]));
if (!result?.token || !result.status?.startsWith('200')) return null;
```

Tiga cacat berlapis:

1. **Tidak ada jalur anonim.** Endpoint OS.org menerbitkan token anonim yang berfungsi
   (`LogIn ['','','en',UA]` → `200 OK`, token valid; diverifikasi live). Kode lama hanya memakai
   kredensial tersimpan, dan produksi tidak punya pasangan yang valid → `error` untuk selamanya.
   Cabang pemanggil juga digerbangi `if (creds...username && ...password)` (`3c6c43d:1030`), jadi
   tanpa kredensial provider **di-skip tanpa pernah mencoba**.
2. **Rute unduhan `src-api` mengembalikan iklan, bukan berkas.** `SubDownloadLink` menunjuk
   `/download/src-api/vrf-…/sid-…/`, yang menjawab 104 byte berisi
   `"Become OpenSubtitles.org VIP member"` untuk sesi gratis — diuji live pada 8/8 berkas
   (termasuk hasil yang diurutkan teratas), semua stub. Rute polos `/download/` mengembalikan
   berkas sebenarnya (34 KB gzip, 1192 cue, SRT).
3. **`subformat-vtt` bukan penyelamat.** Menyisipkan `/download/subformat-vtt/subencoding-utf8/`
   ke rute polos menjawab **HTTP 500** (diuji 2×), jadi transcode VTT tidak bisa diandalkan;
   rute polos mengembalikan SRT asli sehingga konversi SRT→VTT harus tetap berjalan di hilir.

Dua sisanya:

- **YIFY** di-skip karena `imdb_id` tidak dikirim. `/api/movie/:id` dan `/api/tv/:id` **memang**
  membawa `imdb_id` (`/api/movie/27205` → `"imdb_id":"tt1375666"`), tetapi `/subtitles/search`
  tidak pernah melakukan lookup sendiri, dan pemanggil yang melewatkan `imdb_id` kehilangan
  provider itu tanpa pesan. Catatan: `transformTVDetail` memakai `external_ids?.imdb_id`, jadi
  lookup TV perlu `append_to_response=external_ids` agar `imdb_id` ikut.
- **SubtitleCat** mewajibkan `TMDB_API_KEY` yang valid padahal judulnya **sudah** dikirim klien
  (`SubtitleSearchModal.jsx:44` mengirim `title`). Dengan kunci TMDB yang tidak valid (401),
  provider mati meski judul tersedia cuma-cuma di request.

**Perbaikan sesi ini:**

| # | Perbaikan | Bukti |
|---|---|---|
| F1 | Parser XML-RPC murni-JS (`makeXmlRpcParser`) menggantikan `DOMParser`, plus entitas & `<data/>` self-closing | 5 tes unit mem-parse payload live; gagal di `3c6c43d` |
| F2 | `osOrgLogin` selalu mencoba sesi anonim dan melaporkan bahwa kredensial ditolak; gerbang kredensial dihapus | Tes "tanpa kredensial" → `ok`, 1 login anonim; di `3c6c43d` → `skipped` |
| F3 | `osOrgDownloadUrl` membuang segmen `src-api` (rute polos); `osOrgFetchFile` mengembalikan `{content, alreadyVtt}` agar SRT asli tetap dikonversi | 8/8 berkas live dapat diunduh (34 KB/1192 cue); tes unduh gagal di `3c6c43d` |
| F4 | `providerStatus.opensubtitles_org = true` (bulk tidak lagi mensyaratkan kredensial) | — |
| F5 | Pencarian memakai `options.title` dari klien lebih dulu; lookup TMDB jadi fallback saja | Tes "judul dari klien"; produksi: `subtitlecat ok n=1 — judul dari klien` |
| F6 | `/subtitles/search` me-resolve `imdb_id` via TMDB (`append_to_response=external_ids`) bila klien tidak mengirimnya — **di `functions/api/[[path]].js` dan di `middleware.js`** (produksi dilayani middleware; lihat di bawah) | Tes middleware: `yify` dicari dengan `tt1375666`, 0 panggilan TMDB bila klien mengirim `imdb_id` |

#### OS.org: API resmi dimatikan, bukan bug kode (koreksi)

Percobaan lanjutan setelah deploy menunjukkan 403 bertahan di produksi padahal kode berhasil
dari mesin ini. Bukti:

- `LogIn` anonim dari mesin ini: **HTTP 200 + token** (curl, undici/Node, dan semua varian
  User-Agent termasuk yang identik dengan kode).
- Dari produksi: **HTTP 403** untuk percobaan ber-kredensial **dan** anonim.
- Proxy pusat data pihak ketiga (codetabs, allorigins) ke `api.opensubtitles.org`: **HTTP 522**
  — Cloudflare gagal menjangkau origin. Proxy lain (corsproxy.io) → **403**.
- Kebijakan OS.org sendiri: forum resmi, **"OpenSubtitles.org API - Final Shutdown Notice"**
  (29 Jan 2026) menyatakan API XML-RPC lama **dimatikan sepenuhnya** untuk semua aplikasi
  pihak ketiga, VIP maupun bukan; penggantinya REST `api.opensubtitles.com`.
  <https://forum.opensubtitles.org/viewtopic.php?t=19471>

**Kesimpulan:** OS.org hanya hidup dari IP residensial, tidak dapat diandalkan dari edge
Vercel, dan akan mati total. Perbaikan F1–F4 tetap benar (parser, fallback anonim, rute unduhan
polos, semuanya terbukti dari vantage yang diizinkan) tetapi **tidak** mengembalikan provider di
produksi — itu keputusan operator (tier berbayar `api.opensubtitles.com`, atau andalkan
subdl/subtitlecat/yify). Yang penting: kegagalan kini **jujur** (`error — login gagal: HTTP 403;
anonim juga gagal (HTTP 403)`), bukan `ok` palsu.

#### Dua bug yang membuat perbaikan tidak sampai ke produksi

1. **Jalur pencarian produksi adalah `middleware.js`, bukan `functions/api/[[path]].js`.**
   Kedua berkas melayani tabel rute yang identik (33 rute), tetapi middleware Edge-lah yang
   menangani `/api/*` (§2.1 sudah membuktikan runtime middleware yang dipakai). Perbaikan F6
   pertama hanya masuk ke fungsi dan **tidak berpengaruh**; kini keduanya diperbaiki.
2. **`append_to_response=external_ids` tidak pernah diminta pada jalur unduhan.**
   `middleware.js:229` dan `functions/api/[[path]].js:93` membaca `tmdbData.external_ids?.imdb_id`,
   padahal tanpa `append_to_response` TMDB tidak mengembalikan `external_ids` sama sekali —
   jadi pembacaan itu **dead code** dan `options.imdbId` tetap kosong pada jalur unduhan.
   Keduanya kini meminta `external_ids`.

**Bukti YIFY dari vantage residensial:** `movie-imdb/tt1375666` → HTTP 200, 980 KB, tautan
`/subtitles/inception-2010-*-yify-*` cocok pola kode (sebelumnya §3.2 hanya berspekulasi).
SubtitleCat: `index.php?search=Inception` → HTTP 200, 67 KB, `subs/1655/Inception.2010...html`
cocok. Ketiganya sehat dari IP residensial; yang menghambat YIFY/SubtitleCat di produksi murni
kunci pencarian yang hilang (imdb_id/title), bukan markup.

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
| Pantau kuota OS.com | **Sebagian** — `osComLogin` sudah membaca `user.allowed_downloads`, angka kuota muncul di diagnostics search (`kuota unduhan tersisa N`), dan penolakan unduhan (406/429) dicatat ke error log admin (`type: 'quota'`). Rotasi akun / `apiKey` berbayar tetap **belum**. |
| Skor berbobot ala hijitv | **Selesai** — `searchSubtitlesFromProviders` kini mengurutkan lewat `rankSubtitles`/`computeScore` (title + year + language match + provider pilihan + downloadCount), menggantikan sort downloadCount mentah. `title`/`year` dikirim detail page → `api.searchSubtitles` → handler (`middleware.js` + `functions/api/[[path]].js`). |
| Preferensi sumber per judul | **Selesai** — `preferredProviderFor` membaca `subtitles/metadata.json` (sumber terakhir untuk judul+musim+episode+bahasa yang sama) dan memberi boost `preferred_source` (+25). Setara `active_*.txt` hijitv; tidak ada state klien. |
| Provider yang selalu 0 hasil (§3.2) | **Sebagian, dengan koreksi** — SubtitleCat **selesai** (live: `ok n=1 — judul dari klien`); YIFY **selesai secara kode** (`imdb_id` kini di-resolve di jalur produksi `middleware.js` + `functions/api/[[path]].js`, plus `append_to_response=external_ids` yang selama ini hilang); OS.org **bukan bug yang bisa ditambal** — API XML-RPC-nya resmi dimatikan dan diblokir dari edge Vercel (lihat §3.2 "OS.org: API resmi dimatikan"); kegagalannya kini dilaporkan jujur. Sisa keputusan operator: pindah ke `api.opensubtitles.com` berbayar atau andalkan provider lain. |


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

### Sesi 2026-10-01 (kedua): diagnostics, skor berbobot, kuota

- Test: **102/102 lulus** di 9 berkas (tes modal strip "Provider bermasalah" +
  2 tes regresi SubtitleCat, lihat di bawah).
- Build: `vite build` sukses (`SubtitleSearchModal-DiOpe2jt.js`, 15.38 kB).
- Lint: **72 masalah (66 error, 6 warning)** — identik dengan baseline `HEAD`
  (`git stash` + `npx eslint .` menghasilkan angka yang sama). **0 temuan baru.**
  3 error sisa di `subtitle.js` (`dateOnly`, escape `\/`, `catch {}`) sudah ada di
  `HEAD`.
- Smoke throwaway (jaringan di-stub, `subtitle.js` asli):
  - Diagnostics per provider: `subdl ok(3)`, `opensubtitles_com ok(2) kuota unduhan
    tersisa 20`, sisanya `skipped` dengan alasan eksplisit.
  - Urutan hasil: baris `id` + judul cocok + tahun cocok mengalahkan baris `en`
    ber-downloadCount lebih besar; baris tak terkait (9999 unduhan) jatuh ke bawah.
  - `preferredProviderFor`: dengan metadata menunjuk `subdl`, baris Subdl `id`
    (5 unduhan) naik di atas OS.com `id` (30 unduhan) — boost +25 mengalahkan
    bonus downloadCount.
  - Jalur unduh: 406 OS.com ("allowed 20 subtitles for 24h") tetap dilempar ke
    pemanggil **dan** tercatat di `subtitles/error-log.json` sebagai
    `{type:'quota', provider, lang, message}`.
  - Row API bersih: `score`/`matches` tidak bocor ke `results`.
- Yang **belum**: provider yang selalu 0 hasil belum *diperbaiki*, hanya kini
  terlihat. Di produksi OS.org berhenti di tahap login — diagnostics live
  menunjukkan `error — login XML-RPC gagal (status bukan 200)`, jadi penyebabnya
  ada di `LogIn` XML-RPC (atau parse pada runtime), bukan di `SearchSubtitles`
  seperti dugaan awal. Pelacakan berikutnya: tangkap bodi/status sebenarnya dari
  `xmlRpcRequest` untuk membedakan HTTP non-200 vs parse token gagal. YIFY
  (`butuh imdb_id`) dan SubtitleCat kini menyebut alasannya; SubtitleCat butuh
  `TMDB_API_KEY` yang valid (lihat temuan bug di bawah).
- Catatan ruang lingkup: singgahan `?lang=` di modal membuat chip bahasa dan
  status provider tetap terlihat sinkron; tetapi bila `lang` diberikan, provider
  yang mendukungnya akan mengembalikan hasil terfilter — diagnostik `empty`
  harus dibaca bersama filter itu.

#### Verifikasi live pasca-deploy (commit `8b59e8e`)

- `/api/subtitles/search?type=movie&tmdb_id=27205&lang=id&title=Inception&year=2010`
  kini mengembalikan key `diagnostics`; `total` 25 hasil, urutan ber-`id` di depan
  tanpa `score`/`matches` bocor.
- Diagnostics live: `opensubtitles_com ok n=15 — kuota unduhan tersisa 20`,
  `subdl ok n=10`, `opensubtitles_org error — login XML-RPC gagal (status bukan 200)`,
  `yify skipped — butuh imdb_id`.
- **Bug ditemukan & diperbaiki sesi ini**: blok SubtitleCat membaca `res.json()`
  dua kali (`.title || .name`), padahal body Response hanya bisa dibaca sekali.
  Untuk payload TV (hanya `name`) baca kedua melempar `body already read` →
  SubtitleCat selalu `error` untuk TV. Diperbaiki jadi satu baca + pesan yang
  membawa HTTP status sebenarnya (`TMDB menolak lookup (HTTP 401)` bila kunci
  TMDB tidak valid — kondisi yang diamati di produksi lokal, key `.env.local`
  berbentuk placeholder).
- Regresi dikunci 2 tes baru di `tests/subtitle-providers.test.js`: status TMDB
  401 di-report apa adanya, dan payload TV `name`-saja menyelesaikan lookup tanpa
  baca ganda. Keduanya **gagal di kode lama** (modul `subtitle.js` distash →
  2 gagal) dan lulus setelah perbaikan.
- Setelah perbaikan: **102/102 test lulus**, `vite build` sukses, eslint **71
  masalah** (baseline 72, tidak ada temuan baru), `tsc` 42 = baseline.
### Sesi 2026-10-01 (ketiga): OS.org, YIFY, SubtitleCat diperbaiki

- **Diagnosa live (curl dari mesin ini, UA identik kode):**
  - `LogIn` dengan kredensial salah → `401 Unauthorized`, **token tetap terbit**.
  - `LogIn ['','','en']` (anonim) → `200 OK` + token.
  - `SearchSubtitles` kunci `query=Inception` + `movieyear=2010` → 3 baris.
  - `SubDownloadLink` apa adanya (rute `src-api`) → 104 byte iklan VIP; rute polos
    → 200, gzip 34.468 byte, 1192 cue, `alreadyVtt=false`.
  - Rute polos + `/subformat-vtt/` → **HTTP 500** (2 percobaan).
- **Smoke E2E lewat modul asli** (`searchSubtitlesFromProviders` + rute unduhan):
  `opensubtitles_org ok (10 hasil)`, unduhan 200 → 34 KB gzip → 1192 cue, format
  dideteksi SRT (bukan VTT).
- **Smoke handler route asli** (fetch di-stub, `functions/api/[[path]].js`):
  `/?type=movie&tmdb_id=27205&lang=id` (tanpa `imdb_id`) → lookup TMDB
  `append_to_response=external_ids` sekali, OS.org mencari `imdbid tt1375666`,
  `yify` **tidak lagi** `skipped`, `subtitlecat ok — judul dari klien`.
  Dengan `imdb_id` dari klien → **0** lookup TMDB (tanpa biaya tambahan).
- **Tes regresi baru** `tests/subtitle-osorg.test.js` (8 tes): parser XML-RPC,
  fallback anonim saat kredensial ditolak, jalur tanpa kredensial, rute unduhan
  polos + inflate. Semuanya **gagal di `3c6c43d`** (8/8) dengan gejala produksi
  persis (`error`→`ok`, `skipped`→`ok`, `null`→objek hasil), lulus setelah
  perbaikan. Tes berkas polos memakai fixture SRT sehingga konversi SRT→VTT ikut
  terbukti; stub memodelkan 500 pada `subformat-vtt`.
- **Gate:** **110/110 tes lulus** (10 berkas), `vite build` sukses, eslint
  **72 masalah = baseline** (tidak ada temuan baru), `tsc` **42 = baseline**.
  Tiga temuan eslint `no-undef`/`unused` yang sempat muncul dari `Buffer` di tes
  dihilangkan dengan beralih ke `gzipSync` + `TextEncoder`.

### Sesi 2026-10-01 (keempat): middleware, external_ids, dan status OS.org

- **Verifikasi live pasca-deploy sesi ketiga** (`5705e39`):
  `opensubtitles_com ok n=15`, `opensubtitles_org error — login gagal: HTTP 403; anonim juga
  gagal (HTTP 403)`, `subdl ok n=10`, `yify skipped — butuh imdb_id`, `subtitlecat ok n=1 —
  judul dari klien`, `total: 26` (naik dari 25). **SubtitleCat pulih di produksi.** OS.org
  tidak, dan bukan karena kode.
- **Diagnosa OS.org:** anonim `LogIn` → 200 + token dari mesin ini (curl, undici, semua UA),
  tetapi 403 dari produksi; proxy pusat data ke origin → 522/403. Forum resmi:
  `OpenSubtitles.org API - Final Shutdown Notice` (29 Jan 2026) — API XML-RPC dimatikan untuk
  semua aplikasi pihak ketiga. Kesimpulan: hanya hidup dari IP residensial, akan mati total;
  perbaikan parser/anon/unduhan tetap benar tetapi bukan jalur pemulihan produksi.
- **Dua bug yang menghalangi perbaikan sampai ke produksi:**
  `middleware.js` adalah jalur `/api/*` yang sebenarnya (kedua berkas punya 33 rute identik;
  §2.1 membuktikan runtime middleware) sehingga edit F6 di fungsi saja tidak berpengaruh; dan
  `tmdbData.external_ids?.imdb_id` dibaca **tanpa** pernah meminta `append_to_response`
  (middleware `:229`, fungsi `:93`) sehingga selalu `undefined` — dead code.
- **Perbaikan:** F6 diterapkan di kedua berkas; `append_to_response=external_ids` ditambahkan
  pada jalur unduhan kedua berkas; `opts.title` tidak lagi menimpa judul dari klien.
- **Tes baru** `tests/middleware-subtitle.test.js` (3 tes) mengimpor middleware asli dan
  membuktikan: resolve `imdb_id` → YIFY dicari dengan `tt1375666`; 0 panggilan TMDB bila klien
  mengirim `imdb_id`; judul dari klien bertahan saat TMDB mati. Satu tes **gagal di middleware
  pra-perbaikan** (`HEAD`), lulus setelahnya.
- **Bukti vantage residensial:** YIFY `movie-imdb/tt1375666` → 200 / 980 KB / tautan
  `inception-2010-*-yify-*` cocok; SubtitleCat `?search=Inception` → 200 / 67 KB /
  `subs/1655/Inception.2010...html` cocok.
