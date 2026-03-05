import { Shield } from 'lucide-react'

const C = { card: '#161b22', border: '#30363d', text: '#e6edf3', muted: '#8b949e', dim: '#484f58', blue: '#58a6ff', green: '#3fb950', red: '#f85149', orange: '#d29922' }

export default function Navbar({ companyName, companyId, decision }) {
  const ds = {
    APPROVE: { bg: 'rgba(63,185,80,0.15)',  color: '#3fb950', border: 'rgba(63,185,80,0.3)',  label: '✅ APPROVE' },
    REJECT:  { bg: 'rgba(248,81,73,0.15)',  color: '#f85149', border: 'rgba(248,81,73,0.3)',  label: '❌ REJECT' },
    REFER:   { bg: 'rgba(210,153,34,0.15)', color: '#d29922', border: 'rgba(210,153,34,0.3)', label: '⚠️ REFER' },
  }[decision] || null

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px', background: C.card, borderBottom: `1px solid ${C.border}`,
      position: 'sticky', top: 0, zIndex: 50, fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #58a6ff, #3fb950)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={16} color="white" />
        </div>
        <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>
          Intelli<span style={{ color: C.blue }}>Credit</span>
        </span>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{companyName || 'Loading...'}</p>
        <p style={{ fontSize: 11, fontFamily: 'monospace', color: C.dim }}>ID: {companyId}</p>
      </div>

      <div>
        {ds
          ? <span style={{ padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: ds.bg, color: ds.color, border: `1px solid ${ds.border}` }}>{ds.label}</span>
          : <span style={{ padding: '6px 16px', borderRadius: 999, fontSize: 12, background: '#0d1117', color: C.dim, border: `1px solid ${C.border}` }}>Pending</span>
        }
      </div>
    </nav>
  )
}
