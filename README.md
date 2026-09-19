# Prajwal Shinde personal site

Standalone React/Vite source for Prajwal Shinde's approved personal site. It preserves the approved copy, routes, avatar, visual treatment and destinations without private packages or services.

## Local development

```bash
npm ci
npm run dev
```

## Production build

```bash
npm ci
npm run build
npm run preview -- --host 127.0.0.1
```

The production output is written to `dist/`. Netlify uses `npm run build` and publishes `dist`.

## Routes

- `/`
- `/projects`
- `/notes`
- `/notes/anomaly-detection`
- `/notes/useful-ai-projects`
- `/about`

SPA fallback rules are included in both `netlify.toml` and `public/_redirects` so direct route visits work on Netlify.

## Optional browser verification

With the preview server running:

```bash
npm run test:site
```

This checks all routes at desktop and 390px mobile, internal navigation, required external/contact links, browser errors and horizontal overflow.
