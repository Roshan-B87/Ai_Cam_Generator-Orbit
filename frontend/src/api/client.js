import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000', timeout: 120000 })

export const uploadDocuments  = (formData)        => api.post('/ingest/upload', formData)
export const getIngestStatus  = (companyId)       => api.get(`/ingest/status/${companyId}`)
export const runResearch      = (companyId, data) => api.post(`/research/run/${companyId}`, data)
export const getResearchResults = (companyId)     => api.get(`/research/results/${companyId}`)
export const scoreCompany     = (data)            => api.post('/appraise/score', data)
export const getScore         = (companyId)       => api.get(`/appraise/score/${companyId}`)
export const generateCAM      = (companyId)       => api.post(`/cam/generate/${companyId}`)
export const downloadCAMUrl   = (companyId, fmt)  => `http://localhost:8000/cam/download/${companyId}/${fmt}`

// New: explainability & scenario analysis
export const explainDecision  = (companyId)       => api.post(`/appraise/explain/${companyId}`)
export const runWhatIf        = (data)            => api.post('/appraise/whatif', data)

// New: Databricks connector
export const ingestFromDatabricks = (data)        => api.post('/databricks/ingest', data)
export const getDatabricksData    = (companyId)   => api.get(`/databricks/tables/${companyId}`)

// New: Officer notes
export const submitOfficerNotes = (data)          => api.post('/research/officer-notes', data)

// New: MCA Registry API
export const getMCALookup       = (companyId, params) => api.get(`/mca/lookup/${companyId}`, { params })
export const getMCACSR          = (params)            => api.get('/mca/csr', { params })
export const getMCACompany      = (params)            => api.get('/mca/company', { params })
export const getMCACharges      = (params)            => api.get('/mca/charges', { params })
export const getMCADirectors    = (params)            => api.get('/mca/directors', { params })

// New: Table extraction
export const getExtractedTables = (companyId)         => api.get(`/ingest/tables/${companyId}`)
