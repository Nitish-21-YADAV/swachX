import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, RefreshCw, ChevronDown, ChevronUp, MapPin, Calendar } from 'lucide-react'
import api from '../utils/api'
import Navbar from '../components/layout/Navbar'
import StatusBadge from '../components/ui/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { formatDate, fmtScore, errMsg } from '../utils/helpers'
import toast from 'react-hot-toast'

function StatCard({ label, value, accent }) {
  return (
    <div className="card card-glow p-5">
      <div className="stat-num" style={accent ? { color: 'var(--acid)' } : {}}>{value}</div>
      <div style={{
        color: 'var(--text-2)', fontSize: '12px', fontFamily: 'Syne,sans-serif', fontWeight: 600,
        letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '4px'
      }}>{label}</div>
    </div>
  )
}

export default function UserDashboard() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState({})

  const fetchData = async () => {
    setLoading(true)
    try {
      const [cRes, sRes] = await Promise.all([
        api.get('/complaints/my'),
        api.get('/complaints/my/stats')
      ])
      setComplaints(cRes.data)
      setStats(sRes.data)
    } catch (e) { toast.error(errMsg(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter)

  const FILTERS = [
    { id: 'all', label: `All (${stats.total || 0})` },
    { id: 'Pending', label: `Pending (${stats.pending || 0})` },
    { id: 'Cleaned', label: `Cleaned (${stats.cleaned || 0})` },
    { id: 'Rejected', label: `Rejected (${stats.rejected || 0})` },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div className="page-wrapper" style={{ paddingTop: '36px', paddingBottom: '60px' }}>

        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="heading" style={{ fontSize: '2rem' }}>My Complaints</h1>
            <p style={{ color: 'var(--text-2)', marginTop: '4px' }}>Welcome, {user?.name}</p>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-outline" onClick={fetchData}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <Link to="/new-complaint" className="btn btn-primary">
              <PlusCircle size={15} /> New Report
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total" value={stats.total || 0} accent />
          <StatCard label="Pending" value={stats.pending || 0} />
          <StatCard label="Cleaned" value={stats.cleaned || 0} />
          <StatCard label="Rejected" value={stats.rejected || 0} />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{
                fontFamily: 'Syne,sans-serif', fontWeight: 600,
                background: filter === f.id ? 'rgba(200,241,53,0.12)' : 'var(--bg-card)',
                color: filter === f.id ? 'var(--acid)' : 'var(--text-2)',
                border: filter === f.id ? '1px solid rgba(238, 107, 0, 0.3)' : '1px solid var(--border)',
                cursor: 'pointer'
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Complaints list */}
        {loading ? (
          <div className="flex items-center gap-3 p-6">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--acid)' }} />
            <span style={{ color: 'var(--text-2)' }}>Loading complaints…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>♻️</div>
            <p className="heading" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No complaints yet</p>
            <p style={{ color: 'var(--text-2)', marginBottom: '20px', fontSize: '14px' }}>
              {filter === 'all' ? 'Start by reporting a waste issue in your area.' : `No ${filter} complaints.`}
            </p>
            {filter === 'all' && <Link to="/new-complaint" className="btn btn-primary">Report Waste</Link>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(c => {
              const isOpen = expanded[c._id]
              return (
                <div key={c._id} className="card">
                  {/* Main row */}
                  <div className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => setExpanded(p => ({ ...p, [c._id]: !p[c._id] }))}>
                    {c.imageURL && (
                      <img src={c.imageURL} alt="waste"
                        style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span style={{ fontFamily: 'JetBrains Mono,monospace', color: 'var(--acid)', fontSize: '13px', fontWeight: 600 }}>
                          {c.complaintNumber}
                        </span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div style={{
                        color: 'var(--text-1)', fontSize: '14px', fontWeight: 500, marginBottom: '3px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {c.description}
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>🗑️ {c.wasteType}</span>
                        <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                          <MapPin size={11} style={{ display: 'inline', marginRight: '2px' }} />{c.pincode}
                        </span>
                        <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                          <Calendar size={11} style={{ display: 'inline', marginRight: '2px' }} />{formatDate(c.timestamp)}
                        </span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={18} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                      : <ChevronDown size={18} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="label mb-2">Before Image</div>
                          {c.imageURL
                            ? <img src={c.imageURL} alt="before" style={{ width: '100%', borderRadius: '10px', objectFit: 'cover', maxHeight: '220px' }} />
                            : <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '13px' }}>No image</div>
                          }
                        </div>
                        {c.afterImageURL && (
                          <div>
                            <div className="label mb-2">After Image</div>
                            <img src={c.afterImageURL} alt="after" style={{ width: '100%', borderRadius: '10px', objectFit: 'cover', maxHeight: '220px' }} />
                          </div>
                        )}
                        {/* Annotated Image from AI (Cloudinary URL) */}
                        {c.annotatedImageURL && (
                          <div className="mt-3">
                            <div className="label mb-2">AI Detection Map (Bounding Boxes)</div>
                            <img
                              src={c.annotatedImageURL}
                              alt="Annotated waste"
                              style={{ width: '100%', borderRadius: '10px', border: '1px solid var(--border)' }}
                            />
                          </div>
                        )}
                      </div>
                      {c.ssimScore != null && (
                        <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(200,241,53,0.05)', border: '1px solid var(--border)' }}>
                          <div className="label mb-2"> Verification Agent</div>
                          <div className="flex items-center gap-3">
                            <div className="ssim-bar-track" style={{ flex: 1 }}>
                              <div className="ssim-bar-fill"
                                style={{
                                  width: `${c.ssimScore * 100}%`,
                                  background: c.ssimScore < 0.8 ? 'var(--cleaned)' : c.ssimScore < 0.62 ? 'var(--review)' : 'var(--rejected)'
                                }} />
                            </div>
                            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '13px', color: 'var(--acid)', fontWeight: 600 }}>
                              {fmtScore(c.ssimScore)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Energy Impact - Waste to Energy */}
                      {c.energyKwh !== undefined && c.energyKwh > 0 && (
                        <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
                          <div className="label mb-2">♻️ Waste-to-Energy Potential</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div><span className="text-gray-400">Energy:</span> <span style={{ color: 'var(--acid)' }}>{c.energyKwh} kWh</span></div>
                            <div><span className="text-gray-400">CO₂ saved:</span> <span style={{ color: 'var(--cleaned)' }}>{c.co2SavedKg} kg</span></div>
                            <div><span className="text-gray-400">🏠 Households (monthly):</span> {c.householdsPowered}</div>
                            <div><span className="text-gray-400">🚗 Cars off road (year):</span> {c.carsOffRoad}</div>
                          </div>
                        </div>
                      )}

                      {c.adminRemark && (
                        <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                          <div className="label mb-1">Admin Remark</div>
                          <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>{c.adminRemark}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div><span className="label">Agency</span><p style={{ color: 'var(--text-1)', fontSize: '13px' }}>{c.agencyEmail}</p></div>
                        <div><span className="label">Env Impact</span><p style={{ color: 'var(--text-2)', fontSize: '12px', lineHeight: 1.5 }}>{(c.environmentalImpact || '').slice(0, 120)}{c.environmentalImpact?.length > 120 ? '…' : ''}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}