import { Globe, FileText, Scale, Building } from 'lucide-react'

export default function ResearchPanel({ researchData }) {
  if (!researchData || researchData.status === 'not_found') {
    return (
      <div className="rounded-xl p-5 text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        Research not yet run. Click "Run Research Agent" to populate this panel.
      </div>
    )
  }

  const sections = [
    { icon: <Building size={14} />, label: 'Promoter Background', text: researchData.promoter_background },
    { icon: <Globe size={14} />,    label: 'Sector Outlook',       text: researchData.sector_outlook },
    { icon: <Scale size={14} />,    label: 'Litigation Summary',   text: researchData.litigation_summary },
    { icon: <FileText size={14} />, label: 'Document Insights',    text: researchData.document_insights },
  ]

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        AI Research Findings
      </p>
      {sections.map((s, i) => s.text && (
        <div key={i} className="rounded-xl p-4" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent-blue)' }}>
            {s.icon}
            <span className="text-xs font-semibold uppercase tracking-wider">{s.label}</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {s.text}
          </p>
        </div>
      ))}
      {researchData.research_summary && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(88,166,255,0.06)', border: '1px solid rgba(88,166,255,0.2)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-blue)' }}>Executive Summary</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{researchData.research_summary}</p>
        </div>
      )}
    </div>
  )
}
