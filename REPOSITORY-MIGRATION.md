# Safe repository replacement manifest

Target repository: `prajwal912w/minimilist_blog`

This package is intended to replace the repository contents, not be copied on top of the inherited site. Review the deletion list before committing. This manifest does not perform any deletion or deployment.

## Back up and replace

1. Create a backup branch or tag from the current default branch.
2. In a clean working tree, remove the existing tracked site files.
3. Copy the complete contents of this package into the repository root, including dotfiles.
4. Run `npm ci`, `npm run build`, then preview and inspect every route.
5. Review `git status` and the diff. Confirm only intended files remain before committing.
6. Deploy a preview on Netlify before changing production visibility or domains.

## Old content that must not survive the replacement

Confirm the final tree contains none of these inherited paths or equivalents:

- `.github/workflows/`
- `_posts/`, `_data/`, `_site/`
- `talks/`, `talks.markdown`
- `netlify/`
- old Jekyll layouts/includes and generated assets
- `llms.txt`, old `robots.txt`, `.DS_Store`
- old analytics, GitHub Pages deployment files, payment/access functions, scraper gates or edge functions

Search the final repository for inherited names, domains, email addresses, analytics IDs, payment terms and third-party claims before committing. Do not remove or modify repository settings, secrets, custom domains, Netlify environment variables or production visibility as part of the file replacement unless they are separately reviewed.

## Expected new files

- `src/App.tsx` - approved routes and copy
- `src/components.tsx` - local standalone presentation components
- `src/base.css` and `src/style.css` - approved visual system and page styling
- `src/assets/prajwal-pixel-avatar.jpg` - approved avatar
- `src/assets/fonts/` - locally bundled fonts
- `src/main.tsx` - React entrypoint
- `index.html`, `package.json`, `package-lock.json`
- `vite.config.ts`, `tsconfig*.json`
- `netlify.toml`, `public/_redirects`
- `scripts/verify-site.mjs`

## Netlify

Build command: `npm run build`

Publish directory: `dist`

The included SPA rewrite serves `index.html` for direct visits to every route. No functions, edge functions, payment code, access tokens or deployment automation are included.

## Verification gate

Before deploying production:

- `npm ci` and `npm run build` pass from a clean checkout.
- Every listed route loads directly and through navigation.
- GitHub, project, LinkedIn, X and email destinations match the approved source.
- Desktop and 390px mobile pixels are inspected.
- The repository contains no inherited identity, claims, articles, secrets, analytics or unsafe automation.
- Netlify preview works before production visibility or domains are changed.
