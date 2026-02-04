import { useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2,
  Music,
  UserCircle,
  FileSignature,
  Archive,
  GitBranch,
  ArrowRight,
  Cpu,
  Zap,
  Check,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const PRODUCTS = {
  label: {
    name: 'Label',
    tagline: 'A&R pipeline, submissions, and releases in one hub.',
    icon: Building2,
    status: 'live',
    features: [
      {
        title: 'Unified pipeline',
        bullets: [
          'Single demo inbox with phases: Inbox → Second Listen → The Office → Contracting → Upcoming → Vault',
          'Metadata-aware submission forms and org-specific branding',
          'Staff roles (Owner, Manager, Scout) with voting and phase advancement',
        ],
      },
      {
        title: 'Calendar & release planning',
        bullets: [
          'Calendar and Upcoming views tied to pipeline',
          'Integrations with Sign and Vault for contracts and catalog',
        ],
      },
    ],
    specRows: [
      { spec: 'Pipeline phases', value: '6 (Inbox → Vault)' },
      { spec: 'Submission metadata', value: 'Custom fields, org branding' },
      { spec: 'Integrations', value: 'Sign, Vault, Splits' },
    ],
    mockupLabel: 'Label Hub – Launchpad & pipeline',
  },
  venue: {
    name: 'Venue',
    tagline: 'Booking, calendar, and capacity in one hub.',
    icon: Music,
    status: 'coming_soon',
    features: [
      {
        title: 'Booking & capacity',
        bullets: [
          'Booking pipeline and capacity management',
          'Calendar sync and event metadata',
          'Contract generation via Sign integration',
          'Splits and settlements tracking',
        ],
      },
    ],
    specRows: [
      { spec: 'Booking pipeline', value: 'Inquiry to settlement' },
      { spec: 'Integrations', value: 'Sign, Splits' },
    ],
    mockupLabel: 'Venue Hub – Coming Soon',
  },
  artist: {
    name: 'Artist',
    tagline: 'Portfolio, pitches, and deals in one hub.',
    icon: UserCircle,
    status: 'coming_soon',
    features: [
      {
        title: 'Portfolio & deals',
        bullets: [
          'Portfolio and pitch tracking',
          'Deal and offer visibility from labels and venues',
          'Sign integration for agreements',
          'Splits and royalty visibility',
        ],
      },
    ],
    specRows: [
      { spec: 'Portfolio', value: 'Pitches, deals, releases' },
      { spec: 'Integrations', value: 'Sign, Splits' },
    ],
    mockupLabel: 'Artist Hub – Coming Soon',
  },
  sign: {
    name: 'Sign',
    tagline: 'Metadata-aware contract generation across the OS.',
    icon: FileSignature,
    status: 'utility',
    features: [
      {
        title: 'Metadata-aware contracts',
        bullets: [
          'Contract generation from pipeline and event data—no double entry',
          'Templates for deals, booking agreements, and riders',
          'One source of truth linked to Label, Venue, and Artist hubs',
        ],
      },
    ],
    specRows: [
      { spec: 'Contract types', value: 'Deals, booking, riders' },
      { spec: 'Data source', value: 'Pipeline & event metadata' },
    ],
    mockupLabel: 'Sign – Contract engine',
  },
  vault: {
    name: 'Vault',
    tagline: 'Catalog and archive with release metadata.',
    icon: Archive,
    status: 'utility',
    features: [
      {
        title: 'Catalog & archive',
        bullets: [
          'Catalog and archive for released tracks and assets',
          'Release metadata and versioning',
          'Lossless stem storage and asset linking (roadmap)',
          'Linked to Label pipeline and Sign for full audit trail',
        ],
      },
    ],
    specRows: [
      { spec: 'Storage', value: 'Tracks, assets, metadata' },
      { spec: 'Integrations', value: 'Label Hub, Sign' },
    ],
    mockupLabel: 'Vault – Catalog & archive',
  },
  splits: {
    name: 'Splits',
    tagline: 'Royalties and splits tied to deals and releases.',
    icon: GitBranch,
    status: 'utility',
    features: [
      {
        title: 'Royalties & commissions',
        bullets: [
          'Royalty and split tracking tied to Sign and releases',
          'Door splits, guarantees, and settlement data for venues',
          'Commission tracking for agents',
        ],
      },
    ],
    specRows: [
      { spec: 'Data source', value: 'Sign, releases, events' },
      { spec: 'Use cases', value: 'Labels, venues, agents' },
    ],
    mockupLabel: 'Splits – Royalties & commissions',
  },
}

export default function ProductPage() {
  const { app_name } = useParams()
  const navigate = useNavigate()
  const product = app_name ? PRODUCTS[app_name.toLowerCase()] : null

  if (!product) {
    return <Navigate to="/products/label" replace />
  }

  const Icon = product.icon
  const isComingSoon = product.status === 'coming_soon'

  return (
    <div className="bg-os-bg min-h-screen">
      {/* Hero + DAW-style mockup (dark mode) */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 border-b border-gray-800/80">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-neon-purple/20 mb-6">
              <Icon className="w-8 h-8 text-neon-purple" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
              SoundPath {product.name}
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-6">
              {product.tagline}
            </p>
            {isComingSoon && (
              <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-sm font-semibold">
                Coming Soon
              </span>
            )}
          </motion.div>

          {/* High-fidelity DAW-style mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-xl border border-gray-700 bg-[#0a0c10] overflow-hidden shadow-2xl ring-1 ring-gray-800"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900/90">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-gray-500 text-sm font-mono ml-2">{product.mockupLabel}</span>
            </div>
            <div className="aspect-video flex items-center justify-center bg-[#07090c] p-8">
              {isComingSoon ? (
                <div className="text-center text-gray-500">
                  <Cpu className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium text-gray-400">High-fidelity mockup coming soon</p>
                  <p className="text-sm mt-1">Design in progress for SoundPath {product.name}</p>
                </div>
              ) : (
                <div className="w-full max-w-2xl mx-auto grid grid-cols-6 gap-2 p-4 rounded-lg bg-gray-900/80 border border-gray-800">
                  {['Inbox', 'Listen', 'Office', 'Contract', 'Upcoming', 'Vault'].map((col) => (
                    <div
                      key={col}
                      className="rounded bg-gray-800 border border-gray-700 py-4 px-2 text-center"
                    >
                      <div className="text-[10px] font-semibold text-gray-500 tracking-wider mb-2">{col}</div>
                      <div className="h-10 rounded bg-gray-800/80 border border-gray-700/50" />
                      <div className="h-10 rounded bg-gray-800/80 border border-gray-700/50 mt-2" />
                      <div className="h-10 rounded bg-gray-800/80 border border-gray-700/50 mt-2" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature sections: each with bullet list + CTA */}
      <div className="py-4">
        {product.features.map((block, blockIndex) => (
          <section
            key={blockIndex}
            className={`py-12 px-4 sm:px-6 lg:px-8 ${blockIndex % 2 === 1 ? 'bg-gray-900/30' : ''}`}
          >
            <div className="max-w-3xl mx-auto">
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-xl font-bold text-white mb-4 flex items-center gap-2"
              >
                <Zap className="w-5 h-5 text-neon-purple" />
                {block.title}
              </motion.h2>
              <ul className="space-y-3 mb-8">
                {block.bullets.map((line, i) => (
                  <li key={i} className="flex gap-3 items-start text-gray-300">
                    <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="px-5 py-2.5 bg-gradient-to-r from-neon-purple to-recording-red text-white rounded-lg font-semibold hover:opacity-90 inline-flex items-center gap-2 text-sm"
                >
                  {isComingSoon ? 'Join waitlist' : 'Alpha Access'}
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  className="px-5 py-2.5 border border-gray-600 text-gray-300 rounded-lg font-semibold hover:border-gray-500 hover:text-white text-sm"
                >
                  See pricing
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Technical spec table */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/40 border-t border-gray-800">
        <div className="max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl font-bold text-white mb-6"
          >
            Technical specs
          </motion.h2>
          <div className="rounded-xl border border-gray-800 overflow-hidden bg-[#0a0c10]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/80">
                  <th className="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Spec</th>
                  <th className="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody>
                {product.specRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800/80 last:border-0">
                    <td className="p-3 text-gray-300 font-medium">{row.spec}</td>
                    <td className="p-3 text-gray-400">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Get access to SoundPath {product.name}</h2>
          <p className="text-gray-400 mb-6">
            {isComingSoon
              ? 'Join the waitlist and we’ll notify you when it’s ready.'
              : 'Part of SoundPath One. Get the full ecosystem or add products as you need them.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="px-8 py-3 bg-gradient-to-r from-neon-purple to-recording-red text-white rounded-lg font-semibold hover:opacity-90 inline-flex items-center gap-2"
          >
            {isComingSoon ? 'Join waitlist' : 'Secure Alpha Access'}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  )
}
