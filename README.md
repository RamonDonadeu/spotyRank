# spotyRank

Rank songs, albums, or artists from Spotify using a fast **quaternary (4-way) placement** flow instead of pairwise binary search.

## Develop

```bash
npm install
npm run dev
```

The dev server uses **HTTP on port 5173**. Spotify allows `http://` redirect URIs for `localhost` and `127.0.0.1` — see [Local development login](#local-development-login).

### Docker (development)

```bash
cp .env.example .env   # optional; edit Spotify vars
docker compose run --rm dev npm ci   # first time only
docker compose up
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) or [http://localhost:5173](http://localhost:5173) (use the same host as in `.env`). See [Local development login](#local-development-login).

`CHOKIDAR_USEPOLLING` is enabled in compose for reliable file watching on bind mounts.

### Local development login

1. Copy env: `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`)
2. In your [Spotify app](https://developer.spotify.com/dashboard) **Settings → Redirect URIs**, add **exact** callback URLs (path must be `/login/callback`):

   | Redirect URI (register in dashboard) | Use when browsing |
   |--------------------------------------|-------------------|
   | `http://127.0.0.1:5173/login/callback` | `http://127.0.0.1:5173` |
   | `http://localhost:5173/login/callback` | `http://localhost:5173` |

   Set `VITE_SPOTIFY_REDIRECT_URI` in `.env` to the **same** URI you use in the address bar. `localhost` and `127.0.0.1` are different hosts — pick one consistently, or register both URIs in Spotify if you switch.

3. After changing `.env`: `docker compose down && docker compose up` (Vite reads `VITE_*` at startup).

4. **Without OAuth** (ranking UI only): set `VITE_SPOTIFY_MOCK=true` in `.env`, restart compose, then use **Continue without Spotify (dev)** on the home page.

**Production** (e.g. `https://spotyrank.radoca.xyz`): use `https://spotyrank.radoca.xyz/login/callback` in both the dashboard and production build args — not in `.env` while running `docker compose up` on port 5173.

### Troubleshooting login

- **Redirect URI must match exactly** — same scheme, host (`127.0.0.1` vs `localhost`), port, and path (`/login/callback`) in the Spotify dashboard, `.env` `VITE_SPOTIFY_REDIRECT_URI`, and your browser address bar.
- After a successful login you should land on **`/rank`** with a “Login successful” banner.
- If login loops or search stays disabled, open DevTools → Application → **Session storage** for your origin and remove `spotify_access_token`, `spotify_pkce_verifier`, and `spotify_oauth_handled_code`, then connect again.
- After changing `.env`: `docker compose down && docker compose up` (Vite reads `VITE_*` only at startup).
- In development, open the browser console and filter for `[spotifyAuth]` to see PKCE and token-exchange steps.

## Internationalization (i18n)

The UI supports **English**, **Spanish**, **French**, **German**, and **Italian** via [react-i18next](https://react.i18next.com/).

- Locale files: `src/i18n/locales/{en,es,fr,de,it}.json` (keys grouped by section: `home`, `rank`, `auth`, `common`, `library`, `compare`).
- Language is detected from the browser on first visit, with fallback `en`, and persisted in `localStorage` under `spotyrank-lang`.
- Use `useTranslation()` and `t('section.key')` in components; add matching keys to every locale file when introducing new copy.

## Scripts

- `npm run dev` — Vite dev server (HTTP on port 5173)
- `npm test` — Vitest unit tests (ranking placement)
- `npm run build` — Production build

## Ranking prototype

Open `/rank` to try mock tracks: select songs, start ranking, and place each into your list with 4-way narrowing (~⌈log₄(n)⌉ steps per insertion).

Spotify OAuth and search are placeholders. See `docs/ARCHITECTURE.md`.

## Docker (production)

Vite inlines `VITE_*` variables at **build time** (not at container runtime). Set them as Docker **build args** when building the image.

| Build arg | Purpose |
|-----------|---------|
| `VITE_SPOTIFY_CLIENT_ID` | Spotify app client ID |
| `VITE_SPOTIFY_REDIRECT_URI` | OAuth callback URL (must match Spotify dashboard) |
| `VITE_SPOTIFY_MOCK` | Optional; set to `true` to use mock API |

### Build and run locally

```bash
docker build \
  --build-arg VITE_SPOTIFY_CLIENT_ID=your_client_id \
  --build-arg VITE_SPOTIFY_REDIRECT_URI=https://your-domain.example/login/callback \
  --build-arg VITE_SPOTIFY_MOCK=false \
  -t spotyrank .

docker run --rm -p 8080:8080 spotyrank
```

Or with compose (reads `VITE_*` from a `.env` file in the project root):

```bash
docker compose -f docker-compose.prod.yml up --build
```

The image serves the SPA with nginx on **port 8080** (unprivileged user). Map host port `8080` → container `8080`.

### Dockploy

1. **Build type**: Dockerfile at repo root (`Dockerfile`).
2. **Build arguments** (required for a working Spotify app in production):

   - `VITE_SPOTIFY_CLIENT_ID`
   - `VITE_SPOTIFY_REDIRECT_URI` — must be the **public HTTPS** callback, e.g. `https://rank.example.com/login/callback`, and must be listed under Redirect URIs in the Spotify developer dashboard.
   - `VITE_SPOTIFY_MOCK` — optional (`true` / `false`).

   Do not rely on runtime env vars for `VITE_*`; they are already compiled into the static assets during `npm run build`.

3. **Container port**: `8080` (nginx listens on 8080 inside the image).
4. **Publish**: map your public HTTPS port (443 via reverse proxy) to container `8080`.
5. **Health check** (optional): HTTP GET `http://<container>:8080/` — expect `200` (SPA `index.html`).

No server-side secrets belong in the image; only public SPA config via `VITE_*` build args.
