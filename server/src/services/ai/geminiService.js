import { buildSystemInstruction, buildReviewPrompt } from './aiPrompt.js'

const VALID_CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Client Entertainment', 'Office Supplies', 'Communication', 'Other']
const VALID_FINDINGS = ['COMPLIANT', 'NEEDS_CLARIFICATION', 'NEEDS_REVIEW', 'NON_COMPLIANT']

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

// Cached token to avoid generating a new one on every request
let cachedToken = null
let tokenExpiresAt = 0

async function getAccessToken(serviceAccount) {
  const now = Date.now()
  if (cachedToken && now < tokenExpiresAt - 30000) return cachedToken

  const iat = Math.floor(now / 1000)
  const exp = iat + 3600

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/generative-language',
    aud: TOKEN_ENDPOINT,
    iat,
    exp,
  }))

  const signingInput = `${header}.${payload}`

  // Use Node.js crypto to sign with the private key
  const { createSign } = await import('crypto')
  const signer = createSign('RSA-SHA256')
  signer.update(signingInput)
  const signature = signer.sign(serviceAccount.private_key, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const jwt = `${signingInput}.${signature}`

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiresAt = now + (data.expires_in * 1000)
  return cachedToken
}

async function loadServiceAccount() {
  // Production: stored as JSON string in env var
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  }

  // Local development: read from file
  try {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    return JSON.parse(readFileSync(join(process.cwd(), 'service-account.json'), 'utf8'))
  } catch {
    return null
  }
}

// AI classification is advisory; deterministic policy checks remain authoritative.
export async function reviewClaimWithAI(claim, policy, validationResults) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

    const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`

    const requestBody = {
      system_instruction: {
        parts: [{ text: buildSystemInstruction() }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: buildReviewPrompt(claim, policy, validationResults) }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    }

    // Try with API key first (AQ. format via x-goog-api-key)
    let res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody)
    })

    // If API key auth fails, fall back to service account OAuth2
    if (res.status === 401 || res.status === 403) {
      const sa = loadServiceAccount()
      if (!sa) throw new Error('API key auth failed and no service account available')

      const token = await getAccessToken(sa)
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody)
      })
    }

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Gemini API ${res.status}: ${errBody}`)
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response from Gemini')

    const parsed = JSON.parse(text)
    return sanitizeAIResponse(parsed)

  } catch (err) {
    console.error('Gemini review failed:', err.message)
    return { unavailable: true, error: err.message }
  }
}

function sanitizeAIResponse(raw) {
  const category = VALID_CATEGORIES.includes(raw.category) ? raw.category : null
  const confidence = typeof raw.confidence === 'number'
    ? Math.min(1, Math.max(0, raw.confidence))
    : null
  const finding = VALID_FINDINGS.includes(raw.finding) ? raw.finding : 'NEEDS_REVIEW'

  return {
    unavailable: false,
    category,
    confidence,
    classificationReason: typeof raw.classificationReason === 'string' ? raw.classificationReason : null,
    missingInformation: Array.isArray(raw.missingInformation) ? raw.missingInformation.filter(s => typeof s === 'string') : [],
    finding,
    explanation: typeof raw.explanation === 'string' ? raw.explanation : null,
    policyEvidence: typeof raw.policyEvidence === 'string' ? raw.policyEvidence : null,
  }
}
