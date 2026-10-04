import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, FileText, PlusSquare, Clock, BookOpen, Receipt } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/claims', icon: FileText, label: 'Claims' },
  { to: '/claims/new', icon: PlusSquare, label: 'New Claim' },
  { to: '/history', icon: Clock, label: 'Review History' },
  { to: '/policy', icon: BookOpen, label: 'Policy' },
]

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gray-700" />
            <div>
              <div className="text-sm font-semibold text-gray-900">Expense Review</div>
              <div className="text-xs text-gray-500">Policy Manager</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 text-sm rounded transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-400">Aggroso Assessment</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
