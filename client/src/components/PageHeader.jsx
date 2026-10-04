export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
