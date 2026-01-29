import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  Edit2,
  Shield,
  TrendingUp,
  Clock,
  Zap,
  Music,
  AlertCircle,
  X,
  Lock,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useResizableColumns } from '../hooks/useResizableColumns'
import ResizableColumnHeader from '../components/ResizableColumnHeader'
import ConfirmationModal from '../components/ConfirmationModal'
import PermissionsModal from '../components/PermissionsModal'
import Toast from '../components/Toast'

const StaffManagement = () => {
  const navigate = useNavigate()
  const {
    getAllStaffMetrics,
    addStaff,
    updateStaffRole,
    removeStaff,
    updateStaffPermissions,
    tracks,
    getCognitiveLoad,
  } = useApp()
  const { staffProfile, isOwner, canViewMetrics, activeMembership, activeOrgId } = useAuth()
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState({ isOpen: false, staff: null })
  const [showRoleModal, setShowRoleModal] = useState({ isOpen: false, staff: null })
  const [showPermissionsModal, setShowPermissionsModal] = useState({ isOpen: false, staff: null })
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'Scout' })
  const { columnWidths, handleResize, getGridTemplate, minWidths } =
    useResizableColumns('staff-management')

  // Redirect if not Owner
  useEffect(() => {
    if (staffProfile && !isOwner) {
      navigate('/admin')
    }
  }, [staffProfile, isOwner, navigate])

  // Load staff metrics
  useEffect(() => {
    const loadStaff = async () => {
      if (isOwner && getAllStaffMetrics) {
        setLoading(true)
        const metrics = await getAllStaffMetrics()
        setStaffList(metrics)
        setLoading(false)
      }
    }
    loadStaff()
    const interval = setInterval(loadStaff, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [isOwner, getAllStaffMetrics])

  // Calculate advanced metrics for each staff member
  const calculateAdvancedMetrics = staff => {
    // Hit Rate: % of tracks that were advanced and eventually got signed
    // For now, we calculate based on all tracks in pipeline vs signed
    // In a full implementation, we'd track which staff member advanced each track
    const pipelineTracks = tracks.filter(
      t =>
        (t.column === 'second-listen' ||
          t.column === 'team-review' ||
          t.column === 'contracting' ||
          t.column === 'upcoming') &&
        !t.archived
    )
    const signedTracks = tracks.filter(t => t.contractSigned && !t.archived)
    const hitRate =
      pipelineTracks.length > 0
        ? ((signedTracks.length / pipelineTracks.length) * 100).toFixed(1)
        : '0.0'

    // Decision Velocity: Average time tracks stay in Inbox before being moved
    // Calculate based on tracks that have moved out of inbox
    const movedTracks = tracks.filter(
      t => t.column !== 'inbox' && t.movedToSecondListen && !t.archived
    )
    let avgDays = '0.0'
    if (movedTracks.length > 0) {
      const totalTime = movedTracks.reduce((sum, t) => {
        const createdAt = new Date(t.createdAt).getTime()
        const movedAt = new Date(t.movedToSecondListen).getTime()
        return sum + (movedAt - createdAt)
      }, 0)
      const avgTime = totalTime / movedTracks.length
      avgDays = (avgTime / (1000 * 60 * 60 * 24)).toFixed(1)
    }

    // Genre Specialty: Genre of tracks that were signed (most common)
    const genreCounts = {}
    signedTracks.forEach(t => {
      if (t.genre) {
        genreCounts[t.genre] = (genreCounts[t.genre] || 0) + 1
      }
    })
    const genreEntries = Object.entries(genreCounts)
    const genreSpecialty =
      genreEntries.length > 0
        ? genreEntries.reduce((a, b) => (a[1] > b[1] ? a : b), genreEntries[0])[0]
        : 'N/A'

    return {
      hitRate,
      decisionVelocity: avgDays,
      genreSpecialty,
    }
  }

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email) {
      setToast({
        isVisible: true,
        message: 'Please fill in name and email',
        type: 'error',
      })
      return
    }

    // Check if user is Owner
    if (activeMembership?.role !== 'Owner') {
      setToast({
        isVisible: true,
        message: 'Only Owners can invite staff members',
        type: 'error',
      })
      return
    }

    const { data, error } = await addStaff(newStaff.name, newStaff.email, newStaff.role)
    if (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Error adding staff member',
        type: 'error',
      })
    } else {
      setToast({
        isVisible: true,
        message: 'Staff member added successfully',
        type: 'success',
      })
      setShowAddModal(false)
      setNewStaff({ name: '', email: '', role: 'Scout' })
      // Refresh staff list
      const metrics = await getAllStaffMetrics()
      setStaffList(metrics)
    }
  }

  const handleDeleteStaff = async () => {
    if (!showDeleteModal.staff) return

    const { error } = await removeStaff(showDeleteModal.staff.id)
    if (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Error removing staff member',
        type: 'error',
      })
    } else {
      setToast({
        isVisible: true,
        message: 'Staff member removed successfully',
        type: 'success',
      })
      setShowDeleteModal({ isOpen: false, staff: null })
      // Refresh staff list
      const metrics = await getAllStaffMetrics()
      setStaffList(metrics)
    }
  }

  const handleUpdateRole = async newRole => {
    if (!showRoleModal.staff) return

    const { error } = await updateStaffRole(showRoleModal.staff.id, newRole)
    if (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Error updating role',
        type: 'error',
      })
    } else {
      setToast({
        isVisible: true,
        message: 'Role updated successfully',
        type: 'success',
      })
      setShowRoleModal({ isOpen: false, staff: null })
      // Refresh staff list
      const metrics = await getAllStaffMetrics()
      setStaffList(metrics)
    }
  }

  const handleSavePermissions = async permissions => {
    if (!showPermissionsModal.staff) return

    setIsUpdatingPermissions(true)
    const { error } = await updateStaffPermissions(showPermissionsModal.staff.id, permissions)
    setIsUpdatingPermissions(false)

    if (error) {
      setToast({
        isVisible: true,
        message: error.message || 'Error updating permissions',
        type: 'error',
      })
    } else {
      setToast({
        isVisible: true,
        message: 'Permissions updated successfully',
        type: 'success',
      })
      setShowPermissionsModal({ isOpen: false, staff: null })
      // Refresh staff list
      const metrics = await getAllStaffMetrics()
      setStaffList(metrics)
    }
  }

  const getFatigueColor = cognitiveLoad => {
    if (!cognitiveLoad) return 'gray'
    const color = cognitiveLoad.overallColor || 'green'
    return color === 'green'
      ? 'green'
      : color === 'blue'
        ? 'blue'
        : color === 'yellow' || color === 'orange'
          ? 'yellow'
          : 'red'
  }

  const getFatigueStatus = cognitiveLoad => {
    if (!cognitiveLoad) return 'N/A'
    return cognitiveLoad.overallStatus || 'Optimal'
  }

  if (!isOwner) {
    return null
  }

  const gridTemplate = getGridTemplate() || '200px 120px 100px 120px 120px 150px 120px 200px'

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={e => {
              e.preventDefault()
              navigate('/admin')
            }}
            className="p-2 hover:bg-gray-900/50 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <h1 className="text-3xl font-bold text-white">Staff Management</h1>
        </div>
        <motion.button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-semibold flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={18} />
          Add Staff
        </motion.button>
      </div>

      {/* Staff Table */}
      <div className="flex-1 overflow-auto">
        <div className="bg-gray-900/30 rounded-lg border border-gray-800/50 overflow-hidden">
          {/* Table Header */}
          <div
            className="grid gap-4 items-center text-sm font-semibold text-gray-400 uppercase tracking-wider py-2 px-4 border-b border-gray-800/50 bg-gray-900/50 text-left"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <ResizableColumnHeader
              onResize={width => handleResize(0, width)}
              minWidth={minWidths[0] || 150}
            >
              <span className="text-left">Name</span>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={width => handleResize(1, width)}
              minWidth={minWidths[1] || 100}
            >
              <span className="text-left">Role</span>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={width => handleResize(2, width)}
              minWidth={minWidths[2] || 80}
            >
              <span className="text-left">Hit Rate</span>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={width => handleResize(3, width)}
              minWidth={minWidths[3] || 100}
            >
              <span className="text-left">Decision Velocity</span>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={width => handleResize(4, width)}
              minWidth={minWidths[4] || 100}
            >
              <span className="text-left">Fatigue Status</span>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={width => handleResize(5, width)}
              minWidth={minWidths[5] || 120}
            >
              <span className="text-left">Genre Specialty</span>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={width => handleResize(6, width)}
              minWidth={minWidths[6] || 100}
            >
              <span className="text-left">Weekly Listens</span>
            </ResizableColumnHeader>
            <ResizableColumnHeader
              onResize={width => handleResize(7, width)}
              minWidth={minWidths[7] || 150}
              isLast={true}
            >
              <span className="text-left">Actions</span>
            </ResizableColumnHeader>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-800/50">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                <Users className="mx-auto mb-2 animate-spin" size={24} />
                <p>Loading staff metrics...</p>
              </div>
            ) : staffList.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Users className="mx-auto mb-2" size={24} />
                <p>No staff members found</p>
              </div>
            ) : (
              staffList.map(staff => {
                const advancedMetrics = calculateAdvancedMetrics(staff)
                const fatigueColor = getFatigueColor(staff.cognitiveLoad)
                const fatigueStatus = getFatigueStatus(staff.cognitiveLoad)

                return (
                  <motion.div
                    key={staff.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-4 items-center text-sm py-2 px-4 hover:bg-gray-900/40 transition-colors text-left"
                    style={{ gridTemplateColumns: gridTemplate }}
                  >
                    {/* Name */}
                    <div className="flex items-center gap-2 text-left">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          staff.isOnline ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                      />
                      <span className="text-white font-semibold truncate">{staff.name}</span>
                    </div>

                    {/* Role */}
                    <div className="flex items-center gap-2 text-left">
                      <button
                        onClick={() => setShowRoleModal({ isOpen: true, staff })}
                        className="px-2 py-1 bg-gray-800/50 hover:bg-gray-800 text-gray-300 rounded text-xs font-semibold flex items-center gap-1"
                      >
                        <Edit2 size={12} />
                        {staff.role}
                      </button>
                    </div>

                    {/* Hit Rate */}
                    <div className="text-white text-left">
                      {canViewMetrics() ? (
                        `${advancedMetrics.hitRate}%`
                      ) : (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Lock size={12} />
                          <span className="text-xs">Restricted</span>
                        </div>
                      )}
                    </div>

                    {/* Decision Velocity */}
                    <div className="text-white flex items-center gap-1 text-left">
                      {canViewMetrics() ? (
                        <>
                          <Clock size={14} className="text-gray-400 flex-shrink-0" />
                          <span>{advancedMetrics.decisionVelocity}d</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Lock size={12} />
                          <span className="text-xs">Restricted</span>
                        </div>
                      )}
                    </div>

                    {/* Fatigue Status */}
                    <div className="flex items-center gap-2 text-left">
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          fatigueColor === 'green'
                            ? 'bg-green-500'
                            : fatigueColor === 'blue'
                              ? 'bg-blue-500'
                              : fatigueColor === 'yellow'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          fatigueColor === 'green'
                            ? 'text-green-400'
                            : fatigueColor === 'blue'
                              ? 'text-blue-400'
                              : fatigueColor === 'yellow'
                                ? 'text-yellow-400'
                                : 'text-red-400'
                        }`}
                      >
                        {fatigueStatus}
                      </span>
                    </div>

                    {/* Genre Specialty */}
                    <div className="text-white flex items-center gap-1 text-left">
                      <Music size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{advancedMetrics.genreSpecialty}</span>
                    </div>

                    {/* Weekly Listens */}
                    <div className="text-white text-left">{staff.weeklyListens || 0}</div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 text-left">
                      <button
                        onClick={() => setShowPermissionsModal({ isOpen: true, staff })}
                        className="p-2 hover:bg-gray-800/50 text-gray-400 rounded transition-colors"
                        title="Edit Permissions"
                      >
                        <Shield size={16} />
                      </button>
                      {staff.id !== staffProfile?.id && (
                        <button
                          onClick={() => setShowDeleteModal({ isOpen: true, staff })}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                          title="Remove Staff"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Add Staff Member</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded text-white"
                  placeholder="Staff member name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={newStaff.email}
                  onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded text-white"
                  placeholder="staff@label.com"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Role</label>
                <select
                  value={newStaff.role}
                  onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded text-white"
                >
                  <option value="Scout">Scout</option>
                  <option value="Manager">Manager</option>
                  <option value="Owner">Owner</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddStaff}
                className="flex-1 px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 rounded text-white font-semibold"
              >
                Add Staff
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700 rounded text-gray-300"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal.isOpen}
        onClose={() => setShowDeleteModal({ isOpen: false, staff: null })}
        onConfirm={handleDeleteStaff}
        action="delete"
        track={{ title: showDeleteModal.staff?.name || 'this staff member' }}
        message="Are you sure you want to remove this staff member? Historical data will be preserved."
      />

      {/* Permissions Modal */}
      <PermissionsModal
        isOpen={showPermissionsModal.isOpen}
        onClose={() => setShowPermissionsModal({ isOpen: false, staff: null })}
        staff={showPermissionsModal.staff}
        onSave={handleSavePermissions}
        isUpdating={isUpdatingPermissions}
      />

      {/* Role Update Modal */}
      {showRoleModal.isOpen && showRoleModal.staff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Update Role</h2>
              <button
                onClick={() => setShowRoleModal({ isOpen: false, staff: null })}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-400 mb-4">Update role for {showRoleModal.staff.name}</p>
            <div className="space-y-2">
              {['Scout', 'Manager', 'Owner'].map(role => (
                <button
                  key={role}
                  onClick={() => handleUpdateRole(role)}
                  className={`w-full px-4 py-2 rounded text-left transition-colors ${
                    showRoleModal.staff.role === role
                      ? 'bg-gray-800 border border-gray-700 text-white'
                      : 'bg-gray-900/50 border border-gray-700 text-gray-300 hover:bg-gray-900/70'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRoleModal({ isOpen: false, staff: null })}
              className="w-full mt-4 px-4 py-2 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700 rounded text-gray-300"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  )
}

export default StaffManagement
