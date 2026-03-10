import React from 'react'
import { LayoutDashboard, FileText, Moon, Sun, LogOut } from 'lucide-react'
import OrbitLogo from '../assets/Orbit.png'

const Item = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
      active
        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
        : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
    }`}
  >
    <Icon size={18} />
    {label}
  </button>
)

export const Sidebar = ({ activeTab, setActiveTab, onLogoClick, isDark, toggleDark, user, onLogout }) => {
  const displayName = user?.name || 'Guest User'
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const roleName = {
    credit_analyst: 'Credit Analyst',
    senior_manager: 'Senior Manager',
    admin: 'Admin',
  }[user?.role] || 'Demo User'

  return (
  <aside className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col p-4 transition-colors duration-300">

    {/* Logo + Name */}
    <div className="flex items-center px-2 mb-8">
      <button onClick={onLogoClick} className="flex items-center gap-1.5 group">
        <img
          src={OrbitLogo}
          alt="Orbit"
          style={{ width: '52px', height: '52px', objectFit: 'contain' }}
          className="group-hover:scale-105 transition-transform duration-200"
        />
        <h1 className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">Orbit</h1>
      </button>
    </div>

    {/* Nav items */}
    <nav className="space-y-1 flex-1">
      <Item icon={LayoutDashboard} label="Dashboard"    active={activeTab === 'dashboard'}   onClick={() => setActiveTab('dashboard')} />
      <Item icon={FileText}        label="Applications" active={activeTab === 'application'} onClick={() => setActiveTab('application')} />
    </nav>

    {/* Bottom: theme toggle + user */}
    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-1">

      {/* Theme toggle */}
      <button
        onClick={toggleDark}
        className="flex items-center w-full gap-3 px-4 py-2.5 text-sm font-medium rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
      >
        {isDark
          ? <Sun size={18} className="text-amber-400" />
          : <Moon size={18} className="text-zinc-500" />
        }
        {isDark ? 'Light Mode' : 'Dark Mode'}
      </button>

      {/* Logout — only if logged in */}
      {user && (
        <button
          onClick={onLogout}
          className="flex items-center w-full gap-3 px-4 py-2.5 text-sm font-medium rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-200"
        >
          <LogOut size={18} />
          Log Out
        </button>
      )}

      {/* User */}
      <div className="flex items-center gap-3 px-2 py-2 mt-1">
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-900 dark:text-white">{displayName}</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{roleName}</p>
        </div>
      </div>
    </div>
  </aside>
  )
}
