import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Upload, CheckCircle, X, Camera, Locate } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import Navbar from '../components/layout/Navbar'
import StatusBadge from '../components/ui/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { formatDate, fmtScore, errMsg } from '../utils/helpers'

function VerifyModal({ complaint, onClose, onDone }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  // GPS state
  const [manualGps, setManualGps] = useState(null)
  const [locationEnabled, setLocationEnabled] = useState(false)

  const handleFile = f => {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const enableLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      })
      setManualGps({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      })
      setLocationEnabled(true)
      toast.success('Location captured')
    } catch (err) {
      toast.error('Unable to get location')
    }
  }

  const submit = async () => {
    if (!file) { toast.error('Select after-image'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('remark', remark)
      if (manualGps) {
        fd.append('latitude', manualGps.lat)
        fd.append('longitude', manualGps.lng)
      }
      const { data } = await api.post(`/staff/complaints/${complaint._id}/verify`, fd)
      setResult(data)
      toast.success(`Verification complete — ${data.status}`)
      onDone()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto'
    }}>
      <div className="card card-glow" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 className="heading" style={{ fontSize: '1.1rem' }}>Verification</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '12px', fontFamily: 'JetBrains Mono,monospace' }}>
              {complaint.complaintNumber}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {!result ? (
            <>
              {/* GPS Toggle Button */}
              <div className="mb-3">
                <button
                  type="button"
                  onClick={enableLocation}
                  disabled={locationEnabled}
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Locate size={14} />
                  {locationEnabled ? 'GPS Enabled' : 'Enable GPS for this photo'}
                </button>
                {manualGps && (
                  <span className="ml-2 text-xs" style={{ color: 'var(--text-3)' }}>
                    📍 GPS ready
                  </span>
                )}
              </div>

              {/* Before/After side by side */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="label mb-2">Before Image</div>
                  {complaint.imageURL
                    ? <img src={complaint.imageURL} alt="before"
                      style={{ width: '100%', borderRadius: '10px', objectFit: 'cover', height: '160px' }} />
                    : <div style={{ height: '160px', borderRadius: '10px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>No image</div>
                  }
                </div>
                <div>
                  <div className="label mb-2">After Image (Upload)</div>
                  {preview
                    ? <img src={preview} alt="after" onClick={() => fileRef.current.click()}
                      style={{ width: '100%', borderRadius: '10px', objectFit: 'cover', height: '160px', cursor: 'pointer' }} />
                    : (
                      <div className="dropzone" onClick={() => fileRef.current.click()}
                        style={{ height: '160px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Camera size={28} style={{ color: 'var(--text-3)' }} />
                        <p style={{ color: 'var(--text-3)', fontSize: '12px' }}>Upload after-clean photo</p>
                      </div>
                    )
                  }
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files[0])} />
                </div>
              </div>

              <div className="mb-4">
                <label className="label">Staff Remark (optional)</label>
                <textarea className="input" value={remark} onChange={e => setRemark(e.target.value)} rows={2}
                  placeholder="Notes about the cleanup…" />
              </div>

              {/* Info about verification */}
              <div className="p-3 rounded-xl mb-4"
                style={{ background: 'rgba(200,241,53,0.04)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-3)' }}>
                AI similarity → Cleaned (&lt;0.55), Pending (0.55‑0.75), Rejected (&gt;0.75)
              </div>

              <div className="flex gap-3">
                <button className="btn btn-outline" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button className="btn btn-primary" onClick={submit} disabled={loading || !file}
                  style={{ flex: 2, justifyContent: 'center' }}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#050D05' }} /> Running AI…</>
                    : <><Upload size={15} /> Verify Cleanup</>
                  }
                </button>
              </div>
            </>
          ) : (
            /* Result screen */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  background: result.status === 'Cleaned' ? 'rgba(74,222,128,0.12)' : 'rgba(251,191,36,0.12)',
                  border: `1px solid ${result.status === 'Cleaned' ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`
                }}>
                <CheckCircle size={28} style={{ color: result.status === 'Cleaned' ? 'var(--cleaned)' : 'var(--pending)' }} />
              </div>
              <h4 className="heading mb-2" style={{ fontSize: '1.3rem' }}>Verification Complete</h4>
              <StatusBadge status={result.status} />

              <div className="p-4 rounded-xl my-4" style={{ background: 'rgba(200,241,53,0.05)', border: '1px solid var(--border)' }}>
                <div className="label mb-2">Comparison Score</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '2rem', color: 'var(--acid)', fontWeight: 700 }}>
                  {fmtScore(result.similarityScore || result.ssimScore)}
                </div>
                <div style={{ color: 'var(--text-3)', fontSize: '11px', marginTop: '4px' }}>
                  {result.message || (result.isCleaned ? 'Area significantly changed — marked as Cleaned' : 'Insufficient change detected')}
                </div>
              </div>
              <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StaffDashboard() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [verifying, setVerifying] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const q = filter !== 'all' ? `?status=${filter}` : ''
      const [cRes, sRes] = await Promise.all([
        api.get(`/staff/complaints${q}`),
        api.get('/staff/complaints/stats')
      ])
      setComplaints(cRes.data)
      setStats(sRes.data)
    } catch (e) { toast.error(errMsg(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [filter])

  const FILTERS = [
    { id: 'all', label: `All (${stats.total || 0})` },
    { id: 'Pending', label: `Pending (${stats.pending || 0})` },
    { id: 'Cleaned', label: `Cleaned (${stats.cleaned || 0})` },
    { id: 'Rejected', label: `Rejected (${stats.rejected || 0})` },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      {verifying && <VerifyModal complaint={verifying} onClose={() => setVerifying(null)} onDone={fetchData} />}

      <div className="page-wrapper" style={{ paddingTop: '36px', paddingBottom: '60px' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="heading" style={{ fontSize: '2rem' }}>Agency Queue</h1>
            <p style={{ color: 'var(--text-2)', marginTop: '4px' }}>{user?.email} — Field Verification Panel</p>
          </div>
          <button className="btn btn-outline" onClick={fetchData}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[['Total', stats.total || 0, 'var(--acid)'], ['Pending', stats.pending || 0, 'var(--pending)'],
          ['Cleaned', stats.cleaned || 0, 'var(--cleaned)'], ['Rejected', stats.rejected || 0, 'var(--rejected)']].map(([l, v, c]) => (
            <div key={l} className="card card-glow p-5">
              <div style={{ fontSize: '2.4rem', fontFamily: 'Syne,sans-serif', fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
              <div style={{
                color: 'var(--text-2)', fontSize: '11px', fontFamily: 'Syne,sans-serif', fontWeight: 700,
                letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '6px'
              }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} className="px-4 py-2 rounded-lg text-sm"
              style={{
                fontFamily: 'Syne,sans-serif', fontWeight: 600, cursor: 'pointer',
                background: filter === f.id ? 'rgba(200,241,53,0.1)' : 'var(--bg-card)',
                color: filter === f.id ? 'var(--acid)' : 'var(--text-2)',
                border: filter === f.id ? '1px solid rgba(200,241,53,0.3)' : '1px solid var(--border)'
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex items-center gap-3 p-6">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--acid)' }} />
            <span style={{ color: 'var(--text-2)' }}>Loading assignments…</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckCircle size={40} style={{ color: 'var(--acid)', margin: '0 auto 12px' }} />
            <p className="heading" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>All clear!</p>
            <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>No complaints assigned to your agency{filter !== 'all' ? ` with status "${filter}"` : ''}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {complaints.map(c => (
              <div key={c._id} className="card card-glow p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  {c.imageURL && (
                    <img src={c.imageURL} alt="waste"
                      style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  {c.annotatedImageURL && (
                    <img
                      src={c.annotatedImageURL}
                      alt="AI boxes"
                      style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--acid)' }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', color: 'var(--acid)', fontSize: '13px', fontWeight: 600 }}>
                        {c.complaintNumber}
                      </span>
                      <StatusBadge status={c.status} />
                      {c.ssimScore != null && (
                        <span style={{
                          fontFamily: 'JetBrains Mono,monospace', fontSize: '11px',
                          background: 'rgba(200,241,53,0.08)', color: 'var(--acid)',
                          padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(200,241,53,0.2)'
                        }}>
                          Score {fmtScore(c.ssimScore)}
                        </span>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-1)', fontSize: '14px', marginBottom: '6px' }}>{c.description}</p>
                    <div className="flex gap-4 flex-wrap">
                      <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>🗑️ {(c.wasteType || '').split('—')[0].slice(0, 30)}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>📍 {c.pincode}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>🕐 {formatDate(c.timestamp)}</span>
                    </div>
                    {c.afterImageURL && (
                      <div className="flex items-center gap-2 mt-2">
                        <img src={c.afterImageURL} alt="after" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                        <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>After image uploaded</span>
                      </div>
                    )}
                  </div>
                  {c.status === 'Pending' && (
                    <button className="btn btn-primary" onClick={() => setVerifying(c)}
                      style={{ flexShrink: 0 }}>
                      <Camera size={14} /> Verify Cleanup
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}