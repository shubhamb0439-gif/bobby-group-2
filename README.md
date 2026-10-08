# Bobby Group — scroll journey site (Next.js)

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

Deploys to Vercel as-is.

## Structure
- `app/` — layout (fonts via `next/font`), page, `globals.css` (design tokens at the top)
- `components/` — `Nav`, `Hero`, `Journey` (canvas stage), `Footer`, `SmoothScroll` (Lenis)
- `lib/journey/config.js` — **edit this**: scene captions, order, scroll length, transitions, frame sequences
- `lib/journey/scenes.js` — rendered scenes (lift → haul → sail → fly) and transitions
- `lib/journey/vehicles.js` — truck, airliner and container ship (pre-rendered sprites + live wheels/lights)
- `lib/journey/textures.js` — procedural textures (weathered containers, asphalt, concrete, clouds, grain)
- `lib/journey/engine.js` — scroll engine (pinning, smoothing, captions, rail, post-processing)
- `_legacy/` — the original static HTML version, kept for reference (safe to delete)

## Using your own image sequences
Put frames in `public/`, e.g. `public/frames/lift/frame_000.webp … frame_119.webp`, then in `lib/journey/config.js` set:

```js
frames: { dir: "/frames/lift/", prefix: "frame_", pad: 3, ext: ".webp", count: 120 }
```

That scene then plays your frames instead of the rendered animation. Only use frames you own or have permission to use.

## Adding content
Replace the `#about` placeholder section in `app/page.jsx` with the next sections.
