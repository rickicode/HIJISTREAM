# AGENTS.md — HIJISTREAM Project Rules

## Quick Code Context dengan Semble

Gunakan `semble search` untuk mencari konteks codebase dengan cepat, terutama ketika butuh:
- "Di mana implementasi fitur X?"
- "Cari pola kode yang mirip dengan Y"
- "Bagaimana cara kerja komponen Z?"

### Cara Pakai

```bash
# Cari dengan natural language (default: hybrid mode)
semble search "data fetching pattern with caching"

# Cari kode spesifik
semble search "ContentCard focus animation" 

# Batasi jumlah hasil
semble search "API endpoint trending movies" -k 3

# Cari file non-code juga (markdown, yaml, json)
semble search "TDD architecture" --include-text-files

# Cari di subdirectory tertentu
semble search "player progress save" apps/tv/src

# Mode semantic — lebih akurat untuk konsep abstrak
semble search "TV remote focus management" -m semantic

# Mode BM25 — keyword exact matching
semble search "useEffect loadData" -m bm25
```

### Preferred Routing

Untuk eksplorasi codebase:
1. **Semble** — default untuk semantic search cepat
2. **grep/rg** — exhaustive literal/regex matching
3. **find/ls** — file discovery

### Build TV APK

```bash
./scripts/build-tv-apk.sh              # arm32 (armeabi-v7a)
./scripts/build-tv-apk.sh --arm64      # arm64 (arm64-v8a)
./scripts/build-tv-apk.sh --all        # universal
VERSION=1.0.1 ./scripts/build-tv-apk.sh --arm64
INSTALL=1 TV_DEVICE=192.168.x.x:5555 ./scripts/build-tv-apk.sh --arm64
```
