import Policy from '../../models/Policy.js'

export async function getPolicyForCategory(category) {
  const policy = await Policy.findOne({ category })
  return policy || null
}

export async function getAllPolicies() {
  return Policy.find().sort({ category: 1 })
}

export function determineFinalStatus(validationResults, aiResult) {
  const checks = validationResults?.checks || []

  const requiredFieldsFailed = checks.find(c => c.name === 'Required fields' && !c.passed)
  const dateFailed = checks.find(c => c.name === 'Date validity' && !c.passed)
  const futureDateFailed = checks.find(c => c.name === 'Date (not future)' && !c.passed)
  const amountLimitFailed = checks.find(c => c.name === 'Amount limit' && !c.passed)
  const receiptFailed = checks.find(c => c.name === 'Receipt' && !c.passed)
  const businessPurposeFailed = checks.find(c => c.name === 'Business purpose' && !c.passed)
  const clientInfoFailed = checks.find(c => c.name === 'Client information' && !c.passed)
  const duplicateFailed = checks.find(c => c.name === 'Duplicate check' && !c.passed)

  // Hard failures — non-compliant or needs review
  if (requiredFieldsFailed || dateFailed || futureDateFailed) {
    return 'NEEDS_REVIEW'
  }

  if (amountLimitFailed) {
    return 'NON_COMPLIANT'
  }

  if (duplicateFailed) {
    return 'NEEDS_REVIEW'
  }

  // Soft failures — needs clarification
  if (receiptFailed || businessPurposeFailed || clientInfoFailed) {
    return 'NEEDS_CLARIFICATION'
  }

  // AI signals uncertainty
  if (aiResult && !aiResult.unavailable) {
    if (aiResult.confidence !== null && aiResult.confidence < 0.6) {
      return 'NEEDS_REVIEW'
    }
    if (aiResult.finding === 'NON_COMPLIANT') {
      return 'NON_COMPLIANT'
    }
    if (aiResult.finding === 'NEEDS_CLARIFICATION') {
      return 'NEEDS_CLARIFICATION'
    }
    if (aiResult.finding === 'NEEDS_REVIEW') {
      return 'NEEDS_REVIEW'
    }
  }

  return 'COMPLIANT'
}
