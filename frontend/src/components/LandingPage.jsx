import React, { useState, useEffect, useRef } from 'react'
import {
  ChevronRight, Moon, Sun, FileUp, Search, Globe, TrendingUp, ShieldCheck,
  Clock, AlertTriangle, CheckCircle2, ArrowRight, Zap, Brain, Database,
  BarChart3, FileText, Scale, Activity, Cpu, Layers, GitBranch, Box
} from 'lucide-react'
import OrbitLogo from '../assets/Orbit.png'

/* ── Animated Counter Hook ──────────────────────────────────── */
const useCounter = (end, duration = 2000, startOnView = true) => {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    if (!startOnView) { setCount(end); return }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const startTime = performance.now()
          const animate = (now) => {
            const progress = Math.min((now - startTime) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)     // ease-out cubic
            setCount(Math.round(eased * end))
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end, duration, startOnView])

  return [count, ref]
}

/* ── Fade-in-on-scroll wrapper ──────────────────────────────── */
const FadeIn = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export const LandingPage = ({ onStart, isDark, toggleDark }) => {
  const [timeManual, timeManualRef]   = useCounter(14, 2000)
  const [timeOrbit, timeOrbitRef]     = useCounter(8, 2000)
  const [accuracy, accuracyRef]       = useCounter(95, 2000)
  const [costSave, costSaveRef]       = useCounter(80, 2000)

  return (
  <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white overflow-x-hidden transition-colors duration-300 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">

    {/* ── Navbar ── */}
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-100 dark:border-zinc-800/50">
      <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-0.5">
          <img src={OrbitLogo} alt="Orbit" className="w-15.75 h-15.75 object-contain" />
          <span className="font-bold text-xl tracking-tight">Orbit</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          <a href="#comparison" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Why Orbit</a>
          <a href="#how-it-works" className="hover:text-zinc-900 dark:hover:text-white transition-colors">How It Works</a>
          <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Features</a>
          <a href="#architecture" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Architecture</a>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleDark} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" aria-label="Toggle theme">
            {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-zinc-500" />}
          </button>
          <button onClick={onStart} className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg">
            Launch Engine
          </button>
        </div>
      </div>
    </nav>

    {/* ── Hero ── */}
    <section className="px-8 pt-20 pb-32 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI-Powered Credit Appraisal Engine
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] mb-8">
            From <span className="text-zinc-400 dark:text-zinc-600 line-through decoration-rose-500/60">14 days</span><br />
            to <span className="text-emerald-500">8 minutes.</span>
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-lg mb-10 leading-relaxed">
            Orbit automates end-to-end Credit Appraisal Memo (CAM) generation for corporate lending.
            AI-driven research, risk scoring, and document synthesis — replacing weeks of manual effort.
          </p>
          <div className="flex flex-wrap gap-4">
            <button onClick={onStart} className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center gap-3 group shadow-xl">
              Try Live Demo
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <a href="#comparison" className="px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all flex items-center gap-2">
              See Comparison <ArrowRight size={16} />
            </a>
          </div>
        </div>

        {/* Right — live analysis card */}
        <div className="relative">
          <div className="absolute -inset-4 bg-zinc-100 dark:bg-zinc-900 rounded-[40px] -z-10 rotate-2 transition-colors" />
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-4xl border border-zinc-200 dark:border-zinc-800 shadow-2xl transition-colors">
            <div className="flex items-center justify-between mb-8">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="px-3 py-1 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold">
                LIVE ANALYSIS
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Risk Score</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">82/100</span>
                </div>
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-900 dark:bg-white rounded-full w-[82%] transition-all duration-1000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm">
                  <Globe size={16} className="text-blue-500 mb-2" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Web Intel</p>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">34 Signals</p>
                </div>
                <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm">
                  <ShieldCheck size={16} className="text-emerald-500 mb-2" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Compliance</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Verified</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-emerald-400 dark:text-emerald-600" />
                  <span className="text-xs font-bold">Recommendation</span>
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Approve ₹50 Cr limit with 9.25% ROI based on strong DSCR and promoter history.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ────────────────────────────────────────────────────────────── */}
    {/* ── Manual vs Orbit — The Core Comparison ─────────────────── */}
    {/* ────────────────────────────────────────────────────────────── */}
    <section id="comparison" className="px-8 py-28 bg-zinc-50 dark:bg-zinc-900/50 transition-colors">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-widest mb-4">
              <AlertTriangle size={12} /> The Problem
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Manual Process is Broken.</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
              Indian banks spend 10–14 days preparing each Credit Appraisal Memo manually.
              Orbit compresses the entire pipeline into minutes with AI.
            </p>
          </div>
        </FadeIn>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Manual Process Card */}
          <FadeIn delay={100}>
            <div className="relative bg-white dark:bg-zinc-900 rounded-3xl border-2 border-rose-200 dark:border-rose-900/50 p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 dark:bg-rose-900/10 rounded-bl-[80px] z-0" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                    <Clock size={20} className="text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Manual Process</h3>
                    <p className="text-xs text-rose-500 font-semibold">Traditional Approach</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {[
                    { step: 'Collect documents from borrower',     time: '2–3 days',  icon: FileUp },
                    { step: 'Read & extract financial data',       time: '2–3 days',  icon: FileText },
                    { step: 'Google search & MCA/court checks',    time: '2–3 days',  icon: Search },
                    { step: 'Calculate ratios & risk score',       time: '1–2 days',  icon: BarChart3 },
                    { step: 'Write CAM report manually',           time: '2–3 days',  icon: Scale },
                    { step: 'Manager review & corrections',        time: '1–2 days',  icon: AlertTriangle },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20">
                      <item.icon size={16} className="text-rose-400 shrink-0" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{item.step}</span>
                      <span className="text-xs font-bold text-rose-500 whitespace-nowrap">{item.time}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                  <div>
                    <p className="text-[10px] font-bold text-rose-400 uppercase">Total Time</p>
                    <p className="text-3xl font-bold text-rose-600 dark:text-rose-400" ref={timeManualRef}>{timeManual} days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-rose-400 uppercase">Accuracy</p>
                    <p className="text-lg font-bold text-rose-600 dark:text-rose-400">~60–70%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-rose-400 uppercase">Cost</p>
                    <p className="text-lg font-bold text-rose-600 dark:text-rose-400">₹15K+/case</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Orbit Process Card */}
          <FadeIn delay={250}>
            <div className="relative bg-white dark:bg-zinc-900 rounded-3xl border-2 border-emerald-200 dark:border-emerald-900/50 p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-bl-[80px] z-0" />
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold z-10 animate-pulse">
                AI-POWERED
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Zap size={20} className="text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Orbit Process</h3>
                    <p className="text-xs text-emerald-500 font-semibold">AI-Automated Pipeline</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {[
                    { step: 'Upload PDFs — auto-parsed with OCR',     time: '30 sec',   icon: FileUp },
                    { step: 'RAG-powered data extraction & indexing', time: '60 sec',   icon: Database },
                    { step: '6 parallel web searches + litigation AI', time: '90 sec',  icon: Globe },
                    { step: 'Five Cs scoring with 15+ Indian ratios', time: '45 sec',   icon: BarChart3 },
                    { step: 'Auto-generated CAM (DOCX + PDF)',       time: '60 sec',   icon: FileText },
                    { step: 'Risk flags & recommendation ready',      time: '30 sec',  icon: CheckCircle2 },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                      <item.icon size={16} className="text-emerald-400 shrink-0" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{item.step}</span>
                      <span className="text-xs font-bold text-emerald-500 whitespace-nowrap">{item.time}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase">Total Time</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400" ref={timeOrbitRef}>~{timeOrbit} min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase">Accuracy</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400" ref={accuracyRef}>{accuracy}%+</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase">Cost</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">~₹50/case</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Impact stats bar */}
        <FadeIn delay={400}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Faster Processing',  value: '250×',  sub: '14 days → 8 min',    color: 'text-blue-500' },
              { label: 'Cost Reduction',      value: '80%',   sub: '₹15K → ₹50/case',    color: 'text-emerald-500', ref: costSaveRef, animated: costSave },
              { label: 'Data Sources',        value: '6+',    sub: 'Parallel web searches', color: 'text-amber-500' },
              { label: 'Indian Ratios',       value: '15+',   sub: 'DSCR, ROE, ROCE...',   color: 'text-purple-500' },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 text-center hover:shadow-lg transition-shadow">
                <p className={`text-3xl md:text-4xl font-bold ${s.color}`} ref={s.ref}>{s.animated ? `${s.animated}%` : s.value}</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white mt-1">{s.label}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>

    {/* ────────────────────────────────────────────────────────────── */}
    {/* ── How It Works — Pipeline Visualization ─────────────────── */}
    {/* ────────────────────────────────────────────────────────────── */}
    <section id="how-it-works" className="px-8 py-28 transition-colors">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-4">
              <GitBranch size={12} /> Working Prototype
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Four Steps. One CAM.</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
              Upload documents, let AI research and score, then download a bank-ready Credit Appraisal Memo.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-zinc-200 dark:bg-zinc-800 z-0" />

          {[
            {
              step: '01',
              title: 'Data Ingestion',
              icon: FileUp,
              color: 'bg-blue-500',
              desc: 'Upload GST filings, ITRs, bank statements, annual reports. PyMuPDF extracts text; Tesseract OCR handles scanned pages.',
              tech: ['PyMuPDF', 'Tesseract OCR', 'Section Detection']
            },
            {
              step: '02',
              title: 'Research Agent',
              icon: Globe,
              color: 'bg-amber-500',
              desc: '6 parallel Tavily web searches: news, MCA filings, NCLT cases, RBI actions, SEBI orders, and sector outlook.',
              tech: ['Tavily API', 'Groq LLM', 'Litigation AI']
            },
            {
              step: '03',
              title: 'Credit Scoring',
              icon: BarChart3,
              color: 'bg-purple-500',
              desc: 'Five Cs weighted scorecard (Character, Capacity, Capital, Collateral, Conditions) with 15+ Indian financial ratios.',
              tech: ['Five Cs Model', '15+ Ratios', 'Risk Flags']
            },
            {
              step: '04',
              title: 'CAM Generation',
              icon: FileText,
              color: 'bg-emerald-500',
              desc: 'Auto-generates a 10-section Credit Appraisal Memo in both DOCX and PDF format, ready for bank submission.',
              tech: ['python-docx', 'ReportLab', 'Auto-format']
            },
          ].map((s, i) => (
            <FadeIn key={i} delay={i * 150} className="relative z-10">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-xl transition-all group h-full">
                <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center mb-5 text-white group-hover:scale-110 transition-transform shadow-lg`}>
                  <s.icon size={22} />
                </div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Step {s.step}</div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">{s.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.tech.map((t, j) => (
                    <span key={j} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>

    {/* ────────────────────────────────────────────────────────────── */}
    {/* ── Key Features — Deep Dive ──────────────────────────────── */}
    {/* ────────────────────────────────────────────────────────────── */}
    <section id="features" className="px-8 py-28 bg-zinc-50 dark:bg-zinc-900/50 transition-colors">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-4">
              <Layers size={12} /> Key Features
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-4">Built for Indian Corporate Lending.</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-xl">
              Every feature is purpose-built for the Indian credit ecosystem — from GST validation to NCLT litigation detection.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'PDF + OCR Parsing',
              icon: FileUp,
              color: 'text-blue-500',
              bg: 'bg-blue-50 dark:bg-blue-900/20',
              desc: 'Handles both text-based and scanned image PDFs. Auto-detects sections like Balance Sheet, P&L, Directors Report.',
              highlight: 'PyMuPDF + Tesseract'
            },
            {
              title: 'RAG-Powered Search',
              icon: Database,
              color: 'text-indigo-500',
              bg: 'bg-indigo-50 dark:bg-indigo-900/20',
              desc: 'Documents are chunked, embedded with MiniLM-L6-v2, and indexed in FAISS for semantic search and contextual retrieval.',
              highlight: 'FAISS + HuggingFace'
            },
            {
              title: 'AI Research Agent',
              icon: Globe,
              color: 'text-amber-500',
              bg: 'bg-amber-50 dark:bg-amber-900/20',
              desc: '6 parallel web searches via Tavily: financial news, MCA filings, NCLT/IBC cases, SEBI actions, RBI penalties, sector trends.',
              highlight: '6 Parallel Searches'
            },
            {
              title: 'GST Fraud Detection',
              icon: ShieldCheck,
              color: 'text-rose-500',
              bg: 'bg-rose-50 dark:bg-rose-900/20',
              desc: 'Cross-validates GSTR-2B vs GSTR-3B to detect ITC overclaims, circular trading, and revenue inflation patterns.',
              highlight: 'GSTR-2B vs 3B'
            },
            {
              title: 'Five Cs Scorecard',
              icon: BarChart3,
              color: 'text-purple-500',
              bg: 'bg-purple-50 dark:bg-purple-900/20',
              desc: 'Weighted scorecard: Character (25%), Capacity (30%), Capital (20%), Collateral (15%), Conditions (10%). Fully transparent.',
              highlight: '15+ Indian Ratios'
            },
            {
              title: 'CAM Auto-Generation',
              icon: FileText,
              color: 'text-emerald-500',
              bg: 'bg-emerald-50 dark:bg-emerald-900/20',
              desc: '10-section professional CAM with Executive Summary, Financial Analysis, Risk Flags, Recommendation — in DOCX & PDF.',
              highlight: 'Bank-Ready Output'
            },
          ].map((f, i) => (
            <FadeIn key={i} delay={i * 100}>
              <div className="bg-white dark:bg-zinc-900 p-7 rounded-3xl border border-zinc-200 dark:border-zinc-800 hover:shadow-xl transition-all group h-full">
                <div className={`w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${f.color}`}>
                  <f.icon size={22} />
                </div>
                <h3 className="text-lg font-bold mb-2 text-zinc-900 dark:text-white">{f.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">{f.desc}</p>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  {f.highlight}
                </span>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>

    {/* ────────────────────────────────────────────────────────────── */}
    {/* ── Technical Architecture ─────────────────────────────────── */}
    {/* ────────────────────────────────────────────────────────────── */}
    <section id="architecture" className="px-8 py-28 transition-colors">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase tracking-widest mb-4">
              <Cpu size={12} /> Technical Architecture
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Under the Hood.</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
              A modular, production-grade architecture combining LLMs, RAG, and real-time web intelligence.
            </p>
          </div>
        </FadeIn>

        {/* Architecture layers */}
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Frontend Layer */}
          <FadeIn delay={0}>
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <Box size={16} className="text-cyan-500" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white">Frontend — React + Vite + TailwindCSS</h3>
                <span className="ml-auto text-[10px] font-bold text-cyan-500 uppercase">Presentation Layer</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['React 19', 'Vite 7', 'TailwindCSS 4', 'Recharts', 'Lucide Icons', 'Motion', 'Axios'].map(t => (
                  <span key={t} className="px-3 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/15 text-cyan-700 dark:text-cyan-400 text-xs font-semibold border border-cyan-100 dark:border-cyan-900/30">{t}</span>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Arrow */}
          <FadeIn delay={50}><div className="flex justify-center"><ArrowRight size={20} className="text-zinc-300 dark:text-zinc-700 rotate-90" /></div></FadeIn>

          {/* API Layer */}
          <FadeIn delay={100}>
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Activity size={16} className="text-emerald-500" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white">API Layer — FastAPI (Python)</h3>
                <span className="ml-auto text-[10px] font-bold text-emerald-500 uppercase">REST API</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { route: '/ingest',   desc: 'Upload & Parse',    color: 'blue' },
                  { route: '/research', desc: 'Web Intel Agent',    color: 'amber' },
                  { route: '/appraise', desc: 'Credit Scoring',     color: 'purple' },
                  { route: '/cam',      desc: 'CAM Generation',     color: 'emerald' },
                ].map(r => (
                  <div key={r.route} className={`p-3 rounded-xl bg-${r.color}-50 dark:bg-${r.color}-900/15 border border-${r.color}-100 dark:border-${r.color}-900/30`}>
                    <code className={`text-xs font-bold text-${r.color}-600 dark:text-${r.color}-400`}>{r.route}</code>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Arrow */}
          <FadeIn delay={150}><div className="flex justify-center"><ArrowRight size={20} className="text-zinc-300 dark:text-zinc-700 rotate-90" /></div></FadeIn>

          {/* Service Layer */}
          <FadeIn delay={200}>
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Brain size={16} className="text-purple-500" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white">AI Service Layer</h3>
                <span className="ml-auto text-[10px] font-bold text-purple-500 uppercase">Core Intelligence</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    name: 'Research Agent',
                    items: ['6 Parallel Tavily Searches', 'Litigation Pattern Matching', 'RBI/SEBI Regulatory Rules', 'Groq LLM Synthesis'],
                    color: 'amber'
                  },
                  {
                    name: 'RAG Pipeline',
                    items: ['MiniLM-L6-v2 Embeddings', 'FAISS Vector Store', 'Cosine Similarity Search', 'Document Chunking (800 tokens)'],
                    color: 'indigo'
                  },
                  {
                    name: 'Credit Scorer',
                    items: ['Five Cs Weighted Model', '15+ Indian Ratios', 'GST Fraud Detection (2B vs 3B)', 'Risk Flag Engine'],
                    color: 'emerald'
                  },
                ].map(svc => (
                  <div key={svc.name} className={`p-4 rounded-2xl bg-${svc.color}-50 dark:bg-${svc.color}-900/10 border border-${svc.color}-100 dark:border-${svc.color}-900/20`}>
                    <p className={`text-xs font-bold text-${svc.color}-600 dark:text-${svc.color}-400 mb-2`}>{svc.name}</p>
                    <ul className="space-y-1.5">
                      {svc.items.map(item => (
                        <li key={item} className="flex items-start gap-1.5">
                          <CheckCircle2 size={10} className={`text-${svc.color}-400 mt-0.5 shrink-0`} />
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Arrow */}
          <FadeIn delay={250}><div className="flex justify-center"><ArrowRight size={20} className="text-zinc-300 dark:text-zinc-700 rotate-90" /></div></FadeIn>

          {/* External Services */}
          <FadeIn delay={300}>
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Globe size={16} className="text-amber-500" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white">External Services & Models</h3>
                <span className="ml-auto text-[10px] font-bold text-amber-500 uppercase">Integrations</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Groq Cloud',            desc: 'LLM Inference (GPT-oss-120B)',   color: 'zinc' },
                  { name: 'Tavily API',             desc: 'Real-time Web Search',           color: 'zinc' },
                  { name: 'FAISS',                  desc: 'Vector Similarity Search',       color: 'zinc' },
                  { name: 'HuggingFace',            desc: 'MiniLM-L6-v2 Embeddings',       color: 'zinc' },
                  { name: 'python-docx',            desc: 'DOCX Generation',                color: 'zinc' },
                  { name: 'ReportLab',              desc: 'PDF Generation',                 color: 'zinc' },
                ].map(s => (
                  <div key={s.name} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">{s.name}</span>
                    <span className="text-[10px] text-zinc-400">— {s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>

    {/* ── Footer ── */}
    <footer className="px-8 py-12 border-t border-zinc-100 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-0.5">
          <img src={OrbitLogo} alt="Orbit" className="w-15.75 h-15.75 object-contain" />
          <span className="font-bold text-sm text-zinc-900 dark:text-white">Orbit</span>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          © 2025 Orbit Credit Engine — AI-Powered Corporate Credit Appraisal.
        </p>
        <div className="flex gap-6 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {['Privacy', 'Terms', 'Security'].map(l => (
            <a key={l} href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">{l}</a>
          ))}
        </div>
      </div>
    </footer>
  </div>
  )
}
