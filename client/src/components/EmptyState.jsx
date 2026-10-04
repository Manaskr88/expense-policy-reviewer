import { FileText } from 'lucide-react'

export default function EmptyState({ title, description, action }) {
  return (
    <div className="text-center py-16">
      <FileText className="mx-auto h-10 w-10 text-gray-300 mb-3" />
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
