import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { formatCurrency, formatDate } from '../utils/formatters'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import PageHeader from '../components/PageHeader'

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-700 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getDashboardStats()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )

  if (error) return (
    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-4">
      Failed to load dashboard: {error}
    </div>
  )

  const { stats, recent } = data

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of expense claim activity."
        action={
          <button className="btn-primary" onClick={() => navigate('/claims/new')}>
            New Claim
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Claims" value={stats.total} />
        <StatCard label="Approved" value={stats.approved} sub="Processed" />
        <StatCard label="Needs Review" value={stats.needsReview + stats.needsClarification} sub="Requires action" />
        <StatCard label="Rejected" value={stats.rejected} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Non-Compliant" value={stats.nonCompliant} />
        <StatCard label="Pending" value={stats.pending} sub="Awaiting review" />
        <StatCard label="Clarification Needed" value={stats.needsClarification} />
      </div>

      <div className="bg-white border border-gray-200 rounded">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Recent Claims</h2>
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">No claims yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Claimant</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Category</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map(claim => (
                  <tr key={claim._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{claim.claimant}</td>
                    <td className="px-4 py-2.5 text-gray-600">{claim.category}</td>
                    <td className="px-4 py-2.5 text-right text-gray-900">{formatCurrency(claim.amount, claim.currency)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{formatDate(claim.date)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={claim.status} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        className="text-xs text-gray-500 hover:text-gray-900 underline"
                        onClick={() => navigate(`/claims/${claim._id}`)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
