import { Link } from 'react-router-dom'
import { ArrowRight, Cpu, Shield, MapPin, BarChart3, CheckCircle, Zap } from 'lucide-react'
import Navbar from '../components/layout/Navbar'

const FEATURES = [
  { icon: Cpu,        title: 'YOLOv11 AI Detection',   desc: 'Real-time waste classification with environmental impact data from a comprehensive knowledge base.' },
  { icon: MapPin,     title: 'GPS & EXIF Routing',       desc: 'Extracts GPS coordinates from image metadata to auto-assign complaints to responsible agencies.' },
  { icon: Shield,     title: 'SSIM Verification',        desc: 'Before/after image comparison using Structural Similarity Index to verify cleanup authenticity.' },
  { icon: BarChart3,  title: 'Live Dashboards',          desc: 'Role-specific dashboards for citizens, administrators and cleaning agencies updated in real time.' },
  { icon: CheckCircle,title: 'Auto Agency Routing',      desc: 'Pincode-based matching routes every complaint to the correct municipal agency instantly.' },
  { icon: Zap,        title: 'PDF & Excel Reports',      desc: 'Admin-generated reports with complaint data, agency assignments, and resolution timelines.' },
]

const STEPS = [
  { num:'01', title:'Report Waste',     desc:'Upload a photo — GPS coordinates and pincode are extracted automatically from EXIF metadata.' },
  { num:'02', title:'AI Classification', desc:'YOLOv11 identifies waste type, degradability, and environmental impact before you submit.' },
  { num:'03', title:'Auto Routing',     desc:'The system finds the responsible agency from agencyDB and assigns your complaint instantly.' },
  { num:'04', title:'SSIM Verified',    desc:'Agency staff upload an after-photo. SSIM comparison confirms cleanup authenticity automatically.' },
]

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      {/* Hero */}
      <section style={{
        background: 'radial-gradient(ellipse at 15% 60%, rgba(171, 101, 44, 0.48) 0%, transparent 55%), radial-gradient(ellipse at 85% 20%, rgba(139,184,32,0.05) 0%, transparent 45%), var(--bg-base)',
        padding: '100px 0 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative grid */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:'linear-gradient(rgba(200,241,53,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,241,53,0.03) 1px, transparent 1px)',
          backgroundSize:'48px 48px', pointerEvents:'none'
        }} />

        <div className="page-wrapper" style={{ position:'relative', textAlign:'center' }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
               style={{ background:'rgba(255, 0, 0, 0.08)', border:'1px solid rgba(200,241,53,0.2)',
                        fontFamily:'Helvetica', fontSize:'12px', fontWeight:700,
                        color:'var(--acid)', letterSpacing:'1px', textTransform:'uppercase' }}>
            <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{background:'var(--acid)'}} />
            AI-Powered Waste Management System
          </div>

          <h1 className="heading mb-6" style={{ fontSize:'clamp(2.8rem,7vw,7rem)', lineHeight:1.05, color:'var(--text-1)' }}>
            Report Waste.<br />
            <span style={{ color:'var(--acid)' }}>Save the Planet.</span>
          </h1>

          <p style={{ fontSize:'1.1rem', color:'var(--text-2)', maxWidth:'520px', margin:'0 auto 40px', lineHeight:1.7 }}>
            Upload a photo of illegal dumping. Our AI classifies the waste, routes it to the right agency, 
            and verifies cleanup — all automatically.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register" className="btn btn-primary" style={{ fontSize:'15px', padding:'14px 32px' }}>
              Get Started <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-outline" style={{ fontSize:'15px', padding:'14px 32px' }}>
              Sign In
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-12 mt-16 flex-wrap">
            {[['4 Databases','Isolated & Secure'],['YOLOv11','14 Waste Classes'],['SSIM Verified','Before/After AI Check'],['3 Roles','User · Admin · Staff']].map(([num,lab]) => (
              <div key={num} className="text-center">
                <div className="heading text-xl" style={{color:'var(--acid)'}}>{num}</div>
                <div style={{color:'var(--text-3)',fontSize:'12px',marginTop:'2px',fontFamily:'Syne,sans-serif'}}>{lab}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="glow-divider" />

      {/* How it works */}
      <section style={{ padding: '80px 0' }}>
        <div className="page-wrapper">
          <div className="text-center mb-12">
            <p style={{ color:'var(--acid)', fontSize:'11px', fontFamily:'Syne,sans-serif',
                        fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'8px' }}>
              WORKFLOW
            </p>
            <h2 className="heading" style={{ fontSize:'2.2rem', color:'var(--text-1)' }}>How It Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="card card-glow p-6 ">
                <div className="heading mb-3" style={{ fontSize:'3rem', color:'rgb(241, 141, 53)', lineHeight:1 }}>
                  {num}
                </div>
                <h3 className="section-title mb-2">{title}</h3>
                <p style={{ color:'var(--text-2)', fontSize:'13.5px', lineHeight:1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="glow-divider" />

      {/* Features */}
      <section style={{ padding: '80px 0' }}>
        <div className="page-wrapper">
          <div className="text-center mb-12">
            <p style={{ color:'var(--acid)', fontSize:'11px', fontFamily:'Syne,sans-serif',
                        fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'8px' }}>
              FEATURES
            </p>
            <h2 className="heading" style={{ fontSize:'2.2rem', color:'var(--text-1)' }}>Built for Real Impact</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 group" style={{ transition:'border-color 0.2s' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                     style={{ background:'rgba(200,241,53,0.1)', border:'1px solid rgba(200,241,53,0.2)' }}>
                  <Icon size={18} style={{ color:'var(--acid)' }} />
                </div>
                <h3 className="section-title mb-2">{title}</h3>
                <p style={{ color:'var(--text-2)', fontSize:'13.5px', lineHeight:1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'60px 0 80px' }}>
        <div className="page-wrapper text-center">
          <div className="card card-glow p-12" style={{
            background:'radial-gradient(ellipse at center, rgba(200,241,53,0.06) 0%, transparent 70%), var(--bg-card)'
          }}>
            <h2 className="heading mb-4" style={{fontSize:'2rem',color:'var(--text-1)'}}>
              Start Reporting Today
            </h2>
            <p style={{color:'var(--text-2)',marginBottom:'32px',fontSize:'15px'}}>
              Join the platform that connects citizens with municipal agencies through AI-verified waste complaints.
            </p>
            <Link to="/register" className="btn btn-primary" style={{fontSize:'15px',padding:'14px 36px'}}>
              Create Free Account <ArrowRight size={16}/>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid var(--border)', padding:'24px 0', textAlign:'center' }}>
        <p style={{ color:'var(--text-3)', fontSize:'12px', fontFamily:'Syne,sans-serif' }}>
          © 2024 WasteGuard — AI Waste Complaint Management System
        </p>
      </footer>
    </div>
  )
}
