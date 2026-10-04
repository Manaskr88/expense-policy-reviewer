import mongoose from 'mongoose'

const policySchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    unique: true,
    enum: ['Travel', 'Meals', 'Accommodation', 'Client Entertainment', 'Office Supplies', 'Communication', 'Other'],
  },
  limit: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  receiptRequired: {
    type: Boolean,
    default: true,
  },
  requiresBusinessPurpose: {
    type: Boolean,
    default: false,
  },
  requiresClientInfo: {
    type: Boolean,
    default: false,
  },
  policyText: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
})

export default mongoose.model('Policy', policySchema)
