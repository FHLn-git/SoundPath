import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, ArrowRight } from 'lucide-react'
import ComingSoonModal from '../components/ComingSoonModal'

/**
 * Placeholder page for Venue and Artist apps. Auto-shows Coming Soon modal;
 * user can go to Label or close.
 */
export default function ComingSoonApp({ appName = 'Venue' }) {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(true)

  useEffect(() => {
    setModalOpen(true)
  }, [appName])

  return (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center p-6">
      <ComingSoonModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        appName={appName}
        returnPath="/app/label/launchpad"
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-neon-purple to-recording-red mb-4">
          <Zap size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">SoundPath {appName}</h1>
        <p className="text-gray-400 text-sm mb-6">
          This module is coming soon. Use the Label app to manage your A&R pipeline today.
        </p>
        <button
          onClick={() => navigate('/app/label/launchpad')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-neon-purple to-recording-red text-white hover:opacity-90 transition-opacity"
        >
          Go to Label
          <ArrowRight size={18} />
        </button>
      </motion.div>
    </div>
  )
}
