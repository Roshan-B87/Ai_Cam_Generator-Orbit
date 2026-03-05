import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  runResearch, getResearchResults, scoreCompany,
  getScore, generateCAM, downloadCAMUrl, getIngestStatus
} from '../api/client'
import {
  Shield, Play, BarChart3, FileText, StickyNote,
  Loader2, RefreshCw, FileDown, ArrowUpRight,
  CheckCircle2, Circle, Info, ChevronDown, AlertTriangle,
  Globe, Building, Scale, TrendingUp
} from 'lucide-react'

const C = {
  bg: '#0F172A', card: '#1E293B', border: '#334155',
  text: '#F1F5F9', muted: '#94A3B8', dim: '#475569',
  blue: '#58a6ff', green: '#4ADE80', red: '#F87171',
  orange: '#FB923C', yellow: '#FACC15', purple: '#A78BFA',
}

// ── Reusable Card ──
const Card = ({ children, style = {}, className = '' }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 24, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    ...style
  }}>
    {children}
  </div>
)

// ── Small Stat Card (like DisputeFox bottom cards) ──
const StatCard = ({ label, value, impact, color }) => {
  const impactColors = {
    High:   { bg: 'rgba(74,222,128,0.15)',  color: '#4ADE80' },
    Medium: { bg: 'rgba(250,204,21,0.15)',  color: '#FACC15' },
    Low:    { bg: 'rgba(251,146,60,0.15)',  color: '#FB923C' },
    Weak:   { bg: 'rgba(248,113,113,0.15)', color: '#F87171' },
  }
  const ic = impactColors[impact] || impactColors.Medium

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 20, padding: '16px 20px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      height: 120, boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{label}</span>
        <ArrowUpRight size={14} color={C.dim} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: color || C.text, fontFamily: 'monospace' }}>
          {value}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          background: ic.bg, color: ic.color,
        }}>
          {impact} impact
        </span>
      </div>
    </div>
  )
}

// ── Score Gauge (DisputeFox style) ──
const ScoreGauge = ({ score = 0, decision }) => {
  const pct = Math.min(Math.max(score, 0), 100) / 100
  const color = score >= 70 ? '#4ADE80' : score >= 50 ? '#FACC15' : '#F87171'
  const emoji = score >= 70 ? '😊' : score >= 50 ? '😐' : '😟'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 4 }}>
        {decision ? 'Decision Ready' : 'Credit Score'} {emoji}
      </h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>
        Based on Five Cs weighted scorecard
      </p>

      {/* Gauge tabs — Character/Capacity/Capital like TransUnion/Equifax */}
      <div style={{
        display: 'flex', background: 'rgba(15,23,42,0.6)',
        padding: 4, borderRadius: 999, marginBottom: 28, gap: 2,
      }}>
        {['Score', 'Five Cs', 'DSCR'].map(t => (
          <div key={t} style={{
            padding: '6px 16px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: t === 'Score' ? 'white' : 'transparent',
            color: t === 'Score' ? 'black' : C.muted,
            cursor: 'pointer',
          }}>{t}</div>
        ))}
      </div>

      {/* SVG Gauge */}
      <div style={{ position: 'relative', width: 260, height: 145 }}>
        <svg width="260" height="145" viewBox="0 0 260 145">
          <defs>
            <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#F87171" />
              <stop offset="50%"  stopColor="#FACC15" />
              <stop offset="100%" stopColor="#4ADE80" />
            </linearGradient>
          </defs>
          {/* Track */}
          <path d="M 25 130 A 105 105 0 0 1 235 130" fill="none" stroke="#1E3A5F" strokeWidth="18" strokeLinecap="round" />
          {/* Fill */}
          <path
            d="M 25 130 A 105 105 0 0 1 235 130"
            fill="none" stroke="url(#g1)" strokeWidth="18" strokeLinecap="round"
            strokeDasharray="329.9"
            strokeDashoffset={329.9 * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
          />
          {/* Tick labels */}
          {[0, 25, 50, 75, 100].map((v, i) => {
            const angle = -180 + (v / 100) * 180
            const rad = (angle * Math.PI) / 180
            const x = 130 + 118 * Math.cos(rad)
            const y = 130 + 118 * Math.sin(rad)
            return <text key={i} x={x} y={y} textAnchor="middle" fill="#475569" fontSize="10" fontFamily="monospace">{v}</text>
          })}
        </svg>

        {/* Center content */}
        <div style={{
          position: 'absolute', bottom: 8, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {score > 0 && (
            <div style={{
              background: '#4ADE80', color: '#000', fontSize: 10, fontWeight: 800,
              padding: '3px 10px', borderRadius: 999, marginBottom: 6,
            }}>
              ▲ Score Ready
            </div>
          )}
          <span style={{ fontSize: 64, fontWeight: 900, color: color, lineHeight: 1, fontFamily: 'monospace' }}>
            {score}
          </span>
          <span style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>out of 100</span>
        </div>
      </div>

      {/* Decision button */}
      <button style={{
        width: '100%', marginTop: 24, padding: '16px 24px', borderRadius: 999,
        background: decision === 'APPROVE' ? '#4ADE80' : decision === 'REJECT' ? '#F87171' : decision === 'REFER' ? '#FACC15' : '#0F172A',
        color: decision ? '#000' : C.muted,
        border: `1px solid ${C.border}`, fontSize: 14, fontWeight: 800,
        cursor: 'default', fontFamily: 'inherit',
      }}>
        {decision === 'APPROVE' ? '✅ APPROVED FOR LENDING'
          : decision === 'REJECT' ? '❌ APPLICATION REJECTED'
          : decision === 'REFER'  ? '⚠️ REFER TO COMMITTEE'
          : 'Run scoring to get decision'}
      </button>
    </div>
  )
}

// ── Step Timeline ──
const StepTimeline = ({ currentStep }) => {
  const steps = [
    { key: 'upload',   label: 'Docs Uploaded' },
    { key: 'parsing',  label: 'AI Parsing' },
    { key: 'research', label: 'Research Agent' },
    { key: 'scoring',  label: 'Credit Scoring' },
    { key: 'cam',      label: 'CAM Ready' },
  ]
  const idx = steps.findIndex(s => s.key === currentStep)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
      {steps.map((step, i) => {
        const done   = i < idx
        const active = i === idx
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#4ADE80' : active ? 'rgba(88,166,255,0.2)' : 'rgba(71,85,105,0.3)',
                border: `2px solid ${done ? '#4ADE80' : active ? C.blue : C.border}`,
                transition: 'all 0.4s',
              }}>
                {done
                  ? <CheckCircle2 size={16} color="#0F172A" />
                  : active
                    ? <Loader2 size={14} color={C.blue} style={{ animation: 'spin 1.5s linear infinite' }} />
                    : <Circle size={12} color={C.dim} />
                }
              </div>
              <p style={{
                fontSize: 11, marginTop: 8, textAlign: 'center', whiteSpace: 'nowrap',
                color: done ? '#4ADE80' : active ? C.blue : C.dim,
                fontWeight: active ? 700 : 400,
              }}>{step.label}</p>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 6px', marginBottom: 22, borderRadius: 2,
                background: i < idx ? '#4ADE80' : C.border,
                transition: 'background 0.5s',
              }} />
            )}
          </div>
        )
      })}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Five Cs Cards (DisputeFox SmallStatCard style) ──
const FiveCsGrid = ({ scoreData }) => {
  if (!scoreData) return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: C.dim, fontSize: 13 }}>
      Run scoring to see Five Cs breakdown
    </div>
  )

  const cs = [
    { label: 'Character',  key: 'character_score',  weight: '25%' },
    { label: 'Capacity',   key: 'capacity_score',   weight: '30%' },
    { label: 'Capital',    key: 'capital_score',     weight: '20%' },
    { label: 'Collateral', key: 'collateral_score',  weight: '15%' },
    { label: 'Conditions', key: 'conditions_score',  weight: '10%' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {cs.map(c => {
        const score = Math.round(scoreData[c.key] || 0)
        const impact = score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low'
        const color  = score >= 75 ? '#4ADE80' : score >= 50 ? '#FACC15' : '#F87171'
        return <StatCard key={c.key} label={`${c.label} (${c.weight})`} value={`${score}`} impact={impact} color={color} />
      })}
      {/* Overall spanning full width */}
      <div style={{
        gridColumn: '1 / -1',
        background: 'linear-gradient(135deg, rgba(74,222,128,0.1), rgba(88,166,255,0.1))',
        border: `1px solid rgba(74,222,128,0.3)`,
        borderRadius: 20, padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Overall Score</span>
        <span style={{ fontSize: 28, fontWeight: 900, color: '#4ADE80', fontFamily: 'monospace' }}>
          {Math.round(scoreData.overall_score || 0)}/100
        </span>
      </div>
    </div>
  )
}

// ── Action Button ──
const ActionBtn = ({ icon, label, isLoading, disabled, onClick, color }) => (
  <button onClick={onClick} disabled={disabled || isLoading}
    style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 700,
      background: disabled ? 'rgba(71,85,105,0.3)' : `${color}20`,
      border: `1px solid ${disabled ? C.border : color + '60'}`,
      color: disabled ? C.dim : color,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', transition: 'all 0.2s',
      whiteSpace: 'nowrap',
    }}>
    {isLoading ? <Loader2 size={14} style={{ animation: 'spin 1.5s linear infinite' }} /> : icon}
    {label}
  </button>
)

// ── Main Dashboard ──
export default function Dashboard() {
  const { companyId } = useParams()
  const navigate = useNavigate()

  const [companyInfo, setCompanyInfo] = useState({})
  const [ingestStatus, setIngestStatus] = useState(null)
  const [researchData, setResearchData] = useState(null)
  const [scoreData, setScoreData] = useState(null)
  const [currentStep, setCurrentStep] = useState('upload')
  const [loading, setLoading] = useState({})
  const [officerNotes, setOfficerNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [activeTab, setActiveTab] = useState('research')

  useEffect(() => {
    const stored = localStorage.getItem(`company_${companyId}`)
    if (stored) setCompanyInfo(JSON.parse(stored))
  }, [companyId])

  const pollIngest = useCallback(async () => {
    try {
      const res = await getIngestStatus(companyId)
      setIngestStatus(res.data)
      if (res.data.status === 'ready') { setCurrentStep('research'); return true }
      return false
    } catch { return false }
  }, [companyId])

  useEffect(() => {
    let timer
    const poll = async () => {
      const done = await pollIngest()
      if (!done) timer = setTimeout(poll, 3000)
    }
    poll()
    return () => clearTimeout(timer)
  }, [pollIngest])

  useEffect(() => {
    getScore(companyId).then(res => {
      if (res.data.decision !== 'NOT_SCORED') { setScoreData(res.data); setCurrentStep('cam') }
    }).catch(() => {})
    getResearchResults(companyId).then(res => {
      if (res.data.status === 'completed') {
        setResearchData(res.data)
        setCurrentStep(p => ['upload','parsing'].includes(p) ? 'scoring' : p)
      }
    }).catch(() => {})
  }, [companyId])

  const setLoad = (k, v) => setLoading(p => ({ ...p, [k]: v }))
  const isReady = ingestStatus?.status === 'ready'

  const handleResearch = async () => {
    setLoad('research', true); setCurrentStep('research')
    try {
      await runResearch(companyId, {
        company_name: companyInfo.company_name || 'Unknown',
        cin: companyInfo.cin || null,
        gstin: companyInfo.gstin || null,
      })
      const poll = async () => {
        const res = await getResearchResults(companyId)
        if (res.data.status === 'completed') {
          setResearchData(res.data); setCurrentStep('scoring'); setLoad('research', false)
        } else setTimeout(poll, 4000)
      }
      setTimeout(poll, 3000)
    } catch { setLoad('research', false) }
  }

  const handleScore = async () => {
    setLoad('scoring', true); setCurrentStep('scoring')
    try {
      const res = await scoreCompany({ company_id: companyId, include_qualitative: officerNotes.length > 0 })
      setScoreData(res.data); setCurrentStep('cam')
    } catch (e) { console.error(e) }
    setLoad('scoring', false)
  }

  const handleCAM = async () => {
    setLoad('cam', true)
    try { await generateCAM(companyId) } catch (e) { console.error(e) }
    setLoad('cam', false)
  }

  const tabs = [
    { key: 'research',    label: 'Research',    icon: <Globe size={13} /> },
    { key: 'flags',       label: 'Risk Flags',  icon: <AlertTriangle size={13} /> },
    { key: 'explanation', label: 'Explanation', icon: <Info size={13} /> },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text }}>

      {/* ── Navbar ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px', background: C.card,
        borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #58a6ff, #4ADE80)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={17} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17 }}>
            Intelli<span style={{ color: C.blue }}>Credit</span>
          </span>
        </div>

        {/* Nav items like DisputeFox */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['Dashboard', 'Research', 'Scoring', 'CAM Report', 'History'].map((item, i) => (
            <div key={item} style={{
              padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: i === 0 ? 'white' : 'transparent',
              color: i === 0 ? 'black' : C.muted,
            }}>{item}</div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {scoreData?.decision && (
            <span style={{
              padding: '7px 18px', borderRadius: 999, fontSize: 13, fontWeight: 800,
              background: scoreData.decision === 'APPROVE' ? 'rgba(74,222,128,0.2)' : scoreData.decision === 'REJECT' ? 'rgba(248,113,113,0.2)' : 'rgba(250,204,21,0.2)',
              color: scoreData.decision === 'APPROVE' ? '#4ADE80' : scoreData.decision === 'REJECT' ? '#F87171' : '#FACC15',
              border: `1px solid ${scoreData.decision === 'APPROVE' ? 'rgba(74,222,128,0.4)' : scoreData.decision === 'REJECT' ? 'rgba(248,113,113,0.4)' : 'rgba(250,204,21,0.4)'}`,
            }}>
              {scoreData.decision === 'APPROVE' ? '✅' : scoreData.decision === 'REJECT' ? '❌' : '⚠️'} {scoreData.decision}
            </span>
          )}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #58a6ff, #4ADE80)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#0F172A',
          }}>
            {(companyInfo.company_name || 'IC')[0].toUpperCase()}
          </div>
        </div>
      </nav>

      {/* ── Timeline strip ── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '16px 32px' }}>
        <StepTimeline currentStep={currentStep} />
      </div>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24 }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status + Actions row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            {/* Status badges */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'Company', value: companyInfo.company_name || companyId, color: C.blue },
                { label: 'Docs', value: `${ingestStatus?.parsed_docs?.length || 0} files`, color: C.green },
                { label: 'Status', value: ingestStatus?.status || '...', color: isReady ? C.green : C.orange },
                { label: 'RAG', value: ingestStatus?.rag_ready ? 'Built ✓' : 'Pending', color: ingestStatus?.rag_ready ? C.green : C.dim },
              ].map(b => (
                <div key={b.label} style={{
                  padding: '7px 14px', borderRadius: 999,
                  background: 'rgba(30,41,59,0.8)', border: `1px solid ${C.border}`,
                  display: 'flex', gap: 6, alignItems: 'center', fontSize: 12,
                }}>
                  <span style={{ color: C.dim }}>{b.label}:</span>
                  <span style={{ color: b.color, fontWeight: 700, fontFamily: 'monospace' }}>{b.value}</span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ActionBtn icon={<Play size={13} />} label="Run Research" isLoading={loading.research} disabled={!isReady || loading.research} onClick={handleResearch} color={C.blue} />
              <ActionBtn icon={<BarChart3 size={13} />} label="Score" isLoading={loading.scoring} disabled={!researchData || loading.scoring} onClick={handleScore} color={C.green} />
              <ActionBtn icon={<FileText size={13} />} label="Generate CAM" isLoading={loading.cam} disabled={!scoreData || loading.cam} onClick={handleCAM} color={C.purple} />
              <ActionBtn icon={<StickyNote size={13} />} label="Officer Notes" onClick={() => setShowNotes(p => !p)} color={C.orange} />
            </div>
          </div>

          {/* Officer Notes */}
          {showNotes && (
            <Card>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Officer Field Observations</p>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Site visit notes — AI adjusts scores based on observations.</p>
              <textarea
                value={officerNotes}
                onChange={e => setOfficerNotes(e.target.value)}
                placeholder="e.g. Factory at 40% capacity. Management evasive during interview. Strong order book visible..."
                rows={3}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12,
                  background: C.bg, border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 13, outline: 'none', resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </Card>
          )}

          {/* Company header card — like DisputeFox "Hello Alex" for company */}
          <Card style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', padding: '24px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: C.dim, textTransform: 'uppercase', marginBottom: 6 }}>
                  Credit Appraisal
                </p>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                  {companyInfo.company_name || 'Company'}
                </h2>
                <p style={{ fontSize: 13, color: C.muted }}>
                  ID: <span style={{ color: C.blue, fontFamily: 'monospace' }}>{companyId}</span>
                  {companyInfo.cin && <span style={{ marginLeft: 16 }}>CIN: <span style={{ color: C.muted, fontFamily: 'monospace' }}>{companyInfo.cin}</span></span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { label: 'EWS Alerts', value: researchData?.early_warning_signals?.length || 0, color: '#F87171', bg: 'rgba(248,113,113,0.15)' },
                  { label: 'Litigation', value: researchData?.litigation_flags?.length || 0, color: '#FACC15', bg: 'rgba(250,204,21,0.15)' },
                  { label: 'Positives',  value: researchData?.positive_factors?.length || 0,  color: '#4ADE80', bg: 'rgba(74,222,128,0.15)' },
                ].map(b => (
                  <div key={b.label} style={{
                    textAlign: 'center', padding: '12px 18px', borderRadius: 16,
                    background: b.bg, border: `1px solid ${b.color}40`,
                  }}>
                    <p style={{ fontSize: 24, fontWeight: 900, color: b.color }}>{b.value}</p>
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{b.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Financial summary table — DisputeFox table style */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Appraisal Summary</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Metric', 'Value', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 24px', fontSize: 11, fontWeight: 600, color: C.dim, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: 'Overall Credit Score', value: scoreData?.overall_score ? `${scoreData.overall_score}/100` : '—', status: scoreData?.overall_score >= 70 ? 'good' : scoreData?.overall_score >= 50 ? 'warn' : 'neutral' },
                  { metric: 'DSCR', value: scoreData?.dscr ? scoreData.dscr.toFixed(2) : '—', status: scoreData?.dscr >= 1.25 ? 'good' : scoreData?.dscr > 0 ? 'warn' : 'neutral' },
                  { metric: 'Recommended Loan', value: scoreData?.recommended_amount ? `₹${Number(scoreData.recommended_amount).toLocaleString('en-IN')}` : '—', status: 'blue' },
                  { metric: 'Interest Rate', value: scoreData?.interest_rate || '—', status: 'neutral' },
                  { metric: 'Research Risk', value: researchData?.overall_research_risk || '—', status: researchData?.overall_research_risk === 'LOW' ? 'good' : researchData?.overall_research_risk === 'HIGH' ? 'bad' : 'warn' },
                ].map((row, i) => {
                  const statusColors = { good: '#4ADE80', warn: '#FACC15', bad: '#F87171', blue: C.blue, neutral: C.muted }
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '14px 24px', fontSize: 13, color: C.muted }}>{row.metric}</td>
                      <td style={{ padding: '14px 24px', fontSize: 14, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>{row.value}</td>
                      <td style={{ padding: '14px 24px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[row.status] || C.dim }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>

          {/* Tabs — Research / Risk Flags / Explanation */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '14px 22px', fontSize: 13, fontWeight: 600,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: activeTab === t.key ? C.blue : C.muted,
                    borderBottom: activeTab === t.key ? `2px solid ${C.blue}` : '2px solid transparent',
                    fontFamily: 'inherit', transition: 'color 0.2s',
                  }}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
            <div style={{ padding: 24 }}>
              {activeTab === 'research' && <ResearchPanel data={researchData} />}
              {activeTab === 'flags'    && <RiskFlagsPanel data={researchData} />}
              {activeTab === 'explanation' && (
                <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: C.muted, lineHeight: 1.8 }}>
                  {scoreData?.explanation || 'Run scoring to see full explanation.'}
                </pre>
              )}
            </div>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Score Card — main DisputeFox right panel */}
          <Card style={{ background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)', padding: 32 }}>
            <ScoreGauge score={Math.round(scoreData?.overall_score || 0)} decision={scoreData?.decision} />
          </Card>

          {/* Five Cs grid */}
          <Card>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.dim, marginBottom: 16 }}>
              Five Cs Breakdown
            </p>
            <FiveCsGrid scoreData={scoreData} />
          </Card>

          {/* CAM Download */}
          {scoreData && (
            <Card>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.dim, marginBottom: 16 }}>
                Download CAM Report
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a href={downloadCAMUrl(companyId, 'pdf')} target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px 20px', borderRadius: 999, textDecoration: 'none',
                    background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                    color: '#F87171', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}>
                  <FileDown size={15} /> Download PDF Report
                </a>
                <a href={downloadCAMUrl(companyId, 'docx')} target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px 20px', borderRadius: 999, textDecoration: 'none',
                    background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.3)',
                    color: C.blue, fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}>
                  <FileDown size={15} /> Download Word (.docx)
                </a>
              </div>
            </Card>
          )}

          {/* New Appraisal */}
          <button onClick={() => navigate('/')}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 999,
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.dim, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}>
            <RefreshCw size={14} /> Start New Appraisal
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        textarea::placeholder { color: #475569; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

// ── Research Panel ──
function ResearchPanel({ data }) {
  if (!data || data.status === 'not_found') return (
    <p style={{ fontSize: 13, color: '#475569' }}>Research not yet run. Click "Run Research" to populate this panel.</p>
  )
  const sections = [
    { icon: <Building size={13} />, label: 'Promoter Background', text: data.promoter_background },
    { icon: <Globe size={13} />,    label: 'Sector Outlook',       text: data.sector_outlook },
    { icon: <Scale size={13} />,    label: 'Litigation Summary',   text: data.litigation_summary },
    { icon: <FileText size={13} />, label: 'Document Insights',    text: data.document_insights },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.research_summary && (
        <div style={{ padding: 16, borderRadius: 14, background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.2)', marginBottom: 4 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#58a6ff', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Executive Summary</p>
          <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.7 }}>{data.research_summary}</p>
        </div>
      )}
      {sections.map((s, i) => s.text && (
        <div key={i} style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#58a6ff' }}>
            {s.icon}
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
          </div>
          <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.7 }}>{s.text}</p>
        </div>
      ))}
    </div>
  )
}

// ── Risk Flags Panel ──
function RiskFlagsPanel({ data }) {
  const signals  = data?.early_warning_signals || []
  const lit      = data?.litigation_flags || []
  const positive = data?.positive_factors || []

  if (!signals.length && !lit.length) return (
    <p style={{ fontSize: 13, color: '#475569' }}>No risk flags identified. Run research to populate.</p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {signals.length > 0 && (
        <div style={{ padding: 16, borderRadius: 14, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <AlertTriangle size={14} color="#F87171" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F87171' }}>Early Warning Signals ({signals.length})</span>
          </div>
          {signals.map((s, i) => <p key={i} style={{ fontSize: 13, color: '#94A3B8', marginBottom: 4 }}>• {s}</p>)}
        </div>
      )}
      {lit.length > 0 && (
        <div style={{ padding: 16, borderRadius: 14, background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Scale size={14} color="#FACC15" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#FACC15' }}>Litigation Flags ({lit.length})</span>
          </div>
          {lit.map((f, i) => <p key={i} style={{ fontSize: 13, color: '#94A3B8', marginBottom: 4 }}>• {f}</p>)}
        </div>
      )}
      {positive.length > 0 && (
        <div style={{ padding: 16, borderRadius: 14, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <CheckCircle2 size={14} color="#4ADE80" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4ADE80' }}>Positive Factors ({positive.length})</span>
          </div>
          {positive.map((p, i) => <p key={i} style={{ fontSize: 13, color: '#94A3B8', marginBottom: 4 }}>• {p}</p>)}
        </div>
      )}
    </div>
  )
}
