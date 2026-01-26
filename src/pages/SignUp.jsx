import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Mail, Lock, User, ArrowRight, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Toast from '../components/Toast'
import { validateEmail } from '../lib/emailValidation'

const SignUp = () => {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [billingInterval, setBillingInterval] = useState('month')
  const [plans, setPlans] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'error' })
  const [emailError, setEmailError] = useState('')

  // Load billing interval from sessionStorage if set from Landing page
  useEffect(() => {
    const savedInterval = sessionStorage.getItem('pendingBillingInterval')
    if (savedInterval && (savedInterval === 'month' || savedInterval === 'year')) {
      setBillingInterval(savedInterval)
      sessionStorage.removeItem('pendingBillingInterval')
    }
  }, [])

  // Load plans
  useEffect(() => {
    const loadPlans = async () => {
      if (!supabase) return
      try {
        const { data: plansData, error: plansError } = await supabase
          .from('plans')
          .select('*')
          .eq('active', true)
          .neq('id', 'enterprise') // Don't show enterprise on signup
          .order('sort_order', { ascending: true })

        if (!plansError && plansData) {
          setPlans(plansData)
          // Default to free plan
          const freePlan = plansData.find(p => p.id === 'free')
          if (freePlan) setSelectedPlanId(freePlan.id)
        }
      } catch (error) {
        console.error('Error loading plans:', error)
      }
    }
    loadPlans()
  }, [])
  
  // Password requirements validation
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    passwordsMatch: password === confirmPassword && confirmPassword.length > 0,
  }
  
  const allRequirementsMet = Object.values(passwordRequirements).every(req => req === true)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setEmailError('')
    setIsLoading(true)

    if (!name.trim()) {
      setError('Please enter your name')
      setToast({
        isVisible: true,
        message: 'Please enter your name',
        type: 'error',
      })
      setIsLoading(false)
      return
    }

    // Validate email
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error)
      setError(emailValidation.error)
      setToast({
        isVisible: true,
        message: emailValidation.error,
        type: 'error',
      })
      setIsLoading(false)
      return
    }

    // Validate password requirements
    if (!passwordRequirements.minLength) {
      setError('Password must be at least 8 characters')
      setToast({
        isVisible: true,
        message: 'Password must be at least 8 characters',
        type: 'error',
      })
      setIsLoading(false)
      return
    }

    if (!passwordRequirements.hasUpperCase) {
      setError('Password must contain at least one uppercase letter')
      setToast({
        isVisible: true,
        message: 'Password must contain at least one uppercase letter',
        type: 'error',
      })
      setIsLoading(false)
      return
    }

    if (!passwordRequirements.hasLowerCase) {
      setError('Password must contain at least one lowercase letter')
      setToast({
        isVisible: true,
        message: 'Password must contain at least one lowercase letter',
        type: 'error',
      })
      setIsLoading(false)
      return
    }

    if (!passwordRequirements.hasNumber) {
      setError('Password must contain at least one number')
      setToast({
        isVisible: true,
        message: 'Password must contain at least one number',
        type: 'error',
      })
      setIsLoading(false)
      return
    }

    if (!passwordRequirements.hasSpecialChar) {
      setError('Password must contain at least one special character (!@#$%^&*...)')
      setToast({
        isVisible: true,
        message: 'Password must contain at least one special character',
        type: 'error',
      })
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setToast({
        isVisible: true,
        message: 'Passwords do not match',
        type: 'error',
      })
      setIsLoading(false)
      return
    }

    try {
      const { error: signUpError } = await signUp(name, email, password)

      if (signUpError) {
        // Handle partial success (account created but profile setup failed)
        if (signUpError.partialSuccess) {
          setError(signUpError.message || 'Account created but setup incomplete')
          setToast({
            isVisible: true,
            message: signUpError.message || 'Account created but setup incomplete. You may need to contact support.',
            type: 'warning',
          })
          // Still redirect to login - user can try signing in
          navigate('/?message=confirm_email')
        } else {
          setError(signUpError.message || 'Failed to create account')
          setToast({
            isVisible: true,
            message: signUpError.message || 'Failed to create account',
            type: 'error',
          })
        }
      } else {
        // If a paid plan was selected, store plan selection for after login
        if (selectedPlanId && selectedPlanId !== 'free') {
          sessionStorage.setItem('pendingSubscription', JSON.stringify({
            planId: selectedPlanId,
            billingInterval: billingInterval
          }))
        }
        
        // Redirect immediately to login page with confirm email message
        navigate('/?message=confirm_email')
      }
    } catch (err) {
      setError(err.message || 'An error occurred during sign up')
      setToast({
        isVisible: true,
        message: err.message || 'An error occurred during sign up',
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple to-recording-red mb-4"
          >
            <Zap size={32} className="text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold mb-2 text-neon-purple">
            SoundPath
          </h1>
          <p className="text-gray-400 text-sm">Create Your Universal Account</p>
        </div>

        {/* Sign Up Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-morphism rounded-lg p-8 border border-neon-purple/20"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

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
                  className={`w-full pl-10 pr-4 py-3 bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                    emailError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-700 focus:border-neon-purple focus:ring-neon-purple'
                  }`}
                  placeholder="you@example.com"
                />
              </div>
              {emailError && (
                <p className="mt-1 text-sm text-red-400">{emailError}</p>
              )}
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
                  minLength={8}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                  placeholder="••••••••"
                />
              </div>
              
              {/* Password Requirements */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className={`text-xs flex items-center gap-2 ${passwordRequirements.minLength ? 'text-green-400' : 'text-gray-500'}`}>
                    <span>{passwordRequirements.minLength ? '✓' : '○'}</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`text-xs flex items-center gap-2 ${passwordRequirements.hasUpperCase ? 'text-green-400' : 'text-gray-500'}`}>
                    <span>{passwordRequirements.hasUpperCase ? '✓' : '○'}</span>
                    <span>One uppercase letter (A-Z)</span>
                  </div>
                  <div className={`text-xs flex items-center gap-2 ${passwordRequirements.hasLowerCase ? 'text-green-400' : 'text-gray-500'}`}>
                    <span>{passwordRequirements.hasLowerCase ? '✓' : '○'}</span>
                    <span>One lowercase letter (a-z)</span>
                  </div>
                  <div className={`text-xs flex items-center gap-2 ${passwordRequirements.hasNumber ? 'text-green-400' : 'text-gray-500'}`}>
                    <span>{passwordRequirements.hasNumber ? '✓' : '○'}</span>
                    <span>One number (0-9)</span>
                  </div>
                  <div className={`text-xs flex items-center gap-2 ${passwordRequirements.hasSpecialChar ? 'text-green-400' : 'text-gray-500'}`}>
                    <span>{passwordRequirements.hasSpecialChar ? '✓' : '○'}</span>
                    <span>One special character (!@#$%^&*...)</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                    confirmPassword.length > 0
                      ? passwordRequirements.passwordsMatch
                        ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500'
                        : 'border-red-500/50 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-700 focus:border-neon-purple focus:ring-neon-purple'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-xs mt-1 ${passwordRequirements.passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                  {passwordRequirements.passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            {/* Subscription Plan Selection */}
            {plans.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Choose Your Plan
                  </label>
                  {/* Billing Interval Toggle - Always visible when plans exist */}
                  {plans.some(p => p.id !== 'free' && (p.price_monthly || p.price_yearly)) && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium transition-colors ${
                        billingInterval === 'month' ? 'text-white' : 'text-gray-400'
                      }`}>
                        Monthly
                      </span>
                      <button
                        type="button"
                        onClick={() => setBillingInterval(billingInterval === 'month' ? 'year' : 'month')}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neon-purple focus:ring-offset-2 focus:ring-offset-gray-900 ${
                          billingInterval === 'year' ? 'bg-neon-purple' : 'bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            billingInterval === 'year' ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-medium transition-colors ${
                        billingInterval === 'year' ? 'text-white' : 'text-gray-400'
                      }`}>
                        Yearly
                      </span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {plans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id
                    const price = billingInterval === 'year' && plan.price_yearly 
                      ? plan.price_yearly 
                      : plan.price_monthly
                    
                    return (
                      <motion.button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-neon-purple bg-neon-purple/10'
                            : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-neon-purple bg-neon-purple'
                                : 'border-gray-600'
                            }`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{plan.name}</div>
                              <div className="text-xs text-gray-400">{plan.description}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-white">
                              {plan.id === 'free' ? 'Free' : `$${price.toFixed(2)}`}
                              {plan.id !== 'free' && (
                                <span className="text-xs text-gray-400 font-normal">
                                  /{billingInterval === 'year' ? 'year' : 'mo'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
                {/* Show savings message when yearly is selected */}
                {billingInterval === 'year' && selectedPlanId && selectedPlanId !== 'free' && plans.find(p => p.id === selectedPlanId)?.price_yearly && (
                  <div className="text-center pt-2">
                    <span className="text-xs text-green-400 font-medium">
                      Save {Math.round((1 - plans.find(p => p.id === selectedPlanId).price_yearly / (plans.find(p => p.id === selectedPlanId).price_monthly * 12)) * 100)}% with yearly billing
                    </span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={isLoading || !allRequirementsMet}
              className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-neon-purple to-recording-red"
              whileHover={{ scale: isLoading || !allRequirementsMet ? 1 : 1.02 }}
              whileTap={{ scale: isLoading || !allRequirementsMet ? 1 : 0.98 }}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  navigate('/')
                }}
                className="text-neon-purple hover:text-neon-purple/80 font-semibold transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>
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

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  )
}

export default SignUp
