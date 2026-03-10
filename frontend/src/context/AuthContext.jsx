import React, { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api/client'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, check if we have a stored token and validate it
  useEffect(() => {
    const token = localStorage.getItem('orbit_token')
    if (!token) {
      setLoading(false)
      return
    }
    getMe()
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('orbit_token')
        localStorage.removeItem('orbit_user')
      })
      .finally(() => setLoading(false))
  }, [])

  const loginUser = (token, userData) => {
    localStorage.setItem('orbit_token', token)
    localStorage.setItem('orbit_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('orbit_token')
    localStorage.removeItem('orbit_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
