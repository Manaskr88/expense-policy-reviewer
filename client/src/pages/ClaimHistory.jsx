import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { api } from '../services/api'
import { formatDateTime } from '../utils/formatters'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'

const actionLabels = {
  SUBMITTED: 'Claim submitted',
  REVIEWED: 'System review completed',
  APPROVED: 'Claim approved',
  REJECTED: 'Claim rejected',
  CLARIFICATION_REQUESTED: 'Clarification requested',
  OVERRIDE: 'AI classification overridden',
}

export default function ClaimHistory() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getClaimHistory(id)
      .then(setHistory)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(`/claims/${id}`)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ChevronLeft className="h-4 w-4" /> Back to claim
        </button>
      </div>

      <h1 className="text-lg font-semibold text-gray-900 mb-4">Review History</h1>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-4">{error}</div>
      ) : history.length === 0 ? (
        <EmptyState title="No history yet" description="History will appear as actions are taken on this claim." />
      ) : (
        <div className="relative">
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-4">
            {history.map((entry, i) => (
              <div key={entry._id} className="relative flex gap-4 pl-9">
                <div className="absolute left-2 top-2 w-3 h-3 rounded-full border-2 border-white bg-gray-400 z-10" />
                <div className="flex-1 bg-white border border-gray-200 rounded p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {actionLabels[entry.action] || entry.action}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDateTime(entry.createdAt)} · by {entry.actor}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {entry.previousStatus && <StatusBadge status={entry.previousStatus} />}
                      {entry.newStatus && entry.newStatus !== entry.previousStatus && (
                        <>
                          <span className="text-xs text-gray-400">→</span>
                          <StatusBadge status={entry.newStatus} />
                        </>
                      )}
                    </div>
                  </div>

                  {entry.reason && (
                    <p className="mt-2 text-sm text-gray-600 border-t border-gray-100 pt-2">
                      {entry.reason}
                    </p>
                  )}

                  {entry.metadata?.previousCategory && (
                    <p className="mt-2 text-xs text-gray-500">
                      Category changed from <strong>{entry.metadata.previousCategory}</strong> to <strong>{entry.metadata.newCategory}</strong>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
