/**
 * Promoter View: simplified advance for one show (read/write). Sets section approval to PENDING_APPROVAL on save.
 * Route: /portal/promoter/show/:showId
 */
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { showRowToEvent } from '../lib/showApi'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Clock, Save, AlertTriangle } from 'lucide-react'

const base = (path = '') => (window.location.pathname.startsWith('/app/') ? `/app/portal/promoter${path}` : `/portal/promoter${path}`)

function formatTime(t) {
  if (!t) return '—'
  const part = String(t).slice(0, 5)
  const [h, m] = part.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m || '00'} ${ampm}`
}

export default function PromoterShowAdvancePage() {
  const { showId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth?.() ?? {}
  const [show, setShow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    loadIn: '',
    soundcheck: '',
    doors: '',
    curfew: '',
    loadOut: '',
    specialRequests: '',
  })

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    if (!showId) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('shows')
      .select('*')
      .eq('id', showId)
      .single()
      .then(({ data, error: e }) => {
        if (cancelled) return
        if (e) {
          setError(e.message)
          setShow(null)
          setLoading(false)
          return
        }
        const event = showRowToEvent(data)
        setShow(event)
        setForm({
          loadIn: event.loadIn || '14:00',
          soundcheck: event.soundcheck || '16:00',
          doors: event.doors || '19:00',
          curfew: event.curfew || '23:00',
          loadOut: event.loadOut || '00:00',
          specialRequests: event.specialRequests || '',
        })
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [showId, user, navigate])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!show || !show.venue_id) return
    setSaving(true)
    setError(null)
    try {
      const updated = {
        ...show,
        loadIn: form.loadIn,
        soundcheck: form.soundcheck,
        doors: form.doors,
        curfew: form.curfew,
        loadOut: form.loadOut,
        specialRequests: form.specialRequests,
        productionApprovalStatus: 'PENDING_APPROVAL',
        hospitalityApprovalStatus: 'PENDING_APPROVAL',
        scheduleApprovalStatus: 'PENDING_APPROVAL',
      }
      const { upsertShow } = await import('../lib/showApi')
      const result = await upsertShow(show.venue_id, updated)
      if (result) {
        setShow(result)
        setForm({
          loadIn: result.loadIn || form.loadIn,
          soundcheck: result.soundcheck || form.soundcheck,
          doors: result.doors || form.doors,
          curfew: result.curfew || form.curfew,
          loadOut: result.loadOut || form.loadOut,
          specialRequests: result.specialRequests || form.specialRequests,
        })
      }
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">Loading…</div>
    )
  }
  if (error && !show) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center text-gray-400">
          <p>{error}</p>
          <Link to={base()} className="text-emerald-500 hover:underline mt-2 inline-block">Back to portal</Link>
        </div>
      </div>
    )
  }
  if (!show) return null

  const anyPending = show.productionApprovalStatus === 'PENDING_APPROVAL' || show.hospitalityApprovalStatus === 'PENDING_APPROVAL' || show.scheduleApprovalStatus === 'PENDING_APPROVAL'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to={base()} className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{show.name}</h1>
            <p className="text-sm text-gray-500">{new Date(show.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {anyPending && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-6">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Awaiting venue approval. The venue will review and confirm your changes.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <section className="rounded-xl border border-gray-700 bg-gray-800/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2 text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="font-medium text-white">Schedule</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              {['loadIn', 'soundcheck', 'doors', 'curfew', 'loadOut'].map((key) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <input
                    type="time"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
                  />
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <label className="block text-xs text-gray-500 mb-1">Special requests</label>
              <textarea
                value={form.specialRequests}
                onChange={(e) => setForm((f) => ({ ...f, specialRequests: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                placeholder="Rider notes, backline, etc."
              />
            </div>
          </section>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save advance'}
          </button>
          <p className="text-xs text-gray-500 text-center">
            Saving will notify the venue to review. They can approve each section (Production, Hospitality, Schedule).
          </p>
        </form>

        {show.status === 'completed' && (
          <div className="mt-8 space-y-4">
            <section className="rounded-xl border border-gray-700 bg-gray-800/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="font-medium text-white">Settlement</h3>
                <p className="text-xs text-gray-500">Final payout figures</p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Gross ticket revenue</span>
                    <span className="text-white font-medium">—</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Promoter share</span>
                    <span className="text-white font-medium">—</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Net payout</span>
                    <span className="text-emerald-400 font-medium">—</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">Settlement is finalized after the show. Figures will appear here when available.</p>
              </div>
            </section>
            <section className="rounded-xl border border-gray-700 bg-gray-800/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="font-medium text-white">Ticketing reports</h3>
                <p className="text-xs text-gray-500">Read-only</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-500">Ticketing reports will be available here once the show is settled.</p>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
