import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

export default function RiskFlags({ researchData, scoreData }) {
  const signals  = researchData?.early_warning_signals || []
  const positives = researchData?.positive_factors || []
  const litFlags = researchData?.litigation_flags || []

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        Risk Flags & EWS
      </p>

      {/* EWS Alerts */}
      {signals.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} style={{ color: '#f85149' }} />
            <span className="text-sm font-semibold" style={{ color: '#f85149' }}>
              Early Warning Signals ({signals.length})
            </span>
          </div>
          <ul className="space-y-1">
            {signals.map((s, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: '#f85149' }}>•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Litigation */}
      {litFlags.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(210,153,34,0.06)', border: '1px solid rgba(210,153,34,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Info size={15} style={{ color: '#d29922' }} />
            <span className="text-sm font-semibold" style={{ color: '#d29922' }}>
              Litigation Flags ({litFlags.length})
            </span>
          </div>
          <ul className="space-y-1">
            {litFlags.map((f, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: '#d29922' }}>•</span>{f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Positives */}
      {positives.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(63,185,80,0.06)', border: '1px solid rgba(63,185,80,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={15} style={{ color: '#3fb950' }} />
            <span className="text-sm font-semibold" style={{ color: '#3fb950' }}>
              Positive Factors ({positives.length})
            </span>
          </div>
          <ul className="space-y-1">
            {positives.map((p, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: '#3fb950' }}>•</span>{p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {signals.length === 0 && litFlags.length === 0 && (
        <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          No risk flags identified yet. Run research to populate this panel.
        </div>
      )}
    </div>
  )
}
