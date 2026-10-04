const configs = {
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-700' },
  COMPLIANT: { label: 'Compliant', className: 'bg-green-100 text-green-800' },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-800' },
  NEEDS_CLARIFICATION: { label: 'Needs Clarification', className: 'bg-amber-100 text-amber-800' },
  NEEDS_REVIEW: { label: 'Needs Review', className: 'bg-blue-100 text-blue-800' },
  NON_COMPLIANT: { label: 'Non-Compliant', className: 'bg-red-100 text-red-800' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
}

export default function StatusBadge({ status, size = 'sm' }) {
  const config = configs[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

  return (
    <span className={`inline-flex items-center font-medium rounded ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  )
}
