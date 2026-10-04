import 'dotenv/config'
import mongoose from 'mongoose'
import Claim from '../models/Claim.js'
import Policy from '../models/Policy.js'
import ReviewHistory from '../models/ReviewHistory.js'
import { defaultPolicies } from './policyData.js'

async function seed() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI is not set')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  await Policy.deleteMany()
  await Claim.deleteMany()
  await ReviewHistory.deleteMany()
  console.log('Cleared existing data')

  const policies = await Policy.insertMany(defaultPolicies)
  console.log(`Inserted ${policies.length} policy records`)

  const now = new Date()
  const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

  const sampleClaims = [
    {
      claimant: 'Arjun Mehta',
      date: daysAgo(3),
      category: 'Travel',
      amount: 3200,
      currency: 'INR',
      description: 'Train fare from Mumbai to Pune for client meeting on project kickoff.',
      receiptAvailable: true,
      status: 'COMPLIANT',
      finalFinding: 'COMPLIANT',
      aiClassification: 'Travel',
      aiConfidence: 0.97,
      aiReason: 'Description clearly indicates a travel expense for a client meeting.',
      policyEvidence: 'Travel expenses including flights, trains, taxis, and fuel are reimbursable up to ₹5,000 per trip.',
      findingExplanation: 'Claim is within the travel limit of ₹5,000 and a receipt is available.',
      validationResults: {
        passed: true,
        checks: [
          { name: 'Required fields', passed: true, message: 'All required fields are present.' },
          { name: 'Date validity', passed: true, message: 'Date is valid.' },
          { name: 'Date (not future)', passed: true, message: 'Claim date is valid.' },
          { name: 'Amount > 0', passed: true, message: 'Amount ₹3200 is valid.' },
          { name: 'Currency', passed: true, message: 'Currency INR is supported.' },
          { name: 'Amount limit', passed: true, message: '₹3200 is within the ₹5000 limit for Travel.' },
          { name: 'Receipt', passed: true, message: 'Receipt is available as required.' },
          { name: 'Duplicate check', passed: true, message: 'No duplicate claims detected.' },
        ],
      },
    },
    {
      claimant: 'Priya Sharma',
      date: daysAgo(5),
      category: 'Accommodation',
      amount: 9200,
      currency: 'INR',
      description: 'Hotel stay in Bangalore for 2 nights during annual conference.',
      receiptAvailable: true,
      status: 'NON_COMPLIANT',
      finalFinding: 'NON_COMPLIANT',
      aiClassification: 'Accommodation',
      aiConfidence: 0.95,
      aiReason: 'Description indicates hotel accommodation for a business conference.',
      policyEvidence: 'Accommodation expenses are reimbursable up to ₹7,500 per night.',
      findingExplanation: '₹9,200 exceeds the accommodation policy limit of ₹7,500 per night.',
      validationResults: {
        passed: false,
        checks: [
          { name: 'Required fields', passed: true, message: 'All required fields are present.' },
          { name: 'Date validity', passed: true, message: 'Date is valid.' },
          { name: 'Date (not future)', passed: true, message: 'Claim date is valid.' },
          { name: 'Amount > 0', passed: true, message: 'Amount ₹9200 is valid.' },
          { name: 'Currency', passed: true, message: 'Currency INR is supported.' },
          { name: 'Amount limit', passed: false, message: '₹9200 exceeds the ₹7500 limit for Accommodation.' },
          { name: 'Receipt', passed: true, message: 'Receipt is available as required.' },
          { name: 'Duplicate check', passed: true, message: 'No duplicate claims detected.' },
        ],
      },
    },
    {
      claimant: 'Vikram Nair',
      date: daysAgo(2),
      category: 'Meals',
      amount: 1500,
      currency: 'INR',
      description: 'Team lunch during sprint planning session.',
      receiptAvailable: false,
      status: 'NEEDS_CLARIFICATION',
      finalFinding: 'NEEDS_CLARIFICATION',
      aiClassification: 'Meals',
      aiConfidence: 0.93,
      aiReason: 'Description clearly describes a meal during a work session.',
      policyEvidence: 'Meal expenses are reimbursable up to ₹2,000 per day. Receipts are required for all claims.',
      findingExplanation: 'Amount is within limit but receipt is required for meals claims.',
      validationResults: {
        passed: false,
        checks: [
          { name: 'Required fields', passed: true, message: 'All required fields are present.' },
          { name: 'Date validity', passed: true, message: 'Date is valid.' },
          { name: 'Date (not future)', passed: true, message: 'Claim date is valid.' },
          { name: 'Amount > 0', passed: true, message: 'Amount ₹1500 is valid.' },
          { name: 'Currency', passed: true, message: 'Currency INR is supported.' },
          { name: 'Amount limit', passed: true, message: '₹1500 is within the ₹2000 limit for Meals.' },
          { name: 'Receipt', passed: false, message: 'Receipt is required for Meals claims.' },
          { name: 'Duplicate check', passed: true, message: 'No duplicate claims detected.' },
        ],
      },
      clarificationRequest: 'Please upload the meal receipt to process this claim.',
    },
    {
      claimant: 'Arjun Mehta',
      date: daysAgo(3),
      category: 'Travel',
      amount: 3200,
      currency: 'INR',
      description: 'Train fare from Mumbai to Pune for client meeting on project kickoff.',
      receiptAvailable: true,
      status: 'NEEDS_REVIEW',
      finalFinding: 'NEEDS_REVIEW',
      aiClassification: 'Travel',
      aiConfidence: 0.97,
      aiReason: 'Identical to a previously submitted claim — possible duplicate.',
      policyEvidence: 'Travel expenses including flights, trains, taxis, and fuel are reimbursable up to ₹5,000 per trip.',
      findingExplanation: 'This claim appears to be a duplicate of an earlier submission on the same date.',
      validationResults: {
        passed: false,
        checks: [
          { name: 'Required fields', passed: true, message: 'All required fields are present.' },
          { name: 'Date validity', passed: true, message: 'Date is valid.' },
          { name: 'Date (not future)', passed: true, message: 'Claim date is valid.' },
          { name: 'Amount > 0', passed: true, message: 'Amount ₹3200 is valid.' },
          { name: 'Currency', passed: true, message: 'Currency INR is supported.' },
          { name: 'Amount limit', passed: true, message: '₹3200 is within the ₹5000 limit for Travel.' },
          { name: 'Receipt', passed: true, message: 'Receipt is available as required.' },
          { name: 'Duplicate check', passed: false, message: 'Possible duplicate detected. A similar claim was found for this claimant on the same date.' },
        ],
      },
    },
    {
      claimant: 'Sneha Reddy',
      date: daysAgo(1),
      category: 'Client Entertainment',
      amount: 4800,
      currency: 'INR',
      description: 'Dinner at Taj restaurant.',
      receiptAvailable: true,
      status: 'NEEDS_CLARIFICATION',
      finalFinding: 'NEEDS_CLARIFICATION',
      aiClassification: 'Client Entertainment',
      aiConfidence: 0.72,
      aiReason: 'Description mentions a dinner which could be personal or client entertainment. Categorised as client entertainment due to amount, but business purpose and client name are absent.',
      aiMissingInfo: ['Business purpose', 'Client name or company'],
      policyEvidence: 'Client entertainment expenses are reimbursable up to ₹5,000 when the business purpose and client information are documented.',
      findingExplanation: 'Amount is within the ₹5,000 limit and receipt is available, but the business purpose and client information are required for this category.',
      validationResults: {
        passed: false,
        checks: [
          { name: 'Required fields', passed: true, message: 'All required fields are present.' },
          { name: 'Date validity', passed: true, message: 'Date is valid.' },
          { name: 'Date (not future)', passed: true, message: 'Claim date is valid.' },
          { name: 'Amount > 0', passed: true, message: 'Amount ₹4800 is valid.' },
          { name: 'Currency', passed: true, message: 'Currency INR is supported.' },
          { name: 'Amount limit', passed: true, message: '₹4800 is within the ₹5000 limit for Client Entertainment.' },
          { name: 'Receipt', passed: true, message: 'Receipt is available as required.' },
          { name: 'Business purpose', passed: false, message: 'Business purpose must be clearly documented in the description.' },
          { name: 'Client information', passed: false, message: 'Client name or meeting context should be included in the description.' },
          { name: 'Duplicate check', passed: true, message: 'No duplicate claims detected.' },
        ],
      },
    },
    {
      claimant: 'Rohan Das',
      date: daysAgo(7),
      category: 'Office Supplies',
      amount: 850,
      currency: 'INR',
      description: 'Purchased notebooks, pens, and sticky notes for the team.',
      receiptAvailable: true,
      status: 'NEEDS_CLARIFICATION',
      finalFinding: 'NEEDS_CLARIFICATION',
      aiClassification: 'Office Supplies',
      aiConfidence: 0.91,
      aiReason: 'Description clearly lists standard office stationery items.',
      policyEvidence: 'Office supply expenses are reimbursable up to ₹3,000 per month. Receipts are required.',
      findingExplanation: 'Amount is within policy limit and receipt is available. However, a clearer description of the business need would strengthen this claim.',
      validationResults: {
        passed: true,
        checks: [
          { name: 'Required fields', passed: true, message: 'All required fields are present.' },
          { name: 'Date validity', passed: true, message: 'Date is valid.' },
          { name: 'Date (not future)', passed: true, message: 'Claim date is valid.' },
          { name: 'Amount > 0', passed: true, message: 'Amount ₹850 is valid.' },
          { name: 'Currency', passed: true, message: 'Currency INR is supported.' },
          { name: 'Amount limit', passed: true, message: '₹850 is within the ₹3000 limit for Office Supplies.' },
          { name: 'Receipt', passed: true, message: 'Receipt is available as required.' },
          { name: 'Duplicate check', passed: true, message: 'No duplicate claims detected.' },
        ],
      },
    },
  ]

  const inserted = await Claim.insertMany(sampleClaims)
  console.log(`Inserted ${inserted.length} sample claims`)

  // Link duplicate
  const arjunClaims = inserted.filter(c => c.claimant === 'Arjun Mehta')
  if (arjunClaims.length >= 2) {
    await Claim.findByIdAndUpdate(arjunClaims[1]._id, { duplicateOf: arjunClaims[0]._id })
  }

  // Seed review history
  const historyEntries = inserted.map(claim => ({
    claimId: claim._id,
    action: 'SUBMITTED',
    previousStatus: null,
    newStatus: 'PENDING',
    actor: claim.claimant,
    createdAt: claim.createdAt,
  }))

  const reviewedEntries = inserted.map(claim => ({
    claimId: claim._id,
    action: 'REVIEWED',
    previousStatus: 'PENDING',
    newStatus: claim.status,
    actor: 'System',
    reason: 'Initial review completed.',
  }))

  await ReviewHistory.insertMany([...historyEntries, ...reviewedEntries])
  console.log('Seeded review history')

  console.log('\nSeed complete. Sample claims:')
  inserted.forEach(c => console.log(`  ${c.claimant} | ${c.category} | ₹${c.amount} | ${c.status}`))

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
