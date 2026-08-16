/**
 * Gate blog posts for AI/agent scrapers.
 * - Humans (browser navigations) and Google/Bing: allowed
 * - Paid agents: Authorization Bearer token or ?access_token=
 * - Everyone else on /20xx/ post URLs: HTTP 402 + payment instructions
 */
import type { Config, Context } from "https://edge.netlify.com"

const PAY_TO = "0x8873cD8D93D6FDee9d21F699723C90eeC783747e"
const DEFAULT_SECRET = "dheeraj-work-netlify-ai-access-hmac-v1"

const OPEN_PREFIXES = [
  "/llms.txt",
  "/robots.txt",
  "/sitemap.xml",
  "/feed.xml",
  "/api/",
  "/about",
  "/talks",
  "/projects",
  "/assets/",
  "/css/",
  "/images/",
]

function b64urlToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/")
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

async function hmacValid(body: string, sig: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const expected = bytesToB64url(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
  )
  return expected === sig
}

async function tokenOk(token: string | null, secret: string) {
  if (!token || !token.includes(".")) return false
  const [body, sig] = token.split(".")
  if (!(await hmacValid(body, sig, secret))) return false
  try {
    const json = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)))
    return typeof json.exp === "number" && json.exp >= Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

function isPostPath(pathname: string) {
  return /^\/20\d{2}\/\d{2}\/\d{2}\//.test(pathname)
}

function isOpenPath(pathname: string) {
  if (pathname === "/" || pathname === "/index.html") return true
  return OPEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p) || pathname.startsWith(p + "/")
  )
}

function isSearchBot(ua: string) {
  return /googlebot|bingbot|google-inspectiontool|duckduckbot|applebot(?!-extended)/i.test(
    ua
  )
}

function isBrowserNavigation(req: Request) {
  const mode = req.headers.get("sec-fetch-mode") || ""
  const dest = req.headers.get("sec-fetch-dest") || ""
  const ua = req.headers.get("user-agent") || ""
  // Top-level document navigations from real browsers
  if ((mode === "navigate" || dest === "document") && /mozilla/i.test(ua)) {
    return true
  }
  return false
}

function paymentRequiredResponse(req: Request) {
  const wantsHtml = (req.headers.get("accept") || "").includes("text/html")
  const bodyObj = {
    ok: false,
    paymentRequired: true,
    status: 402,
    message:
      "AI/agent access to post HTML requires a verified 0.01 USDC payment on Base.",
    terms: "https://dheeraj-work.netlify.app/llms.txt",
    pay: {
      amount: "0.01 USDC",
      network: "Base",
      payTo: PAY_TO,
      token: "USDC",
    },
    next: [
      "1. Send 0.01 USDC on Base to the payTo address",
      "2. POST /api/verify-payment with { \"txHash\": \"0x...\" }",
      "3. Retry this URL with Authorization: Bearer <accessToken>",
      "   or ?access_token=<accessToken>",
      "4. Or GET /api/content?path=<this-path> with the Bearer token",
    ],
  }

  if (wantsHtml) {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>402 Payment Required</title>
  <meta name="robots" content="noindex"/>
  <style>
    body{font-family:system-ui,sans-serif;max-width:42rem;margin:3rem auto;padding:0 1rem;line-height:1.5}
    code,pre{background:#f4f4f4;padding:.15rem .35rem;border-radius:4px}
    pre{padding:1rem;overflow:auto}
  </style>
</head>
<body>
  <h1>402 — Payment required for agent access</h1>
  <p>Humans browsing in a normal browser can still read posts. Automated AI scrapers need to pay <strong>0.01 USDC on Base</strong> first.</p>
  <ol>
    <li>Read <a href="/llms.txt">/llms.txt</a></li>
    <li>Pay <code>0.01 USDC</code> on Base to <code>${PAY_TO}</code></li>
    <li><code>POST /api/verify-payment</code> with your tx hash</li>
    <li>Retry with <code>Authorization: Bearer &lt;accessToken&gt;</code></li>
  </ol>
  <pre>${JSON.stringify(bodyObj, null, 2)}</pre>
</body>
</html>`
    return new Response(html, {
      status: 402,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  }

  return new Response(JSON.stringify(bodyObj, null, 2), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  })
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url)
  const pathname = url.pathname
  const secret = Deno.env.get("ACCESS_TOKEN_SECRET") || DEFAULT_SECRET
  const bypass = req.headers.get("x-ai-access-bypass")

  // Internal content API fetch
  if (bypass && bypass === secret) {
    return context.next()
  }

  if (!isPostPath(pathname) || isOpenPath(pathname)) {
    return context.next()
  }

  const ua = req.headers.get("user-agent") || ""
  const auth = req.headers.get("authorization") || ""
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null
  const queryToken = url.searchParams.get("access_token") || url.searchParams.get("token")
  const token = bearer || queryToken

  if (await tokenOk(token, secret)) {
    return context.next()
  }
  if (isSearchBot(ua)) {
    return context.next()
  }
  if (isBrowserNavigation(req)) {
    return context.next()
  }

  // AI bots, curl, agent fetchers, headless scrapers without token
  return paymentRequiredResponse(req)
}

export const config: Config = {
  path: "/*",
}
