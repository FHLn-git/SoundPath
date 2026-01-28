import { Sparkles, ArrowRight, Crown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const PremiumOverlay = ({
  featureName = 'this feature',
  title,
  message,
  ctaLabel,
  ctaTo = '/billing',
}) => {
  const navigate = useNavigate()

  const resolvedTitle = title || 'Unlock the Agent Tier'
  const resolvedMessage =
    message ||
    'Start tracking your Pitches, Networking with peers, and building your Signed portfolio.'
  const resolvedCta = ctaLabel || 'Upgrade to SoundPath Pro'

  return (
    <div className="absolute inset-0 bg-[#0B0E14]/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md p-6"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full mb-4 border border-yellow-500/30">
          <Crown className="w-7 h-7 text-yellow-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{resolvedTitle}</h3>
        <p className="text-gray-400 text-sm mb-4 leading-relaxed">
          {resolvedMessage}
        </p>
        <button
          onClick={() => navigate(ctaTo)}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-semibold text-sm transition-all flex items-center gap-2 mx-auto shadow-lg shadow-blue-500/25"
        >
          {resolvedCta}
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  )
}

export default PremiumOverlay
