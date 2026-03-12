import React, { useState, useRef, useEffect } from 'react'
import {
  Upload, FileText, X, Loader2, CheckCircle2, AlertCircle,
  Edit3, Shield, BarChart3, Users, Landmark,
  PieChart, FileUp, Wifi, WifiOff
} from 'lucide-react'
import { uploadDocuments, getIngestStatus, getClassifications, approveClassifications } from '../api/client'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const DOC_TYPES = [
  { key: 'alm',            label: 'ALM (Asset-Liability Management)', icon: BarChart3,  color: 'blue',    desc: 'Maturity profiles, liquidity gaps, interest rate sensitivity' },
  { key: 'shareholding',   label: 'Shareholding Pattern',             icon: Users,       color: 'violet',  desc: 'Equity distribution, promoter holdings, institutional investors' },
  { key: 'borrowing',      label: 'Borrowing Profile',                icon: Landmark,    color: 'amber',   desc: 'Existing credit facilities, lenders, outstanding amounts' },
  { key: 'annual_report',  label: 'Annual Reports (P&L, BS, CF)',     icon: FileText,    color: 'emerald', desc: 'Profit & Loss, Balance Sheet, Cash Flow statements' },
  { key: 'portfolio',      label: 'Portfolio Cuts / Performance',     icon: PieChart,    color: 'rose',    desc: 'Asset quality, NPA data, portfolio performance metrics' },
]

const TYPE_COLORS = {
  blue:    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
  violet:  'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400',
  amber:   'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400',
  rose:    'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400',
}

// ── Wait until backend responds (up to 90 seconds) ──────────────────────────
async function waitForBackend(onProgress) {
  const MAX_TRIES = 18   // 18 × 5s = 90 seconds
  for (let i = 0; i < MAX_TRIES; i++) {
    try {
      const res = await axios.get(`${BASE_URL}/`, { timeout: 8000 })
      if (res.status === 200) return { ok: true }
    } catch (e) {
      const secs = (MAX_TRIES - i - 1) * 5
      onProgress(`Backend waking up… ${secs}s remaining (attempt ${i + 1}/${MAX_TRIES})`)
    }
    await new Promise(r => setTimeout(r, 5000))
  }
  return { ok: false }
}

export default function DataIngestion({ companyId, companyName, entityData, onComplete, onToast }) {
  const [filesByType, setFilesByType] = useState({})
  const [classifications, setClassifications] = useState([])
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [ingestStatus, setIngestStatus] = useState(null)
  const [editingClassification, setEditingClassification] = useState(null)
  const [wakeStatus, setWakeStatus] = useState('')       // shown during wake-up
  const [backendAlive, setBackendAlive] = useState(null) // null=unknown, true, false
  const fileRefs = useRef({})

  // ── Check backend on mount ──────────────────────────────────────────────────
  useEffect(() => {
    axios.get(`${BASE_URL}/`, { timeout: 8000 })
      .then(() => setBackendAlive(true))
      .catch(() => setBackendAlive(false))
  }, [])

  // ── Load existing classifications ───────────────────────────────────────────
  useEffect(() => {
    if (companyId) {
      getClassifications(companyId).then(r => {
        if (r.data.classifications?.length) setClassifications(r.data.classifications)
      }).catch(() => {})
      getIngestStatus(companyId).then(r => {
        setIngestStatus(r.data)
        if (r.data.status === 'ready') setProcessing(false)
      }).catch(() => {})
    }
  }, [companyId])

  const handleFileSelect = (docType) => (e) => {
    const newFiles = Array.from(e.target.files || [])
    setFilesByType(prev => ({ ...prev, [docType]: [...(prev[docType] || []), ...newFiles] }))
  }

  const removeFile = (docType, idx) => {
    setFilesByType(prev => ({ ...prev, [docType]: prev[docType].filter((_, i) => i !== idx) }))
  }

  const allFiles = Object.entries(filesByType).flatMap(([type, files]) =>
    files.map(f => ({ file: f, assignedType: type }))
  )

  const handleUpload = async () => {
    if (!allFiles.length) {
      onToast?.('Please upload at least one document', 'error')
      return
    }

    setUploading(true)

    // ── Step 1: Wake backend ─────────────────────────────────────────────────
    setWakeStatus('Connecting to backend…')
    onToast?.('Connecting to backend — please wait up to 60s', 'loading')

    const { ok } = await waitForBackend(msg => setWakeStatus(msg))
    setWakeStatus('')

    if (!ok) {
      setUploading(false)
      setBackendAlive(false)
      onToast?.('Backend unreachable after 90s. Check Render dashboard.', 'error')
      return
    }

    setBackendAlive(true)
    onToast?.('Backend alive — uploading documents…', 'loading')

    // ── Step 2: Upload ───────────────────────────────────────────────────────
    try {
      const fd = new FormData()
      fd.append('company_name', companyName)
      if (companyId) fd.append('company_id', companyId)
      allFiles.forEach(({ file }) => fd.append('files', file))

      const res = await uploadDocuments(fd)
      const id = res.data.company_id

      onToast?.('Documents uploaded — processing…', 'loading')
      setProcessing(true)

      // ── Step 3: Poll until ready ─────────────────────────────────────────
      const poll = async () => {
        try {
          const statusRes = await getIngestStatus(id)
          setIngestStatus(statusRes.data)
          if (statusRes.data.status === 'ready') {
            setProcessing(false)
            const classRes = await getClassifications(id)
            if (classRes.data.classifications?.length) setClassifications(classRes.data.classifications)
            onToast?.('Documents parsed & indexed successfully ✓', 'success')
            onComplete?.({ company_id: id, status: 'ready', classifications: classRes.data.classifications || [] })
          } else if (statusRes.data.status === 'error') {
            setProcessing(false)
            onToast?.(`Processing error: ${statusRes.data.error || 'unknown'}`, 'error')
          } else {
            setTimeout(poll, 3000)
          }
        } catch {
          setTimeout(poll, 3000)
        }
      }
      setTimeout(poll, 2000)

    } catch (e) {
      const status = e.response?.status
      const detail = e.response?.data?.detail
      if (!e.response) {
        onToast?.(`Network error — backend dropped the connection. Try again.`, 'error')
      } else if (status === 422) {
        onToast?.(`Validation error: ${detail || 'check form fields'}`, 'error')
      } else if (status === 500) {
        onToast?.(`Server error 500: ${detail || 'check Render logs'}`, 'error')
      } else {
        onToast?.(`Upload failed (${status}): ${detail || e.message}`, 'error')
      }
    }

    setUploading(false)
  }

  const handleApproveClassification = async (idx, approved, overrideType) => {
    const updated = [...classifications]
    updated[idx] = {
      ...updated[idx],
      user_approved: approved,
      user_override_type: overrideType || null,
      final_type: overrideType || updated[idx].auto_type,
    }
    setClassifications(updated)
    try {
      await approveClassifications({
        company_id: companyId,
        classifications: updated.map(c => ({
          filename: c.filename,
          classified_type: c.final_type || c.auto_type,
          user_approved: c.user_approved || false,
          user_override_type: c.user_override_type || null,
        })),
      })
    } catch {}
  }

  const totalFiles = allFiles.length
  const isReady = ingestStatus?.status === 'ready'
  const allApproved = classifications.length > 0 && classifications.every(c => c.user_approved)

  return (
    <div className="space-y-6">

      {/* Backend status banner */}
      {backendAlive === false && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400">
          <WifiOff size={16} className="shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">Backend is sleeping (Render free tier)</p>
            <p className="text-xs mt-0.5">Click "Upload & Process" — it will wake up automatically (takes ~30–60s).</p>
          </div>
        </div>
      )}
      {backendAlive === true && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
          <Wifi size={14} /> Backend is online
        </div>
      )}

      {/* Wake-up progress */}
      {wakeStatus && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Loader2 size={16} className="animate-spin text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{wakeStatus}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileUp size={20} className="text-zinc-500" />
              Intelligent Data Ingestion
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Upload 5 critical document types. Files will be auto-classified and parsed.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {totalFiles > 0 && (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 px-3 py-1 rounded-full">
                {totalFiles} files selected
              </span>
            )}
            {isReady && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 size={12} /> Processed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Upload slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOC_TYPES.map(dt => {
          const files = filesByType[dt.key] || []
          return (
            <div key={dt.key} className={`p-5 rounded-2xl border ${TYPE_COLORS[dt.color]} transition-all`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <dt.icon size={18} />
                  <h4 className="text-sm font-bold">{dt.label}</h4>
                </div>
                {files.length > 0 && (
                  <span className="text-[10px] font-bold bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full">{files.length}</span>
                )}
              </div>
              <p className="text-[10px] opacity-70 mb-3">{dt.desc}</p>
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2 mb-1 rounded-lg bg-white/60 dark:bg-zinc-800/60 text-xs">
                  <span className="truncate max-w-32 font-medium">{f.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] opacity-60">{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removeFile(dt.key, i)}><X size={12} /></button>
                  </div>
                </div>
              ))}
              <input
                ref={el => fileRefs.current[dt.key] = el}
                type="file" className="hidden" multiple
                accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
                onChange={handleFileSelect(dt.key)}
              />
              <button
                onClick={() => fileRefs.current[dt.key]?.click()}
                className="w-full mt-2 py-2 border border-dashed border-current/30 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-white/30 dark:hover:bg-zinc-800/30 transition-all flex items-center justify-center gap-1"
              >
                <Upload size={10} /> Upload {dt.label.split('(')[0].trim()}
              </button>
            </div>
          )
        })}
      </div>

      {/* Upload button */}
      {totalFiles > 0 && !isReady && (
        <button
          onClick={handleUpload}
          disabled={uploading || processing}
          className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {uploading || processing
            ? <><Loader2 size={18} className="animate-spin" />
                {wakeStatus ? 'Waking backend…' : processing ? 'Processing documents…' : 'Uploading…'}</>
            : <><Upload size={18} /> Upload & Process {totalFiles} Documents</>
          }
        </button>
      )}

      {/* Classification results */}
      {classifications.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <Shield size={18} className="text-blue-500" /> Auto-Classification Results
            </h3>
            <p className="text-[10px] text-zinc-400 uppercase font-bold">
              {classifications.filter(c => c.user_approved).length}/{classifications.length} Approved
            </p>
          </div>
          <div className="space-y-2">
            {classifications.map((cls, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                cls.user_approved
                  ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
              }`}>
                <div className="flex items-center gap-3 flex-1">
                  <FileText size={16} className="text-zinc-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{cls.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                        {(cls.final_type || cls.auto_type || '').replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {Math.round((cls.confidence || 0) * 100)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {editingClassification === idx ? (
                    <select
                      value={cls.user_override_type || cls.auto_type}
                      onChange={(e) => { handleApproveClassification(idx, true, e.target.value); setEditingClassification(null) }}
                      className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                      autoFocus onBlur={() => setEditingClassification(null)}
                    >
                      {DOC_TYPES.map(dt => <option key={dt.key} value={dt.key}>{dt.label}</option>)}
                      <option value="gst_filing">GST Filing</option>
                      <option value="bank_statement">Bank Statement</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <button onClick={() => setEditingClassification(idx)}
                      className="text-[10px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1">
                      <Edit3 size={10} /> Edit
                    </button>
                  )}
                  {!cls.user_approved ? (
                    <>
                      <button onClick={() => handleApproveClassification(idx, true)}
                        className="px-2 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700">Approve</button>
                      <button onClick={() => handleApproveClassification(idx, false, 'rejected')}
                        className="px-2 py-1 text-[10px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700">Deny</button>
                    </>
                  ) : (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
          {allApproved && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2">
                <CheckCircle2 size={14} /> All classifications approved — proceed to schema mapping.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Processing spinner */}
      {processing && (
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-blue-500" />
          <div>
            <p className="text-sm font-medium">Processing documents…</p>
            <p className="text-[10px] text-zinc-400">{ingestStatus?.status || 'Parsing'} — Building RAG index</p>
          </div>
        </div>
      )}
    </div>
  )
}
