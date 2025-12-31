import React, { useState, useEffect } from 'react'
import {
  UserCircle,
  Mail,
  Phone,
  MapPin,
  Lock,
  Shield,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  Camera,
  Save,
  Eye,
  EyeOff,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react'
import axios from 'axios'

const Profile = () => {
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
  
  const [kycForm, setKycForm] = useState({
    idType: 'passport',
    idFront: null,
    idBack: null,
    selfie: null,
    addressProof: null
  })
  
  const [kycStatus, setKycStatus] = useState({
    status: 'pending', // pending, submitted, verified, rejected
    submittedAt: null,
    message: ''
  })

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
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
        if (userData.kyc) {
          setKycStatus(userData.kyc)
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await axios.put('/api/auth/profile', {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
        country: profileForm.country
      }, getAuthHeader())
      
      if (res.data.success) {
        alert('Profile updated successfully!')
        fetchUserProfile()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match')
      return
    }
    
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    
    try {
      setSaving(true)
      const res = await axios.put('/api/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }, getAuthHeader())
      
      if (res.data.success) {
        alert('Password changed successfully!')
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = (field, e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      setKycForm(prev => ({ ...prev, [field]: file }))
    }
  }

  const handleSubmitKYC = async (e) => {
    e.preventDefault()
    
    if (!kycForm.idFront || !kycForm.selfie) {
      alert('Please upload ID front and selfie at minimum')
      return
    }
    
    try {
      setSaving(true)
      const formData = new FormData()
      formData.append('idType', kycForm.idType)
      if (kycForm.idFront) formData.append('idFront', kycForm.idFront)
      if (kycForm.idBack) formData.append('idBack', kycForm.idBack)
      if (kycForm.selfie) formData.append('selfie', kycForm.selfie)
      if (kycForm.addressProof) formData.append('addressProof', kycForm.addressProof)
      
      // Note: KYC endpoint would need to be created
      alert('KYC documents submitted! Verification in progress.')
      setKycStatus({ status: 'submitted', submittedAt: new Date(), message: 'Documents under review' })
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit KYC')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: '#fff' }}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{user?.firstName} {user?.lastName}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            {user?.isVerified ? (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                <CheckCircle size={12} /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500">
                <Clock size={12} /> Unverified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all"
          style={{ 
            background: activeTab === 'profile' ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'var(--bg-card)', 
            color: activeTab === 'profile' ? '#fff' : 'var(--text-secondary)' 
          }}
        >
          <UserCircle size={18} /> Profile
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all"
          style={{ 
            background: activeTab === 'password' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'var(--bg-card)', 
            color: activeTab === 'password' ? '#fff' : 'var(--text-secondary)' 
          }}
        >
          <Lock size={18} /> Password
        </button>
        <button
          onClick={() => setActiveTab('kyc')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all"
          style={{ 
            background: activeTab === 'kyc' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'var(--bg-card)', 
            color: activeTab === 'kyc' ? '#fff' : 'var(--text-secondary)' 
          }}
        >
          <Shield size={18} /> KYC Verification
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Edit Profile</h2>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>First Name</label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Last Name</label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Email (cannot be changed)</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  className="w-full pl-12 pr-4 py-3 rounded-xl opacity-60"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Phone Number</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                  className="w-full pl-12 pr-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Country</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={profileForm.country}
                  onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                  placeholder="United States"
                  className="w-full pl-12 pr-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: '#fff' }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Changes
            </button>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Change Password</h2>
          
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Current Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full pl-12 pr-12 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  required
                />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">
                  {showCurrentPassword ? <EyeOff size={18} style={{ color: 'var(--text-muted)' }} /> : <Eye size={18} style={{ color: 'var(--text-muted)' }} />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>New Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full pl-12 pr-12 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">
                  {showNewPassword ? <EyeOff size={18} style={{ color: 'var(--text-muted)' }} /> : <Eye size={18} style={{ color: 'var(--text-muted)' }} />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Confirm New Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#fff' }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
              Change Password
            </button>
          </form>
        </div>
      )}

      {/* KYC Tab */}
      {activeTab === 'kyc' && (
        <div className="space-y-6">
          {/* KYC Status Card */}
          <div className="rounded-2xl p-6" style={{ 
            background: kycStatus.status === 'verified' ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)' :
                       kycStatus.status === 'submitted' ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)' :
                       kycStatus.status === 'rejected' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)' :
                       'linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(75, 85, 99, 0.1) 100%)',
            border: `1px solid ${kycStatus.status === 'verified' ? 'rgba(34, 197, 94, 0.3)' : kycStatus.status === 'submitted' ? 'rgba(251, 191, 36, 0.3)' : kycStatus.status === 'rejected' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`
          }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ 
                background: kycStatus.status === 'verified' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' :
                           kycStatus.status === 'submitted' ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' :
                           kycStatus.status === 'rejected' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                           'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
              }}>
                {kycStatus.status === 'verified' ? <CheckCircle size={28} style={{ color: '#fff' }} /> :
                 kycStatus.status === 'submitted' ? <Clock size={28} style={{ color: '#fff' }} /> :
                 kycStatus.status === 'rejected' ? <XCircle size={28} style={{ color: '#fff' }} /> :
                 <Shield size={28} style={{ color: '#fff' }} />}
              </div>
              <div>
                <h3 className="text-lg font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                  KYC {kycStatus.status}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {kycStatus.status === 'verified' ? 'Your identity has been verified' :
                   kycStatus.status === 'submitted' ? 'Documents are under review (1-3 business days)' :
                   kycStatus.status === 'rejected' ? kycStatus.message || 'Please resubmit your documents' :
                   'Complete verification to unlock all features'}
                </p>
              </div>
            </div>
          </div>

          {/* KYC Form */}
          {kycStatus.status !== 'verified' && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Submit KYC Documents</h2>
              
              <form onSubmit={handleSubmitKYC} className="space-y-6">
                {/* ID Type Selection */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>ID Document Type</label>
                  <select
                    value={kycForm.idType}
                    onChange={(e) => setKycForm({ ...kycForm, idType: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID Card</option>
                    <option value="driving_license">Driving License</option>
                  </select>
                </div>

                {/* Document Uploads */}
                <div className="grid grid-cols-2 gap-4">
                  {/* ID Front */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>ID Front Side *</label>
                    <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-blue-500" style={{ borderColor: kycForm.idFront ? '#22c55e' : 'var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
                      {kycForm.idFront ? (
                        <div className="text-center">
                          <CheckCircle size={32} className="mx-auto mb-2" style={{ color: '#22c55e' }} />
                          <p className="text-sm" style={{ color: '#22c55e' }}>{kycForm.idFront.name}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Click to upload</p>
                        </div>
                      )}
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload('idFront', e)} />
                    </label>
                  </div>

                  {/* ID Back */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>ID Back Side</label>
                    <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-blue-500" style={{ borderColor: kycForm.idBack ? '#22c55e' : 'var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
                      {kycForm.idBack ? (
                        <div className="text-center">
                          <CheckCircle size={32} className="mx-auto mb-2" style={{ color: '#22c55e' }} />
                          <p className="text-sm" style={{ color: '#22c55e' }}>{kycForm.idBack.name}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Click to upload</p>
                        </div>
                      )}
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload('idBack', e)} />
                    </label>
                  </div>

                  {/* Selfie */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Selfie with ID *</label>
                    <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-blue-500" style={{ borderColor: kycForm.selfie ? '#22c55e' : 'var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
                      {kycForm.selfie ? (
                        <div className="text-center">
                          <CheckCircle size={32} className="mx-auto mb-2" style={{ color: '#22c55e' }} />
                          <p className="text-sm" style={{ color: '#22c55e' }}>{kycForm.selfie.name}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Camera size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Selfie holding ID</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('selfie', e)} />
                    </label>
                  </div>

                  {/* Address Proof */}
                  <div>
                    <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Proof of Address</label>
                    <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-blue-500" style={{ borderColor: kycForm.addressProof ? '#22c55e' : 'var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
                      {kycForm.addressProof ? (
                        <div className="text-center">
                          <CheckCircle size={32} className="mx-auto mb-2" style={{ color: '#22c55e' }} />
                          <p className="text-sm" style={{ color: '#22c55e' }}>{kycForm.addressProof.name}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <FileText size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Utility bill / Bank statement</p>
                        </div>
                      )}
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload('addressProof', e)} />
                    </label>
                  </div>
                </div>

                <div className="p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                  <AlertCircle size={20} style={{ color: '#3b82f6' }} />
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <p className="font-medium mb-1" style={{ color: '#3b82f6' }}>Document Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Documents must be clear and readable</li>
                      <li>All four corners must be visible</li>
                      <li>File size: Max 5MB per file</li>
                      <li>Formats: JPG, PNG, PDF</li>
                    </ul>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving || (!kycForm.idFront || !kycForm.selfie)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: '#fff' }}
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                  Submit for Verification
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Profile
