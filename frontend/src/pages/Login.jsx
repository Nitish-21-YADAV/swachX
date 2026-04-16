import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, User, ShieldCheck, Wrench, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../utils/helpers'

const ROLES = [
  { id:'user',  label:'Citizen',       icon:User,        desc:'Report waste issues' },
  { id:'staff', label:'Agency Staff',  icon:Wrench,      desc:'Handle field verification' },
  { id:'admin', label:'Administrator', icon:ShieldCheck, desc:'Full system control' },
]

export default function LoginPage() {
  const [role,  setRole]  = useState('user')
  const [email, setEmail] = useState('')
  const [pass,  setPass]  = useState('')
  const [show,  setShow]  = useState(false)
  const [busy,  setBusy]  = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setBusy(true)
    try {
      const { data } = await api.post('/auth/login', { email, password: pass, role })
      login(data.user, data.accessToken)
      toast.success(`Welcome back, ${data.user.name}!`)
      const dest = data.user.role==='admin' ? '/admin' : data.user.role==='staff' ? '/staff' : '/dashboard'
      nav(dest)
    } catch(err) {
      toast.error(errMsg(err))
    } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)',
                  display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      {/* BG grid */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none',
                    backgroundImage:'linear-gradient(rgba(200,241,53,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(200,241,53,0.025) 1px,transparent 1px)',
                    backgroundSize:'40px 40px' }} />

      <div style={{ width:'100%', maxWidth:'440px', position:'relative' }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                 style={{ background:'var(--acid)', color:'var(--bg-base)' }}>♻</div>
            <span className="heading text-2xl" style={{color:'var(--text-1)'}}>Waste<span style={{color:'var(--acid)'}}>Guard</span></span>
          </div>
          <p style={{ color:'var(--text-2)', fontSize:'14px' }}>Sign in to your account</p>
        </div>

        <div className="card card-glow p-8">
          {/* Role selector */}
          <div className="grid grid-cols-3 gap-2 mb-7">
            {ROLES.map(({ id, label, icon: Icon, desc }) => (
              <button key={id} type="button" onClick={() => setRole(id)}
                      className="p-3 rounded-xl text-center transition-all"
                      style={{
                        background: role===id ? 'rgba(200,241,53,0.1)' : 'rgba(255,255,255,0.02)',
                        border:     role===id ? '1px solid rgba(200,241,53,0.35)' : '1px solid var(--border)',
                        cursor: 'pointer',
                      }}>
                <Icon size={18} style={{ color: role===id ? 'var(--acid)':'var(--text-2)', margin:'0 auto 4px' }} />
                <div style={{ fontSize:'11px', fontWeight:700, fontFamily:'Syne,sans-serif',
                              color: role===id ? 'var(--acid)':'var(--text-2)' }}>{label}</div>
                <div style={{ fontSize:'9.5px', color:'var(--text-3)', marginTop:'2px' }}>{desc}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="label">Email address</label>
              <input className="input" type="email" value={email}
                     onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="mb-6">
              <label className="label">Password</label>
              <div style={{ position:'relative' }}>
                <input className="input" type={show?'text':'password'} value={pass}
                       onChange={e=>setPass(e.target.value)} placeholder="••••••••" required
                       style={{ paddingRight:'44px' }} />
                <button type="button" onClick={()=>setShow(!show)}
                        style={{ position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',
                                 background:'none',border:'none',cursor:'pointer',color:'var(--text-3)' }}>
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button className="btn btn-primary w-full justify-center" type="submit" disabled={busy}
                    style={{ width:'100%' }}>
              {busy ? 'Signing in…' : <><LogIn size={16}/> Sign In</>}
            </button>
          </form>

          <p className="text-center mt-5" style={{ color:'var(--text-3)', fontSize:'13px' }}>
            No account?{' '}
            <Link to="/register" style={{ color:'var(--acid)', fontWeight:600 }}>Create one</Link>
          </p>
        </div>

        {/* Demo hint */}
        <div className="text-center mt-4 p-3 rounded-xl"
             style={{ background:'rgba(200,241,53,0.04)', border:'1px solid var(--border)', fontSize:'11px', color:'var(--text-3)' }}>
          Admin: ADMIN22@gmail.com / Admin@1234
        </div>
      </div>
    </div>
  )
}
