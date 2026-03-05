export default function ScoreGauge({ score = 0, decision }) {
  // SVG arc gauge — same style as DisputeFox
  const radius = 80
  const circumference = Math.PI * radius  // half circle
  const pct = Math.min(Math.max(score, 0), 100) / 100
  const offset = circumference * (1 - pct)

  const getColor = (s) => {
    if (s >= 70) return '#3fb950'
    if (s >= 50) return '#d29922'
    return '#f85149'
  }

  const getEmoji = (s) => {
    if (s >= 70) return '😊'
    if (s >= 50) return '😐'
    return '😟'
  }

  const color = getColor(score)

  return (
    <div className="flex flex-col items-center py-6">
      <p className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Credit Score {getEmoji(score)}
      </p>
      <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Based on Five Cs weighted scorecard
      </p>

      {/* Gauge */}
      <div className="relative" style={{ width: 220, height: 120 }}>
        <svg width="220" height="120" viewBox="0 0 220 120">
          {/* Background arc */}
          <path
            d="M 20 110 A 90 90 0 0 1 200 110"
            fill="none"
            stroke="#30363d"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Colored arc — gradient */}
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#f85149" />
              <stop offset="50%"  stopColor="#d29922" />
              <stop offset="100%" stopColor="#3fb950" />
            </linearGradient>
          </defs>
          <path
            d="M 20 110 A 90 90 0 0 1 200 110"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${circumference * (1 - pct)}`}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
          />
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((val, i) => {
            const angle = -180 + (val / 100) * 180
            const rad = (angle * Math.PI) / 180
            const cx = 110 + 90 * Math.cos(rad)
            const cy = 110 + 90 * Math.sin(rad)
            return <circle key={i} cx={cx} cy={cy} r="2" fill="#484f58" />
          })}
        </svg>

        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
          <span className="text-5xl font-bold font-mono" style={{ color, lineHeight: 1 }}>
            {score}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>out of 100</span>
        </div>

        {/* Min/Max labels */}
        <span className="absolute bottom-0 left-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>0</span>
        <span className="absolute bottom-0 right-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>100</span>
      </div>

      {/* Decision button */}
      {decision && (
        <div className="mt-5 w-full px-6">
          <div className="py-3 rounded-xl text-center font-bold text-sm"
            style={{
              background: decision === 'APPROVE' ? 'rgba(63,185,80,0.15)' : decision === 'REJECT' ? 'rgba(248,81,73,0.15)' : 'rgba(210,153,34,0.15)',
              color: decision === 'APPROVE' ? '#3fb950' : decision === 'REJECT' ? '#f85149' : '#d29922',
              border: `1px solid ${decision === 'APPROVE' ? 'rgba(63,185,80,0.4)' : decision === 'REJECT' ? 'rgba(248,81,73,0.4)' : 'rgba(210,153,34,0.4)'}`,
            }}>
            {decision === 'APPROVE' ? '✅ APPROVED' : decision === 'REJECT' ? '❌ REJECTED' : '⚠️ REFER TO COMMITTEE'}
          </div>
        </div>
      )}
    </div>
  )
}
