import React, { useState } from 'react'
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react'
import { login, signup } from '../api/client'
import { useAuth } from '../context/AuthContext'
import OrbitLogo from '../assets/Orbit.png'

export const AuthPage = ({ onBack, isDark, toggleDark }) => {
  const { loginUser } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'credit_analyst',
    organization: '',
  })

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError('') }

  const ROLES = [
    { value: 'credit_analyst', label: 'Credit Analyst' },
    { value: 'senior_manager', label: 'Senior Manager' },
    { value: 'admin', label: 'Admin' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let res
      if (mode === 'signup') {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return }
        if (!form.email.trim()) { setError('Email is required'); setLoading(false); return }
        if (form.password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return }
        res = await signup({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          organization: form.organization || null,
        })
      } else {
        if (!form.email.trim() || !form.password.trim()) { setError('Email and password are required'); setLoading(false); return }
        res = await login({ email: form.email, password: form.password })
      }
      loginUser(res.data.token, res.data.user)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center p-4 transition-colors duration-300">

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Home
      </button>

      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src={OrbitLogo} alt="Orbit" className="w-12 h-12 object-contain" />
          <span className="font-bold text-2xl tracking-tight text-zinc-900 dark:text-white">Orbit</span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">

          {/* Tab switcher */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 mb-8">
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  mode === m
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name — signup only */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Rahul Mishra"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/20 transition-all"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/20 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-3 pr-12 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Role + Org — signup only */}
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={e => set('role', e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/20 transition-all"
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Organization <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.organization}
                    onChange={e => set('organization', e.target.value)}
                    placeholder="HDFC Bank"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/20 transition-all"
                  />
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-sm text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>

          {/* Switch mode */}
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="font-semibold text-zinc-900 dark:text-white hover:underline"
            >
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
