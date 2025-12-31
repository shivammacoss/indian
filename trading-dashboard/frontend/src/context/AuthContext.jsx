import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing user session
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (token && storedUser) {
      setUser(JSON.parse(storedUser))
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }

    // Check for existing admin session
    const adminToken = localStorage.getItem('adminToken')
    const storedAdmin = localStorage.getItem('admin')
    if (adminToken && storedAdmin) {
      setAdmin(JSON.parse(storedAdmin))
    }

    setLoading(false)
  }, [])

  const login = (userData, token) => {
    setUser(userData)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
  }

  const adminLogin = (adminData, token) => {
    setAdmin(adminData)
    localStorage.setItem('adminToken', token)
    localStorage.setItem('admin', JSON.stringify(adminData))
  }

  const adminLogout = () => {
    setAdmin(null)
    localStorage.removeItem('adminToken')
    localStorage.removeItem('admin')
  }

  const value = {
    user,
    admin,
    loading,
    isAuthenticated: !!user,
    isAdminAuthenticated: !!admin,
    login,
    logout,
    adminLogin,
    adminLogout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
