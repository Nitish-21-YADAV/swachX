import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../utils/helpers'

export default function RegisterPage() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', confirm:'' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()

  const set = k => e => setForm(p => ({...p, [k]: e.target.value}))

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    setBusy(true)
    try {
      const { data } = await api.post('/auth/register', {
        name:form.name, email:form.email, phone:form.phone, password:form.password
      })
      login(data.user, data.accessToken) 
      toast.success('Account created! Welcome to WasteGuard.')
      nav('/dashboard')
    } catch(err) { toast.error(errMsg(err))   
    } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)',
                  display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none',
                    backgroundImage:'linear-gradient(rgba(200,241,53,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(200,241,53,0.025) 1px,transparent 1px)',
                    backgroundSize:'40px 40px' }} />

      <div style={{ width:'100%', maxWidth:'440px', position:'relative' }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                 style={{ background:'var(--acid)', color:'var(--bg-base)' }}>♻</div>
            <span className="heading text-2xl">Waste<span style={{color:'var(--acid)'}}>Guard</span></span>
          </div>
          <p style={{ color:'var(--text-2)', fontSize:'14px' }}>Create your citizen account</p>
        </div>

        <div className="card card-glow p-8">
          <form onSubmit={handleSubmit}>
            {[
              { k:'name',    label:'Full Name',        type:'text',     ph:'John Doe' },
              { k:'email',   label:'Email Address',    type:'email',    ph:'you@example.com' },
              { k:'phone',   label:'Phone (optional)', type:'tel',      ph:'+91 98765 43210' },
            ].map(({ k, label, type, ph }) => (
              <div className="mb-4" key={k}>
                <label className="label">{label}</label>
                <input className="input" type={type} value={form[k]}
                       onChange={set(k)} placeholder={ph} required={k!=='phone'} />
              </div>
            ))}

            {[['password','Password'],['confirm','Confirm Password']].map(([k,lab]) => (
              <div className="mb-4" key={k}>
                <label className="label">{lab}</label>
                <div style={{position:'relative'}}>
                  <input className="input" type={show?'text':'password'} value={form[k]}
                         onChange={set(k)} placeholder="••••••••" required style={{paddingRight:'44px'}} />
                  {k==='password' && (
                    <button type="button" onClick={()=>setShow(!show)}
                            style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',
                                   background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}>
                      {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button className="btn btn-primary mt-2 w-full justify-center" type="submit"
                    disabled={busy} style={{width:'100%'}}>
              {busy ? 'Creating account…' : <><UserPlus size={16}/> Create Account</>}
            </button>
          </form>

          <p className="text-center mt-5" style={{color:'var(--text-3)',fontSize:'13px'}}>
            Have an account?{' '}
            <Link to="/login" style={{color:'var(--acid)',fontWeight:600}}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
