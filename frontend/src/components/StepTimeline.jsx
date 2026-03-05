import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

const STEPS = [
  { key: 'upload',   label: 'Docs Uploaded' },
  { key: 'parsing',  label: 'AI Parsing' },
  { key: 'research', label: 'Research Agent' },
  { key: 'scoring',  label: 'Credit Scoring' },
  { key: 'cam',      label: 'CAM Ready' },
]

export default function StepTimeline({ currentStep }) {
  const idx = STEPS.findIndex(s => s.key === currentStep)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
      {STEPS.map((step, i) => {
        const done   = i < idx
        const active = i === idx

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#3fb950' : active ? 'rgba(88,166,255,0.15)' : '#0d1117',
                border: `2px solid ${done ? '#3fb950' : active ? '#58a6ff' : '#30363d'}`,
                transition: 'all 0.3s',
              }}>
                {done
                  ? <CheckCircle2 size={15} color="#0d1117" />
                  : active
                    ? <Loader2 size={13} color="#58a6ff" style={{ animation: 'spin 1.5s linear infinite' }} />
                    : <Circle size={11} color="#484f58" />
                }
              </div>
              <p style={{
                fontSize: 11, marginTop: 6, textAlign: 'center', whiteSpace: 'nowrap',
                color: done ? '#3fb950' : active ? '#58a6ff' : '#484f58',
                fontWeight: active ? 600 : 400,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {step.label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 8px', marginBottom: 20, borderRadius: 2,
                background: i < idx ? '#3fb950' : '#30363d',
                transition: 'background 0.5s',
              }} />
            )}
          </div>
        )
      })}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
