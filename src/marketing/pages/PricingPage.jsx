import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Check, Zap, Building2, Music, UserCircle, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { AlphaStatusBanner } from '../../components/AlphaPricing'

const YEARLY_DISCOUNT = 0.2 // 20%

const BUNDLE_FEATURES = [
  'Label Hub (A&R pipeline, submissions, releases)',
  'Venue Hub',
  'Artist Hub (when available)',
  'Sign, Vault, Splits utilities',
  'Unified data model, no silos',
  'One login, one billing',
]

const HUB_ROW_LABELS = [
  { id: 'label', name: 'Label Hub', icon: Building2 },
  { id: 'venue', name: 'Venue Hub', icon: Music },
  { id: 'artist', name: 'Artist Hub', icon: UserCircle },
]

export default function PricingPage() {
  const navigate = useNavigate()
  const [billingInterval, setBillingInterval] = useState('month') // 'month' | 'year'
  const [plans, setPlans] = useState([])

  useEffect(() => {
    const load = async () => {
      if (!supabase) return
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
      if (!error && data) setPlans(data)
    }
    load()
  }, [])

  const monthlyPrice = (plan) => plan?.price_monthly ?? 0
  const yearlyPrice = (plan) => plan?.price_yearly ?? 0
  const applyYearlyDiscount = (monthly) => (monthly * 12 * (1 - YEARLY_DISCOUNT))

  const freePlan = plans.find((p) => p.id === 'free')
  const starterPlan = plans.find((p) => p.id === 'starter')
  const proPlan = plans.find((p) => p.id === 'pro')
  const soundPathOneMonthly = proPlan ? monthlyPrice(proPlan) : 0
  const soundPathOneYearly = proPlan ? yearlyPrice(proPlan) : applyYearlyDiscount(soundPathOneMonthly)

  return (
    <div className="bg-os-bg min-h-screen">
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <AlphaStatusBanner className="mb-10" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Pricing
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-6">
              Solutions are the vision; products are what you run. Bridge both with one plan or add specific hubs as you need them.
            </p>
            <p className="text-gray-500 max-w-xl mx-auto text-sm">
              <strong className="text-gray-400">The One</strong> = the full ecosystem for teams who want the complete SoundPath OS. <strong className="text-gray-400">Modular</strong> = buy individual hubs (Label, Venue, Artist) and utilities (Sign, Vault, Splits) as product add-ons when we offer them.
            </p>
          </motion.div>

            {/* Monthly vs Yearly toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span
                className={`text-sm font-medium transition-colors ${billingInterval === 'month' ? 'text-white' : 'text-gray-500'}`}
              >
                Monthly
              </span>
              <button
                type="button"
                onClick={() => setBillingInterval((i) => (i === 'month' ? 'year' : 'month'))}
                className={`relative inline-flex h-9 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neon-purple focus:ring-offset-2 focus:ring-offset-os-bg ${
                  billingInterval === 'year' ? 'bg-gradient-to-r from-neon-purple to-recording-red' : 'bg-gray-700'
                }`}
                aria-label="Toggle billing interval"
              >
                <span
                  className={`inline-block h-7 w-7 transform rounded-full bg-white transition-transform ${
                    billingInterval === 'year' ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium transition-colors ${billingInterval === 'year' ? 'text-white' : 'text-gray-500'}`}>
                Yearly
              </span>
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                Save 20%
              </span>
            </div>

            {/* Comparison: Modular products vs The One bundle */}
            <div className="rounded-xl border border-gray-800 overflow-hidden bg-gray-900/30">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="p-4 text-gray-400 font-medium">Feature / Product</th>
                    <th className="p-4 text-gray-400 font-medium text-center w-40">Modular (product buys)</th>
                    <th className="p-4 text-neon-purple font-semibold text-center w-48 bg-neon-purple/10 border-l border-gray-800">
                      The One (full solution)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {HUB_ROW_LABELS.map((row) => {
                    const Icon = row.icon
                    return (
                      <tr key={row.id} className="border-b border-gray-800/80">
                        <td className="p-4 flex items-center gap-2 text-white">
                          <Icon className={`w-4 h-4 shrink-0 ${row.id === 'venue' ? 'text-emerald-500' : row.id === 'artist' ? 'text-amber-400' : 'text-neon-purple'}`} />
                          {row.name}
                        </td>
                        <td className="p-4 text-center text-gray-500 text-sm">
                          Sold separately (coming later)
                        </td>
                        <td className="p-4 text-center border-l border-gray-800 bg-neon-purple/5">
                          <Check className="w-5 h-5 text-green-400 inline-block" />
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="border-b border-gray-800/80">
                    <td className="p-4 text-white">Sign, Vault, Splits</td>
                    <td className="p-4 text-center text-gray-500 text-sm">Add-ons</td>
                    <td className="p-4 text-center border-l border-gray-800 bg-neon-purple/5">
                      <Check className="w-5 h-5 text-green-400 inline-block" />
                    </td>
                  </tr>
                  <tr className="border-b border-gray-800/80">
                    <td className="p-4 text-white">Unified data, one login</td>
                    <td className="p-4 text-center text-gray-500">—</td>
                    <td className="p-4 text-center border-l border-gray-800 bg-neon-purple/5">
                      <Check className="w-5 h-5 text-green-400 inline-block" />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-white">Price</td>
                    <td className="p-4 text-center text-gray-500 text-sm">Per hub / add-on</td>
                    <td className="p-4 text-center border-l border-gray-800 bg-neon-purple/10">
                      {billingInterval === 'month' ? (
                        <span className="text-2xl font-bold text-white">${soundPathOneMonthly.toFixed(2)}<span className="text-gray-400 font-normal text-base">/mo</span></span>
                      ) : (
                        <span className="text-2xl font-bold text-white">${soundPathOneYearly.toFixed(2)}<span className="text-gray-400 font-normal text-base">/yr</span></span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/plan/pro')}
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-semibold hover:border-gray-500 hover:text-white"
              >
                Learn more
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="px-8 py-3 bg-gradient-to-r from-neon-purple to-recording-red text-white rounded-lg font-semibold hover:opacity-90 inline-flex items-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Secure Alpha Access
                <ArrowRight size={18} />
              </button>
            </div>

          {/* The One = full solution; modular = product buys */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/30">
              <h2 className="text-lg font-bold text-gray-400 mb-2">Modular product buys</h2>
              <p className="text-sm text-gray-500 mb-4">Individual hubs and utilities (when sold separately).</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Label, Venue, Artist hubs</li>
                <li>• Sign, Vault, Splits utilities</li>
                <li>• Per-product pricing (coming later)</li>
              </ul>
            </div>
            <div className="p-6 rounded-xl border border-neon-purple/30 bg-neon-purple/5">
              <h2 className="text-lg font-bold text-white mb-2">The One — full solution</h2>
              <p className="text-sm text-gray-300 mb-4">The ultimate bundle: every hub and utility, one login, one billing.</p>
              <ul className="grid sm:grid-cols-1 gap-2">
                {BUNDLE_FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
