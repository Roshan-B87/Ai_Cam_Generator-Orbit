import React, { useState, useEffect } from 'react'
import { LandingPage } from './components/LandingPage'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { ApplicationFlow } from './components/ApplicationFlow'

export default function App() {
  const [showApp, setShowApp]   = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selected, setSelected] = useState(null)
  const [isDark, setIsDark]     = useState(true)
  const [liveApps, setLiveApps] = useState([])

  // Apply / remove dark class on <html> whenever isDark changes
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const toggleDark = () => setIsDark(p => !p)

  const handleCreated = (app) => {
    setLiveApps(p => [app, ...p])
    setSelected(app)
    setActiveTab('application')
  }

  if (!showApp) {
    return (
      <LandingPage
        onStart={() => setShowApp(true)}
        isDark={isDark}
        toggleDark={toggleDark}
      />
    )
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-zinc-950 text-zinc-900 dark:text-white font-sans overflow-hidden transition-colors duration-300">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogoClick={() => setShowApp(false)}
        isDark={isDark}
        toggleDark={toggleDark}
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
