import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000', timeout: 120000 })

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('orbit_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Authentication
export const signup                = (data)            => api.post('/auth/signup', data)
export const login                 = (data)            => api.post('/auth/login', data)
export const getMe                 = ()                => api.get('/auth/me')

// Entity Onboarding
export const createEntity         = (data)            => api.post('/onboarding/create', data)
export const getEntity            = (companyId)       => api.get(`/onboarding/entity/${companyId}`)
export const updateEntity         = (companyId, data) => api.put(`/onboarding/entity/${companyId}`, data)

// Document Upload & Ingestion
export const uploadDocuments      = (formData)        => api.post('/ingest/upload', formData)
export const getIngestStatus      = (companyId)       => api.get(`/ingest/status/${companyId}`)

// Document Classification (Human-in-the-loop)
export const getClassifications   = (companyId)       => api.get(`/ingest/classifications/${companyId}`)
export const approveClassifications = (data)          => api.post('/ingest/classifications/approve', data)

// Schema Configuration
export const configureSchema      = (data)            => api.post('/ingest/schema/configure', data)
export const getSchema            = (companyId, type) => api.get(`/ingest/schema/${companyId}/${type}`)

// Extraction Results
export const getExtractionResults = (companyId)       => api.get(`/ingest/extraction/${companyId}`)
export const editExtraction       = (companyId, edits) => api.put(`/ingest/extraction/${companyId}/edit`, edits)

// Research
export const runResearch          = (companyId, data) => api.post(`/research/run/${companyId}`, data)
export const getResearchResults   = (companyId)       => api.get(`/research/results/${companyId}`)

// Scoring & Analysis
export const scoreCompany         = (data)            => api.post('/appraise/score', data)
export const getScore             = (companyId)       => api.get(`/appraise/score/${companyId}`)

// CAM Report
export const generateCAM          = (companyId)       => api.post(`/cam/generate/${companyId}`)
export const downloadCAMUrl       = (companyId, fmt)  => `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/cam/download/${companyId}/${fmt}`

// Explainability & Scenario Analysis
export const explainDecision      = (companyId)       => api.post(`/appraise/explain/${companyId}`)
export const runWhatIf            = (data)            => api.post('/appraise/whatif', data)

// SWOT Analysis
export const generateSWOT        = (companyId)       => api.post(`/appraise/swot/${companyId}`)

// Databricks connector
export const ingestFromDatabricks = (data)            => api.post('/databricks/ingest', data)
export const getDatabricksData    = (companyId)       => api.get(`/databricks/tables/${companyId}`)

// Officer notes
export const submitOfficerNotes   = (data)            => api.post('/research/officer-notes', data)

// MCA Registry API
export const getMCALookup         = (companyId, params) => api.get(`/mca/lookup/${companyId}`, { params })
export const getMCACSR            = (params)            => api.get('/mca/csr', { params })
export const getMCACompany        = (params)            => api.get('/mca/company', { params })
export const getMCACharges        = (params)            => api.get('/mca/charges', { params })
export const getMCADirectors      = (params)            => api.get('/mca/directors', { params })

// Table extraction
export const getExtractedTables   = (companyId)         => api.get(`/ingest/tables/${companyId}`)
