import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X } from 'lucide-react'

const ReleaseSetupModal = ({ isOpen, onClose, onConfirm, track }) => {
  const [targetReleaseDate, setTargetReleaseDate] = useState('')
  const [isDateValid, setIsDateValid] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setTargetReleaseDate('')
      setIsDateValid(false)
    }
  }, [isOpen])

  const handleDateChange = (e) => {
    const date = e.target.value
    setTargetReleaseDate(date)
    if (date) {
      const selectedDate = new Date(date)
      selectedDate.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      setIsDateValid(selectedDate >= today)
    } else {
      setIsDateValid(false)
    }
  }

  const handleConfirm = () => {
    if (isDateValid && targetReleaseDate) {
      onConfirm(track, targetReleaseDate)
      onClose()
    }
  }

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
            <div className="glass-morphism rounded-lg p-6 w-full max-w-md border-2 border-neon-purple/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-neon-purple/20 rounded-lg">
                  <Calendar size={24} className="text-neon-purple" />
                </div>
                <h2 className="text-2xl font-bold text-white">Release Setup</h2>
                <button
                  onClick={onClose}
                  className="ml-auto p-2 hover:bg-recording-red/20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="mb-6 space-y-3">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Track</p>
                  <p className="text-white font-semibold">
                    {track?.artist} - {track?.title}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-2">Target Release Date *</p>
                  <input
                    type="date"
                    value={targetReleaseDate}
                    onChange={handleDateChange}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-neon-purple/30 rounded-lg focus:outline-none focus:border-neon-purple text-white"
                  />
                  {!isDateValid && targetReleaseDate && (
                    <p className="text-xs text-recording-red mt-2">
                      Release date must be today or later.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!isDateValid}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors font-semibold ${
                    isDateValid
                      ? 'bg-neon-purple hover:bg-neon-purple/80 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Confirm Advance
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ReleaseSetupModal
