/**
 * Venue dashboard: list shows for active venue, add show. Same Supabase as rest of SoundPath.
 */
import { useState } from 'react'
import { CalendarPlus, Calendar, Clock, CheckCircle2 } from 'lucide-react'
import { upsertShow } from '../../lib/showApi'

const defaultEvent = () => ({
  id: `event-${Date.now()}`,
  name: '',
  date: new Date().toISOString().slice(0, 10),
  loadIn: '14:00',
  soundcheck: '16:00',
  doors: '19:00',
  curfew: '23:00',
  loadOut: '00:00',
  status: 'draft',
  selectedItems: [],
  greenRoomItems: [],
  bands: [],
  wizardCompleted: false,
  specialRequests: '',
})

export default function VenueDashboard({
  activeVenueId,
  shows = [],
  loading,
  refetchShows,
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState(defaultEvent())
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)

  const handleAddShow = async (e) => {
    e.preventDefault()
    if (!activeVenueId || !form.name?.trim() || !form.date) return
    setSaving(true)
    try {
      const saved = await upsertShow(activeVenueId, { ...form })
      await refetchShows()
      setCreated(saved ?? form)
      setForm(defaultEvent())
      setShowAddForm(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-800 rounded" />
        <div className="h-64 bg-gray-800 rounded-lg" />
      </div>
    )
  }

  if (created) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neon-purple/10 mb-4">
          <CheckCircle2 className="w-8 h-8 text-neon-purple" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-1">Show created</h3>
        <p className="text-gray-500 mb-6">
          {created.name} on {new Date(created.date).toLocaleDateString()}
        </p>
        <button
          type="button"
          onClick={() => setCreated(null)}
          className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          Add another show
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white tracking-tight">Control Room</h2>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-purple text-white hover:bg-neon-purple/90 font-medium"
        >
          <CalendarPlus className="w-4 h-4" />
          Add Show
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddShow}
          className="p-4 rounded-xl border border-gray-700 bg-gray-800/50 space-y-4"
        >
          <h3 className="text-lg font-semibold text-white">New show</h3>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Show name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Summer Night Live"
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Doors</label>
              <input
                type="time"
                value={form.doors}
                onChange={(e) => setForm((f) => ({ ...f, doors: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Curfew</label>
              <input
                type="time"
                value={form.curfew}
                onChange={(e) => setForm((f) => ({ ...f, curfew: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-neon-purple text-white hover:bg-neon-purple/90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create Show'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-gray-700 bg-gray-800/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2 text-gray-400">
          <Calendar className="w-4 h-4" />
          <span className="font-medium text-white">Shows</span>
        </div>
        {shows.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">
            No shows yet. Add a show to get started.
          </div>
        ) : (
          <ul className="divide-y divide-gray-700">
            {shows.map((show) => (
              <li
                key={show.id}
                className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-700 text-gray-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{show.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(show.date).toLocaleDateString()}
                      {show.doors ? ` · Doors ${show.doors}` : ''}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                    show.status === 'confirmed'
                      ? 'bg-green-500/20 text-green-400'
                      : show.status === 'pending-approval'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-gray-600 text-gray-400'
                  }`}
                >
                  {show.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
