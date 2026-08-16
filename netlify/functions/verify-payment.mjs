// POST /api/verify-payment
// Body: { "txHash": "0x..." } or { "txHash": "https://basescan.org/tx/0x..." }
// Verifies a Base USDC transfer of at least 0.01 USDC to the site wallet.

const PAY_TO = "0x8873cD8D93D6FDee9d21F699723C90eeC783747e".toLowerCase()
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase()
const MIN_AMOUNT_RAW = 10_000n // 0.01 USDC (6 decimals)
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
const RPC_URLS = [
  process.env.BASE_RPC_URL,
  "https://mainnet.base.org",
  "https://base.llamarpc.com",
].filter(Boolean)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  }
}

function normalizeTxHash(input) {
  if (!input || typeof input !== "string") return null
  const trimmed = input.trim()
  const fromUrl = trimmed.match(/\/tx\/(0x[a-fA-F0-9]{64})/)
  const hash = fromUrl ? fromUrl[1] : trimmed
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) return null
  return hash.toLowerCase()
}

function topicAddress(topic) {
  if (!topic || topic.length < 42) return null
  return `0x${topic.slice(-40)}`.toLowerCase()
}

function formatUsdc(raw) {
  const whole = raw / 1_000_000n
  const frac = (raw % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "")
  return frac ? `${whole}.${frac}` : whole.toString()
}

async function rpc(method, params) {
  let lastError
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params,
        }),
      })
      if (!res.ok) {
        lastError = new Error(`RPC HTTP ${res.status} from ${url}`)
        continue
      }
      const data = await res.json()
      if (data.error) {
        lastError = new Error(data.error.message || "RPC error")
        continue
      }
      return data.result
    } catch (err) {
      lastError = err
    }
  }
  throw lastError || new Error("All Base RPC endpoints failed")
}

function findQualifyingTransfer(receipt) {
  if (!receipt || !Array.isArray(receipt.logs)) return null

  for (const log of receipt.logs) {
    if ((log.address || "").toLowerCase() !== USDC_BASE) continue
    if (!log.topics || log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue

    const to = topicAddress(log.topics[2])
    if (to !== PAY_TO) continue

    const amount = BigInt(log.data || "0x0")
    if (amount < MIN_AMOUNT_RAW) continue

    return {
      from: topicAddress(log.topics[1]),
      to,
      amountRaw: amount.toString(),
      amountUsdc: formatUsdc(amount),
      logIndex: log.logIndex,
    }
  }
  return null
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" }
  }

  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      error: "Method not allowed. Use POST with JSON body { \"txHash\": \"0x...\" }.",
    })
  }

  let body
  try {
    body = JSON.parse(event.body || "{}")
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body." })
  }

  const txHash = normalizeTxHash(body.txHash || body.hash || body.tx)
  if (!txHash) {
    return json(400, {
      ok: false,
      error:
        "Provide a valid Base transaction hash or Basescan URL in txHash (0x + 64 hex chars).",
    })
  }

  try {
    const receipt = await rpc("eth_getTransactionReceipt", [txHash])
    if (!receipt) {
      return json(404, {
        ok: false,
        txHash,
        error: "Transaction not found on Base yet. Wait for confirmation and retry.",
      })
    }

    if (receipt.status !== "0x1") {
      return json(400, {
        ok: false,
        txHash,
        error: "Transaction failed on-chain (status != success).",
        basescan: `https://basescan.org/tx/${txHash}`,
      })
    }

    const transfer = findQualifyingTransfer(receipt)
    if (!transfer) {
      return json(400, {
        ok: false,
        txHash,
        error:
          "No successful USDC transfer of at least 0.01 USDC to the site wallet found in this transaction.",
        expected: {
          network: "Base",
          token: "USDC",
          tokenContract: USDC_BASE,
          payTo: PAY_TO,
          minAmountUsdc: "0.01",
        },
        basescan: `https://basescan.org/tx/${txHash}`,
      })
    }

    return json(200, {
      ok: true,
      txHash,
      network: "base",
      token: "USDC",
      ...transfer,
      payTo: PAY_TO,
      minAmountUsdc: "0.01",
      basescan: `https://basescan.org/tx/${txHash}`,
      message:
        "Payment verified. AI reuse of this site is considered permitted under /llms.txt for this proof.",
    })
  } catch (err) {
    return json(502, {
      ok: false,
      txHash,
      error: err.message || "Failed to query Base RPC.",
    })
  }
}
