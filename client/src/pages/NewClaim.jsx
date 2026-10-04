import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'

const CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Client Entertainment', 'Office Supplies', 'Communication', 'Other']
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED']

const initialForm = {
  claimant: '',
  date: new Date().toISOString().split('T')[0],
  category: '',
  amount: '',
  currency: 'INR',
  description: '',
  receiptAvailable: false,
}

export default function NewClaim() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const navigate = useNavigate()

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  function validate() {
    const errs = {}
    if (!form.claimant.trim()) errs.claimant = 'Claimant name is required.'
    if (!form.date) errs.date = 'Date is required.'
    if (!form.category) errs.category = 'Category is required.'
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) errs.amount = 'Enter a valid positive amount.'
    if (!form.currency) errs.currency = 'Currency is required.'
    if (!form.description.trim()) errs.description = 'Description is required.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const claim = await api.createClaim({
        ...form,
        amount: Number(form.amount),
        receiptAvailable: form.receiptAvailable,
      })
      navigate(`/claims/${claim._id}`)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New Claim"
        description="Submit an expense claim for policy review."
      />

      <form onSubmit={handleSubmit} noValidate className="bg-white border border-gray-200 rounded p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="claimant" className="label">Claimant *</label>
            <input
              id="claimant"
              name="claimant"
              type="text"
              className={`input ${errors.claimant ? 'border-red-400' : ''}`}
              value={form.claimant}
              onChange={handleChange}
              placeholder="Full name"
              autoComplete="name"
            />
            {errors.claimant && <p className="mt-1 text-xs text-red-600">{errors.claimant}</p>}
          </div>

          <div>
            <label htmlFor="date" className="label">Date *</label>
            <input
              id="date"
              name="date"
              type="date"
              className={`input ${errors.date ? 'border-red-400' : ''}`}
              value={form.date}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="category" className="label">Category *</label>
          <select
            id="category"
            name="category"
            className={`input ${errors.category ? 'border-red-400' : ''}`}
            value={form.category}
            onChange={handleChange}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
          <p className="mt-1 text-xs text-gray-400">AI will verify or suggest a more accurate category based on your description.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="label">Amount *</label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              className={`input ${errors.amount ? 'border-red-400' : ''}`}
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
            />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
          </div>

          <div>
            <label htmlFor="currency" className="label">Currency *</label>
            <select
              id="currency"
              name="currency"
              className="input"
              value={form.currency}
              onChange={handleChange}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="label">Description *</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className={`input resize-none ${errors.description ? 'border-red-400' : ''}`}
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the expense, business purpose, and any relevant context."
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
          <p className="mt-1 text-xs text-gray-400">
            For categories like Client Entertainment, include the client name and business purpose.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="receiptAvailable"
            name="receiptAvailable"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
            checked={form.receiptAvailable}
            onChange={handleChange}
          />
          <label htmlFor="receiptAvailable" className="text-sm text-gray-700">
            Receipt is available
          </label>
        </div>

        {submitError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {submitError}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? <><Spinner size="sm" /> Running review…</> : 'Submit & Review Claim'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/claims')} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
