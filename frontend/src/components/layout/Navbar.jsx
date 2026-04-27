import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LogOut, LayoutDashboard, PlusCircle, FileText, Users, ChevronRight } from 'lucide-react'

const ROLE_LINKS = {
  user:  [{ to:'/dashboard',     label:'Dashboard',  icon:LayoutDashboard },
          { to:'/new-complaint', label:'New Report',  icon:PlusCircle }],
  admin: [{ to:'/admin',   label:'Dashboard', icon:LayoutDashboard },
          { to:'/reports', label:'Reports',   icon:FileText }],
  staff: [{ to:'/staff',   label:'My Queue', icon:LayoutDashboard }],
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()

  const handleLogout = () => { logout(); nav('/') }
  const links = user ? (ROLE_LINKS[user.role] || []) : []

  const rolePill = { user:'Citizen', admin:'Administrator', staff:'Agency Staff' }[user?.role] || user?.role

  return (
    <nav style={{ background:'rgb(255, 255, 255)', backdropFilter:'blur(16px)',
                   position:'sticky', top:0, zIndex:50 }}>
      <div className="page-wrapper">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold"
                 style={{ background:'var(--acid)', color:'var(--bg-base)' }}>
              ♻
            </div>
            <span className="heading text-lg" style={{color:'var(--text-1)'}}>
              Swach<span style={{color:'var(--acid)'}}>X</span>
            </span>
          </Link>

          {/* Nav links */}
          {user && (
            <div className="flex items-center gap-1">
              {links.map(({ to, label, icon: Icon }) => {
                const active = loc.pathname === to
                return (
                  <Link key={to} to={to}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          fontFamily:'Syne,sans-serif',
                          background: active ? 'rgb(213, 202, 192)' : 'transparent',
                          color:      active ? 'var(--acid)' : 'var(--text-2)',
                          border:     active ? '1px solid rgba(200,241,53,0.2)' : '1px solid transparent',
                        }}>
                    <Icon size={15} />
                    {label}
                  </Link>
                )
              })}
            </div>
          )}

          {/* Right */}
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium" style={{fontFamily:'Syne,sans-serif',color:'var(--text-1)'}}>
                  {user.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background:'rgba(200,241,53,0.1)', color:'var(--acid)',
                               fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:'10px' }}>
                  {rolePill}
                </span>
              </div>
              <button onClick={handleLogout} className="btn btn-outline text-sm py-2 px-3">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn btn-outline text-sm py-2">Login</Link>
              <Link to="/register" className="btn btn-primary text-sm py-2">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
