export function formatCurrency(amount, currency = 'INR') {
  const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' }
  const symbol = symbols[currency] || currency + ' '
  return `${symbol}${Number(amount).toLocaleString('en-IN')}`
}

export function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function confidenceLabel(confidence) {
  if (confidence === null || confidence === undefined) return 'Unknown'
  const pct = Math.round(confidence * 100)
  if (pct >= 85) return 'High confidence'
  if (pct >= 60) return 'Moderate confidence'
  return 'Uncertain — reviewer confirmation recommended'
}

export function confidenceColor(confidence) {
  if (confidence === null || confidence === undefined) return 'text-gray-500'
  if (confidence >= 0.85) return 'text-green-700'
  if (confidence >= 0.6) return 'text-amber-600'
  return 'text-red-600'
}
