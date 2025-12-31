import React, { useState, useEffect } from 'react'
import { ArrowLeft, User, Mail, Phone, MapPin, Loader2, Save, LogOut, Lock, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'

const MobileProfile = ({ onBack }) => {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const bgPrimary = isDark ? '#000000' : '#f5f5f7'
  const bgCard = isDark ? '#0d0d0d' : '#ffffff'
  const bgSecondary = isDark ? '#1a1a1a' : '#f2f2f7'
  const borderColor = isDark ? '#1a1a1a' : '#e5e5ea'
  const textPrimary = isDark ? '#fff' : '#000'
  const textSecondary = isDark ? '#6b7280' : '#8e8e93'
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: ''
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/auth/me', getAuthHeader())
      if (res.data.success) {
        const userData = res.data.data
        setUser(userData)
        setProfileForm({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          country: userData.country || ''
        })
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    try {
      setSaving(true)
      const res = await axios.put('/api/auth/profile', {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
        country: profileForm.country
      }, getAuthHeader())
      if (res.data.success) {
        alert('Profile updated!')
        fetchProfile()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return alert('Passwords do not match')
    }
    if (passwordForm.newPassword.length < 6) {
      return alert('Password must be at least 6 characters')
    }
    try {
      setSaving(true)
      const res = await axios.put('/api/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }, getAuthHeader())
      if (res.data.success) {
        alert('Password changed!')
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: bgPrimary }}>
        <Loader2 className="animate-spin" size={24} color={textSecondary} />
      </div>
    )
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' }
  ]

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: bgPrimary }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: bgCard, borderBottom: `1px solid ${borderColor}` }}>
        <button onClick={onBack} className="p-2 rounded-lg" style={{ backgroundColor: bgSecondary }}>
          <ArrowLeft size={18} color={textSecondary} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: textPrimary }}>Profile</h1>
      </div>

      <div className="flex" style={{ borderBottom: `1px solid ${borderColor}` }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 text-xs"
            style={{ 
              color: activeTab === tab.id ? '#3b82f6' : textSecondary,
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'profile' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                {profileForm.firstName?.charAt(0)}{profileForm.lastName?.charAt(0)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-xs mb-1" style={{ color: textSecondary }}>First Name</p>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className="w-full p-3 rounded-lg text-sm"
                    style={{ backgroundColor: bgSecondary, color: textPrimary, border: `1px solid ${borderColor}` }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs mb-1" style={{ color: textSecondary }}>Last Name</p>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className="w-full p-3 rounded-lg text-sm"
                    style={{ backgroundColor: bgSecondary, color: textPrimary, border: `1px solid ${borderColor}` }}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs mb-1" style={{ color: textSecondary }}>Email (cannot change)</p>
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  className="w-full p-3 rounded-lg text-sm"
                  style={{ backgroundColor: bgSecondary, color: textSecondary, border: `1px solid ${borderColor}` }}
                />
              </div>

              <div>
                <p className="text-xs mb-1" style={{ color: textSecondary }}>Phone</p>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="Enter phone"
                  className="w-full p-3 rounded-lg text-sm"
                  style={{ backgroundColor: bgSecondary, color: textPrimary, border: `1px solid ${borderColor}` }}
                />
              </div>

              <div>
                <p className="text-xs mb-1" style={{ color: textSecondary }}>Country</p>
                <input
                  type="text"
                  value={profileForm.country}
                  onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                  placeholder="Enter country"
                  className="w-full p-3 rounded-lg text-sm"
                  style={{ backgroundColor: bgSecondary, color: textPrimary, border: `1px solid ${borderColor}` }}
                />
              </div>
            </div>

            <button 
              onClick={handleUpdateProfile}
              disabled={saving}
              className="w-full py-3 rounded-xl mt-4 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#22c55e', color: '#000' }}
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save Changes
            </button>
          </>
        )}

        {activeTab === 'security' && (
          <>
            <div className="p-3 rounded-xl mb-4" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
              <p className="text-sm font-medium mb-3" style={{ color: textPrimary }}>Change Password</p>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: textSecondary }}>Current Password</p>
                  <div className="flex items-center rounded-lg" style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}` }}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="flex-1 p-3 bg-transparent text-sm"
                      style={{ color: textPrimary }}
                    />
                    <button onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="p-3">
                      {showCurrentPassword ? <EyeOff size={16} color={textSecondary} /> : <Eye size={16} color={textSecondary} />}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs mb-1" style={{ color: textSecondary }}>New Password</p>
                  <div className="flex items-center rounded-lg" style={{ backgroundColor: bgSecondary, border: `1px solid ${borderColor}` }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="flex-1 p-3 bg-transparent text-sm"
                      style={{ color: textPrimary }}
                    />
                    <button onClick={() => setShowNewPassword(!showNewPassword)} className="p-3">
                      {showNewPassword ? <EyeOff size={16} color={textSecondary} /> : <Eye size={16} color={textSecondary} />}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs mb-1" style={{ color: textSecondary }}>Confirm New Password</p>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full p-3 rounded-lg text-sm"
                    style={{ backgroundColor: bgSecondary, color: textPrimary, border: `1px solid ${borderColor}` }}
                  />
                </div>
              </div>

              <button 
                onClick={handleChangePassword}
                disabled={saving}
                className="w-full py-3 rounded-xl mt-4 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#3b82f6', color: '#fff' }}
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />}
                Change Password
              </button>
            </div>
          </>
        )}

        <button 
          onClick={handleLogout}
          className="w-full py-3 rounded-xl mt-4 flex items-center justify-center gap-2"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444' }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  )
}

export default MobileProfile
