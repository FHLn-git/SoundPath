import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Music, Send, CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { validateEmail } from '../lib/emailValidation'

const DEFAULT_GENRES = ['Tech House', 'Deep House', 'Classic House', 'Piano House', 'Progressive House']

const PublicForm = () => {
  const { targetType, targetSlug } = useParams()
  const [targetInfo, setTargetInfo] = useState(null)
  const [availableGenres, setAvailableGenres] = useState(DEFAULT_GENRES)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  
  // Form state
  const [artistName, setArtistName] = useState('')
  const [email, setEmail] = useState('')
  const [trackTitle, setTrackTitle] = useState('')
  const [streamLink, setStreamLink] = useState('')
  const [primaryGenre, setPrimaryGenre] = useState('')
  const [bpm, setBpm] = useState('')
  const [shortNote, setShortNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')

  // Fetch target (organization or user) by slug
  useEffect(() => {
    const fetchTarget = async () => {
      if (!supabase || !targetType || !targetSlug) {
        setError('Invalid submission link')
        setLoading(false)
        return
      }

      try {
        if (targetType === 'label') {
          // Fetch organization by slug
          const { data, error: orgError } = await supabase
            .rpc('get_organization_by_slug', { slug_to_find: targetSlug })
            .single()

          if (orgError || !data) {
            setError('Label inbox not found')
            setLoading(false)
            return
          }

          const branding = data.branding_settings || {}
          const genres = branding.submission_genres || DEFAULT_GENRES
          
          setTargetInfo({
            type: 'label',
            id: data.id,
            name: data.name,
            slug: data.slug,
            branding: branding,
          })
          setAvailableGenres(genres)
        } else if (targetType === 'user') {
          // Use RPC function to lookup staff by slug (bypasses RLS)
          const { data: staffData, error: staffError } = await supabase
            .rpc('get_staff_by_slug', { slug_to_find: targetSlug })

          if (staffError) {
            console.error('Error looking up user by slug:', staffError)
            
            // Check if function doesn't exist
            if (staffError.message?.includes('Could not find the function') || 
                staffError.message?.includes('function') && staffError.message?.includes('not found')) {
              setError('Submission system not configured. Please contact the administrator to run the database migration.')
            } else {
              setError(`User inbox not found: ${staffError.message}`)
            }
            setLoading(false)
            return
          }

          if (!staffData || (Array.isArray(staffData) && staffData.length === 0)) {
            console.warn('No staff member found for slug:', targetSlug)
            setError('User inbox not found. Please check the submission URL.')
            setLoading(false)
            return
          }

          const staff = Array.isArray(staffData) ? staffData[0] : staffData
          setTargetInfo({
            type: 'user',
            id: staff.id,
            name: staff.name,
            slug: targetSlug,
          })
          // User submissions use default genres
          setAvailableGenres(DEFAULT_GENRES)
        } else {
          setError('Invalid submission type')
          setLoading(false)
          return
        }

        setLoading(false)
      } catch (err) {
        console.error('Error fetching target:', err)
        setError('Error loading submission form')
        setLoading(false)
      }
    }

    fetchTarget()
  }, [targetType, targetSlug])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    // Validation
    if (!artistName.trim()) {
      setError('Artist name is required')
      setIsSubmitting(false)
      return
    }
    
    // Validate email
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error)
      setError(emailValidation.error)
      setIsSubmitting(false)
      return
    }
    
    if (!trackTitle.trim()) {
      setError('Track title is required')
      setIsSubmitting(false)
      return
    }
    if (!streamLink.trim()) {
      setError('Stream link is required')
      setIsSubmitting(false)
      return
    }

    // Validate link is SoundCloud or Dropbox
    const linkLower = streamLink.trim().toLowerCase()
    const isValidLink = linkLower.includes('soundcloud.com') || 
                        linkLower.includes('dropbox.com') ||
                        linkLower.includes('dl.dropboxusercontent.com')
    
    if (!isValidLink) {
      setError('Only SoundCloud and Dropbox links are accepted')
      setIsSubmitting(false)
      return
    }
    if (!primaryGenre) {
      setError('Primary genre is required')
      setIsSubmitting(false)
      return
    }
    if (!bpm || isNaN(parseInt(bpm)) || parseInt(bpm) < 1 || parseInt(bpm) > 300) {
      setError('BPM must be a number between 1 and 300')
      setIsSubmitting(false)
      return
    }

    try {
      // 1. Check if artist exists, create if not
      let artistId = null
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('id')
        .ilike('name', artistName.trim())
        .limit(1)
        .single()

      if (existingArtist) {
        artistId = existingArtist.id
      } else {
        // Create new artist
        // Note: primary_genre is calculated internally by algorithm based on track submissions
        // Do not set it directly - it will be computed from the most consistent genres across all tracks
        const { data: newArtist, error: artistError } = await supabase
          .from('artists')
          .insert({
            name: artistName.trim(),
            organization_id: targetInfo.type === 'label' ? targetInfo.id : null,
          })
          .select('id')
          .single()

        if (artistError) {
          throw new Error(`Failed to create artist: ${artistError.message}`)
        }
        artistId = newArtist.id
      }

      // 2. Create track
      const trackData = {
        artist_id: artistId,
        artist_name: artistName.trim(),
        title: trackTitle.trim(),
        sc_link: streamLink.trim(),
        genre: primaryGenre,
        bpm: parseInt(bpm),
        status: 'inbox',
        column: 'inbox',
        energy: 0,
        votes: 0,
        archived: false,
        source: 'public_form', // Tag as public form submission
      }

      // Set organization_id or recipient_user_id based on target type
      if (targetInfo.type === 'label') {
        trackData.organization_id = targetInfo.id
      } else {
        trackData.recipient_user_id = targetInfo.id
        trackData.organization_id = null
        trackData.crate = 'submissions' // Set crate for personal inbox submissions
      }

      // Add short note if provided (we can store this in a notes field or as part of title)
      if (shortNote.trim()) {
        // For now, we'll add it as a comment - you might want to add a notes field to tracks
        // trackData.notes = shortNote.trim()
      }

      const { error: trackError } = await supabase
        .from('tracks')
        .insert(trackData)

      if (trackError) {
        throw new Error(`Failed to submit track: ${trackError.message}`)
      }

      // Success!
      setSubmitted(true)
    } catch (err) {
      console.error('Submission error:', err)
      setError(err.message || 'Failed to submit demo. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading submission form...</p>
        </div>
      </div>
    )
  }

  if (error && !submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-gray-900/50 rounded-lg p-8 border border-red-500/30 backdrop-blur-sm"
        >
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Inbox Not Found</h1>
          <p className="text-gray-400 text-center">{error}</p>
        </motion.div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-gray-900/50 rounded-lg p-8 border border-gray-800 text-center backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-green-400" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-4">Demo Received</h1>
          <p className="text-gray-400 mb-6">
            Your submission has been sent to {targetInfo?.name || 'the inbox'}.
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-gray-500"
          >
            We'll review your track and get back to you soon.
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple to-recording-red mb-4"
          >
            <Music size={32} className="text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold mb-2 text-neon-purple">Submit Your Demo</h1>
          <p className="text-gray-400 text-sm">
            Send your track to {targetInfo?.name || 'the inbox'}
          </p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/50 rounded-lg p-8 border border-gray-800 backdrop-blur-sm"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Artist Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Artist Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-700 transition-all font-mono"
                placeholder="Your artist name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError('')
                  }}
                  onBlur={(e) => {
                    if (e.target.value) {
                      const validation = validateEmail(e.target.value)
                      if (!validation.valid) {
                        setEmailError(validation.error)
                      } else {
                        setEmailError('')
                      }
                    }
                  }}
                  required
                  className={`w-full pl-10 pr-4 py-3 bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all font-mono ${
                    emailError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-800 focus:border-gray-700 focus:ring-gray-700'
                  }`}
                  placeholder="your@email.com"
                />
              </div>
              {emailError && (
                <p className="mt-1 text-sm text-red-400">{emailError}</p>
              )}
            </div>

            {/* Track Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Track Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-700 transition-all font-mono"
                placeholder="Track name"
              />
            </div>

            {/* Stream Link */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stream Link <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={streamLink}
                onChange={(e) => setStreamLink(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-700 transition-all font-mono"
                placeholder="SoundCloud or Dropbox link"
              />
              <p className="text-xs text-gray-500 mt-1">Only SoundCloud and Dropbox links are accepted</p>
            </div>

            {/* Primary Genre & BPM Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Genre */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Primary Genre <span className="text-red-400">*</span>
                </label>
                <select
                  value={primaryGenre}
                  onChange={(e) => setPrimaryGenre(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-700 transition-all font-mono"
                >
                  <option value="">Select genre</option>
                  {availableGenres.map((genre) => (
                    <option key={genre} value={genre} className="bg-gray-950">
                      {genre}
                    </option>
                  ))}
                </select>
              </div>

              {/* BPM */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  BPM <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  required
                  min="1"
                  max="300"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-700 transition-all font-mono"
                  placeholder="128"
                />
              </div>
            </div>

            {/* Short Note */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Short Note <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <textarea
                value={shortNote}
                onChange={(e) => setShortNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-950/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all font-mono resize-none"
                placeholder="Any additional information about your track..."
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-800 hover:bg-gray-700"
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Send Demo</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 text-gray-500 text-xs"
        >
          <p>© 2024 SoundPath. All rights reserved.</p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default PublicForm
