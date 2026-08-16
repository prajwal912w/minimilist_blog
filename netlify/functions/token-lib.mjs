// Shared AI access token helpers (Node Netlify Functions).
import crypto from "node:crypto"

export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export function accessSecret() {
  return (
    process.env.ACCESS_TOKEN_SECRET ||
    "dheeraj-work-netlify-ai-access-hmac-v1"
  )
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

export function mintAccessToken({ txHash, from }) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  const payload = {
    v: 1,
    exp,
    txHash,
    from: from || null,
  }
  const body = b64url(JSON.stringify(payload))
  const sig = b64url(
    crypto.createHmac("sha256", accessSecret()).update(body).digest()
  )
  return { accessToken: `${body}.${sig}`, expiresAt: exp }
}

export function verifyAccessToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { ok: false, error: "Missing or malformed access token." }
  }
  const [body, sig] = token.split(".")
  const expected = b64url(
    crypto.createHmac("sha256", accessSecret()).update(body).digest()
  )
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "Invalid access token signature." }
  }
  let payload
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
  } catch {
    return { ok: false, error: "Invalid access token payload." }
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "Access token expired. Pay again and re-verify." }
  }
  return { ok: true, payload }
}

export function extractBearer(event) {
  const h =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  if (m) return m[1].trim()
  const q = event.queryStringParameters || {}
  return q.access_token || q.token || null
}
