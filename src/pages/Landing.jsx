import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, Mail, Lock, ArrowRight, X, Menu, 
  BarChart3, Users, Shield, Workflow, Clock, 
  CheckCircle2, Star, ChevronRight, Check
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Toast from '../components/Toast'

const Landing = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'error' })
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { signIn, user, staffProfile, memberships, loading: authLoading } = useAuth()
  const slug = searchParams.get('slug') || null
  const message = searchParams.get('message')
  const [organizationBranding, setOrganizationBranding] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [plans, setPlans] = useState([])
  const [billingInterval, setBillingInterval] = useState('month') // 'month' or 'year' (matches SignUp.jsx)
  const loginModalRef = useRef(null)

  // Fetch organization branding if slug is provided
  useEffect(() => {
    const fetchBranding = async () => {
      if (!slug || !supabase) return

      try {
        const { data, error } = await supabase
          .rpc('get_organization_by_slug', { slug_to_find: slug })
          .single()

        if (!error && data) {
          setOrganizationBranding({
            name: data.name,
            slug: data.slug,
            branding: data.branding_settings || {},
          })
        }
      } catch (err) {
        console.error('Error fetching organization branding:', err)
      }
    }

    fetchBranding()
  }, [slug])

  // Load plans for pricing section
  useEffect(() => {
    const loadPlans = async () => {
      if (!supabase) return
      try {
        const { data: plansData, error: plansError } = await supabase
          .from('plans')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true })

        if (!plansError && plansData) {
          setPlans(plansData)
        }
      } catch (error) {
        console.error('Error loading plans:', error)
      }
    }
    loadPlans()
  }, [])

  // Show success messages and open login modal if needed
  useEffect(() => {
    // Check for email confirmation success
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('confirmed') === 'true') {
      setToast({
        isVisible: true,
        message: 'Email confirmed successfully! You can now sign in.',
        type: 'success',
      })
      setShowLoginModal(true)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (message === 'account_created') {
      setToast({
        isVisible: true,
        message: 'Account created! Please check your email to confirm your account, then sign in.',
        type: 'success',
      })
      setShowLoginModal(true)
    } else if (message === 'label_created') {
      setToast({
        isVisible: true,
        message: 'Label created successfully! Please sign in with your account credentials.',
        type: 'success',
      })
      setShowLoginModal(true)
    } else if (message === 'confirm-email' || message === 'confirm_email') {
      setToast({
        isVisible: true,
        message: 'Confirm email to login',
        type: 'success',
      })
      setShowLoginModal(true)
    }
  }, [message])

  // Redirect if already logged in
  const [hasRedirected, setHasRedirected] = useState(false)
  
  useEffect(() => {
    if (authLoading) return
    
    if (user && staffProfile && !hasRedirected) {
      setHasRedirected(true)
      
      const pendingSub = sessionStorage.getItem('pendingSubscription')
      if (pendingSub) {
        try {
          const { planId, billingInterval } = JSON.parse(pendingSub)
          sessionStorage.removeItem('pendingSubscription')
          navigate(`/billing?subscribe=${planId}&interval=${billingInterval}`, { replace: true })
          return
        } catch (e) {
          console.error('Error parsing pending subscription:', e)
        }
      }
      
      if (!memberships || memberships.length === 0) {
        navigate('/welcome', { replace: true })
      } else {
        navigate('/launchpad', { replace: true })
      }
    }
  }, [user, staffProfile, memberships, navigate, hasRedirected, authLoading])

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (loginModalRef.current && !loginModalRef.current.contains(event.target)) {
        setShowLoginModal(false)
      }
    }

    if (showLoginModal) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [showLoginModal])

  // Reset modal state when closing
  useEffect(() => {
    if (!showLoginModal) {
      setShowPasswordReset(false)
      setResetLoading(false)
    }
  }, [showLoginModal])

  const sendPasswordReset = async () => {
    if (!supabase) {
      setToast({ isVisible: true, message: 'Auth is not configured.', type: 'error' })
      return
    }

    const normalizedEmail = email.toLowerCase().trim()
    if (!normalizedEmail) {
      setToast({ isVisible: true, message: 'Enter your email first.', type: 'error' })
      return
    }

    setResetLoading(true)
    try {
      await supabase.functions.invoke('password-reset', {
        body: {
          email: normalizedEmail,
          redirect_to: `${window.location.origin}/reset-password`,
        },
      })

      // Enumeration-safe UX: same message regardless of account existence.
      setToast({
        isVisible: true,
        message: 'If an account exists for that email, we sent a password reset link.',
        type: 'success',
      })
      setShowPasswordReset(false)
    } catch (err) {
      setToast({
        isVisible: true,
        message: err.message || 'Failed to send reset email. Please try again.',
        type: 'error',
      })
    } finally {
      setResetLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { error: signInError } = await signIn(email, password)

      if (signInError) {
        setError(signInError.message || 'Invalid email or password')
        setToast({
          isVisible: true,
          message: signInError.message || 'Invalid email or password',
          type: 'error',
        })
      } else {
        setToast({
          isVisible: true,
          message: 'Login successful! Redirecting...',
          type: 'success',
        })
        
        setTimeout(() => {
          if (user) {
            if (!staffProfile) {
              navigate('/welcome')
            }
          }
        }, 2000)
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login')
      setToast({
        isVisible: true,
        message: err.message || 'An error occurred during login',
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setMobileMenuOpen(false)
    }
  }

  const primaryColor = organizationBranding?.branding?.primaryColor || '#a855f7'
  const labelName = organizationBranding?.name || 'SoundPath'

  const features = [
    {
      icon: Workflow,
      title: 'Streamlined A&R Workflow',
      description: 'Manage your entire A&R process from submission to release in one unified platform.',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Work seamlessly with your team members, assign tasks, and track progress in real-time.',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Get powerful insights into your submissions, track metrics, and make data-driven decisions.',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level security with role-based access control and comprehensive audit logs.',
    },
    {
      icon: Clock,
      title: 'Real-time Updates',
      description: 'Stay in sync with instant notifications and real-time updates across all your projects.',
    },
    {
      icon: CheckCircle2,
      title: 'Customizable Workflows',
      description: 'Tailor your workflow to match your label\'s unique process and requirements.',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-neon-purple to-recording-red rounded-lg">
                <Zap size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white">{labelName}</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => navigate('/help')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Help
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Contact
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-neon-purple to-recording-red text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg font-semibold hover:border-gray-600 hover:text-white transition-colors"
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-300 hover:text-white"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden py-4 space-y-3"
              >
                <button
                  onClick={() => scrollToSection('features')}
                  className="block w-full text-left text-gray-300 hover:text-white transition-colors"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="block w-full text-left text-gray-300 hover:text-white transition-colors"
                >
                  Pricing
                </button>
                <button
                  onClick={() => navigate('/help')}
                  className="block w-full text-left text-gray-300 hover:text-white transition-colors"
                >
                  Help
                </button>
                <button
                  onClick={() => navigate('/contact')}
                  className="block w-full text-left text-gray-300 hover:text-white transition-colors"
                >
                  Contact
                </button>
                <div className="pt-3 space-y-2 border-t border-gray-800">
                  <button
                    onClick={() => {
                      setShowLoginModal(true)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 bg-gradient-to-r from-neon-purple to-recording-red text-white rounded-lg font-semibold"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="w-full px-4 py-2 border border-gray-700 text-gray-300 rounded-lg font-semibold"
                  >
                    Sign Up
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
              The A&R Command Center
              <span className="block bg-gradient-to-r from-neon-purple to-recording-red bg-clip-text text-transparent">
                Your Label Needs
              </span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Streamline your A&R workflow, manage submissions, collaborate with your team, and bring music to the world faster than ever.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-neon-purple to-recording-red text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Login
                <ArrowRight size={20} />
              </motion.button>
              <motion.button
                onClick={() => navigate('/signup')}
                className="px-8 py-4 border-2 border-gray-700 text-gray-300 rounded-lg font-semibold text-lg hover:border-gray-600 hover:text-white transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign Up
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Powerful features designed to make your A&R process more efficient and effective.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-neon-purple/50 transition-colors"
                >
                  <div className="p-3 bg-neon-purple/20 rounded-lg w-fit mb-4">
                    <Icon size={24} className="text-neon-purple" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400">
                    {feature.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Choose the plan that works best for your label.
            </p>
          </motion.div>

          {plans.length > 0 && (
            <>
              {/* Billing Interval Toggle */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <span className={`text-sm font-medium transition-colors ${billingInterval === 'month' ? 'text-white' : 'text-gray-500'}`}>
                  Monthly
                </span>
                <button
                  onClick={() => setBillingInterval(billingInterval === 'month' ? 'year' : 'month')}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neon-purple focus:ring-offset-2 focus:ring-offset-gray-950 ${
                    billingInterval === 'year' ? 'bg-gradient-to-r from-neon-purple to-recording-red' : 'bg-gray-700'
                  }`}
                  aria-label="Toggle billing interval"
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      billingInterval === 'year' ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium transition-colors ${billingInterval === 'year' ? 'text-white' : 'text-gray-500'}`}>
                  Yearly
                </span>
              </div>

              {/* Main Plans Grid: Free, Agent, Starter, Pro */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto mb-12">
                {plans
                  .filter(plan => plan.id !== 'enterprise')
                  .map((plan, index) => {
                    const monthlyPrice = plan.price_monthly || 0
                    const yearlyPrice = plan.price_yearly || 0
                    const price = billingInterval === 'year' ? yearlyPrice : monthlyPrice
                    const monthlyEquivalent = billingInterval === 'year' && yearlyPrice > 0 ? yearlyPrice / 12 : monthlyPrice
                    const savings = billingInterval === 'year' && monthlyPrice > 0 && yearlyPrice > 0 
                      ? Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100)
                      : 0
                    const savingsAmount = billingInterval === 'year' && monthlyPrice > 0 && yearlyPrice > 0
                      ? Math.round(monthlyPrice * 12 - yearlyPrice)
                      : 0
                    const isPopular = plan.id === 'starter'
                    
                    return (
                      <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        className={`relative p-8 bg-gray-900/50 border rounded-lg flex flex-col ${
                          isPopular
                            ? 'border-neon-purple/50 ring-2 ring-neon-purple/20'
                            : 'border-gray-800'
                        }`}
                      >
                        {isPopular && (
                          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                            <span className="px-4 py-1 bg-gradient-to-r from-neon-purple to-recording-red text-white text-sm font-semibold rounded-full">
                              Most Popular
                            </span>
                          </div>
                        )}
                        <div className="text-center mb-6 flex-grow">
                          <h3 className="text-2xl font-bold text-white mb-2">
                            {plan.name}
                          </h3>
                          <div className="flex flex-col items-center justify-center gap-1">
                            <div className="flex items-baseline justify-center gap-2">
                              <span className="text-4xl font-bold text-white">
                                {plan.id === 'free' ? 'Free' : `$${price.toFixed(2)}`}
                              </span>
                              {plan.id !== 'free' && (
                                <span className="text-gray-400">
                                  /{billingInterval === 'year' ? 'year' : 'month'}
                                </span>
                              )}
                            </div>
                            {billingInterval === 'year' && plan.id !== 'free' && yearlyPrice > 0 && (
                              <>
                                <div className="text-sm text-gray-500 line-through">
                                  ${(monthlyPrice * 12).toFixed(2)}/year
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {plan.id === 'pro' ? (
                                    <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-semibold rounded">
                                      Save $200 per year!
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-400">
                                      ${monthlyEquivalent.toFixed(2)}/month
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm mt-2">
                            {plan.description}
                          </p>
                        </div>
                        <div className="flex gap-3 mt-auto">
                          <button
                            onClick={() => navigate(`/plan/${plan.id}`)}
                            className="flex-1 py-3 rounded-lg font-semibold transition-all bg-gray-800/50 text-gray-300 hover:bg-gray-800 border border-gray-700 hover:border-gray-600"
                          >
                            Learn More
                          </button>
                          <button
                            onClick={() => {
                              if (plan.id !== 'free') {
                                sessionStorage.setItem('pendingBillingInterval', billingInterval)
                              }
                              navigate('/signup')
                            }}
                            className="flex-1 py-3 rounded-lg font-semibold transition-all bg-gradient-to-r from-neon-purple to-recording-red text-white hover:opacity-90"
                          >
                            Get Started
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
              </div>

              {/* Enterprise Tier - Full Width */}
              {plans.find(plan => plan.id === 'enterprise') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="max-w-7xl mx-auto"
                >
                  <div className="relative p-12 bg-gradient-to-br from-purple-900/30 via-gray-900/50 to-indigo-900/30 border-2 border-purple-500/50 rounded-xl ring-2 ring-purple-500/20">
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-full">
                        Enterprise
                      </span>
                    </div>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-3xl font-bold text-white mb-3">
                          Enterprise
                        </h3>
                        <div className="flex items-baseline justify-center md:justify-start gap-2 mb-4">
                          <span className="text-5xl font-bold text-white">
                            Custom
                          </span>
                          <span className="text-xl text-gray-400">Pricing</span>
                        </div>
                        <p className="text-gray-300 text-lg mb-6 max-w-2xl font-semibold">
                          Fully customizable A&R platform tailored to your niche needs
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                          <div className="flex items-center gap-2 text-gray-300">
                            <Check className="w-5 h-5 text-purple-400" />
                            <span>Custom software features</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Check className="w-5 h-5 text-purple-400" />
                            <span>Niche workflow solutions</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Check className="w-5 h-5 text-purple-400" />
                            <span>Unlimited scale</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Check className="w-5 h-5 text-purple-400" />
                            <span>Dedicated customization</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 min-w-[200px]">
                        <button
                          onClick={() => navigate(`/plan/enterprise`)}
                          className="px-6 py-3 rounded-lg font-semibold transition-all bg-gray-800/50 text-gray-300 hover:bg-gray-800 border border-gray-700 hover:border-gray-600"
                        >
                          Learn More
                        </button>
                        <button
                          onClick={() => navigate('/contact')}
                          className="px-6 py-3 rounded-lg font-semibold transition-all bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90"
                        >
                          Contact Sales
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-neon-purple/20 to-recording-red/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Ready to Transform Your A&R Process?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join labels already using SoundPath to streamline their workflow.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-neon-purple to-recording-red text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Login
                <ArrowRight size={20} />
              </motion.button>
              <motion.button
                onClick={() => navigate('/signup')}
                className="px-8 py-4 border-2 border-white/20 text-white rounded-lg font-semibold text-lg hover:border-white/40 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign Up
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-neon-purple to-recording-red rounded-lg">
                  <Zap size={20} className="text-white" />
                </div>
                <span className="text-xl font-bold text-white">{labelName}</span>
              </div>
              <p className="text-gray-400 text-sm">
                The A&R Command Center for modern labels.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => scrollToSection('features')}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('pricing')}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Pricing
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => navigate('/help')}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Help Center
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/contact')}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Contact
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/faq')}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    FAQ
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => navigate('/terms')}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/privacy')}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {labelName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setShowLoginModal(false)}
            />
            <motion.div
              ref={loginModalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-lg p-8 relative">
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple to-recording-red mb-4">
                    <Zap size={32} className="text-white" />
                  </div>
                  <h2
                    className="text-3xl font-bold mb-2"
                    style={{ color: primaryColor }}
                  >
                    Welcome Back
                  </h2>
                  <p className="text-gray-400">Sign in to your {labelName} account</p>
                </div>

                {(message === 'confirm-email' || message === 'confirm_email') && (
                  <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
                    <p className="text-blue-400 text-sm">
                      <strong>✓ Account Created!</strong> Please check your email and click the confirmation link to activate your account, then sign in below.
                    </p>
                  </div>
                )}
                
                {message === 'account_created' && (
                  <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                    <p className="text-green-400 text-sm">
                      <strong>✓ Account Created!</strong> Please check your email to confirm your account (if required), then sign in below.
                    </p>
                  </div>
                )}
                
                {message === 'label_created' && (
                  <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                    <p className="text-green-400 text-sm">
                      <strong>✓ Label Created Successfully!</strong> Please sign in with your account credentials.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail
                        size={18}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                        placeholder="you@label.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setShowPasswordReset(true)}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        Forgot / change password?
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor} 0%, #ef4444 100%)`,
                    }}
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </motion.button>
                </form>

                <AnimatePresence>
                  {showPasswordReset && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-6 p-4 bg-gray-950/40 border border-gray-800 rounded-lg"
                    >
                      <p className="text-sm text-gray-300 mb-3">
                        We’ll email you a secure link to reset your password.
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={sendPasswordReset}
                          disabled={resetLoading}
                          className="flex-1 py-2 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-neon-purple to-recording-red"
                        >
                          {resetLoading ? 'Sending…' : 'Send reset email'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPasswordReset(false)}
                          className="px-4 py-2 rounded-lg font-semibold text-gray-300 border border-gray-700 hover:border-gray-600 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-6 text-center">
                  <p className="text-gray-500 text-sm">
                    New to {labelName}?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setShowLoginModal(false)
                        navigate('/signup')
                      }}
                      className="text-neon-purple hover:text-neon-purple/80 font-semibold transition-colors"
                    >
                      Get Started
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
        duration={message === 'confirm-email' || message === 'confirm_email' ? 15000 : 4000}
      />
    </div>
  )
}

export default Landing
