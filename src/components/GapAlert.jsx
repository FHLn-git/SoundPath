import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useGapDetection } from '../hooks/useGapDetection'
import { useApp } from '../context/AppContext'
import { motion } from 'framer-motion'

const GapAlert = () => {
  const { hasGaps, gapMonths, loading } = useGapDetection()
  const { tracks } = useApp()
  const navigate = useNavigate()

  // Don't render if no gaps or still loading
  if (loading || !hasGaps) {
    return null
  }

  // Generate dynamic message based on number of gaps
  const getMessage = () => {
    if (gapMonths.length === 1) {
      return `⚠️ SCHEDULE ALERT: No releases planned for ${gapMonths[0]}. Gap detected in pipeline.`
    } else if (gapMonths.length === 2) {
      return `⚠️ CRITICAL GAP: No releases scheduled for ${gapMonths[0]} or ${gapMonths[1]}. Algorithmic health at risk.`
    } else {
      return `⚠️ CRITICAL GAP: No releases scheduled for ${gapMonths[0]}, ${gapMonths[1]}, or ${gapMonths[2]}. Algorithmic health at risk.`
    }
  }

  const handleFillGap = () => {
    // Smart navigation: Check phases in priority order
    // Priority: Contracting -> The Office (team-review) -> Second Listen -> Inbox -> Artist Directory
    
    const phasePriority = [
      { id: 'contracting', route: '/phase/contracting' },
      { id: 'team-review', route: '/phase/team-review' },
      { id: 'second-listen', route: '/phase/second-listen' },
      { id: 'inbox', route: '/phase/inbox' },
    ]

    // Find the first phase that has tracks
    for (const phase of phasePriority) {
      const phaseTracks = tracks.filter(
        (t) => t.column === phase.id && !t.archived
      )
      
      if (phaseTracks.length > 0) {
        // Navigate to the phase that has tracks
        navigate(phase.route)
        return
      }
    }

    // If all phases are empty, navigate to Artist Directory with conversion rate filter
    navigate('/artists', { 
      state: { 
        sortBy: 'conversion-high',
        autoFilter: true 
      } 
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full mb-6"
    >
      <div className="bg-gray-900/80 backdrop-blur-sm border-2 border-amber-500/60 rounded-lg p-4 flex items-center justify-between gap-4 shadow-lg shadow-amber-500/10">
        <div className="flex items-center gap-3 flex-1">
          <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />
          <p className="text-sm font-mono text-gray-200 flex-1">
            {getMessage()}
          </p>
        </div>
        <button
          onClick={handleFillGap}
          className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded-lg flex items-center gap-2 transition-all duration-200 text-amber-400 font-mono text-sm whitespace-nowrap"
        >
          Fill Gap
          <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  )
}

export default GapAlert
