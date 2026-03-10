import React, { useState } from 'react'
import {
  ChevronRight, Building2, FileUp, Table2, BarChart3,
  CheckCircle2, AlertCircle, X, Loader2
} from 'lucide-react'
import EntityOnboarding from './EntityOnboarding'
import DataIngestion from './DataIngestion'
import ExtractionReview from './ExtractionReview'
import AnalysisReport from './AnalysisReport'

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

// ── Steps ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 'onboarding',  label: 'Entity Onboarding',    icon: Building2 },
  { id: 'ingestion',   label: 'Data Ingestion',        icon: FileUp },
  { id: 'extraction',  label: 'Extraction & Schema',   icon: Table2 },
  { id: 'analysis',    label: 'Analysis & Report',     icon: BarChart3 },
]

export const ApplicationFlow = ({ application, onBack, onCreated, isDark }) => {
  const [step, setStep]               = useState(application?.company_id ? 'analysis' : 'onboarding')
  const [companyId, setCompanyId]     = useState(application?.company_id || application?.id || null)
  const [companyName, setCompanyName] = useState(application?.company_name || application?.name || '')
  const [entityData, setEntityData]   = useState(null)
  const [toast, setToast]             = useState(null)
  const [completed, setCompleted]     = useState(
    application?.company_id ? { onboarding: true, ingestion: true, extraction: true } : {}
  )

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    if (type !== 'loading') setTimeout(() => setToast(null), 3500)
  }

  const markComplete = (stepId) => setCompleted(p => ({ ...p, [stepId]: true }))

  const stepIndex = STEPS.findIndex(s => s.id === step)

  // ── Stage handlers ──
  const onOnboardingComplete = (data) => {
    setCompanyId(data.company_id)
    setCompanyName(data.company_name)
    setEntityData(data)
    markComplete('onboarding')
    onCreated?.({ company_id: data.company_id, company_name: data.company_name, status: 'onboarded' })
    setStep('ingestion')
    showToast('Entity onboarded successfully')
  }

  const onIngestionComplete = () => {
    markComplete('ingestion')
    setStep('extraction')
    showToast('Documents ingested & classified')
  }

  const advanceFromExtraction = () => {
    markComplete('extraction')
    setStep('analysis')
    showToast('Extraction complete — proceeding to analysis')
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
              <span>ID: {companyId || 'Pending'}</span>
              {companyId && <><span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" /><span className="text-emerald-500 font-medium">Active</span></>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
        {STEPS.map((s, idx) => {
          const isCompleted = completed[s.id]
          const isCurrent = step === s.id
          const canNav = isCompleted || isCurrent || (idx === 0)
          return (
            <button key={s.id} onClick={() => canNav && setStep(s.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                isCurrent
                  ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                  : isCompleted
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              } ${!canNav ? 'opacity-40 cursor-not-allowed' : ''}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mr-1 ${
                isCompleted ? 'bg-emerald-500 text-white' :
                isCurrent ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' :
                'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
              }`}>
                {isCompleted ? <CheckCircle2 size={12} /> : idx + 1}
              </div>
              <s.icon size={16} />{s.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto bg-[#F8F9FA] dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto">

          {/* ═══ STAGE 1: ENTITY ONBOARDING ═══ */}
          {step === 'onboarding' && (
            <EntityOnboarding onComplete={onOnboardingComplete} existingData={entityData} />
          )}

          {/* ═══ STAGE 2: DATA INGESTION ═══ */}
          {step === 'ingestion' && (
            <DataIngestion
              companyId={companyId}
              companyName={companyName}
              entityData={entityData}
              onComplete={onIngestionComplete}
              onToast={showToast}
            />
          )}

          {/* ═══ STAGE 3: EXTRACTION & SCHEMA ═══ */}
          {step === 'extraction' && (
            <div className="space-y-6">
              <ExtractionReview companyId={companyId} onToast={showToast} />
              <div className="flex justify-end">
                <button onClick={advanceFromExtraction}
                  className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all">
                  Proceed to Analysis <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ═══ STAGE 4: ANALYSIS & REPORT ═══ */}
          {step === 'analysis' && (
            <AnalysisReport
              companyId={companyId}
              companyName={companyName}
              entityData={entityData}
              isDark={isDark}
              onToast={showToast}
            />
          )}

        </div>
      </div>
    </div>
  )
}
