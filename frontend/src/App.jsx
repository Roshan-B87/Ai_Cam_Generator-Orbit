import React, { useState, useEffect } from 'react'
import { LandingPage } from './components/LandingPage'
import { AuthPage } from './components/AuthPage'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { ApplicationFlow } from './components/ApplicationFlow'
import { AuthProvider, useAuth } from './context/AuthContext'

function AppContent() {
  const { user, loading, logout } = useAuth()
  const [page, setPage]           = useState('landing')   // 'landing' | 'auth' | 'app'
  const [activeTab, setActiveTab]  = useState('dashboard')
  const [selected, setSelected]    = useState(null)
  const [isDark, setIsDark]        = useState(true)
  const [liveApps, setLiveApps]    = useState([])

  // Apply / remove dark class on <html> whenever isDark changes
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  // When user logs in (token validated), stay on current page
  // If user was on auth page and just logged in, go to app
  useEffect(() => {
    if (user && page === 'auth') setPage('app')
  }, [user])

  const toggleDark = () => setIsDark(p => !p)

  const handleCreated = (app) => {
    setLiveApps(p => [app, ...p])
    setSelected(app)
    setActiveTab('application')
  }

  const handleLogout = () => {
    logout()
    setPage('landing')
    setActiveTab('dashboard')
    setSelected(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // Landing page
  if (page === 'landing') {
    return (
      <LandingPage
        onStart={() => setPage('app')}
        onLogin={() => setPage('auth')}
        isDark={isDark}
        toggleDark={toggleDark}
        isLoggedIn={!!user}
      />
    )
  }

  // Auth page (login/signup)
  if (page === 'auth') {
    return (
      <AuthPage
        onBack={() => setPage('landing')}
        isDark={isDark}
        toggleDark={toggleDark}
      />
    )
  }

  // Main app
  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-zinc-950 text-zinc-900 dark:text-white font-sans overflow-hidden transition-colors duration-300">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogoClick={() => setPage('landing')}
        isDark={isDark}
        toggleDark={toggleDark}
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <Dashboard
            liveApps={liveApps}
            onSelect={(app) => { setSelected(app); setActiveTab('application') }}
            onNew={() => { setSelected(null); setActiveTab('application') }}
          />
        )}
        {activeTab === 'application' && (
          <ApplicationFlow
            application={selected}
            onBack={() => setActiveTab('dashboard')}
            onCreated={handleCreated}
            isDark={isDark}
          />
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
