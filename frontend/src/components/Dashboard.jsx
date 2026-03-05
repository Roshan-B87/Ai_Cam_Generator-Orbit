import React from 'react'
import { TrendingUp, Info, ChevronRight, Plus, ShieldCheck, Activity, AlertTriangle } from 'lucide-react'

const STATUS = {
  'In Review':    'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  'Recommended':  'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  'Rejected':     'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
  'Pending Data': 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  'ready':        'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  'completed':    'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  'APPROVE':      'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  'REJECT':       'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
  'REFER':        'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
}

const MOCK = [
  { id: '1', company_name: 'TechNova Solutions Pvt Ltd', industry: 'IT Services',      status: 'In Review',    score: 72, limit: '₹50 Cr' },
  { id: '2', company_name: 'GreenField Agro Exports',   industry: 'Agriculture',       status: 'Pending Data', score: null, limit: '—' },
  { id: '3', company_name: 'BlueWave Logistics',        industry: 'Transportation',    status: 'Recommended',  score: 85, limit: '₹120 Cr' },
  { id: '4', company_name: 'Solaris Manufacturing',     industry: 'Renewable Energy',  status: 'Rejected',     score: 45, limit: '₹0' },
]

export const Dashboard = ({ liveApps, onSelect, onNew }) => {
  const apps = [...liveApps, ...MOCK]
  const scoredApps = apps.filter(a => a.score || a.overall_score)
  const avgScore = scoredApps.length ? Math.round(scoredApps.reduce((s, a) => s + (a.score || a.overall_score || 0), 0) / scoredApps.length) : 0

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">Credit Appraisal Dashboard</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">AI-powered corporate lending platform with Indian financial ratio analysis.</p>
        </div>
        <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-sm">
          <Plus size={16} /> New Application
        </button>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Active Reviews',        value: String(apps.length), sub: `${liveApps.length} live applications`,  icon: Activity, pos: true },
          { label: 'Avg. Risk Score',        value: avgScore ? `${avgScore}/100` : '—', sub: avgScore >= 70 ? 'Portfolio health: Good' : avgScore >= 50 ? 'Portfolio health: Fair' : 'Needs review', icon: ShieldCheck, pos: avgScore >= 60 },
          { label: 'Avg. Processing Time',   value: '4.2 Days', sub: '-15% efficiency gain', icon: TrendingUp, pos: true },
          { label: 'Alerts',                 value: String(apps.filter(a => (a.score || a.overall_score || 0) < 50).length), sub: 'Applications below threshold', icon: AlertTriangle, pos: false },
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{k.label}</p>
              <k.icon size={16} className="text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="text-3xl font-bold">{k.value}</p>
            <div className={`mt-3 flex items-center gap-2 text-xs font-medium ${k.pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {k.pos ? <TrendingUp size={12} /> : <Info size={12} />}
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="font-semibold">Recent Applications</h3>
          <span className="text-xs text-zinc-400">{apps.length} total</span>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider font-semibold">
            <tr>
              {['Company Name','Industry','Status','Risk Score','Decision','Proposed Limit',''].map(h => (
                <th key={h} className="px-6 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {apps.map((a, i) => {
              const score = a.score ?? a.overall_score
              const decision = a.decision || (score >= 70 ? 'APPROVE' : score >= 50 ? 'REFER' : score ? 'REJECT' : null)
              return (
                <tr key={i} onClick={() => onSelect(a)} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">{a.company_name || a.name}</td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{a.industry || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-xs font-medium border rounded-full ${STATUS[a.status] || STATUS['Pending Data']}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {score ? (
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${score > 70 ? 'bg-emerald-500' : score > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${score}%` }} />
                        </div>
                        <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">{Math.round(score)}</span>
                      </div>
                    ) : <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    {decision ? (
                      <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-full ${STATUS[decision] || ''}`}>
                        {decision}
                      </span>
                    ) : <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-900 dark:text-white">{a.limit || a.recommended_amount || '—'}</td>
                  <td className="px-6 py-4">
                    <ChevronRight size={16} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
