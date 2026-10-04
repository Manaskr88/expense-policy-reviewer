export default function Spinner({ size = 'md', className = '' }) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-gray-600 ${sizeClass} ${className}`} />
  )
}
