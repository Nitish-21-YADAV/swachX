import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Download, ArrowLeft, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import Navbar from '../components/layout/Navbar'
import StatusBadge from '../components/ui/StatusBadge'
import { formatDate, errMsg } from '../utils/helpers'

const RANGES = [
  { id:'last10',  label:'Last 10 Complaints' },
  { id:'last30',  label:'Last 30 Days' },
]

export default function ReportsPage() {
  const [range,    setRange]    = useState('last10')
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [exporting,setExporting]= useState('')

  const preview = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get(`/reports/preview?range=${range}`)
      setData(d)
    } catch(e) { toast.error(errMsg(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { preview() }, [range])

  const exportFile = async (fmt) => {
    setExporting(fmt)
    try {
      const res = await api.get(`/reports/export/${fmt}?range=${range}`, { responseType:'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a   = document.createElement('a')
      a.href    = url
      a.download = res.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g,'')
                  || `WasteGuard_Report.${fmt==='excel'?'xlsx':'pdf'}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${fmt.toUpperCase()} downloaded!`)
    } catch(e) { toast.error(errMsg(e)) }
    finally { setExporting('') }
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg-base)'}}>
      <Navbar />
      <div className="page-wrapper" style={{paddingTop:'36px',paddingBottom:'60px'}}>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <Link to="/admin" className="btn btn-outline" style={{padding:'8px 12px'}}>
            <ArrowLeft size={15}/>
          </Link>
          <div style={{flex:1}}>
            <h1 className="heading" style={{fontSize:'2rem'}}>Reports</h1>
            <p style={{color:'var(--text-2)',marginTop:'4px'}}>Generate and export complaint data</p>
          </div>
        </div>

        {/* Controls */}
        <div className="card card-glow p-6 mb-6">
          <div className="flex items-end gap-4 flex-wrap">
            <div style={{flex:1,minWidth:'200px'}}>
              <label className="label">Report Range</label>
              <div className="flex gap-2 mt-1">
                {RANGES.map(r => (
                  <button key={r.id} onClick={()=>setRange(r.id)}
                          className="px-4 py-2 rounded-lg text-sm flex-1 text-center transition-all"
                          style={{fontFamily:'Syne,sans-serif',fontWeight:600,cursor:'pointer',
                            background:range===r.id?'rgba(200,241,53,0.1)':'rgba(255,255,255,0.02)',
                            color:range===r.id?'var(--acid)':'var(--text-2)',
                            border:range===r.id?'1px solid rgba(200,241,53,0.3)':'1px solid var(--border)'}}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline" onClick={preview} disabled={loading}>
                <RefreshCw size={14} className={loading?'animate-spin':''}/> Preview
              </button>
              <button className="btn btn-outline" onClick={()=>exportFile('excel')} disabled={!!exporting}>
                <Download size={14}/> {exporting==='excel'?'Exporting…':'Excel'}
              </button>
              <button className="btn btn-primary" onClick={()=>exportFile('pdf')} disabled={!!exporting}>
                <FileText size={14}/> {exporting==='pdf'?'Generating…':'PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        {data && (
          <div className="flex items-center gap-3 mb-4">
            <span className="badge" style={{background:'rgba(200,241,53,0.08)',color:'var(--acid)',border:'1px solid rgba(200,241,53,0.2)'}}>
              {data.count} complaint{data.count!==1?'s':''}
            </span>
            <span style={{color:'var(--text-3)',fontSize:'12px'}}>Range: {data.range}</span>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center gap-3 p-8 justify-center">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{borderColor:'var(--border)',borderTopColor:'var(--acid)'}} />
            <span style={{color:'var(--text-2)'}}>Loading report…</span>
          </div>
        ) : data?.complaints?.length > 0 ? (
          <div className="card" style={{overflowX:'auto'}}>
            <table className="table">
              <thead>
                <tr>
                  {['#','Complaint No.','User','Waste Type','Environmental Impact','Agency','Pincode','Status','Timestamp','Resolved','Energy'].map(h=>(
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.complaints.map((c, i) => (
                  <tr key={c._id}>
                    <td style={{color:'var(--text-3)',fontSize:'12px'}}>{i+1}</td>
                    <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:'12px',color:'var(--acid)',whiteSpace:'nowrap'}}>
                      {c.complaintNumber}
                    </td>
                    <td style={{fontSize:'12px'}}>
                      <div style={{fontWeight:500,color:'var(--text-1)'}}>{c.userName}</div>
                      <div style={{color:'var(--text-3)',fontSize:'10px'}}>{c.userEmail}</div>
                    </td>
                    <td style={{fontSize:'12px',color:'var(--text-2)',maxWidth:'120px'}}>
                      {(c.wasteType||'').split('—')[0].slice(0,25)}
                    </td>
                    <td style={{fontSize:'11px',color:'var(--text-3)',maxWidth:'200px',lineHeight:1.5}}>
                      {(c.environmentalImpact||'').slice(0,80)}{(c.environmentalImpact||'').length>80?'…':''}
                    </td>
                    <td style={{fontSize:'11px',color:'var(--text-2)',maxWidth:'130px'}}>{c.agencyEmail}</td>
                    <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:'12px'}}>{c.pincode}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td style={{fontSize:'11px',color:'var(--text-3)',whiteSpace:'nowrap'}}>{formatDate(c.timestamp)}</td>
                    <td style={{fontSize:'11px',color:'var(--text-3)',whiteSpace:'nowrap'}}>
                      {c.resolvedAt ? formatDate(c.resolvedAt) : '—'}
                    </td>
                    <td style={{fontSize:'12px', fontFamily:'JetBrains Mono,monospace', color:'var(--acid)'}}>
  {c.energyKwh ? `${c.energyKwh} kWh` : '—'}
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-12 text-center">
            <FileText size={36} style={{color:'var(--text-3)',margin:'0 auto 12px'}} />
            <p style={{color:'var(--text-2)'}}>No complaints in this range.</p>
          </div>
        )}

        {/* Export CTA */}
        {data?.complaints?.length > 0 && (
          <div className="flex gap-3 mt-5 justify-end">
            <button className="btn btn-outline" onClick={()=>exportFile('excel')} disabled={!!exporting}>
              <Download size={14}/> Export as Excel
            </button>
            <button className="btn btn-primary" onClick={()=>exportFile('pdf')} disabled={!!exporting}>
              <FileText size={14}/> Export as PDF
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
