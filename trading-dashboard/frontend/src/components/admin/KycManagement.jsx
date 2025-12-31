import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Search, Filter, Check, X, Eye, RefreshCw, 
  FileText, User, Clock, AlertCircle, ChevronDown
} from 'lucide-react'

const KycManagement = () => {
  const [kycList, setKycList] = useState([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [filterStatus, setFilterStatus] = useState('pending')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  const fetchKycList = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`/api/admin/kyc?status=${filterStatus}`, getAuthHeader())
      if (res.data.success) {
        setKycList(res.data.data)
        setCounts(res.data.counts)
      }
    } catch (error) {
      console.error('Error fetching KYC list:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKycList()
  }, [filterStatus])

  const handleApprove = async (userId) => {
    if (!window.confirm('Are you sure you want to approve this KYC?')) return
    
    try {
      setProcessing(true)
      const res = await axios.put(`/api/admin/kyc/${userId}/approve`, {}, getAuthHeader())
      if (res.data.success) {
        alert('KYC approved successfully')
        setShowDetailModal(false)
        setSelectedUser(null)
        fetchKycList()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error approving KYC')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (userId) => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }
    
    try {
      setProcessing(true)
      const res = await axios.put(`/api/admin/kyc/${userId}/reject`, { reason: rejectReason }, getAuthHeader())
      if (res.data.success) {
        alert('KYC rejected')
        setShowDetailModal(false)
        setSelectedUser(null)
        setRejectReason('')
        fetchKycList()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error rejecting KYC')
    } finally {
      setProcessing(false)
    }
  }

  const handleReset = async (userId) => {
    if (!window.confirm('Reset KYC? User will need to resubmit documents.')) return
    
    try {
      setProcessing(true)
      const res = await axios.put(`/api/admin/kyc/${userId}/reset`, {}, getAuthHeader())
      if (res.data.success) {
        alert('KYC reset successfully')
        setShowDetailModal(false)
        setSelectedUser(null)
        fetchKycList()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error resetting KYC')
    } finally {
      setProcessing(false)
    }
  }

  const viewDetails = async (userId) => {
    try {
      const res = await axios.get(`/api/admin/kyc/${userId}`, getAuthHeader())
      if (res.data.success) {
        setSelectedUser(res.data.data)
        setShowDetailModal(true)
      }
    } catch (error) {
      alert('Error fetching user details')
    }
  }

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">KYC Management</h1>
          <p className="text-gray-400 text-sm mt-1">Review and approve user verification requests</p>
        </div>
        <button
          onClick={fetchKycList}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div 
          className={`p-4 rounded-xl cursor-pointer transition-all ${filterStatus === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}
          onClick={() => setFilterStatus('pending')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-500 text-sm">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">{counts.pending}</p>
            </div>
            <Clock className="text-yellow-500" size={24} />
          </div>
        </div>
        <div 
          className={`p-4 rounded-xl cursor-pointer transition-all ${filterStatus === 'approved' ? 'ring-2 ring-green-500' : ''}`}
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
          onClick={() => setFilterStatus('approved')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-500 text-sm">Approved</p>
              <p className="text-2xl font-bold text-green-400">{counts.approved}</p>
            </div>
            <Check className="text-green-500" size={24} />
          </div>
        </div>
        <div 
          className={`p-4 rounded-xl cursor-pointer transition-all ${filterStatus === 'rejected' ? 'ring-2 ring-red-500' : ''}`}
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          onClick={() => setFilterStatus('rejected')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-500 text-sm">Rejected</p>
              <p className="text-2xl font-bold text-red-400">{counts.rejected}</p>
            </div>
            <X className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      {/* KYC List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : kycList.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-xl">
          <FileText size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No KYC Requests</h3>
          <p className="text-gray-400">No {filterStatus} KYC requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {kycList.map((user) => (
            <div 
              key={user._id}
              className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                    <User size={20} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      ID: {user.kycDocuments?.idType?.replace('_', ' ')} • 
                      Submitted: {user.kycDocuments?.submittedAt ? new Date(user.kycDocuments.submittedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[user.kycStatus]}`}>
                    {user.kycStatus}
                  </span>
                  <button
                    onClick={() => viewDetails(user._id)}
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">KYC Details</h2>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedUser(null); setRejectReason('') }}
                className="p-2 rounded-lg hover:bg-gray-700 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Full Name</label>
                  <p className="text-white font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Email</label>
                  <p className="text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Phone</label>
                  <p className="text-white">{selectedUser.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Country</label>
                  <p className="text-white">{selectedUser.country || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Date of Birth</label>
                  <p className="text-white">
                    {selectedUser.dateOfBirth ? new Date(selectedUser.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedUser.kycStatus]}`}>
                    {selectedUser.kycStatus}
                  </span>
                </div>
              </div>

              {/* ID Details */}
              <div className="p-4 rounded-xl bg-gray-900">
                <h3 className="text-sm font-medium text-white mb-3">ID Document</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">ID Type</label>
                    <p className="text-white capitalize">{selectedUser.kycDocuments?.idType?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">ID Number</label>
                    <p className="text-white">{selectedUser.kycDocuments?.idNumber}</p>
                  </div>
                </div>
              </div>

              {/* Document Images */}
              <div>
                <h3 className="text-sm font-medium text-white mb-3">Uploaded Documents</h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedUser.kycDocuments?.idFrontImage && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">ID Front</label>
                      <img 
                        src={selectedUser.kycDocuments.idFrontImage} 
                        alt="ID Front" 
                        className="w-full h-40 object-cover rounded-lg border border-gray-700"
                      />
                    </div>
                  )}
                  {selectedUser.kycDocuments?.idBackImage && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">ID Back</label>
                      <img 
                        src={selectedUser.kycDocuments.idBackImage} 
                        alt="ID Back" 
                        className="w-full h-40 object-cover rounded-lg border border-gray-700"
                      />
                    </div>
                  )}
                  {selectedUser.kycDocuments?.selfieImage && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Selfie</label>
                      <img 
                        src={selectedUser.kycDocuments.selfieImage} 
                        alt="Selfie" 
                        className="w-full h-40 object-cover rounded-lg border border-gray-700"
                      />
                    </div>
                  )}
                  {selectedUser.kycDocuments?.addressProof && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Address Proof</label>
                      <img 
                        src={selectedUser.kycDocuments.addressProof} 
                        alt="Address Proof" 
                        className="w-full h-40 object-cover rounded-lg border border-gray-700"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection Reason (for rejected) */}
              {selectedUser.kycStatus === 'rejected' && selectedUser.kycDocuments?.rejectionReason && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400">
                    <strong>Rejection Reason:</strong> {selectedUser.kycDocuments.rejectionReason}
                  </p>
                </div>
              )}

              {/* Actions */}
              {selectedUser.kycStatus === 'pending' && (
                <div className="space-y-4">
                  {/* Reject Reason Input */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Rejection Reason (if rejecting)</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      className="w-full px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white resize-none focus:outline-none focus:border-red-500"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReject(selectedUser._id)}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                    >
                      <X size={18} />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedUser._id)}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                    >
                      <Check size={18} />
                      Approve
                    </button>
                  </div>
                </div>
              )}

              {/* Reset Button (for approved/rejected) */}
              {['approved', 'rejected'].includes(selectedUser.kycStatus) && (
                <button
                  onClick={() => handleReset(selectedUser._id)}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={18} />
                  Reset KYC (Allow Resubmission)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KycManagement
