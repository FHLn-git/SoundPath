import { useParams, useNavigate } from 'react-router-dom'
import { useBilling } from '../context/BillingContext'
import { useAuth } from '../context/AuthContext'
import {
  ArrowLeft,
  Check,
  Users,
  BarChart3,
  Key,
  Webhook,
  Shield,
  Mail,
  Globe,
  Zap,
  Sparkles,
  Infinity,
  Loader2,
  Package,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const PlanInfo = () => {
  const { planId } = useParams()
  const navigate = useNavigate()
  const { plans, loading } = useBilling()
  const { activeOrgId, user, staffProfile } = useAuth()
  const [plan, setPlan] = useState(null)

  // Determine back navigation based on authentication
  const getBackPath = () => {
    if (user && staffProfile) {
      return '/billing'
    }
    return '/'
  }

  useEffect(() => {
    if (plans && planId) {
      const foundPlan = plans.find(p => p.id === planId)
      setPlan(foundPlan)
    }
  }, [plans, planId])

  if (loading || !plan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-10">
        <div className="max-w-4xl mx-auto">
          <p>Plan not found</p>
          <button
            onClick={() => navigate(getBackPath())}
            className="text-blue-400 hover:text-blue-300"
          >
            {user && staffProfile ? 'Back to Billing' : 'Back to Home'}
          </button>
        </div>
      </div>
    )
  }

  const formatCurrency = amount => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getPlanDetails = planId => {
    const details = {
      free: {
        heroTitle: 'Start Your Journey',
        heroSubtitle: 'Perfect for small labels getting started',
        heroDescription:
          'Get started with SoundPath completely free. Track your first tracks, manage your team, and experience the power of professional A&R workflow management.',
        keyBenefits: [
          'Start tracking immediately with no credit card required',
          'Perfect for testing the platform before committing',
          'Full access to core tracking features',
          'Basic statistics to track your progress',
        ],
        useCases: [
          'New labels just launching',
          'Independent A&R scouts exploring the platform',
          'Small teams testing workflow tools',
          'Artists managing their own submissions',
        ],
        limitations: [
          'Total of 10 tracks (personal + owned labels combined)',
          'Up to 1 label ownership',
          'Up to 3 staff memberships (non-owner positions)',
          '1 team member per label (including yourself)',
          'Basic statistics only',
          'No advanced analytics or reporting',
          'Personal Inbox requires upgrade to Agent tier or above',
          'Pitched and Signed views require Agent tier or above',
        ],
        cta: 'Get Started Free',
        ctaSubtext: 'No credit card required. Upgrade anytime.',
      },
      agent: {
        heroTitle: 'Built for Independent A&R Agents',
        heroSubtitle: 'Your personal workspace, optimized for solo operations',
        heroDescription:
          'The Agent tier is designed specifically for A&R professionals working independently. Manage your personal pipeline, connect with artists, and build your network—all in one powerful workspace.',
        keyBenefits: [
          '100 tracks in your personal workspace—plenty for active scouting',
          '10 tracks in your label pipeline (if you own a label)',
          'Up to 1 label ownership',
          'Agent Network access to connect with other industry professionals',
          'Personal Inbox for direct artist submissions',
          'Pitched and Signed views unlocked',
          'Basic analytics to track your success metrics',
          'Perfect for independent scouts, A&R consultants, and freelance agents',
        ],
        useCases: [
          'Independent A&R agents managing their own roster',
          'Freelance scouts working with multiple labels',
          'A&R consultants building their network',
          'Solo professionals who need professional tools without team features',
        ],
        features: [
          'Personal workspace optimized for solo operations',
          'Agent Network integration for industry connections',
          'Direct artist submission inbox',
          'Pitched and Signed views for tracking your deals',
          'Basic analytics and reporting',
          'Track management and organization tools',
        ],
        cta: 'Start Your Agent Journey',
        ctaSubtext: 'Perfect for independent professionals',
      },
      starter: {
        heroTitle: 'Scale Your Label Operations',
        heroSubtitle: 'The most popular choice for growing labels',
        heroDescription:
          'Starter is our most popular plan, chosen by labels that are serious about scaling their A&R operations. Get everything you need to manage a growing team, track more submissions, and make data-driven decisions.',
        keyBenefits: [
          '100 tracks in your personal workspace',
          '100 tracks in your label pipeline (independent limits)',
          'Up to 2 label ownerships',
          '5 team members including yourself—perfect for small to medium teams',
          "Advanced Analytics to understand what works and what doesn't",
          'Personal Inbox for direct artist submissions',
          'Agent Network access to discover new talent',
          'Everything you need to scale without breaking the bank',
        ],
        useCases: [
          'Growing labels with active A&R operations',
          'Teams that need collaboration tools',
          'Labels ready to invest in professional workflow',
          'Organizations tracking multiple artists and projects',
        ],
        features: [
          'Advanced analytics dashboard',
          'Team collaboration tools',
          'Personal inbox for submissions',
          'Agent network integration',
          'Comprehensive track management',
          'Real-time team updates',
        ],
        cta: 'Start Growing Today',
        ctaSubtext: 'Join thousands of labels using Starter',
      },
      pro: {
        heroTitle: 'Powerful A&R Operations at Scale',
        heroSubtitle: 'For established labels that demand the best',
        heroDescription:
          "Pro gives you everything you need to run a professional A&R operation at scale. With 1,000 tracks, 15 team members, and powerful integrations, you'll have the tools to manage complex operations and make data-driven decisions.",
        keyBenefits: [
          '1,000 tracks in your personal workspace',
          '1,000 tracks in your label pipeline (independent limits)',
          'Up to 5 label ownerships',
          '15 team members—build a full A&R department',
          'Global Trend Reports to spot industry patterns before competitors',
          'API Access for custom integrations and automation',
          'Webhooks for real-time notifications and workflow automation',
          'Everything in Starter, plus advanced power features',
        ],
        useCases: [
          'Established labels with high submission volumes',
          'Labels with dedicated A&R departments',
          'Organizations needing custom integrations',
          'Labels that want to stay ahead with trend analysis',
        ],
        features: [
          'Global Trend Reports and analytics',
          'REST API for custom integrations',
          'Webhook notifications for automation',
          'Advanced team management',
          'Priority support',
          'Custom branding options',
        ],
        cta: 'Unlock Pro Features',
        ctaSubtext: 'Perfect for established labels',
      },
      enterprise: {
        heroTitle: 'Fully Customizable A&R Platform',
        heroSubtitle: 'Tailored solutions for your unique needs',
        heroDescription:
          'Enterprise delivers a completely customized SoundPath experience. We build custom features, adapt workflows to your niche requirements, and scale without limits. Perfect for large labels and agencies with specific needs.',
        keyBenefits: [
          'Custom software features built for your workflow',
          'Niche solutions tailored to your specific needs',
          'Unlimited tracks, seats, and storage',
          'White-label branding and SSO security',
          'Dedicated customization team',
          'Priority support with account management',
        ],
        useCases: [
          'Large labels with unique workflow requirements',
          'A&R agencies needing niche-specific features',
          'Organizations requiring custom software solutions',
          'Enterprises with specialized A&R processes',
        ],
        features: [
          'Custom feature development',
          'Niche workflow customization',
          'Unlimited tracks, seats, storage',
          'White-label branding & SSO',
          'Dedicated customization team',
          'Priority support & account management',
        ],
        cta: 'Contact Sales',
        ctaSubtext: "Let's discuss your enterprise needs",
      },
    }
    return details[planId] || details.free
  }

  const details = getPlanDetails(plan.id)
  const isYearly = false // Could be passed as query param if needed

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-10 py-16">
          <button
            onClick={() => navigate(getBackPath())}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {user && staffProfile ? 'Back to Plans' : 'Back to Home'}
          </button>

          <div className="max-w-4xl">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {details.heroTitle}
            </h1>
            <p className="text-2xl text-gray-300 mb-6">{details.heroSubtitle}</p>
            <p className="text-lg text-gray-400 leading-relaxed mb-8">{details.heroDescription}</p>

            {/* Pricing CTA */}
            <div className="flex items-center gap-6">
              <div>
                <div className="text-4xl font-bold mb-1">
                  {plan.id === 'free' ? (
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      Free
                    </span>
                  ) : plan.id === 'enterprise' ? (
                    <span className="text-purple-400">Custom Pricing</span>
                  ) : (
                    <>
                      {formatCurrency(plan.price_monthly)}
                      <span className="text-xl text-gray-400">/month</span>
                    </>
                  )}
                </div>
                {plan.id !== 'free' && plan.id !== 'enterprise' && plan.price_yearly && (
                  <div className="text-sm text-gray-400">
                    or {formatCurrency(plan.price_yearly)}/year
                  </div>
                )}
              </div>
              {plan.id !== 'enterprise' ? (
                <button
                  onClick={() => navigate(user && staffProfile ? '/billing' : '/signup')}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-semibold text-lg"
                >
                  {details.cta}
                </button>
              ) : (
                <a
                  href="/contact"
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white font-semibold text-lg"
                >
                  {details.cta}
                </a>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-3">{details.ctaSubtext}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-10 py-12">
        {/* Key Benefits */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Why Choose {plan.name}?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {details.keyBenefits.map((benefit, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800"
              >
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-gray-300">{benefit}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        {details.features && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Everything You Get</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {details.features.map((feature, idx) => (
                <div key={idx} className="p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                  <p className="text-gray-300">{feature}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Use Cases */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Perfect For</h2>
          <div className="space-y-4">
            {details.useCases.map((useCase, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800"
              >
                <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-gray-300">{useCase}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Limitations (only for free) */}
        {details.limitations && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Plan Limits</h2>
            <div className="space-y-3">
              {details.limitations.map((limit, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800"
                >
                  <p className="text-gray-400">{limit}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Capacity Limits Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Capacity Limits</h2>
          <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-6">
            {plan.id === 'free' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Track Limits</h3>
                  <p className="text-gray-300 mb-1">
                    • Total of <span className="font-bold text-white">10 tracks</span> (personal +
                    owned labels combined)
                  </p>
                  <p className="text-gray-400 text-sm">
                    Personal tracks and label tracks share the same 10-track limit
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Label Ownership</h3>
                  <p className="text-gray-300 mb-1">
                    • Up to <span className="font-bold text-white">1 label</span> ownership
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Staff Memberships</h3>
                  <p className="text-gray-300 mb-1">
                    • Up to <span className="font-bold text-white">3 staff memberships</span>{' '}
                    (non-owner positions)
                  </p>
                  <p className="text-gray-400 text-sm">
                    You can be staff on up to 3 labels in addition to your owned label
                  </p>
                </div>
              </div>
            )}
            {plan.id === 'agent' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Track Limits</h3>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">100 tracks</span> in your personal
                    workspace
                  </p>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">10 tracks</span> in your label pipeline
                    (if you own a label)
                  </p>
                  <p className="text-gray-400 text-sm">
                    Personal and label tracks have independent limits
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Label Ownership</h3>
                  <p className="text-gray-300 mb-1">
                    • Up to <span className="font-bold text-white">1 label</span> ownership
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Unlocked Features</h3>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">Pitched</span> and{' '}
                    <span className="font-bold text-white">Signed</span> views unlocked
                  </p>
                  <p className="text-gray-300 mb-1">• Personal Inbox access</p>
                  <p className="text-gray-300 mb-1">• Agent Network access</p>
                </div>
              </div>
            )}
            {plan.id === 'starter' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Track Limits</h3>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">100 tracks</span> in your personal
                    workspace
                  </p>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">100 tracks</span> in your label
                    pipeline (per label)
                  </p>
                  <p className="text-gray-400 text-sm">
                    Personal and label tracks have independent limits
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Label Ownership</h3>
                  <p className="text-gray-300 mb-1">
                    • Up to <span className="font-bold text-white">2 labels</span> ownership
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Unlocked Features</h3>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">Pitched</span> and{' '}
                    <span className="font-bold text-white">Signed</span> views unlocked
                  </p>
                  <p className="text-gray-300 mb-1">• Personal Inbox access</p>
                  <p className="text-gray-300 mb-1">• Agent Network access</p>
                  <p className="text-gray-300 mb-1">• Advanced Analytics</p>
                </div>
              </div>
            )}
            {plan.id === 'pro' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Track Limits</h3>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">1,000 tracks</span> in your personal
                    workspace
                  </p>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">1,000 tracks</span> in your label
                    pipeline (per label)
                  </p>
                  <p className="text-gray-400 text-sm">
                    Personal and label tracks have independent limits
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Label Ownership</h3>
                  <p className="text-gray-300 mb-1">
                    • Up to <span className="font-bold text-white">5 labels</span> ownership
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Unlocked Features</h3>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">Pitched</span> and{' '}
                    <span className="font-bold text-white">Signed</span> views unlocked
                  </p>
                  <p className="text-gray-300 mb-1">• Personal Inbox access</p>
                  <p className="text-gray-300 mb-1">• Agent Network access</p>
                  <p className="text-gray-300 mb-1">• Global Trend Reports</p>
                  <p className="text-gray-300 mb-1">• API Access & Webhooks</p>
                </div>
              </div>
            )}
            {plan.id === 'enterprise' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Custom Limits</h3>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">Unlimited</span> tracks, seats, storage
                  </p>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">Custom</span> capacity limits tailored
                    to you
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Custom Software</h3>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">Custom features</span> built for your
                    workflow
                  </p>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">Niche solutions</span> for specialized
                    needs
                  </p>
                  <p className="text-gray-300 mb-1">
                    • <span className="font-bold text-white">Workflow customization</span> to match
                    your process
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Enterprise Features</h3>
                  <p className="text-gray-300 mb-1">• White-label branding & SSO</p>
                  <p className="text-gray-300 mb-1">• Dedicated customization team</p>
                  <p className="text-gray-300 mb-1">• Priority support & account management</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Plan Limits */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Plan Specifications</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {plan.limits?.max_tracks && (
              <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Check className="w-5 h-5 text-green-400" />
                  <h3 className="text-xl font-semibold">Tracks</h3>
                </div>
                <p className="text-3xl font-bold text-gray-300">
                  {plan.limits.max_tracks === -1 ? 'Unlimited' : plan.limits.max_tracks}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {plan.id === 'agent' ? 'in your workspace' : 'in your pipeline'}
                </p>
              </div>
            )}
            {plan.limits?.max_staff && plan.id !== 'agent' && (
              <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xl font-semibold">Team Members</h3>
                </div>
                <p className="text-3xl font-bold text-gray-300">
                  {plan.limits.max_staff === -1 ? 'Unlimited' : plan.limits.max_staff}
                </p>
                <p className="text-sm text-gray-400 mt-1">Including yourself</p>
              </div>
            )}
            {plan.limits?.max_contacts && (
              <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-xl font-semibold">Artist Directory Contacts</h3>
                </div>
                <p className="text-3xl font-bold text-gray-300">
                  {plan.limits.max_contacts === -1
                    ? 'Unlimited'
                    : plan.limits.max_contacts.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {plan.id === 'agent'
                    ? 'Unlimited signed artists'
                    : 'Unique artists in your directory'}
                </p>
              </div>
            )}
            {plan.limits?.max_vault_tracks && plan.id !== 'agent' && (
              <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-xl font-semibold">The Vault Tracks</h3>
                </div>
                <p className="text-3xl font-bold text-gray-300">
                  {plan.limits.max_vault_tracks === -1 ? 'Unlimited' : plan.limits.max_vault_tracks}
                </p>
                <p className="text-sm text-gray-400 mt-1">Released tracks in The Vault</p>
              </div>
            )}
          </div>
        </section>

        {/* Feature List */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Included Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {plan.features?.has_limited_statistics && (
              <div className="flex items-center gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                <BarChart3 className="w-5 h-5 text-yellow-400" />
                <span className="text-gray-300">Limited Statistics</span>
              </div>
            )}
            {plan.features?.has_basic_analytics && (
              <div className="flex items-center gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                <BarChart3 className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Basic Analytics</span>
              </div>
            )}
            {plan.features?.has_analytics &&
              !plan.features?.has_limited_statistics &&
              !plan.features?.has_basic_analytics && (
                <div className="flex items-center gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Advanced Analytics</span>
                </div>
              )}
            {plan.features?.has_global_trend_reports && (
              <div className="flex items-center gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <span className="text-gray-300">Global Trend Reports</span>
              </div>
            )}
            {plan.features?.has_personal_inbox && plan.id !== 'free' && (
              <div className="flex items-center gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                <Mail className="w-5 h-5 text-cyan-400" />
                <span className="text-gray-300">Personal Inbox</span>
              </div>
            )}
            {plan.features?.has_network && (
              <div className="flex items-center gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                <Globe className="w-5 h-5 text-pink-400" />
                <span className="text-gray-300">Agent Network</span>
              </div>
            )}
            {plan.features?.has_api_access && (
              <div className="flex items-center gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                <Key className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300">API Access</span>
              </div>
            )}
            {plan.features?.has_webhooks && (
              <div className="flex items-center gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                <Webhook className="w-5 h-5 text-purple-400" />
                <span className="text-gray-300">Webhooks</span>
              </div>
            )}
            {plan.features?.has_sso && (
              <div className="flex items-center gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span className="text-gray-300">Single Sign-On</span>
              </div>
            )}
            {plan.limits?.max_tracks === -1 && (
              <div className="flex items-center gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                <Infinity className="w-5 h-5 text-yellow-400" />
                <span className="text-gray-300">Unlimited Tracks and Seats</span>
              </div>
            )}
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center py-12 bg-gray-900/50 rounded-xl border border-gray-800">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of labels and agents using SoundPath to streamline their A&R operations.
          </p>
          {plan.id !== 'enterprise' ? (
            <button
              onClick={() => navigate(user && staffProfile ? '/billing' : '/signup')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-semibold text-lg"
            >
              {details.cta}
            </button>
          ) : (
            <a
              href="/contact"
              className="inline-block px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white font-semibold text-lg"
            >
              {details.cta}
            </a>
          )}
        </section>
      </div>
    </div>
  )
}

export default PlanInfo
