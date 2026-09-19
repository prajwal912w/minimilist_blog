# Build verification

Verified on 19 September 2026 from a clean copy of this repository package.

Commands:

```bash
npm ci
npm run build
npm run preview -- --host 127.0.0.1
npm run test:site
```

Result:

- TypeScript and Vite production build passed.
- 6 routes loaded directly at 1280px desktop and 390px mobile.
- Header, nav, note navigation, required external/contact destinations, browser errors and horizontal overflow checks passed.
- Full-page screenshots for every route were visually inspected at both sizes. Text was readable, the avatar loaded, nav wrapping was intentional, and no clipping or broken layout was found.
- A scan found no dependency or reference to `@instinct/files`, private preview hosting, inherited identity, payment functions or edge functions.

Build output is `dist/`. Generated output and dependencies are intentionally excluded from the ZIP; Netlify installs from `package-lock.json` and builds them.
