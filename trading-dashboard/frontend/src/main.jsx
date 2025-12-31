import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import { AdminPanel } from './components/admin'
import { Login, Signup, AdminLogin } from './components/auth'
import { ChallengeMarketplace } from './components/PropFirm'
import IndianTradingDashboard from './components/IndianTradingDashboard.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

// Set initial theme class
document.documentElement.classList.add('dark')

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

// Admin Protected Route wrapper
const AdminProtectedRoute = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken')
  if (!adminToken) {
    return <Navigate to="/admin/login" replace />
  }
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/register" element={<Signup />} />
              
              {/* Protected User Routes */}
              <Route path="/home" element={<ProtectedRoute><App initialView="home" /></ProtectedRoute>} />
              <Route path="/trade" element={<ProtectedRoute><App initialView="chart" /></ProtectedRoute>} />
              {/* Trade route requires active trading account - App.jsx will redirect to accounts if none */}
              <Route path="/wallet" element={<ProtectedRoute><App initialView="wallet" /></ProtectedRoute>} />
              <Route path="/copytrade" element={<ProtectedRoute><App initialView="copy" /></ProtectedRoute>} />
              <Route path="/ib" element={<ProtectedRoute><App initialView="ib" /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><App initialView="orders" /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><App initialView="profile" /></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute><App initialView="support" /></ProtectedRoute>} />
              <Route path="/accounts" element={<ProtectedRoute><App initialView="accounts" /></ProtectedRoute>} />
              
              {/* Prop Firm Challenge Routes */}
              <Route path="/prop-firm" element={<ProtectedRoute><App initialView="propfirm" /></ProtectedRoute>} />
              
              {/* Indian Trading Dashboard */}
              <Route path="/indian-trade" element={<ProtectedRoute><IndianTradingDashboard /></ProtectedRoute>} />
                                          
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminProtectedRoute><AdminPanel initialSection="overview" /></AdminProtectedRoute>} />
              <Route path="/admin/overview" element={<AdminProtectedRoute><AdminPanel initialSection="overview" /></AdminProtectedRoute>} />
              <Route path="/admin/users" element={<AdminProtectedRoute><AdminPanel initialSection="users" /></AdminProtectedRoute>} />
              <Route path="/admin/trades" element={<AdminProtectedRoute><AdminPanel initialSection="trades" /></AdminProtectedRoute>} />
              <Route path="/admin/funds" element={<AdminProtectedRoute><AdminPanel initialSection="funds" /></AdminProtectedRoute>} />
              <Route path="/admin/bank" element={<AdminProtectedRoute><AdminPanel initialSection="bank" /></AdminProtectedRoute>} />
              <Route path="/admin/ib" element={<AdminProtectedRoute><AdminPanel initialSection="ib" /></AdminProtectedRoute>} />
              <Route path="/admin/charges" element={<AdminProtectedRoute><AdminPanel initialSection="charges" /></AdminProtectedRoute>} />
              <Route path="/admin/copytrade" element={<AdminProtectedRoute><AdminPanel initialSection="copytrade" /></AdminProtectedRoute>} />
              <Route path="/admin/propfirm" element={<AdminProtectedRoute><AdminPanel initialSection="propfirm" /></AdminProtectedRoute>} />
              <Route path="/admin/accounttypes" element={<AdminProtectedRoute><AdminPanel initialSection="accounttypes" /></AdminProtectedRoute>} />
              <Route path="/admin/kyc" element={<AdminProtectedRoute><AdminPanel initialSection="kyc" /></AdminProtectedRoute>} />
              <Route path="/admin/support" element={<AdminProtectedRoute><AdminPanel initialSection="support" /></AdminProtectedRoute>} />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
