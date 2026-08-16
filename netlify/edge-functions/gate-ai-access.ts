/**
 * Gate blog posts for AI/agent scrapers.
 * - Humans: tiny JS proof-of-work sets an HttpOnly cookie, then the post loads
 * - Google/Bing and link-preview bots: allowed
 * - Paid agents: Authorization Bearer token or ?access_token=
 * - Header-only "browser-shaped" fetchers (Cursor WebFetch, curl -A Chrome): HTTP 402
 */
import type { Config, Context } from "https://edge.netlify.com"

const PAY_TO = "0x8873cD8D93D6FDee9d21F699723C90eeC783747e"
const DEFAULT_SECRET = "dheeraj-work-netlify-ai-access-hmac-v1"
const COOKIE = "dw_reader"
const POW_ZEROS = "000"
const CHALLENGE_TTL_MS = 5 * 60 * 1000
const COOKIE_TTL_SEC = 7 * 24 * 60 * 60

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

function bytesToB64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

async function hmacSign(body: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  return bytesToB64url(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
  )
}

async function hmacValid(body: string, sig: string, secret: string) {
  return (await hmacSign(body, secret)) === sig
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  )
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
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

function cookieValue(req: Request, name: string) {
  const raw = req.headers.get("cookie") || ""
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=")
    if (k === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

async function readerCookieOk(req: Request, secret: string) {
  const token = cookieValue(req, COOKIE)
  if (!token || !token.includes(".")) return false
  const [body, sig] = token.split(".")
  if (!(await hmacValid(body, sig, secret))) return false
  const exp = Number(body)
  return Number.isFinite(exp) && exp >= Math.floor(Date.now() / 1000)
}

async function mintReaderCookie(secret: string) {
  const exp = Math.floor(Date.now() / 1000) + COOKIE_TTL_SEC
  const body = String(exp)
  const sig = await hmacSign(body, secret)
  return `${body}.${sig}`
}

function clientIp(req: Request, context: Context) {
  return (
    context.ip ||
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0"
  )
}

async function issueChallenge(secret: string, ip: string) {
  const exp = Date.now() + CHALLENGE_TTL_MS
  const salt = bytesToB64url(crypto.getRandomValues(new Uint8Array(16)))
  const ipHash = (await sha256Hex(ip)).slice(0, 16)
  const body = `${exp}.${salt}.${ipHash}`
  const sig = await hmacSign(body, secret)
  return `${body}.${sig}`
}

async function challengeOk(
  challenge: string,
  nonce: number,
  secret: string,
  ip: string
) {
  const parts = challenge.split(".")
  if (parts.length !== 4) return false
  const [exp, salt, ipHash, sig] = parts
  const body = `${exp}.${salt}.${ipHash}`
  if (!(await hmacValid(body, sig, secret))) return false
  if (Number(exp) < Date.now()) return false
  const expectedIp = (await sha256Hex(ip)).slice(0, 16)
  if (ipHash !== expectedIp) return false
  if (!Number.isInteger(nonce) || nonce < 0 || nonce > 5_000_000) return false
  const digest = await sha256Hex(`${challenge}:${nonce}`)
  return digest.startsWith(POW_ZEROS)
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

function isPreviewBot(ua: string) {
  return /twitterbot|slackbot|facebookexternalhit|linkedinbot|discordbot|whatsapp|telegrambot|pinterest|redditbot|iframely|embedly/i.test(
    ua
  )
}

function paymentBody() {
  return {
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
}

function json402() {
  return new Response(JSON.stringify(paymentBody(), null, 2), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  })
}

function challengePage(challenge: string) {
  const bodyObj = paymentBody()
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
  <p id="human-status">Loading…</p>
  <noscript>
    <h1>402 — Payment required for agent access</h1>
    <p>This browser did not run JavaScript, so it is treated as an automated client.</p>
    <p>Humans: enable JavaScript and reload. Agents: pay <strong>0.01 USDC on Base</strong> first.</p>
    <ol>
      <li>Read <a href="/llms.txt">/llms.txt</a></li>
      <li>Pay <code>0.01 USDC</code> on Base to <code>${PAY_TO}</code></li>
      <li><code>POST /api/verify-payment</code> with your tx hash</li>
      <li>Retry with <code>Authorization: Bearer &lt;accessToken&gt;</code></li>
    </ol>
    <pre>${JSON.stringify(bodyObj, null, 2)}</pre>
  </noscript>
  <script>
    (async () => {
      const challenge = ${JSON.stringify(challenge)};
      const zeros = ${JSON.stringify(POW_ZEROS)};
      const enc = new TextEncoder();
      const sha256hex = async (s) => {
        const buf = await crypto.subtle.digest("SHA-256", enc.encode(s));
        return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
      };
      let nonce = 0;
      while (true) {
        const digest = await sha256hex(challenge + ":" + nonce);
        if (digest.startsWith(zeros)) break;
        nonce++;
        if (nonce > 5000000) throw new Error("proof of work failed");
      }
      const res = await fetch("/api/reader-unlock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, nonce }),
      });
      if (!res.ok) throw new Error("unlock failed");
      location.reload();
    })().catch((err) => {
      const el = document.getElementById("human-status");
      el.innerHTML = "<h1>402 — Payment required for agent access</h1>"
        + "<p>Could not verify this browser. Agents should pay via <a href=\\"/llms.txt\\">/llms.txt</a>.</p>"
        + "<pre>" + String(err).replace(/</g, "") + "</pre>";
    });
  </script>
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

async function handleUnlock(req: Request, context: Context, secret: string) {
  if (req.method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": new URL(req.url).origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
      },
    })
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST required" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  const origin = req.headers.get("origin") || ""
  const expectedOrigin = new URL(req.url).origin
  if (origin && origin !== expectedOrigin) {
    return new Response(JSON.stringify({ ok: false, error: "Bad origin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  let body: { challenge?: string; nonce?: number }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const ip = clientIp(req, context)
  const nonce = Number(body.nonce)
  if (
    !body.challenge ||
    !(await challengeOk(body.challenge, nonce, secret, ip))
  ) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid or expired challenge" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const cookie = await mintReaderCookie(secret)
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Set-Cookie": `${COOKIE}=${cookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_TTL_SEC}`,
    },
  })
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url)
  const pathname = url.pathname
  const secret = Deno.env.get("ACCESS_TOKEN_SECRET") || DEFAULT_SECRET

  if (pathname === "/api/reader-unlock") {
    return handleUnlock(req, context, secret)
  }

  const bypass = req.headers.get("x-ai-access-bypass")
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
  if (isSearchBot(ua) || isPreviewBot(ua)) {
    return context.next()
  }
  if (await readerCookieOk(req, secret)) {
    return context.next()
  }

  const wantsHtml = (req.headers.get("accept") || "").includes("text/html")
  if (wantsHtml) {
    const challenge = await issueChallenge(secret, clientIp(req, context))
    return challengePage(challenge)
  }

  return json402()
}

export const config: Config = {
  path: "/*",
}
