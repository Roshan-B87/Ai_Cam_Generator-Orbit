import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { uploadDocuments } from '../api/client'
import {
  Building2, FileText, Upload, X,
  Loader2, ChevronRight, Shield, Zap, BarChart3
} from 'lucide-react'

export default function UploadPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [companyName, setCompanyName] = useState('')
  const [cin, setCin] = useState('')
  const [gstin, setGstin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback((accepted) => {
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...accepted.filter(f => !names.has(f.name))]
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  })

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name))

  const handleSubmit = async () => {
    if (!companyName.trim()) { setError('Company name is required'); return }
    if (files.length === 0) { setError('Please upload at least one document'); return }
    setError('')
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('company_name', companyName)
      files.forEach(f => formData.append('files', f))
      const res = await uploadDocuments(formData)
      const { company_id } = res.data
      localStorage.setItem(`company_${company_id}`, JSON.stringify({ company_name: companyName, cin, gstin }))
      navigate(`/dashboard/${company_id}`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed. Is the backend running on port 8000?')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#0d1117',
      fontFamily: "'DM Sans', sans-serif",
      color: '#e6edf3',
    }}>

      {/* ── LEFT PANEL ── */}
      <div style={{
        width: '42%',
        background: 'linear-gradient(160deg, #0d1117 0%, #161b22 100%)',
        borderRight: '1px solid #30363d',
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        <div>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 64 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #58a6ff, #3fb950)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={20} color="white" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>
              Intelli<span style={{ color: '#58a6ff' }}>Credit</span>
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
            AI-Powered<br />
            <span style={{ color: '#58a6ff' }}>Credit Appraisal</span><br />
            Engine
          </h1>
          <p style={{ fontSize: 15, color: '#8b949e', marginBottom: 48, lineHeight: 1.7 }}>
            Upload company documents and get a complete Credit Appraisal Memo
            with Five Cs scoring, GST fraud detection, and AI research — in minutes.
          </p>

          {/* Feature list */}
          {[
            { icon: <Zap size={16} />, title: 'Self-RAG Document Intelligence', desc: 'LangGraph pipeline searches your documents + web' },
            { icon: <Shield size={16} />, title: 'GST Fraud Detection', desc: 'GSTR-2B vs 3B delta, circular trading flags' },
            { icon: <BarChart3 size={16} />, title: 'Five Cs Scorecard', desc: 'Transparent weighted scoring with full explanation' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: '#161b22', border: '1px solid #30363d',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#58a6ff', marginTop: 2,
              }}>
                {f.icon}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: '#e6edf3' }}>{f.title}</p>
                <p style={{ fontSize: 13, color: '#8b949e', marginTop: 2 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Accepted docs */}
        <div style={{
          background: '#161b22', border: '1px solid #30363d',
          borderRadius: 14, padding: 20,
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#484f58', textTransform: 'uppercase', marginBottom: 12 }}>
            Accepted Documents
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: 'Annual Report', color: '#58a6ff' },
              { label: 'GST Returns (GSTR-2B / 3B)', color: '#3fb950' },
              { label: 'Bank Statements', color: '#bc8cff' },
              { label: 'Credit Rating Report', color: '#d29922' },
              { label: 'Shareholding Pattern', color: '#f0883e' },
            ].map(d => (
              <span key={d.label} style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 6,
                background: '#0d1117', color: d.color,
                fontFamily: 'monospace',
              }}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — FORM ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 48,
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>New Credit Appraisal</h2>
          <p style={{ fontSize: 14, color: '#8b949e', marginBottom: 32 }}>
            Fill in company details and upload documents to begin.
          </p>

          {/* Company Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8b949e', marginBottom: 8 }}>
              Company Name <span style={{ color: '#f85149' }}>*</span>
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 12,
              background: '#161b22',
              border: `1px solid ${companyName ? '#58a6ff' : '#30363d'}`,
              transition: 'border-color 0.2s',
            }}>
              <Building2 size={16} color="#484f58" />
              <input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Tata Motors Ltd"
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  outline: 'none', fontSize: 14, color: '#e6edf3',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* CIN + GSTIN */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'CIN (optional)', val: cin, set: setCin, ph: 'L17100MH2001PLC...' },
              { label: 'GSTIN (optional)', val: gstin, set: setGstin, ph: '27AAACR5055K1ZX' },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8b949e', marginBottom: 8 }}>
                  {label}
                </label>
                <input
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={ph}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    background: '#161b22', border: '1px solid #30363d',
                    color: '#e6edf3', fontSize: 13, outline: 'none',
                    fontFamily: 'monospace', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Dropzone */}
          <div {...getRootProps()} style={{
            borderRadius: 14, padding: '36px 24px', textAlign: 'center',
            cursor: 'pointer', marginBottom: 16, transition: 'all 0.2s',
            border: `2px dashed ${isDragActive ? '#58a6ff' : '#30363d'}`,
            background: isDragActive ? 'rgba(88,166,255,0.05)' : '#161b22',
          }}>
            <input {...getInputProps()} />
            <Upload size={32} style={{ margin: '0 auto 12px', color: isDragActive ? '#58a6ff' : '#484f58', display: 'block' }} />
            <p style={{ fontWeight: 600, fontSize: 14, color: '#e6edf3', marginBottom: 4 }}>
              {isDragActive ? 'Drop PDFs here...' : 'Drag & drop PDFs here'}
            </p>
            <p style={{ fontSize: 12, color: '#484f58' }}>
              or click to browse — Annual Reports, GST, Bank Statements
            </p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #30363d', marginBottom: 20 }}>
              {files.map((f, i) => (
                <div key={f.name} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  borderBottom: i < files.length - 1 ? '1px solid #30363d' : 'none',
                  background: '#161b22',
                }}>
                  <FileText size={15} color="#58a6ff" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </span>
                  <span style={{ fontSize: 11, color: '#484f58', fontFamily: 'monospace' }}>
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                  <button onClick={() => removeFile(f.name)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <X size={14} color="#484f58" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13,
              background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
              color: '#f85149',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '15px 24px', borderRadius: 12,
              fontSize: 15, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#30363d' : 'linear-gradient(135deg, #58a6ff, #3fb950)',
              color: loading ? '#8b949e' : '#0d1117',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'opacity 0.2s', fontFamily: 'inherit',
            }}
          >
            {loading
              ? <><Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> Processing...</>
              : <><span>Start Credit Appraisal</span><ChevronRight size={18} /></>
            }
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#484f58', marginTop: 16 }}>
            All documents are processed securely and never shared.
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #484f58; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
