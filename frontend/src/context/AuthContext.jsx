import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  const _store = (u, token) => {
    localStorage.setItem('wg_user',  JSON.stringify(u))
    localStorage.setItem('wg_token', token)
    setUser(u)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const login = (u, token) => _store(u, token)

  const logout = useCallback(() => {
    localStorage.removeItem('wg_user')
    localStorage.removeItem('wg_token')
    setUser(null)
    delete api.defaults.headers.common['Authorization']
  }, [])

  useEffect(() => {
    const savedUser  = localStorage.getItem('wg_user')
    const savedToken = localStorage.getItem('wg_token')
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser))
      api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
    }
    setLoading(false)
  }, [])

  return (
    <AuthCtx.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  )
}
