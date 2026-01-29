import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  User,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  Zap,
  AlertCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabaseClient'
import Toast from '../components/Toast'

const Onboarding = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'error' })

  // Step 1: Label Information
  const [labelName, setLabelName] = useState('')
  const [labelSlug, setLabelSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)

  // Step 2: Owner Account
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Auto-generate slug from label name
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
      setSlugError('')
    }
  }

  const checkSlugAvailability = async slug => {
    if (!slug || !supabase) return

    setIsCheckingSlug(true)
    setSlugError('')

    try {
      const { data, error } = await supabase.rpc('check_slug_availability', { slug_to_check: slug })

      if (error) throw error

      if (!data) {
        setSlugError('This slug is already taken. Please choose another.')
      }
    } catch (err) {
      console.error('Error checking slug:', err)
      setSlugError('Error checking slug availability')
    } finally {
      setIsCheckingSlug(false)
    }
  }

  const handleSlugBlur = () => {
    if (labelSlug) {
      checkSlugAvailability(labelSlug)
    }
  }

  const validateStep1 = () => {
    if (!labelName.trim()) {
      setToast({
        isVisible: true,
        message: 'Please enter a label name',
        type: 'error',
      })
      return false
    }

    if (!labelSlug.trim()) {
      setToast({
        isVisible: true,
        message: 'Please enter a label slug',
        type: 'error',
      })
      return false
    }

    if (slugError) {
      setToast({
        isVisible: true,
        message: 'Please fix the slug error before continuing',
        type: 'error',
      })
      return false
    }

    // Check slug one more time before proceeding
    if (isCheckingSlug) {
      setToast({
        isVisible: true,
        message: 'Please wait for slug validation to complete',
        type: 'error',
      })
      return false
    }

    return true
  }

  const validateStep2 = () => {
    if (!ownerName.trim()) {
      setToast({
        isVisible: true,
        message: 'Please enter your name',
        type: 'error',
      })
      return false
    }

    if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
      setToast({
        isVisible: true,
        message: 'Please enter a valid email address',
        type: 'error',
      })
      return false
    }

    if (ownerPassword.length < 8) {
      setToast({
        isVisible: true,
        message: 'Password must be at least 8 characters',
        type: 'error',
      })
      return false
    }

    if (ownerPassword !== confirmPassword) {
      setToast({
        isVisible: true,
        message: 'Passwords do not match',
        type: 'error',
      })
      return false
    }

    return true
  }

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validateStep1()) return
      // Re-check slug before proceeding
      await checkSlugAvailability(labelSlug)
      if (slugError) return
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!validateStep2()) return
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    if (!supabase) {
      setToast({
        isVisible: true,
        message: 'Database connection not available',
        type: 'error',
      })
      return
    }

    setIsLoading(true)

    try {
      // Step 1: Create auth user
      // Note: Supabase may send a confirmation email, which can hit rate limits
      // If email confirmation is disabled in Supabase settings, the user will be created immediately
      // Use production URL from env or fallback to current origin
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: ownerEmail,
        password: ownerPassword,
        options: {
          emailRedirectTo: `${siteUrl}/?confirmed=true`,
          data: {
            name: ownerName,
            label_name: labelName,
            label_slug: labelSlug,
          },
        },
      })

      if (authError) {
        // Handle rate limit errors specifically
        if (authError.message?.includes('rate limit') || authError.message?.includes('too many')) {
          throw new Error(
            'Email rate limit exceeded. Please wait a few minutes and try again, or check your email for a confirmation link from a previous attempt.'
          )
        }
        throw authError
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      // If email confirmation is required, the user might not be fully authenticated yet
      // But we can still proceed with organization creation if the user was created
      // The user will need to confirm their email before they can log in

      // Step 2: Create organization and staff member
      // Note: In production, this would be done via a backend API that uses Supabase Admin
      // For now, we'll create the organization and link it after auth user is created
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

      // Step 3: Create owner staff member
      const staffId = `staff_${orgData.id.toString().substring(0, 8)}_${Date.now()}`
      const { data: staffData, error: staffError } = await supabase
        .from('staff_members')
        .insert({
          id: staffId,
          name: ownerName,
          role: 'Owner',
          organization_id: orgData.id,
          organization_name: labelName,
          auth_user_id: authData.user.id,
          can_advance_office: true,
          can_advance_contract: true,
          can_edit_release_date: true,
          can_view_metrics: true,
        })
        .select()
        .single()

      if (staffError) throw staffError

      // Step 4: Update organization with owner_id
      await supabase.from('organizations').update({ owner_id: staffId }).eq('id', orgData.id)

      // Step 5: Create membership for the owner using SECURITY DEFINER function
      // This bypasses RLS since user doesn't have membership yet
      const { error: membershipError } = await supabase.rpc('create_membership', {
        user_id_param: staffId,
        organization_id_param: orgData.id,
        role_param: 'Owner',
      })

      if (membershipError) {
        console.error('Error creating membership:', membershipError)
        // Don't fail the whole process, but log it
      }

      // Step 6: Create free subscription for the organization
      const { error: subError } = await supabase.from('subscriptions').insert({
        organization_id: orgData.id,
        plan_id: 'free',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year for free plan
      })

      if (subError) {
        console.error('Error creating subscription:', subError)
        // Don't fail the whole process
      }

      setToast({
        isVisible: true,
        message: 'Label created successfully! Redirecting to login...',
        type: 'success',
      })

      // Redirect to login page with success message
      // User will need to sign in (email confirmation may be required)
      setTimeout(() => {
        navigate(`/?slug=${labelSlug}&message=label_created`)
      }, 2000)
    } catch (error) {
      console.error('Error creating label:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to create label. Please try again.',
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'The Brand', icon: Building2 },
    { number: 2, title: 'The Account', icon: User },
    { number: 3, title: 'The Setup', icon: CheckCircle },
  ]

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
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
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple to-recording-red mb-4"
          >
            <Zap size={32} className="text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-2">Create Your Label</h1>
          <p className="text-gray-400">Get started with SoundPath in 3 simple steps</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: currentStep >= step.number ? 1 : 0.8 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                    currentStep >= step.number
                      ? 'bg-neon-purple text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {currentStep > step.number ? <CheckCircle size={24} /> : <step.icon size={24} />}
                </motion.div>
                <span
                  className={`text-xs font-medium ${
                    currentStep >= step.number ? 'text-neon-purple' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 transition-all ${
                    currentStep > step.number ? 'bg-neon-purple' : 'bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Content */}
        <motion.div className="glass-morphism rounded-lg p-8 border border-neon-purple/20">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Label Information</h2>
                  <p className="text-gray-400 text-sm">
                    Choose a name and unique URL for your label
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Label Name *
                  </label>
                  <input
                    type="text"
                    value={labelName}
                    onChange={e => handleLabelNameChange(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                    placeholder="Midnight Records"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">URL Slug *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      soundpath.app/
                    </span>
                    <input
                      type="text"
                      value={labelSlug}
                      onChange={e => {
                        const newSlug = generateSlug(e.target.value)
                        setLabelSlug(newSlug)
                        setSlugError('')
                      }}
                      onBlur={handleSlugBlur}
                      className="w-full pl-32 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                      placeholder="midnight-records"
                      required
                    />
                    {isCheckingSlug && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {slugError && (
                    <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle size={16} />
                      <span>{slugError}</span>
                    </div>
                  )}
                  {!slugError && labelSlug && !isCheckingSlug && (
                    <div className="mt-2 flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle size={16} />
                      <span>Slug available</span>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    This will be your unique URL. Only lowercase letters, numbers, and hyphens.
                  </p>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Owner Account</h2>
                  <p className="text-gray-400 text-sm">Create your account to manage your label</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={e => setOwnerEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                      placeholder="you@label.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password *</label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="password"
                      value={ownerPassword}
                      onChange={e => setOwnerPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Must be at least 8 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Review & Complete</h2>
                  <p className="text-gray-400 text-sm">
                    Review your information and create your label
                  </p>
                </div>

                <div className="space-y-4 p-6 bg-gray-900/30 rounded-lg border border-gray-700">
                  <div>
                    <span className="text-gray-400 text-sm">Label Name:</span>
                    <p className="text-white font-semibold">{labelName}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">URL Slug:</span>
                    <p className="text-white font-semibold">soundpath.app/{labelSlug}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Owner Name:</span>
                    <p className="text-white font-semibold">{ownerName}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Email:</span>
                    <p className="text-white font-semibold">{ownerEmail}</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
                  <p className="text-blue-400 text-sm">
                    <strong>Note:</strong> After creating your label, you'll be redirected to the
                    login page. A welcome track and default genres will be automatically added to
                    your dashboard.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white hover:bg-gray-900/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-purple to-recording-red rounded-lg text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-purple to-recording-red rounded-lg text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Create Label</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={e => {
                e.preventDefault()
                navigate('/')
              }}
              className="text-gray-500 hover:text-gray-400 text-sm transition-colors"
            >
              Already have an account? Sign in
            </button>
          </div>
        </motion.div>
      </motion.div>

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  )
}

export default Onboarding
