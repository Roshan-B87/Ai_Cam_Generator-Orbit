const CS = [
  { key: 'character_score',  label: 'Character',  weight: '25%', desc: 'Promoter integrity & litigation' },
  { key: 'capacity_score',   label: 'Capacity',   weight: '30%', desc: 'DSCR, revenue, EBITDA margin' },
  { key: 'capital_score',    label: 'Capital',    weight: '20%', desc: 'Net worth & leverage ratio' },
  { key: 'collateral_score', label: 'Collateral', weight: '15%', desc: 'Security coverage ratio' },
  { key: 'conditions_score', label: 'Conditions', weight: '10%', desc: 'Sector outlook & macro' },
]

function ImpactBadge({ score }) {
  if (score >= 75) return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ background: 'rgba(63,185,80,0.15)', color: '#3fb950' }}>Strong</span>
  )
  if (score >= 50) return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ background: 'rgba(210,153,34,0.15)', color: '#d29922' }}>Moderate</span>
  )
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ background: 'rgba(248,81,73,0.15)', color: '#f85149' }}>Weak</span>
  )
}

function ScoreBar({ score }) {
  const color = score >= 75 ? '#3fb950' : score >= 50 ? '#d29922' : '#f85149'
  return (
    <div className="h-1.5 rounded-full mt-2" style={{ background: 'var(--bg-primary)' }}>
      <div className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${score}%`, background: color }} />
    </div>
  )
}

export default function FiveCsCards({ scoreData }) {
  if (!scoreData) return null

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        Five Cs Assessment
      </p>
      <div className="grid grid-cols-1 gap-2">
        {CS.map(c => {
          const score = Math.round(scoreData[c.key] || 0)
          return (
            <div key={c.key} className="rounded-xl px-4 py-3 transition-colors"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{c.label}</span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                    {c.weight}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <ImpactBadge score={score} />
                  <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                    {score}<span style={{ color: 'var(--text-muted)', fontSize: 11 }}>/100</span>
                  </span>
                </div>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{c.desc}</p>
              <ScoreBar score={score} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
