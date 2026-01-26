import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, X } from 'lucide-react'

const ReviseModal = ({ isOpen, onClose, track, onSubmit }) => {
  const [issue, setIssue] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [wholeSong, setWholeSong] = useState(false)
  const [explanation, setExplanation] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setIssue('')
      setTimestamp('')
      setWholeSong(false)
      setExplanation('')
    }
  }, [isOpen])

  const canSubmit = issue.trim() && (wholeSong || timestamp.trim()) && explanation.trim()

  const generateRevisionPdf = (data) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    const safe = (value) => String(value || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const html = `
      <html>
        <head>
          <title>Revision PDF</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 12px; }
            .section { margin-bottom: 16px; }
            .label { font-weight: bold; margin-bottom: 4px; }
            .value { white-space: pre-wrap; }
            .meta { color: #475569; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>SoundPath Revision Report</h1>
          <div class="meta">Generated: ${new Date().toLocaleString()}</div>
          <div class="section">
            <div class="label">Track</div>
            <div class="value">${safe(track?.artist)} - ${safe(track?.title)}</div>
          </div>
          <div class="section">
            <div class="label">Issue</div>
            <div class="value">${safe(data.issue)}</div>
          </div>
          <div class="section">
            <div class="label">Timestamp</div>
            <div class="value">${safe(data.timestamp)}</div>
          </div>
          <div class="section">
            <div class="label">Explanation</div>
            <div class="value">${safe(data.explanation)}</div>
          </div>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    const payload = {
      issue,
      timestamp: wholeSong ? 'Whole song' : timestamp,
      wholeSong,
      explanation,
    }
    generateRevisionPdf(payload)
    onSubmit(track, payload)
    onClose()
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
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <FileText size={24} className="text-yellow-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Revise Track</h2>
                <button
                  onClick={onClose}
                  className="ml-auto p-2 hover:bg-recording-red/20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">Track</p>
                <p className="text-white font-semibold">
                  {track?.artist} - {track?.title}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Issue *</label>
                  <input
                    type="text"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    placeholder="e.g. Mix imbalance, arrangement, vocals"
                    className="w-full px-4 py-2 bg-gray-900/50 border border-neon-purple/30 rounded-lg focus:outline-none focus:border-neon-purple text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Timestamp *</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={timestamp}
                      onChange={(e) => setTimestamp(e.target.value)}
                      placeholder="mm:ss"
                      disabled={wholeSong}
                      className="flex-1 px-4 py-2 bg-gray-900/50 border border-neon-purple/30 rounded-lg focus:outline-none focus:border-neon-purple text-white placeholder-gray-500 disabled:opacity-50"
                    />
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wholeSong}
                        onChange={(e) => setWholeSong(e.target.checked)}
                        className="rounded"
                      />
                      Whole song
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Explanation *
                  </label>
                  <textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Explain the issue and suggested changes..."
                    rows={5}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-neon-purple/30 rounded-lg focus:outline-none focus:border-neon-purple text-white placeholder-gray-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors font-semibold ${
                    canSubmit
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Generate Revision PDF
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ReviseModal
