import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 120000 })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('wg_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wg_user')
      localStorage.removeItem('wg_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// AI Service (FastAPI)
export const aiApi = axios.create({ baseURL: '/ai', timeout: 120000 })
