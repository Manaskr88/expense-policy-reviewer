import Claim from '../../models/Claim.js'

const VALID_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED']

function check(name, passed, message) {
  return { name, passed, message }
}

export async function validateClaim(claimData, policy, existingClaimId = null) {
  const checks = []
  const { claimant, date, category, amount, currency, description, receiptAvailable } = claimData

  // Required fields
  const missingFields = []
  if (!claimant?.trim()) missingFields.push('claimant')
  if (!date) missingFields.push('date')
  if (!category) missingFields.push('category')
  if (amount === undefined || amount === null || amount === '') missingFields.push('amount')
  if (!currency) missingFields.push('currency')
  if (!description?.trim()) missingFields.push('description')

  if (missingFields.length > 0) {
    checks.push(check('Required fields', false, `Missing required fields: ${missingFields.join(', ')}`))
  } else {
    checks.push(check('Required fields', true, 'All required fields are present.'))
  }

  // Date validity
  const claimDate = new Date(date)
  const isValidDate = !isNaN(claimDate.getTime())
  checks.push(check('Date validity', isValidDate, isValidDate ? 'Date is valid.' : 'Invalid date provided.'))

  // Future date check
  if (isValidDate) {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const isFuture = claimDate > today
    checks.push(check('Date (not future)', !isFuture, isFuture ? 'Claim date cannot be in the future.' : 'Claim date is valid.'))
  }

  // Amount
  const numericAmount = Number(amount)
  const validAmount = !isNaN(numericAmount) && numericAmount > 0
  checks.push(check('Amount > 0', validAmount, validAmount ? `Amount ₹${numericAmount} is valid.` : 'Amount must be a positive number.'))

  // Currency
  const validCurrency = VALID_CURRENCIES.includes(currency?.toUpperCase())
  checks.push(check('Currency', validCurrency, validCurrency ? `Currency ${currency} is supported.` : `Currency ${currency} is not supported.`))

  // Policy-based checks
  if (policy) {
    // Amount limit
    if (validAmount) {
      const withinLimit = numericAmount <= policy.limit
      checks.push(check(
        'Amount limit',
        withinLimit,
        withinLimit
          ? `₹${numericAmount} is within the ₹${policy.limit} limit for ${category}.`
          : `₹${numericAmount} exceeds the ₹${policy.limit} limit for ${category}.`
      ))
    }

    // Receipt requirement
    if (policy.receiptRequired) {
      const hasReceipt = receiptAvailable === true || receiptAvailable === 'true'
      checks.push(check(
        'Receipt',
        hasReceipt,
        hasReceipt ? 'Receipt is available as required.' : `Receipt is required for ${category} claims.`
      ))
    } else {
      checks.push(check('Receipt', true, 'Receipt is not required for this category.'))
    }

    // Business purpose
    if (policy.requiresBusinessPurpose) {
      const desc = description?.trim() || ''
      const hasBusinessPurpose = desc.length >= 20
      checks.push(check(
        'Business purpose',
        hasBusinessPurpose,
        hasBusinessPurpose
          ? 'Description provides sufficient business context.'
          : 'Business purpose must be clearly documented in the description.'
      ))
    }

    // Client info
    if (policy.requiresClientInfo) {
      const desc = description?.trim().toLowerCase() || ''
      const likelyHasClientInfo = desc.length >= 15 && (
        desc.includes('client') ||
        desc.includes('customer') ||
        desc.includes('meeting') ||
        desc.includes('with') ||
        desc.length >= 30
      )
      checks.push(check(
        'Client information',
        likelyHasClientInfo,
        likelyHasClientInfo
          ? 'Description appears to include client context.'
          : 'Client name or meeting context should be included in the description.'
      ))
    }
  }

  // Duplicate detection
  const duplicateResult = await checkForDuplicate(claimData, existingClaimId)
  checks.push(duplicateResult)

  const allPassed = checks.every(c => c.passed)

  return {
    passed: allPassed,
    checks,
    duplicateClaimId: duplicateResult.duplicateClaimId || null,
  }
}

async function checkForDuplicate(claimData, excludeId) {
  const { claimant, date, amount, category } = claimData

  if (!claimant || !date || !amount || !category) {
    return check('Duplicate check', true, 'Could not perform duplicate check — insufficient data.')
  }

  const claimDate = new Date(date)
  const startOfDay = new Date(claimDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(claimDate)
  endOfDay.setHours(23, 59, 59, 999)

  const query = {
    claimant: claimData.claimant,
    date: { $gte: startOfDay, $lte: endOfDay },
    amount: Number(claimData.amount),
    category: claimData.category,
  }

  if (excludeId) {
    query._id = { $ne: excludeId }
  }

  const existing = await Claim.findOne(query).select('_id claimant amount category date')

  if (existing) {
    const result = check(
      'Duplicate check',
      false,
      `Possible duplicate detected. A similar claim (ID: ${existing._id}) was found for ${claimData.claimant} on the same date with the same amount and category.`
    )
    result.duplicateClaimId = existing._id
    return result
  }

  return check('Duplicate check', true, 'No duplicate claims detected.')
}
