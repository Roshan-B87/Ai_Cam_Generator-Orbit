import React, { useState, useEffect } from 'react'
import { Landmark, AlertTriangle, Users, FileText, TrendingUp, Shield, Loader2, ChevronDown, ChevronRight, IndianRupee } from 'lucide-react'
import { getMCALookup } from '../api/client'

const SeverityBadge = ({ severity }) => {
  const colors = {
    HIGH: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    LOW: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    CRITICAL: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${colors[severity] || colors.LOW}`}>
      {severity}
    </span>
  )
}

const CollapsibleSection = ({ icon: Icon, title, count, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-zinc-500" />
          <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
          {count !== undefined && (
            <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded-full font-bold">
              {count}
            </span>
          )}
        </div>
        {open ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  )
}

export default function MCAPanel({ companyId, companyName, cin }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchMCA = async () => {
    if (!companyId || !companyName) return
    setLoading(true)
    setError(null)
    try {
      const res = await getMCALookup(companyId, { company_name: companyName, cin: cin || undefined })
      setData(res.data)
    } catch (e) {
      setError('Failed to fetch MCA data. Check backend connection.')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (companyId && companyName) fetchMCA()
  }, [companyId])

  if (!companyId) {
    return (
      <div className="rounded-xl p-5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500">
        Upload documents first to enable MCA Registry lookup.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-xl p-8 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <Loader2 size={24} className="animate-spin text-zinc-400 mb-3" />
        <p className="text-xs text-zinc-500">Fetching MCA Registry data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl p-5 text-sm bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center gap-2">
        <AlertTriangle size={14} /> {error}
        <button onClick={fetchMCA} className="ml-auto text-xs font-bold underline">Retry</button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl p-5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <button onClick={fetchMCA}
          className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center justify-center gap-2">
          <Landmark size={14} /> Fetch MCA Registry Data
        </button>
      </div>
    )
  }

  const riskFlags = data.mca_risk_flags || []
  const csrRecords = data.csr_data?.csr_records || []
  const companies = data.company_info?.companies || []
  const charges = data.charge_details?.charges || []
  const directors = data.director_details?.directors || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">MCA Registry Data</p>
        <button onClick={fetchMCA} className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline">
          Refresh
        </button>
      </div>

      {/* Risk Flags */}
      {riskFlags.length > 0 && (
        <div className="rounded-xl p-4 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-rose-500" />
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">MCA Risk Flags ({riskFlags.length})</span>
          </div>
          <div className="space-y-2">
            {riskFlags.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-white dark:bg-zinc-900">
                <SeverityBadge severity={f.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{f.flag}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{f.detail}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Source: {f.source}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {riskFlags.length === 0 && (
        <div className="rounded-xl p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
          <Shield size={14} className="text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">No MCA risk flags detected</span>
        </div>
      )}

      {/* Company Info */}
      {companies.length > 0 && (
        <CollapsibleSection icon={Landmark} title="Company Registration" count={companies.length} defaultOpen>
          {companies.map((c, i) => (
            <div key={i} className="text-xs space-y-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-zinc-400">CIN:</span> <span className="font-mono font-semibold">{c.cin || '—'}</span></div>
                <div><span className="text-zinc-400">Status:</span> <span className={`font-bold ${c.company_status?.toLowerCase() === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{c.company_status || '—'}</span></div>
                <div><span className="text-zinc-400">Category:</span> {c.company_category || '—'}</div>
                <div><span className="text-zinc-400">Class:</span> {c.company_class || '—'}</div>
                <div><span className="text-zinc-400">Auth. Capital:</span> <span className="font-mono">₹{Number(c.authorized_capital || 0).toLocaleString('en-IN')}</span></div>
                <div><span className="text-zinc-400">Paid-up Capital:</span> <span className="font-mono">₹{Number(c.paid_up_capital || 0).toLocaleString('en-IN')}</span></div>
                <div className="col-span-2"><span className="text-zinc-400">Incorporated:</span> {c.date_of_incorporation || '—'}</div>
                <div className="col-span-2"><span className="text-zinc-400">Activity:</span> {c.activity_description || '—'}</div>
              </div>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* CSR Data */}
      {csrRecords.length > 0 && (
        <CollapsibleSection icon={TrendingUp} title="CSR Spending" count={csrRecords.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left py-2 px-2 font-semibold text-zinc-500">Company</th>
                  <th className="text-right py-2 px-2 font-semibold text-zinc-500">FY 2018-19</th>
                  <th className="text-right py-2 px-2 font-semibold text-zinc-500">FY 2019-20</th>
                  <th className="text-right py-2 px-2 font-semibold text-zinc-500">FY 2020-21</th>
                </tr>
              </thead>
              <tbody>
                {csrRecords.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 px-2 font-medium truncate max-w-[150px]">{r.company_name}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.csr_spent_2018_19 ? `₹${Number(r.csr_spent_2018_19).toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.csr_spent_2019_20 ? `₹${Number(r.csr_spent_2019_20).toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.csr_spent_2020_21 ? `₹${Number(r.csr_spent_2020_21).toLocaleString('en-IN')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.csr_data?.summary && (
            <div className="flex items-center gap-2 mt-2 text-[10px]">
              <span className="text-zinc-400">CSR Trend:</span>
              <span className={`font-bold uppercase ${data.csr_data.summary.trend === 'increasing' ? 'text-emerald-600 dark:text-emerald-400' : data.csr_data.summary.trend === 'decreasing' ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500'}`}>
                {data.csr_data.summary.trend}
              </span>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Charges */}
      {charges.length > 0 && (
        <CollapsibleSection icon={IndianRupee} title="Registered Charges" count={data.charge_details?.total || charges.length}>
          <div className="space-y-2">
            {charges.slice(0, 5).map((ch, i) => (
              <div key={i} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-xs">
                <pre className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400 font-mono text-[10px]">
                  {JSON.stringify(ch, null, 2).slice(0, 300)}
                </pre>
              </div>
            ))}
            {charges.length > 5 && <p className="text-[10px] text-zinc-400">+ {charges.length - 5} more charges</p>}
          </div>
        </CollapsibleSection>
      )}

      {/* Directors */}
      {directors.length > 0 && (
        <CollapsibleSection icon={Users} title="Directors / Promoters" count={data.director_details?.total || directors.length}>
          <div className="space-y-2">
            {directors.slice(0, 5).map((dir, i) => (
              <div key={i} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-xs">
                <pre className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400 font-mono text-[10px]">
                  {JSON.stringify(dir, null, 2).slice(0, 300)}
                </pre>
              </div>
            ))}
            {directors.length > 5 && <p className="text-[10px] text-zinc-400">+ {directors.length - 5} more directors</p>}
          </div>
        </CollapsibleSection>
      )}

      {/* No data message */}
      {companies.length === 0 && csrRecords.length === 0 && charges.length === 0 && directors.length === 0 && (
        <div className="text-xs text-zinc-500 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
          No matching records found on MCA registry for "{companyName}". Try providing the exact CIN for precise lookup.
        </div>
      )}
    </div>
  )
}
