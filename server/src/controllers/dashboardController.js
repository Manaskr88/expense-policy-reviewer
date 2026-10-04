import Claim from '../models/Claim.js'

export async function getDashboardStats(req, res) {
  try {
    const [total, approved, rejected, needsReview, needsClarification, nonCompliant, recent] = await Promise.all([
      Claim.countDocuments(),
      Claim.countDocuments({ status: 'APPROVED' }),
      Claim.countDocuments({ status: 'REJECTED' }),
      Claim.countDocuments({ status: 'NEEDS_REVIEW' }),
      Claim.countDocuments({ status: 'NEEDS_CLARIFICATION' }),
      Claim.countDocuments({ status: 'NON_COMPLIANT' }),
      Claim.find().sort({ createdAt: -1 }).limit(10),
    ])

    res.json({
      stats: {
        total,
        approved,
        rejected,
        needsReview,
        needsClarification,
        nonCompliant,
        pending: total - approved - rejected - needsReview - needsClarification - nonCompliant,
      },
      recent,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
}
