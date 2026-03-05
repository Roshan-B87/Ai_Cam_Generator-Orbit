import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronRight, FileUp, Search, BarChart3, ShieldCheck, FileText,
  CheckCircle2, Upload, Globe, Scale, AlertCircle, ExternalLink,
  TrendingUp, Download, MessageSquareText, X, Loader2, Plus,
  Activity, IndianRupee, Landmark, PieChart, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { uploadDocuments, getIngestStatus, runResearch, getResearchResults, scoreCompany, getScore, generateCAM, downloadCAMUrl, explainDecision, runWhatIf, ingestFromDatabricks, submitOfficerNotes, getMCALookup, getExtractedTables } from '../api/client'
import MCAPanel from './MCAPanel'

// ── Toast ──────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed bottom-8 right-8 px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 border animate-in slide-in-from-bottom-4 ${
    type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' :
    type === 'error'   ? 'bg-rose-600 border-rose-500 text-white' :
                         'bg-zinc-900 border-zinc-700 text-white'
  }`}>
    {type === 'loading' ? <Loader2 size={16} className="animate-spin" /> : type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
    <span className="text-sm font-medium">{message}</span>
    <button onClick={onClose} className="ml-1 hover:opacity-70"><X size={13} /></button>
  </div>
)

// ── Ratio Badge ────────────────────────────────────────────────────
const RatioBadge = ({ status }) => {
  const colors = {
    Strong:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    Adequate: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    Weak:     'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
    'No Data':'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${colors[status] || colors['No Data']}`}>
      {status}
    </span>
  )
}

// ── Score Ring ─────────────────────────────────────────────────────
const ScoreRing = ({ score, size = 120, strokeWidth = 10, label }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-zinc-100 dark:text-zinc-800" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <p className="text-3xl font-bold" style={{ color }}>{Math.round(score)}</p>
        <p className="text-[8px] font-bold text-zinc-400 uppercase">{label || 'Score'}</p>
      </div>
    </div>
  )
}

// ── Step tab ───────────────────────────────────────────────────────
const STEPS = [
  { id: 'ingest',         label: 'Data Ingestion',  icon: FileUp },
  { id: 'research',       label: 'Research Agent',  icon: Search },
  { id: 'analysis',       label: 'Credit Analysis', icon: BarChart3 },
  { id: 'recommendation', label: 'Recommendation',  icon: ShieldCheck },
]

// ── Ratio display names & formatting ──
const RATIO_META = {
  current_ratio:     { label: 'Current Ratio',     icon: Activity,    format: v => v?.toFixed(2) + 'x',  category: 'Liquidity' },
  quick_ratio:       { label: 'Quick Ratio',       icon: Activity,    format: v => v?.toFixed(2) + 'x',  category: 'Liquidity' },
  debt_equity:       { label: 'Debt / Equity',     icon: Scale,       format: v => v?.toFixed(2) + 'x',  category: 'Leverage' },
  debt_to_assets:    { label: 'Debt / Assets',     icon: PieChart,    format: v => v?.toFixed(2) + 'x',  category: 'Leverage' },
  dscr:              { label: 'DSCR',              icon: ShieldCheck, format: v => v?.toFixed(2) + 'x',  category: 'Coverage' },
  interest_coverage: { label: 'Interest Coverage',  icon: Landmark,    format: v => v?.toFixed(2) + 'x',  category: 'Coverage' },
  ebitda_margin:     { label: 'EBITDA Margin',     icon: TrendingUp,  format: v => v?.toFixed(1) + '%',  category: 'Profitability' },
  net_profit_margin: { label: 'Net Profit Margin', icon: IndianRupee, format: v => v?.toFixed(1) + '%',  category: 'Profitability' },
  roe:               { label: 'Return on Equity',  icon: ArrowUpRight,format: v => v?.toFixed(1) + '%',  category: 'Returns' },
  roa:               { label: 'Return on Assets',  icon: ArrowUpRight,format: v => v?.toFixed(1) + '%',  category: 'Returns' },
  roce:              { label: 'ROCE',              icon: TrendingUp,  format: v => v?.toFixed(1) + '%',  category: 'Returns' },
  dso:               { label: 'Days Sales O/S',    icon: BarChart3,   format: v => Math.round(v) + ' days', category: 'Efficiency' },
  asset_turnover:    { label: 'Asset Turnover',    icon: Activity,    format: v => v?.toFixed(2) + 'x',  category: 'Efficiency' },
  inventory_days:    { label: 'Inventory Days',    icon: BarChart3,   format: v => Math.round(v) + ' days', category: 'Efficiency' },
}

export const ApplicationFlow = ({ application, onBack, onCreated, isDark }) => {
  const [step, setStep]               = useState('ingest')
  const [companyId, setCompanyId]     = useState(application?.company_id || application?.id || null)
  const [companyName, setCompanyName] = useState(application?.company_name || application?.name || '')
  const [cin, setCin]                 = useState('')
  const [gstin, setGstin]             = useState('')
  const [files, setFiles]             = useState([])
  const [toast, setToast]             = useState(null)
  const [ingest, setIngest]           = useState(application || null)
  const [research, setResearch]       = useState(null)
  const [score, setScoreData]         = useState(null)
  const [loading, setLoading]         = useState({})
  const [officerNotes, setOfficerNotes] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')
  const [cibilScore, setCibilScore]   = useState('')
  const [explanation, setExplanation] = useState(null)
  const [whatIfResult, setWhatIfResult] = useState(null)
  const [whatIfInputs, setWhatIfInputs] = useState({ revenue: '', ebitda: '', net_worth: '', collateral_value: '' })
  const fileRef = useRef()

  const setLoad = (k, v) => setLoading(p => ({ ...p, [k]: v }))
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Poll ingest status
  const pollIngest = useCallback(async (id) => {
    try {
      const res = await getIngestStatus(id)
      setIngest(res.data)
      if (res.data.status === 'ready') return true
      return false
    } catch { return false }
  }, [])

  // Load existing data on mount
  useEffect(() => {
    if (!companyId) return
    pollIngest(companyId)
    getResearchResults(companyId).then(r => { if (r.data.status === 'completed') setResearch(r.data) }).catch(() => {})
    getScore(companyId).then(r => { if (r.data.decision !== 'NOT_SCORED') setScoreData(r.data) }).catch(() => {})
  }, [companyId])

  // ── INGEST ──
  const handleUpload = async () => {
    if (!companyName.trim()) return showToast('Company name required', 'error')
    if (!files.length)       return showToast('Upload at least one PDF', 'error')
    setLoad('upload', true)
    try {
      const fd = new FormData()
      fd.append('company_name', companyName)
      if (cin)   fd.append('cin', cin)
      if (gstin) fd.append('gstin', gstin)
      files.forEach(f => fd.append('files', f))
      const res = await uploadDocuments(fd)
      const id  = res.data.company_id
      setCompanyId(id)
      showToast('Documents uploaded — building RAG index…', 'loading')
      onCreated?.({ company_id: id, company_name: companyName, status: 'ready' })

      const poll = async () => {
        const done = await pollIngest(id)
        if (!done) setTimeout(poll, 3000)
        else showToast('Documents parsed & indexed ✓')
      }
      setTimeout(poll, 2000)
    } catch (e) {
      showToast('Upload failed — is the backend running?', 'error')
    }
    setLoad('upload', false)
  }

  const handleFile = (e) => {
    const newFiles = Array.from(e.target.files || [])
    setFiles(p => [...p, ...newFiles])
  }

  // ── RESEARCH ──
  const handleResearch = async () => {
    if (!companyId) return showToast('Upload documents first', 'error')
    setLoad('research', true)
    showToast('Research agent running — 6 parallel web crawls + pattern scan…', 'loading')
    try {
      await runResearch(companyId, { company_name: companyName, cin, gstin })
      const poll = async () => {
        const r = await getResearchResults(companyId)
        if (r.data.status === 'completed') {
          setResearch(r.data)
          showToast('Research complete ✓')
          setLoad('research', false)
        } else {
          setTimeout(poll, 4000)
        }
      }
      setTimeout(poll, 3000)
    } catch { showToast('Research failed', 'error'); setLoad('research', false) }
  }

  // ── SCORE ──
  const handleScore = async () => {
    if (!companyId) return showToast('Run research first', 'error')
    setLoad('score', true)
    showToast('Calculating Five Cs score with Indian financial ratios…', 'loading')

    // Submit officer notes first if present
    if (officerNotes.trim()) {
      try {
        await submitOfficerNotes({ company_id: companyId, notes: officerNotes })
      } catch {}
    }

    try {
      const payload = {
        company_id: companyId,
        include_qualitative: !!officerNotes,
        requested_amount: requestedAmount ? parseFloat(requestedAmount) : 0,
        cibil_score: cibilScore ? parseInt(cibilScore) : null,
      }
      const r = await scoreCompany(payload)
      setScoreData(r.data)
      showToast(`Score: ${Math.round(r.data.overall_score)}/100 — ${r.data.decision}`)
    } catch { showToast('Scoring failed', 'error') }
    setLoad('score', false)
  }

  // ── EXPLAIN ──
  const handleExplain = async () => {
    if (!companyId) return showToast('Run scoring first', 'error')
    setLoad('explain', true)
    showToast('Generating AI narrative walkthrough…', 'loading')
    try {
      const r = await explainDecision(companyId)
      setExplanation(r.data)
      showToast('Explanation generated ✓')
    } catch { showToast('Explanation failed', 'error') }
    setLoad('explain', false)
  }

  // ── WHAT-IF ──
  const handleWhatIf = async () => {
    if (!companyId) return showToast('Run scoring first', 'error')
    setLoad('whatif', true)
    showToast('Running scenario analysis…', 'loading')
    try {
      const adjustments = {}
      Object.entries(whatIfInputs).forEach(([k, v]) => { if (v) adjustments[k] = parseFloat(v) })
      const r = await runWhatIf({
        company_id: companyId,
        adjustments,
        cibil_score: cibilScore ? parseInt(cibilScore) : null,
        requested_amount: requestedAmount ? parseFloat(requestedAmount) : 0,
      })
      setWhatIfResult(r.data)
      showToast(`Scenario: ${r.data.scenario_score}/100 (${r.data.score_delta >= 0 ? '+' : ''}${r.data.score_delta})`)
    } catch { showToast('What-if analysis failed', 'error') }
    setLoad('whatif', false)
  }

  // ── DATABRICKS INGEST ──
  const handleDatabricksIngest = async () => {
    if (!companyName.trim()) return showToast('Company name required', 'error')
    setLoad('databricks', true)
    showToast('Ingesting from Databricks Delta Lake…', 'loading')
    try {
      const r = await ingestFromDatabricks({ company_name: companyName, company_id: companyId || undefined })
      const id = r.data.company_id
      setCompanyId(id)
      setIngest({ status: 'ready', company_name: companyName })
      onCreated?.({ company_id: id, company_name: companyName, status: 'ready' })
      showToast(`Databricks: ${r.data.tables_loaded.length} tables loaded ✓`)
    } catch { showToast('Databricks ingest failed', 'error') }
    setLoad('databricks', false)
  }

  // ── CAM ──
  const handleCAM = async () => {
    if (!companyId) return showToast('Run scoring first', 'error')
    setLoad('cam', true)
    showToast('Generating CAM report…', 'loading')
    try {
      await generateCAM(companyId)
      showToast('CAM report generated ✓')
    } catch { showToast('CAM generation failed', 'error') }
    setLoad('cam', false)
  }

  const isReady = ingest?.status === 'ready' || !!companyId

  // ── RADAR DATA ──
  const radarData = score ? [
    { subject: 'Character',  A: Math.round(score.character_score  || 0), fullMark: 100 },
    { subject: 'Capacity',   A: Math.round(score.capacity_score   || 0), fullMark: 100 },
    { subject: 'Capital',    A: Math.round(score.capital_score    || 0), fullMark: 100 },
    { subject: 'Collateral', A: Math.round(score.collateral_score || 0), fullMark: 100 },
    { subject: 'Conditions', A: Math.round(score.conditions_score || 0), fullMark: 100 },
  ] : []

  // ── Helpers ──
  const formatCurrency = (val) => {
    if (!val || val === 0) return '—'
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`
    if (val >= 100000)   return `₹${(val / 100000).toFixed(2)} L`
    return `₹${val.toLocaleString('en-IN')}`
  }

  const getRatiosByCategory = () => {
    const ratios = score?.financial_ratios || {}
    const grouped = {}
    Object.entries(ratios).forEach(([key, data]) => {
      const meta = RATIO_META[key]
      if (!meta) return
      const cat = meta.category
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push({ key, ...meta, ...data })
    })
    return grouped
  }

  const decisionColor = (d) => {
    if (d === 'APPROVE') return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
    if (d === 'REJECT')  return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
    return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold tracking-tight">{companyName || 'New Application'}</h2>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>ID: {companyId || 'APP-2024-NEW'}</span>
              {companyId && <><span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" /><span className="text-emerald-500 font-medium">{ingest?.status || 'uploading'}</span></>}
              {score && <><span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" /><span className={`font-bold ${score.decision === 'APPROVE' ? 'text-emerald-500' : score.decision === 'REJECT' ? 'text-rose-500' : 'text-amber-500'}`}>{score.decision}</span></>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {score && (
            <div className="flex items-center gap-2 mr-4">
              <div className={`w-3 h-3 rounded-full ${score.overall_score >= 70 ? 'bg-emerald-500' : score.overall_score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} />
              <span className="text-sm font-bold">{Math.round(score.overall_score)}/100</span>
            </div>
          )}
          <button className="px-4 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Save Draft
          </button>
          <button className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
            Submit for Approval
          </button>
        </div>
      </header>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Stepper */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-8 flex">
        {STEPS.map((s, idx) => (
          <button key={s.id} onClick={() => setStep(s.id)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              step === s.id
                ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mr-1 ${
              step === s.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
            }`}>{idx + 1}</div>
            <s.icon size={16} />{s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto bg-[#F8F9FA] dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto">

          {/* ═══ INGEST ═══ */}
          {step === 'ingest' && (
            <div className="space-y-6">
              {/* Company info */}
              {!companyId && (
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><FileUp size={18} className="text-zinc-500" /> Company Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">Company Name *</label>
                      <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="TechNova Solutions Pvt Ltd"
                        className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">CIN (optional)</label>
                      <input value={cin} onChange={e => setCin(e.target.value)} placeholder="L17100MH2001PLC..."
                        className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">GSTIN (optional)</label>
                      <input value={gstin} onChange={e => setGstin(e.target.value)} placeholder="27AAACR5055K1ZX"
                        className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">CIBIL Commercial Score</label>
                      <input value={cibilScore} onChange={e => setCibilScore(e.target.value)} placeholder="725 (300-900)" type="number" min="300" max="900"
                        className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">Requested Loan Amount (₹)</label>
                      <input value={requestedAmount} onChange={e => setRequestedAmount(e.target.value)} placeholder="50000000" type="number"
                        className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white" />
                    </div>
                    <div className="flex items-end">
                      <button onClick={handleDatabricksIngest} disabled={loading.databricks || !companyName.trim()}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                        {loading.databricks ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
                        {loading.databricks ? 'Loading…' : 'Ingest from Databricks'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Structured Data */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold flex items-center gap-2"><BarChart3 size={18} className="text-zinc-500" /> Structured Data</h3>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded">Synced</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: 'GST Filings (GSTR-3B)',          status: 'Verified', date: '24 Feb 2024' },
                      { name: 'Income Tax Returns (ITR-6)',      status: 'Verified', date: '12 Jan 2024' },
                      { name: 'Bank Statements (6 Months)',      status: 'Processing', date: 'Today' },
                    ].map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded flex items-center justify-center">
                            <FileText size={13} className="text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold">{d.name}</p>
                            <p className="text-[10px] text-zinc-400">{d.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {d.status === 'Verified'
                            ? <CheckCircle2 size={14} className="text-emerald-500" />
                            : <Loader2 size={14} className="animate-spin text-zinc-400" />
                          }
                          <span className="text-[10px] text-zinc-500">{d.status}</span>
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300 transition-all flex items-center justify-center gap-2">
                      <Plus size={13} /> Add Data Source
                    </button>
                  </div>
                </div>

                {/* Unstructured Data */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold flex items-center gap-2"><FileText size={18} className="text-zinc-500" /> Unstructured Data</h3>
                    {files.length > 0 && <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-0.5 rounded">{files.length} files</span>}
                  </div>
                  <div className="space-y-3">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded flex items-center justify-center">
                            <FileText size={13} className="text-rose-500" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold truncate max-w-40">{f.name}</p>
                            <p className="text-[10px] text-zinc-400">{(f.size / 1024).toFixed(0)} KB</p>
                          </div>
                        </div>
                        <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-rose-500 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <input ref={fileRef} type="file" className="hidden" multiple accept=".pdf" onChange={handleFile} />
                    <button onClick={() => fileRef.current?.click()} className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300 transition-all flex items-center justify-center gap-2">
                      <Upload size={13} /> Upload PDF Documents
                    </button>
                    {files.length > 0 && !companyId && (
                      <button onClick={handleUpload} disabled={loading.upload}
                        className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                        {loading.upload ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {loading.upload ? 'Uploading…' : 'Start Processing'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Extraction preview */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-500" /> Intelligent Extraction Preview</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Revenue Inflation Check', value: 'No Discrepancies',   sub: 'GST vs Bank variance: 1.2%', color: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Contingent Liabilities',  value: '₹12.4 Cr Identified',sub: 'Extracted from Note 24',     color: 'text-rose-600 dark:text-rose-400' },
                    { label: 'Circular Trading Risk',   value: 'Low Risk',           sub: 'Counterparty verified',      color: 'text-emerald-600 dark:text-emerald-400' },
                  ].map((c, i) => (
                    <div key={i} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{c.label}</p>
                      <p className={`text-sm font-semibold ${c.color}`}>{c.value}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{c.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ RESEARCH ═══ */}
          {step === 'research' && (
            <div className="space-y-6">
              {/* Run button */}
              {!research && (
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">AI Research Agent</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">6 parallel web crawls — promoter news, sector outlook, litigation, MCA compliance, RBI regulatory, financial news.</p>
                  </div>
                  <button onClick={handleResearch} disabled={loading.research || !isReady}
                    className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all">
                    {loading.research ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    {loading.research ? 'Researching…' : 'Run Research Agent'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                  {/* Web-Scale Intelligence */}
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                      <h3 className="font-bold flex items-center gap-2"><Globe size={18} className="text-blue-500" /> Web-Scale Intelligence</h3>
                      <button onClick={handleResearch} disabled={loading.research}
                        className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-40">
                        <Search size={12} /> Refresh Crawl
                      </button>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {(research ? [
                        { title: String(research.promoter_background || '').slice(0, 120), source: 'Promoter Intel', date: 'Just now', sentiment: 'Neutral',  tag: 'Promoter', icon: '👤' },
                        { title: String(research.sector_outlook || '').slice(0, 120),      source: 'Sector Analysis', date: 'Just now', sentiment: 'Positive', tag: 'Sector', icon: '📊' },
                        { title: String(research.litigation_summary || '').slice(0, 120),  source: 'e-Courts / NCLT', date: 'Just now', sentiment: String(research.litigation_summary || '').toLowerCase().includes('no') ? 'Positive' : 'Negative', tag: 'Legal', icon: '⚖️' },
                        ...(research.mca_compliance ? [{ title: String(research.mca_compliance).slice(0, 120), source: 'MCA Portal', date: 'Just now', sentiment: 'Neutral', tag: 'MCA', icon: '🏛️' }] : []),
                        ...(research.rbi_observations ? [{ title: String(research.rbi_observations).slice(0, 120), source: 'RBI Regulatory', date: 'Just now', sentiment: String(research.rbi_observations || '').toLowerCase().includes('no adverse') ? 'Positive' : 'Negative', tag: 'RBI', icon: '🏦' }] : []),
                      ] : [
                        { title: 'Run research agent to populate this feed with live intelligence from 6 parallel searches', source: 'Pending', date: '—', sentiment: 'Neutral', tag: 'Info', icon: '💡' },
                      ]).map((n, i) => (
                        <div key={i} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-sm font-semibold max-w-lg flex items-start gap-2">
                              <span className="text-base">{n.icon}</span>
                              <span>{n.title || 'No data available'}{n.title?.length >= 120 ? '…' : ''}</span>
                            </h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ml-4 ${
                              n.sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                              n.sentiment === 'Negative' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' :
                              'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}>{n.sentiment}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-zinc-500 ml-7">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">{n.source}</span>
                            <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                            <span>{n.date}</span>
                            <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                            <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded">{n.tag}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MCA & RBI & Litigation Compliance */}
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><Scale size={18} className="text-zinc-500" /> Regulatory & Legal Compliance</h3>
                    <div className="space-y-3">
                      {/* MCA */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="text-emerald-500" size={18} />
                          <div>
                            <p className="text-xs font-semibold">{research?.mca_compliance || 'MCA Compliance — Pending Research'}</p>
                            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Ministry of Corporate Affairs</p>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-emerald-400" />
                      </div>

                      {/* RBI */}
                      {research?.rbi_observations && (
                        <div className={`flex items-center justify-between p-3 rounded-xl border ${
                          research.rbi_observations.toLowerCase().includes('no adverse')
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
                        }`}>
                          <div className="flex items-center gap-3">
                            <Landmark size={18} className={research.rbi_observations.toLowerCase().includes('no adverse') ? 'text-emerald-500' : 'text-amber-500'} />
                            <div>
                              <p className="text-xs font-semibold">{research.rbi_observations.slice(0, 100)}</p>
                              <p className="text-[10px] opacity-70">Reserve Bank of India Regulatory Check</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Litigation flags */}
                      {research?.litigation_flags?.length > 0 && research.litigation_flags.map((flag, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="text-rose-500" size={18} />
                            <div>
                              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">{flag}</p>
                              <p className="text-[10px] text-rose-500/70">Litigation Flag</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">View Details</span>
                        </div>
                      ))}

                      {/* Litigation patterns from enhanced research */}
                      {research?.litigation_patterns?.length > 0 && (
                        <div className="mt-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                          <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Pattern Scan Results</p>
                          <div className="grid grid-cols-2 gap-2">
                            {research.litigation_patterns.map((pat, i) => (
                              <div key={i} className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                                pat.severity === 'CRITICAL' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400' :
                                pat.severity === 'HIGH' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                                'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                              }`}>
                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                  pat.severity === 'CRITICAL' ? 'bg-rose-500' : pat.severity === 'HIGH' ? 'bg-amber-500' : 'bg-zinc-400'
                                }`} />
                                <span className="font-medium">{pat.description || pat.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right panel */}
                <div className="space-y-6">
                  {/* Sector Outlook */}
                  <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-6 rounded-2xl shadow-lg">
                    <h3 className="font-bold mb-4 text-sm flex items-center gap-2"><TrendingUp size={16} /> Sector Outlook</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">Growth Forecast</p>
                        <p className="text-lg font-bold text-emerald-400 dark:text-emerald-600">+12.4%</p>
                      </div>
                      <div className="w-full h-1 bg-white/10 dark:bg-zinc-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 dark:bg-emerald-600 w-3/4" />
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic leading-relaxed">
                        {research?.sector_outlook?.slice(0, 150) || 'Strong demand for AI-integrated services driving mid-cap growth in India.'}
                      </p>
                    </div>
                  </div>

                  {/* Risk Level */}
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="font-bold mb-4 text-sm">Research Risk Level</h3>
                    <div className={`text-center py-4 rounded-xl font-bold text-lg ${
                      research?.overall_research_risk === 'LOW'  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                      research?.overall_research_risk === 'HIGH' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' :
                      'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                    }`}>
                      {research?.overall_research_risk || '—'}
                    </div>
                    {research?.early_warning_signals?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Early Warning Signals</p>
                        {research.early_warning_signals.slice(0, 5).map((s, i) => (
                          <p key={i} className="text-xs text-rose-600 dark:text-rose-400 mb-1 flex items-start gap-1.5">
                            <AlertCircle size={10} className="mt-0.5 shrink-0" />{s}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Officer Notes */}
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="font-bold mb-3 text-sm flex items-center gap-2"><MessageSquareText size={16} className="text-zinc-400" /> Officer Notes</h3>
                    <textarea
                      value={officerNotes}
                      onChange={e => setOfficerNotes(e.target.value)}
                      placeholder="Add qualitative observations (promoter integrity, site visit notes, relationship history…)"
                      className="w-full h-24 px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">Notes will adjust scoring weights in the Five Cs engine.</p>
                  </div>

                  {/* MCA Registry Panel */}
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
                      <Landmark size={16} className="text-zinc-400" /> MCA Registry
                    </h3>
                    <MCAPanel companyId={companyId} companyName={companyName} cin={cin} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ANALYSIS ═══ */}
          {step === 'analysis' && (
            <div className="space-y-6">
              {/* Score button */}
              {!score && (
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Five Cs Credit Scoring</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Character, Capacity, Capital, Collateral, Conditions — weighted AI scoring with Indian financial ratios (DSO, ROE, DSCR, Current Ratio).</p>
                  </div>
                  <button onClick={handleScore} disabled={loading.score || !isReady}
                    className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all">
                    {loading.score ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
                    {loading.score ? 'Scoring…' : 'Run Score Engine'}
                  </button>
                </div>
              )}

              {/* Score overview cards */}
              {score && (
                <div className="grid grid-cols-6 gap-4">
                  {/* Overall */}
                  <div className={`col-span-2 p-6 rounded-2xl border shadow-sm relative overflow-hidden ${decisionColor(score.decision)}`}>
                    <div className="relative z-10">
                      <p className="text-[10px] font-bold uppercase opacity-60">Overall Score</p>
                      <p className="text-5xl font-bold mt-2">{Math.round(score.overall_score)}</p>
                      <p className="text-sm font-bold mt-2">{score.decision}</p>
                      <p className="text-[10px] mt-1 opacity-80">{score.decision_reason?.slice(0, 80)}</p>
                    </div>
                    <div className="absolute top-4 right-4 opacity-10">
                      <ShieldCheck size={80} />
                    </div>
                  </div>
                  {/* Five Cs mini cards */}
                  {[
                    { label: 'Character',  score: score.character_score,  weight: '25%', icon: '👤' },
                    { label: 'Capacity',   score: score.capacity_score,   weight: '30%', icon: '📈' },
                    { label: 'Capital',    score: score.capital_score,    weight: '20%', icon: '💰' },
                    { label: 'Collateral', score: score.collateral_score, weight: '15%', icon: '🏠' },
                  ].map((c, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">{c.label}</p>
                        <span className="text-base">{c.icon}</span>
                      </div>
                      <p className={`text-2xl font-bold mt-2 ${c.score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : c.score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {Math.round(c.score)}
                      </p>
                      <div className="mt-2 w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${c.score >= 70 ? 'bg-emerald-500' : c.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${c.score}%` }} />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">Weight: {c.weight}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Radar */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="font-bold mb-6 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-500" /> Credit Risk Profile (5 Cs)</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData.length ? radarData : [
                        { subject: 'Character', A: 0 }, { subject: 'Capacity', A: 0 },
                        { subject: 'Capital', A: 0 }, { subject: 'Collateral', A: 0 }, { subject: 'Conditions', A: 0 },
                      ]}>
                        <PolarGrid stroke={isDark ? '#3F3F46' : '#E4E4E7'} />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600, fill: isDark ? '#A1A1AA' : '#6B7280' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="A" stroke="#10B981" fill="#10B981" fillOpacity={isDark ? 0.3 : 0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Deduction Audit Trail */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm max-h-105 overflow-y-auto">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><AlertCircle size={18} className="text-amber-500" /> Score Deduction Audit Trail</h3>
                  {score?.deductions ? (
                    <div className="space-y-4">
                      {Object.entries(score.deductions).map(([cat, items]) => (
                        items?.length > 0 && (
                          <div key={cat}>
                            <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2 flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${cat === 'character' ? 'bg-violet-500' : cat === 'capacity' ? 'bg-blue-500' : cat === 'capital' ? 'bg-emerald-500' : cat === 'collateral' ? 'bg-amber-500' : 'bg-zinc-400'}`} />
                              {cat}
                            </p>
                            {items.map((item, i) => (
                              <p key={i} className="text-xs text-zinc-600 dark:text-zinc-400 ml-4 mb-1 flex items-start gap-1.5">
                                <Minus size={8} className="mt-1.5 shrink-0 text-zinc-400" />
                                {item}
                              </p>
                            ))}
                          </div>
                        )
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400">Run scoring engine to see deduction details.</p>
                  )}
                </div>
              </div>

              {/* ── Indian Financial Ratios ── */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold flex items-center gap-2"><IndianRupee size={18} className="text-blue-500" /> Indian Financial Ratios</h3>
                  {score?.dscr && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-zinc-400">DSCR</span>
                      <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                        score.dscr >= 1.5 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                        score.dscr >= 1.0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                        'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                      }`}>{score.dscr.toFixed(2)}x</span>
                    </div>
                  )}
                </div>

                {score?.financial_ratios && Object.keys(score.financial_ratios).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(getRatiosByCategory()).map(([category, ratios]) => (
                      <div key={category}>
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-3 tracking-wider">{category}</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {ratios.map((r) => {
                            const IconComp = r.icon || Activity
                            return (
                              <div key={r.key} className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-2">
                                  <p className="text-[10px] font-bold text-zinc-400 uppercase leading-tight">{r.label}</p>
                                  <IconComp size={12} className="text-zinc-300 dark:text-zinc-600" />
                                </div>
                                <p className="text-xl font-bold mb-2">
                                  {r.value !== null && r.value !== undefined ? r.format(r.value) : '—'}
                                </p>
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-zinc-500">{r.benchmark}</span>
                                  <RatioBadge status={r.status} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p className="text-sm text-zinc-400">Run the scoring engine to compute Indian financial ratios with sector benchmarks.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ RECOMMENDATION ═══ */}
          {step === 'recommendation' && (
            <div className="space-y-6">
              {/* Main recommendation card */}
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-8 right-8">
                  <div className="relative flex items-center justify-center">
                    <ScoreRing score={score?.overall_score || 0} size={100} strokeWidth={8} label="Score" />
                  </div>
                </div>

                <div className="max-w-2xl">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase mb-6 ${
                    score?.decision === 'APPROVE' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                    score?.decision === 'REJECT' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' :
                    'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {score?.decision === 'APPROVE' ? <CheckCircle2 size={12} /> : score?.decision === 'REJECT' ? <X size={12} /> : <AlertCircle size={12} />}
                    AI Recommendation: {score?.decision || 'Pending'}
                  </div>
                  <h3 className="text-3xl font-bold tracking-tight mb-2">Proposed Credit Facility</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{score?.decision_reason || 'Complete all steps to generate recommendation.'}</p>

                  <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed text-sm">
                    {research?.research_summary ||
                     `Based on the multi-dimensional analysis of ${companyName || 'the company'}, the AI engine has produced a comprehensive credit recommendation factoring in Indian financial ratios, RBI regulatory compliance, MCA filings, and sector benchmarks.`}
                  </p>

                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="space-y-4">
                      {[
                        ['Facility Type', 'Cash Credit / LC'],
                        ['Recommended Amount', score?.recommended_amount ? formatCurrency(score.recommended_amount) : '—'],
                        ['Interest Rate', score?.interest_rate || '—'],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                          <span className="text-sm text-zinc-500">{label}</span>
                          <span className={`text-sm font-bold ${label === 'Interest Rate' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      {[
                        ['DSCR', score?.dscr ? score.dscr.toFixed(2) + 'x' : '—'],
                        ['Tenor', '12 Months (Renewable)'],
                        ['Risk Premium', score?.interest_rate || 'Based on score'],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                          <span className="text-sm text-zinc-500">{label}</span>
                          <span className="text-sm font-bold">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={handleCAM} disabled={loading.cam}
                      className="flex-1 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                      {loading.cam ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                      {loading.cam ? 'Generating…' : 'Generate CAM Report'}
                    </button>
                    {companyId && (
                      <div className="flex gap-2">
                        <a href={downloadCAMUrl(companyId, 'pdf')} target="_blank" rel="noreferrer"
                          className="px-4 py-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 text-sm font-medium text-rose-600">
                          <Download size={16} /> PDF
                        </a>
                        <a href={downloadCAMUrl(companyId, 'docx')} target="_blank" rel="noreferrer"
                          className="px-4 py-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 text-sm font-medium text-blue-600">
                          <Download size={16} /> DOCX
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ═══ AI EXPLAINABILITY PANEL ═══ */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold flex items-center gap-2"><MessageSquareText size={18} className="text-violet-500" /> AI Decision Walkthrough</h3>
                  <button onClick={handleExplain} disabled={loading.explain || !score}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-all">
                    {loading.explain ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    {loading.explain ? 'Generating…' : 'Generate Explanation'}
                  </button>
                </div>
                {explanation ? (
                  <div className="space-y-6">
                    {/* Data Quality Badge */}
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase text-zinc-400">Data Quality</p>
                        <p className={`text-lg font-bold ${explanation.data_quality_score >= 70 ? 'text-emerald-600' : explanation.data_quality_score >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {Math.round(explanation.data_quality_score)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase text-zinc-400">Confidence</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          explanation.confidence_level === 'HIGH' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                          explanation.confidence_level === 'MEDIUM' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                          'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                        }`}>{explanation.confidence_level}</span>
                      </div>
                    </div>

                    {/* Narrative */}
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{explanation.narrative}</p>
                    </div>

                    {/* Key Drivers */}
                    {explanation.key_drivers?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-3">Key Decision Drivers</p>
                        <div className="space-y-2">
                          {explanation.key_drivers.map((d, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
                              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[10px] font-bold shrink-0">{i + 1}</span>
                              {d}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Indian Context Notes */}
                    {explanation.indian_context_notes?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-3 flex items-center gap-1">🇮🇳 Indian Regulatory Context</p>
                        <div className="space-y-2">
                          {explanation.indian_context_notes.map((n, i) => (
                            <p key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                              <Landmark size={12} className="text-blue-500 mt-0.5 shrink-0" />{n}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquareText size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p className="text-sm text-zinc-400">Click "Generate Explanation" to produce an AI narrative walkthrough of the credit decision.</p>
                    <p className="text-[10px] text-zinc-400 mt-1">The AI will reference specific data, Indian regulations (RBI, MCA, SEBI), and explain each deduction.</p>
                  </div>
                )}
              </div>

              {/* ═══ WHAT-IF SCENARIO ANALYSIS ═══ */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500" /> What-If Scenario Analysis</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Adjust financial parameters to see how the score would change. This helps borrowers understand what to improve.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { key: 'revenue', label: 'Revenue (₹)', placeholder: '120000000' },
                    { key: 'ebitda', label: 'EBITDA (₹)', placeholder: '18000000' },
                    { key: 'net_worth', label: 'Net Worth (₹)', placeholder: '33000000' },
                    { key: 'collateral_value', label: 'Collateral (₹)', placeholder: '55000000' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">{label}</label>
                      <input value={whatIfInputs[key]} onChange={e => setWhatIfInputs(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder} type="number"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>
                <button onClick={handleWhatIf} disabled={loading.whatif || !score}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2">
                  {loading.whatif ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                  {loading.whatif ? 'Analyzing…' : 'Run Scenario'}
                </button>
                {whatIfResult && (
                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-center">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Original</p>
                        <p className="text-2xl font-bold">{Math.round(whatIfResult.original_score)}</p>
                        <span className={`text-[10px] font-bold ${whatIfResult.original_decision === 'APPROVE' ? 'text-emerald-600' : whatIfResult.original_decision === 'REJECT' ? 'text-rose-600' : 'text-amber-600'}`}>{whatIfResult.original_decision}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-center border border-blue-200 dark:border-blue-800">
                        <p className="text-[10px] font-bold text-blue-400 uppercase">Scenario</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.round(whatIfResult.scenario_score)}</p>
                        <span className={`text-[10px] font-bold ${whatIfResult.scenario_decision === 'APPROVE' ? 'text-emerald-600' : whatIfResult.scenario_decision === 'REJECT' ? 'text-rose-600' : 'text-amber-600'}`}>{whatIfResult.scenario_decision}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-center">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Delta</p>
                        <p className={`text-2xl font-bold ${whatIfResult.score_delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {whatIfResult.score_delta >= 0 ? '+' : ''}{whatIfResult.score_delta}
                        </p>
                        <span className="text-[10px] text-zinc-500">points</span>
                      </div>
                    </div>
                    {whatIfResult.changes_summary?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Changes</p>
                        {whatIfResult.changes_summary.map((c, i) => (
                          <p key={i} className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 flex items-start gap-1.5">
                            <ArrowUpRight size={10} className="mt-0.5 shrink-0 text-blue-500" />{c}
                          </p>
                        ))}
                      </div>
                    )}
                    {whatIfResult.recommendation && (
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900">
                        <p className="text-[10px] font-bold uppercase text-blue-400 mb-2">AI Recommendation</p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{whatIfResult.recommendation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Key ratios summary */}
              {score?.financial_ratios && (
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Activity size={18} className="text-blue-500" /> Key Ratio Summary</h3>
                  <div className="grid grid-cols-5 gap-4">
                    {['current_ratio', 'dscr', 'debt_equity', 'roe', 'ebitda_margin'].map(key => {
                      const data = score.financial_ratios[key]
                      const meta = RATIO_META[key]
                      if (!data || !meta) return null
                      return (
                        <div key={key} className="text-center p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">{meta.label}</p>
                          <p className="text-2xl font-bold">{data.value != null ? meta.format(data.value) : '—'}</p>
                          <RatioBadge status={data.status} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Strengths & Risks */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" /> Key Strengths
                  </h4>
                  <ul className="space-y-3">
                    {(research?.positive_factors?.length
                      ? research.positive_factors.slice(0, 4)
                      : ['Complete all analysis steps to identify strengths']
                    ).map((s, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                        <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-500" /> Risk Mitigants
                  </h4>
                  <ul className="space-y-3">
                    {(research?.early_warning_signals?.length
                      ? research.early_warning_signals.slice(0, 4)
                      : ['Complete all analysis steps to identify risks']
                    ).map((s, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                        <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
