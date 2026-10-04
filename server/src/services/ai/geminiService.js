import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildSystemInstruction, buildReviewPrompt } from './aiPrompt.js'

const VALID_CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Client Entertainment', 'Office Supplies', 'Communication', 'Other']
const VALID_FINDINGS = ['COMPLIANT', 'NEEDS_CLARIFICATION', 'NEEDS_REVIEW', 'NON_COMPLIANT']

let genAI = null

function getClient() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set')
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return genAI
}

// AI classification is advisory; deterministic policy checks remain authoritative.
export async function reviewClaimWithAI(claim, policy, validationResults) {
  try {
    const client = getClient()
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: buildSystemInstruction(),
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    })

    const prompt = buildReviewPrompt(claim, policy, validationResults)
    const result = await model.generateContent(prompt)
    const text = result.response.text()

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
