import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2,
  Search,
  ArrowRight,
  Inbox,
  TrendingUp,
  Bell,
  Plus,
  MoveRight,
  X,
  Check,
  LogOut,
  Users,
  Send,
  Eye,
  Package,
  Package2,
  Radio,
  Menu,
  Settings,
  Activity,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBilling } from '../context/BillingContext'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabaseClient'
import Toast from '../components/Toast'
import GlobalSettings from '../components/GlobalSettings'
import UpgradeOverlay from '../components/UpgradeOverlay'
import UsageWarningBanner from '../components/UsageWarningBanner'
import TrialExpiredModal from '../components/TrialExpiredModal'
import GlobalIntakeDropdown from '../components/GlobalIntakeDropdown'
import AddDemoModal from '../components/AddDemoModal'
import UnifiedAppHeader from '../components/UnifiedAppHeader'

const Launchpad = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    staffProfile,
    memberships,
    switchOrganization,
    clearWorkspace,
    activeOrgId,
    user,
    signOut,
    isSystemAdmin,
    refreshStaffProfile,
    loadMemberships,
  } = useAuth()
  const { hasFeature } = useBilling()
  const { tracks, loadTracks, addTrack, GENRES } = useApp()
  const [searchQuery, setSearchQuery] = useState('')
  const [labelStats, setLabelStats] = useState({})
  const [labelCognitiveLoad, setLabelCognitiveLoad] = useState({})
  const [labelGaps, setLabelGaps] = useState({}) // Track which labels have critical gaps
  const [personalInboxTracks, setPersonalInboxTracks] = useState([])
  const [personalDirectoryArtists, setPersonalDirectoryArtists] = useState([])
  const [personalDirectoryTracks, setPersonalDirectoryTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMoveToLabelModal, setShowMoveToLabelModal] = useState({ isOpen: false, track: null })
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false)
  const [labelName, setLabelName] = useState('')
  const [labelSlug, setLabelSlug] = useState('')
  const [isCreatingLabel, setIsCreatingLabel] = useState(false)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [processingInvite, setProcessingInvite] = useState(null)
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [hasPersonalInboxAccess, setHasPersonalInboxAccess] = useState(false)
  const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false)
  const [upgradeRedirecting, setUpgradeRedirecting] = useState(false)
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false)

  // Quad-Inbox state
  const [activeCrate, setActiveCrate] = useState('submissions') // 'submissions', 'network', 'crate_a', 'crate_b'
  const [submissionsTracks, setSubmissionsTracks] = useState([])
  const [networkTracks, setNetworkTracks] = useState([])
  const [crateATracks, setCrateATracks] = useState([])
  const [crateBTracks, setCrateBTracks] = useState([])

  // Network search state
  const [networkSearchQuery, setNetworkSearchQuery] = useState('')
  const [networkSearchResults, setNetworkSearchResults] = useState([])
  const [showNetworkSearch, setShowNetworkSearch] = useState(false)
  const [connections, setConnections] = useState([])
  const [showSendToPeerModal, setShowSendToPeerModal] = useState({ isOpen: false, track: null })
  const [showNetworkMenu, setShowNetworkMenu] = useState(false)
  const [showGlobalSettings, setShowGlobalSettings] = useState(false)
  const [pendingConnectionRequests, setPendingConnectionRequests] = useState(0)
  const [isAddSubmissionOpen, setIsAddSubmissionOpen] = useState(false)

  // Global Close Watch state
  const [globalCloseWatchTracks, setGlobalCloseWatchTracks] = useState([])

  // LAUNCHPAD RESET: Clear activeOrgId on mount to ensure Launchpad is a neutral 'DMZ'
  // Launchpad should be the neutral zone where no specific label is active
  useEffect(() => {
    if (activeOrgId !== null && activeOrgId !== 'GLOBAL') {
      // Clear the active organization when landing on launchpad
      // This ensures Launchpad is a neutral workspace selector
      clearWorkspace()
    }
  }, []) // Run once on mount

  // Trial-expired UX: show a modal once per session after automatic downgrade
  useEffect(() => {
    const justExpired = sessionStorage.getItem('trial_just_expired') === '1'
    if (justExpired) {
      sessionStorage.removeItem('trial_just_expired')
      setShowTrialExpiredModal(true)
    }
  }, [])

  // Post-checkout sync: if user returns with session_id, refresh tier until unlocked
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId) return
    if (!supabase || !user || !staffProfile) return

    let cancelled = false
    const startedAt = Date.now()

    const poll = async () => {
      if (cancelled) return
      await refreshStaffProfile?.()

      // Stop early if tier has changed from free
      if (staffProfile?.tier && staffProfile.tier !== 'free') {
        window.history.replaceState({}, '', '/launchpad')
        return
      }

      // Timeout after ~25s (webhook can be slightly delayed)
      if (Date.now() - startedAt > 25000) {
        window.history.replaceState({}, '', '/launchpad')
        return
      }

      setTimeout(poll, 2500)
    }

    setToast({
      isVisible: true,
      message: 'Payment received — finalizing your access…',
      type: 'info',
    })

    poll()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Load upcoming events across all labels for next 7 days
  useEffect(() => {
    const loadUpcomingEvents = async () => {
      if (!supabase || !memberships || memberships.length === 0) return

      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const nextWeek = new Date(today)
        nextWeek.setDate(nextWeek.getDate() + 7)

        const orgIds = memberships.map(m => m.organization_id)

        // Get all tracks with release dates from all user's labels
        const { data: allTracks, error } = await supabase
          .from('tracks')
          .select(
            'id, title, artist_name, release_date, target_release_date, status, organization_id'
          )
          .in('organization_id', orgIds)
          .in('status', ['contracting', 'upcoming'])
          .eq('archived', false)

        if (error) {
          console.error('Error loading upcoming events:', error)
          return
        }

        // Filter in JavaScript to handle both release_date and target_release_date
        const filteredTracks =
          allTracks?.filter(track => {
            const releaseDate =
              track.status === 'upcoming'
                ? track.release_date
                : track.target_release_date || track.release_date

            if (!releaseDate) return false

            const date = new Date(releaseDate)
            return date >= today && date <= nextWeek
          }) || []

        // Transform and group by date
        const events = []
        filteredTracks.forEach(track => {
          const releaseDate =
            track.status === 'upcoming'
              ? track.release_date
              : track.target_release_date || track.release_date

          if (releaseDate) {
            const date = new Date(releaseDate)
            const org = memberships.find(m => m.organization_id === track.organization_id)
            events.push({
              id: track.id,
              title: track.title,
              artist: track.artist_name,
              date: date,
              dateKey: date.toISOString().split('T')[0],
              label: org?.organization_name || 'Unknown',
              status: track.status,
            })
          }
        })

        setUpcomingEvents(events)
      } catch (err) {
        console.error('Error loading events:', err)
      }
    }

    loadUpcomingEvents()
  }, [memberships])

  // Load stats and cognitive load for each label
  useEffect(() => {
    const loadLabelStats = async () => {
      if (!supabase || !memberships || memberships.length === 0 || !staffProfile) {
        setLoading(false)
        return
      }

      const stats = {}
      const cognitiveLoad = {}

      for (const membership of memberships) {
        try {
          // Get inbox count
          const { count: inboxCount } = await supabase
            .from('tracks')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', membership.organization_id)
            .eq('status', 'inbox')
            .eq('archived', false)

          // Get notifications count (tracks moved to second-listen in last 24h)
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)

          const { count: notificationsCount } = await supabase
            .from('tracks')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', membership.organization_id)
            .eq('status', 'second-listen')
            .gte('moved_to_second_listen', yesterday.toISOString())
            .eq('archived', false)

          stats[membership.organization_id] = {
            inboxCount: inboxCount || 0,
            notificationsCount: notificationsCount || 0,
          }

          // Check for critical gaps in release schedule
          const gapCheckToday = new Date()
          gapCheckToday.setHours(0, 0, 0, 0)

          const month1Start = new Date(gapCheckToday)
          const month1End = new Date(gapCheckToday)
          month1End.setDate(month1End.getDate() + 30)

          const month2Start = new Date(gapCheckToday)
          month2Start.setDate(month2Start.getDate() + 31)
          const month2End = new Date(gapCheckToday)
          month2End.setDate(month2End.getDate() + 60)

          const month3Start = new Date(gapCheckToday)
          month3Start.setDate(month3Start.getDate() + 61)
          const month3End = new Date(gapCheckToday)
          month3End.setDate(month3End.getDate() + 90)

          // Get tracks in contracting or upcoming status for this label
          const { data: releaseTracks } = await supabase
            .from('tracks')
            .select('release_date, target_release_date, status')
            .eq('organization_id', membership.organization_id)
            .in('status', ['contracting', 'upcoming'])
            .eq('archived', false)

          // Check which months have releases
          const month1HasRelease =
            releaseTracks?.some(track => {
              const releaseDate =
                track.status === 'upcoming'
                  ? track.release_date
                  : track.target_release_date || track.release_date
              if (!releaseDate) return false
              const date = new Date(releaseDate)
              return date >= month1Start && date < month1End
            }) || false

          const month2HasRelease =
            releaseTracks?.some(track => {
              const releaseDate =
                track.status === 'upcoming'
                  ? track.release_date
                  : track.target_release_date || track.release_date
              if (!releaseDate) return false
              const date = new Date(releaseDate)
              return date >= month2Start && date < month2End
            }) || false

          const month3HasRelease =
            releaseTracks?.some(track => {
              const releaseDate =
                track.status === 'upcoming'
                  ? track.release_date
                  : track.target_release_date || track.release_date
              if (!releaseDate) return false
              const date = new Date(releaseDate)
              return date >= month3Start && date < month3End
            }) || false

          // Critical gap = 2+ months with no releases
          const gapCount = [month1HasRelease, month2HasRelease, month3HasRelease].filter(
            hasRelease => !hasRelease
          ).length
          const hasCriticalGap = gapCount >= 2

          // Calculate cognitive load for this label (for current user)
          const loadCheckNow = new Date()
          const loadCheckToday = new Date(
            loadCheckNow.getFullYear(),
            loadCheckNow.getMonth(),
            loadCheckNow.getDate()
          )
          const weekAgo = new Date(loadCheckToday.getTime() - 7 * 24 * 60 * 60 * 1000)
          const monthAgo = new Date(loadCheckToday.getTime() - 30 * 24 * 60 * 60 * 1000)

          // Get listen counts for current user in this label
          const { count: weeklyCount } = await supabase
            .from('listen_logs')
            .select('*', { count: 'exact', head: true })
            .eq('staff_id', staffProfile.id)
            .eq('organization_id', membership.organization_id)
            .gte('listened_at', weekAgo.toISOString())

          // Get demo volume for this label
          const { count: weeklyDemoCount } = await supabase
            .from('tracks')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', membership.organization_id)
            .gte('created_at', weekAgo.toISOString())

          // Calculate status
          const EXPECTATION_CAP = 60
          const effectiveWeeklyListens = Math.min(weeklyCount || 0, EXPECTATION_CAP * 7)
          const weeklyPercentage =
            (weeklyDemoCount || 0) > 0
              ? (effectiveWeeklyListens / (weeklyDemoCount || 1)) * 100
              : 100

          let status = 'Optimal'
          let color = 'green'
          if ((weeklyCount || 0) >= 1000) {
            status = 'Fatigued'
            color = 'orange'
          } else if (weeklyPercentage < 80 && (weeklyDemoCount || 0) > 0) {
            status = 'Sleeping'
            color = 'blue'
          } else if ((weeklyCount || 0) >= 900) {
            status = 'Warning'
            color = 'yellow'
          }

          cognitiveLoad[membership.organization_id] = {
            status,
            color,
            weeklyListens: weeklyCount || 0,
            weeklyDemos: weeklyDemoCount || 0,
            percentage: weeklyPercentage,
          }

          // Store gap status
          labelGaps[membership.organization_id] = hasCriticalGap
        } catch (error) {
          console.error(`Error loading stats for ${membership.organization_name}:`, error)
          stats[membership.organization_id] = {
            inboxCount: 0,
            notificationsCount: 0,
          }
          cognitiveLoad[membership.organization_id] = {
            status: 'Optimal',
            color: 'green',
            weeklyListens: 0,
            weeklyDemos: 0,
            percentage: 0,
          }
          labelGaps[membership.organization_id] = false
        }
      }

      setLabelStats(stats)
      setLabelCognitiveLoad(cognitiveLoad)
      setLabelGaps(labelGaps)
      setLoading(false)
    }

    loadLabelStats()
  }, [memberships, staffProfile])

  // Load pending invites for the current user
  const loadPendingInvites = async () => {
    if (!supabase || !user || !staffProfile) {
      console.log('⚠️ Cannot load invites: missing supabase, user, or staffProfile')
      setInvitesLoading(false)
      return
    }

    setInvitesLoading(true)
    try {
      // Get user's email from auth
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        console.error('Error getting auth user:', authError)
        setInvitesLoading(false)
        return
      }

      if (!authUser?.email) {
        console.log('⚠️ No email found for user')
        setInvitesLoading(false)
        return
      }

      const userEmail = authUser.email.toLowerCase().trim()
      console.log('🔍 Loading invites for email:', userEmail)
      console.log('🔍 Auth user email (raw):', authUser.email)

      // First, test if we can query invites at all (RLS test)
      console.log('🔍 Step 1: Testing RLS access...')
      const { data: rlsTest, error: rlsError } = await supabase
        .from('invites')
        .select('id, email')
        .limit(1)

      console.log('🔍 RLS test result:', {
        canAccess: !rlsError,
        error: rlsError?.message,
        foundAny: rlsTest?.length > 0,
      })

      // Query pending invites for this email
      // Try without the foreign key join first to see if that's the issue
      console.log('🔍 Step 2: Querying invites with email filter...')
      let { data, error } = await supabase
        .from('invites')
        .select(
          `
          *,
          organizations (
            id,
            name,
            slug
          )
        `
        )
        .eq('email', userEmail) // Explicit email filter
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      // If that worked, try to get the inviter info separately
      if (data && data.length > 0 && !error) {
        console.log('🔍 Step 3: Fetching inviter details...')
        const inviteIds = data.map(inv => inv.invited_by).filter(Boolean)
        if (inviteIds.length > 0) {
          const { data: inviters } = await supabase
            .from('staff_members')
            .select('id, name')
            .in('id', inviteIds)

          // Merge inviter info into invites
          if (inviters) {
            const inviterMap = new Map(inviters.map(inv => [inv.id, inv]))
            data = data.map(inv => ({
              ...inv,
              staff_members: inv.invited_by ? inviterMap.get(inv.invited_by) : null,
            }))
          }
        }
      }

      console.log('📋 Final invite query result:', {
        userEmail,
        authEmail: authUser.email,
        invitesFound: data?.length || 0,
        error: error
          ? {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
            }
          : null,
        invites:
          data?.map(inv => ({
            id: inv.id,
            email: inv.email,
            emailMatch: inv.email?.toLowerCase().trim() === userEmail,
            org: inv.organizations?.name,
            role: inv.role,
            accepted: inv.accepted_at,
            expires: inv.expires_at,
            expiresInFuture: inv.expires_at ? new Date(inv.expires_at) > new Date() : false,
          })) || [],
      })

      if (error) {
        console.error('❌ Error loading pending invites:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })

        // If it's an RLS error, log it specifically
        if (
          error.code === '42501' ||
          error.message?.includes('permission denied') ||
          error.message?.includes('RLS')
        ) {
          console.error('⚠️ RLS policy might be blocking invite access')
          console.error(
            '💡 Check that the RLS policy "Users can view their invites" is correctly configured'
          )
          console.error('💡 Run fix-invite-rls-case-insensitive.sql to fix case sensitivity issues')
        }
        setInvitesLoading(false)
        return
      }

      console.log(`✅ Found ${(data || []).length} pending invite(s) for ${userEmail}`)
      if (data && data.length > 0) {
        console.log(
          'Invites:',
          data.map(inv => ({ id: inv.id, org: inv.organizations?.name, email: inv.email }))
        )
      } else {
        console.log('ℹ️ No pending invites found')
      }
      setPendingInvites(data || [])
    } catch (error) {
      console.error('❌ Exception loading pending invites:', error)
    } finally {
      setInvitesLoading(false)
    }
  }

  // Load invites when user/staffProfile becomes available
  useEffect(() => {
    loadPendingInvites()

    // Set up real-time subscription for invite changes
    let invitesChannel = null
    if (supabase && user && staffProfile) {
      invitesChannel = supabase
        .channel('invites-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'invites',
          },
          payload => {
            console.log('📬 Invite change detected:', payload.eventType, payload.new || payload.old)
            // Reload invites when any invite changes (RLS will filter to user's invites)
            loadPendingInvites()
          }
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Subscribed to invite changes')
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to invite changes')
          }
        })
    }

    return () => {
      if (invitesChannel && supabase) {
        supabase.removeChannel(invitesChannel)
      }
    }
  }, [user, staffProfile])

  const pendingTier = user?.user_metadata?.pending_tier
  const pendingBillingInterval = user?.user_metadata?.pending_billing_interval || 'month'
  const canFinishUpgrading =
    staffProfile?.tier === 'free' && ['agent', 'starter', 'pro'].includes(pendingTier)

  const handleFinishUpgrading = async () => {
    if (!user?.id || !canFinishUpgrading) return
    setUpgradeRedirecting(true)
    try {
      const resp = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          tier: pendingTier,
          billing_interval: pendingBillingInterval,
        }),
      })

      const payload = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error(payload?.error || 'Failed to start checkout. Please try again.')
      }
      if (!payload?.url) {
        throw new Error('Checkout URL missing. Please try again.')
      }
      window.location.href = payload.url
    } catch (e) {
      setToast({
        isVisible: true,
        message: e?.message || 'Failed to start checkout. Please try again.',
        type: 'error',
      })
      setUpgradeRedirecting(false)
    }
  }

  // Check personal inbox access
  // CRITICAL: System admins must have full access to all features, bypassing all restrictions
  useEffect(() => {
    const checkAccess = async () => {
      // Check system admin status with fallback - check both isSystemAdmin and staffProfile.role
      const userIsSystemAdmin = Boolean(isSystemAdmin || staffProfile?.role === 'SystemAdmin')

      // System admins always have access to everything
      if (userIsSystemAdmin) {
        setHasPersonalInboxAccess(true)
        return
      }

      if (activeOrgId === null && staffProfile) {
        // Personal view - check if user has personal inbox feature
        const access = await hasFeature('personal_inbox')
        setHasPersonalInboxAccess(access)
      } else {
        // Label view - personal inbox is not applicable
        setHasPersonalInboxAccess(false)
      }
    }
    if (staffProfile) {
      checkAccess()
    }
  }, [activeOrgId, staffProfile, hasFeature, isSystemAdmin])

  // Load quad-inbox tracks (4 crates) - only if user has access
  useEffect(() => {
    const loadQuadInbox = async () => {
      if (!supabase || !staffProfile || !hasPersonalInboxAccess) {
        setLoading(false)
        return
      }

      try {
        // Load all personal inbox tracks
        const { data, error } = await supabase
          .from('tracks')
          .select(
            `
            *,
            artists (
              name
            ),
            sender:staff_members!tracks_sender_id_fkey (
              id,
              name
            )
          `
          )
          .eq('recipient_user_id', staffProfile.id)
          .is('organization_id', null)
          .eq('archived', false)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Transform tracks to match app format
        const transformedTracks = (data || []).map(track => ({
          id: track.id,
          title: track.title,
          artist: track.artists?.name || track.artist_name || 'Unknown Artist',
          genre: track.genre,
          bpm: track.bpm,
          energy: track.energy,
          column: track.status || track.column,
          votes: track.votes || 0,
          createdAt: new Date(track.created_at),
          link: track.sc_link || '',
          staffVotes: {},
          archived: false,
          source: track.source || 'manual',
          crate: track.crate || 'submissions',
          peer_to_peer: track.peer_to_peer || false,
          sender: track.sender || null,
          contractSigned: track.contract_signed || false,
        }))

        // Separate into crates (exclude pitched and signed tracks)
        setSubmissionsTracks(
          transformedTracks.filter(
            t =>
              t.source === 'public_form' &&
              !t.peer_to_peer &&
              t.crate !== 'pitched' &&
              t.crate !== 'signed' &&
              !t.contractSigned
          )
        )
        setNetworkTracks(
          transformedTracks.filter(
            t =>
              (t.crate === 'network' || t.peer_to_peer) &&
              t.crate !== 'pitched' &&
              t.crate !== 'signed' &&
              !t.contractSigned
          )
        )
        setCrateATracks(
          transformedTracks.filter(
            t =>
              t.crate === 'crate_a' &&
              t.crate !== 'pitched' &&
              t.crate !== 'signed' &&
              !t.contractSigned
          )
        )
        setCrateBTracks(
          transformedTracks.filter(
            t =>
              t.crate === 'crate_b' &&
              t.crate !== 'pitched' &&
              t.crate !== 'signed' &&
              !t.contractSigned
          )
        )

        // Keep personalInboxTracks for backward compatibility
        setPersonalInboxTracks(transformedTracks)
      } catch (error) {
        console.error('Error loading quad inbox:', error)
        setSubmissionsTracks([])
        setNetworkTracks([])
        setCrateATracks([])
        setCrateBTracks([])
        setPersonalInboxTracks([])
      } finally {
        setLoading(false)
      }
    }

    loadQuadInbox()
  }, [staffProfile, hasPersonalInboxAccess])

  // Load connections
  useEffect(() => {
    const loadConnections = async () => {
      if (!supabase || !staffProfile) return

      try {
        const { data, error } = await supabase
          .from('connections')
          .select(
            `
            *,
            requester:staff_members!connections_requester_id_fkey (
              id,
              name
            ),
            recipient:staff_members!connections_recipient_id_fkey (
              id,
              name
            )
          `
          )
          .or(`requester_id.eq.${staffProfile.id},recipient_id.eq.${staffProfile.id}`)
          .eq('status', 'accepted')

        if (error) throw error
        setConnections(data || [])
      } catch (error) {
        console.error('Error loading connections:', error)
        setConnections([])
      }
    }

    loadConnections()
  }, [staffProfile])

  // Load pending connection requests count for Settings badge
  useEffect(() => {
    const loadPendingRequests = async () => {
      if (!supabase || !staffProfile?.id) {
        setPendingConnectionRequests(0)
        return
      }

      try {
        const { data, error } = await supabase
          .from('connections')
          .select('id')
          .eq('recipient_id', staffProfile.id)
          .eq('status', 'pending')

        if (error) throw error
        setPendingConnectionRequests(data?.length || 0)
      } catch (error) {
        console.error('Error loading pending connection requests:', error)
        setPendingConnectionRequests(0)
      }
    }

    loadPendingRequests()
    // Refresh every 30 seconds to check for new requests
    const interval = setInterval(loadPendingRequests, 30000)
    return () => clearInterval(interval)
  }, [staffProfile?.id])

  // Reload pending requests when GlobalSettings closes (in case requests were accepted/rejected)
  useEffect(() => {
    if (!showGlobalSettings && staffProfile?.id) {
      // Small delay to ensure database updates are reflected
      setTimeout(async () => {
        if (!supabase) return
        try {
          const { data, error } = await supabase
            .from('connections')
            .select('id')
            .eq('recipient_id', staffProfile.id)
            .eq('status', 'pending')

          if (!error) {
            setPendingConnectionRequests(data?.length || 0)
          }
        } catch (error) {
          console.error('Error reloading pending requests:', error)
        }
      }, 500)
    }
  }, [showGlobalSettings, staffProfile?.id])

  // Load Global Close Watch tracks
  useEffect(() => {
    const loadGlobalCloseWatch = async () => {
      if (!supabase || !memberships || memberships.length === 0) return

      try {
        const orgIds = memberships.map(m => m.organization_id)

        const { data, error } = await supabase
          .from('tracks')
          .select(
            `
            *,
            artists (
              name
            ),
            organizations (
              id,
              name
            )
          `
          )
          .in('organization_id', orgIds)
          .eq('is_close_eye', true)
          .eq('archived', false)
          .order('created_at', { ascending: false })

        if (error) throw error

        const transformedTracks = (data || []).map(track => ({
          id: track.id,
          title: track.title,
          artist: track.artists?.name || track.artist_name || 'Unknown Artist',
          genre: track.genre,
          bpm: track.bpm,
          energy: track.energy,
          column: track.status || track.column,
          votes: track.votes || 0,
          createdAt: new Date(track.created_at),
          link: track.sc_link || '',
          staffVotes: {},
          archived: false,
          organization: track.organizations?.name || 'Unknown Label',
          organizationId: track.organization_id,
        }))

        setGlobalCloseWatchTracks(transformedTracks)
      } catch (error) {
        console.error('Error loading global close watch:', error)
        setGlobalCloseWatchTracks([])
      }
    }

    loadGlobalCloseWatch()
  }, [memberships])

  // Get current crate tracks based on activeCrate
  const currentCrateTracks = useMemo(() => {
    switch (activeCrate) {
      case 'submissions':
        return submissionsTracks
      case 'network':
        return networkTracks
      case 'crate_a':
        return crateATracks
      case 'crate_b':
        return crateBTracks
      default:
        return submissionsTracks
    }
  }, [activeCrate, submissionsTracks, networkTracks, crateATracks, crateBTracks])

  // Filter tracks based on search query
  const filteredPersonalTracks = useMemo(() => {
    if (!searchQuery.trim()) return currentCrateTracks

    const query = searchQuery.toLowerCase()
    return currentCrateTracks.filter(
      track =>
        track.title.toLowerCase().includes(query) ||
        track.artist.toLowerCase().includes(query) ||
        track.genre?.toLowerCase().includes(query)
    )
  }, [currentCrateTracks, searchQuery])

  // Search for agents in network
  const searchNetwork = async query => {
    if (!supabase || !staffProfile || !query.trim()) {
      setNetworkSearchResults([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('staff_members')
        .select('id, name, bio, organization_name')
        .ilike('name', `%${query}%`)
        .neq('id', staffProfile.id)
        .limit(20)

      if (error) throw error

      // Filter out already connected agents
      const connectedIds = new Set(
        connections.map(c => (c.requester_id === staffProfile.id ? c.recipient_id : c.requester_id))
      )

      const filtered = (data || []).filter(agent => !connectedIds.has(agent.id))
      setNetworkSearchResults(filtered)
    } catch (error) {
      console.error('Error searching network:', error)
      setNetworkSearchResults([])
    }
  }

  // Handle network search input
  useEffect(() => {
    if (networkSearchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchNetwork(networkSearchQuery)
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setNetworkSearchResults([])
    }
  }, [networkSearchQuery])

  // Connect to agent
  const handleConnect = async agentId => {
    if (!supabase || !staffProfile) return

    try {
      const { error } = await supabase.rpc('create_connection_request', {
        recipient_staff_id: agentId,
      })

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Connection request sent!',
        type: 'success',
      })

      // Reload connections
      const { data } = await supabase
        .from('connections')
        .select('*')
        .or(`requester_id.eq.${staffProfile.id},recipient_id.eq.${staffProfile.id}`)
        .eq('status', 'accepted')

      setConnections(data || [])
      setNetworkSearchQuery('')
      setNetworkSearchResults([])
    } catch (error) {
      console.error('Error connecting:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to send connection request',
        type: 'error',
      })
    }
  }

  // Send track to peer
  const handleSendToPeer = async (trackId, recipientId) => {
    if (!supabase || !staffProfile) return

    try {
      const { error } = await supabase.rpc('send_track_to_peer', {
        track_id_param: trackId,
        recipient_staff_id: recipientId,
      })

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Track sent to peer successfully!',
        type: 'success',
      })

      setShowSendToPeerModal({ isOpen: false, track: null })

      // Reload network tracks
      const { data } = await supabase
        .from('tracks')
        .select('*')
        .eq('recipient_user_id', staffProfile.id)
        .is('organization_id', null)
        .eq('archived', false)
        .order('created_at', { ascending: false })

      const transformedTracks = (data || []).map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artist_name || 'Unknown Artist',
        genre: track.genre,
        bpm: track.bpm,
        energy: track.energy,
        column: track.status || track.column,
        votes: track.votes || 0,
        createdAt: new Date(track.created_at),
        link: track.sc_link || '',
        staffVotes: {},
        archived: false,
        source: track.source || 'manual',
        crate: track.crate || 'submissions',
        peer_to_peer: track.peer_to_peer || false,
        contractSigned: track.contract_signed || false,
      }))

      setNetworkTracks(
        transformedTracks.filter(
          t =>
            (t.crate === 'network' || t.peer_to_peer) &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
    } catch (error) {
      console.error('Error sending track to peer:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to send track',
        type: 'error',
      })
    }
  }

  // Handle pitching track
  const handlePitchTrack = async trackId => {
    if (!supabase || !staffProfile) return

    try {
      const { error } = await supabase
        .from('tracks')
        .update({
          crate: 'pitched',
          pitched_at: new Date().toISOString(),
        })
        .eq('id', trackId)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Track pitched successfully!',
        type: 'success',
      })

      // Reload quad-inbox crates
      const { data } = await supabase
        .from('tracks')
        .select(
          `
          *,
          artists (
            name
          ),
          sender:staff_members!tracks_sender_id_fkey (
            id,
            name
          )
        `
        )
        .eq('recipient_user_id', staffProfile.id)
        .is('organization_id', null)
        .eq('archived', false)
        .order('created_at', { ascending: false })

      const transformedTracks = (data || []).map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artists?.name || track.artist_name || 'Unknown Artist',
        genre: track.genre,
        bpm: track.bpm,
        energy: track.energy,
        column: track.status || track.column,
        votes: track.votes || 0,
        createdAt: new Date(track.created_at),
        link: track.sc_link || '',
        staffVotes: {},
        archived: false,
        source: track.source || 'manual',
        crate: track.crate || 'submissions',
        peer_to_peer: track.peer_to_peer || false,
        sender: track.sender || null,
        contractSigned: track.contract_signed || false,
      }))

      setSubmissionsTracks(
        transformedTracks.filter(
          t =>
            t.source === 'public_form' &&
            !t.peer_to_peer &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setNetworkTracks(
        transformedTracks.filter(
          t =>
            (t.crate === 'network' || t.peer_to_peer) &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setCrateATracks(
        transformedTracks.filter(
          t =>
            t.crate === 'crate_a' &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setCrateBTracks(
        transformedTracks.filter(
          t =>
            t.crate === 'crate_b' &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setPersonalInboxTracks(transformedTracks)
    } catch (error) {
      console.error('Error pitching track:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to pitch track',
        type: 'error',
      })
    }
  }

  // Move track to crate
  const handleMoveToCrate = async (trackId, crate) => {
    if (!supabase) return

    try {
      const { error } = await supabase.from('tracks').update({ crate }).eq('id', trackId)

      if (error) throw error

      // Reload crates
      const { data } = await supabase
        .from('tracks')
        .select('*')
        .eq('recipient_user_id', staffProfile.id)
        .is('organization_id', null)
        .eq('archived', false)
        .order('created_at', { ascending: false })

      const transformedTracks = (data || []).map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artist_name || 'Unknown Artist',
        genre: track.genre,
        bpm: track.bpm,
        energy: track.energy,
        column: track.status || track.column,
        votes: track.votes || 0,
        createdAt: new Date(track.created_at),
        link: track.sc_link || '',
        staffVotes: {},
        archived: false,
        source: track.source || 'manual',
        crate: track.crate || 'submissions',
        peer_to_peer: track.peer_to_peer || false,
        contractSigned: track.contract_signed || false,
      }))

      setSubmissionsTracks(
        transformedTracks.filter(
          t =>
            t.source === 'public_form' &&
            !t.peer_to_peer &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setNetworkTracks(
        transformedTracks.filter(
          t =>
            (t.crate === 'network' || t.peer_to_peer) &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setCrateATracks(
        transformedTracks.filter(
          t =>
            t.crate === 'crate_a' &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setCrateBTracks(
        transformedTracks.filter(
          t =>
            t.crate === 'crate_b' &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
    } catch (error) {
      console.error('Error moving track to crate:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to move track',
        type: 'error',
      })
    }
  }

  const generateSlug = name => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
  }

  const handleLabelNameChange = value => {
    setLabelName(value)
    if (value) {
      setLabelSlug(generateSlug(value))
    }
  }

  const handleEnterWorkspace = async orgId => {
    try {
      const result = await switchOrganization(orgId)

      if (result?.error) {
        console.error('Error switching organization:', result.error)
        setToast({
          isVisible: true,
          message: `Failed to switch workspace: ${result.error.message}`,
          type: 'error',
        })
        return
      }

      // Force reload tracks for the new organization
      if (loadTracks) {
        await loadTracks()
      }

      // Navigate to label workspace (URL drives activeOrganizationId)
      navigate(`/app/label/labels/${orgId}`)
    } catch (error) {
      console.error('Exception switching workspace:', error)
      setToast({
        isVisible: true,
        message: `Failed to switch workspace: ${error.message}`,
        type: 'error',
      })
    }
  }

  const handleCreateLabel = async () => {
    if (!labelName.trim() || !labelSlug.trim() || !staffProfile) return

    setIsCreatingLabel(true)

    try {
      // Check ownership limit before creating label
      const { data: capacityData, error: capacityError } = await supabase.rpc('can_create_label', {
        user_id_param: staffProfile.id,
      })

      if (capacityError) {
        console.error('Error checking ownership limit:', capacityError)
        throw new Error('Error checking ownership limit. Please try again.')
      }

      if (capacityData && !capacityData.can_create) {
        setToast({
          isVisible: true,
          message: `You have reached your ${capacityData.tier} tier limit of ${capacityData.max_count} label${capacityData.max_count > 1 ? 's' : ''}. Upgrade to create more labels.`,
          type: 'error',
        })
        setIsCreatingLabel(false)
        return
      }

      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: labelName,
          slug: labelSlug,
          branding_settings: {},
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Create membership as Owner
      const defaultPermissions = {
        can_vote: true,
        can_set_energy: true,
        can_advance_lobby: true,
        can_advance_office: true,
        can_advance_contract: true,
        can_access_archive: true,
        can_access_vault: true,
        can_edit_release_date: true,
        can_view_metrics: true,
      }

      // Create membership using SECURITY DEFINER function (bypasses RLS)
      const { error: membershipError } = await supabase.rpc('create_membership', {
        user_id_param: staffProfile.id,
        organization_id_param: orgData.id,
        role_param: 'Owner',
        permissions_json_param: defaultPermissions,
      })

      if (membershipError) throw membershipError

      // Switch to new organization
      await switchOrganization(orgData.id)

      setShowCreateLabelModal(false)
      setLabelName('')
      setLabelSlug('')

      setToast({
        isVisible: true,
        message: 'Label created successfully!',
        type: 'success',
      })

      // Refresh memberships so the new label appears without a full reload (stability).
      await loadMemberships?.(staffProfile.id)

      // Launchpad is intended to be a neutral workspace selector.
      clearWorkspace?.()
    } catch (error) {
      console.error('Error creating label:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to create label',
        type: 'error',
      })
      setIsCreatingLabel(false)
    }
  }

  const handleAcceptInvite = async invite => {
    if (!supabase || !staffProfile || processingInvite) return

    setProcessingInvite(invite.id)

    try {
      // Check staff invitation limit for Free tier users
      const { data: capacityData, error: capacityError } = await supabase.rpc(
        'can_accept_staff_invitation',
        {
          user_id_param: staffProfile.id,
        }
      )

      if (capacityError) {
        console.error('Error checking staff limit:', capacityError)
        throw new Error('Error checking staff limit. Please try again.')
      }

      if (capacityData && !capacityData.can_accept) {
        setToast({
          isVisible: true,
          message: `You have reached your Free tier limit of ${capacityData.max_count} staff memberships. Upgrade to join more labels.`,
          type: 'error',
        })
        setProcessingInvite(null)
        return
      }

      const { data, error } = await supabase.rpc('accept_invite', {
        invite_token: invite.token,
        user_id_param: staffProfile.id,
      })

      if (error) throw error

      if (data?.success) {
        setToast({
          isVisible: true,
          message: `You've joined ${invite.organizations?.name || 'the label'}!`,
          type: 'success',
        })

        // Remove accepted invite from list
        setPendingInvites(prev => prev.filter(inv => inv.id !== invite.id))

        // Refresh memberships so the new label appears without a full reload (stability).
        await loadMemberships?.(staffProfile.id)

        // Keep Launchpad neutral (no active label selected).
        clearWorkspace?.()
      } else {
        throw new Error(data?.error || 'Failed to accept invite')
      }
    } catch (error) {
      console.error('Error accepting invite:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to accept invite',
        type: 'error',
      })
    } finally {
      setProcessingInvite(null)
    }
  }

  const handleDeclineInvite = async invite => {
    if (!supabase || processingInvite) return

    setProcessingInvite(invite.id)

    try {
      // Mark invite as expired/declined by updating expires_at to past
      // Note: We can't delete invites, but we can mark them as expired
      // Actually, we'll just remove it from the UI since users can't delete invites
      // The invite will expire naturally
      setPendingInvites(prev => prev.filter(inv => inv.id !== invite.id))

      setToast({
        isVisible: true,
        message: 'Invite dismissed',
        type: 'success',
      })
    } catch (error) {
      console.error('Error declining invite:', error)
      setToast({
        isVisible: true,
        message: 'Failed to decline invite',
        type: 'error',
      })
    } finally {
      setProcessingInvite(null)
    }
  }

  const handleMoveToLabel = async (trackId, orgId) => {
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('tracks')
        .update({
          organization_id: orgId,
          recipient_user_id: null, // Remove personal inbox assignment
          // Artist Relations Tracker (Agent privacy + network rollups):
          // stamp who pitched/promoted this track into the label workspace
          sender_id: staffProfile?.id || null,
          peer_to_peer: true,
        })
        .eq('id', trackId)

      if (error) throw error

      setToast({
        isVisible: true,
        message: 'Track moved to label successfully!',
        type: 'success',
      })

      setShowMoveToLabelModal({ isOpen: false, track: null })

      // Reload quad-inbox crates
      const { data } = await supabase
        .from('tracks')
        .select(
          `
          *,
          artists (
            name
          ),
          sender:staff_members!tracks_sender_id_fkey (
            id,
            name
          )
        `
        )
        .eq('recipient_user_id', staffProfile.id)
        .is('organization_id', null)
        .eq('archived', false)
        .order('created_at', { ascending: false })

      const transformedTracks = (data || []).map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artists?.name || track.artist_name || 'Unknown Artist',
        genre: track.genre,
        bpm: track.bpm,
        energy: track.energy,
        column: track.status || track.column,
        votes: track.votes || 0,
        createdAt: new Date(track.created_at),
        link: track.sc_link || '',
        staffVotes: {},
        archived: false,
        source: track.source || 'manual',
        crate: track.crate || 'submissions',
        peer_to_peer: track.peer_to_peer || false,
        sender: track.sender || null,
        contractSigned: track.contract_signed || false,
      }))

      // Update all crates (exclude pitched and signed tracks)
      setSubmissionsTracks(
        transformedTracks.filter(
          t =>
            t.source === 'public_form' &&
            !t.peer_to_peer &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setNetworkTracks(
        transformedTracks.filter(
          t =>
            (t.crate === 'network' || t.peer_to_peer) &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setCrateATracks(
        transformedTracks.filter(
          t =>
            t.crate === 'crate_a' &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setCrateBTracks(
        transformedTracks.filter(
          t =>
            t.crate === 'crate_b' &&
            t.crate !== 'pitched' &&
            t.crate !== 'signed' &&
            !t.contractSigned
        )
      )
      setPersonalInboxTracks(transformedTracks)
    } catch (error) {
      console.error('Error moving track to label:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to move track',
        type: 'error',
      })
    }
  }

  // Group events by date
  const eventsByDate = useMemo(() => {
    try {
      const grouped = {}
      if (Array.isArray(upcomingEvents)) {
        upcomingEvents.forEach(event => {
          if (event?.dateKey) {
            if (!grouped[event.dateKey]) {
              grouped[event.dateKey] = []
            }
            grouped[event.dateKey].push(event)
          }
        })
      }
      return grouped
    } catch (err) {
      console.error('Error grouping events:', err)
      return {}
    }
  }, [upcomingEvents])

  // Get type color (matching Calendar page)
  const getTypeColor = type => {
    switch (type) {
      case 'upcoming':
        return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'contracting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'released':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  // Get next 7 days
  const next7Days = useMemo(() => {
    try {
      const days = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)
        const dateKey = date.toISOString().split('T')[0]
        days.push({
          date,
          dateKey,
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: date.getDate(),
          isToday: i === 0,
          events: eventsByDate[dateKey] || [],
        })
      }
      return days
    } catch (err) {
      console.error('Error generating next 7 days:', err)
      return []
    }
  }, [eventsByDate])

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gray-950 p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Launchpad...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <TrialExpiredModal
        isOpen={showTrialExpiredModal}
        onClose={() => setShowTrialExpiredModal(false)}
      />
      <UnifiedAppHeader appLabel="LABEL" />
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 flex-shrink-0">
        {/* Usage Warning Banner */}
        <UsageWarningBanner />

        {/* Pending Invites Notification */}
        {pendingInvites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 space-y-2"
          >
            {pendingInvites.map(invite => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/50 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/50">
                    <Bell size={20} className="text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">
                      You've been invited to join{' '}
                      <span className="text-purple-400">
                        {invite.organizations?.name || 'a label'}
                      </span>
                    </p>
                    <p className="text-gray-400 text-sm">
                      Role: <span className="text-gray-300">{invite.role}</span>
                      {invite.staff_members?.name && (
                        <>
                          {' '}
                          • Invited by{' '}
                          <span className="text-gray-300">{invite.staff_members.name}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => handleAcceptInvite(invite)}
                    disabled={processingInvite === invite.id}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 border border-purple-500 rounded-lg text-white font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: processingInvite === invite.id ? 1 : 1.05 }}
                    whileTap={{ scale: processingInvite === invite.id ? 1 : 0.95 }}
                  >
                    {processingInvite === invite.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Accepting...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Accept</span>
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    onClick={() => handleDeclineInvite(invite)}
                    disabled={processingInvite === invite.id}
                    className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: processingInvite === invite.id ? 1 : 1.05 }}
                    whileTap={{ scale: processingInvite === invite.id ? 1 : 0.95 }}
                  >
                    <X size={16} />
                    <span>Dismiss</span>
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Page title and actions */}
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white mb-0.5">A&R Launchpad</h1>
            <p className="text-gray-500 text-sm">Review vitals before entering your workspace</p>
          </div>
          <div className="flex items-center gap-2">
            <GlobalIntakeDropdown
              buttonLabel="Add submission"
              manualAddDisabled={!hasPersonalInboxAccess}
              manualAddDisabledReason="Upgrade required"
              onManualAdd={() => {
                if (!hasPersonalInboxAccess) {
                  setShowUpgradeOverlay(true)
                  return
                }
                setIsAddSubmissionOpen(true)
              }}
            />
            <motion.button
              type="button"
              onClick={e => {
                e.preventDefault()
                setShowGlobalSettings(true)
              }}
              className="relative px-3 py-1.5 text-sm bg-gray-900/50 hover:bg-gray-900/70 border border-gray-800 rounded-md text-gray-300 transition-all flex items-center gap-1.5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings size={16} />
              Settings
              {pendingConnectionRequests > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-[#0B0E14]">
                  {pendingConnectionRequests > 9 ? '9+' : pendingConnectionRequests}
                </span>
              )}
            </motion.button>
            <motion.button
              type="button"
              onClick={e => {
                e.preventDefault()
                signOut()
              }}
              className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-md text-red-400 transition-all flex items-center gap-1.5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut size={16} />
              Logout
            </motion.button>
          </div>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="flex flex-col lg:flex-row gap-2 items-start w-full">
          {/* Main Content Column - Independent Height */}
          <div
            className="flex-1 flex flex-col w-full"
            style={{ height: 'fit-content', minWidth: 0 }}
          >
            {/* Network Search */}
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Users
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={networkSearchQuery}
                    onChange={e => setNetworkSearchQuery(e.target.value)}
                    onFocus={() => setShowNetworkSearch(true)}
                    onBlur={() => setTimeout(() => setShowNetworkSearch(false), 200)}
                    placeholder="Find Agents..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-all"
                  />
                  {showNetworkSearch &&
                    (networkSearchResults.length > 0 || networkSearchQuery.trim()) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                        {networkSearchResults.length > 0 ? (
                          networkSearchResults.map(agent => (
                            <button
                              key={agent.id}
                              onClick={() => handleConnect(agent.id)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-800 border-b border-gray-800 last:border-0 flex items-center gap-2"
                            >
                              <Users size={14} className="text-gray-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">
                                  {agent.name}
                                </p>
                                {agent.organization_name && (
                                  <p className="text-gray-500 text-xs truncate">
                                    {agent.organization_name}
                                  </p>
                                )}
                              </div>
                              <Plus size={14} className="text-gray-400 flex-shrink-0" />
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No agents found</div>
                        )}
                      </div>
                    )}
                </div>

                {/* Network Menu Button */}
                <div className="relative">
                  <motion.button
                    type="button"
                    onClick={e => {
                      e.preventDefault()
                      setShowNetworkMenu(!showNetworkMenu)
                    }}
                    className="px-4 py-2 bg-gray-900/50 hover:bg-gray-800 border border-gray-800 rounded-lg text-gray-300 transition-all flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="View Network"
                  >
                    <Menu size={16} />
                    <span className="text-sm">Your Network</span>
                  </motion.button>

                  {/* Network Menu Dropdown */}
                  {showNetworkMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowNetworkMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed right-4 top-20 bottom-20 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50 w-[600px] max-w-[90vw] overflow-hidden flex flex-col"
                      >
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">Your Network</h3>
                            {connections.length > 0 && (
                              <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-xs font-semibold">
                                {connections.length}{' '}
                                {connections.length === 1 ? 'connection' : 'connections'}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={e => {
                              e.preventDefault()
                              setShowNetworkMenu(false)
                            }}
                            className="text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {connections.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                              {connections.map(connection => {
                                const peer =
                                  connection.requester_id === staffProfile.id
                                    ? connection.recipient
                                    : connection.requester
                                return (
                                  <div
                                    key={connection.id}
                                    className="px-4 py-3 hover:bg-gray-800 border border-gray-800 rounded-lg flex items-center gap-3 cursor-pointer transition-all"
                                    onClick={() => {
                                      // Could add functionality here, like opening a chat or profile
                                      setShowNetworkMenu(false)
                                    }}
                                  >
                                    <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center border border-gray-700 flex-shrink-0">
                                      <Users size={18} className="text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white text-sm font-medium truncate">
                                        {peer?.name || 'Unknown'}
                                      </p>
                                      {peer?.organization_name && (
                                        <p className="text-gray-500 text-xs truncate">
                                          {peer.organization_name}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="px-3 py-8 text-center flex-1 flex items-center justify-center">
                              <div>
                                <Users size={32} className="text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 text-sm">No connections yet</p>
                                <p className="text-gray-600 text-xs mt-1">
                                  Search for agents to connect
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* System Admin Tools - Only visible to SystemAdmin */}
            {isSystemAdmin && (
              <div className="mb-3" style={{ height: 'fit-content' }}>
                <h2 className="text-lg font-bold text-white mb-3">System Administration</h2>
                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"
                  style={{ gridAutoRows: 'minmax(200px, auto)' }}
                >
                  {/* Admin Dashboard Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900/50 rounded-lg p-4 hover:border-gray-600 transition-all cursor-pointer group backdrop-blur-sm h-full flex flex-col border border-gray-800"
                    onClick={() => navigate('/app/label/admin/dashboard')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                        <Building2 size={20} className="text-purple-400" />
                      </div>
                    </div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-purple-400 transition-colors">
                      Admin Dashboard
                    </h3>
                    <p className="text-gray-400 text-xs mb-3 flex-1">
                      Manage organizations, subscriptions, and monitor system health
                    </p>
                    <div className="flex items-center gap-1 text-purple-400 text-xs font-medium mt-auto">
                      <span>Open Dashboard</span>
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </div>
                  </motion.div>

                  {/* Global Pulse Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900/50 rounded-lg p-4 hover:border-gray-600 transition-all cursor-pointer group backdrop-blur-sm h-full flex flex-col border border-gray-800"
                    onClick={() => navigate('/app/label/god-mode')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                        <Activity size={20} className="text-blue-400" />
                      </div>
                    </div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-blue-400 transition-colors">
                      Global Pulse
                    </h3>
                    <p className="text-gray-400 text-xs mb-3 flex-1">
                      System-wide analytics and real-time monitoring across all organizations
                    </p>
                    <div className="flex items-center gap-1 text-blue-400 text-xs font-medium mt-auto">
                      <span>View Pulse</span>
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Label Cards Grid - always show; empty state when no memberships */}
            {memberships && (
              <div className="mb-3" style={{ height: 'fit-content' }}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-lg font-bold text-white">Your Labels</h2>
                  <motion.button
                    onClick={() => setShowCreateLabelModal(true)}
                    className="p-1.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 transition-all flex items-center justify-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Create New Label"
                  >
                    <Plus size={16} />
                  </motion.button>
                </div>
                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"
                  style={{ gridAutoRows: 'minmax(280px, auto)' }}
                >
                  {/* Personal Office Tile - First (only when user has memberships or for layout) */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-3 hover:border-purple-500/60 transition-all cursor-pointer group backdrop-blur-sm h-full flex flex-col border-2 border-purple-500/40"
                    onClick={async () => {
                      // WORKSPACE CLEARANCE: Explicitly clear activeOrgId before navigating to Personal Office
                      clearWorkspace()
                      localStorage.removeItem('active_org_id')
                      // Personal Office at /personal/dashboard (URL drives activeOrgId = null)
                      navigate('/app/label/personal/dashboard')
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30 flex-shrink-0">
                        <Inbox size={20} className="text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white break-words leading-tight">
                          Personal Office
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">Your Workspace</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-gray-900/30 rounded-lg p-2 border border-gray-800">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Radio size={12} className="text-gray-500" />
                          <span className="text-xs text-gray-500">Subs</span>
                        </div>
                        <p className="text-xl font-bold text-white">{submissionsTracks.length}</p>
                      </div>
                      <div className="bg-gray-900/30 rounded-lg p-2 border border-gray-800">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Users size={12} className="text-gray-500" />
                          <span className="text-xs text-gray-500">Net</span>
                        </div>
                        <p className="text-xl font-bold text-white">{networkTracks.length}</p>
                      </div>
                    </div>

                    {/* Total Tracks Info */}
                    <div className="mb-2 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <span className="text-xs font-semibold text-purple-400">Active</span>
                      <span className="text-xs text-gray-600 ml-auto">
                        {submissionsTracks.length +
                          networkTracks.length +
                          crateATracks.length +
                          crateBTracks.length}{' '}
                        total
                      </span>
                    </div>

                    <button
                      type="button"
                      className="mt-auto w-full py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <span>Enter</span>
                      <ArrowRight size={14} />
                    </button>
                  </motion.div>

                  {(() => {
                    const getStatusColor = color => {
                      switch (color) {
                        case 'green': return 'bg-green-500'
                        case 'yellow': return 'bg-yellow-500'
                        case 'blue': return 'bg-blue-500'
                        case 'orange': return 'bg-orange-500'
                        default: return 'bg-gray-500'
                      }
                    }
                    const renderLabelCard = membership => {
                      const stats = labelStats[membership.organization_id] || {
                        inboxCount: 0,
                        notificationsCount: 0,
                      }
                      const cognitiveLoad = labelCognitiveLoad[membership.organization_id] || {
                        status: 'Optimal',
                        color: 'green',
                        weeklyListens: 0,
                        weeklyDemos: 0,
                        percentage: 0,
                      }
                      const hasCriticalGap = labelGaps[membership.organization_id] || false
                      return (
                        <motion.div
                          key={membership.membership_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`bg-gray-900/50 rounded-lg p-3 hover:border-gray-600 transition-all cursor-pointer group backdrop-blur-sm h-full flex flex-col ${
                            hasCriticalGap
                              ? 'border-2 border-amber-500/60 shadow-lg shadow-amber-500/10'
                              : 'border border-gray-800'
                          }`}
                          onClick={() => handleEnterWorkspace(membership.organization_id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-gray-800/50 flex items-center justify-center border border-gray-700 flex-shrink-0">
                              <Building2 size={20} className="text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-white break-words leading-tight">
                                {membership.organization_name}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5">{membership.role}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-gray-900/30 rounded-lg p-2 border border-gray-800">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Inbox size={12} className="text-gray-500" />
                                <span className="text-xs text-gray-500">Inbox</span>
                              </div>
                              <p className="text-xl font-bold text-white">{stats.inboxCount}</p>
                            </div>
                            <div className="bg-gray-900/30 rounded-lg p-2 border border-gray-800">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Bell size={12} className="text-gray-500" />
                                <span className="text-xs text-gray-500">New</span>
                              </div>
                              <p className="text-xl font-bold text-white">
                                {stats.notificationsCount}
                              </p>
                            </div>
                          </div>
                          <div className="mb-2 flex items-center gap-2">
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${getStatusColor(cognitiveLoad.color)}`}
                            />
                            <span
                              className={`text-xs font-semibold ${
                                cognitiveLoad.color === 'green'
                                  ? 'text-green-400'
                                  : cognitiveLoad.color === 'yellow'
                                    ? 'text-yellow-400'
                                    : cognitiveLoad.color === 'blue'
                                      ? 'text-blue-400'
                                      : 'text-orange-400'
                              }`}
                            >
                              {cognitiveLoad.status}
                            </span>
                            <span className="text-xs text-gray-600 ml-auto">
                              {cognitiveLoad.weeklyListens}/{cognitiveLoad.weeklyDemos}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="mt-auto w-full py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                          >
                            <span>Enter</span>
                            <ArrowRight size={14} />
                          </button>
                        </motion.div>
                      )
                    }
                    const orgIds = new Set(memberships.map(m => m.organization_id))
                    const roots = memberships.filter(
                      m => !m.parent_id || !orgIds.has(m.parent_id)
                    )
                    const getChildren = parentId =>
                      memberships.filter(m => m.parent_id === parentId)
                    return (
                      <>
                        {roots.map(root => {
                          const children = getChildren(root.organization_id)
                          return (
                            <div key={root.membership_id} className="space-y-2">
                              {renderLabelCard(root)}
                              {children.length > 0 && (
                                <div className="pl-4 ml-2 border-l-2 border-gray-700/80 space-y-2">
                                  {children.map(child => (
                                    <div key={child.membership_id}>
                                      {renderLabelCard(child)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </>
                    )
                  })()}
                </div>

                {/* Global Close Watch Section */}
                {globalCloseWatchTracks.length > 0 && (
                  <div className="mt-2 mb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye size={16} className="text-amber-400" />
                      <h2 className="text-lg font-bold text-white">Global Close Watch</h2>
                      <span className="text-xs text-gray-400">
                        {globalCloseWatchTracks.length} watched
                      </span>
                    </div>
                    <div className="bg-gray-900/40 border border-amber-500/30 rounded-lg p-2">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        {['inbox', 'second-listen', 'team-review', 'contracting', 'upcoming'].map(
                          phase => {
                            const phaseTracks = globalCloseWatchTracks.filter(
                              t => t.column === phase
                            )
                            return (
                              <div
                                key={phase}
                                className="bg-gray-900/50 rounded p-2 border border-gray-800"
                              >
                                <h3 className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                                  {phase.replace('-', ' ')} ({phaseTracks.length})
                                </h3>
                                <div className="space-y-1">
                                  {phaseTracks.map(track => (
                                    <div
                                      key={track.id}
                                      className="bg-gray-900/60 border border-gray-800 rounded p-1.5 hover:border-amber-500/50 transition-all cursor-pointer group"
                                      onClick={() => {
                                        // Switch to track's organization and navigate
                                        if (track.organizationId) {
                                          handleEnterWorkspace(track.organizationId)
                                        }
                                      }}
                                    >
                                      <div className="flex items-start justify-between mb-0.5">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-white font-semibold text-xs truncate">
                                            {track.artist}
                                          </p>
                                          <p className="text-gray-500 text-xs truncate">
                                            {track.title}
                                          </p>
                                          <p className="text-amber-400/70 text-xs truncate">
                                            {track.organization}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          }
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calendar Sidebar - Aligned with Label Cards */}
          <div
            className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-4"
            style={{ marginTop: '3.5rem', minHeight: '280px' }}
          >
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2 h-full">
              <h3 className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Next 7 Days
              </h3>
              <div className="space-y-1">
                {next7Days.map(day => (
                  <div
                    key={day.dateKey}
                    className={`rounded p-1.5 border ${
                      day.isToday
                        ? 'bg-gray-800/50 border-gray-700'
                        : 'bg-gray-900/30 border-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            day.isToday ? 'text-white' : 'text-gray-500'
                          }`}
                        >
                          {day.dayName}
                        </span>
                        <span
                          className={`text-xs ${day.isToday ? 'text-gray-300' : 'text-gray-600'}`}
                        >
                          {day.dayNumber}
                        </span>
                      </div>
                      {day.events.length > 0 && (
                        <span className="text-xs text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded">
                          {day.events.length}
                        </span>
                      )}
                    </div>
                    {day.events.length > 0 && (
                      <div className="space-y-0.5 mt-1">
                        {day.events.slice(0, 1).map(event => {
                          // Map status to type for color coding
                          const eventType =
                            event.status === 'upcoming'
                              ? 'upcoming'
                              : event.status === 'contracting'
                                ? 'contracting'
                                : 'released'
                          return (
                            <div
                              key={event.id}
                              className={`text-xs truncate p-1 rounded border ${getTypeColor(eventType)}`}
                              title={`${event.artist} - ${event.title} (${event.label})`}
                            >
                              {event.artist}
                            </div>
                          )
                        })}
                        {day.events.length > 1 && (
                          <div className="text-xs text-gray-600">+{day.events.length - 1}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Inbox - Full Width Section - Edge to Edge - Expand to Bottom */}
      {memberships && memberships.length > 0 && (
        <div className="bg-gray-950 px-4 sm:px-6 lg:px-10 pb-10 flex-1 flex flex-col min-h-0 w-full">
          <div className="mt-2 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">Personal Inbox</h2>
              {hasPersonalInboxAccess && (
                <span className="text-xs text-gray-400">
                  {currentCrateTracks.length} {currentCrateTracks.length === 1 ? 'track' : 'tracks'}
                </span>
              )}
            </div>

            {/* Upgrade Overlay for Personal Inbox */}
            {!hasPersonalInboxAccess && activeOrgId === null && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md p-8 bg-gray-900/50 rounded-lg border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-3">
                    Upgrade to Unlock Personal Inbox
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Personal Inbox is available on Agent tier and above. Upgrade to access direct
                    artist submissions, organize tracks in custom crates, and network with other A&R
                    professionals.
                  </p>
                  {canFinishUpgrading ? (
                    <button
                      onClick={handleFinishUpgrading}
                      disabled={upgradeRedirecting}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg text-white font-semibold transition-all mb-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full"
                    >
                      {upgradeRedirecting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Redirecting to secure payment...</span>
                        </>
                      ) : (
                        <span>Finish Upgrading</span>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowUpgradeOverlay(true)
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-semibold transition-all mb-3"
                    >
                      View Plans
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/app/settings/billing')}
                    className="block w-full text-sm text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    Or go directly to billing →
                  </button>
                </div>
              </div>
            )}

            {hasPersonalInboxAccess && (
              <>
                {/* Crate Tabs - Evenly spaced, scrollable on small screens */}
                <div className="flex items-center gap-1 mb-2 bg-gray-900/50 border border-gray-800 rounded-lg p-1 w-full min-w-0 flex-shrink-0 overflow-x-auto scrollbar-hide md:overflow-x-visible">
                  <button
                    onClick={() => setActiveCrate('submissions')}
                    className={`flex-1 min-w-0 px-2 py-1.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 touch-target ${
                      activeCrate === 'submissions'
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <Radio size={12} className="flex-shrink-0" />
                    <span className="whitespace-nowrap truncate">
                      Submissions ({submissionsTracks.length})
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveCrate('network')}
                    className={`flex-1 min-w-0 px-2 py-1.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 touch-target ${
                      activeCrate === 'network'
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <Users size={12} className="flex-shrink-0" />
                    <span className="whitespace-nowrap truncate">Network ({networkTracks.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveCrate('crate_a')}
                    className={`flex-1 min-w-0 px-2 py-1.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 touch-target ${
                      activeCrate === 'crate_a'
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <Package size={12} className="flex-shrink-0" />
                    <span className="whitespace-nowrap truncate">Crate A ({crateATracks.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveCrate('crate_b')}
                    className={`flex-1 min-w-0 px-2 py-1.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 touch-target ${
                      activeCrate === 'crate_b'
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <Package2 size={12} className="flex-shrink-0" />
                    <span className="whitespace-nowrap truncate">Crate B ({crateBTracks.length})</span>
                  </button>
                </div>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {currentCrateTracks.length === 0 ? (
                    <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 text-center flex-1 flex items-center justify-center">
                      <div>
                        <Inbox size={24} className="text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">
                          No tracks in{' '}
                          {activeCrate === 'crate_a'
                            ? 'Crate A'
                            : activeCrate === 'crate_b'
                              ? 'Crate B'
                              : activeCrate.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-2 w-full flex-1 flex flex-col min-h-0 overflow-hidden">
                      {filteredPersonalTracks.length === 0 ? (
                        <div className="text-center py-4 flex-1 flex items-center justify-center">
                          <p className="text-gray-500 text-sm">No tracks match your search</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 w-full max-w-none flex-1 min-h-0 overflow-y-auto">
                          {['inbox', 'second-listen', 'team-review', 'contracting', 'upcoming'].map(
                            phase => {
                              const phaseTracks = filteredPersonalTracks.filter(
                                t => t.column === phase
                              )
                              return (
                                <div
                                  key={phase}
                                  className="bg-gray-900/50 rounded p-2 border border-gray-800 flex flex-col h-full"
                                >
                                  <h3 className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider flex-shrink-0">
                                    {phase.replace('-', ' ')} ({phaseTracks.length})
                                  </h3>
                                  <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
                                    {phaseTracks.map(track => (
                                      <div
                                        key={track.id}
                                        className="bg-gray-900/60 border border-gray-800 rounded p-1.5 hover:border-gray-700 transition-all cursor-pointer group"
                                      >
                                        <div className="flex items-start justify-between mb-0.5">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-white font-semibold text-xs truncate">
                                              {track.artist}
                                            </p>
                                            <p className="text-gray-500 text-xs truncate">
                                              {track.title}
                                            </p>
                                            {track.sender && (
                                              <p className="text-blue-400/70 text-xs truncate">
                                                From: {track.sender.name}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {activeCrate !== 'network' &&
                                              connections.length > 0 && (
                                                <button
                                                  onClick={e => {
                                                    e.stopPropagation()
                                                    setShowSendToPeerModal({ isOpen: true, track })
                                                  }}
                                                  className="p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400"
                                                  title="Send to Peer"
                                                >
                                                  <Send size={12} />
                                                </button>
                                              )}
                                            <button
                                              onClick={e => {
                                                e.stopPropagation()
                                                handlePitchTrack(track.id)
                                              }}
                                              className="p-1 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded text-orange-400"
                                              title="Pitch Track"
                                            >
                                              <Send size={12} />
                                            </button>
                                            {activeCrate === 'submissions' && (
                                              <>
                                                <button
                                                  onClick={e => {
                                                    e.stopPropagation()
                                                    handleMoveToCrate(track.id, 'crate_a')
                                                  }}
                                                  className="p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400"
                                                  title="Move to Crate A"
                                                >
                                                  <Package size={12} />
                                                </button>
                                                <button
                                                  onClick={e => {
                                                    e.stopPropagation()
                                                    handleMoveToCrate(track.id, 'crate_b')
                                                  }}
                                                  className="p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400"
                                                  title="Move to Crate B"
                                                >
                                                  <Package2 size={12} />
                                                </button>
                                              </>
                                            )}
                                            <button
                                              onClick={e => {
                                                e.stopPropagation()
                                                setShowMoveToLabelModal({ isOpen: true, track })
                                              }}
                                              className="p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400"
                                              title="Promote to Label"
                                            >
                                              <MoveRight size={12} />
                                            </button>
                                          </div>
                                        </div>
                                        {track.link && (
                                          <a
                                            href={track.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-gray-400 hover:text-gray-300"
                                            onClick={e => {
                                              e.stopPropagation()
                                              // Log listen event
                                              if (supabase && staffProfile) {
                                                supabase
                                                  .from('listen_logs')
                                                  .insert({
                                                    staff_id: staffProfile.id,
                                                    track_id: track.id,
                                                    organization_id: null,
                                                  })
                                                  .catch(console.error)
                                              }
                                            }}
                                          >
                                            Listen →
                                          </a>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            }
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <UpgradeOverlay
        isOpen={showUpgradeOverlay}
        onClose={() => setShowUpgradeOverlay(false)}
        featureName="Personal Inbox"
        planName="Agent"
        showFinishUpgrading={canFinishUpgrading}
        onFinishUpgrading={handleFinishUpgrading}
        finishUpgradingLoading={upgradeRedirecting}
      />

      <AddDemoModal
        isOpen={isAddSubmissionOpen}
        onClose={() => setIsAddSubmissionOpen(false)}
        onAdd={data => {
          addTrack?.(data)
          setIsAddSubmissionOpen(false)
        }}
        vibeTags={GENRES || []}
      />

      {/* Send to Peer Modal */}
      {showSendToPeerModal.isOpen && showSendToPeerModal.track && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSendToPeerModal({ isOpen: false, track: null })}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-gray-900/95 border border-gray-700 rounded-lg p-4 w-full max-w-md backdrop-blur-sm"
          >
            <h3 className="text-lg font-bold text-white mb-3">
              Send "{showSendToPeerModal.track.title}" to Peer
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Select a connected agent to send this track to:
            </p>

            <div className="space-y-1.5 mb-4 max-h-64 overflow-y-auto">
              {connections.length > 0 ? (
                connections.map(connection => {
                  const peer =
                    connection.requester_id === staffProfile.id
                      ? connection.recipient
                      : connection.requester
                  return (
                    <button
                      key={connection.id}
                      onClick={() => handleSendToPeer(showSendToPeerModal.track.id, peer.id)}
                      className="w-full p-2.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-left transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-gray-400" />
                        <div>
                          <p className="text-white font-semibold text-sm">{peer.name}</p>
                          {peer.organization_name && (
                            <p className="text-xs text-gray-500">{peer.organization_name}</p>
                          )}
                        </div>
                      </div>
                      <Send
                        size={14}
                        className="text-gray-600 group-hover:text-gray-400 transition-colors"
                      />
                    </button>
                  )
                })
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No connections yet. Search for agents above to connect.
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSendToPeerModal({ isOpen: false, track: null })}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-sm"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}

      {/* Move to Label Modal */}
      {showMoveToLabelModal.isOpen && showMoveToLabelModal.track && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900/95 border border-gray-700 rounded-lg p-6 w-full max-w-md backdrop-blur-sm"
          >
            <h3 className="text-lg font-bold text-white mb-3">
              Promote "{showMoveToLabelModal.track.title}" to Label
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Select which label to promote this track to:
            </p>

            <div className="space-y-1.5 mb-4">
              {memberships?.map(membership => (
                <button
                  key={membership.membership_id}
                  onClick={() =>
                    handleMoveToLabel(showMoveToLabelModal.track.id, membership.organization_id)
                  }
                  className="w-full p-2.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-left transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-gray-400" />
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {membership.organization_name}
                      </p>
                      <p className="text-xs text-gray-500">{membership.role}</p>
                    </div>
                  </div>
                  <MoveRight
                    size={14}
                    className="text-gray-600 group-hover:text-gray-400 transition-colors"
                  />
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowMoveToLabelModal({ isOpen: false, track: null })}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-sm"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}

      {/* Create Label Modal */}
      {showCreateLabelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900/95 border border-gray-700 rounded-lg p-6 w-full max-w-md backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create New Label</h2>
              <button
                onClick={() => {
                  setShowCreateLabelModal(false)
                  setLabelName('')
                  setLabelSlug('')
                }}
                className="text-gray-500 hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Label Name</label>
                <input
                  type="text"
                  value={labelName}
                  onChange={e => handleLabelNameChange(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
                  placeholder="My Awesome Label"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Label Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">https://soundpath.app/</span>
                  <input
                    type="text"
                    value={labelSlug}
                    onChange={e => setLabelSlug(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
                    placeholder="my-awesome-label"
                  />
                </div>
                <p className="text-gray-600 text-xs mt-1">This will be your label's unique URL</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateLabel}
                disabled={isCreatingLabel || !labelName || !labelSlug}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreatingLabel ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Building2 size={18} />
                    <span>Create Label</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowCreateLabelModal(false)
                  setLabelName('')
                  setLabelSlug('')
                }}
                className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-400"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />

      <GlobalSettings isOpen={showGlobalSettings} onClose={() => setShowGlobalSettings(false)} />
    </div>
  )
}

export default Launchpad
