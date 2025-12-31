import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Loader2, UserPlus } from 'lucide-react'
import axios from 'axios'

const Signup = ({ onSignup }) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const referralCode = searchParams.get('ref') || ''
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!agreeTerms) {
      setError('Please agree to the Terms & Conditions')
      return
    }

    setLoading(true)

    try {
      const res = await axios.post('/api/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        referralCode: referralCode || undefined
      })
      
      if (res.data.success) {
        localStorage.setItem('token', res.data.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.data.user))
        if (onSignup) onSignup(res.data.data.user)
        navigate('/home')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col p-8" style={{ backgroundColor: '#0a0a0f' }}>
        {/* Top Header with Logo and Back Button */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <img src="/hcfinvest-logo.png" alt="Hcfinvest" className="h-10 w-auto" />
            <span className="text-2xl font-bold text-white tracking-wide">HCFINVEST</span>
          </div>
          <a href="/" className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm">
            Back to website
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>

        {/* Center Content - Chart Animation */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-md">
            {/* Glowing Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-purple-500/10 to-transparent rounded-3xl blur-3xl"></div>
            
            {/* Chart Visualization */}
            <div className="relative p-8">
              <svg viewBox="0 0 400 200" className="w-full h-48">
                <defs>
                  <linearGradient id="chartGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {/* Chart Area Fill */}
                <path d="M 0 180 Q 50 160 100 140 T 200 100 T 300 80 T 400 60 L 400 200 L 0 200 Z" fill="url(#chartGradient2)"/>
                {/* Chart Line */}
                <path d="M 0 180 Q 50 160 100 140 T 200 100 T 300 80 T 400 60" fill="none" stroke="#8b5cf6" strokeWidth="3"/>
                {/* Glowing Dot */}
                <circle cx="380" cy="65" r="8" fill="#8b5cf6">
                  <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
                </circle>
                <circle cx="380" cy="65" r="4" fill="#fff"/>
              </svg>
            </div>
          </div>

          {/* Tagline */}
          <div className="text-center mt-8">
            <h2 className="text-3xl font-bold text-white mb-2">Start Trading,</h2>
            <h2 className="text-3xl font-bold text-white">Build Wealth</h2>
          </div>

          {/* Pagination Dots */}
          <div className="flex gap-2 mt-8">
            <div className="w-8 h-1.5 rounded-full bg-gray-600"></div>
            <div className="w-8 h-1.5 rounded-full bg-white"></div>
            <div className="w-8 h-1.5 rounded-full bg-gray-600"></div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-8" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-md w-full mx-auto">
          {/* Mobile Logo - Only show on mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/hcfinvest-logo.png" alt="Hcfinvest" className="h-10 w-auto" />
            <span className="text-2xl font-bold text-white tracking-wide">HCFINVEST</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
          <p className="text-gray-400 mb-6">
            Already have an account? <Link to="/login" className="text-white underline hover:text-purple-400">Log in</Link>
          </p>

          {/* Referral Badge */}
          {referralCode && (
            <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
              <UserPlus size={18} className="text-green-400" />
              <span className="text-green-400 text-sm">
                You were referred by: <strong>{referralCode}</strong>
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="flex-1 px-4 py-4 rounded-xl bg-transparent border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="flex-1 px-4 py-4 rounded-xl bg-transparent border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
            </div>

            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-4 rounded-xl bg-transparent border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              required
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-4 rounded-xl bg-transparent border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-4 rounded-xl bg-transparent border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              required
              minLength={6}
            />

            <label className="flex items-start gap-2 text-gray-400 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
              />
              <span>
                I agree to the{' '}
                <Link to="/terms" className="text-purple-400 hover:underline">Terms & Conditions</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-purple-400 hover:underline">Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  Creating Account...
                </span>
              ) : (
                'Sign up'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-700"></div>
            <span className="text-gray-500 text-sm">Or sign up with</span>
            <div className="flex-1 h-px bg-gray-700"></div>
          </div>

          {/* Social Signup */}
          <div className="flex gap-4">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-900 border border-gray-700 text-white hover:bg-gray-800 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-900 border border-gray-700 text-white hover:bg-gray-800 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Apple
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup
