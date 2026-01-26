import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Shield, Zap, ArrowRight, Eye, Calendar } from 'lucide-react'

const PermissionsModal = ({ isOpen, onClose, staff, onSave, isUpdating }) => {
  const [permissions, setPermissions] = useState({
    can_vote: true,
    can_set_energy: true,
    can_advance_lobby: true,
    can_advance_office: false,
    can_advance_contract: false,
    can_access_archive: true,
    can_access_vault: true,
    can_edit_release_date: false,
    can_view_metrics: false,
  })

  useEffect(() => {
    if (staff) {
      setPermissions({
        can_vote: staff.can_vote ?? true,
        can_set_energy: staff.can_set_energy ?? true,
        can_advance_lobby: staff.can_advance_lobby ?? true,
        can_advance_office: staff.can_advance_office ?? false,
        can_advance_contract: staff.can_advance_contract ?? false,
        can_access_archive: staff.can_access_archive ?? true,
        can_access_vault: staff.can_access_vault ?? true,
        can_edit_release_date: staff.can_edit_release_date ?? false,
        can_view_metrics: staff.can_view_metrics ?? false,
      })
    }
  }, [staff])

  const handleToggle = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSave = () => {
    onSave(permissions)
  }

  if (!isOpen || !staff) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-800/50 rounded-lg border border-gray-700">
              <Shield size={24} className="text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Permissions</h2>
              <p className="text-sm text-gray-400">{staff.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Evaluation Permissions */}
          <div className="border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Evaluation</h3>
            </div>
            <div className="space-y-3">
              <PermissionToggle
                label="Can Vote"
                description="Ability to Like/Dislike tracks"
                checked={permissions.can_vote}
                onChange={() => handleToggle('can_vote')}
              />
              <PermissionToggle
                label="Can Set Energy"
                description="Ability to set 1-5 energy levels"
                checked={permissions.can_set_energy}
                onChange={() => handleToggle('can_set_energy')}
              />
            </div>
          </div>

          {/* Advancement Permissions */}
          <div className="border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight size={18} className="text-green-400" />
              <h3 className="text-lg font-semibold text-white">Advancement</h3>
            </div>
            <div className="space-y-3">
              <PermissionToggle
                label="Can Advance to Lobby"
                description="Permission to move tracks from Inbox to Second Listen"
                checked={permissions.can_advance_lobby}
                onChange={() => handleToggle('can_advance_lobby')}
              />
              <PermissionToggle
                label="Can Advance to Office"
                description="Permission to move tracks from Second Listen to The Office"
                checked={permissions.can_advance_office}
                onChange={() => handleToggle('can_advance_office')}
              />
              <PermissionToggle
                label="Can Advance to Contract"
                description="Permission to move tracks from The Office to Contracting"
                checked={permissions.can_advance_contract}
                onChange={() => handleToggle('can_advance_contract')}
              />
            </div>
          </div>

          {/* Access Permissions */}
          <div className="border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={18} className="text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Access</h3>
            </div>
            <div className="space-y-3">
              <PermissionToggle
                label="Can Access Archive"
                description="Permission to view the Rejection Archive"
                checked={permissions.can_access_archive}
                onChange={() => handleToggle('can_access_archive')}
              />
              <PermissionToggle
                label="Can Access Vault"
                description="Permission to view released tracks in The Vault"
                checked={permissions.can_access_vault}
                onChange={() => handleToggle('can_access_vault')}
              />
              <PermissionToggle
                label="Can Edit Release Date"
                description="Permission to change calendar/scheduling data"
                checked={permissions.can_edit_release_date}
                onChange={() => handleToggle('can_edit_release_date')}
              />
            </div>
          </div>

          {/* View Sensitive Metrics */}
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/30">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Data Visibility</h3>
            </div>
            <PermissionToggle
              label="View Sensitive Metrics"
              description="Allows user to see ROI, Hit Rates, and advanced data aggregations"
              checked={permissions.can_view_metrics}
              onChange={() => handleToggle('can_view_metrics')}
              isEnterprise
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="flex-1 px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white font-semibold transition-colors"
          >
            {isUpdating ? 'Saving...' : 'Save Permissions'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700 rounded text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const PermissionToggle = ({ label, description, checked, onChange, isEnterprise = false }) => {
  return (
    <div className={`flex items-start justify-between p-3 rounded-lg ${
      isEnterprise ? 'bg-neon-purple/10 border border-neon-purple/30' : 'bg-gray-900/30'
    }`}>
      <div className="flex-1">
        <p className="text-white font-medium">{label}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </div>
      <motion.button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-green-500' : 'bg-gray-600'
        }`}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
          animate={{ x: checked ? 24 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.button>
    </div>
  )
}

export default PermissionsModal
