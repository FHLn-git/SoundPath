import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const AppContext = createContext()

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

const GENRES = ['Tech House', 'Deep House', 'Classic House', 'Piano House', 'Progressive House']

export const AppProvider = ({ children }) => {
  const { staffProfile, user, activeOrgId, activeMembership, isSystemAdmin } = useAuth()

  // Fallback if isSystemAdmin is not available yet
  const systemAdminCheck = isSystemAdmin || staffProfile?.role === 'SystemAdmin'
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  /** Label hierarchy: 'all' = parent + all subsidiaries, or specific org id for one subsidiary */
  const [subsidiaryFilter, setSubsidiaryFilter] = useState('all')
  const [cognitiveLoadCache, setCognitiveLoadCache] = useState({})
  const [companyHealthCache, setCompanyHealthCache] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState({
    status: 'checking', // 'checking', 'connected', 'error'
    message: null,
  })

  // Transform Supabase track to app format
  const transformTrack = (dbTrack, votes = []) => {
    const staffVotes = {}
    votes.forEach(vote => {
      staffVotes[vote.staff_id] = vote.vote_type
    })

    // Handle relational data - artists can come as an object or just use artist_name
    const artistName = dbTrack.artists?.name || dbTrack.artist_name || 'Unknown Artist'

    return {
      id: dbTrack.id,
      title: dbTrack.title,
      artist: artistName,
      genre: dbTrack.genre,
      bpm: dbTrack.bpm,
      energy: dbTrack.energy,
      column: dbTrack.status || dbTrack.column,
      votes: dbTrack.votes || 0,
      createdAt: new Date(dbTrack.created_at),
      movedToSecondListen: dbTrack.moved_to_second_listen
        ? new Date(dbTrack.moved_to_second_listen)
        : null,
      targetReleaseDate: dbTrack.target_release_date ? new Date(dbTrack.target_release_date) : null,
      releaseDate: dbTrack.release_date ? new Date(dbTrack.release_date) : null,
      link: dbTrack.sc_link || '',
      staffVotes,
      contractSigned: dbTrack.contract_signed || false,
      totalEarnings: parseFloat(dbTrack.total_earnings || 0),
      watched: dbTrack.watched || false,
      archived: dbTrack.archived || false,
      spotifyPlays: dbTrack.spotify_plays || 0,
      rejectionReason: dbTrack.rejection_reason || null,
      organizationId: dbTrack.organization_id || null,
      recipientUserId: dbTrack.recipient_user_id || null,
    }
  }

  // Transform app track to Supabase format
  const transformToDb = track => {
    return {
      artist_name: track.artist,
      title: track.title,
      sc_link: track.link,
      genre: track.genre,
      bpm: track.bpm,
      energy: track.energy,
      status: track.column,
      column: track.column, // Keep both for compatibility
      votes: track.votes,
      moved_to_second_listen: track.movedToSecondListen?.toISOString() || null,
      target_release_date: track.targetReleaseDate?.toISOString().split('T')[0] || null,
      release_date: track.releaseDate?.toISOString().split('T')[0] || null,
      contract_signed: track.contractSigned || false,
      total_earnings: track.totalEarnings || 0,
      watched: track.watched || false,
      archived: track.archived || false,
      spotify_plays: track.spotifyPlays || 0,
      rejection_reason: track.rejectionReason || null,
    }
  }

  // Test Supabase connection on app load
  useEffect(() => {
    const testConnection = async () => {
      if (!supabase) {
        setConnectionStatus({
          status: 'error',
          message: 'Supabase not configured',
        })
        return
      }

      try {
        setConnectionStatus({ status: 'checking', message: null })

        // Test connection with a simple count query
        const { count, error } = await supabase
          .from('tracks')
          .select('*', { count: 'exact', head: true })

        if (error) {
          // Handle specific error codes
          let errorMessage = 'Connection failed'
          if (error.code === 'PGRST116') {
            errorMessage = 'Tables not found - run schema.sql'
          } else if (error.code === '42501' || error.message?.includes('permission')) {
            errorMessage = '401 Unauthorized - check API key'
          } else if (
            error.message?.includes('Failed to fetch') ||
            error.message?.includes('Network')
          ) {
            errorMessage = 'Network error - check URL'
          } else {
            errorMessage = error.message || `Error: ${error.code || 'Unknown'}`
          }

          setConnectionStatus({
            status: 'error',
            message: errorMessage,
          })
        } else {
          setConnectionStatus({
            status: 'connected',
            message: null,
          })
        }
      } catch (error) {
        setConnectionStatus({
          status: 'error',
          message: error.message || 'Connection test failed',
        })
      }
    }

    testConnection()
  }, [])

  // Load tracks from Supabase (can be called manually for real-time updates)
  const loadTracks = async () => {
    let labelOrgIds = null // set in label workspace branch for use in votes query
    try {
      setLoading(true)

      // Check if Supabase is configured
      if (!supabase) {
        console.warn('Supabase not configured. Using empty tracks array.')
        console.warn('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file')
        setTracks([])
        setLoading(false)
        return
      }

      // Fetch tracks with relational join to artists table
      // Agent-Centric: Personal view (activeOrgId is null) loads Personal Inbox (organization_id IS NULL, recipient_user_id = user)
      // Label workspace (activeOrgId set) loads Label tracks (organization_id = activeOrgId)
      let tracksQuery = supabase.from('tracks').select(`
            *,
            artists (
              name
            )
          `)

      // SystemAdmin in global view sees all tracks
      if (systemAdminCheck && activeOrgId === null) {
        // Global view - no filter
      } else if (activeOrgId === null) {
        // Agent-Centric: Personal view - load Personal Inbox (owned by user, no organization)
        if (!staffProfile) {
          console.warn('⚠️ No staff profile. Cannot load personal inbox.')
          setTracks([])
          setLoading(false)
          return
        }
        tracksQuery = tracksQuery
          .is('organization_id', null)
          .eq('recipient_user_id', staffProfile.id)
      } else {
        // Label workspace - load Label tracks (optionally all sub-labels or one subsidiary)
        labelOrgIds = [activeOrgId]
        if (subsidiaryFilter === 'all') {
          const { data: hierarchyRows } = await supabase.rpc('get_org_hierarchy', {
            parent_org_id: activeOrgId,
          })
          labelOrgIds = hierarchyRows?.map(r => r.id) ?? [activeOrgId]
        } else {
          labelOrgIds = [subsidiaryFilter]
        }
        tracksQuery = tracksQuery.in('organization_id', labelOrgIds)
      }

      const { data: tracksData, error: tracksError } = await tracksQuery.order('created_at', {
        ascending: false,
      })

      if (tracksError) {
        const isAbort = tracksError.message?.includes('AbortError') || tracksError.message?.includes('aborted')
        if (!isAbort) {
          if (import.meta.env.DEV) {
            console.warn('Tracks fetch error:', tracksError.message)
          }
        }

        // If table doesn't exist, that's okay - just use empty array
        if (tracksError.code === 'PGRST116' || tracksError.message?.includes('does not exist')) {
          console.warn(
            'Tracks table does not exist yet. Please run database/schemas/master-schema.sql script.'
          )
          setTracks([])
          setLoading(false)
          return
        }
        if (isAbort) {
          setTracks([])
          setLoading(false)
          return
        }
        throw tracksError
      }

      // Fetch all votes (ignore errors if table doesn't exist)
      // Agent-Centric: Filter votes based on workspace context
      let votesQuery = supabase.from('votes').select('*')
      if (systemAdminCheck && activeOrgId === null) {
        // Global view - no filter
      } else if (activeOrgId === null) {
        // Personal view - votes for personal inbox tracks (organization_id IS NULL)
        votesQuery = votesQuery.is('organization_id', null)
      } else {
        // Label workspace - votes for label tracks (same org set as tracks when subsidiary filter)
        if (labelOrgIds && labelOrgIds.length > 0) {
          votesQuery = votesQuery.in('organization_id', labelOrgIds)
        } else {
          votesQuery = votesQuery.eq('organization_id', activeOrgId)
        }
      }
      const { data: votesData, error: votesError } = await votesQuery

      if (votesError) {
        // If votes table doesn't exist, that's okay - just use empty array
        if (votesError.code === 'PGRST116' || votesError.message?.includes('does not exist')) {
          console.warn('Votes table does not exist yet. Votes will be empty.')
        } else {
          throw votesError
        }
      }

      // Group votes by track_id
      const votesByTrack = {}
      votesData?.forEach(vote => {
        if (!votesByTrack[vote.track_id]) {
          votesByTrack[vote.track_id] = []
        }
        votesByTrack[vote.track_id].push(vote)
      })

      // Transform and combine
      const transformedTracks =
        tracksData?.map(track => transformTrack(track, votesByTrack[track.id] || [])) || []

      console.log(`✅ Loaded ${transformedTracks.length} tracks from Supabase`)
      setTracks(transformedTracks)
    } catch (error) {
      const isAbort = error?.message?.includes('AbortError') || error?.message?.includes('aborted')
      if (!isAbort && import.meta.env.DEV) {
        console.warn('Tracks load error:', error?.message)
      }
      setTracks([])
      // Don't block the UI - let the app render with empty tracks
    } finally {
      setLoading(false)
    }
  }

  // Reset subsidiary filter when switching label workspace
  useEffect(() => {
    setSubsidiaryFilter('all')
  }, [activeOrgId])

  // Keep a ref to the latest loadTracks (avoids effect dependency churn).
  const loadTracksRef = useRef(loadTracks)
  useEffect(() => {
    loadTracksRef.current = loadTracks
  }, [loadTracks])

  // Background activity: refresh data when returning to the tab.
  // This helps "Submission counts" and other widgets stay accurate after tab switches.
  useEffect(() => {
    if (!supabase || !user?.id) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    let lastRefreshAt = 0

    const refresh = () => {
      // Throttle: avoid burst refreshes during rapid focus/visibility toggles.
      const now = Date.now()
      if (now - lastRefreshAt < 15_000) return
      lastRefreshAt = now
      try {
        loadTracksRef.current?.()
      } catch (_e) {
        // ignore
      }
    }

    const onFocus = () => refresh()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [user?.id])

  // Load tracks when staffProfile is available (for RLS)
  useEffect(() => {
    // If no Supabase, set loading to false immediately
    if (!supabase) {
      console.warn('⚠️ Supabase not configured - AppContext loading set to false')
      setLoading(false)
      return
    }

    // Agent-Centric: Load tracks for Personal view (activeOrgId is null) or Label workspace (activeOrgId set)
    // SystemAdmin can also be in global view (activeOrgId is null, but systemAdminCheck is true)
    if (
      activeOrgId !== null ||
      (systemAdminCheck && activeOrgId === null) ||
      (activeOrgId === null && staffProfile)
    ) {
      loadTracks()
    } else if (!user) {
      // If no user, set loading to false (will show login screen)
      setLoading(false)
    }
    // If user exists but no activeOrgId yet, wait (AuthContext is still loading)

    // Set up real-time subscription for track changes (only if Supabase is configured)
    let tracksChannel = null
    if (supabase) {
      try {
        tracksChannel = supabase
          .channel('tracks-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tracks' }, () => {
            loadTracks() // Reload on any change
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
            loadTracks() // Reload on vote changes
          })
          .subscribe()
      } catch (error) {
        console.warn('Could not set up real-time subscriptions:', error)
      }
    }

    return () => {
      if (tracksChannel && supabase) {
        supabase.removeChannel(tracksChannel)
      }
    }
  }, [staffProfile, user, activeOrgId, subsidiaryFilter]) // Re-run when activeOrgId or subsidiary filter changes

  // Heartbeat: move scheduled releases from Upcoming to Vault when release date arrives
  useEffect(() => {
    if (loading) return

    const checkAndRelease = async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      try {
        // Only run if Supabase is configured
        if (!supabase) return

        // Query Supabase for tracks that need to be moved
        // Filter by organization_id for multi-tenancy (unless SystemAdmin in global view)
        // Skip if no active org and not in global view
        if (!activeOrgId && !(systemAdminCheck && activeOrgId === null)) return

        // Build query - filter by org unless SystemAdmin in global view
        let tracksQuery = supabase
          .from('tracks')
          .select('id')
          .eq('status', 'upcoming')
          .eq('archived', false)
          .not('release_date', 'is', null)
          .lte('release_date', todayStr)

        if (activeOrgId) {
          tracksQuery = tracksQuery.eq('organization_id', activeOrgId)
        }

        const { data: tracksToRelease, error } = await tracksQuery

        if (error) throw error

        // Update each track to vault status
        if (tracksToRelease && tracksToRelease.length > 0) {
          const trackIds = tracksToRelease.map(t => t.id)
          let updateQuery = supabase
            .from('tracks')
            .update({ status: 'vault', column: 'vault' })
            .in('id', trackIds)

          if (activeOrgId) {
            updateQuery = updateQuery.eq('organization_id', activeOrgId)
          }

          const { error: updateError } = await updateQuery

          if (updateError) throw updateError

          // Reload tracks to reflect changes (filter by organization_id for multi-tenancy)
          await loadTracks()
        }
      } catch (error) {
        console.error('Error in heartbeat release check:', error)
      }
    }

    checkAndRelease()
    const interval = setInterval(checkAndRelease, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loading, activeOrgId, systemAdminCheck])

  const updateTrack = async (trackId, updates) => {
    try {
      const track = tracks.find(t => t.id === trackId)
      if (!track) return

      const updatedTrack = { ...track, ...updates }

      // Update Supabase if configured
      if (supabase) {
        const dbData = transformToDb(updatedTrack)
        const { error } = await supabase.from('tracks').update(dbData).eq('id', trackId)

        if (error) throw error
      }

      // Optimistically update local state
      setTracks(prev => prev.map(t => (t.id === trackId ? updatedTrack : t)))
    } catch (error) {
      console.error('Error updating track:', error)
      throw error
    }
  }

  const addTrack = async trackData => {
    try {
      // Check track limit if we have an active organization
      if (supabase && activeOrgId) {
        // Check tracks limit
        const { data: canAddTracks, error: tracksLimitError } = await supabase.rpc(
          'check_usage_limit',
          {
            org_id: activeOrgId,
            limit_type: 'tracks',
          }
        )

        if (tracksLimitError) {
          console.error('Error checking track limit:', tracksLimitError)
          throw new Error('Error checking track limit. Please try again.')
        } else if (canAddTracks === false) {
          throw new Error('Track limit reached. Please upgrade your plan to add more tracks.')
        }

        // Check contacts limit (if this is a new artist)
        // First check if this artist already exists for this organization
        const { data: existingArtist } = await supabase
          .from('tracks')
          .select('artist')
          .eq('organization_id', activeOrgId)
          .eq('artist', trackData.artist)
          .limit(1)

        // If artist doesn't exist, check contacts limit
        if (!existingArtist || existingArtist.length === 0) {
          const { data: canAddContact, error: contactsLimitError } = await supabase.rpc(
            'check_usage_limit',
            {
              org_id: activeOrgId,
              limit_type: 'contacts',
            }
          )

          if (contactsLimitError) {
            console.error('Error checking contacts limit:', contactsLimitError)
            throw new Error('Error checking contacts limit. Please try again.')
          } else if (canAddContact === false) {
            throw new Error(
              'Artist Directory contact limit reached. Please upgrade your plan or erase old data to add more contacts.'
            )
          }
        }
      }

      // If Supabase is not configured, just add to local state
      if (!supabase) {
        const newTrack = {
          id: Date.now().toString(),
          title: trackData.title,
          artist: trackData.artist,
          genre: trackData.genre || trackData.vibe || GENRES[0],
          bpm: parseInt(trackData.bpm) || 128,
          energy: 0, // Energy is set by A&R in Second Listen phase, not during submission
          column: 'inbox',
          votes: 0,
          createdAt: new Date(),
          movedToSecondListen: null,
          link: trackData.link || '',
          staffVotes: {},
          targetReleaseDate: null,
          contractSigned: false,
          totalEarnings: 0,
          releaseDate: null,
          watched: false,
          archived: false,
        }
        setTracks(prev => [...prev, newTrack])
        return newTrack
      }

      // STEP 1: Insert or upsert the Artist into the 'artists' table
      console.log('📝 Step 1: Checking/creating artist:', trackData.artist)
      let artistId = null

      // Try to find existing artist first (filter by organization_id for multi-tenancy)
      // Personal view: organization_id IS NULL, Label view: organization_id = activeOrgId
      let artistQuery = supabase.from('artists').select('id').eq('name', trackData.artist)

      if (activeOrgId === null) {
        // Personal view: find artists where organization_id IS NULL
        artistQuery = artistQuery.is('organization_id', null)
      } else {
        // Label view: find artists where organization_id = activeOrgId
        artistQuery = artistQuery.eq('organization_id', activeOrgId)
      }

      const { data: existingArtist, error: findError } = await artistQuery.maybeSingle()

      if (findError) {
        console.error('❌ Error finding artist:', findError)
        console.error('Error code:', findError.code)
        console.error('Error message:', findError.message)
        throw findError
      }

      if (existingArtist) {
        artistId = existingArtist.id
        console.log('✅ Found existing artist with ID:', artistId)
      } else {
        // Create new artist - use insert with ignoreDuplicates to handle race conditions
        console.log('📝 Creating new artist...')
        const artistData = {
          name: trackData.artist,
          organization_id: activeOrgId || null, // null for personal workspace, orgId for label
        }
        const { data: newArtist, error: artistError } = await supabase
          .from('artists')
          .insert(artistData)
          .select()
          .single()

        if (artistError) {
          // If it's a unique constraint violation, try to find the artist again (race condition)
          if (artistError.code === '23505' || artistError.message?.includes('duplicate key')) {
            console.log('⚠️ Artist was created by another process, fetching again...')
            let retryQuery = supabase.from('artists').select('id').eq('name', trackData.artist)

            if (activeOrgId === null) {
              retryQuery = retryQuery.is('organization_id', null)
            } else {
              retryQuery = retryQuery.eq('organization_id', activeOrgId)
            }

            const { data: retryArtist, error: retryError } = await retryQuery.single()

            if (retryError) {
              console.error('❌ Error fetching artist after conflict:', retryError)
              throw retryError
            }
            artistId = retryArtist.id
            console.log('✅ Found artist after conflict with ID:', artistId)
          } else {
            console.error('❌ Error creating artist:', artistError)
            console.error('Error code:', artistError.code)
            console.error('Error message:', artistError.message)
            console.error('Error details:', artistError.details)
            console.error('Error hint:', artistError.hint)
            throw artistError
          }
        } else {
          artistId = newArtist.id
          console.log('✅ Created new artist with ID:', artistId)
        }
      }

      // STEP 2: Use the returned 'artist_id' to insert the song details into the 'tracks' table
      console.log('📝 Step 2: Creating track with artist_id:', artistId)
      const dbData = {
        artist_id: artistId,
        artist_name: trackData.artist, // Denormalized for quick access
        title: trackData.title,
        sc_link: trackData.link || '',
        genre: trackData.genre || trackData.vibe || GENRES[0],
        bpm: parseInt(trackData.bpm) || 128,
        energy: 0, // Energy is set by A&R in Second Listen phase, not during submission
        status: 'inbox',
        column: 'inbox', // Keep both for compatibility
        // votes is calculated by database trigger, don't include it in insert
      }

      // Agent-Centric: Add organization_id only if in Label workspace
      // In Personal view (activeOrgId is null), organization_id stays null (Personal Inbox)
      if (activeOrgId) {
        dbData.organization_id = activeOrgId
      } else {
        // Personal view: Set recipient_user_id for Personal Inbox
        if (staffProfile) {
          dbData.recipient_user_id = staffProfile.id
        }
      }

      const { data: newTrack, error: trackError } = await supabase
        .from('tracks')
        .insert(dbData)
        .select(
          `
          *,
          artists (
            name
          )
        `
        )
        .single()

      if (trackError) {
        console.error('❌ Error creating track:', trackError)
        console.error('Error code:', trackError.code)
        console.error('Error message:', trackError.message)
        console.error('Error details:', trackError.details)
        console.error('Error hint:', trackError.hint)
        console.error('Track data attempted:', dbData)

        // Check for common issues
        if (trackError.code === '42501' || trackError.message?.includes('permission')) {
          console.error('⚠️ RLS (Row Level Security) issue - check Supabase policies')
        } else if (trackError.code === '23503') {
          console.error('⚠️ Foreign key constraint - artist_id might be invalid')
        } else if (trackError.code === '23502') {
          console.error('⚠️ Not null constraint - required field missing')
        }

        throw trackError
      }

      console.log('✅ Track created successfully:', newTrack.id)

      // Real-time update: Reload all tracks to get the latest data
      await loadTracks()

      // Return the transformed track for immediate UI update
      const transformedTrack = transformTrack(newTrack, [])
      return transformedTrack
    } catch (error) {
      console.error('❌ Error adding track:', error)
      throw error
    }
  }

  const moveTrack = async (trackId, newColumn) => {
    try {
      const track = tracks.find(t => t.id === trackId)
      if (!track) return

      // Check vault limit if moving to vault
      if (supabase && activeOrgId && (newColumn === 'vault' || newColumn === 'Vault')) {
        const { data: canAddToVault, error: vaultLimitError } = await supabase.rpc(
          'check_usage_limit',
          {
            org_id: activeOrgId,
            limit_type: 'vault_tracks',
          }
        )

        if (vaultLimitError) {
          console.error('Error checking vault limit:', vaultLimitError)
          throw new Error('Error checking vault limit. Please try again.')
        } else if (canAddToVault === false) {
          throw new Error(
            'Vault limit reached. Please upgrade your plan or erase old data to add more tracks to The Vault.'
          )
        }
      }

      // Update Supabase if configured
      if (supabase) {
        const updates = {
          status: newColumn,
          column: newColumn,
        }

        if (newColumn === 'second-listen' && track.column !== 'second-listen') {
          updates.moved_to_second_listen = new Date().toISOString()
        } else if (newColumn !== 'second-listen' && track.column === 'second-listen') {
          updates.moved_to_second_listen = null
        }

        const { error } = await supabase.from('tracks').update(updates).eq('id', trackId)

        if (error) throw error
      }

      // Optimistically update local state
      setTracks(prev =>
        prev.map(t => {
          if (t.id === trackId) {
            const updated = { ...t, column: newColumn, status: newColumn }
            if (newColumn === 'second-listen' && t.column !== 'second-listen') {
              updated.movedToSecondListen = new Date()
            } else if (newColumn !== 'second-listen' && t.column === 'second-listen') {
              updated.movedToSecondListen = null
            }
            return updated
          }
          return t
        })
      )
    } catch (error) {
      console.error('Error moving track:', error)
      throw error
    }
  }

  const voteOnTrack = async (trackId, vote) => {
    try {
      if (!staffProfile) {
        console.error('Cannot vote: No staff profile')
        return
      }

      const track = tracks.find(t => t.id === trackId)
      if (!track) return

      const currentVote = track.staffVotes?.[staffProfile.id] || 0

      // If Supabase is not configured, just update local state
      if (!supabase) {
        let newVotes = track.votes
        let newStaffVotes = { ...track.staffVotes }

        // Remove old vote
        if (currentVote !== 0) {
          newVotes -= currentVote
          delete newStaffVotes[staffProfile.id]
        }

        // Add new vote if different
        if (vote !== 0 && vote !== currentVote) {
          newVotes += vote
          newStaffVotes[staffProfile.id] = vote
        }

        setTracks(prev =>
          prev.map(t =>
            t.id === trackId ? { ...t, votes: newVotes, staffVotes: newStaffVotes } : t
          )
        )
        return
      }

      // Agent-Centric: Handle votes in Personal view or Label workspace
      if (activeOrgId === null && !staffProfile) {
        throw new Error('No staff profile. Cannot vote.')
      }

      // Agent-Centric: Handle votes in Personal view or Label workspace
      if (currentVote !== 0) {
        let deleteQuery = supabase
          .from('votes')
          .delete()
          .eq('track_id', trackId)
          .eq('staff_id', staffProfile.id)

        if (activeOrgId === null) {
          deleteQuery = deleteQuery.is('organization_id', null)
        } else {
          deleteQuery = deleteQuery.eq('organization_id', activeOrgId)
        }

        const { error: deleteError } = await deleteQuery
        if (deleteError) throw deleteError
      }

      // Add new vote if different and not zero
      if (vote !== 0 && vote !== currentVote) {
        // Agent-Centric: Set organization_id based on workspace context
        const voteData = {
          track_id: trackId,
          staff_id: staffProfile.id,
          vote_type: vote,
          organization_id: activeOrgId, // null for Personal view, orgId for Label workspace
        }
        const { error: insertError } = await supabase.from('votes').insert(voteData)

        if (insertError) throw insertError
      }

      // Votes are recalculated by database trigger, so reload the track
      // Agent-Centric: Filter based on workspace context
      let fetchQuery = supabase.from('tracks').select('*').eq('id', trackId)

      if (activeOrgId === null) {
        fetchQuery = fetchQuery.is('organization_id', null)
      } else {
        fetchQuery = fetchQuery.eq('organization_id', activeOrgId)
      }

      const { data: updatedTrack, error: fetchError } = await fetchQuery.single()
      if (fetchError) throw fetchError

      let votesFetchQuery = supabase.from('votes').select('*').eq('track_id', trackId)

      if (activeOrgId === null) {
        votesFetchQuery = votesFetchQuery.is('organization_id', null)
      } else {
        votesFetchQuery = votesFetchQuery.eq('organization_id', activeOrgId)
      }

      const { data: votesData } = await votesFetchQuery

      const transformedTrack = transformTrack(updatedTrack, votesData || [])

      // Update local state
      setTracks(prev => prev.map(t => (t.id === trackId ? transformedTrack : t)))
    } catch (error) {
      console.error('Error voting on track:', error)
      throw error
    }
  }

  const getTracksByArtist = artistName => {
    return tracks.filter(track => track.artist === artistName)
  }

  const getAllArtists = () => {
    // CRITICAL: Filter artists based on workspace context to ensure complete isolation
    // Personal view: Only artists where organization_id IS NULL (personal artists)
    // Label view: Only artists where organization_id = activeOrgId (label's artists)

    // First, get unique artist names from filtered tracks (tracks are already filtered by workspace)
    const artistSet = new Set(tracks.map(track => track.artist))

    return Array.from(artistSet).map(artist => {
      // Get tracks for this artist (already filtered by workspace context)
      const artistTracks = getTracksByArtist(artist)

      // Additional safety: Filter tracks to ensure they match workspace context
      // Personal view: tracks must have organization_id IS NULL and recipient_user_id = current user
      // Label view: tracks must have organization_id = activeOrgId
      const filteredTracks = artistTracks.filter(track => {
        if (activeOrgId === null) {
          // Personal view: ensure track belongs to personal inbox
          return track.organizationId === null || track.organizationId === undefined
        } else {
          // Label view: ensure track belongs to this label
          return track.organizationId === activeOrgId
        }
      })

      const signed = filteredTracks.filter(t => t.contractSigned).length
      const submitted = filteredTracks.length
      const conversionRate = submitted > 0 ? (signed / submitted) * 100 : 0

      // Calculate dominant genre (mode)
      const genreCounts = {}
      filteredTracks.forEach(track => {
        if (track.genre) {
          genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1
        }
      })
      const genreEntries = Object.entries(genreCounts)
      const dominantGenre =
        genreEntries.length > 0
          ? genreEntries.reduce((a, b) => (a[1] > b[1] ? a : b), genreEntries[0])[0]
          : 'N/A'

      return {
        name: artist,
        totalSigned: signed,
        totalSubmitted: submitted,
        conversionRate: conversionRate.toFixed(1),
        dominantGenre,
        tracks: filteredTracks,
      }
    })
  }

  // Log listen event when staff clicks a track link
  const logListenEvent = async trackId => {
    if (!supabase || !currentStaff) return

    try {
      const track = tracks.find(t => t.id === trackId)
      if (!track) return

      const { error } = await supabase.from('listen_logs').insert({
        staff_id: currentStaff.id,
        track_id: trackId,
        organization_id: activeOrgId || null,
      })

      if (error) {
        console.error('Error logging listen event:', error)
      }
    } catch (error) {
      console.error('Exception logging listen event:', error)
    }
  }

  // Get cognitive load metrics for a staff member (with caching)
  const getCognitiveLoad = async staffId => {
    // Return cached value if available and recent (within 30 seconds)
    const cacheKey = `cognitive_${staffId}`
    const cached = cognitiveLoadCache[cacheKey]
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data
    }

    if (!supabase) {
      // Fallback for when Supabase is not configured
      const fallback = {
        daily: { listens: 0, status: 'Optimal', color: 'green', percentage: 0 },
        weekly: { listens: 0, status: 'Optimal', color: 'green', percentage: 0 },
        monthly: { listens: 0, status: 'Optimal', color: 'green', percentage: 0 },
        overallStatus: 'Optimal',
        overallColor: 'green',
      }
      return fallback
    }

    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Get listen counts (using count query)
      // Filter by organization_id for multi-tenancy
      if (!activeOrgId) {
        return {
          daily: { listens: 0, status: 'Optimal', color: 'green', percentage: 0 },
          weekly: { listens: 0, status: 'Optimal', color: 'green', percentage: 0 },
          monthly: { listens: 0, status: 'Optimal', color: 'green', percentage: 0 },
          overallStatus: 'Optimal',
          overallColor: 'green',
        }
      }
      const orgId = activeOrgId

      const { count: dailyCount } = await supabase
        .from('listen_logs')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', staffId)
        .eq('organization_id', orgId)
        .gte('listened_at', today.toISOString())

      const { count: weeklyCount } = await supabase
        .from('listen_logs')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', staffId)
        .eq('organization_id', orgId)
        .gte('listened_at', weekAgo.toISOString())

      const { count: monthlyCount } = await supabase
        .from('listen_logs')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', staffId)
        .eq('organization_id', orgId)
        .gte('listened_at', monthAgo.toISOString())

      // Get incoming demo volume for relative calculation
      const { count: dailyDemoCount } = await supabase
        .from('tracks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .eq('organization_id', activeOrgId)

      const { count: weeklyDemoCount } = await supabase
        .from('tracks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString())
        .eq('organization_id', activeOrgId)

      const { count: monthlyDemoCount } = await supabase
        .from('tracks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString())
        .eq('organization_id', activeOrgId)

      // Hard ceiling: 60 listens per day
      const EXPECTATION_CAP = 60
      const effectiveDailyListens = Math.min(dailyCount || 0, EXPECTATION_CAP)
      const effectiveWeeklyListens = Math.min(weeklyCount || 0, EXPECTATION_CAP * 7)
      const effectiveMonthlyListens = Math.min(monthlyCount || 0, EXPECTATION_CAP * 30)

      // Calculate relative percentage (listens vs demos)
      // For low volume: if all demos are listened to, status is Optimal
      const dailyPercentage =
        (dailyDemoCount || 0) > 0 ? (effectiveDailyListens / (dailyDemoCount || 1)) * 100 : 100
      const weeklyPercentage =
        (weeklyDemoCount || 0) > 0 ? (effectiveWeeklyListens / (weeklyDemoCount || 1)) * 100 : 100
      const monthlyPercentage =
        (monthlyDemoCount || 0) > 0
          ? (effectiveMonthlyListens / (monthlyDemoCount || 1)) * 100
          : 100

      // Determine status based on thresholds and relative performance
      const getStatus = (count, percentage, threshold) => {
        if (count >= threshold) return { status: 'Fatigued', color: 'orange' }
        if (percentage < 80 && (dailyDemoCount || weeklyDemoCount || monthlyDemoCount) > 0) {
          return { status: 'Sleeping', color: 'blue' }
        }
        if (count >= threshold * 0.9) return { status: 'Warning', color: 'yellow' }
        return { status: 'Optimal', color: 'green' }
      }

      const daily = {
        listens: dailyCount || 0,
        effectiveListens: effectiveDailyListens,
        demos: dailyDemoCount || 0,
        percentage: dailyPercentage,
        ...getStatus(dailyCount || 0, dailyPercentage, 100),
      }

      const weekly = {
        listens: weeklyCount || 0,
        effectiveListens: effectiveWeeklyListens,
        demos: weeklyDemoCount || 0,
        percentage: weeklyPercentage,
        ...getStatus(weeklyCount || 0, weeklyPercentage, 1000),
      }

      const monthly = {
        listens: monthlyCount || 0,
        effectiveListens: effectiveMonthlyListens,
        demos: monthlyDemoCount || 0,
        percentage: monthlyPercentage,
        ...getStatus(monthlyCount || 0, monthlyPercentage, 5000),
      }

      // Overall status (worst of the three)
      const statuses = [daily.status, weekly.status, monthly.status]
      let overallStatus = 'Optimal'
      let overallColor = 'green'
      if (statuses.includes('Fatigued')) {
        overallStatus = 'Fatigued'
        overallColor = 'orange'
      } else if (statuses.includes('Warning')) {
        overallStatus = 'Warning'
        overallColor = 'yellow'
      } else if (statuses.includes('Sleeping')) {
        overallStatus = 'Sleeping'
        overallColor = 'blue'
      }

      const result = {
        daily,
        weekly,
        monthly,
        overallStatus,
        overallColor,
        expectationCap: EXPECTATION_CAP,
      }

      // Cache the result
      setCognitiveLoadCache(prev => ({
        ...prev,
        [cacheKey]: { data: result, timestamp: Date.now() },
      }))

      return result
    } catch (error) {
      console.error('Error calculating cognitive load:', error)
      const fallback = {
        daily: { listens: 0, status: 'Optimal', color: 'green', percentage: 0 },
        weekly: { listens: 0, status: 'Optimal', color: 'green', percentage: 0 },
        monthly: { listens: 0, status: 'Optimal', color: 'green', percentage: 0 },
        overallStatus: 'Optimal',
        overallColor: 'green',
      }
      return fallback
    }
  }

  // Get all staff in the organization (using memberships)
  const getAllStaff = async () => {
    if (!supabase || !activeOrgId) {
      return []
    }

    try {
      // Get all staff members who have a membership in the active organization
      // RLS will automatically filter to only show memberships the user can view
      // (Owners/Managers can see all in their org, users can see their own)
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('memberships')
        .select(
          `
          user_id,
          role,
          permissions_json,
          staff_members!inner (
            id,
            name,
            bio,
            auth_user_id,
            last_active_at,
            created_at
          )
        `
        )
        .eq('organization_id', activeOrgId)
        .eq('active', true)

      if (membershipsError) {
        console.error('Error fetching memberships:', membershipsError)
        return []
      }

      // Transform to staff format with membership info
      const staffList = (membershipsData || []).map(m => {
        const staff = Array.isArray(m.staff_members) ? m.staff_members[0] : m.staff_members
        return {
          ...staff,
          role: m.role,
          permissions_json: m.permissions_json,
        }
      })

      return staffList.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } catch (error) {
      console.error('Exception fetching staff:', error)
      return []
    }
  }

  // Create invite for new staff member (Owner only)
  const addStaff = async (name, email, role) => {
    if (!supabase || !activeMembership || activeMembership.role !== 'Owner') {
      return { error: { message: 'Only Owners can invite staff members' } }
    }

    if (!activeOrgId) {
      return { error: { message: 'No active organization selected' } }
    }

    try {
      // Check staff limit before creating invite
      const { data: canAdd, error: limitError } = await supabase.rpc('check_usage_limit', {
        org_id: activeOrgId,
        limit_type: 'staff',
      })

      if (limitError) {
        console.error('Error checking staff limit:', limitError)
        return { error: { message: 'Error checking staff limit. Please try again.' } }
      } else if (canAdd === false) {
        return {
          error: {
            message: 'Staff member limit reached. Please upgrade your plan to add more members.',
          },
        }
      }

      // Note: We don't check if user exists here because:
      // 1. supabase.auth.admin is server-side only (not available in browser)
      // 2. The invite system handles duplicates via UNIQUE constraint and ON CONFLICT
      // 3. If user exists, they'll see the invite in their Launchpad
      // 4. If user doesn't exist, they'll receive an email to sign up

      // Default permissions based on role
      const defaultPermissions = {
        can_vote: true,
        can_set_energy: true,
        can_advance_lobby: true,
        can_advance_office: role === 'Owner' || role === 'Manager',
        can_advance_contract: role === 'Owner',
        can_access_archive: true,
        can_access_vault: true,
        can_edit_release_date: role === 'Owner',
        can_view_metrics: role === 'Owner' || role === 'Manager',
      }

      // Create invite record using SECURITY DEFINER function (bypasses RLS)
      const { data: inviteId, error: inviteError } = await supabase.rpc('create_invite', {
        organization_id_param: activeOrgId,
        email_param: email.toLowerCase().trim(),
        role_param: role || 'Scout',
        permissions_json_param: defaultPermissions,
        invited_by_param: staffProfile?.id,
      })

      if (inviteError) {
        throw inviteError
      }

      // Fetch the created/updated invite to get token
      // RLS allows Owners to view invites for their organization
      const { data: inviteData, error: fetchError } = await supabase
        .from('invites')
        .select('*')
        .eq('organization_id', activeOrgId)
        .eq('email', email.toLowerCase().trim())
        .single()

      console.log('📧 Invite created/updated:', {
        inviteId: inviteId,
        email: email.toLowerCase().trim(),
        organizationId: activeOrgId,
        inviteData: inviteData ? 'Found' : 'Not found',
        error: fetchError?.message,
      })

      if (fetchError) {
        console.error('Error fetching invite after creation:', fetchError)
        // If we can't fetch it, we still created it, but can't send email with token
        // Return success but note that token is missing
        return {
          data: {
            invite: { id: inviteId, email: email.toLowerCase().trim() },
            message:
              'Invite created. User will receive an email to create an account or can accept it in their account if they already exist.',
          },
          error: null,
        }
      }

      // Send email with invite link - always send to both new and existing users
      try {
        const { sendTeamInviteEmail } = await import('../lib/emailService')
        // Use a URL that works for both new users (signup) and existing users (launchpad)
        // Existing users will see the invite in Launchpad, new users can sign up with the token
        const inviteUrl = `${window.location.origin}/signup?invite=${inviteData.token}`
        const launchpadUrl = `${window.location.origin}/launchpad` // For existing users
        const orgName = activeMembership?.organization_name || 'your organization'

        await sendTeamInviteEmail({
          email: email.toLowerCase().trim(),
          inviteUrl,
          launchpadUrl, // Add launchpad URL for existing users
          organizationName: orgName,
          inviterName: staffProfile?.name || 'A team member',
          role: role || 'Scout',
        })
      } catch (emailError) {
        console.error('Error sending invite email:', emailError)
        // Don't fail the invite creation if email fails
      }

      return {
        data: {
          invite: inviteData,
          message:
            'Invite sent. User will receive an email to create an account or can accept it in their account if they already exist.',
        },
        error: null,
      }
    } catch (error) {
      console.error('Error creating invite:', error)
      return { error }
    }
  }

  // Update staff member role (Owner only) - updates membership
  const updateStaffRole = async (staffId, newRole) => {
    if (!supabase || !activeMembership || activeMembership.role !== 'Owner') {
      return { error: { message: 'Only Owners can update staff roles' } }
    }

    if (!activeOrgId) {
      return { error: { message: 'No active organization selected' } }
    }

    if (!['Owner', 'Manager', 'Scout'].includes(newRole)) {
      return { error: { message: 'Invalid role. Must be Owner, Manager, or Scout' } }
    }

    try {
      // Update membership role using SECURITY DEFINER function (bypasses RLS)
      const { data: membershipId, error } = await supabase.rpc('update_membership_role', {
        user_id_param: staffId,
        organization_id_param: activeOrgId,
        new_role_param: newRole,
      })

      if (error) throw error

      // Fetch updated membership
      const { data, error: fetchError } = await supabase
        .from('memberships')
        .select('*')
        .eq('id', membershipId)
        .single()

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (error) {
      console.error('Error updating staff role:', error)
      return { error }
    }
  }

  // Remove staff member (deactivate membership, Owner only)
  // Per requirements: Historical data (listen_logs, rejection_reasons) must be preserved
  const removeStaff = async staffId => {
    if (!supabase || !activeMembership || activeMembership.role !== 'Owner') {
      return { error: { message: 'Only Owners can remove staff members' } }
    }

    if (!activeOrgId) {
      return { error: { message: 'No active organization selected' } }
    }

    // Prevent removing yourself
    if (staffId === staffProfile?.id) {
      return { error: { message: 'You cannot remove yourself' } }
    }

    try {
      // Deactivate membership using SECURITY DEFINER function (bypasses RLS)
      // Historical listen_logs and rejection_reasons will remain linked to this staff_id
      const { error: updateError } = await supabase.rpc('deactivate_membership', {
        user_id_param: staffId,
        organization_id_param: activeOrgId,
      })

      if (updateError) throw updateError

      return { data: { success: true }, error: null }
    } catch (error) {
      console.error('Error removing staff:', error)
      return { error }
    }
  }

  // Update staff permissions (Owner only) - updates membership
  const updateStaffPermissions = async (staffId, permissions) => {
    if (!supabase || !activeMembership || activeMembership.role !== 'Owner') {
      return { error: { message: 'Only Owners can update staff permissions' } }
    }

    if (!activeOrgId) {
      return { error: { message: 'No active organization selected' } }
    }

    try {
      // Update permissions_json using SECURITY DEFINER function (bypasses RLS)
      const { data: membershipId, error } = await supabase.rpc('update_membership_permissions', {
        user_id_param: staffId,
        organization_id_param: activeOrgId,
        permissions_json_param: permissions,
      })

      if (error) throw error

      // Fetch updated membership
      const { data, error: fetchError } = await supabase
        .from('memberships')
        .select('*')
        .eq('id', membershipId)
        .single()

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (error) {
      console.error('Error updating staff permissions:', error)
      return { error }
    }
  }

  // Get staff metrics for all staff (Owner/Manager only)
  const getAllStaffMetrics = async () => {
    if (
      !supabase ||
      !activeMembership ||
      (activeMembership.role !== 'Owner' && activeMembership.role !== 'Manager')
    ) {
      return []
    }

    try {
      const allStaff = await getAllStaff()
      const metrics = await Promise.all(
        allStaff.map(async staff => {
          const cognitiveLoad = await getCognitiveLoad(staff.id)
          const staffMetrics = getStaffMetrics(staff.id)

          // Get listen counts for this staff
          const now = new Date()
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          const { count: weeklyListens } = await supabase
            .from('listen_logs')
            .select('*', { count: 'exact', head: true })
            .eq('staff_id', staff.id)
            .gte('listened_at', weekAgo.toISOString())

          return {
            ...staff,
            cognitiveLoad,
            staffMetrics,
            weeklyListens: weeklyListens || 0,
            isOnline: staff.last_active_at
              ? Date.now() - new Date(staff.last_active_at).getTime() < 5 * 60 * 1000 // Online if active in last 5 minutes
              : false,
          }
        })
      )

      return metrics
    } catch (error) {
      console.error('Error fetching all staff metrics:', error)
      return []
    }
  }

  // Get company health metrics (Owner only) - with caching
  const getCompanyHealth = async () => {
    if (!supabase || !activeMembership || activeMembership.role !== 'Owner' || !activeOrgId) {
      return null
    }

    // Return cached value if available and recent (within 60 seconds)
    if (companyHealthCache && Date.now() - companyHealthCache.timestamp < 60000) {
      return companyHealthCache.data
    }

    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Get total staff count (active memberships)
      // RLS will automatically filter - Owners can see all in their org
      const { count: staffCount } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', activeOrgId)
        .eq('active', true)

      // Get incoming demos
      const { count: dailyDemoCount } = await supabase
        .from('tracks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .eq('organization_id', activeOrgId)

      const demosPerStaff = (dailyDemoCount || 0) / (staffCount || 1)
      const EXPECTATION_CAP = 60

      // Check for staffing alert
      const staffingAlert = demosPerStaff > EXPECTATION_CAP

      // Get staff fatigue levels (weekly listens >= 1000)
      const { data: allListens } = await supabase
        .from('listen_logs')
        .select('staff_id')
        .gte('listened_at', weekAgo.toISOString())
        .eq('organization_id', activeOrgId)

      // Count listens per staff
      const staffListenCounts = {}
      allListens?.forEach(log => {
        staffListenCounts[log.staff_id] = (staffListenCounts[log.staff_id] || 0) + 1
      })

      const fatiguedStaff = Object.values(staffListenCounts).filter(count => count >= 1000).length
      const companyHealthScore = Math.max(
        0,
        100 - (fatiguedStaff / (staffCount || 1)) * 50 - (staffingAlert ? 30 : 0)
      )

      const result = {
        totalStaff: staffCount || 1,
        dailyDemos: dailyDemoCount || 0,
        demosPerStaff,
        expectationCap: EXPECTATION_CAP,
        staffingAlert,
        fatiguedStaffCount: fatiguedStaff,
        companyHealthScore: Math.round(companyHealthScore),
      }

      // Cache the result
      setCompanyHealthCache({ data: result, timestamp: Date.now() })

      return result
    } catch (error) {
      console.error('Error calculating company health:', error)
      return null
    }
  }

  // Legacy function for backward compatibility
  const getStaffActivity = () => {
    // This is kept for backward compatibility but will be replaced by getCognitiveLoad
    return {
      monthlyListens: 0,
      avgListensPerWeek: 0,
      upvoteDownvoteRatio: 0,
      activityScore: 0,
      status: 'Optimal',
    }
  }

  const toggleWatched = async trackId => {
    const track = tracks.find(t => t.id === trackId)
    if (track) {
      await updateTrack(trackId, { watched: !track.watched })
    }
  }

  const archiveTrack = async (trackId, rejectionReason = null) => {
    // Artist Relations Tracker:
    // - Use status='denied' so DB trigger logs into denials table.
    // - Keep column='archive' to preserve UI semantics for legacy flows.
    const updateData = { archived: true, column: 'archive', status: 'denied' }
    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason
    } else {
      updateData.rejectionReason = 'No reason provided'
    }
    await updateTrack(trackId, updateData)
  }

  // Get organization settings
  const getOrganizationSettings = async () => {
    if (!supabase || !activeOrgId) {
      return { require_rejection_reason: true }
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('require_rejection_reason')
        .eq('id', activeOrgId)
        .limit(1)

      if (error) {
        console.error('Error fetching organization settings:', error)
        // Check if it's a column not found error
        if (error.message?.includes('require_rejection_reason') || error.code === '42703') {
          console.warn('⚠️ Column require_rejection_reason not found - using default value')
        }
        return { require_rejection_reason: true } // Default to true
      }

      // Handle array response (should only have one item)
      if (data && data.length > 0) {
        return {
          require_rejection_reason: data[0]?.require_rejection_reason ?? true,
        }
      }

      // No organization found, return default
      return { require_rejection_reason: true }
    } catch (error) {
      console.error('Exception fetching organization settings:', error)
      return { require_rejection_reason: true } // Default to true
    }
  }

  // Update organization settings (Owner only)
  const updateOrganizationSettings = async settings => {
    if (!supabase || !activeOrgId || !activeMembership || activeMembership.role !== 'Owner') {
      return { error: { message: 'Unauthorized' } }
    }

    try {
      console.log('🔧 Updating organization settings:', {
        organization_id: activeOrgId,
        settings,
      })

      // First, check if organization exists and we can read it
      const { data: checkData, error: checkError } = await supabase
        .from('organizations')
        .select('id, name, require_rejection_reason')
        .eq('id', activeOrgId)
        .limit(1)

      if (checkError) {
        console.error('❌ Error checking organization:', checkError)
        if (
          checkError.message?.includes('require_rejection_reason') ||
          checkError.code === '42703'
        ) {
          return {
            error: {
              message:
                'Database schema needs to be updated. Please run add-rejection-reason-setting.sql in Supabase SQL Editor.',
              code: 'SCHEMA_MIGRATION_REQUIRED',
            },
          }
        }
        return { error: checkError }
      }

      if (!checkData || checkData.length === 0) {
        console.error('❌ Organization not found:', activeOrgId)
        return {
          error: {
            message: `Organization not found. ID: ${activeOrgId}. Please check your active organization.`,
            code: 'NOT_FOUND',
          },
        }
      }

      console.log('✅ Organization found:', checkData[0])

      // Now try to update
      const { data, error } = await supabase
        .from('organizations')
        .update(settings)
        .eq('id', activeOrgId)
        .select()

      if (error) {
        console.error('❌ Error updating organization:', error)
        // Check if it's a column not found error
        if (error.message?.includes('require_rejection_reason') || error.code === '42703') {
          console.error('❌ Column require_rejection_reason not found in organizations table')
          console.error('💡 Please run the migration script: add-rejection-reason-setting.sql')
          return {
            error: {
              message:
                'Database schema needs to be updated. Please run add-rejection-reason-setting.sql in Supabase SQL Editor.',
              code: 'SCHEMA_MIGRATION_REQUIRED',
            },
          }
        }
        // Check if it's an RLS policy error
        if (
          error.code === '42501' ||
          error.message?.includes('permission denied') ||
          error.message?.includes('RLS')
        ) {
          return {
            error: {
              message:
                'Permission denied. RLS policy may be blocking the update. Please check your RLS policies for organizations table.',
              code: 'RLS_ERROR',
            },
          }
        }
        return { error }
      }

      // If we got data, return the first item (should only be one)
      if (data && data.length > 0) {
        console.log('✅ Organization updated successfully:', data[0])
        return { data: data[0], error: null }
      } else {
        // No rows updated - this shouldn't happen if we found the org above
        console.warn('⚠️ Update succeeded but no data returned')
        // Return the check data as confirmation
        return { data: checkData[0], error: null }
      }
    } catch (error) {
      console.error('❌ Exception updating organization settings:', error)
      if (error.message?.includes('require_rejection_reason')) {
        return {
          error: {
            message:
              'Database schema needs to be updated. Please run add-rejection-reason-setting.sql in Supabase SQL Editor.',
            code: 'SCHEMA_MIGRATION_REQUIRED',
          },
        }
      }
      return { error }
    }
  }

  const advanceTrack = async trackId => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return { success: false, error: 'Track not found' }

    // Energy Gate: Check if advancing from Second Listen
    if (track.column === 'second-listen') {
      if (!track.energy || track.energy === 0) {
        return {
          success: false,
          error: 'Please set the Energy Level before advancing to the Office.',
        }
      }
    }

    // Contract Signed gate: check before moving from Contracting to Upcoming
    if (track.column === 'contracting' && !track.contractSigned) {
      return { success: false, error: 'Contract must be signed before scheduling release.' }
    }

    const phases = ['inbox', 'second-listen', 'team-review', 'contracting', 'upcoming', 'vault']
    const currentIndex = phases.indexOf(track.column)
    if (currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1]
      if (track.column === 'contracting' && nextPhase === 'upcoming' && track.targetReleaseDate) {
        await updateTrack(trackId, { releaseDate: new Date(track.targetReleaseDate) })
      }
      await moveTrack(trackId, nextPhase)
      return { success: true, destination: nextPhase }
    }
    return { success: false, error: 'Already at final stage' }
  }

  const getStaffMetrics = staffId => {
    const staffTracks = tracks.filter(
      t => t.column === 'team-review' || t.column === 'contracting' || t.column === 'vault'
    )
    const tracksWithEnergy = tracks.filter(t => t.energy && t.energy > 0)

    // Calculate average energy assigned by this staff member
    // For now, we'll track energy assignments globally since we don't track who set energy
    const totalEnergy = tracksWithEnergy.reduce((sum, t) => sum + (t.energy || 0), 0)
    const avgEnergy =
      tracksWithEnergy.length > 0 ? (totalEnergy / tracksWithEnergy.length).toFixed(1) : 0

    // Calculate voting participation
    const tracksInTeamReview = tracks.filter(
      t => t.column === 'team-review' || t.column === 'contracting' || t.column === 'vault'
    )
    const tracksVotedOn = tracks.filter(t => t.staffVotes?.[staffId] !== undefined)
    const participationRate =
      tracksInTeamReview.length > 0
        ? ((tracksVotedOn.length / tracksInTeamReview.length) * 100).toFixed(1)
        : 0

    return {
      avgEnergyAssigned: parseFloat(avgEnergy),
      votingParticipationRate: parseFloat(participationRate),
      totalTracksVoted: tracksVotedOn.length,
      totalTracksInReview: tracksInTeamReview.length,
    }
  }

  const getUpcomingReleases = () => {
    return tracks
      .filter(
        t =>
          (t.column === 'upcoming' || t.column === 'contracting') &&
          t.targetReleaseDate &&
          !t.archived
      )
      .sort((a, b) => new Date(a.targetReleaseDate) - new Date(b.targetReleaseDate))
      .slice(0, 3)
  }

  const getUpcomingCount = () => {
    return tracks.filter(t => t.column === 'upcoming' && !t.archived).length
  }

  const getWatchedTracks = () => {
    return tracks.filter(t => t.watched && !t.archived)
  }

  const getQuickStats = () => {
    const activeTracks = tracks.filter(t => !t.archived)
    const byPhase = activeTracks.reduce((acc, track) => {
      acc[track.column] = (acc[track.column] || 0) + 1
      return acc
    }, {})

    return {
      total: activeTracks.length,
      inbox: byPhase.inbox || 0,
      secondListen: byPhase['second-listen'] || 0,
      teamReview: byPhase['team-review'] || 0,
      contracting: byPhase.contracting || 0,
      upcoming: byPhase.upcoming || 0,
      vault: byPhase.vault || 0,
    }
  }

  // Use staffProfile as currentStaff for backward compatibility
  const currentStaff = staffProfile || null
  const isAdmin = staffProfile?.role === 'Owner' || staffProfile?.role === 'Manager'

  const value = {
    tracks,
    setTracks,
    updateTrack,
    addTrack,
    moveTrack,
    voteOnTrack,
    getTracksByArtist,
    getAllArtists,
    getStaffActivity,
    getCognitiveLoad,
    getCompanyHealth,
    getAllStaff,
    getAllStaffMetrics,
    getOrganizationSettings,
    updateOrganizationSettings,
    logListenEvent,
    toggleWatched,
    archiveTrack,
    advanceTrack,
    getUpcomingReleases,
    getUpcomingCount,
    getWatchedTracks,
    getQuickStats,
    getStaffMetrics,
    addStaff,
    updateStaffRole,
    removeStaff,
    updateStaffPermissions,
    currentStaff,
    isAdmin,
    GENRES,
    loading,
    connectionStatus,
    loadTracks, // Expose for manual refresh
    subsidiaryFilter,
    setSubsidiaryFilter,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
