import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const TrialExpiredModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate()

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neon-purple/30 to-recording-red/30 border border-neon-purple/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-neon-purple" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-2">Your Pro Trial Has Ended</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                You’ve been returned to the Free tier. Your tracks are safe — if you’re over the Free limit,
                your workspace will stay locked until you upgrade or trim down to capacity.
              </p>
            </div>
          </div>

          <div className="mt-5 bg-gray-950/40 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-300 text-sm font-semibold mb-2">Pick Your Path</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/40">
                <div className="text-white font-semibold">Agent</div>
                <div className="text-gray-500 mt-0.5">Personal networking + pipeline tools</div>
              </div>
              <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/40">
                <div className="text-white font-semibold">Starter</div>
                <div className="text-gray-500 mt-0.5">Bigger capacity for growing teams</div>
              </div>
              <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/40">
                <div className="text-white font-semibold">Pro</div>
                <div className="text-gray-500 mt-0.5">Full power + highest limits</div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-200 font-medium transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={() => {
                navigate('/billing')
                onClose?.()
              }}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-neon-purple to-recording-red hover:opacity-90 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2"
            >
              Pick Your Path
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default TrialExpiredModal

