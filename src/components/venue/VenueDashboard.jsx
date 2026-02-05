/**
 * Venue dashboard: stat widgets, tabs (Overview, Venue Settings, Logistics), list shows. Same Supabase as rest of SoundPath.
 */
import { useState } from 'react'
import { CalendarPlus, Calendar, Clock, CheckCircle2, LayoutDashboard, Settings, Truck, AlertCircle } from 'lucide-react'
import { upsertShow } from '../../lib/showApi'

function formatTime(time) {
  if (!time) return '—'
  const part = String(time).slice(0, 5)
  const [h, m] = part.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m || '00'} ${ampm}`
}

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
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState(defaultEvent())
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)

  const today = new Date().toISOString().slice(0, 10)
  const activeCount = shows.filter((s) => s.date >= today).length
  const confirmedCount = shows.filter((s) => s.status === 'confirmed').length
  const draftsCount = shows.filter((s) => s.status === 'draft').length

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

  const statWidgets = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/20">
          <Calendar className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-base font-semibold text-white leading-none">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Active Events</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-base font-semibold text-white leading-none">{confirmedCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Confirmed</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-white leading-none">{draftsCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Drafts</p>
        </div>
      </div>
    </div>
  )

  const tabListClass = (tab) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      activeTab === tab
        ? 'bg-gray-800 text-white border border-gray-600'
        : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent'
    }`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Control Room</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage your venue, catalog, and events</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 font-medium shrink-0"
          >
            <CalendarPlus className="w-4 h-4" />
            Add Show
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setActiveTab('overview')} className={tabListClass('overview')}>
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </button>
          <button type="button" onClick={() => setActiveTab('logistics')} className={tabListClass('logistics')}>
            <Truck className="w-4 h-4" />
            Logistics
          </button>
          <button type="button" onClick={() => setActiveTab('venue-settings')} className={tabListClass('venue-settings')}>
            <Settings className="w-4 h-4" />
            Venue Settings
          </button>
        </div>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {statWidgets}
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
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-800">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Create Show'}
                </button>
              </div>
            </form>
          )}
          <div className="rounded-xl border border-gray-700 bg-gray-800/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2 text-gray-400">
              <LayoutDashboard className="w-4 h-4" />
              <span className="font-medium text-white">All Events</span>
            </div>
            {shows.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                No shows yet. Add a show to get started.
              </div>
            ) : (
              <ul className="divide-y divide-gray-700">
                {shows.map((show) => (
                  <li key={show.id} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-800/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-700 text-gray-400 shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{show.name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(show.date).toLocaleDateString()}
                          {show.doors ? ` · Doors ${formatTime(show.doors)}` : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                        show.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : show.status === 'pending-approval' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-600 text-gray-400'
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
      )}

      {/* Venue Settings tab */}
      {activeTab === 'venue-settings' && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/30 p-8 text-center">
          <Settings className="w-12 h-12 mx-auto text-gray-500 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">Venue Settings</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Address, capacity, catalog, and green room options will be configurable here. Coming soon.
          </p>
        </div>
      )}

      {/* Logistics tab */}
      {activeTab === 'logistics' && (
        <div className="space-y-6">
          {statWidgets}
          <div className="rounded-xl border border-gray-700 bg-gray-800/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2 text-gray-400">
              <Truck className="w-4 h-4" />
              <span className="font-medium text-white">Load-In / Load-Out Schedule</span>
            </div>
            <div className="p-4 space-y-3">
              {shows.length === 0 ? (
                <div className="py-12 text-center text-gray-500 rounded-lg bg-gray-800/50">
                  <Truck className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm">No events scheduled</p>
                </div>
              ) : (
                shows.map((show) => (
                  <div key={show.id} className="p-4 rounded-lg border border-gray-700 bg-gray-800/50 hover:border-gray-600 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-white">{show.name}</h4>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                          show.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'
                        }`}
                      >
                        {show.status === 'confirmed' ? 'Confirmed' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {new Date(show.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div className="px-2 py-1.5 rounded bg-amber-500/10 text-center">
                        <span className="text-gray-500 block">Load-In</span>
                        <span className="font-medium text-white">{formatTime(show.loadIn)}</span>
                      </div>
                      <div className="px-2 py-1.5 rounded bg-gray-700/50 text-center">
                        <span className="text-gray-500 block">Soundcheck</span>
                        <span className="font-medium text-white">{formatTime(show.soundcheck)}</span>
                      </div>
                      <div className="px-2 py-1.5 rounded bg-emerald-500/10 text-center">
                        <span className="text-gray-500 block">Doors</span>
                        <span className="font-medium text-white">{formatTime(show.doors)}</span>
                      </div>
                      <div className="px-2 py-1.5 rounded bg-gray-700/50 text-center">
                        <span className="text-gray-500 block">Curfew</span>
                        <span className="font-medium text-white">{formatTime(show.curfew)}</span>
                      </div>
                      <div className="px-2 py-1.5 rounded bg-amber-500/10 text-center">
                        <span className="text-gray-500 block">Load-Out</span>
                        <span className="font-medium text-white">{formatTime(show.loadOut)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
