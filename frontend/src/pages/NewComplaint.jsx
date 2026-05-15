import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Cpu, MapPin, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Send, Locate, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { aiApi } from '../utils/api'
import Navbar from '../components/layout/Navbar'
import { errMsg } from '../utils/helpers'

const STEP_LABELS = ['Upload Image', 'AI Analysis', 'Register Complaint']

// Helper: request GPS location
const requestLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  })
}

// Helper: resize image before upload (for AI)
const resizeImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.85) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height
            height = maxHeight
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        }, 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// Helper: resize image for final submission (lighter)
const resizeImageForUpload = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height
            height = maxHeight
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        }, 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function NewComplaint() {
  const [step, setStep] = useState(0)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [meta, setMeta] = useState(null)
  const [metaLoading, setMetaLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()
  const nav = useNavigate()

  const [isEditingPincode, setIsEditingPincode] = useState(false)
  const [editPincodeValue, setEditPincodeValue] = useState('')


  // Manual GPS state
  const [manualGps, setManualGps] = useState(null)
  const [locationEnabled, setLocationEnabled] = useState(false)

  // Agency fetch states
  const [fetchingAgency, setFetchingAgency] = useState(false)

  const toggle = k => setExpanded(p => ({ ...p, [k]: !p[k] }))

  const enableLocation = async () => {
    try {
      const loc = await requestLocation()
      setManualGps(loc)
      setLocationEnabled(true)
      toast.success(`Location captured: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`)
      // Update meta with GPS coordinates
      setMeta(prev => ({
        ...prev,
        latitude: loc.lat,
        longitude: loc.lng,
        hasGPS: true
      }))
    } catch (err) {
      console.error(err)
      toast.error('Unable to get location. Please enable GPS in browser settings.')
    }
  }

  const handleFile = useCallback(async (f) => {
    if (!f || !f.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))

    setMetaLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      // If manual GPS is enabled, send it to backend
      if (manualGps) {
        fd.append('latitude', manualGps.lat)
        fd.append('longitude', manualGps.lng)
      }
      const { data } = await api.post('/complaints/extract-meta', fd)
      setMeta(data)
    } catch (e) { setMeta({ error: errMsg(e) }) }
    finally { setMetaLoading(false) }
  }, [manualGps])

  const handleDrop = e => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const runAI = async () => {
    if (!file) return
    setAiLoading(true)
    try {
      const fd = new FormData()
      const resizedFile = await resizeImage(file, 1024, 1024, 0.85)
      fd.append('file', resizedFile)
      const { data } = await aiApi.post('/detect', fd)
      console.log("AI Response received:", data)
      console.log("Has annotated_image_base64?", !!data.annotated_image_base64)
      setAiResult(data)
      setStep(1)
    } catch (e) {
      console.error("AI error:", e)
      toast.error('AI service unavailable — you can still submit')
      setAiResult({
        wasteType: 'Unknown',
        environmentalImpact: 'AI unavailable',
        totalItems: 0,
        plastics: [],
        others: [],
      })
      setStep(1)
    } finally {
      setAiLoading(false)
    }
  }

  const fetchAgencyByPincode = async (pincode) => {
    if (!pincode || pincode.length !== 6) return
    setFetchingAgency(true)
    try {
      const { data } = await api.post('/complaints/agency-by-pincode', { pincode })
      setMeta(prev => ({
        ...prev,
        agencyEmail: data.agencyEmail,
        agencyName: data.agencyName,
        city: data.city,
        resolvedPincode: pincode
      }))
      if (data.agencyEmail !== 'ujjwalvandur03@gmail.com') {
        toast.success(`Agency found: ${data.agencyName}`)
      } else {
        toast.success('Pincode valid. Routed to default agency.')
      }
    } catch (error) {
      console.error('Failed to fetch agency:', error)
      toast.error(error.response?.data?.error || 'Could not fetch agency details')
    } finally {
      setFetchingAgency(false)
    }
  }

  const debounce = (func, delay) => {
    let timeoutId
    return (...args) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func(...args), delay)
    }
  }
  const debouncedFetchAgency = useCallback(debounce(fetchAgencyByPincode, 500), [])

  const handleSubmit = async () => {
    if (!desc.trim()) { toast.error('Please add a description'); return }
    if (!file) { toast.error('Image required'); return }

    const finalPincode = meta?.hasGPS
      ? (meta?.resolvedPincode || meta?.pincode || '')
      : (meta?.manualPincode || '')

    if (!finalPincode) { toast.error('Pincode is required'); return }

    const finalAgencyEmail = meta?.agencyEmail || 'ujjwalvandur03@gmail.com'

    setSubmitting(true)
    try {
      const resizedFile = await resizeImageForUpload(file, 1200, 1200, 0.8)
      const fd = new FormData()
      fd.append('file', resizedFile)
      fd.append('description', desc)
      fd.append('pincode', finalPincode)
      fd.append('latitude', meta?.latitude || manualGps?.lat || '')
      fd.append('longitude', meta?.longitude || manualGps?.lng || '')
      
      // AI result: remove heavy base64 before sending to flask
      const aiResultToSave = { ...aiResult }
      const annotatedBase64 = aiResultToSave.annotated_image_base64
      delete aiResultToSave.annotated_image_base64
      fd.append('yoloResults', JSON.stringify(aiResultToSave))
      if (annotatedBase64) {
        fd.append('annotatedImageBase64', annotatedBase64)
      }
      fd.append('agencyEmail', finalAgencyEmail)
      if (meta?.streetAddr) fd.append('streetAddress', meta.streetAddr)
      if (meta?.landmark) fd.append('landmark', meta.landmark)

      const { data } = await api.post('/complaints/submit', fd)
      setDone(data)
      toast.success(`Complaint ${data.complaintNumber} registered to ${finalAgencyEmail}!`)
    } catch (e) {
      console.error('Submit error:', e)
      toast.error(errMsg(e))
    } finally { setSubmitting(false) }
  }

  // ── Success screen ────────────────────────────────────────────────
  if (done) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div className="page-wrapper" style={{ maxWidth: '560px', paddingTop: '80px', textAlign: 'center' }}>
        <div className="card card-glow p-10">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
            <CheckCircle size={32} style={{ color: 'var(--cleaned)' }} />
          </div>
          <h2 className="heading mb-2" style={{ fontSize: '1.8rem' }}>Complaint Registered!</h2>
          <p style={{ color: 'var(--text-2)', marginBottom: '24px' }}>Your waste report has been submitted and routed to the responsible agency.</p>
          <div className="p-4 rounded-xl mb-6" style={{ background: 'rgba(200,241,53,0.06)', border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', color: 'var(--acid)', fontSize: '1.3rem', fontWeight: 600 }}>
              {done.complaintNumber}
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: '12px', marginTop: '4px' }}>Complaint Number</div>
          </div>
          {done.energyKwh !== undefined && done.energyKwh > 0 && (
            <div className="p-4 rounded-xl mb-6" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
              <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--acid)' }}>🌍 Environmental Impact</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">Energy generated:</span> <strong>{done.energyKwh} kWh</strong></div>
                <div><span className="text-gray-400">CO₂ saved:</span> <strong>{done.co2SavedKg} kg</strong></div>
                <div><span className="text-gray-400">🏠 Households powered (monthly):</span> <strong>{done.householdsPowered}</strong></div>
                <div><span className="text-gray-400">🚗 Cars off road (yearly):</span> <strong>{done.carsOffRoad}</strong></div>
              </div>
            </div>
          )}
          {done.agencyEmail && (
            <p style={{ color: 'var(--text-2)', fontSize: '13px', marginBottom: '24px' }}>
              🏛️ Routed to: <strong style={{ color: 'var(--text-1)' }}>{done.agencyEmail}</strong>
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button className="btn btn-outline" onClick={() => { setStep(0); setFile(null); setPreview(null); setMeta(null); setAiResult(null); setDesc(''); setDone(null) }}>
              Report Another
            </button>
            <button className="btn btn-primary" onClick={() => nav('/dashboard')}>
              View Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div className="page-wrapper" style={{ maxWidth: '720px', paddingTop: '40px', paddingBottom: '60px' }}>
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-10">
          {STEP_LABELS.map((lab, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    fontFamily: 'Syne,sans-serif',
                    background: i <= step ? 'var(--acid)' : 'var(--bg-card)',
                    color: i <= step ? 'var(--bg-base)' : 'var(--text-3)',
                    border: i <= step ? 'none' : '1px solid var(--border)'
                  }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: '13px', fontFamily: 'Syne,sans-serif', fontWeight: 600,
                  color: i === step ? 'var(--text-1)' : 'var(--text-3)'
                }}>{lab}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: '1px', background: 'var(--border)', minWidth: '24px' }} />}
            </div>
          ))}
        </div>

        {/* Step 0: Upload */}
        {step === 0 && (
          <div className="animate-fade-up">
            <h2 className="heading mb-2" style={{ fontSize: '1.5rem' }}>Upload Waste Photo</h2>
            
            {/* GPS Toggle Button */}
            <div className="mb-4">
              <button
                type="button"
                onClick={enableLocation}
                disabled={locationEnabled}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Locate size={16} />
                {locationEnabled ? '✅ Location Enabled' : '📍 Enable GPS for Image'}
              </button>
              {manualGps && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-3)' }}>
                  Captured: {manualGps.lat.toFixed(6)}, {manualGps.lng.toFixed(6)} (accuracy ±{manualGps.accuracy}m)
                </p>
              )}
            </div>

            <div className={`dropzone ${dragOver ? 'over' : ''}`}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
              {preview ? (
                <div>
                  <img src={preview} alt="preview"
                    style={{ maxHeight: '300px', maxWidth: '100%', borderRadius: '10px', margin: '0 auto', display: 'block', objectFit: 'contain' }} />
                  <p style={{ color: 'var(--text-2)', fontSize: '13px', marginTop: '12px' }}>Click to change image</p>
                </div>
              ) : (
                <div>
                  <Upload size={40} style={{ color: 'var(--text-3)', margin: '0 auto 12px' }} />
                  <p className="heading" style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Drop image here or click</p>
                  <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>JPG, PNG, WEBP — max 20MB</p>
                </div>
              )}
            </div>

            {/* Metadata preview */}
            {metaLoading && (
              <div className="card p-4 mt-4 flex items-center gap-3">
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--acid)' }} />
                <span style={{ color: 'var(--text-2)', fontSize: '13px' }}>Extracting EXIF metadata…</span>
              </div>
            )}

            {meta && !metaLoading && (
              <div className="card p-5 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={16} style={{ color: 'var(--acid)' }} />
                  <span className="section-title" style={{ fontSize: '13px' }}>Location Information</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    ['Latitude', meta.latitude ?? 'Not found'],
                    ['Longitude', meta.longitude ?? 'Not found'],
                    ['Pincode', meta.resolvedPincode || meta.pincode || 'Not found'],
                    ['Agency', meta.agencyEmail || 'Looking up…'],
                  ].map(([k, v]) => (
                    <div key={k} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                      <div style={{ color: 'var(--text-3)', fontSize: '10px', fontFamily: 'Syne,sans-serif', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                        {k}
                      </div>
                      <div style={{ color: v === 'Not found' ? 'var(--text-3)' : 'var(--text-1)', fontSize: '13px', marginTop: '3px', fontFamily: 'JetBrains Mono,monospace' }}>
                        {String(v)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <p style={{ color: 'var(--text-2)', fontSize: '13px', marginBottom: '12px', fontWeight: 500 }}>
                    📍 Enter Location Details Manually:
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                        Pincode <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g., 400001"
                          maxLength="6"
                          pattern="[0-9]{6}"
                          className="input"
                          value={meta.manualPincode || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                            setMeta(prev => ({
                              ...prev,
                              manualPincode: val,
                              pincode: val
                            }))
                            if (val.length === 6) debouncedFetchAgency(val)
                          }}
                          style={{ fontFamily: 'JetBrains Mono,monospace', paddingRight: '40px' }}
                        />
                        {fetchingAgency && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 rounded-full animate-spin"
                              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--acid)' }} />
                          </div>
                        )}
                      </div>
                    </div>

                    {meta.agencyEmail && meta.agencyEmail !== 'ujjwalvandur03@gmail.com' && (
                      <div className="p-3 rounded-lg" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} style={{ color: 'var(--cleaned)' }} />
                          <span style={{ color: 'var(--text-1)', fontSize: '13px' }}>
                            <strong>{meta.agencyName}</strong> ({meta.city})
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-2)', fontSize: '11px', marginTop: '4px', marginLeft: '22px' }}>
                          {meta.agencyEmail}
                        </div>
                      </div>
                    )}

                    {meta.agencyEmail === 'ujjwalvandur03@gmail.com' && meta.manualPincode?.length === 6 && (
                      <div className="p-3 rounded-lg flex items-start gap-2"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <AlertTriangle size={14} style={{ color: '#F87171', marginTop: '2px' }} />
                        <p style={{ color: '#FCA5A5', fontSize: '12px' }}>
                          No agency found for pincode {meta.manualPincode}. Using default agency.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                        Street Address
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Near City Center, Andheri East"
                        className="input"
                        value={meta.streetAddr || ''}
                        onChange={(e) => setMeta(prev => ({ ...prev, streetAddr: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                        Landmark
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Opposite Railway Station"
                        className="input"
                        value={meta.landmark || ''}
                        onChange={(e) => setMeta(prev => ({ ...prev, landmark: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {file && (
              <button className="btn btn-primary mt-6" onClick={runAI} disabled={aiLoading}
                style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                {aiLoading ? (
                  <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#050D05' }} /> Running AI Analysis…</>
                ) : (
                  <><Cpu size={16} /> Analyse with AI</>
                )}
              </button>
            )}
          </div>
        )}

        {/* Step 1: AI Results */}
        {step === 1 && aiResult && (
          <div className="animate-fade-up">
            <h2 className="heading mb-2" style={{ fontSize: '1.5rem' }}>AI Classification Results</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '24px' }}>
              Review the waste analysis before submitting your complaint.
            </p>

            <div className="card card-glow p-6 mb-4">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>{aiResult.icon || '♻️'}</div>
                  <h3 className="heading" style={{ fontSize: '1.3rem', color: 'var(--text-1)' }}>{aiResult.wasteType}</h3>
                </div>
                <div className="text-right">
                  <span className={`badge sev-${aiResult.severity}`} style={{
                    background: 'rgba(0,0,0,0.3)', border: '1px solid currentColor', borderRadius: '8px',
                    padding: '6px 12px', fontSize: '12px'
                  }}>
                    {aiResult.severity} RISK
                  </span>
                </div>
              </div>
              
              {aiResult.annotated_image_base64 && (
                <div className="mt-4">
                  <div className="label mb-2">Detection Map (Bounding Boxes)</div>
                  <img
                    src={`data:image/png;base64,${aiResult.annotated_image_base64}`}
                    alt="Annotated waste"
                    style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border)' }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ['Biodegradable', aiResult.degradable ? '✅ Yes' : '❌ No'],
                  ['Decomposition', aiResult.decomposeYears ? `${aiResult.decomposeYears} years` : 'Unknown'],
                  ['Recyclable', aiResult.recyclable?.split('—')[0]?.split('.')[0] || 'Unknown'],
                  ['Items Detected', aiResult.totalItems || 1],
                ].map(([k, v]) => (
                  <div key={k} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--text-3)', fontSize: '10px', fontFamily: 'Syne,sans-serif', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>{k}</div>
                    <div style={{ color: 'var(--text-1)', fontSize: '13px', marginTop: '3px' }}>{String(v)}</div>
                  </div>
                ))}
              </div>

              {[
                ['environmentalImpact', '🌍 Environmental Impact', aiResult.environmentalImpact],
                ['recycleBenefit', '♻️ Recycling Benefit', aiResult.recycleBenefit],
              ].map(([k, lab, val]) => val && (
                <div key={k} className="mb-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <button onClick={() => toggle(k)} className="w-full flex items-center justify-between p-3" style={{ background: 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontFamily: 'Syne,sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{lab}</span>
                    {expanded[k] ? <ChevronUp size={14} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />}
                  </button>
                  {expanded[k] && <div className="p-3 pt-0" style={{ color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.7, padding: '12px' }}>{val}</div>}
                </div>
              ))}

              {aiResult.hasHazardous && (
                <div className="flex items-start gap-3 p-3 mt-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <AlertTriangle size={16} style={{ color: '#F87171', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ color: '#FCA5A5', fontSize: '13px' }}>⚠️ Hazardous waste detected. Requires specialised disposal — do not handle directly.</p>
                </div>
              )}
            </div>

            {aiResult.plastics && aiResult.plastics.length > 0 && (
              <div className="mt-4">
                <h4 className="section-title mb-2" style={{ fontSize: '13px' }}>♻️ Plastics Identified</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {aiResult.plastics.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-lg" style={{ background: 'rgba(200,241,53,0.04)', border: '1px solid rgba(200,241,53,0.2)' }}>
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                        <span style={{ fontWeight: 'bold', color: 'var(--acid)' }}>{p.type}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Count: {p.count} | Weight: {p.totalWeightKg} kg</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>
                        🌱 {p.environmentalImpact || 'Recycling reduces landfill and saves resources.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="btn btn-primary" onClick={() => setStep(2)} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
              Proceed to Register Complaint →
            </button>
          </div>
        )}

        {/* Step 2: Submit form */}
        {step === 2 && (
          <div className="animate-fade-up">
            <h2 className="heading mb-2" style={{ fontSize: '1.5rem' }}>Register Complaint</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '24px' }}>Add a description and confirm submission.</p>

            <div className="card p-5 mb-5">
              <div className="flex gap-4 flex-wrap">
                {preview && <img src={preview} alt="waste" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--acid)', fontFamily: 'Syne,sans-serif', fontWeight: 700, marginBottom: '4px' }}>
                    {aiResult?.wasteType || 'Unknown Waste'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    Pincode: 
                    {isEditingPincode ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          maxLength="6"
                          className="input"
                          style={{ padding: '4px 8px', fontSize: '13px', width: '90px', minHeight: '30px' }}
                          value={editPincodeValue}
                          onChange={(e) => setEditPincodeValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          autoFocus
                        />
                        <button 
                          className="btn btn-primary"
                          style={{ padding: '4px 8px', minHeight: '30px' }}
                          onClick={() => {
                            if (editPincodeValue.length === 6) {
                              setMeta(prev => ({ ...prev, resolvedPincode: editPincodeValue, pincode: editPincodeValue, manualPincode: editPincodeValue }))
                              fetchAgencyByPincode(editPincodeValue)
                              setIsEditingPincode(false)
                            } else {
                              toast.error('Pincode must be 6 digits')
                            }
                          }}
                        >
                          <CheckCircle size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ color: 'var(--text-1)' }}>{meta?.resolvedPincode || meta?.pincode || 'N/A'}</span>
                        <button onClick={() => {
                            setEditPincodeValue(meta?.resolvedPincode || meta?.pincode || '')
                            setIsEditingPincode(true)
                          }}
                          style={{ color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Agency: <span style={{ color: 'var(--text-1)' }}>{meta?.agencyEmail || 'To be assigned'}</span>
                    {fetchingAgency && <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--acid)' }} />}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <label className="label">Description *</label>
              <textarea className="input" value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Describe the waste situation, exact location, approximate quantity, any hazards…"
                rows={4} required />
            </div>

            <div className="flex gap-3">
              <button className="btn btn-outline" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !desc.trim()}
                style={{ flex: 2, justifyContent: 'center', padding: '14px' }}>
                {submitting
                  ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#050D05' }} /> Submitting…</>
                  : <><Send size={16} /> Submit Complaint</>
                }
              </button>
            </div>
          </div>
        )}
        
        {/* Full Page AI Loader Overlay */}
        {aiLoading && (
          <div className="ai-loader-overlay">
            <div className="ai-loader-ring">
              <div className="ai-loader-center">
                <Cpu size={40} />
              </div>
            </div>
            <div className="ai-loader-text">Analyzing Image</div>
            <div className="ai-loader-subtext">SwachX AI is detecting waste & estimating impact...</div>
          </div>
        )}
      </div>
    </div>
  )
}