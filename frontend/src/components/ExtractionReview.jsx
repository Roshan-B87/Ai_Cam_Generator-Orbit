import React, { useState, useEffect } from 'react'
import {
  Table2, Edit3, CheckCircle2, Plus, X, Loader2, Save,
  FileText, BarChart3, Settings, ChevronDown, ChevronUp,
  AlertCircle, Database, Eye
} from 'lucide-react'
import { getExtractionResults, editExtraction, configureSchema, getSchema } from '../api/client'

const DOC_TYPE_LABELS = {
  alm: 'ALM (Asset-Liability)',
  shareholding: 'Shareholding Pattern',
  borrowing: 'Borrowing Profile',
  annual_report: 'Annual Reports',
  portfolio: 'Portfolio / Performance',
  gst_filing: 'GST Filing',
  bank_statement: 'Bank Statement',
  rating_report: 'Rating Report',
  other: 'Other Document',
}

const DOC_TYPE_COLORS = {
  alm: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10',
  shareholding: 'border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10',
  borrowing: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10',
  annual_report: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10',
  portfolio: 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10',
}

export default function ExtractionReview({ companyId, onToast }) {
  const [extractions, setExtractions] = useState([])
  const [classifications, setClassifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedDoc, setExpandedDoc] = useState(null)
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [schemaConfig, setSchemaConfig] = useState({})
  const [showSchemaEditor, setShowSchemaEditor] = useState(null)
  const [customFields, setCustomFields] = useState([])
  const [newFieldName, setNewFieldName] = useState('')

  useEffect(() => {
    if (companyId) loadExtractionData()
  }, [companyId])

  const loadExtractionData = async () => {
    setLoading(true)
    try {
      const res = await getExtractionResults(companyId)
      setExtractions(res.data.extractions || [])
      setClassifications(res.data.classifications || [])
    } catch {
      onToast?.('Failed to load extraction results', 'error')
    }
    setLoading(false)
  }

  const handleEditField = async (docIdx, fieldKey, newValue) => {
    try {
      await editExtraction(companyId, { [`${fieldKey}`]: newValue })
      // Update local state
      const updated = [...extractions]
      if (updated[docIdx]?.financials) {
        updated[docIdx].financials[fieldKey] = parseFloat(newValue) || newValue
      }
      setExtractions(updated)
      setEditingField(null)
      onToast?.('Field updated', 'success')
    } catch {
      onToast?.('Failed to save edit', 'error')
    }
  }

  const handleSaveSchema = async (docType) => {
    try {
      await configureSchema({
        company_id: companyId,
        document_type: docType,
        field_mappings: [],
        custom_fields: customFields,
      })
      onToast?.('Schema configured', 'success')
      setShowSchemaEditor(null)
    } catch {
      onToast?.('Failed to save schema', 'error')
    }
  }

  const loadSchema = async (docType) => {
    try {
      const res = await getSchema(companyId, docType)
      setSchemaConfig(prev => ({ ...prev, [docType]: res.data }))
      setCustomFields(res.data?.custom_fields || res.data?.schema?.fields || [])
    } catch {}
  }

  const formatValue = (val) => {
    if (val === null || val === undefined) return '—'
    if (typeof val === 'number') {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`
      return typeof val === 'number' && val % 1 !== 0 ? val.toFixed(2) : val.toLocaleString('en-IN')
    }
    return String(val)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-zinc-400" />
        <span className="ml-3 text-sm text-zinc-500">Loading extraction results...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Database size={20} className="text-blue-500" />
              Extraction & Schema Mapping
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Review extracted data, configure schemas, and make corrections before analysis.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-500">
              {extractions.length} documents processed
            </span>
            <button
              onClick={loadExtractionData}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Extraction results by document */}
      {extractions.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
          <Database size={40} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
          <p className="text-sm text-zinc-500">No extraction results yet. Upload and process documents first.</p>
        </div>
      ) : (
        extractions.map((doc, docIdx) => {
          const isExpanded = expandedDoc === docIdx
          const docType = doc.doc_type || 'other'
          const colorClass = DOC_TYPE_COLORS[docType] || 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50'

          return (
            <div key={docIdx} className={`rounded-2xl border overflow-hidden transition-all ${colorClass}`}>
              {/* Document header */}
              <button
                onClick={() => setExpandedDoc(isExpanded ? null : docIdx)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-zinc-500" />
                  <div>
                    <p className="text-sm font-bold">{doc.filename || `Document ${docIdx + 1}`}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/80 dark:bg-zinc-800/80">
                        {DOC_TYPE_LABELS[docType] || docType}
                      </span>
                      <span className="text-[10px] text-zinc-500">{doc.pages || 0} pages</span>
                      {doc.sections?.length > 0 && (
                        <span className="text-[10px] text-zinc-500">{doc.sections.length} sections</span>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-4">
                  {/* Schema Configuration */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Extracted Fields</p>
                    <button
                      onClick={() => {
                        if (showSchemaEditor === docIdx) {
                          setShowSchemaEditor(null)
                        } else {
                          setShowSchemaEditor(docIdx)
                          loadSchema(docType)
                        }
                      }}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                    >
                      <Settings size={10} /> Configure Schema
                    </button>
                  </div>

                  {/* Schema Editor */}
                  {showSchemaEditor === docIdx && (
                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                      <p className="text-xs font-bold mb-3">Dynamic Schema — Define output fields for {DOC_TYPE_LABELS[docType]}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {customFields.map((field, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800">
                            {field}
                            <button onClick={() => setCustomFields(p => p.filter((_, j) => j !== i))} className="hover:text-rose-500">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={newFieldName}
                          onChange={e => setNewFieldName(e.target.value)}
                          placeholder="Add custom field..."
                          className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newFieldName.trim()) {
                              setCustomFields(p => [...p, newFieldName.trim()])
                              setNewFieldName('')
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            if (newFieldName.trim()) {
                              setCustomFields(p => [...p, newFieldName.trim()])
                              setNewFieldName('')
                            }
                          }}
                          className="px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => handleSaveSchema(docType)}
                          className="px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                        >
                          <Save size={12} /> Save
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Financial data table */}
                  {doc.financials && Object.keys(doc.financials).length > 0 ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-[10px] uppercase font-bold text-zinc-400">Field</th>
                            <th className="px-4 py-2 text-right text-[10px] uppercase font-bold text-zinc-400">Extracted Value</th>
                            <th className="px-4 py-2 text-center text-[10px] uppercase font-bold text-zinc-400 w-20">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {Object.entries(doc.financials).map(([key, val]) => (
                            <tr key={key} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                              <td className="px-4 py-2">
                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                {editingField === `${docIdx}-${key}` ? (
                                  <div className="flex items-center gap-1 justify-end">
                                    <input
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      className="w-32 px-2 py-1 text-xs text-right rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleEditField(docIdx, key, editValue)
                                        if (e.key === 'Escape') setEditingField(null)
                                      }}
                                    />
                                    <button
                                      onClick={() => handleEditField(docIdx, key, editValue)}
                                      className="text-emerald-500 hover:text-emerald-700"
                                    >
                                      <CheckCircle2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => setEditingField(null)}
                                      className="text-zinc-400 hover:text-zinc-600"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-white">
                                    {formatValue(val)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {editingField !== `${docIdx}-${key}` && (
                                  <button
                                    onClick={() => {
                                      setEditingField(`${docIdx}-${key}`)
                                      setEditValue(val?.toString() || '')
                                    }}
                                    className="text-zinc-400 hover:text-blue-500 transition-colors"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <AlertCircle size={20} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                      <p className="text-xs text-zinc-400">No structured financial data extracted from this document.</p>
                    </div>
                  )}

                  {/* Tables extracted */}
                  {doc.tables?.total_tables > 0 && (
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2 flex items-center gap-1">
                        <Table2 size={10} /> {doc.tables.total_tables} Tables Extracted
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(doc.tables.tables_by_page || {}).map(([page, count]) => (
                          <div key={page} className="text-[10px] text-zinc-500">
                            Page {page}: {count} table{count > 1 ? 's' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Structured financials */}
                  {doc.structured_financials && Object.keys(doc.structured_financials).length > 0 && (
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2 flex items-center gap-1">
                        <BarChart3 size={10} /> Structured Financial Data
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(doc.structured_financials).map(([key, entries]) => (
                          <div key={key} className="text-xs">
                            <span className="font-medium text-zinc-600 dark:text-zinc-400">
                              {key.replace(/_/g, ' ')}: 
                            </span>
                            <span className="text-zinc-900 dark:text-white ml-1">
                              {Array.isArray(entries) ? `${entries.length} entries` : formatValue(entries)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
