import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { formatDateTime } from '../utils/formatters'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

const actionLabels = {
  SUBMITTED: 'Submitted',
  REVIEWED: 'System Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLARIFICATION_REQUESTED: 'Clarification Requested',
  OVERRIDE: 'Override',
}

export default function ReviewHistory() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getFullHistory()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (error) return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-4">{error}</div>

  const history = data?.history || []

  return (
    <div>
      <PageHeader
        title="Review History"
        description="All reviewer actions across claims."
      />

      <div className="bg-white border border-gray-200 rounded">
        {history.length === 0 ? (
          <EmptyState title="No review history yet" description="History is recorded as claims are reviewed." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Claim</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Action</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status Change</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Reviewer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Reason</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map(entry => {
                  const claim = entry.claimId
                  return (
                    <tr key={entry._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {claim ? (
                          <button
                            className="text-left"
                            onClick={() => navigate(`/claims/${claim._id}`)}
                          >
                            <div className="font-medium text-gray-900 hover:underline">{claim.claimant}</div>
                            <div className="text-xs text-gray-400">{claim.category}</div>
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {actionLabels[entry.action] || entry.action}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {entry.previousStatus && <StatusBadge status={entry.previousStatus} />}
                          {entry.newStatus && entry.newStatus !== entry.previousStatus && (
                            <>
                              <span className="text-xs text-gray-400">→</span>
                              <StatusBadge status={entry.newStatus} />
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{entry.actor}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{entry.reason || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDateTime(entry.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
