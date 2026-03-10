import React, { useState, useEffect } from 'react'
import {
  Search, Globe, Scale, TrendingUp, ShieldCheck, AlertCircle,
  CheckCircle2, Loader2, Download, MessageSquareText, ExternalLink,
  BarChart3, Activity, Landmark, X, FileText, Target,
  ArrowUpRight, ArrowDownRight, ChevronDown
} from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts'
import {
  runResearch, getResearchResults, scoreCompany, getScore,
  generateCAM, downloadCAMUrl, explainDecision, generateSWOT,
  submitOfficerNotes
} from '../api/client'

export default function AnalysisReport({ companyId, companyName, entityData, isDark, onToast }) {
  const [research, setResearch] = useState(null)
  const [score, setScore] = useState(null)
  const [swot, setSwot] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState({})
  const [officerNotes, setOfficerNotes] = useState('')
  const [activeSection, setActiveSection] = useState('research')

  const setLoad = (k, v) => setLoading(p => ({ ...p, [k]: v }))

  // Load existing data
  useEffect(() => {
    if (!companyId) return
    getResearchResults(companyId).then(r => { if (r.data.status === 'completed') setResearch(r.data) }).catch(() => {})
    getScore(companyId).then(r => { if (r.data.decision !== 'NOT_SCORED') setScore(r.data) }).catch(() => {})
  }, [companyId])

  // Research
  const handleResearch = async () => {
    setLoad('research', true)
    onToast?.('Research agent running — scanning news, legal, market, MCA...', 'loading')
    try {
      await runResearch(companyId, {
        company_name: companyName,
        cin: entityData?.cin,
        gstin: entityData?.gstin,
      })
      const poll = async () => {
        const r = await getResearchResults(companyId)
        if (r.data.status === 'completed') {
          setResearch(r.data)
          onToast?.('Research complete', 'success')
          setLoad('research', false)
        } else setTimeout(poll, 4000)
      }
      setTimeout(poll, 3000)
    } catch { onToast?.('Research failed', 'error'); setLoad('research', false) }
  }

  // Score
  const handleScore = async () => {
    setLoad('score', true)
    onToast?.('Running Five Cs credit scoring engine...', 'loading')
    if (officerNotes.trim()) {
      try { await submitOfficerNotes({ company_id: companyId, notes: officerNotes }) } catch {}
    }
    try {
      const r = await scoreCompany({
        company_id: companyId,
        include_qualitative: !!officerNotes,
        requested_amount: entityData?.loan_amount || 0,
        cibil_score: entityData?.cibil_score || null,
      })
      setScore(r.data)
      onToast?.(`Score: ${Math.round(r.data.overall_score)}/100 — ${r.data.decision}`, 'success')
    } catch { onToast?.('Scoring failed', 'error') }
    setLoad('score', false)
  }

  // SWOT
  const handleSWOT = async () => {
    setLoad('swot', true)
    onToast?.('Generating SWOT analysis...', 'loading')
    try {
      const r = await generateSWOT(companyId)
      setSwot(r.data)
      onToast?.('SWOT analysis generated', 'success')
    } catch { onToast?.('SWOT generation failed', 'error') }
    setLoad('swot', false)
  }

  // Explain
  const handleExplain = async () => {
    setLoad('explain', true)
    onToast?.('Generating AI narrative walkthrough...', 'loading')
    try {
      const r = await explainDecision(companyId)
      setExplanation(r.data)
      onToast?.('Explanation generated', 'success')
    } catch { onToast?.('Explanation failed', 'error') }
    setLoad('explain', false)
  }

  // CAM
  const handleCAM = async () => {
    setLoad('cam', true)
    onToast?.('Generating investment report...', 'loading')
    try {
      await generateCAM(companyId)
      onToast?.('Report generated — ready for download', 'success')
    } catch { onToast?.('Report generation failed', 'error') }
    setLoad('cam', false)
  }

  const formatCurrency = (val) => {
    if (!val || val === 0) return '—'
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`
    return `₹${val.toLocaleString('en-IN')}`
  }

  const decisionColor = (d) => {
    if (d === 'APPROVE') return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
    if (d === 'REJECT') return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'
    return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
  }

  const radarData = score ? [
    { subject: 'Character', A: Math.round(score.character_score || 0), fullMark: 100 },
    { subject: 'Capacity', A: Math.round(score.capacity_score || 0), fullMark: 100 },
    { subject: 'Capital', A: Math.round(score.capital_score || 0), fullMark: 100 },
    { subject: 'Collateral', A: Math.round(score.collateral_score || 0), fullMark: 100 },
    { subject: 'Conditions', A: Math.round(score.conditions_score || 0), fullMark: 100 },
  ] : []

  const sections = [
    { id: 'research', label: 'Secondary Research', icon: Globe },
    { id: 'scoring', label: 'Credit Scoring', icon: ShieldCheck },
    { id: 'swot', label: 'SWOT Analysis', icon: Target },
    { id: 'report', label: 'Final Report', icon: FileText },
  ]

  return (
    <div className="space-y-6">
      {/* Section tabs */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="flex border-b border-zinc-100 dark:border-zinc-800">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                activeSection === s.id
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <s.icon size={14} /> {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ SECONDARY RESEARCH ═══ */}
      {activeSection === 'research' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold">AI Secondary Research Agent</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Scrapes news, legal databases, market sentiment, MCA filings, RBI data for a 360-degree view.
              </p>
            </div>
            <button onClick={handleResearch} disabled={loading.research}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all">
              {loading.research ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading.research ? 'Researching...' : research ? 'Refresh Research' : 'Run Research Agent'}
            </button>
          </div>

          {research && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-4">
                {/* Web Intelligence Feed */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                    <h3 className="font-bold flex items-center gap-2"><Globe size={18} className="text-blue-500" /> Web Intelligence & Triangulation</h3>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {[
                      { title: research.promoter_background, source: 'Promoter Intel', icon: '👤', tag: 'Promoter' },
                      { title: research.sector_outlook, source: 'Sector Analysis', icon: '📊', tag: 'Sector' },
                      { title: research.litigation_summary, source: 'e-Courts / NCLT', icon: '⚖️', tag: 'Legal' },
                      ...(research.mca_compliance ? [{ title: research.mca_compliance, source: 'MCA Portal', icon: '🏛️', tag: 'MCA' }] : []),
                      ...(research.rbi_observations ? [{ title: research.rbi_observations, source: 'RBI', icon: '🏦', tag: 'RBI' }] : []),
                      ...(research.financial_news ? [{ title: research.financial_news, source: 'Financial News', icon: '📰', tag: 'News' }] : []),
                    ].filter(n => n.title).map((n, i) => (
                      <div key={i} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-base">{n.icon}</span>
                          <p className="text-sm font-semibold">{String(n.title).slice(0, 200)}{String(n.title).length > 200 ? '...' : ''}</p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500 ml-7">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{n.source}</span>
                          <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded">{n.tag}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Litigation & Compliance */}
                {(research.litigation_flags?.length > 0 || research.litigation_patterns?.length > 0) && (
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><Scale size={18} /> Regulatory & Legal Flags</h3>
                    <div className="space-y-2">
                      {research.litigation_flags?.map((flag, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                          <AlertCircle size={16} className="text-rose-500 shrink-0" />
                          <p className="text-xs font-medium text-rose-700 dark:text-rose-400">{flag}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right sidebar */}
              <div className="space-y-4">
                <div className="bg-zinc-900 dark:bg-white p-6 rounded-2xl text-white dark:text-zinc-900">
                  <h3 className="font-bold mb-3 text-sm flex items-center gap-2"><TrendingUp size={16} /> Sector Outlook</h3>
                  <p className="text-[10px] opacity-70 leading-relaxed">
                    {research.sector_outlook?.slice(0, 200) || 'Run research to analyze sector trends.'}
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <h3 className="font-bold mb-3 text-sm">Research Risk Level</h3>
                  <div className={`text-center py-4 rounded-xl font-bold text-lg ${
                    research.overall_research_risk === 'LOW' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' :
                    research.overall_research_risk === 'HIGH' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' :
                    'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                  }`}>
                    {research.overall_research_risk || '—'}
                  </div>
                  {research.early_warning_signals?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Early Warnings</p>
                      {research.early_warning_signals.slice(0, 4).map((s, i) => (
                        <p key={i} className="text-xs text-rose-600 dark:text-rose-400 mb-1 flex items-start gap-1.5">
                          <AlertCircle size={10} className="mt-0.5 shrink-0" />{s}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
                    <MessageSquareText size={14} className="text-zinc-400" /> Officer Notes
                  </h3>
                  <textarea
                    value={officerNotes} onChange={e => setOfficerNotes(e.target.value)}
                    placeholder="Qualitative observations..."
                    className="w-full h-20 px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ CREDIT SCORING ═══ */}
      {activeSection === 'scoring' && (
        <div className="space-y-6">
          {!score && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-bold">Explainable Credit Scoring (Five Cs)</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Triangulates extracted financials with research data for recommendation.
                </p>
              </div>
              <button onClick={handleScore} disabled={loading.score}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all">
                {loading.score ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
                {loading.score ? 'Scoring...' : 'Run Score Engine'}
              </button>
            </div>
          )}

          {score && (
            <>
              {/* Score overview */}
              <div className="grid grid-cols-6 gap-4">
                <div className={`col-span-2 p-6 rounded-2xl border shadow-sm relative overflow-hidden ${decisionColor(score.decision)}`}>
                  <p className="text-[10px] font-bold uppercase opacity-60">Overall Score</p>
                  <p className="text-5xl font-bold mt-2">{Math.round(score.overall_score)}</p>
                  <p className="text-sm font-bold mt-2">{score.decision}</p>
                  <p className="text-[10px] mt-1 opacity-80">{score.decision_reason?.slice(0, 80)}</p>
                </div>
                {[
                  { label: 'Character', score: score.character_score, icon: '👤' },
                  { label: 'Capacity', score: score.capacity_score, icon: '📈' },
                  { label: 'Capital', score: score.capital_score, icon: '💰' },
                  { label: 'Collateral', score: score.collateral_score, icon: '🏠' },
                ].map((c, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">{c.label}</p>
                      <span>{c.icon}</span>
                    </div>
                    <p className={`text-2xl font-bold mt-2 ${c.score >= 70 ? 'text-emerald-600' : c.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {Math.round(c.score)}
                    </p>
                    <div className="mt-2 w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.score >= 70 ? 'bg-emerald-500' : c.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${c.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Radar chart */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-500" /> Risk Profile</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke={isDark ? '#3F3F46' : '#E4E4E7'} />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600, fill: isDark ? '#A1A1AA' : '#6B7280' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="A" stroke="#10B981" fill="#10B981" fillOpacity={isDark ? 0.3 : 0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Loan Recommendation */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Target size={18} className="text-blue-500" /> Loan Recommendation</h3>
                  <div className="space-y-3">
                    {[
                      ['Facility Type', entityData?.loan_type || 'Cash Credit / LC'],
                      ['Recommended Amount', score.recommended_amount ? formatCurrency(score.recommended_amount) : '—'],
                      ['Interest Rate', score.interest_rate || '—'],
                      ['DSCR', score.dscr ? `${score.dscr.toFixed(2)}x` : '—'],
                      ['Tenure', entityData?.loan_tenure_months ? `${entityData.loan_tenure_months} months` : '12 months'],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-sm text-zinc-500">{label}</span>
                        <span className="text-sm font-bold">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Explainability */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold flex items-center gap-2"><MessageSquareText size={18} className="text-violet-500" /> Reasoning Engine</h3>
                  <button onClick={handleExplain} disabled={loading.explain}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-all">
                    {loading.explain ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    {loading.explain ? 'Generating...' : 'Generate Explanation'}
                  </button>
                </div>
                {explanation ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase text-zinc-400">Data Quality</p>
                        <p className={`text-lg font-bold ${explanation.data_quality_score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {Math.round(explanation.data_quality_score)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase text-zinc-400">Confidence</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          explanation.confidence_level === 'HIGH' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                          'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                        }`}>{explanation.confidence_level}</span>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{explanation.narrative}</p>
                    {explanation.key_drivers?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Key Decision Drivers</p>
                        {explanation.key_drivers.map((d, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 mb-1">
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 text-[10px] font-bold shrink-0">{i + 1}</span>
                            {d}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 text-center py-6">Click "Generate Explanation" to produce an AI narrative.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ SWOT ANALYSIS ═══ */}
      {activeSection === 'swot' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold">Comprehensive SWOT Analysis</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                AI-generated SWOT triangulating financial data, research findings, and scoring.
              </p>
            </div>
            <button onClick={handleSWOT} disabled={loading.swot}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all">
              {loading.swot ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
              {loading.swot ? 'Generating...' : swot ? 'Refresh SWOT' : 'Generate SWOT'}
            </button>
          </div>

          {swot && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                  <h4 className="font-bold text-emerald-700 dark:text-emerald-400 mb-4 flex items-center gap-2">
                    <ArrowUpRight size={18} /> Strengths
                  </h4>
                  <ul className="space-y-2">
                    {swot.strengths?.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />{s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-2xl border border-rose-200 dark:border-rose-800">
                  <h4 className="font-bold text-rose-700 dark:text-rose-400 mb-4 flex items-center gap-2">
                    <ArrowDownRight size={18} /> Weaknesses
                  </h4>
                  <ul className="space-y-2">
                    {swot.weaknesses?.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-rose-800 dark:text-rose-300">
                        <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />{w}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Opportunities */}
                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <TrendingUp size={18} /> Opportunities
                  </h4>
                  <ul className="space-y-2">
                    {swot.opportunities?.map((o, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                        <Globe size={14} className="mt-0.5 shrink-0 text-blue-500" />{o}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Threats */}
                <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-800">
                  <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-2">
                    <AlertCircle size={18} /> Threats
                  </h4>
                  <ul className="space-y-2">
                    {swot.threats?.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                        <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />{t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* SWOT Summary */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h4 className="font-bold mb-3">Analysis Summary</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{swot.summary}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ FINAL REPORT ═══ */}
      {activeSection === 'report' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <div className="max-w-3xl">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase mb-6 ${
                score?.decision ? decisionColor(score.decision) : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}>
                {score?.decision === 'APPROVE' ? <CheckCircle2 size={12} /> : score?.decision === 'REJECT' ? <X size={12} /> : <AlertCircle size={12} />}
                AI Recommendation: {score?.decision || 'Pending'}
              </div>
              <h3 className="text-3xl font-bold tracking-tight mb-2">Final Investment Report</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Comprehensive credit assessment report for {companyName} combining extracted financials, secondary research, and AI analysis.
              </p>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-3">
                  {[
                    ['Entity', companyName],
                    ['Sector', entityData?.sector || '—'],
                    ['Facility Type', entityData?.loan_type || '—'],
                    ['Amount Requested', entityData?.loan_amount ? formatCurrency(entityData.loan_amount) : '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-sm text-zinc-500">{label}</span>
                      <span className="text-sm font-bold">{val}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {[
                    ['Credit Score', score ? `${Math.round(score.overall_score)}/100` : '—'],
                    ['Recommended Amount', score?.recommended_amount ? formatCurrency(score.recommended_amount) : '—'],
                    ['Interest Rate', score?.interest_rate || '—'],
                    ['DSCR', score?.dscr ? `${score.dscr.toFixed(2)}x` : '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-sm text-zinc-500">{label}</span>
                      <span className="text-sm font-bold">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate & Download */}
              <div className="flex gap-4">
                <button onClick={handleCAM} disabled={loading.cam || !score}
                  className="flex-1 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {loading.cam ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  {loading.cam ? 'Generating...' : 'Generate Final Report'}
                </button>
                {companyId && (
                  <div className="flex gap-2">
                    <a href={downloadCAMUrl(companyId, 'pdf')} target="_blank" rel="noreferrer"
                      className="px-6 py-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 text-sm font-bold text-rose-600">
                      <Download size={16} /> PDF
                    </a>
                    <a href={downloadCAMUrl(companyId, 'docx')} target="_blank" rel="noreferrer"
                      className="px-6 py-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 text-sm font-bold text-blue-600">
                      <Download size={16} /> DOCX
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Strengths & Risks summary */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" /> Key Strengths
              </h4>
              <ul className="space-y-2">
                {(swot?.strengths || research?.positive_factors || ['Complete analysis to identify strengths']).slice(0, 5).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500" /> Key Risks
              </h4>
              <ul className="space-y-2">
                {(swot?.threats || research?.early_warning_signals || ['Complete analysis to identify risks']).slice(0, 5).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
