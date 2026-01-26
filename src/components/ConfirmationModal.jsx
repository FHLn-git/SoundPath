import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

const ConfirmationModal = ({ isOpen, onClose, onConfirm, track, action, destination, isCriticalStage, requireRejectionReason = true }) => {
  const [rejectionReason, setRejectionReason] = useState('')
  
  useEffect(() => {
    if (!isOpen) {
      setRejectionReason('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const getActionText = () => {
    if (action === 'advance') {
      return `Advance to ${destination}`
    }
    if (action === 'uncheck') {
      return 'Uncheck Contract Signed'
    }
    return 'Archive/Reject'
  }

  const getDestinationText = () => {
    if (action === 'advance') {
      return destination
    }
    if (action === 'uncheck') {
      return 'This will mark the contract as unsigned'
    }
    return 'Archive'
  }

  // Determine if this is a critical stage (Team Review, Contracting, Upcoming)
  const criticalStage = isCriticalStage === true || (track?.column && ['team-review', 'contracting', 'upcoming'].includes(track.column))

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`bg-gray-900 rounded-lg p-6 w-full max-w-md border-2 backdrop-blur-sm ${
              criticalStage && action === 'reject'
                ? 'border-red-500/80'
                : 'border-gray-800'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${
                  criticalStage && action === 'reject'
                    ? 'bg-red-500/20'
                    : 'bg-yellow-500/20'
                }`}>
                  <AlertTriangle size={24} className={
                    criticalStage && action === 'reject'
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  } />
                </div>
                <h2 className={`text-2xl font-bold ${
                  criticalStage && action === 'reject'
                    ? 'text-red-400'
                    : 'text-white'
                }`}>
                  {criticalStage && action === 'reject' ? '⚠️ ARE YOU SURE??' : 'Confirm Action'}
                </h2>
                <button
                  onClick={onClose}
                  className="ml-auto p-2 hover:bg-recording-red/20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Critical Stage Warning Box */}
              {criticalStage && action === 'reject' && (
                <div className="mb-4 p-4 bg-red-500/20 border-2 border-red-500/60 rounded-lg">
                  <p className="text-red-400 font-bold text-lg mb-2">⚠️ CRITICAL BUSINESS STAGE</p>
                  <p className="text-red-300 text-sm">
                    You are about to reject a track in a <strong>vital business stage</strong>. This action will move the track to Archive and cannot be easily undone.
                  </p>
                </div>
              )}

              <div className="mb-6 space-y-3">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Track</p>
                  <p className="text-white font-semibold">{track?.artist} - {track?.title}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Action</p>
                  <p className={`font-semibold ${
                    criticalStage && action === 'reject'
                      ? 'text-red-400'
                      : 'text-gray-300'
                  }`}>
                    {getActionText()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Destination</p>
                  <p className="text-white font-semibold">{getDestinationText()}</p>
                </div>
                
                {/* Rejection Reason Input */}
                {action === 'reject' && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">
                      Rejection Reason
                      {requireRejectionReason && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder={requireRejectionReason ? "Please provide a reason for rejection (minimum 5 characters)" : "Optional: Provide a reason for rejection"}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 font-mono text-sm"
                    />
                    {requireRejectionReason && rejectionReason.length > 0 && rejectionReason.length < 5 && (
                      <p className="text-red-400 text-xs mt-1">Reason must be at least 5 characters</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onConfirm(rejectionReason || null)
                    onClose()
                  }}
                  disabled={action === 'reject' && requireRejectionReason && rejectionReason.length < 5}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors font-semibold ${
                    action === 'reject' && requireRejectionReason && rejectionReason.length < 5
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : action === 'advance'
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : action === 'uncheck'
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : criticalStage && action === 'reject'
                      ? 'bg-red-600 hover:bg-red-700 text-white border-2 border-red-500'
                      : 'bg-recording-red hover:bg-red-600 text-white'
                  }`}
                >
                  {criticalStage && action === 'reject' ? 'YES, REJECT' : 'Confirm'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ConfirmationModal
