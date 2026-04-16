import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_BASE = '/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/auth/me`)
      setUser(data.user)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [refetch])

  // Axios interceptor: redirect to /login on 401
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setUser(null)
          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(interceptor)
  }, [])

  const login = async (username, password) => {
    const { data } = await axios.post(`${API_BASE}/auth/login`, { username, password })
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`)
    } catch {}
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
