import mongoose from 'mongoose'

const validationCheckSchema = new mongoose.Schema({
  name: String,
  passed: Boolean,
  message: String,
}, { _id: false })

const claimSchema = new mongoose.Schema({
  claimant: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Travel', 'Meals', 'Accommodation', 'Client Entertainment', 'Office Supplies', 'Communication', 'Other'],
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  receiptAvailable: {
    type: Boolean,
    required: true,
    default: false,
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLIANT', 'NEEDS_CLARIFICATION', 'NEEDS_REVIEW', 'NON_COMPLIANT', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  },

  // AI classification output
  aiClassification: {
    type: String,
    enum: ['Travel', 'Meals', 'Accommodation', 'Client Entertainment', 'Office Supplies', 'Communication', 'Other', null],
    default: null,
  },
  aiConfidence: {
    type: Number,
    default: null,
  },
  aiReason: {
    type: String,
    default: null,
  },
  aiMissingInfo: {
    type: [String],
    default: [],
  },
  aiUnavailable: {
    type: Boolean,
    default: false,
  },

  // Policy and evidence
  policyReference: {
    type: String,
    default: null,
  },
  policyEvidence: {
    type: String,
    default: null,
  },

  // Deterministic validation results
  validationResults: {
    passed: { type: Boolean, default: null },
    checks: { type: [validationCheckSchema], default: [] },
  },

  // Final finding from combined review
  finalFinding: {
    type: String,
    enum: ['COMPLIANT', 'NEEDS_CLARIFICATION', 'NEEDS_REVIEW', 'NON_COMPLIANT', null],
    default: null,
  },
  findingExplanation: {
    type: String,
    default: null,
  },

  clarificationRequest: {
    type: String,
    default: null,
  },

  // Reviewer override
  overriddenCategory: {
    type: String,
    enum: ['Travel', 'Meals', 'Accommodation', 'Client Entertainment', 'Office Supplies', 'Communication', 'Other', null],
    default: null,
  },
  overrideReason: {
    type: String,
    default: null,
  },

  reviewedAt: {
    type: Date,
    default: null,
  },
  reviewedBy: {
    type: String,
    default: null,
  },

  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Claim',
    default: null,
  },
}, {
  timestamps: true,
})

claimSchema.index({ claimant: 1, date: 1, amount: 1, category: 1 })

export default mongoose.model('Claim', claimSchema)
