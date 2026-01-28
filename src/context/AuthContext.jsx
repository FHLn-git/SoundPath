import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [staffProfile, setStaffProfile] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [activeOrgId, setActiveOrgId] = useState(null)
  const [activeMembership, setActiveMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [staffRealtimeChannel, setStaffRealtimeChannel] = useState(null)

  // Load user session on mount
  useEffect(() => {
    if (!supabase) {
      console.warn('⚠️ Supabase not configured - showing login screen')
      setLoading(false)
      return
    }

    let mounted = true

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return
        
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          loadStaffProfile(session.user.id)
        } else {
          setLoading(false)
        }
      })
      .catch((error) => {
        console.error('Error in getSession:', error)
        if (mounted) {
          setLoading(false)
        }
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadStaffProfile(session.user.id)
      } else {
        setStaffProfile(null)
        setMemberships([])
        setActiveOrgId(null)
        setActiveMembership(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Load staff profile from staff_members table
  const loadStaffProfile = async (authUserId) => {
    if (!supabase) {
      console.warn('⚠️ Cannot load staff profile: Supabase not configured')
      setLoading(false)
      return
    }

    try {
      console.log('🔍 Loading staff profile for auth user:', authUserId)
      
      // Add timeout wrapper
      const queryWithTimeout = async () => {
        return new Promise(async (resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Query timeout after 5 seconds - RLS might be blocking'))
          }, 5000)

          try {
            const result = await supabase
              .from('staff_members')
              .select('*')
              .eq('auth_user_id', authUserId)
              .single()
            clearTimeout(timeout)
            resolve(result)
          } catch (err) {
            clearTimeout(timeout)
            reject(err)
          }
        })
      }

      const { data, error } = await queryWithTimeout()

      if (error) {
        console.error('❌ Error loading staff profile:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        // If it's a "no rows" error, the auth_user_id isn't linked
        if (error.code === 'PGRST116' || error.message?.includes('No rows') || error.message?.includes('JSON object requested, multiple')) {
          console.error('⚠️ No staff member found with this auth_user_id!')
          console.error('💡 Attempting to create staff member automatically...')
          
          // Try to create staff member automatically
          try {
            const staffId = `staff_${authUserId.substring(0, 8)}_${Date.now()}`
            const { data: newStaff, error: createError } = await supabase
              .from('staff_members')
              .insert({
                id: staffId,
                name: 'User', // Default name, can be updated later
                role: 'Scout',
                auth_user_id: authUserId,
                organization_id: null, // NULL is allowed - organization membership via memberships table
                // 7-day Pro trial fallback (DB trigger should normally handle this)
                tier: 'pro',
                user_status: 'trialing',
                trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                paid_tier: null,
              })
              .select()
              .single()

            if (!createError && newStaff) {
              console.log('✅ Successfully created staff member automatically')
              setStaffProfile(newStaff)
              // Enforce trial expiry / activation on login (best-effort)
              try {
                const { data: enforceData } = await supabase.rpc('enforce_personal_trial_status')
                if (enforceData?.downgraded) {
                  sessionStorage.setItem('trial_just_expired', '1')
                }
              } catch (_e) {
                // ignore
              }
              await loadMemberships(newStaff.id)
              setLoading(false)
              return
            } else {
              console.error('❌ Failed to auto-create staff member:', createError)
            }
          } catch (createErr) {
            console.error('❌ Exception during auto-create:', createErr)
          }
          
          console.error('💡 Manual fix: Run this SQL in Supabase SQL Editor:')
          console.error(`   INSERT INTO staff_members (id, name, role, auth_user_id) VALUES ('staff_${authUserId.substring(0, 8)}_${Date.now()}', 'User', 'Scout', '${authUserId}');`)
        }
        
        // If it's an RLS error
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('RLS')) {
          console.error('⚠️ RLS (Row Level Security) is blocking access!')
          console.error('💡 This might mean:')
          console.error('   1. The staff member is not in the same organization')
          console.error('   2. RLS policies need to be updated')
          console.error('   3. The auth user is not properly linked')
        }
        
        // Don't set staffProfile to null immediately - allow redirect to happen
        // Set a minimal profile so user can at least access welcome page
        setStaffProfile({
          id: `temp_${authUserId}`,
          name: 'User',
          role: 'Scout',
          auth_user_id: authUserId,
        })
        setMemberships([])
        setActiveOrgId(null)
        setActiveMembership(null)
        setLoading(false)
      } else {
        console.log('✅ Staff profile loaded:', data)
        setStaffProfile(data)
        // Enforce trial expiry / activation on login (best-effort)
        // This acts like middleware: if trial ended and no subscription_id, downgrade to free.
        try {
          const { data: enforceData } = await supabase.rpc('enforce_personal_trial_status')
          if (enforceData?.downgraded) {
            sessionStorage.setItem('trial_just_expired', '1')
          }
          // If enforcement changed anything, refresh the staff profile once.
          if (enforceData?.downgraded || enforceData?.activated) {
            const refreshed = await supabase
              .from('staff_members')
              .select('*')
              .eq('auth_user_id', authUserId)
              .single()
            if (!refreshed?.error && refreshed?.data) {
              setStaffProfile(refreshed.data)
            }
          }
        } catch (e) {
          console.warn('Trial enforcement check failed (non-fatal):', e?.message || e)
        }
        // Load memberships after profile is loaded
        await loadMemberships(data.id)
      }
    } catch (error) {
      console.error('❌ Exception loading staff profile:', error)
      if (error.message?.includes('timeout')) {
        console.error('⚠️ Query timed out - this might be an RLS issue or network problem')
        console.error('💡 Check:')
        console.error('   1. Is the staff member linked to this auth user?')
        console.error('   2. Are RLS policies correctly configured?')
        console.error('   3. Is the database accessible?')
      }
      setStaffProfile(null)
      setMemberships([])
      setActiveOrgId(null)
      setActiveMembership(null)
      setLoading(false)
    }
  }

  // Expose a safe refresh helper for post-checkout sync
  const refreshStaffProfile = async () => {
    if (!user?.id) return { error: { message: 'Not authenticated' } }
    await loadStaffProfile(user.id)
    return { error: null }
  }

  // Real-time: keep staff profile synced (tier unlocks immediately after webhook)
  useEffect(() => {
    if (!supabase || !user?.id) return

    // Clean up any prior channel
    if (staffRealtimeChannel) {
      try {
        supabase.removeChannel(staffRealtimeChannel)
      } catch (_e) {
        // ignore
      }
      setStaffRealtimeChannel(null)
    }

    // Subscribe to updates on this user's staff_members row
    const channel = supabase
      .channel(`staff-members-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'staff_members',
          filter: `auth_user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload?.new) {
            setStaffProfile((prev) => ({ ...(prev || {}), ...(payload.new || {}) }))
          }
        }
      )
      .subscribe()

    setStaffRealtimeChannel(channel)

    return () => {
      try {
        supabase.removeChannel(channel)
      } catch (_e) {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Load user memberships
  const loadMemberships = async (staffId) => {
    if (!supabase || !staffId) {
      setMemberships([])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('get_user_memberships', {
        user_id_param: staffId
      })

      if (error) {
        console.error('Error loading memberships:', error)
        console.warn('⚠️ Memberships table may not exist yet. Falling back to legacy organization_id.')
        
        // Fallback: Use legacy organization_id from staffProfile if memberships don't exist
        if (staffProfile?.organization_id) {
          const legacyOrgId = staffProfile.organization_id
          const legacyMembership = {
            membership_id: 'legacy',
            organization_id: legacyOrgId,
            organization_name: staffProfile.organization_name || 'Default Label',
            role: staffProfile.role || 'Scout',
            permissions_json: {
              can_vote: staffProfile.can_vote ?? true,
              can_set_energy: staffProfile.can_set_energy ?? true,
              can_advance_lobby: staffProfile.can_advance_lobby ?? true,
              can_advance_office: staffProfile.can_advance_office ?? false,
              can_advance_contract: staffProfile.can_advance_contract ?? false,
              can_access_archive: staffProfile.can_access_archive ?? true,
              can_access_vault: staffProfile.can_access_vault ?? true,
              can_edit_release_date: staffProfile.can_edit_release_date ?? false,
              can_view_metrics: staffProfile.can_view_metrics ?? false,
            },
            is_active: true,
          }
          setMemberships([legacyMembership])
          await switchOrganization(legacyOrgId)
          return
        }
        
        setMemberships([])
        setLoading(false)
        return
      }

      const membershipsList = data || []
      setMemberships(membershipsList)

      // If no memberships, user should see welcome page
      if (membershipsList.length === 0) {
        setActiveOrgId(null)
        setActiveMembership(null)
        setLoading(false)
        return { hasMemberships: false }
      }

      // DATABASE SESSION AUDIT: Agent-Centric initialization for ALL users (not just admin)
      // User starts in Personal view (activeOrgId is null) and can access Personal Inbox/Rolodex
      // This ensures Personal Office state is correctly initialized for non-admin users
      // User can then select a Label workspace from launchpad if they have memberships
      setActiveOrgId(null)
      setActiveMembership(null)
      setLoading(false)

      return { hasMemberships: true }
    } catch (error) {
      console.error('Exception loading memberships:', error)
      
      // LAYOUT UNIFICATION: Legacy fallback - but still start in Personal view
      // Only use legacy organization_id if memberships completely fail AND user has legacy org
      // Even then, we should start in Personal view and let user choose
      if (staffProfile?.organization_id) {
        const legacyOrgId = staffProfile.organization_id
        const legacyMembership = {
          membership_id: 'legacy',
          organization_id: legacyOrgId,
          organization_name: staffProfile.organization_name || 'Default Label',
          role: staffProfile.role || 'Scout',
          permissions_json: {
            can_vote: staffProfile.can_vote ?? true,
            can_set_energy: staffProfile.can_set_energy ?? true,
            can_advance_lobby: staffProfile.can_advance_lobby ?? true,
            can_advance_office: staffProfile.can_advance_office ?? false,
            can_advance_contract: staffProfile.can_advance_contract ?? false,
            can_access_archive: staffProfile.can_access_archive ?? true,
            can_access_vault: staffProfile.can_access_vault ?? true,
            can_edit_release_date: staffProfile.can_edit_release_date ?? false,
            can_view_metrics: staffProfile.can_view_metrics ?? false,
          },
          is_active: true,
        }
        setMemberships([legacyMembership])
        // LAYOUT UNIFICATION: Start in Personal view even with legacy org
        // User can switch to label workspace from launchpad if needed
        setActiveOrgId(null)
        setActiveMembership(null)
        setLoading(false)
        return { hasMemberships: true }
      }
      
      setMemberships([])
      setActiveOrgId(null)
      setActiveMembership(null)
      setLoading(false)
    }
  }

  // Clear workspace - set to Personal view (activeOrgId = null)
  const clearWorkspace = () => {
    setActiveOrgId(null)
    setActiveMembership(null)
    localStorage.removeItem('active_org_id')
    return { error: null }
  }

  // Switch active organization
  const switchOrganization = async (orgId) => {
    if (!supabase || !staffProfile) {
      return { error: { message: 'Not authenticated' } }
    }

    try {
      // If orgId is null, clear workspace (Personal view)
      if (orgId === null) {
        return clearWorkspace()
      }

      // If SystemAdmin and orgId is 'GLOBAL', allow global view
      if (orgId === 'GLOBAL' && staffProfile.role === 'SystemAdmin') {
        setActiveOrgId(null)
        setActiveMembership(null)
        localStorage.setItem('active_org_id', 'GLOBAL')
        return { error: null }
      }

      // Get active membership for this org
      const { data, error } = await supabase.rpc('get_active_membership', {
        user_id_param: staffProfile.id,
        org_id_param: orgId
      })

      if (error) {
        console.error('Error getting active membership:', error)
        return { error }
      }

      if (!data || data.length === 0) {
        return { error: { message: 'No active membership found for this organization' } }
      }

      const membership = data[0]
      setActiveOrgId(orgId)
      setActiveMembership(membership)
      localStorage.setItem('active_org_id', orgId)

      return { error: null }
    } catch (error) {
      console.error('Exception switching organization:', error)
      return { error }
    }
  }

  // Sign up with name, email and password
  // Optional: pass pendingTier + pendingBillingInterval so the user can "Finish Upgrading" later
  const signUp = async (name, email, password, options = {}) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } }
    }

    try {
      const pendingTier = options?.pendingTier
      const pendingBillingInterval = options?.pendingBillingInterval

      // Create auth user first (no DB writes here; email confirmation may mean no session yet)
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${siteUrl}/?confirmed=true`,
          data: {
            name: name,
            ...(pendingTier ? { pending_tier: pendingTier } : {}),
            ...(pendingBillingInterval ? { pending_billing_interval: pendingBillingInterval } : {}),
          },
        },
      })

      if (authError) {
        // Handle specific Supabase errors
        if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
          return { error: { message: 'An account with this email already exists. Please sign in instead.' } }
        }
        return { error: authError }
      }

      if (!authData.user) {
        return { error: { message: 'Failed to create user account' } }
      }

      return { data: authData, error: null }
    } catch (error) {
      console.error('Exception during signup:', error)
      return { error: { message: error.message || 'An unexpected error occurred during sign up' } }
    }
  }

  // Sign in with email and password
  const signIn = async (email, password) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      if (data.user) {
        await loadStaffProfile(data.user.id)
      }

      return { data, error: null }
    } catch (error) {
      return { error }
    }
  }

  // Sign out
  const signOut = async () => {
    if (!supabase) {
      // Even if Supabase isn't configured, clear local state
      setUser(null)
      setStaffProfile(null)
      setSession(null)
      return { error: null }
    }

    try {
      // Try to sign out, but don't fail if there's no session
      const { error } = await supabase.auth.signOut()
      
      // Clear local state regardless of error
      setUser(null)
      setStaffProfile(null)
      setMemberships([])
      setActiveOrgId(null)
      setActiveMembership(null)
      setSession(null)
      
      if (error && !error.message?.includes('session')) {
        // Only return error if it's not a session-related error
        return { error }
      }
      
      return { error: null }
    } catch (error) {
      // Clear local state even on error
      setUser(null)
      setStaffProfile(null)
      setSession(null)
      
      // Only return error if it's not about missing session
      if (error.message?.includes('session')) {
        return { error: null }
      }
      return { error }
    }
  }

  // Update staff profile
  const updateStaffProfile = async (updates) => {
    if (!supabase || !staffProfile) {
      return { error: { message: 'Not authenticated' } }
    }

    try {
      const { data, error } = await supabase
        .from('staff_members')
        .update(updates)
        .eq('id', staffProfile.id)
        .select()
        .single()

      if (error) {
        return { error }
      }

      setStaffProfile(data)
      return { data, error: null }
    } catch (error) {
      return { error }
    }
  }

  // Check if user has permission (based on active membership)
  // Agent-Centric: In Personal view (activeOrgId is null), user has full Owner permissions
  const hasPermission = (requiredRoles) => {
    // Personal view: Full Owner permissions by default
    if (activeOrgId === null) {
      return true
    }
    
    if (!activeMembership) return false
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(activeMembership.role)
    }
    return activeMembership.role === requiredRoles
  }

  // Check if user can advance tracks beyond Second Listen
  const canAdvanceBeyondSecondListen = () => {
    return hasPermission(['Owner', 'Manager'])
  }

  // Granular permission checks (from active membership)
  // Agent-Centric: In Personal view (activeOrgId is null), user has full Owner permissions
  const canVote = () => {
    if (activeOrgId === null) return true // Personal view: full permissions
    if (!activeMembership) return false
    return activeMembership.permissions_json?.can_vote ?? true
  }

  const canSetEnergy = () => {
    if (activeOrgId === null) return true // Personal view: full permissions
    if (!activeMembership) return false
    return activeMembership.permissions_json?.can_set_energy ?? true
  }

  const canAdvanceLobby = () => {
    if (activeOrgId === null) return true // Personal view: full permissions
    if (!activeMembership) return false
    return activeMembership.permissions_json?.can_advance_lobby ?? true
  }

  const canAdvanceOffice = () => {
    if (activeOrgId === null) return true // Personal view: full permissions
    if (!activeMembership) return false
    return activeMembership.permissions_json?.can_advance_office ?? false
  }

  const canAdvanceContract = () => {
    if (activeOrgId === null) return true // Personal view: full permissions
    if (!activeMembership) return false
    return activeMembership.permissions_json?.can_advance_contract ?? false
  }

  const canAccessArchive = () => {
    if (activeOrgId === null) return true // Personal view: full permissions
    if (!activeMembership) return false
    return activeMembership.permissions_json?.can_access_archive ?? true
  }

  const canAccessVault = () => {
    if (activeOrgId === null) return true // Personal view: full permissions
    if (!activeMembership) return false
    return activeMembership.permissions_json?.can_access_vault ?? true
  }

  const canEditReleaseDate = () => {
    if (activeOrgId === null) return true // Personal view: full permissions
    if (!activeMembership) return false
    return activeMembership.permissions_json?.can_edit_release_date ?? false
  }

  const canViewMetrics = () => {
    if (activeOrgId === null) return true // Personal view: full permissions
    if (!activeMembership) return false
    return activeMembership.permissions_json?.can_view_metrics ?? false
  }

  // Background enforcement: if a trial expires while the app is open, downgrade/activate without requiring a full reload.
  useEffect(() => {
    if (!supabase || !user?.id) return
    if (staffProfile?.user_status !== 'trialing' || !staffProfile?.trial_ends_at) return

    const interval = setInterval(async () => {
      try {
        const { data: enforceData } = await supabase.rpc('enforce_personal_trial_status')
        if (enforceData?.downgraded) {
          sessionStorage.setItem('trial_just_expired', '1')
        }
        if (enforceData?.downgraded || enforceData?.activated) {
          const refreshed = await supabase
            .from('staff_members')
            .select('*')
            .eq('auth_user_id', user.id)
            .single()
          if (!refreshed?.error && refreshed?.data) {
            setStaffProfile(refreshed.data)
          }
        }
      } catch (_e) {
        // ignore periodic failures
      }
    }, 5 * 60 * 1000) // every 5 minutes

    return () => clearInterval(interval)
  }, [staffProfile?.user_status, staffProfile?.trial_ends_at, user?.id])

  const value = {
    user,
    staffProfile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateStaffProfile,
    hasPermission,
    canAdvanceBeyondSecondListen,
    canVote,
    canSetEnergy,
    canAdvanceLobby,
    canAdvanceOffice,
    canAdvanceContract,
    canAccessArchive,
    canAccessVault,
    canEditReleaseDate,
    canViewMetrics,
    memberships,
    activeOrgId,
    activeMembership,
    switchOrganization,
    clearWorkspace, // Export for clearing workspace to Personal view
    loadMemberships, // Export for refreshing memberships
    refreshStaffProfile,
    // Agent-Centric: In Personal view, user is effectively Owner
    isOwner: activeOrgId === null ? true : (activeMembership?.role === 'Owner'),
    isManager: activeOrgId === null ? false : (activeMembership?.role === 'Manager'),
    isScout: activeOrgId === null ? false : (activeMembership?.role === 'Scout'),
    isSystemAdmin: staffProfile?.role === 'SystemAdmin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
