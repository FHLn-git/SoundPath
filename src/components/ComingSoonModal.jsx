import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, ArrowRight } from 'lucide-react'

/**
 * Alpha "Coming Soon" modal for Venue and Artist modules.
 * Shown when user clicks Venue or Artist in the App Switcher.
 */
export default function ComingSoonModal({ isOpen, onClose, appName = 'Venue', returnPath = '/app/label/launchpad' }) {
  const navigate = useNavigate()

  const handleGoToLabel = () => {
    onClose?.()
    navigate(returnPath)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md mx-4"
          >
            <div
              className="bg-[#0B0E14] border border-amber-400/40 rounded-xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-gradient-to-br from-amber-500/10 via-[#0B0E14] to-[#0B0E14] p-6">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-[10px] font-bold tracking-widest uppercase">
                    Coming Soon
                  </span>
                  <span className="text-xs text-gray-500 font-mono">ALPHA</span>
                </div>
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-neon-purple to-recording-red mb-4">
                  <Zap size={28} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white text-center mb-2">
                  SoundPath {appName}
                </h2>
                <p className="text-gray-400 text-sm text-center mb-6">
                  The {appName} module is in development. You’ll be the first to know when it’s ready. Until then, use the Label app to manage your A&R pipeline.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleGoToLabel}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold bg-gradient-to-r from-neon-purple to-recording-red text-white hover:opacity-90 transition-opacity"
                  >
                    Go to Label
                    <ArrowRight size={18} />
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 rounded-lg font-semibold border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
