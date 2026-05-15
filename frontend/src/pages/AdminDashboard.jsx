import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, X, CheckCircle, XCircle, Users, FileText, Eye, TrendingUp, MapPin, AlertTriangle, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import Navbar from '../components/layout/Navbar'
import StatusBadge from '../components/ui/StatusBadge'
import { formatDate, fmtScore, errMsg } from '../utils/helpers'

function StatCard({ label, value, color }) {
  return (
    <div className="card card-glow p-5">
      <div style={{
        fontSize: '2.4rem', fontFamily: 'Syne,sans-serif', fontWeight: 800,
        color: color || 'var(--acid)', lineHeight: 1
      }}>{value}</div>
      <div style={{
        color: 'var(--text-2)', fontSize: '11px', fontFamily: 'Syne,sans-serif', fontWeight: 700,
        letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '6px'
      }}>{label}</div>
    </div>
  )
}

function ImageModal({ url, annotatedUrl, onClose }) {
  if (!url) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
    }} onClick={onClose}>
      <div className="flex flex-col md:flex-row overflow-y-auto" style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', gap: '20px', padding: '10px' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '0px', right: '0px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', border: 'none',
          cursor: 'pointer', color: 'white', padding: '4px', zIndex: 10
        }}><X size={24} /></button>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="label" style={{ color: 'white', marginBottom: '8px' }}>Original Image</div>
          <img src={url} alt="Original" style={{ width: '100%', maxHeight: '80vh', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
        
        {annotatedUrl && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="label" style={{ color: 'white', marginBottom: '8px' }}>Detection Mapped Image</div>
            <img src={annotatedUrl} alt="Annotated" style={{ width: '100%', maxHeight: '80vh', borderRadius: '12px', objectFit: 'contain' }} />
          </div>
        )}
      </div>
    </div>
  )
}

function StatusModal({ complaint, onClose, onUpdate }) {
  const [status, setStatus] = useState(complaint?.status || 'Pending')
  const [remark, setRemark] = useState(complaint?.adminRemark || '')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await api.patch(`/admin/complaints/${complaint._id}/status`, { status, remark })
      toast.success(`Status updated to ${status}`)
      onUpdate()
      onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setLoading(false) }
  }

  if (!complaint) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
    }}>
      <div className="card card-glow p-6" style={{ width: '100%', maxWidth: '440px' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="heading" style={{ fontSize: '1.1rem' }}>Update Status</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ color: 'var(--text-2)', fontSize: '13px', marginBottom: '16px', fontFamily: 'JetBrains Mono,monospace' }}>
          {complaint.complaintNumber}
        </p>
        <div className="mb-4">
          <label className="label">New Status</label>
          <div className="flex gap-2">
            {['Pending', 'Cleaned', 'Rejected'].map(s => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${status === s ? 'ring-1' : ''}`}
                style={{
                  fontFamily: 'Syne,sans-serif', fontWeight: 600, cursor: 'pointer', flex: 1,
                  background: s === 'Cleaned' ? (status === s ? 'rgba(74,222,128,0.2)' : 'rgba(74,222,128,0.06)') :
                    s === 'Rejected' ? (status === s ? 'rgba(248,113,113,0.2)' : 'rgba(248,113,113,0.06)') :
                      (status === s ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.06)'),
                  color: s === 'Cleaned' ? '#4ADE80' : s === 'Rejected' ? '#F87171' : '#FBBF24',
                  border: `1px solid ${s === 'Cleaned' ? 'rgba(74,222,128,0.3)' : s === 'Rejected' ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.3)'}`,
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-5">
          <label className="label">Admin Remark (optional)</label>
          <textarea className="input" value={remark} onChange={e => setRemark(e.target.value)} rows={3}
            placeholder="Add a note for the user or agency…" />
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}
            style={{ flex: 2, justifyContent: 'center' }}>
            {loading ? 'Updating…' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== NEW: Analysis Modal ==========
function AnalysisModal({ onClose, recommendations }) {
  if (!recommendations) return null;
  
  const binRecs = recommendations.filter(r => r.type === 'bin_deployment');
  const resourceRecs = recommendations.filter(r => r.type === 'resource_report');
  
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: '20px', maxWidth: '800px', width: '100%',
        maxHeight: '80vh', overflowY: 'auto', padding: '24px', border: '1px solid var(--border)'
      }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading" style={{ fontSize: '1.5rem' }}>Predictive Agent Analysis</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
            <X size={24} />
          </button>
        </div>
        
        {recommendations.length === 0 ? (
          <p style={{ color: 'var(--text-2)' }}>No analysis recommendations yet. Agent will run weekly.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Bin Deployment Recommendations */}
            {binRecs.length > 0 && (
              <div>
                <h3 className="label mb-3" style={{ fontSize: '16px', color: 'var(--acid)' }}>🗑️ Bin Deployment Suggestions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {binRecs.map((rec, idx) => (
                    <div key={idx} className="card p-4" style={{ background: 'rgba(200,241,53,0.05)' }}>
                      <div className="flex items-start gap-3">
                        <MapPin size={18} style={{ color: 'var(--acid)' }} />
                        <div>
                          <p><strong>Pincode:</strong> {rec.pincode}</p>
                          <p><strong>Bin Type:</strong> {rec.bin_type}</p>
                          <p><strong>Justification:</strong> {rec.justification}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Generated: {new Date(rec.timestamp).toLocaleString()}</p>
                          <span className={`badge ${rec.status === 'pending' ? 'badge-warning' : 'badge-success'}`} style={{ marginTop: '6px', display: 'inline-block' }}>
                            {rec.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Resource Allocation Reports */}
            {resourceRecs.length > 0 && (
              <div>
                <h3 className="label mb-3" style={{ fontSize: '16px', color: 'var(--acid)' }}>📊 Resource Allocation Reports</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {resourceRecs.map((rec, idx) => (
                    <div key={idx} className="card p-4" style={{ background: 'rgba(74,222,128,0.05)' }}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} style={{ color: '#FBBF24' }} />
                        <div>
                          <p><strong>Critical Pincodes:</strong> {rec.critical_pincodes?.join(', ') || 'N/A'}</p>
                          <p><strong>Summary:</strong> {rec.summary}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Generated: {new Date(rec.timestamp).toLocaleString()}</p>
                          <span className={`badge ${rec.status === 'pending' ? 'badge-warning' : 'badge-success'}`} style={{ marginTop: '6px' }}>
                            {rec.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EditStaffModal({ staff, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    name: staff.name || '',
    email: staff.email || '',
    password: '',
    pincodeStart: staff.assignedPincodeStart || '',
    pincodeEnd: staff.assignedPincodeEnd || '',
    agencyEmail: staff.agencyEmail || ''
  })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.patch(`/auth/staff/update/${staff._id}`, formData)
      toast.success(`Staff ${formData.name} updated`)
      onUpdate()
      onClose()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  if (!staff) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
    }}>
      <div className="card card-glow p-6" style={{ width: '100%', maxWidth: '500px' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="heading" style={{ fontSize: '1.2rem' }}>Edit Staff Account</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="mb-4">
            <label className="label">Full Name</label>
            <input className="input" type="text" value={formData.name} required
              onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="mb-4">
            <label className="label">Email</label>
            <input className="input" type="email" value={formData.email} required
              onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="mb-4">
            <label className="label">Password <span style={{color: 'var(--text-3)', fontSize: '11px', textTransform: 'none'}}>(Leave blank to keep current)</span></label>
            <input className="input" type="password" value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">Pincode Start</label>
              <input className="input" type="text"
                value={formData.pincodeStart}
                onChange={e => setFormData({ ...formData, pincodeStart: e.target.value })} required />
            </div>
            <div>
              <label className="label">Pincode End</label>
              <input className="input" type="text"
                value={formData.pincodeEnd}
                onChange={e => setFormData({ ...formData, pincodeEnd: e.target.value })} required />
            </div>
          </div>
          <div className="mb-5">
            <label className="label">Agency Email</label>
            <input className="input" type="email"
              value={formData.agencyEmail}
              onChange={e => setFormData({ ...formData, agencyEmail: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
              {loading ? 'Updating…' : 'Update Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [imgModal, setImgModal] = useState(null)
  const [statusModal, setStatusModal] = useState(null)
  const [tab, setTab] = useState('complaints')
  const [staffList, setStaffList] = useState([])
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', pincodeStart: '', pincodeEnd: '', agencyEmail: '' })
  const [staffBusy, setStaffBusy] = useState(false)
  const [editStaffModal, setEditStaffModal] = useState(null)

  // New state for analysis modal
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [analysisLoading, setAnalysisLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const q = filter !== 'all' ? `?status=${filter}` : ''
      const [cRes, sRes] = await Promise.all([
        api.get(`/admin/complaints${q}`),
        api.get('/admin/stats')
      ])
      setComplaints(cRes.data.complaints || cRes.data)
      setStats(sRes.data)
    } catch (e) { toast.error(errMsg(e)) }
    finally { setLoading(false) }
  }

  const fetchStaff = async () => {
    try { const { data } = await api.get('/auth/staff/list'); setStaffList(data) }
    catch (e) { toast.error(errMsg(e)) }
  }

  // Fetch recommendations from backend
  const openAnalysisModal = async () => {
    setAnalysisLoading(true)
    try {
      const { data } = await api.get('/agent/recommendations')
      setRecommendations(data)
      setShowAnalysisModal(true)
    } catch (e) {
      toast.error('Failed to load analysis data')
    } finally {
      setAnalysisLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filter])
  useEffect(() => { if (tab === 'staff') fetchStaff() }, [tab])

  const createStaff = async e => {
    e.preventDefault(); setStaffBusy(true)
    try {
      await api.post('/auth/staff/create', newStaff)
      toast.success('Staff account created')
      setNewStaff({ name: '', email: '', password: '', pincodeStart: '', pincodeEnd: '', agencyEmail: '' })
      fetchStaff()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setStaffBusy(false) }
  }

  const FILTERS = [
    { id: 'all', label: `All (${stats.total || 0})` },
    { id: 'Pending', label: `Pending (${stats.pending || 0})` },
    { id: 'Cleaned', label: `Cleaned (${stats.cleaned || 0})` },
    { id: 'Rejected', label: `Rejected (${stats.rejected || 0})` },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      {imgModal && <ImageModal url={imgModal.url} annotatedUrl={imgModal.annotatedUrl} onClose={() => setImgModal(null)} />}
      {statusModal && <StatusModal complaint={statusModal} onClose={() => setStatusModal(null)} onUpdate={fetchData} />}
      {showAnalysisModal && <AnalysisModal recommendations={recommendations} onClose={() => setShowAnalysisModal(false)} />}
      {editStaffModal && <EditStaffModal staff={editStaffModal} onClose={() => setEditStaffModal(null)} onUpdate={fetchStaff} />}

      <div className="page-wrapper" style={{ paddingTop: '36px', paddingBottom: '60px' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="heading" style={{ fontSize: '2rem' }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--text-2)', marginTop: '4px' }}>Full system oversight and control</p>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-outline" onClick={fetchData}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            {/* NEW: View Analysis button */}
            <button className="btn btn-outline" onClick={openAnalysisModal} style={{ borderColor: 'var(--acid)', color: 'var(--acid)' }}>
              <TrendingUp size={15} /> View Analysis
            </button>
            <Link to="/reports" className="btn btn-primary"><FileText size={15} /> Reports</Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard label="Total" value={stats.total || 0} color="var(--acid)" />
          <StatCard label="Pending" value={stats.pending || 0} color="var(--pending)" />
          <StatCard label="Cleaned" value={stats.cleaned || 0} color="var(--cleaned)" />
          <StatCard label="Rejected" value={stats.rejected || 0} color="var(--rejected)" />
          <StatCard label="Citizens" value={stats.users || 0} />
          <StatCard label="Staff" value={stats.staff || 0} />
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-6">
          {[['complaints', 'All Complaints'], ['staff', 'Staff Management']].map(([id, lab]) => (
            <button key={id} onClick={() => setTab(id)}
              className="px-5 py-2 rounded-lg text-sm transition-all"
              style={{
                fontFamily: 'Syne,sans-serif', fontWeight: 600, cursor: 'pointer',
                background: tab === id ? 'rgba(200,241,53,0.1)' : 'var(--bg-card)',
                color: tab === id ? 'var(--acid)' : 'var(--text-2)',
                border: tab === id ? '1px solid rgba(200,241,53,0.3)' : '1px solid var(--border)'
              }}>
              {id === 'staff' ? <><Users size={14} style={{ display: 'inline', marginRight: '6px' }} />{lab}</> : lab}
            </button>
          ))}
        </div>

        {/* ── Complaints tab ── */}
        {tab === 'complaints' && (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className="px-4 py-2 rounded-lg text-sm"
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

            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    {['Images', 'Complaint No.', 'User', 'Waste Type', 'Agency', 'Pincode', 'Status', 'Timestamp', 'Energy', 'Vefiry', 'Actions'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>Loading…</td></tr>
                  ) : complaints.length === 0 ? (
                    <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>No complaints found</td></tr>
                  ) : complaints.map(c => (
                    <tr key={c._id}>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: '110px' }}>
                          {c.imageURL ? (
                            <img src={c.imageURL} alt="Original" onClick={() => setImgModal({ url: c.imageURL, annotatedUrl: c.annotatedImageURL })}
                              style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', cursor: 'zoom-in' }} title="Original Image" />
                          ) : (
                            <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🗑</div>
                          )}
                          {c.annotatedImageURL && (
                            <img src={c.annotatedImageURL} alt="AI Map" onClick={() => setImgModal({ url: c.imageURL, annotatedUrl: c.annotatedImageURL })}
                              style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', cursor: 'zoom-in', border: '1px solid var(--acid)' }} title="AI Detection Map" />
                          )}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '12px', color: 'var(--acid)' }}>{c.complaintNumber}</td>
                      <td style={{ fontSize: '13px' }}>
                        <div style={{ fontWeight: 500 }}>{c.userName}</div>
                        <div style={{ color: 'var(--text-3)', fontSize: '11px' }}>{c.userEmail}</div>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                        {(c.wasteType || '').split('—')[0].slice(0, 30)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-2)' }}>{c.agencyEmail}</td>
                      <td style={{ fontSize: '12px', fontFamily: 'JetBrains Mono,monospace' }}>{c.pincode}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td style={{ fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{formatDate(c.timestamp)}</td>
                      <td style={{ fontSize: '12px', fontFamily: 'JetBrains Mono,monospace', color: 'var(--acid)' }}>
                        {c.energyKwh ? `${c.energyKwh} kWh` : '—'}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '12px', color: 'var(--acid)' }}>
                        {c.ssimScore != null ? fmtScore(c.ssimScore) : '—'}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {c.imageURL && (
                            <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '12px' }}
                              onClick={() => setImgModal({ url: c.imageURL, annotatedUrl: c.annotatedImageURL })}>
                              <Eye size={13} />
                            </button>
                          )}
                          <button className="btn btn-success" style={{ padding: '5px 10px', fontSize: '11px' }}
                            onClick={() => setStatusModal(c)}>
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Staff tab (unchanged) */}
        {tab === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card card-glow p-6">
              <h3 className="section-title mb-5">Create Staff Account</h3>
              <form onSubmit={createStaff}>
                <div className="mb-4">
                  <label className="label">Full Name</label>
                  <input className="input" type="text" value={newStaff.name} required
                    onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
                </div>
                <div className="mb-4">
                  <label className="label">Email</label>
                  <input className="input" type="email" value={newStaff.email} required
                    onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} />
                </div>
                <div className="mb-4">
                  <label className="label">Password</label>
                  <input className="input" type="password" value={newStaff.password} required
                    onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="label">Pincode Start</label>
                    <input className="input" type="text" placeholder="e.g., 400001"
                      value={newStaff.pincodeStart || ''}
                      onChange={e => setNewStaff({ ...newStaff, pincodeStart: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Pincode End</label>
                    <input className="input" type="text" placeholder="e.g., 400107"
                      value={newStaff.pincodeEnd || ''}
                      onChange={e => setNewStaff({ ...newStaff, pincodeEnd: e.target.value })} required />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="label">Agency Email</label>
                  <input className="input" type="email" placeholder="agency@bmc.gov.in"
                    value={newStaff.agencyEmail || ''}
                    onChange={e => setNewStaff({ ...newStaff, agencyEmail: e.target.value })} />
                  <p style={{ color: 'var(--text-3)', fontSize: '11px', marginTop: '4px' }}>
                    Complaints with this agency email will be shown to this staff member.
                  </p>
                </div>
                <button className="btn btn-primary w-full justify-center" type="submit" disabled={staffBusy}
                  style={{ width: '100%' }}>
                  {staffBusy ? 'Creating…' : <><Users size={15} /> Create Staff</>}
                </button>
              </form>
            </div>

            <div className="card p-6">
              <h3 className="section-title mb-4">Existing Staff ({staffList.length})</h3>
              {staffList.length === 0
                ? <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>No staff accounts created yet.</p>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {staffList.map(s => (
                      <div key={s._id} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'rgba(200,241,53,0.1)', color: 'var(--acid)', fontFamily: 'Syne,sans-serif' }}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Syne,sans-serif', color: 'var(--text-1)' }}>{s.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{s.email}</div>
                          {s.assignedPincodeStart && s.assignedPincodeEnd && (
                            <div style={{ fontSize: '11px', color: 'var(--acid)', marginTop: '2px' }}>
                              📍 Area: {s.assignedPincodeStart} - {s.assignedPincodeEnd}
                            </div>
                          )}
                        </div>
                        <span className="badge" style={{ background: 'rgba(200,241,53,0.08)', color: 'var(--acid)', border: '1px solid rgba(200,241,53,0.2)', fontSize: '10px' }}>Staff</span>
                        <button className="btn btn-outline" style={{ padding: '6px', fontSize: '12px' }} onClick={() => setEditStaffModal(s)} title="Edit Staff">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}