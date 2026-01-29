import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const AddDemoModal = ({ isOpen, onClose, onAdd, vibeTags }) => {
  const [formData, setFormData] = useState({
    artist: '',
    title: '',
    link: '',
    genre: vibeTags[0],
    bpm: 128,
  })

  const handleSubmit = e => {
    e.preventDefault()
    if (formData.artist && formData.title) {
      onAdd(formData)
      setFormData({
        artist: '',
        title: '',
        link: '',
        genre: vibeTags[0],
        bpm: 128,
      })
    }
  }

  const handleChange = e => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border-2 border-gray-800 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Add New Demo</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-recording-red/20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Artist Name *
                  </label>
                  <input
                    type="text"
                    name="artist"
                    value={formData.artist}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg focus:outline-none focus:border-gray-700 text-white"
                    placeholder="Enter artist name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Track Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg focus:outline-none focus:border-gray-700 text-white"
                    placeholder="Enter track title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                  <select
                    name="genre"
                    value={formData.genre}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg focus:outline-none focus:border-gray-700 text-white"
                  >
                    {vibeTags.map(genre => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Demo Link</label>
                  <input
                    type="url"
                    name="link"
                    value={formData.link}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg focus:outline-none focus:border-gray-700 text-white"
                    placeholder="https://soundcloud.com/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">BPM</label>
                  <input
                    type="number"
                    name="bpm"
                    value={formData.bpm}
                    onChange={handleChange}
                    min="60"
                    max="200"
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg focus:outline-none focus:border-gray-700 text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors font-semibold text-white"
                  >
                    Add Demo
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default AddDemoModal
