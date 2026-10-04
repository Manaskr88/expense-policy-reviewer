import { CheckCircle, XCircle } from 'lucide-react'

export default function ValidationChecks({ checks }) {
  if (!checks || checks.length === 0) return null

  return (
    <div className="space-y-2">
      {checks.map((check, i) => (
        <div key={i} className="flex items-start gap-2.5 text-sm">
          {check.passed
            ? <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            : <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          }
          <div>
            <span className={`font-medium ${check.passed ? 'text-gray-700' : 'text-red-700'}`}>
              {check.name}
            </span>
            <span className="text-gray-500"> — {check.message}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
