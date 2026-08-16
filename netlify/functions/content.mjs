// GET /api/content?path=/2026/06/08/Understanding-x402-Agent-Payments-on-Chain.html
// Requires Authorization: Bearer <accessToken> from /api/verify-payment

import { extractBearer, verifyAccessToken } from "./token-lib.mjs"

const SITE = process.env.URL || process.env.DEPLOY_PRIME_URL || "https://dheeraj-work.netlify.app"
const BYPASS = process.env.ACCESS_TOKEN_SECRET || "dheeraj-work-netlify-ai-access-hmac-v1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }
}

function normalizePath(path) {
  if (!path || typeof path !== "string") return null
  let p = path.trim()
  if (p.startsWith("http")) {
    try {
      p = new URL(p).pathname
    } catch {
      return null
    }
  }
  if (!p.startsWith("/")) p = `/${p}`
  // Only allow blog post paths
  if (!/^\/20\d{2}\/\d{2}\/\d{2}\/.+\.html?$/.test(p)) return null
  return p
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" }
  }
  if (event.httpMethod !== "GET") {
    return json(405, { ok: false, error: "Use GET with ?path=/YYYY/MM/DD/slug.html" })
  }

  const token = extractBearer(event)
  const checked = verifyAccessToken(token)
  if (!checked.ok) {
    return json(402, {
      ok: false,
      error: checked.error,
      paymentRequired: true,
      pay: {
        amount: "0.01 USDC",
        network: "Base",
        payTo: "0x8873cD8D93D6FDee9d21F699723C90eeC783747e",
        verify: "POST /api/verify-payment",
        terms: "https://dheeraj-work.netlify.app/llms.txt",
      },
    })
  }

  const path = normalizePath(
    event.queryStringParameters?.path || event.queryStringParameters?.url
  )
  if (!path) {
    return json(400, {
      ok: false,
      error:
        "Provide path like /2026/06/08/Understanding-x402-Agent-Payments-on-Chain.html",
    })
  }

  try {
    const res = await fetch(`${SITE.replace(/\/$/, "")}${path}`, {
      headers: {
        "X-AI-Access-Bypass": BYPASS,
        Accept: "text/html",
      },
    })
    if (!res.ok) {
      return json(res.status, {
        ok: false,
        error: `Upstream content fetch failed (${res.status}).`,
        path,
      })
    }
    const html = await res.text()
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
      body: html,
    }
  } catch (err) {
    return json(502, {
      ok: false,
      error: err.message || "Failed to fetch content.",
      path,
    })
  }
}
