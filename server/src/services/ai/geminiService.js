import { buildSystemInstruction, buildReviewPrompt } from './aiPrompt.js'

const VALID_CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Client Entertainment', 'Office Supplies', 'Communication', 'Other']
const VALID_FINDINGS = ['COMPLIANT', 'NEEDS_CLARIFICATION', 'NEEDS_REVIEW', 'NON_COMPLIANT']

// gemini-2.5-flash is the current free model as of 2026
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// AI classification is advisory; deterministic policy checks remain authoritative.
export async function reviewClaimWithAI(claim, policy, validationResults) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

    // AQ. keys are the new Google AI Studio format — passed as x-goog-api-key header
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

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody)
    })

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
