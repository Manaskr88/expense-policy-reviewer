// Tests for the deterministic validation engine.
// These tests mock the DB layer so they run without a live MongoDB connection.

import { jest } from '@jest/globals'

// Mock Claim.findOne for duplicate detection
const mockFindOne = jest.fn().mockResolvedValue(null)
jest.unstable_mockModule('../src/models/Claim.js', () => ({
  default: {
    findOne: (q) => ({
      select: () => mockFindOne(q),
    }),
  },
}))

const { validateClaim } = await import('../src/services/validation/claimValidator.js')

const basePolicy = {
  category: 'Travel',
  limit: 5000,
  currency: 'INR',
  receiptRequired: true,
  requiresBusinessPurpose: false,
  requiresClientInfo: false,
}

const validClaim = {
  claimant: 'Test User',
  date: new Date(Date.now() - 86400000).toISOString(), // yesterday
  category: 'Travel',
  amount: 3000,
  currency: 'INR',
  description: 'Train fare to client site for business meeting.',
  receiptAvailable: true,
}

describe('Deterministic Claim Validator', () => {
  beforeEach(() => mockFindOne.mockResolvedValue(null))

  test('valid claim passes all checks', async () => {
    const result = await validateClaim(validClaim, basePolicy)
    expect(result.passed).toBe(true)
    expect(result.checks.every(c => c.passed)).toBe(true)
  })

  test('amount over limit fails', async () => {
    const claim = { ...validClaim, amount: 6000 }
    const result = await validateClaim(claim, basePolicy)
    expect(result.passed).toBe(false)
    const limitCheck = result.checks.find(c => c.name === 'Amount limit')
    expect(limitCheck.passed).toBe(false)
    expect(limitCheck.message).toMatch(/exceeds/)
  })

  test('missing receipt fails when required', async () => {
    const claim = { ...validClaim, receiptAvailable: false }
    const result = await validateClaim(claim, basePolicy)
    expect(result.passed).toBe(false)
    const receiptCheck = result.checks.find(c => c.name === 'Receipt')
    expect(receiptCheck.passed).toBe(false)
  })

  test('future date fails', async () => {
    const claim = { ...validClaim, date: new Date(Date.now() + 86400000 * 3).toISOString() }
    const result = await validateClaim(claim, basePolicy)
    const futureDateCheck = result.checks.find(c => c.name === 'Date (not future)')
    expect(futureDateCheck.passed).toBe(false)
  })

  test('missing required field fails', async () => {
    const claim = { ...validClaim, claimant: '' }
    const result = await validateClaim(claim, basePolicy)
    const fieldCheck = result.checks.find(c => c.name === 'Required fields')
    expect(fieldCheck.passed).toBe(false)
    expect(fieldCheck.message).toMatch(/claimant/)
  })

  test('duplicate claim fails', async () => {
    mockFindOne.mockResolvedValue({ _id: 'abc123', claimant: 'Test User', amount: 3000, category: 'Travel' })
    const result = await validateClaim(validClaim, basePolicy)
    const dupCheck = result.checks.find(c => c.name === 'Duplicate check')
    expect(dupCheck.passed).toBe(false)
    expect(dupCheck.message).toMatch(/duplicate/i)
  })

  test('invalid date fails', async () => {
    const claim = { ...validClaim, date: 'not-a-date' }
    const result = await validateClaim(claim, basePolicy)
    const dateCheck = result.checks.find(c => c.name === 'Date validity')
    expect(dateCheck.passed).toBe(false)
  })

  test('amount zero fails', async () => {
    const claim = { ...validClaim, amount: 0 }
    const result = await validateClaim(claim, basePolicy)
    const amountCheck = result.checks.find(c => c.name === 'Amount > 0')
    expect(amountCheck.passed).toBe(false)
  })
})
