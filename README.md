# Personal site

My personal website. React, TypeScript and Vite, deployed on Netlify.

Live: https://prajwal-work.netlify.app

## Run it locally

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
```

Netlify runs `npm run build` and serves `dist`. `netlify.toml` and `public/_redirects` handle the SPA fallback so direct links to any route don't 404.

## Pages

- Home
- Projects
- Notes
- About

## Checking the site

Start a preview server first:

```bash
npm run preview -- --host 127.0.0.1
npm run test:site
```

It opens every page in headless Chrome at desktop and mobile widths and checks the navigation, links and layout.
