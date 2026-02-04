import { useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2,
  Music,
  UserCircle,
  Briefcase,
  ArrowRight,
  Zap,
  FileSignature,
  GitBranch,
  Database,
  MousePointerClick,
  Layers,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const PERSONAS = {
  labels: {
    title: 'Labels',
    painPoint: 'scattered submissions, lost demos, and broken pipelines.',
    heroTitle: 'The Label Path',
    tagline: 'From fragmented A&R to one source of truth.',
    icon: Building2,
    hub: 'Label',
    dayInTheLife: {
      title: 'A day in the life: Label CEO',
      narrative:
        'Morning starts in SoundPath: one inbox for every demo, one pipeline from first listen to signed deal. Scouting syncs with legal—contract terms flow from the pipeline. Finance sees splits and guarantees without spreadsheets. No re-keying, no "who had the latest version?" The Label Hub, Sign, and Splits work as one system.',
    },
    dataIntegrity: [
      'Single submission record from first touch to release',
      'Phase advancement and votes tied to one track entity',
      'Contract metadata generated from pipeline, not typed twice',
    ],
    manualEntry: 'Eliminate duplicate entry between scouting, legal, and accounting. One sign-off, one data model.',
    integrations: [
      { app: 'Sign', icon: FileSignature, text: 'Turn approved artists into signed deals with metadata-aware contracts generated from your pipeline.' },
      { app: 'Splits', icon: GitBranch, text: 'Sync royalty splits and deal terms from Sign so accounting stays in lockstep with A&R.' },
    ],
  },
  venues: {
    title: 'Venues',
    painPoint: 'disjointed booking, capacity guesswork, and calendar chaos.',
    heroTitle: 'The Venue Path',
    tagline: 'From booking chaos to one operational truth.',
    icon: Music,
    hub: 'Venue',
    dayInTheLife: {
      title: 'A day in the life: Venue operator',
      narrative:
        'Booking requests land in one place. Capacity and calendar are linked; event metadata drives contracts and settlements. Talent buyers and finance share the same numbers. No more chasing riders or reconciling door splits in spreadsheets—Sign and Splits are wired to the Venue Hub.',
    },
    dataIntegrity: [
      'One event record from inquiry to settlement',
      'Booking and capacity linked to calendar and contracts',
      'Splits and guarantees derived from event data',
    ],
    manualEntry: 'Stop re-entering event details into contracts and accounting. One event, one source of truth.',
    integrations: [
      { app: 'Sign', icon: FileSignature, text: 'Generate booking agreements and riders from event metadata; one source of truth for contracts.' },
      { app: 'Splits', icon: GitBranch, text: 'Track door splits, guarantees, and settlement data alongside bookings.' },
    ],
  },
  artists: {
    title: 'Artists',
    painPoint: 'scattered pitches, unsigned demos, and no single place for their catalog.',
    heroTitle: 'The Artist Path',
    tagline: 'From scattered pitches to one portfolio.',
    icon: UserCircle,
    hub: 'Artist',
    dayInTheLife: {
      title: 'A day in the life: Artist',
      narrative:
        'Every pitch and deal lives in one place. Offers from labels and venues flow in; signing happens in Sign with metadata tied to the portfolio. Royalty and split statements from Splits connect to releases and shows. One login, one view of the whole career—no more digging through email and PDFs.',
    },
    dataIntegrity: [
      'One portfolio record for pitches, deals, and releases',
      'Offers and contracts linked to the same metadata',
      'Royalty and split visibility tied to catalog',
    ],
    manualEntry: 'No more re-entering deal terms or release info. One profile, one data backbone.',
    integrations: [
      { app: 'Sign', icon: FileSignature, text: 'View and sign deals and offers from labels and venues; metadata flows into your portfolio.' },
      { app: 'Splits', icon: GitBranch, text: 'See royalty and split statements tied to releases and shows.' },
    ],
  },
  agents: {
    title: 'Agents',
    painPoint: 'roster spread across tools, commissions in spreadsheets, and sync headaches.',
    heroTitle: 'The Agent Path',
    tagline: 'From roster sprawl to one representation engine.',
    icon: Briefcase,
    hub: 'Artist',
    dayInTheLife: {
      title: 'A day in the life: Agent',
      narrative:
        'Roster, deals, and commissions live in one system. Representation agreements are generated and tracked in Sign; metadata feeds roster and commission views. Splits handle payouts per deal and per artist. No more CRM plus spreadsheet plus contract pile—one SoundPath OS.',
    },
    dataIntegrity: [
      'One roster record per artist with deal and commission history',
      'Agreements and terms linked to the same metadata',
      'Commission and payout data from Sign and Splits',
    ],
    manualEntry: 'Stop syncing between CRM, contracts, and accounting. One roster, one pipeline.',
    integrations: [
      { app: 'Sign', icon: FileSignature, text: 'Generate and track representation agreements; metadata feeds roster and commissions.' },
      { app: 'Splits', icon: GitBranch, text: 'Track commissions and payouts per deal and per artist.' },
    ],
  },
}

/** Simple conceptual diagram: Fragmented (multiple boxes) vs. SoundPath OS (one flow). */
function DataFlowDiagram({ personaTitle }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/60 to-os-bg p-6 sm:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fragmented */}
        <div>
          <h3 className="text-sm font-semibold text-amber-400/90 uppercase tracking-wider mb-4">The fragmented industry</h3>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {['Inbox', 'Sheets', 'Email', 'Contracts', 'Accounting'].map((label, i) => (
              <div
                key={label}
                className="px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-200/80 text-xs font-medium"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {label}
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-3 text-center sm:text-left">Multiple tools, manual sync, duplicate entry.</p>
        </div>
        {/* SoundPath OS */}
        <div>
          <h3 className="text-sm font-semibold text-neon-purple uppercase tracking-wider mb-4">The SoundPath OS</h3>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <div className="px-3 py-2 rounded-lg border border-neon-purple/50 bg-neon-purple/10 text-white text-xs font-medium">
              {personaTitle} Hub
            </div>
            <div className="px-3 py-2 rounded-lg border border-neon-purple/50 bg-neon-purple/10 text-white text-xs font-medium">
              Sign
            </div>
            <div className="px-3 py-2 rounded-lg border border-neon-purple/50 bg-neon-purple/10 text-white text-xs font-medium">
              Splits
            </div>
          </div>
          <p className="text-gray-400 text-xs mt-3 text-center sm:text-left">One data model. Data integrity. No re-entry.</p>
        </div>
      </div>
    </div>
  )
}

export default function SolutionPage() {
  const { persona } = useParams()
  const navigate = useNavigate()
  const data = persona ? PERSONAS[persona.toLowerCase()] : null

  if (!data) {
    return <Navigate to="/solutions/labels" replace />
  }

  const Icon = data.icon

  return (
    <div className="bg-os-bg min-h-screen">
      {/* Hero: The Dream / Conceptualization */}
      <section className="pt-16 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900/40 to-os-bg">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-neon-purple/20 mb-6">
              <Icon className="w-8 h-8 text-neon-purple" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
              {data.heroTitle}
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-2">
              {data.tagline}
            </p>
            <p className="text-gray-500 max-w-xl mx-auto mb-8">
              The fragmented industry vs. the SoundPath OS—one data model for {data.title.toLowerCase()}.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="px-6 py-3 bg-gradient-to-r from-neon-purple to-recording-red text-white rounded-lg font-semibold hover:opacity-90 flex items-center gap-2"
              >
                Get Started
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/products/' + (data.hub.toLowerCase()))}
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-semibold hover:border-gray-500 hover:text-white"
              >
                See the product: {data.hub} Hub
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Conceptual data flow: Fragmented vs. OS */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-white mb-2 text-center"
          >
            High-level data flow
          </motion.h2>
          <p className="text-gray-500 text-sm text-center mb-8">
            How {data.title} move from scattered tools to one OS.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <DataFlowDiagram personaTitle={data.title} />
          </motion.div>
        </div>
      </section>

      {/* Day in the Life */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/30">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl border border-gray-800 bg-os-bg/80"
          >
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-neon-purple" />
              <h2 className="text-xl font-bold text-white">{data.dayInTheLife.title}</h2>
            </div>
            <p className="text-gray-300 leading-relaxed">
              {data.dayInTheLife.narrative}
            </p>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="mt-6 px-5 py-2.5 bg-neon-purple/20 border border-neon-purple/40 text-neon-purple rounded-lg font-semibold hover:bg-neon-purple/30 transition-colors"
            >
              See pricing
            </button>
          </motion.div>
        </div>
      </section>

      {/* Data Integrity + Eliminating Manual Entry */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-xl border border-gray-800 bg-gray-900/30"
          >
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-bold text-white">Data integrity</h3>
            </div>
            <ul className="space-y-2">
              {data.dataIntegrity.map((item, i) => (
                <li key={i} className="flex gap-2 text-gray-300 text-sm">
                  <span className="text-green-400 shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-xl border border-gray-800 bg-gray-900/30"
          >
            <div className="flex items-center gap-2 mb-4">
              <MousePointerClick className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Eliminating manual entry</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {data.manualEntry}
            </p>
          </motion.div>
        </div>
      </section>

      {/* How this persona integrates with the OS */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/30">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-white mb-2 text-center"
          >
            How {data.title} integrates with the OS
          </motion.h2>
          <p className="text-gray-500 text-center mb-10">
            The {data.hub} Hub connects to Sign and Splits—no silos.
          </p>
          <div className="space-y-6">
            {data.integrations.map((item, i) => {
              const AppIcon = item.icon
              return (
                <motion.div
                  key={item.app}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-4 p-6 rounded-xl bg-os-bg border border-gray-800 hover:border-neon-purple/30 transition-colors"
                >
                  <div className="shrink-0 p-3 rounded-lg bg-neon-purple/20">
                    <AppIcon className="w-6 h-6 text-neon-purple" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">SoundPath {item.app}</h3>
                    <p className="text-gray-400">{item.text}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready for the {data.heroTitle}?</h2>
          <p className="text-gray-400 mb-6">Join teams already on SoundPath One.</p>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="px-8 py-3 bg-gradient-to-r from-neon-purple to-recording-red text-white rounded-lg font-semibold hover:opacity-90 inline-flex items-center gap-2"
          >
            Secure Alpha Access
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  )
}
