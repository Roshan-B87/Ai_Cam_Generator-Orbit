export default function FinancialTable({ scoreData, researchData }) {
  const dscr = scoreData?.dscr || 0

  const rows = [
    { label: 'Overall Credit Score', value: scoreData?.overall_score ? `${scoreData.overall_score}/100` : '—', highlight: true },
    { label: 'DSCR', value: dscr ? dscr.toFixed(2) : '—', status: dscr >= 1.25 ? 'good' : dscr > 0 ? 'warn' : 'neutral' },
    { label: 'Recommended Amount', value: scoreData?.recommended_amount ? `₹${Number(scoreData.recommended_amount).toLocaleString('en-IN')}` : '—' },
    { label: 'Interest Rate', value: scoreData?.interest_rate || '—' },
    { label: 'Research Risk Level', value: researchData?.overall_research_risk || '—',
      status: researchData?.overall_research_risk === 'LOW' ? 'good' : researchData?.overall_research_risk === 'HIGH' ? 'bad' : 'warn' },
    { label: 'Sector Outlook', value: researchData?.sector_outlook?.slice(0, 60) + '...' || '—' },
    { label: 'MCA Compliance', value: researchData?.mca_compliance?.slice(0, 60) + '...' || '—' },
  ]

  const statusColor = {
    good:    { color: '#3fb950' },
    warn:    { color: '#d29922' },
    bad:     { color: '#f85149' },
    neutral: { color: 'var(--text-secondary)' },
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        Appraisal Summary
      </p>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3"
            style={{
              borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
              background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-primary)',
            }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
            <span className="text-sm font-semibold font-mono text-right max-w-[55%] truncate"
              style={row.status ? statusColor[row.status] : row.highlight ? { color: 'var(--accent-blue)' } : { color: 'var(--text-primary)' }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
