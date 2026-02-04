import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from 'react-router-dom'
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useApp } from './context/AppContext'
import { BillingProvider } from './context/BillingContext'
import ErrorBoundary from './components/ErrorBoundary'
import Sidebar from './components/Sidebar'
import MobileLayout from './components/MobileLayout'
import { Loader2 } from 'lucide-react'
import Diagnostics from './components/Diagnostics'

/** Syncs URL to activeOrganizationId: /labels/:orgId or /app/label/labels/:orgId -> set org; /personal/* or /app/label/personal/* -> set null. */
function WorkspaceRouteSync() {
  const location = useLocation()
  const { pathname } = location
  const { switchOrganization, clearWorkspace, activeOrgId, memberships } = useAuth()
  const lastPathRef = useRef(null)

  useEffect(() => {
    if (lastPathRef.current === pathname) return
    lastPathRef.current = pathname

    const labelsMatch = pathname.match(/^\/(?:app\/label\/)?labels\/([^/]+)/)
    if (labelsMatch) {
      const orgId = labelsMatch[1]
      const hasMembership = memberships?.some(m => m.organization_id === orgId)
      if (hasMembership && activeOrgId !== orgId) {
        switchOrganization(orgId)
      }
      return
    }

    if (pathname.startsWith('/personal/') || pathname.startsWith('/app/label/personal/')) {
      if (activeOrgId !== null) {
        clearWorkspace()
      }
    }
  }, [pathname, activeOrgId, memberships, switchOrganization, clearWorkspace])

  return null
}

/** Redirect /labels/:orgId to /app/label/labels/:orgId (legacy URL support). */
function RedirectLabelsToApp() {
  const { orgId } = useParams()
  return <Navigate to={`/app/label/labels/${orgId}`} replace />
}

/** Redirect /phase/:phaseId to /app/label/phase/:phaseId (legacy URL support). */
function RedirectPhaseToApp() {
  const { phaseId } = useParams()
  return <Navigate to={`/app/label/phase/${phaseId}`} replace />
}

/** Renders Dashboard for /labels/:orgId or /app/label/labels/:orgId; redirects to /app/label/launchpad if no membership. */
function LabelDashboardGuard() {
  const { orgId } = useParams()
  const { memberships } = useAuth()
  const hasMembership = memberships?.some(m => m.organization_id === orgId)
  if (!orgId || !hasMembership) {
    return <Navigate to="/app/label/launchpad" replace />
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
const ComingSoonApp = lazy(() => import('./pages/ComingSoonApp'))

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

  // Determine default route - Music Industry OS: /app/label/launchpad or /app/label/labels/:id
  const defaultRoute = useMemo(() => {
    if (!memberships || memberships.length === 0) {
      return '/app/label/launchpad'
    }
    if (activeOrgId === null) {
      return '/app/label/launchpad'
    }
    return `/app/label/labels/${activeOrgId}`
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
            <Route
              path="/"
              element={
                !user || !staffProfile ? <Landing /> : <Navigate to={defaultRoute} replace />
              }
            />
            <Route
              path="/signup"
              element={!user || !staffProfile ? <SignUp /> : <Navigate to={defaultRoute} replace />}
            />
            <Route
              path="/onboarding"
              element={
                !user || !staffProfile ? <Onboarding /> : <Navigate to={defaultRoute} replace />
              }
            />
            <Route path="/submit/:targetType/:targetSlug" element={<PublicForm />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route
              path="/help"
              element={
                user && staffProfile ? (
                  <MobileLayout>
                    <HelpCenter />
                  </MobileLayout>
                ) : (
                  <HelpCenter />
                )
              }
            />
            <Route
              path="/faq"
              element={
                user && staffProfile ? (
                  <MobileLayout>
                    <FAQ />
                  </MobileLayout>
                ) : (
                  <FAQ />
                )
              }
            />
            <Route
              path="/contact"
              element={
                user && staffProfile ? (
                  <MobileLayout>
                    <Contact />
                  </MobileLayout>
                ) : (
                  <Contact />
                )
              }
            />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/plan/:planId" element={<PlanInfo />} />

            {/* Protected Routes - Music Industry OS: /app/label, /app/venue, /app/artist, /app/settings */}
            {user && staffProfile ? (
              <>
                {/* Legacy path redirects to /app/* */}
                <Route path="/launchpad" element={<Navigate to="/app/label/launchpad" replace />} />
                <Route path="/dashboard" element={<Navigate to="/app/label/launchpad" replace />} />
                <Route path="/personal-office" element={<Navigate to="/app/label/personal/dashboard" replace />} />
                <Route path="/personal-office/submitted" element={<Navigate to="/app/label/personal/dashboard" replace />} />
                <Route path="/personal-office/signed" element={<Navigate to="/app/label/personal/signed" replace />} />
                <Route path="/labels/:orgId" element={<RedirectLabelsToApp />} />
                <Route path="/billing" element={<Navigate to="/app/settings/billing" replace />} />
                <Route path="/security" element={<Navigate to="/app/settings/security" replace />} />
                <Route path="/data-export" element={<Navigate to="/app/settings/data-export" replace />} />
                <Route path="/delete-account" element={<Navigate to="/app/settings/delete-account" replace />} />
                <Route path="/artists" element={<Navigate to="/app/label/artists" replace />} />
                <Route path="/admin" element={<Navigate to="/app/label/admin" replace />} />
                <Route path="/admin/staff" element={<Navigate to="/app/label/admin/staff" replace />} />
                <Route path="/calendar" element={<Navigate to="/app/label/calendar" replace />} />
                <Route path="/upcoming" element={<Navigate to="/app/label/upcoming" replace />} />
                <Route path="/vault" element={<Navigate to="/app/label/vault" replace />} />
                <Route path="/api-keys" element={<Navigate to="/app/label/api-keys" replace />} />
                <Route path="/webhooks" element={<Navigate to="/app/label/webhooks" replace />} />
                <Route path="/phase/:phaseId" element={<RedirectPhaseToApp />} />
                <Route path="/personal/dashboard" element={<Navigate to="/app/label/personal/dashboard" replace />} />
                <Route path="/personal/pitched" element={<Navigate to="/app/label/personal/pitched" replace />} />
                <Route path="/personal/signed" element={<Navigate to="/app/label/personal/signed" replace />} />
                <Route path="/populate" element={<Navigate to="/app/label/populate" replace />} />
                <Route path="/god-mode" element={<Navigate to="/app/label/god-mode" replace />} />
                <Route path="/admin/dashboard" element={<Navigate to="/app/label/admin/dashboard" replace />} />

                {/* App root: redirect to Label launchpad */}
                <Route path="/app" element={<Navigate to={defaultRoute} replace />} />
                <Route path="/app/label" element={<Navigate to="/app/label/launchpad" replace />} />

                {/* Venue & Artist - Coming Soon (placeholder + modal) */}
                <Route path="/app/venue" element={<ComingSoonApp appName="Venue" />} />
                <Route path="/app/artist" element={<ComingSoonApp appName="Artist" />} />

                {/* Label app routes */}
                <Route path="/app/label/launchpad" element={<ErrorBoundary><Launchpad /></ErrorBoundary>} />
                <Route path="/app/label/labels/:orgId" element={!memberships || memberships.length === 0 ? <Navigate to="/app/label/launchpad" /> : <LabelDashboardGuard />} />
                <Route path="/app/label/personal/dashboard" element={<MobileLayout showBottomNav={true}><ErrorBoundary><Dashboard /></ErrorBoundary></MobileLayout>} />
                <Route path="/app/label/personal/pitched" element={activeOrgId !== null ? <Navigate to={`/app/label/labels/${activeOrgId}`} replace /> : <MobileLayout showBottomNav={true}><PersonalPitched /></MobileLayout>} />
                <Route path="/app/label/personal/signed" element={activeOrgId !== null ? <Navigate to={`/app/label/labels/${activeOrgId}`} replace /> : <MobileLayout showBottomNav={true}><PersonalSigned /></MobileLayout>} />
                <Route path="/app/label/phase/:phaseId" element={memberships?.length === 0 || activeOrgId === null ? <Navigate to="/app/label/launchpad" /> : <MobileLayout><PhaseDetailView /></MobileLayout>} />
                <Route path="/app/label/artists" element={<MobileLayout showBottomNav={true}><ArtistDirectory /></MobileLayout>} />
                <Route path="/app/label/admin" element={memberships?.length === 0 ? <Navigate to="/app/label/launchpad" /> : <MobileLayout><StaffAdmin /></MobileLayout>} />
                <Route path="/app/label/admin/staff" element={memberships?.length === 0 ? <Navigate to="/app/label/launchpad" /> : <MobileLayout><StaffManagement /></MobileLayout>} />
                <Route path="/app/label/calendar" element={memberships?.length === 0 ? <Navigate to="/app/label/launchpad" /> : <MobileLayout><Calendar /></MobileLayout>} />
                <Route path="/app/label/upcoming" element={memberships?.length === 0 ? <Navigate to="/app/label/launchpad" /> : <MobileLayout><Upcoming /></MobileLayout>} />
                <Route path="/app/label/vault" element={memberships?.length === 0 ? <Navigate to="/app/label/launchpad" /> : <MobileLayout><Vault /></MobileLayout>} />
                <Route path="/app/label/api-keys" element={memberships?.length === 0 ? <Navigate to="/app/label/launchpad" /> : <MobileLayout><ApiKeys /></MobileLayout>} />
                <Route path="/app/label/webhooks" element={memberships?.length === 0 ? <Navigate to="/app/label/launchpad" /> : <MobileLayout><Webhooks /></MobileLayout>} />
                <Route path="/app/label/populate" element={<MobileLayout><PopulateTestData /></MobileLayout>} />
                <Route path="/app/label/god-mode" element={staffProfile?.role === 'SystemAdmin' ? <GlobalPulse /> : <Navigate to="/app/label/launchpad" />} />
                <Route path="/app/label/admin/dashboard" element={staffProfile?.role === 'SystemAdmin' ? <AdminDashboard /> : <Navigate to="/app/label/launchpad" />} />

                {/* Settings app (unified Billing / Profile) */}
                <Route path="/app/settings" element={<Navigate to="/app/settings/billing" replace />} />
                <Route path="/app/settings/billing" element={<MobileLayout><Billing /></MobileLayout>} />
                <Route path="/app/settings/security" element={<MobileLayout><SecuritySettings /></MobileLayout>} />
                <Route path="/app/settings/data-export" element={<MobileLayout><DataExport /></MobileLayout>} />
                <Route path="/app/settings/delete-account" element={<MobileLayout><DeleteAccount /></MobileLayout>} />

                <Route path="/health" element={<HealthCheck />} />
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
