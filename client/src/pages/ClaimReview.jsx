import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, ExternalLink } from 'lucide-react'
import { api } from '../services/api'
import { formatCurrency, formatDate, formatDateTime, confidenceLabel, confidenceColor } from '../utils/formatters'
import StatusBadge from '../components/StatusBadge'
import ValidationChecks from '../components/ValidationChecks'
import Spinner from '../components/Spinner'

const CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Client Entertainment', 'Office Supplies', 'Communication', 'Other']

export default function ClaimReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [claim, setClaim] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Action states
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  // Modal states
  const [showReject, setShowReject] = useState(false)
  const [showClarification, setShowClarification] = useState(false)
  const [showOverride, setShowOverride] = useState(false)

  const [rejectReason, setRejectReason] = useState('')
  const [clarificationMsg, setClarificationMsg] = useState('')
  const [overrideCategory, setOverrideCategory] = useState('')
  const [overrideReason, setOverrideReason] = useState('')

  useEffect(() => {
    loadClaim()
  }, [id])

  async function loadClaim() {
    setLoading(true)
    try {
      const data = await api.getClaimById(id)
      setClaim(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function showMessage(msg) {
    setActionSuccess(msg)
    setTimeout(() => setActionSuccess(null), 4000)
  }

  async function handleApprove() {
    setActionLoading(true)
    setActionError(null)
    try {
      const updated = await api.approveClaim(id, { reviewer: 'Reviewer' })
      setClaim(updated)
      showMessage('Claim approved.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setActionLoading(true)
    setActionError(null)
    try {
      const updated = await api.rejectClaim(id, { reason: rejectReason, reviewer: 'Reviewer' })
      setClaim(updated)
      setShowReject(false)
      setRejectReason('')
      showMessage('Claim rejected.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleClarification() {
    if (!clarificationMsg.trim()) return
    setActionLoading(true)
    setActionError(null)
    try {
      const updated = await api.requestClarification(id, { message: clarificationMsg, reviewer: 'Reviewer' })
      setClaim(updated)
      setShowClarification(false)
      setClarificationMsg('')
      showMessage('Clarification requested.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleOverride() {
    if (!overrideCategory || !overrideReason.trim()) return
    setActionLoading(true)
    setActionError(null)
    try {
      const updated = await api.overrideClassification(id, {
        newCategory: overrideCategory,
        reason: overrideReason,
        reviewer: 'Reviewer',
      })
      setClaim(updated)
      setShowOverride(false)
      setOverrideCategory('')
      setOverrideReason('')
      showMessage('AI classification overridden.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  if (error) return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-4">{error}</div>
  if (!claim) return null

  const isResolved = ['APPROVED', 'REJECTED'].includes(claim.status)
  const confidence = claim.aiConfidence
  const effectiveCategory = claim.overriddenCategory || claim.aiClassification || claim.category

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate('/claims')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ChevronLeft className="h-4 w-4" /> Claims
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">{claim.claimant}</span>
      </div>

      {actionSuccess && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-4 py-2.5">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-4 py-2.5">
          {actionError}
        </div>
      )}

      {/* Claim Details */}
      <Section title="Claim Details" aside={<StatusBadge status={claim.status} size="md" />}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Claimant" value={claim.claimant} />
          <Field label="Date" value={formatDate(claim.date)} />
          <Field label="Category" value={claim.category} />
          <Field label="Amount" value={formatCurrency(claim.amount, claim.currency)} />
          <Field label="Currency" value={claim.currency} />
          <Field label="Receipt" value={claim.receiptAvailable ? 'Available' : 'Not available'} />
          <div className="col-span-2">
            <dt className="text-xs font-medium text-gray-500 mb-1">Description</dt>
            <dd className="text-gray-800">{claim.description}</dd>
          </div>
        </dl>
      </Section>

      {/* Duplicate warning */}
      {claim.duplicateOf && (
        <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium text-amber-800">Possible duplicate detected.</span>
            {' '}This claim matches an existing submission.{' '}
            <Link
              to={`/claims/${claim.duplicateOf._id || claim.duplicateOf}`}
              className="underline text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
            >
              View original claim <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* AI Classification */}
      <Section title="AI Classification" className="mt-4">
        {claim.aiUnavailable ? (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            AI review was unavailable. Deterministic validation results are authoritative.
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Suggested Category" value={effectiveCategory} />
              <Field
                label="Confidence"
                value={confidence !== null ? `${Math.round(confidence * 100)}%` : '—'}
              />
              <div>
                <dt className="text-xs font-medium text-gray-500 mb-1">Classification</dt>
                <dd className={`font-medium ${confidenceColor(confidence)}`}>
                  {confidenceLabel(confidence)}
                </dd>
              </div>
            </div>

            {claim.aiReason && (
              <div>
                <dt className="text-xs font-medium text-gray-500 mb-1">Classification Reason</dt>
                <dd className="text-gray-700">{claim.aiReason}</dd>
              </div>
            )}

            {claim.overriddenCategory && (
              <div className="mt-2 border border-blue-200 bg-blue-50 rounded px-3 py-2">
                <p className="text-xs font-medium text-blue-700 mb-0.5">Reviewer Override</p>
                <p className="text-sm text-blue-800">
                  AI classification was overridden to <strong>{claim.overriddenCategory}</strong>.
                </p>
                <p className="text-sm text-blue-700 mt-1">Reason: {claim.overrideReason}</p>
              </div>
            )}

            {claim.aiMissingInfo?.length > 0 && (
              <div>
                <dt className="text-xs font-medium text-gray-500 mb-1">Missing Information</dt>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                  {claim.aiMissingInfo.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Policy Check */}
      <Section title="Policy Check" className="mt-4">
        <ValidationChecks checks={claim.validationResults?.checks} />
      </Section>

      {/* Final Finding */}
      {claim.finalFinding && (
        <Section title="Final Finding" className="mt-4" aside={<StatusBadge status={claim.finalFinding} size="md" />}>
          {claim.findingExplanation && (
            <p className="text-sm text-gray-700">{claim.findingExplanation}</p>
          )}
          {claim.clarificationRequest && (
            <div className="mt-3 border-l-2 border-amber-400 pl-3 text-sm text-amber-800">
              <p className="font-medium mb-0.5">Clarification requested:</p>
              <p>{claim.clarificationRequest}</p>
            </div>
          )}
        </Section>
      )}

      {/* Policy Evidence */}
      {claim.policyEvidence && (
        <Section title="Policy Evidence" className="mt-4">
          <blockquote className="border-l-2 border-gray-300 pl-4 text-sm text-gray-700 italic">
            {claim.policyEvidence}
          </blockquote>
          {claim.policyReference && (
            <p className="mt-2 text-xs text-gray-400">Applicable category: {claim.policyReference}</p>
          )}
        </Section>
      )}

      {/* Reviewer Actions */}
      {!isResolved && (
        <Section title="Reviewer Actions" className="mt-4">
          <div className="flex flex-wrap gap-2">
            <button className="btn-success" onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? <Spinner size="sm" /> : null}
              Approve
            </button>
            <button className="btn-danger" onClick={() => setShowReject(true)} disabled={actionLoading}>
              Reject
            </button>
            <button className="btn-warning" onClick={() => setShowClarification(true)} disabled={actionLoading}>
              Request Clarification
            </button>
            {!claim.overriddenCategory && (
              <button className="btn-secondary" onClick={() => setShowOverride(true)} disabled={actionLoading}>
                Override Classification
              </button>
            )}
          </div>

          {/* Reject form */}
          {showReject && (
            <div className="mt-4 border border-gray-200 rounded p-4 space-y-3 bg-red-50">
              <p className="text-sm font-medium text-gray-800">Rejection Reason *</p>
              <textarea
                rows={3}
                className="input resize-none"
                placeholder="Explain why this claim is being rejected."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="btn-danger" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading}>
                  Confirm Rejection
                </button>
                <button className="btn-secondary" onClick={() => setShowReject(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Clarification form */}
          {showClarification && (
            <div className="mt-4 border border-gray-200 rounded p-4 space-y-3 bg-amber-50">
              <p className="text-sm font-medium text-gray-800">Clarification Message *</p>
              <textarea
                rows={3}
                className="input resize-none"
                placeholder="Describe what information is needed from the claimant."
                value={clarificationMsg}
                onChange={e => setClarificationMsg(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="btn-warning" onClick={handleClarification} disabled={!clarificationMsg.trim() || actionLoading}>
                  Send Request
                </button>
                <button className="btn-secondary" onClick={() => setShowClarification(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Override form */}
          {showOverride && (
            <div className="mt-4 border border-gray-200 rounded p-4 space-y-3">
              <p className="text-sm font-medium text-gray-800">Override AI Classification</p>
              <div>
                <label className="label">New Category *</label>
                <select className="input" value={overrideCategory} onChange={e => setOverrideCategory(e.target.value)}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Reason *</label>
                <textarea
                  rows={2}
                  className="input resize-none"
                  placeholder="Explain why the AI classification is incorrect."
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-primary"
                  onClick={handleOverride}
                  disabled={!overrideCategory || !overrideReason.trim() || actionLoading}
                >
                  Apply Override
                </button>
                <button className="btn-secondary" onClick={() => setShowOverride(false)}>Cancel</button>
              </div>
            </div>
          )}
        </Section>
      )}

      {isResolved && (
        <div className="mt-4 border border-gray-200 rounded p-4 text-sm text-gray-500 bg-gray-50">
          This claim was <strong>{claim.status.toLowerCase()}</strong> on {formatDateTime(claim.reviewedAt)}
          {claim.reviewedBy ? ` by ${claim.reviewedBy}.` : '.'}
        </div>
      )}

      <div className="mt-4">
        <Link to={`/claims/${id}/history`} className="text-sm text-gray-500 hover:text-gray-800 underline">
          View full review history →
        </Link>
      </div>
    </div>
  )
}

function Section({ title, children, aside, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200 rounded ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h2>
        {aside}
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-gray-900">{value || '—'}</dd>
    </div>
  )
}
