const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = data.error || data.message || `Request failed: ${res.status}`
    throw new Error(message)
  }

  return data
}

export const api = {
  // Dashboard
  getDashboardStats: () => request('/api/dashboard/stats'),
  getFullHistory: (page = 1) => request(`/api/dashboard/history?page=${page}&limit=50`),

  // Claims
  getClaims: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString()
    return request(`/api/claims${qs ? '?' + qs : ''}`)
  },
  getClaimById: (id) => request(`/api/claims/${id}`),
  createClaim: (data) => request('/api/claims', { method: 'POST', body: JSON.stringify(data) }),

  // Reviewer actions
  approveClaim: (id, body) => request(`/api/claims/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }),
  rejectClaim: (id, body) => request(`/api/claims/${id}/reject`, { method: 'POST', body: JSON.stringify(body) }),
  requestClarification: (id, body) => request(`/api/claims/${id}/clarification`, { method: 'POST', body: JSON.stringify(body) }),
  overrideClassification: (id, body) => request(`/api/claims/${id}/override`, { method: 'POST', body: JSON.stringify(body) }),
  getClaimHistory: (id) => request(`/api/claims/${id}/history`),

  // Policies
  getPolicies: () => request('/api/policies'),
}
