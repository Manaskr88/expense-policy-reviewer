import mongoose from 'mongoose'

const reviewHistorySchema = new mongoose.Schema({
  claimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Claim',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: ['SUBMITTED', 'APPROVED', 'REJECTED', 'CLARIFICATION_REQUESTED', 'OVERRIDE', 'REVIEWED'],
  },
  previousStatus: {
    type: String,
    default: null,
  },
  newStatus: {
    type: String,
    default: null,
  },
  reason: {
    type: String,
    default: null,
  },
  actor: {
    type: String,
    default: 'System',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
}, {
  timestamps: true,
})

export default mongoose.model('ReviewHistory', reviewHistorySchema)
