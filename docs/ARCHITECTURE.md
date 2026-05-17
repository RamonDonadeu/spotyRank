# spotyRank architecture

## Ranking policy

- **No soft cap** on how many songs a user may rank.
- For large selections (UI threshold: 25+), show an **informational** warning that ranking takes longer. Never block or limit the list.

## Binary pairwise placement

When inserting a new track into a partially sorted list, the user sees **two songs at a time** (candidate vs reference) and picks the one they prefer. That choice drives a **binary search** over insertion indices.

1. Maintain an insertion-index range `[low, high)` (exclusive upper bound). Valid indices are `0 … sorted.length`.
2. If `high - low <= 1`, placement is done; insert at index `low`.
3. Otherwise pick a **pivot insertion index** (left-biased midpoint in the range) and show `sorted[referenceIndex]` as the reference track, where `referenceIndex = min(pivot, sorted.length - 1)`.
4. User prefers **candidate** → narrow to `[low, pivot)`; prefers **reference** → narrow to `[pivot + 1, high)`.
5. Repeat until the range has one slot.

### Complexity

- Per insertion: about **⌈log₂(n)⌉** pairwise comparisons (one reference per step).
- Full ranking: one insertion per track → **O(n log n)** comparisons asymptotically.

### UX components

- `SongCompareCard` — large album art, title, artist; tap to choose.
- `BinaryPlacementView` — two cards side by side (stacked on mobile), “Which do you prefer?” prompt.

### Edge cases

| Case | Behavior |
|------|----------|
| First track | Auto-placed at index 0; no question |
| Short sorted lists | Same binary flow; reference clamps to last track when pivot is past the end |
| Duplicate track IDs | Rejected when starting a session (`hasDuplicateIds`) |

### Core modules

- `src/helpers/ranking/placement.ts` — range helpers, `insertAt`, `hasDuplicateIds`
- `src/helpers/ranking/binaryPlacement.ts` — `getNextBinaryQuestion`, `applyBinaryChoice`, `estimateBinaryPlacementRounds`
- `src/helpers/ranking/useRankingSession.ts` — React state: pool → one-by-one insertion
- `src/helpers/ranking/placement.test.ts` — Vitest coverage for empty, 1, 2, odd/even lists, start/middle/end

### Deprecated

The earlier **quaternary (4-bucket)** placement UI and helpers were removed from the product. Do not reintroduce multi-bucket “where should this go?” flows without an explicit product decision.

## App structure (prototype)

- `/` — Home, explains the product
- `/rank` — Rank flow with mock tracks and pairwise comparison UI
- `/login`, `/login/callback` — Spotify OAuth placeholders

## Spotify integration (not yet implemented)

- Env: `VITE_SPOTIFY_CLIENT_ID`, redirect URI
- Search → select tracks → pass `Track[]` into `useRankingSession`
- Token storage and API client in `src/services/` (to be added)
