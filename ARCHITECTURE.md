# spotyRank — architecture notes

## Ranking algorithm (planned)

The intended UX compares a new song against the **middle** of the current sorted list and uses **binary search** to find its insert position. That is **binary insertion sort**: each insertion costs O(log n) comparisons, ~O(n log n) comparisons overall for a full ranking.

### Pros

- Minimizes comparisons when the user gives a consistent total order (A > B and B > C implies A > C).
- Simple mental model: one song at a time, always against the current ranking.
- Easy to persist partial progress (sorted list + queue of unranked tracks).

### Cons

- Pairwise comparisons grow quickly; a 100-song album can require hundreds of decisions.
- Inconsistent comparisons (user fatigue) can produce cycles; the UI may need undo or “re-compare” flows.
- Shifting elements in an array is O(n) per insert (fine for typical album sizes in the browser).

### UX recommendations

- Show a **warning** when the list exceeds a threshold (e.g. 50 songs) with estimated comparison count.
- Offer **subset ranking** (top N) or **tournament / merge** style brackets for large sets.
- Consider a **hard cap** on songs per session.

### Alternatives (brief)

| Approach | Idea |
|----------|------|
| Merge-sort tournament | Pairwise rounds, fewer “global” inserts, good for brackets |
| Partial ranking | Stop when confidence is enough; not a full total order |
| Max list size | Cap N and rank only selected tracks |

Implementation is deferred until the app UI phase.

## Spotify integration (planned)

- SPA with PKCE; env vars `VITE_SPOTIFY_CLIENT_ID` and redirect URI.
- API layer in `src/services/spotifyApi.ts` with typed responses under `src/services/apiTypes/`.

## Releases

Versions and `CHANGELOG.md` are managed by **semantic-release** on push to `main`/`master`. Commits must follow [Conventional Commits](https://www.conventionalcommits.org/).
