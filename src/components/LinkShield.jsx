import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { useApp } from '../context/AppContext'

const LinkShield = ({ url, trackId }) => {
  const [isValid, setIsValid] = useState(true)
  const { logListenEvent } = useApp()

  useEffect(() => {
    if (!url) {
      setIsValid(false)
      return
    }

    // Simple validation - check if it's a valid URL
    try {
      const urlObj = new URL(url)
      setIsValid(urlObj.protocol === 'http:' || urlObj.protocol === 'https:')
    } catch {
      setIsValid(false)
    }
  }, [url])

  if (!url) {
    return (
      <button
        disabled
        className="p-1.5 rounded border border-red-500/50 bg-red-500/10 cursor-not-allowed"
        title="No link"
      >
        <ExternalLink size={14} className="text-red-400" />
      </button>
    )
  }

  const handleClick = () => {
    if (trackId && isValid) {
      logListenEvent(trackId)
    }
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`p-1.5 rounded border transition-all duration-200 ${
        isValid
          ? 'border-green-500/50 bg-green-500/10 hover:bg-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
          : 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
      }`}
      title={isValid ? 'Open SoundCloud link' : 'Invalid link'}
    >
      <ExternalLink size={14} className={isValid ? 'text-green-400' : 'text-red-400'} />
    </a>
  )
}

export default LinkShield
