import { useState, useEffect } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { api } from '../services/api'
import { formatCurrency } from '../utils/formatters'
import Spinner from '../components/Spinner'
import PageHeader from '../components/PageHeader'

export default function Policy() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getPolicies()
      .then(setPolicies)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (error) return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-4">{error}</div>

  return (
    <div>
      <PageHeader
        title="Expense Policy"
        description="Category-level limits and requirements enforced during claim review."
      />

      <div className="space-y-3">
        {policies.map(policy => (
          <div key={policy._id} className="bg-white border border-gray-200 rounded">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">{policy.category}</h2>
              <span className="text-sm font-medium text-gray-700">
                Limit: {formatCurrency(policy.limit, policy.currency)}
              </span>
            </div>

            <div className="px-5 py-3">
              <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                <RequirementItem label="Receipt required" value={policy.receiptRequired} />
                <RequirementItem label="Business purpose" value={policy.requiresBusinessPurpose} />
                <RequirementItem label="Client information" value={policy.requiresClientInfo} />
              </div>

              <p className="text-sm text-gray-600">{policy.policyText}</p>

              {policy.notes && (
                <p className="mt-2 text-xs text-gray-400">{policy.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RequirementItem({ label, value }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {value
        ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
        : <XCircle className="h-4 w-4 text-gray-300 shrink-0" />
      }
      <span className={value ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
    </div>
  )
}
