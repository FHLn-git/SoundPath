import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBilling } from '../context/BillingContext'
import { useAuth } from '../context/AuthContext'
import {
  CreditCard,
  Check,
  X,
  AlertCircle,
  Loader2,
  Download,
  Calendar,
  DollarSign,
  Sparkles,
  Shield,
  Zap,
  Infinity,
  Users,
  BarChart3,
  Webhook,
  Key,
  Globe,
  Mail,
  ArrowRight,
  HelpCircle,
  Package,
} from 'lucide-react'
import Toast from '../components/Toast'
import { handleSubscriptionChange, createBillingPortalSession } from '../lib/stripeClient'
import { AlphaOnlyTag, AlphaPricingContainer, AlphaStatusBanner } from '../components/AlphaPricing'

const Billing = () => {
  const navigate = useNavigate()
  const {
    subscription,
    plan,
    usage,
    invoices,
    paymentMethods,
    plans,
    loading,
    isActive,
    isTrial,
    getTrialDaysRemaining,
    getUsagePercentage,
    refresh,
  } = useBilling()
  const { activeMembership, activeOrgId, memberships } = useAuth()
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [billingInterval, setBillingInterval] = useState('month') // 'month' or 'year'

  const isOwner = activeMembership?.role === 'Owner'
  const hasMemberships = memberships && memberships.length > 0

  useEffect(() => {
    refresh()

    // Check for success/cancel from Stripe redirect
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true') {
      setToast({
        isVisible: true,
        message: 'Subscription updated successfully!',
        type: 'success',
      })
      // Clean up URL
      window.history.replaceState({}, '', '/billing')
      refresh()
    } else if (urlParams.get('canceled') === 'true') {
      setToast({
        isVisible: true,
        message: 'Checkout was canceled.',
        type: 'info',
      })
      // Clean up URL
      window.history.replaceState({}, '', '/billing')
    } else if (urlParams.get('subscribe')) {
      // Handle subscription from signup flow
      const planId = urlParams.get('subscribe')
      const interval = urlParams.get('interval') || 'month'
      setBillingInterval(interval)
      // Clean up URL
      window.history.replaceState({}, '', '/billing')
      // Start subscription flow
      setTimeout(() => {
        handleUpgrade(planId)
      }, 1000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  // Show plans even if no active organization
  const showPlans = true // Everyone can see plans

  const handleUpgrade = async newPlanId => {
    // If user has an organization, check if they're owner
    if (activeOrgId && !isOwner) {
      setToast({
        isVisible: true,
        message: 'Only organization owners can manage subscriptions',
        type: 'error',
      })
      return
    }

    try {
      setToast({
        isVisible: true,
        message: 'Redirecting to checkout...',
        type: 'info',
      })

      // Redirect to Stripe Checkout with selected billing interval
      // If no activeOrgId, handleSubscriptionChange will create a personal organization
      await handleSubscriptionChange(activeOrgId, newPlanId, billingInterval)
    } catch (error) {
      console.error('Error creating checkout session:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to start checkout. Please try again.',
        type: 'error',
      })
    }
  }

  const handleCancelSubscription = async () => {
    if (!isOwner) {
      setToast({
        isVisible: true,
        message: 'Only organization owners can manage subscriptions',
        type: 'error',
      })
      return
    }

    try {
      // Open Stripe Billing Portal for subscription management
      const portalUrl = await createBillingPortalSession(activeOrgId)
      window.location.href = portalUrl
    } catch (error) {
      console.error('Error opening billing portal:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to open billing portal. Please try again.',
        type: 'error',
      })
    }
  }

  const formatCurrency = amount => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = dateString => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
          {!hasMemberships && (
            <p className="text-gray-400 text-sm">
              View available subscription tiers. Create or join a label to subscribe to a plan.
            </p>
          )}
        </div>

        {toast.isVisible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, isVisible: false })}
          />
        )}

        {/* SoundPath One – Premier founding member tier (Alpha Pricing marketing box) */}
        <div className="mb-8">
          <AlphaPricingContainer>
            <div className="rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-os-bg to-os-bg px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-neon-purple to-recording-red flex items-center justify-center">
                  <Zap size={20} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-[10px] font-bold tracking-wider uppercase">Alpha</span>
                    <span className="text-xs text-gray-500 font-mono">SOUNDPATH ONE</span>
                  </div>
                  <h2 className="text-lg font-bold text-white">Premier founding member tier</h2>
                  <p className="text-sm text-gray-300 mt-1">
                    You’re on the Music Industry OS. Alpha pricing is temporary — lock in your rate now and get full access to Label and Venue today, with the Artist module coming soon.
                  </p>
                </div>
              </div>
            </div>
          </AlphaPricingContainer>
        </div>

        {/* Current Subscription - Only show if user has an active organization */}
        {activeOrgId && subscription && plan && (
          <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">Current Plan: {plan.name}</h2>
                <p className="text-gray-400">{plan.description}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {formatCurrency(plan.price_monthly)}
                  <span className="text-lg text-gray-400">/month</span>
                </div>
                {plan.price_yearly && (
                  <div className="text-sm text-gray-400">
                    or {formatCurrency(plan.price_yearly)}/year
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-sm text-gray-400 mb-1">Status</div>
                <div
                  className={`font-semibold ${
                    isActive()
                      ? 'text-green-400'
                      : subscription.status === 'past_due'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}
                >
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Current Period</div>
                <div className="font-semibold">{formatDate(subscription.current_period_end)}</div>
              </div>
              {isTrial() && (
                <div>
                  <div className="text-sm text-gray-400 mb-1">Trial Ends</div>
                  <div className="font-semibold text-yellow-400">
                    {getTrialDaysRemaining()} days remaining
                  </div>
                </div>
              )}
            </div>

            {isTrial() && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <div className="font-semibold text-yellow-400">Trial Period Active</div>
                    <div className="text-sm text-gray-300">
                      Your trial ends in {getTrialDaysRemaining()} days. Upgrade to continue using
                      SoundPath.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {subscription.status === 'past_due' && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <div className="font-semibold text-red-400">Payment Required</div>
                    <div className="text-sm text-gray-300">
                      Your subscription payment failed. Please update your payment method to
                      continue service.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isOwner && (
              <div className="flex gap-4">
                <button
                  onClick={handleCancelSubscription}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                >
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        )}

        {/* Usage Limits - Only show if user has an active organization */}
        {activeOrgId && usage && plan && (
          <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-gray-800">
            <h2 className="text-xl font-bold mb-4">Usage & Limits</h2>
            <div className="space-y-4">
              {/* Tracks Usage */}
              {plan.limits?.max_tracks && (
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">Tracks</span>
                    <span className="text-gray-400">
                      {usage.tracks_count || 0} /{' '}
                      {plan.limits.max_tracks === -1 ? '∞' : plan.limits.max_tracks}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, getUsagePercentage('max_tracks'))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Staff Usage */}
              {plan.limits?.max_staff && (
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">Staff Members</span>
                    <span className="text-gray-400">
                      {usage.staff_count || 0} /{' '}
                      {plan.limits.max_staff === -1 ? '∞' : plan.limits.max_staff}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, getUsagePercentage('max_staff'))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Storage Usage */}
              {plan.limits?.max_storage_mb && (
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">Storage</span>
                    <span className="text-gray-400">
                      {((usage.storage_bytes || 0) / 1024 / 1024).toFixed(2)} MB /{' '}
                      {plan.limits.max_storage_mb === -1 ? '∞' : `${plan.limits.max_storage_mb} MB`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, getUsagePercentage('max_storage_mb'))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* API Calls */}
              {plan.limits?.max_api_calls_per_month && plan.limits.max_api_calls_per_month > 0 && (
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">API Calls (Monthly)</span>
                    <span className="text-gray-400">
                      {usage.api_calls_count || 0} /{' '}
                      {plan.limits.max_api_calls_per_month === -1
                        ? '∞'
                        : plan.limits.max_api_calls_per_month}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, getUsagePercentage('max_api_calls_per_month'))}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Contacts (Artist Directory) */}
              {plan.limits?.max_contacts && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">Artist Directory Contacts</span>
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-gray-500 hover:text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                          <p className="font-semibold mb-1">Artist Directory Contacts</p>
                          <p className="text-gray-400">
                            {plan.id === 'agent'
                              ? "The number of unique artists (contacts) in your directory. Signed artists are unlimited and don't count toward this limit."
                              : 'The number of unique artists (contacts) in your Artist Directory. Each artist you track counts as one contact.'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <span className="text-gray-400">
                      {usage.contacts_count || 0} /{' '}
                      {plan.limits.max_contacts === -1 ? '∞' : plan.limits.max_contacts}
                      {plan.id === 'agent' && (
                        <span className="text-xs text-gray-500 ml-1">(unlimited signed)</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, getUsagePercentage('max_contacts'))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Vault Tracks */}
              {plan.limits?.max_vault_tracks && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">The Vault Tracks</span>
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-gray-500 hover:text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                          <p className="font-semibold mb-1">The Vault Tracks</p>
                          <p className="text-gray-400">
                            The number of released tracks stored in The Vault. Tracks automatically
                            move to The Vault when their release date arrives. This is your archive
                            of completed releases.
                          </p>
                        </div>
                      </div>
                    </div>
                    <span className="text-gray-400">
                      {usage.vault_tracks_count || 0} /{' '}
                      {plan.limits.max_vault_tracks === -1 ? '∞' : plan.limits.max_vault_tracks}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, getUsagePercentage('max_vault_tracks'))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Available Plans - Visible to Everyone */}
        <AlphaPricingContainer className="mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 relative">
            <div className="mb-6">
              <AlphaStatusBanner className="border-amber-400/35" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Available Plans</h2>
              {/* Billing Interval Toggle */}
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm ${billingInterval === 'month' ? 'text-white font-medium' : 'text-gray-400'}`}
                >
                  Monthly
                </span>
                <button
                  onClick={() => setBillingInterval(billingInterval === 'month' ? 'year' : 'month')}
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  role="switch"
                  aria-checked={billingInterval === 'year'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      billingInterval === 'year' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span
                  className={`text-sm ${billingInterval === 'year' ? 'text-white font-medium' : 'text-gray-400'}`}
                >
                  Yearly
                </span>
              </div>
            </div>

            {/* Regular Plans Grid: For Labels (free, starter, pro) | For Agents (agent) */}
            {(() => {
              const displayOrder = ['free', 'starter', 'pro', 'agent']
              const nonEnterprise = plans.filter(p => p.id !== 'enterprise')
              const sorted = [...nonEnterprise].sort(
                (a, b) => displayOrder.indexOf(a.id) - displayOrder.indexOf(b.id)
              )
              const labelPlans = sorted.filter(p => p.id !== 'agent')
              const agentPlans = sorted.filter(p => p.id === 'agent')
              const renderPlanCard = p => {
                // Determine plan color scheme
                const getPlanColors = planId => {
                    switch (planId) {
                      case 'free':
                        return {
                          gradient: 'from-gray-800 via-gray-800 to-gray-900',
                          border:
                            plan?.id === planId
                              ? 'border-blue-400'
                              : 'border-gray-700 hover:border-gray-600',
                          accentBar: 'from-blue-500/50 via-blue-400/30 to-transparent',
                          iconBg: 'bg-blue-500/20',
                          iconBorder: 'border-blue-500/30',
                          iconColor: 'text-blue-400',
                          button: 'bg-blue-600 hover:bg-blue-700',
                          buttonShadow: 'shadow-blue-500/25 hover:shadow-blue-500/40',
                          titleGradient: 'from-blue-400 to-cyan-400',
                        }
                      case 'agent':
                        return {
                          gradient: 'from-green-900/20 via-gray-800 to-gray-900',
                          border:
                            plan?.id === planId
                              ? 'border-green-400'
                              : 'border-gray-700 hover:border-green-500/30',
                          accentBar: 'from-green-500/50 via-green-400/30 to-transparent',
                          iconBg: 'bg-green-500/20',
                          iconBorder: 'border-green-500/30',
                          iconColor: 'text-green-400',
                          button: 'bg-green-600 hover:bg-green-700',
                          buttonShadow: 'shadow-green-500/25 hover:shadow-green-500/40',
                          titleGradient: 'from-green-400 to-emerald-400',
                        }
                      case 'starter':
                        return {
                          gradient: 'from-purple-900/20 via-gray-800 to-gray-900',
                          border:
                            plan?.id === planId
                              ? 'border-purple-400'
                              : 'border-gray-700 hover:border-purple-500/30',
                          accentBar: 'from-purple-500/50 via-purple-400/30 to-transparent',
                          iconBg: 'bg-purple-500/20',
                          iconBorder: 'border-purple-500/30',
                          iconColor: 'text-purple-400',
                          button: 'bg-purple-600 hover:bg-purple-700',
                          buttonShadow: 'shadow-purple-500/25 hover:shadow-purple-500/40',
                          titleGradient: 'from-purple-400 to-pink-400',
                        }
                      case 'pro':
                        return {
                          gradient: 'from-orange-900/20 via-gray-800 to-gray-900',
                          border:
                            plan?.id === planId
                              ? 'border-orange-400'
                              : 'border-gray-700 hover:border-orange-500/30',
                          accentBar: 'from-orange-500/50 via-orange-400/30 to-transparent',
                          iconBg: 'bg-orange-500/20',
                          iconBorder: 'border-orange-500/30',
                          iconColor: 'text-orange-400',
                          button: 'bg-orange-600 hover:bg-orange-700',
                          buttonShadow: 'shadow-orange-500/25 hover:shadow-orange-500/40',
                          titleGradient: 'from-orange-400 to-red-400',
                        }
                      default:
                        return {
                          gradient: 'from-gray-800 via-gray-800 to-gray-900',
                          border:
                            plan?.id === planId
                              ? 'border-blue-400'
                              : 'border-gray-700 hover:border-gray-600',
                          accentBar: 'from-blue-500/50 via-blue-400/30 to-transparent',
                          iconBg: 'bg-blue-500/20',
                          iconBorder: 'border-blue-500/30',
                          iconColor: 'text-blue-400',
                          button: 'bg-blue-600 hover:bg-blue-700',
                          buttonShadow: 'shadow-blue-500/25 hover:shadow-blue-500/40',
                          titleGradient: 'from-blue-400 to-cyan-400',
                        }
                    }
                  }

                  const colors = getPlanColors(p.id)
                  const IconComponent =
                    p.id === 'agent'
                      ? Users
                      : p.id === 'free'
                        ? Zap
                        : p.id === 'starter'
                          ? BarChart3
                          : Sparkles
                  return (
                    <div
                      key={p.id}
                      className={`relative overflow-visible rounded-xl p-6 border-2 transition-all flex flex-col min-h-[440px] bg-gradient-to-br ${colors.gradient} ${colors.border} ${p.id === 'starter' ? 'ring-2 ring-green-500/50' : ''}`}
                    >
                      {p.id !== 'free' && <AlphaOnlyTag />}
                      {/* Most Popular Badge for Starter - 3D Effect */}
                      {p.id === 'starter' && (
                        <div
                          className="absolute -top-3 left-4 z-10 px-4 py-1.5 bg-gradient-to-r from-green-600/80 via-emerald-600/80 to-green-600/80 border-2 border-green-500/40 rounded-full text-xs font-bold text-white/90 transform hover:scale-105 transition-all"
                          style={{
                            boxShadow:
                              '0 10px 25px -5px rgba(34, 197, 94, 0.3), 0 0 0 1px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                            filter: 'drop-shadow(0 4px 6px rgba(34, 197, 94, 0.2))',
                          }}
                        >
                          <span className="relative z-10">Most Popular!</span>
                          {/* Shine effect overlay */}
                          <div
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                              background:
                                'linear-gradient(110deg, transparent 40%, rgba(255, 255, 255, 0.2) 50%, transparent 60%)',
                              backgroundSize: '200% 100%',
                              animation: 'shimmer 3s infinite',
                            }}
                          ></div>
                        </div>
                      )}
                      {/* Subtle top accent */}
                      <div
                        className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${colors.accentBar}`}
                      ></div>

                      {/* Header - Fixed height sections for alignment */}
                      <div className="mb-4">
                        {/* Title row - fixed height */}
                        <div className="flex items-center gap-3 mb-3 h-[44px]">
                          <div
                            className={`p-2 rounded-lg ${colors.iconBg} border ${colors.iconBorder}`}
                          >
                            <IconComponent className={`w-5 h-5 ${colors.iconColor}`} />
                          </div>
                          <h3
                            className={`text-2xl font-bold bg-gradient-to-r ${colors.titleGradient} bg-clip-text text-transparent`}
                          >
                            {p.name}
                          </h3>
                        </div>
                        {/* Price section - fixed height */}
                        <div className="mb-6 h-[60px] flex flex-col justify-start">
                          <div className="text-3xl font-bold mb-1">
                            {p.id === 'free' ? (
                              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                Free
                              </span>
                            ) : (
                              <>
                                {formatCurrency(
                                  billingInterval === 'year' && p.price_yearly
                                    ? p.price_yearly
                                    : p.price_monthly
                                )}
                                <span className="text-lg text-gray-400">
                                  /{billingInterval === 'year' ? 'year' : 'mo'}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="h-[20px]">
                            {p.id !== 'free' && (
                              <div className="text-[11px] text-gray-300">
                                <span className="text-gray-300 font-medium">
                                  Temporary Alpha Rate
                                </span>
                              </div>
                            )}
                            {p.id !== 'free' && billingInterval === 'year' && p.price_yearly && (
                              <div className="text-sm text-gray-400">
                                {p.id === 'pro' ? (
                                  <span className="text-green-400 font-semibold">
                                    Save {formatCurrency(p.price_monthly * 12 - p.price_yearly)}/yr!
                                  </span>
                                ) : (
                                  <>{formatCurrency(p.price_yearly / 12)}/month billed annually</>
                                )}
                              </div>
                            )}
                            {p.id !== 'free' && billingInterval === 'month' && (
                              <div className="text-sm text-gray-400">
                                {formatCurrency(p.price_monthly * 12)}/year
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description - fixed height for alignment */}
                      <p className="text-gray-200 text-sm mb-4 h-[40px] line-clamp-2">
                        {p.description}
                      </p>

                      {/* Features */}
                      <div className="space-y-2.5 mb-4">
                        {/* Tracks */}
                        {p.limits?.max_tracks && (
                          <div className="flex items-center gap-2 text-sm">
                            <Check className={`w-4 h-4 ${colors.iconColor} flex-shrink-0`} />
                            <span className="text-gray-300">
                              {p.limits.max_tracks === -1
                                ? 'Unlimited track pipeline'
                                : `${p.limits.max_tracks} track pipeline`}
                            </span>
                          </div>
                        )}
                        {/* Members - only show for non-agent plans */}
                        {p.limits?.max_staff && p.id !== 'agent' && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className={`w-4 h-4 ${colors.iconColor} flex-shrink-0`} />
                            <span className="text-gray-300">
                              {p.limits.max_staff === -1 ? 'Unlimited' : p.limits.max_staff} member
                              {p.limits.max_staff !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {/* Artist Directory Contacts */}
                        {p.limits?.max_contacts && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className={`w-4 h-4 ${colors.iconColor} flex-shrink-0`} />
                            <span className="text-gray-300">
                              {p.limits.max_contacts === -1
                                ? 'Unlimited'
                                : p.limits.max_contacts.toLocaleString()}{' '}
                              contact{p.limits.max_contacts !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {/* The Vault Tracks - not shown for Agent tier */}
                        {p.limits?.max_vault_tracks && p.id !== 'agent' && (
                          <div className="flex items-center gap-2 text-sm">
                            <Package className={`w-4 h-4 ${colors.iconColor} flex-shrink-0`} />
                            <span className="text-gray-300">
                              {p.limits.max_vault_tracks === -1
                                ? 'Unlimited'
                                : p.limits.max_vault_tracks}{' '}
                              Vault track{p.limits.max_vault_tracks !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {/* Free: Limited Statistics */}
                        {p.features?.has_limited_statistics && (
                          <div className="flex items-center gap-2 text-sm">
                            <BarChart3 className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                            <span className="text-gray-300">Limited Statistics</span>
                          </div>
                        )}
                        {/* Agent: Basic Analytics */}
                        {p.features?.has_basic_analytics && (
                          <div className="flex items-center gap-2 text-sm">
                            <BarChart3 className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-gray-300">Basic Analytics</span>
                          </div>
                        )}
                        {/* Starter & Pro: Advanced Analytics */}
                        {p.features?.has_analytics &&
                          !p.features?.has_limited_statistics &&
                          !p.features?.has_basic_analytics && (
                            <div className="flex items-center gap-2 text-sm">
                              <BarChart3 className="w-4 h-4 text-green-400 flex-shrink-0" />
                              <span className="text-gray-300">Advanced Analytics</span>
                            </div>
                          )}
                        {/* Pro: Global Trend Reports */}
                        {p.features?.has_global_trend_reports && (
                          <div className="flex items-center gap-2 text-sm">
                            <BarChart3 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span className="text-gray-300">Global Trend Reports</span>
                          </div>
                        )}
                        {/* Personal Inbox - only show for non-free plans */}
                        {p.features?.has_personal_inbox && p.id !== 'free' && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                            <span className="text-gray-300">Personal Inbox</span>
                          </div>
                        )}
                        {/* Agent Network */}
                        {p.features?.has_network && (
                          <div className="flex items-center gap-2 text-sm">
                            <Globe className="w-4 h-4 text-pink-400 flex-shrink-0" />
                            <span className="text-gray-300">Agent Network</span>
                          </div>
                        )}
                        {/* Pro: Web Integrations (combines API Access and Webhooks) */}
                        {p.id === 'pro' &&
                          (p.features?.has_api_access || p.features?.has_webhooks) && (
                            <div className="flex items-center gap-2 text-sm">
                              <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                              <span className="text-gray-300">Web Integrations</span>
                            </div>
                          )}
                        {/* Other plans: API Access */}
                        {p.id !== 'pro' && p.features?.has_api_access && (
                          <div className="flex items-center gap-2 text-sm">
                            <Key className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span className="text-gray-300">API Access</span>
                          </div>
                        )}
                        {/* Other plans: Webhooks */}
                        {p.id !== 'pro' && p.features?.has_webhooks && (
                          <div className="flex items-center gap-2 text-sm">
                            <Webhook className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span className="text-gray-300">Webhooks</span>
                          </div>
                        )}
                        {/* Enterprise: SSO */}
                        {p.features?.has_sso && (
                          <div className="flex items-center gap-2 text-sm">
                            <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <span className="text-gray-300">Single Sign-On</span>
                          </div>
                        )}
                        {/* "and more" text for all plans except enterprise */}
                        {p.id !== 'enterprise' && (
                          <div className="flex items-center gap-2 text-sm pt-1">
                            <span className="text-gray-400 italic">and more</span>
                          </div>
                        )}
                      </div>

                      {/* CTA Buttons */}
                      <div className="mt-auto space-y-2">
                        {plan?.id !== p.id ? (
                          <>
                            <button
                              onClick={() => handleUpgrade(p.id)}
                              className={`w-full px-4 py-3 ${colors.button} rounded-lg transition-all text-white font-semibold shadow-lg ${colors.buttonShadow} flex items-center justify-center gap-2`}
                            >
                              {(() => {
                                if (!activeOrgId) return 'Secure Alpha Access'
                                if (!plan) return 'Secure Alpha Access'
                                const currentPrice = plan.price_monthly || 0
                                const newPrice =
                                  billingInterval === 'year' && p.price_yearly
                                    ? p.price_yearly / 12
                                    : p.price_monthly
                                return newPrice > currentPrice ? 'Upgrade' : 'Downgrade'
                              })()}
                              <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/plan/${p.id}`)}
                              className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-gray-300 font-medium text-sm flex items-center justify-center gap-2 border border-gray-700"
                            >
                              More Info
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="w-full px-4 py-3 bg-gray-700 rounded-lg text-center text-gray-300 font-semibold flex items-center justify-center gap-2">
                              <Check className="w-4 h-4" />
                              Current Plan
                            </div>
                            <button
                              onClick={() => navigate(`/plan/${p.id}`)}
                              className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-gray-300 font-medium text-sm flex items-center justify-center gap-2 border border-gray-700"
                            >
                              More Info
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
              }
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                  <div className="hidden lg:block col-span-3 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                    For Labels
                  </div>
                  <div className="hidden lg:block text-sm font-semibold text-gray-400 uppercase tracking-wide lg:border-l lg:border-gray-700 lg:pl-6">
                    For Agents
                  </div>
                  {labelPlans.map(p => renderPlanCard(p))}
                  {agentPlans.length > 0 && (
                    <div className="lg:border-l lg:border-gray-700 lg:pl-6">
                      {agentPlans.map(p => renderPlanCard(p))}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Enterprise Plan - Premium Wide Box */}
            {plans.find(p => p.id === 'enterprise') &&
              (() => {
                const enterprisePlan = plans.find(p => p.id === 'enterprise')
                return (
                  <div
                    className={`relative overflow-hidden rounded-xl p-8 border-2 transition-all ${
                      plan?.id === 'enterprise'
                        ? 'border-purple-500 bg-gradient-to-br from-purple-950/30 via-gray-900 to-gray-900'
                        : 'border-gray-700 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 hover:border-purple-500/50'
                    }`}
                  >
                    {/* Premium accent gradient */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>

                    <div className="relative">
                      {/* Header Section */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                            <Sparkles className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                              {enterprisePlan.name}
                            </h3>
                            <p className="text-gray-400 text-sm mt-1">
                              {enterprisePlan.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500 mb-1">Starting at</div>
                          <div className="text-3xl font-bold text-purple-400">Custom</div>
                          <div className="text-sm text-gray-400">Pricing</div>
                        </div>
                      </div>

                      {/* Features Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {enterprisePlan.features?.has_analytics && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded bg-green-500/20">
                              <Zap className="w-4 h-4 text-green-400" />
                            </div>
                            <span className="text-gray-300">Advanced Analytics</span>
                          </div>
                        )}
                        {enterprisePlan.features?.has_api_access && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded bg-blue-500/20">
                              <Zap className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="text-gray-300">API Access</span>
                          </div>
                        )}
                        {enterprisePlan.features?.has_webhooks && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded bg-purple-500/20">
                              <Zap className="w-4 h-4 text-purple-400" />
                            </div>
                            <span className="text-gray-300">Webhooks</span>
                          </div>
                        )}
                        {enterprisePlan.features?.has_sso && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded bg-indigo-500/20">
                              <Shield className="w-4 h-4 text-indigo-400" />
                            </div>
                            <span className="text-gray-300">Single Sign-On</span>
                          </div>
                        )}
                        {enterprisePlan.features?.has_custom_branding && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded bg-pink-500/20">
                              <Sparkles className="w-4 h-4 text-pink-400" />
                            </div>
                            <span className="text-gray-300">Custom Branding</span>
                          </div>
                        )}
                        {enterprisePlan.features?.has_white_label && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded bg-cyan-500/20">
                              <Sparkles className="w-4 h-4 text-cyan-400" />
                            </div>
                            <span className="text-gray-300">White Label</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <div className="p-1.5 rounded bg-yellow-500/20">
                            <Infinity className="w-4 h-4 text-yellow-400" />
                          </div>
                          <span className="text-gray-300">Unlimited Tracks and Seats</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="p-1.5 rounded bg-green-500/20">
                            <Shield className="w-4 h-4 text-green-400" />
                          </div>
                          <span className="text-gray-300">Priority Support</span>
                        </div>
                      </div>

                      {/* CTA Section */}
                      <div className="flex items-center justify-between pt-6 border-t border-gray-700 gap-4">
                        <div className="text-sm text-gray-400 flex-1">
                          Perfect for large labels and agencies requiring enterprise-grade features
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => navigate(`/plan/${enterprisePlan.id}`)}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-gray-300 font-medium text-sm border border-gray-700 whitespace-nowrap"
                          >
                            More Info
                          </button>
                          {plan?.id !== 'enterprise' ? (
                            <a
                              href="/contact"
                              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-all text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 whitespace-nowrap flex items-center gap-2"
                            >
                              <Sparkles className="w-4 h-4" />
                              Contact Sales
                            </a>
                          ) : (
                            <div className="px-8 py-3 bg-gray-700 rounded-lg text-center text-gray-300 font-semibold whitespace-nowrap flex items-center gap-2">
                              <Check className="w-4 h-4" />
                              Current Plan
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

            <div className="mt-6 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                Pricing is subject to change as SoundPath exits Alpha and introduces new features.
                Current users will be notified 30 days prior to any rate adjustments.
              </p>
            </div>
          </div>
        </AlphaPricingContainer>

        {/* Payment Methods */}
        {isOwner && (
          <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Payment Methods</h2>
              <button
                onClick={async () => {
                  try {
                    const portalUrl = await createBillingPortalSession(activeOrgId)
                    window.location.href = portalUrl
                  } catch (error) {
                    setToast({
                      isVisible: true,
                      message: error.message || 'Failed to open billing portal.',
                      type: 'error',
                    })
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Manage Payment Methods
              </button>
            </div>
            {paymentMethods.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No payment methods on file</div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map(pm => (
                  <div
                    key={pm.id}
                    className="flex items-center justify-between bg-gray-800 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-4">
                      <CreditCard className="w-6 h-6 text-gray-400" />
                      <div>
                        <div className="font-semibold">
                          {pm.brand?.toUpperCase()} •••• {pm.last4}
                        </div>
                        <div className="text-sm text-gray-400">
                          Expires {pm.exp_month}/{pm.exp_year}
                        </div>
                      </div>
                      {pm.is_default && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <button className="text-gray-400 hover:text-white">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invoices */}
        {isOwner && (
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4">Billing History</h2>
            {invoices.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No invoices yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Invoice #</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(invoice => (
                      <tr key={invoice.id} className="border-b border-gray-800">
                        <td className="py-3 px-4">{invoice.invoice_number}</td>
                        <td className="py-3 px-4 text-gray-400">
                          {formatDate(invoice.created_at)}
                        </td>
                        <td className="py-3 px-4">{formatCurrency(invoice.amount)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              invoice.status === 'paid'
                                ? 'bg-green-500/20 text-green-400'
                                : invoice.status === 'open'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {invoice.pdf_url && (
                            <a
                              href={invoice.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Billing
