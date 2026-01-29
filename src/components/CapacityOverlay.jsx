import { X, ArrowRight, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const CapacityOverlay = ({
  isOpen,
  onClose,
  currentCount = 0,
  maxCount = 0,
  tier = 'free',
  featureName = 'tracks',
}) => {
  const navigate = useNavigate()

  if (!isOpen) return null

  const tierDisplayName =
    {
      free: 'Free',
      agent: 'Agent',
      starter: 'Starter',
      pro: 'Pro',
    }[tier] || 'Free'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="relative bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-full mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Capacity Reached</h2>
            <p className="text-gray-400 mb-4">
              You are currently using{' '}
              <span className="text-white font-semibold">{currentCount}</span> of your{' '}
              <span className="text-white font-semibold">{maxCount}</span> {tierDisplayName} tier{' '}
              {featureName} limit.
            </p>
            <p className="text-gray-500 text-sm">Upgrade to expand your SoundPath.</p>
          </div>

          {/* Usage Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Usage</span>
              <span>
                {currentCount} / {maxCount}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (currentCount / maxCount) * 100)}%` }}
                className="bg-gradient-to-r from-orange-600 to-red-600 h-2.5 rounded-full"
              />
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-300 text-sm">Higher track limits</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-300 text-sm">More label ownership</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-300 text-sm">Advanced features</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 font-medium transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={() => {
                navigate('/billing')
                onClose()
              }}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
            >
              Upgrade Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CapacityOverlay
