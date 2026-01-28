import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useApp } from './context/AppContext'
import { BillingProvider } from './context/BillingContext'
import ErrorBoundary from './components/ErrorBoundary'
import Sidebar from './components/Sidebar'
import MobileLayout from './components/MobileLayout'
import { Loader2 } from 'lucide-react'
import Diagnostics from './components/Diagnostics'

/** Syncs URL to activeOrganizationId: /labels/:orgId -> set org; /personal/* -> set null. */
function WorkspaceRouteSync() {
  const location = useLocation()
  const { pathname } = location
  const { switchOrganization, clearWorkspace, activeOrgId, memberships } = useAuth()
  const lastPathRef = useRef(null)

  useEffect(() => {
    if (lastPathRef.current === pathname) return
    lastPathRef.current = pathname

    const labelsMatch = pathname.match(/^\/labels\/([^/]+)/)
    if (labelsMatch) {
      const orgId = labelsMatch[1]
      const hasMembership = memberships?.some((m) => m.organization_id === orgId)
      if (hasMembership && activeOrgId !== orgId) {
        switchOrganization(orgId)
      }
      return
    }

    if (pathname.startsWith('/personal/')) {
      if (activeOrgId !== null) {
        clearWorkspace()
      }
    }
  }, [pathname, activeOrgId, memberships, switchOrganization, clearWorkspace])

  return null
}

/** Renders Dashboard for /labels/:orgId only if user has membership; otherwise redirects to launchpad. */
function LabelDashboardGuard() {
  const { orgId } = useParams()
  const { memberships } = useAuth()
  const hasMembership = memberships?.some((m) => m.organization_id === orgId)
  if (!orgId || !hasMembership) {
    return <Navigate to="/launchpad" replace />
  }
  return (
    <MobileLayout showBottomNav={true}>
      <ErrorBoundary>
        <Dashboard />
      </ErrorBoundary>
    </MobileLayout>
  )
}

// Lazy load pages for better performance
const Landing = lazy(() => import('./pages/Landing'))
const SignUp = lazy(() => import('./pages/SignUp'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Launchpad = lazy(() => import('./pages/Launchpad'))
const PersonalOffice = lazy(() => import('./pages/PersonalOffice'))
const PersonalOfficeSubmitted = lazy(() => import('./pages/PersonalOfficeSubmitted'))
const PersonalOfficeSigned = lazy(() => import('./pages/PersonalOfficeSigned'))
const PersonalPitched = lazy(() => import('./pages/PersonalPitched'))
const PersonalSigned = lazy(() => import('./pages/PersonalSigned'))
const ArtistDirectory = lazy(() => import('./pages/ArtistDirectory'))
const StaffAdmin = lazy(() => import('./pages/StaffAdmin'))
const StaffManagement = lazy(() => import('./pages/StaffManagement'))
const PhaseDetailView = lazy(() => import('./pages/PhaseDetailView'))
const Calendar = lazy(() => import('./pages/Calendar'))
const Upcoming = lazy(() => import('./pages/Upcoming'))
const Vault = lazy(() => import('./pages/Vault'))
const PopulateTestData = lazy(() => import('./pages/PopulateTestData'))
const GlobalPulse = lazy(() => import('./pages/GlobalPulse'))
const Billing = lazy(() => import('./pages/Billing'))
const PlanInfo = lazy(() => import('./pages/PlanInfo'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const ApiKeys = lazy(() => import('./pages/ApiKeys'))
const Webhooks = lazy(() => import('./pages/Webhooks'))
const PublicForm = lazy(() => import('./components/PublicForm'))
const NotFound = lazy(() => import('./pages/NotFound'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const DataExport = lazy(() => import('./pages/DataExport'))
const DeleteAccount = lazy(() => import('./pages/DeleteAccount'))
const HelpCenter = lazy(() => import('./pages/HelpCenter'))
const FAQ = lazy(() => import('./pages/FAQ'))
const Contact = lazy(() => import('./pages/Contact'))
const SecuritySettings = lazy(() => import('./pages/SecuritySettings'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const HealthCheck = lazy(() => import('./pages/HealthCheck'))
const SupportWidget = lazy(() => import('./components/SupportWidget'))

// Loading fallback component
const PageLoader = () => (
  <div className="flex min-h-screen bg-gray-950 items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      <p className="text-gray-400">Loading...</p>
    </div>
  </div>
)

function AppContent() {
  const { loading: authLoading, user, staffProfile, memberships, activeOrgId } = useAuth()
  const { loading: appLoading } = useApp()
  const [hasPersonalInbox, setHasPersonalInbox] = useState(false)
  const [checkingPersonalInbox, setCheckingPersonalInbox] = useState(true)

  // Determine default route - Agent-Centric: route to launchpad if activeOrgId is null
  // Use useMemo to prevent route from changing during renders
  const defaultRoute = useMemo(() => {
    if (!memberships || memberships.length === 0) {
      return '/launchpad'
    }
    // Agent-Centric: If no active organization, user is in Personal view -> launchpad
    if (activeOrgId === null) {
      return '/launchpad'
    }
    // If activeOrgId is set, they're in a Label workspace -> context-aware URL
    return `/labels/${activeOrgId}`
  }, [memberships, activeOrgId])

  // Add timeout fallback to prevent infinite loading
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading || appLoading) {
        setShowTimeoutMessage(true)
        console.error('⚠️ Loading timeout - check console for errors')
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [authLoading, appLoading])

  // Check if user has personal inbox tracks
  useEffect(() => {
    const checkPersonalInbox = async () => {
      if (!user || !staffProfile || !memberships || memberships.length === 0) {
        setHasPersonalInbox(false)
        setCheckingPersonalInbox(false)
        return
      }

      try {
        const { supabase } = await import('./lib/supabaseClient')
        if (!supabase) {
          setHasPersonalInbox(false)
          setCheckingPersonalInbox(false)
          return
        }

        const { count, error } = await supabase
          .from('tracks')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_user_id', staffProfile.id)
          .is('organization_id', null)
          .eq('archived', false)

        if (error) {
          console.error('Error checking personal inbox:', error)
          setHasPersonalInbox(false)
        } else {
          setHasPersonalInbox((count || 0) > 0)
        }
      } catch (error) {
        console.error('Error checking personal inbox:', error)
        setHasPersonalInbox(false)
      } finally {
        setCheckingPersonalInbox(false)
      }
    }

    if (!authLoading && !appLoading && user && staffProfile) {
      checkPersonalInbox()
    }
  }, [user, staffProfile, memberships, authLoading, appLoading])

  // Show login if not authenticated
  if (authLoading || appLoading) {
    return (
      <div className="flex min-h-screen bg-gray-950 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          <p className="text-gray-400">Loading SoundPath...</p>
          {showTimeoutMessage && (
            <>
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg max-w-md">
                <p className="text-red-400 text-sm font-semibold mb-2">Loading timeout detected</p>
                <p className="text-gray-300 text-xs">
                  Check the browser console (F12) for errors. Common issues:
                </p>
                <ul className="text-gray-400 text-xs mt-2 list-disc list-inside">
                  <li>Supabase credentials not configured (.env file missing)</li>
                  <li>Database connection error</li>
                  <li>RLS policies blocking access</li>
                </ul>
              </div>
              <Diagnostics />
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {/* IMPORTANT: ErrorBoundary must be inside Router so its fallback can navigate safely */}
      <ErrorBoundary>
        <WorkspaceRouteSync />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={!user || !staffProfile ? <Landing /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/signup" element={!user || !staffProfile ? <SignUp /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/onboarding" element={!user || !staffProfile ? <Onboarding /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/submit/:targetType/:targetSlug" element={<PublicForm />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/plan/:planId" element={<PlanInfo />} />
        
        {/* Protected Routes */}
        {user && staffProfile ? (
          <>
            {/* Launchpad - Universal A&R Launchpad (No Sidebar - Lobby View) */}
            <Route path="/launchpad" element={
              <ErrorBoundary>
                <Launchpad />
              </ErrorBoundary>
            } />
            
            {/* Redirect old Personal Office routes to context-aware URLs */}
            <Route path="/personal-office" element={<Navigate to="/personal/dashboard" replace />} />
            <Route path="/personal-office/submitted" element={<Navigate to="/personal/dashboard" replace />} />
            <Route path="/personal-office/signed" element={<Navigate to="/personal/signed" replace />} />
            
            {/* Personal Workspace: /personal/dashboard (activeOrganizationId = NULL) */}
            <Route path="/personal/dashboard" element={
              (!memberships || memberships.length === 0) ? (
                <Navigate to="/launchpad" />
              ) : (
                <MobileLayout showBottomNav={true}>
                  <ErrorBoundary>
                    <Dashboard />
                  </ErrorBoundary>
                </MobileLayout>
              )
            } />
            <Route path="/personal/pitched" element={
              (!memberships || memberships.length === 0) ? (
                <Navigate to="/launchpad" />
              ) : activeOrgId !== null ? (
                <Navigate to={`/labels/${activeOrgId}`} replace />
              ) : (
                <MobileLayout showBottomNav={true}>
                  <PersonalPitched />
                </MobileLayout>
              )
            } />
            <Route path="/personal/signed" element={
              (!memberships || memberships.length === 0) ? (
                <Navigate to="/launchpad" />
              ) : activeOrgId !== null ? (
                <Navigate to={`/labels/${activeOrgId}`} replace />
              ) : (
                <MobileLayout showBottomNav={true}>
                  <PersonalSigned />
                </MobileLayout>
              )
            } />
            
            {/* Label Workspace: /labels/:orgId (activeOrganizationId from URL) */}
            <Route path="/labels/:orgId" element={
              (!memberships || memberships.length === 0) ? (
                <Navigate to="/launchpad" />
              ) : (
                <LabelDashboardGuard />
              )
            } />
            
            {/* Removed generic /dashboard to prevent data collisions; redirect to launchpad */}
            <Route path="/dashboard" element={<Navigate to="/launchpad" replace />} />
            <Route path="/phase/:phaseId" element={
              memberships?.length === 0 ? (
                <Navigate to="/launchpad" />
              ) : activeOrgId === null ? (
                <Navigate to="/launchpad" />
              ) : (
                <MobileLayout>
                  <PhaseDetailView />
                </MobileLayout>
              )
            } />
            <Route path="/artists" element={
              memberships?.length === 0 ? (
                <Navigate to="/launchpad" />
              ) : (
                <MobileLayout showBottomNav={true}>
                  <ArtistDirectory />
                </MobileLayout>
              )
            } />
            <Route path="/admin" element={
              memberships?.length === 0 ? (
                <Navigate to="/launchpad" />
              ) : (
                <MobileLayout>
                  <StaffAdmin />
                </MobileLayout>
              )
            } />
            <Route path="/admin/staff" element={
              memberships?.length === 0 ? (
                <Navigate to="/launchpad" />
              ) : (
                <MobileLayout>
                  <StaffManagement />
                </MobileLayout>
              )
            } />
            <Route path="/calendar" element={
              memberships?.length === 0 ? (
                <Navigate to="/launchpad" />
              ) : (
                <MobileLayout>
                  <Calendar />
                </MobileLayout>
              )
            } />
            <Route path="/upcoming" element={
              memberships?.length === 0 ? (
                <Navigate to="/launchpad" />
              ) : (
                <MobileLayout>
                  <Upcoming />
                </MobileLayout>
              )
            } />
            <Route path="/vault" element={
              memberships?.length === 0 ? (
                <Navigate to="/launchpad" />
              ) : (
                <MobileLayout>
                  <Vault />
                </MobileLayout>
              )
            } />
            <Route path="/billing" element={
              <MobileLayout>
                <Billing />
              </MobileLayout>
            } />
            <Route path="/api-keys" element={
              memberships?.length === 0 ? (
                <Navigate to="/launchpad" />
              ) : (
                <MobileLayout>
                  <ApiKeys />
                </MobileLayout>
              )
            } />
            <Route path="/webhooks" element={
              memberships?.length === 0 ? (
                <Navigate to="/launchpad" />
              ) : (
                <MobileLayout>
                  <Webhooks />
                </MobileLayout>
              )
            } />
            <Route path="/data-export" element={
              <MobileLayout>
                <DataExport />
              </MobileLayout>
            } />
            <Route path="/delete-account" element={
              <MobileLayout>
                <DeleteAccount />
              </MobileLayout>
            } />
            <Route path="/security" element={
              <MobileLayout>
                <SecuritySettings />
              </MobileLayout>
            } />
            <Route path="/health" element={<HealthCheck />} />
            <Route path="/populate" element={
                <MobileLayout>
                  <PopulateTestData />
                </MobileLayout>
            } />
            <Route path="/god-mode" element={
              staffProfile?.role === 'SystemAdmin' ? (
                <GlobalPulse />
              ) : (
                <Navigate to="/launchpad" />
              )
            } />
            <Route path="/admin/dashboard" element={
              staffProfile?.role === 'SystemAdmin' ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/launchpad" />
              )
            } />
            <Route path="*" element={<NotFound />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/" />} />
        )}
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BillingProvider>
          <Suspense fallback={null}>
            <SupportWidget />
          </Suspense>
          <AppContent />
        </BillingProvider>
      </AppProvider>
    </AuthProvider>
  )
}

export default App
