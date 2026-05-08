import { Link } from 'react-router-dom'
import { ArrowRight, Cpu, Shield, MapPin, BarChart3, CheckCircle, Zap, Bot, TrendingUp, Clock } from 'lucide-react'
import Navbar from '../components/layout/Navbar'

const FEATURES = [
  { icon: Bot,        title: 'Twin‑Vision Agent',   desc: ' Agent compares before/after images, verifies location, counts waste, and auto‑updates status.' },
  { icon: Clock,      title: 'Escalation Agent',     desc: 'Scans stale pending complaints every 12h; warns staff or escalates to admin after 48‑72h delay.' },
  { icon: TrendingUp, title: 'Predictive Agent',     desc: 'Weekly analysis of complaint trends; suggests bin deployment & resource allocation reports.' },
  { icon: MapPin,     title: 'GPS & Manual Location',desc: 'Captures user/staff coordinates (EXIF or manual) to ensure same‑spot verification.' },
  { icon: Shield,     title: 'Fraud Detection',      desc: 'Agent checks location consistency & framing; rejects deceptive after‑images automatically.' },
  { icon: BarChart3,  title: 'Live Dashboards',      desc: 'Role‑specific dashboards for citizens, staff, admins with real‑time updates & AI recommendations.' },
]

const STEPS = [
  { num:'01', title:'Report Waste',     desc:'Upload a photo — GPS coordinates are extracted automatically or entered manually. AI counts waste items and detects plastic types.' },
  { num:'02', title:'LLM Classification', desc:'LLM identifies waste type, total items, weights, and environmental impact. Bounding boxes are drawn on the image.' },
  { num:'03', title:'Auto Routing',     desc:'System matches pincode to staff range; assigns complaint and sends email notifications to both citizen and staff.' },
  { num:'04', title:'Twin‑Vision Agent Verification', desc:'Staff uploads after‑cleaning photo. The agent checks and updates final status.' },
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
            Multi‑Agent Waste Management
          </div>

          <h1 className="heading mb-6" style={{ fontSize:'clamp(2.8rem,7vw,7rem)', lineHeight:1.05, color:'var(--text-1)' }}>
            SwachX.<br />
            <span style={{ color:'var(--acid)' }}>Agent Based System </span>
          </h1>

          <p style={{ fontSize:'1.1rem', color:'var(--text-2)', maxWidth:'520px', margin:'0 auto 40px', lineHeight:1.7 }}>
            Upload a photo of illegal dumping. Twin‑Vision Agent verifies cleanup, Escalation Agent handles delays, 
            Predictive Agent plans infrastructure — fully automated.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register" className="btn btn-primary" style={{ fontSize:'15px', padding:'14px 32px' }}>
              Get Started <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-outline" style={{ fontSize:'15px', padding:'14px 32px' }}>
              Sign In
            </Link>
          </div>

          <div className="flex items-center justify-center gap-12 mt-16 flex-wrap">
            {[['3 AI Agents','Twin‑Vision · Escalation · Predictive'],['4 Databases','Auth · Complaints · Agency · Logs'],['3 Roles','Citizen · Staff · Admin'],['LLM Based','Zero‑shot Classification']].map(([num,lab]) => (
              <div key={num} className="text-center">
                <div className="heading text-xl" style={{color:'var(--acid)'}}>{num}</div>
                <div style={{color:'var(--text-3)',fontSize:'11px',marginTop:'2px',fontFamily:'Syne,sans-serif'}}>{lab}</div>
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
              <div key={num} className="card card-glow p-6">
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
            <h2 className="heading" style={{ fontSize:'2.2rem', color:'var(--text-1)' }}>Powered by AI Agents</h2>
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
              Join the platform where AI agents verify cleanup, escalate delays, and plan smarter infrastructure.
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
          © 2025 SwachX — Multi‑Agent AI Waste Complaint Management System
        </p>
      </footer>
    </div>
  )
}