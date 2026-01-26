import { AlertCircle, X } from 'lucide-react'
import { useUsageLimits } from '../hooks/useUsageLimits'
import { Link } from 'react-router-dom'
import { useState } from 'react'

const UsageLimitAlert = ({ limitType, onDismiss }) => {
  const { getLimitMessage, isAtLimit } = useUsageLimits()
  const [dismissed, setDismissed] = useState(false)
  const message = getLimitMessage(limitType)
  const atLimit = isAtLimit(limitType)

  if (dismissed || !message || !atLimit) return null

  const handleDismiss = () => {
    setDismissed(true)
    if (onDismiss) onDismiss()
  }

  return (
    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-4 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-yellow-400 hover:text-yellow-300"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-yellow-400 mb-1">Usage Limit Reached</div>
          <div className="text-sm text-gray-300 mb-2">{message}</div>
          <Link
            to="/billing"
            className="text-sm text-yellow-400 hover:text-yellow-300 underline"
          >
            Upgrade your plan →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default UsageLimitAlert
