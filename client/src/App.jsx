import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import Claims from './pages/Claims'
import NewClaim from './pages/NewClaim'
import ClaimReview from './pages/ClaimReview'
import ClaimHistory from './pages/ClaimHistory'
import ReviewHistory from './pages/ReviewHistory'
import Policy from './pages/Policy'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="claims" element={<Claims />} />
        <Route path="claims/new" element={<NewClaim />} />
        <Route path="claims/:id" element={<ClaimReview />} />
        <Route path="claims/:id/history" element={<ClaimHistory />} />
        <Route path="history" element={<ReviewHistory />} />
        <Route path="policy" element={<Policy />} />
        <Route path="*" element={<div className="p-8 text-gray-500 text-sm">Page not found.</div>} />
      </Route>
    </Routes>
  )
}
