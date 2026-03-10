import React, { useState } from 'react'
import {
  Building2, FileText, IndianRupee, ChevronRight, ChevronLeft,
  CheckCircle2, Loader2, User, MapPin, Briefcase, CreditCard,
  Hash, Calendar, Users, Award, Landmark, Target, Shield,
  Wallet, Clock, FileCheck
} from 'lucide-react'
import { createEntity } from '../api/client'

const SECTORS = [
  'IT Services', 'Manufacturing', 'Infrastructure', 'NBFC', 'Pharma',
  'FMCG', 'Real Estate', 'Agriculture', 'Automobile', 'Textiles',
  'Chemicals', 'Metals & Mining', 'Power & Energy', 'Telecom',
  'Healthcare', 'Education', 'Logistics', 'Retail', 'Financial Services', 'Other'
]

const LOAN_TYPES = [
  'Term Loan', 'Working Capital', 'Cash Credit', 'Letter of Credit',
  'Bank Guarantee', 'Overdraft', 'Project Finance', 'WCDL',
  'Bill Discounting', 'Channel Finance', 'Other'
]

const COLLATERAL_TYPES = [
  'Property (Commercial)', 'Property (Residential)', 'Plant & Machinery',
  'Inventory', 'Receivables', 'Fixed Deposits', 'Securities/Shares',
  'Personal Guarantee', 'Corporate Guarantee', 'None'
]

const Field = ({ label, icon: Icon, children, required }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
      {Icon && <Icon size={12} />}
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
  </div>
)

const Input = ({ value, onChange, placeholder, type = 'text', ...props }) => (
  <input
    value={value} onChange={onChange} placeholder={placeholder} type={type}
    className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
    {...props}
  />
)

const Select = ({ value, onChange, options, placeholder }) => (
  <select
    value={value} onChange={onChange}
    className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
  >
    <option value="">{placeholder || 'Select...'}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
)

const FORM_STEPS = [
  { id: 'entity', label: 'Entity Details', icon: Building2 },
  { id: 'promoter', label: 'Promoter & Rating', icon: User },
  { id: 'loan', label: 'Loan Details', icon: IndianRupee },
  { id: 'review', label: 'Review & Submit', icon: FileCheck },
]

export default function EntityOnboarding({ onComplete, existingData }) {
  const [formStep, setFormStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    company_name: existingData?.company_name || '',
    cin: existingData?.cin || '',
    pan: existingData?.pan || '',
    gstin: existingData?.gstin || '',
    sector: existingData?.sector || '',
    sub_sector: existingData?.sub_sector || '',
    incorporation_date: existingData?.incorporation_date || '',
    registered_address: existingData?.registered_address || '',
    turnover: existingData?.turnover || '',
    employee_count: existingData?.employee_count || '',
    promoter_name: existingData?.promoter_name || '',
    promoter_din: existingData?.promoter_din || '',
    credit_rating: existingData?.credit_rating || '',
    cibil_score: existingData?.cibil_score || '',
    loan_type: existingData?.loan_type || '',
    loan_amount: existingData?.loan_amount || '',
    loan_tenure_months: existingData?.loan_tenure_months || '',
    proposed_interest_rate: existingData?.proposed_interest_rate || '',
    purpose_of_loan: existingData?.purpose_of_loan || '',
    collateral_type: existingData?.collateral_type || '',
    collateral_value: existingData?.collateral_value || '',
    existing_exposure: existingData?.existing_exposure || '',
    repayment_source: existingData?.repayment_source || '',
  })

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  const canProceed = () => {
    if (formStep === 0) return form.company_name.trim() && form.sector
    if (formStep === 1) return true
    if (formStep === 2) return form.loan_type && form.loan_amount
    return true
  }

  const handleSubmit = async () => {
    if (!form.company_name.trim()) { setError('Company name is required'); return }
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        turnover: form.turnover ? parseFloat(form.turnover) : null,
        employee_count: form.employee_count ? parseInt(form.employee_count) : null,
        cibil_score: form.cibil_score ? parseInt(form.cibil_score) : null,
        loan_amount: form.loan_amount ? parseFloat(form.loan_amount) : null,
        loan_tenure_months: form.loan_tenure_months ? parseInt(form.loan_tenure_months) : null,
        proposed_interest_rate: form.proposed_interest_rate ? parseFloat(form.proposed_interest_rate) : null,
        collateral_value: form.collateral_value ? parseFloat(form.collateral_value) : null,
        existing_exposure: form.existing_exposure ? parseFloat(form.existing_exposure) : null,
      }
      const res = await createEntity(payload)
      onComplete({
        company_id: res.data.company_id,
        company_name: form.company_name,
        ...form,
        ...payload,
      })
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create entity. Is the backend running?')
    }
    setLoading(false)
  }

  const formatCurrency = (val) => {
    if (!val) return ''
    const num = parseFloat(val)
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`
    return `₹${num.toLocaleString('en-IN')}`
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8 px-4">
        {FORM_STEPS.map((s, idx) => (
          <React.Fragment key={s.id}>
            <button
              onClick={() => idx <= formStep && setFormStep(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                idx === formStep
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg'
                  : idx < formStep
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
              }`}
            >
              {idx < formStep ? <CheckCircle2 size={16} /> : <s.icon size={16} />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {idx < FORM_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded ${idx < formStep ? 'bg-emerald-400' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-8">

        {/* Step 1: Entity Details */}
        {formStep === 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-1">Entity Details</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Basic company information for the credit appraisal.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Company Name" icon={Building2} required>
                <Input value={form.company_name} onChange={set('company_name')} placeholder="TechNova Solutions Pvt Ltd" />
              </Field>
              <Field label="CIN" icon={Hash}>
                <Input value={form.cin} onChange={set('cin')} placeholder="L17100MH2001PLC131301" />
              </Field>
              <Field label="PAN" icon={CreditCard}>
                <Input value={form.pan} onChange={set('pan')} placeholder="AAACR5055K" />
              </Field>
              <Field label="GSTIN" icon={FileText}>
                <Input value={form.gstin} onChange={set('gstin')} placeholder="27AAACR5055K1ZX" />
              </Field>
              <Field label="Sector" icon={Briefcase} required>
                <Select value={form.sector} onChange={set('sector')} options={SECTORS} placeholder="Select sector..." />
              </Field>
              <Field label="Sub-Sector" icon={Briefcase}>
                <Input value={form.sub_sector} onChange={set('sub_sector')} placeholder="e.g. Enterprise SaaS" />
              </Field>
              <Field label="Date of Incorporation" icon={Calendar}>
                <Input value={form.incorporation_date} onChange={set('incorporation_date')} type="date" />
              </Field>
              <Field label="Annual Turnover (INR)" icon={IndianRupee}>
                <Input value={form.turnover} onChange={set('turnover')} placeholder="500000000" type="number" />
                {form.turnover && <p className="text-[10px] text-zinc-400 mt-1">{formatCurrency(form.turnover)}</p>}
              </Field>
            </div>
            <Field label="Registered Address" icon={MapPin}>
              <textarea
                value={form.registered_address} onChange={set('registered_address')}
                placeholder="Full registered office address..."
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white resize-none h-20"
              />
            </Field>
          </div>
        )}

        {/* Step 2: Promoter & Rating */}
        {formStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-1">Promoter & Credit Profile</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Promoter details and existing credit ratings.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Promoter / Key Person" icon={User}>
                <Input value={form.promoter_name} onChange={set('promoter_name')} placeholder="Rajesh Gupta" />
              </Field>
              <Field label="Promoter DIN" icon={Hash}>
                <Input value={form.promoter_din} onChange={set('promoter_din')} placeholder="00012345" />
              </Field>
              <Field label="Employee Count" icon={Users}>
                <Input value={form.employee_count} onChange={set('employee_count')} placeholder="250" type="number" />
              </Field>
              <Field label="External Credit Rating" icon={Award}>
                <Input value={form.credit_rating} onChange={set('credit_rating')} placeholder="CRISIL BBB+" />
              </Field>
              <Field label="CIBIL Commercial Score" icon={Shield}>
                <Input value={form.cibil_score} onChange={set('cibil_score')} placeholder="725" type="number" min="300" max="900" />
                {form.cibil_score && (
                  <p className={`text-[10px] mt-1 ${parseInt(form.cibil_score) >= 700 ? 'text-emerald-500' : parseInt(form.cibil_score) >= 500 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {parseInt(form.cibil_score) >= 700 ? 'Good' : parseInt(form.cibil_score) >= 500 ? 'Fair' : 'Poor'} (Range: 300-900)
                  </p>
                )}
              </Field>
            </div>
          </div>
        )}

        {/* Step 3: Loan Details */}
        {formStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-1">Loan Details</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Specify the credit facility being requested.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Loan / Facility Type" icon={Landmark} required>
                <Select value={form.loan_type} onChange={set('loan_type')} options={LOAN_TYPES} placeholder="Select type..." />
              </Field>
              <Field label="Loan Amount (INR)" icon={IndianRupee} required>
                <Input value={form.loan_amount} onChange={set('loan_amount')} placeholder="50000000" type="number" />
                {form.loan_amount && <p className="text-[10px] text-zinc-400 mt-1">{formatCurrency(form.loan_amount)}</p>}
              </Field>
              <Field label="Tenure (Months)" icon={Clock}>
                <Input value={form.loan_tenure_months} onChange={set('loan_tenure_months')} placeholder="36" type="number" />
              </Field>
              <Field label="Proposed Interest Rate (%)" icon={Target}>
                <Input value={form.proposed_interest_rate} onChange={set('proposed_interest_rate')} placeholder="9.25" type="number" step="0.01" />
              </Field>
              <Field label="Purpose of Loan" icon={FileText}>
                <Input value={form.purpose_of_loan} onChange={set('purpose_of_loan')} placeholder="Working capital for expansion" />
              </Field>
              <Field label="Repayment Source" icon={Wallet}>
                <Input value={form.repayment_source} onChange={set('repayment_source')} placeholder="Operating cash flows" />
              </Field>
              <Field label="Collateral Type" icon={Shield}>
                <Select value={form.collateral_type} onChange={set('collateral_type')} options={COLLATERAL_TYPES} placeholder="Select collateral..." />
              </Field>
              <Field label="Collateral Value (INR)" icon={IndianRupee}>
                <Input value={form.collateral_value} onChange={set('collateral_value')} placeholder="75000000" type="number" />
                {form.collateral_value && <p className="text-[10px] text-zinc-400 mt-1">{formatCurrency(form.collateral_value)}</p>}
              </Field>
              <Field label="Existing Bank Exposure (INR)" icon={Landmark}>
                <Input value={form.existing_exposure} onChange={set('existing_exposure')} placeholder="20000000" type="number" />
                {form.existing_exposure && <p className="text-[10px] text-zinc-400 mt-1">{formatCurrency(form.existing_exposure)}</p>}
              </Field>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {formStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-1">Review & Submit</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Confirm the details before proceeding to document upload.</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2 flex items-center gap-1"><Building2 size={10} /> Entity</p>
                <p className="text-sm font-bold">{form.company_name || '—'}</p>
                <p className="text-xs text-zinc-500 mt-1">{form.sector || 'No sector'} {form.sub_sector ? `/ ${form.sub_sector}` : ''}</p>
                <p className="text-xs text-zinc-500">{form.cin ? `CIN: ${form.cin}` : ''}</p>
                {form.turnover && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Turnover: {formatCurrency(form.turnover)}</p>}
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2 flex items-center gap-1"><User size={10} /> Promoter</p>
                <p className="text-sm font-bold">{form.promoter_name || '—'}</p>
                {form.credit_rating && <p className="text-xs text-zinc-500 mt-1">Rating: {form.credit_rating}</p>}
                {form.cibil_score && <p className="text-xs text-zinc-500">CIBIL: {form.cibil_score}</p>}
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2 flex items-center gap-1"><IndianRupee size={10} /> Loan</p>
                <p className="text-sm font-bold">{form.loan_type || '—'}</p>
                <p className="text-xs text-zinc-500 mt-1">{form.loan_amount ? formatCurrency(form.loan_amount) : '—'}</p>
                <p className="text-xs text-zinc-500">{form.loan_tenure_months ? `${form.loan_tenure_months} months` : ''} {form.proposed_interest_rate ? `@ ${form.proposed_interest_rate}%` : ''}</p>
              </div>
            </div>

            {/* All fields summary */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
              <p className="text-[10px] font-bold uppercase text-zinc-400 mb-3">All Details</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(form).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <span className="text-zinc-400">{k.replace(/_/g, ' ')}: </span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {['turnover', 'loan_amount', 'collateral_value', 'existing_exposure'].includes(k)
                        ? formatCurrency(v)
                        : v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-sm text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => setFormStep(p => p - 1)}
            disabled={formStep === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>

          {formStep < 3 ? (
            <button
              onClick={() => setFormStep(p => p + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {loading ? 'Creating...' : 'Create & Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
