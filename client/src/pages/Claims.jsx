import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import { api } from '../services/api'
import { formatCurrency, formatDate } from '../utils/formatters'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

const CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Client Entertainment', 'Office Supplies', 'Communication', 'Other']
const STATUSES = ['PENDING', 'COMPLIANT', 'APPROVED', 'NEEDS_CLARIFICATION', 'NEEDS_REVIEW', 'NON_COMPLIANT', 'REJECTED']

export default function Claims() {
  const [claims, setClaims] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sort, setSort] = useState('-createdAt')
  const navigate = useNavigate()

  const load = useCallback(() => {
    setLoading(true)
    api.getClaims({ search, status: statusFilter, category: categoryFilter, sort })
      .then(res => {
        setClaims(res.claims)
        setTotal(res.total)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [search, statusFilter, categoryFilter, sort])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  return (
    <div>
      <PageHeader
        title="Claims"
        description={`${total} claim${total !== 1 ? 's' : ''} total`}
        action={
          <button className="btn-primary" onClick={() => navigate('/claims/new')}>
            New Claim
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            className="input pl-8"
            placeholder="Search by claimant or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>

        <select className="input w-auto" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className="input w-auto" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="-createdAt">Newest first</option>
          <option value="createdAt">Oldest first</option>
          <option value="-amount">Highest amount</option>
          <option value="amount">Lowest amount</option>
          <option value="-date">Claim date desc</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : claims.length === 0 ? (
          <EmptyState
            title="No claims found"
            description="Try adjusting your filters or create a new claim."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Claimant</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Category</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Submitted</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {claims.map(claim => (
                  <tr key={claim._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/claims/${claim._id}`)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{claim.claimant}</td>
                    <td className="px-4 py-3 text-gray-600">{claim.category}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(claim.amount, claim.currency)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(claim.date)}</td>
                    <td className="px-4 py-3"><StatusBadge status={claim.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(claim.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-500 hover:text-gray-900 underline">Open</span>
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
