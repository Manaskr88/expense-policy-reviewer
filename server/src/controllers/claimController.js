import Claim from '../models/Claim.js'
import ReviewHistory from '../models/ReviewHistory.js'
import { validateClaim } from '../services/validation/claimValidator.js'
import { getPolicyForCategory, determineFinalStatus } from '../services/policy/policyService.js'
import { reviewClaimWithAI } from '../services/ai/geminiService.js'

export async function getClaims(req, res) {
  try {
    const { status, category, search, sort = '-createdAt', page = 1, limit = 50 } = req.query

    const filter = {}
    if (status) filter.status = status
    if (category) filter.category = category
    if (search) {
      filter.$or = [
        { claimant: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)
    const [claims, total] = await Promise.all([
      Claim.find(filter).sort(sort).skip(skip).limit(Number(limit)),
      Claim.countDocuments(filter),
    ])

    res.json({ claims, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claims' })
  }
}

export async function getClaimById(req, res) {
  try {
    const claim = await Claim.findById(req.params.id).populate('duplicateOf', 'claimant amount category date')
    if (!claim) return res.status(404).json({ error: 'Claim not found' })
    res.json(claim)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claim' })
  }
}

export async function createClaim(req, res) {
  try {
    const { claimant, date, category, amount, currency, description, receiptAvailable } = req.body

    if (!claimant || !date || !category || amount === undefined || !currency || !description) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const policy = await getPolicyForCategory(category)
    const validationResults = await validateClaim(req.body, policy)

    const claim = new Claim({
      claimant,
      date: new Date(date),
      category,
      amount: Number(amount),
      currency: currency.toUpperCase(),
      description,
      receiptAvailable: receiptAvailable === true || receiptAvailable === 'true',
      status: 'PENDING',
      validationResults: {
        passed: validationResults.passed,
        checks: validationResults.checks,
      },
      duplicateOf: validationResults.duplicateClaimId || null,
    })

    await claim.save()

    await ReviewHistory.create({
      claimId: claim._id,
      action: 'SUBMITTED',
      previousStatus: null,
      newStatus: 'PENDING',
      actor: claimant,
    })

    const aiResult = await reviewClaimWithAI(claim, policy, validationResults)
    await applyAIResult(claim, aiResult, policy)

    res.status(201).json(claim)
  } catch (err) {
    console.error('createClaim error:', err)
    res.status(500).json({ error: 'Failed to create claim', details: err.message })
  }
}

async function applyAIResult(claim, aiResult, policy) {
  if (aiResult.unavailable) {
    claim.aiUnavailable = true
    claim.status = determineFinalStatus(claim.validationResults, null)
  } else {
    claim.aiClassification = aiResult.category || claim.category
    claim.aiConfidence = aiResult.confidence
    claim.aiReason = aiResult.classificationReason
    claim.aiMissingInfo = aiResult.missingInformation || []
    claim.policyEvidence = aiResult.policyEvidence
    claim.policyReference = policy?.category || null
    claim.findingExplanation = aiResult.explanation
    claim.aiUnavailable = false

    const finalStatus = determineFinalStatus(claim.validationResults, aiResult)
    claim.status = finalStatus
    claim.finalFinding = finalStatus
  }

  await claim.save()

  await ReviewHistory.create({
    claimId: claim._id,
    action: 'REVIEWED',
    previousStatus: 'PENDING',
    newStatus: claim.status,
    actor: 'System',
    reason: aiResult.unavailable ? 'AI review unavailable — deterministic validation applied.' : 'AI review completed.',
  })
}

export async function approveClaim(req, res) {
  try {
    const claim = await Claim.findById(req.params.id)
    if (!claim) return res.status(404).json({ error: 'Claim not found' })

    const { reviewer = 'Reviewer', reason } = req.body
    const previousStatus = claim.status

    claim.status = 'APPROVED'
    claim.reviewedAt = new Date()
    claim.reviewedBy = reviewer
    await claim.save()

    await ReviewHistory.create({
      claimId: claim._id,
      action: 'APPROVED',
      previousStatus,
      newStatus: 'APPROVED',
      reason: reason || null,
      actor: reviewer,
    })

    res.json(claim)
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve claim' })
  }
}

export async function rejectClaim(req, res) {
  try {
    const claim = await Claim.findById(req.params.id)
    if (!claim) return res.status(404).json({ error: 'Claim not found' })

    const { reason, reviewer = 'Reviewer' } = req.body
    if (!reason?.trim()) {
      return res.status(400).json({ error: 'A reason is required to reject a claim.' })
    }

    const previousStatus = claim.status
    claim.status = 'REJECTED'
    claim.reviewedAt = new Date()
    claim.reviewedBy = reviewer
    await claim.save()

    await ReviewHistory.create({
      claimId: claim._id,
      action: 'REJECTED',
      previousStatus,
      newStatus: 'REJECTED',
      reason,
      actor: reviewer,
    })

    res.json(claim)
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject claim' })
  }
}

export async function requestClarification(req, res) {
  try {
    const claim = await Claim.findById(req.params.id)
    if (!claim) return res.status(404).json({ error: 'Claim not found' })

    const { message, reviewer = 'Reviewer' } = req.body
    if (!message?.trim()) {
      return res.status(400).json({ error: 'A clarification message is required.' })
    }

    const previousStatus = claim.status
    claim.status = 'NEEDS_CLARIFICATION'
    claim.clarificationRequest = message
    await claim.save()

    await ReviewHistory.create({
      claimId: claim._id,
      action: 'CLARIFICATION_REQUESTED',
      previousStatus,
      newStatus: 'NEEDS_CLARIFICATION',
      reason: message,
      actor: reviewer,
    })

    res.json(claim)
  } catch (err) {
    res.status(500).json({ error: 'Failed to request clarification' })
  }
}

export async function overrideClassification(req, res) {
  try {
    const claim = await Claim.findById(req.params.id)
    if (!claim) return res.status(404).json({ error: 'Claim not found' })

    const { newCategory, reason, reviewer = 'Reviewer' } = req.body
    if (!newCategory?.trim()) return res.status(400).json({ error: 'New category is required.' })
    if (!reason?.trim()) return res.status(400).json({ error: 'A reason is required for overriding AI classification.' })

    const previousCategory = claim.aiClassification || claim.category
    claim.overriddenCategory = newCategory
    claim.overrideReason = reason
    claim.category = newCategory
    await claim.save()

    await ReviewHistory.create({
      claimId: claim._id,
      action: 'OVERRIDE',
      previousStatus: claim.status,
      newStatus: claim.status,
      reason,
      actor: reviewer,
      metadata: {
        previousCategory,
        newCategory,
      },
    })

    res.json(claim)
  } catch (err) {
    res.status(500).json({ error: 'Failed to override classification' })
  }
}

export async function getClaimHistory(req, res) {
  try {
    const history = await ReviewHistory.find({ claimId: req.params.id }).sort({ createdAt: 1 })
    res.json(history)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' })
  }
}

export async function getAllHistory(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const [history, total] = await Promise.all([
      ReviewHistory.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('claimId', 'claimant category amount status'),
      ReviewHistory.countDocuments(),
    ])

    res.json({ history, total })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' })
  }
}
