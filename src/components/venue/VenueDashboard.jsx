/**
 * Venue dashboard: stat widgets, tabs (Overview, Venue Settings, Logistics), list shows. Same Supabase as rest of SoundPath.
 * Title shows stage name or "Venue overview" with a switcher; header dropdown is venue selector.
 */
import { useState, useEffect } from 'react'
import { CalendarPlus, Calendar, Clock, CheckCircle2, LayoutDashboard, Settings, Truck, AlertCircle, ChevronDown, Box, Trash2, X } from 'lucide-react'
import { upsertShow } from '../../lib/showApi'
import { updateVenue, archiveVenue } from '../../lib/venueApi'
import { supabase } from '../../lib/supabaseClient'
import VenueHouseMinimums from './VenueHouseMinimums'
import VenueCatalogManager from './VenueCatalogManager'
import VenueGreenRoomCatalog from './VenueGreenRoomCatalog'
import VenueStagesEditor from './VenueStagesEditor'

const MACRO_VIEW_ID = '__macro__'

function useStages(venueId, refetchDeps = []) {
  const [stages, setStages] = useState([])
  useEffect(() => {
    if (!supabase || !venueId) {
      setStages([])
      return
    }
    let cancelled = false
    supabase
      .from('stages')
      .select('*')
      .eq('venue_id', venueId)
      .order('name')
      .then(({ data }) => {
        if (!cancelled) setStages(data ?? [])
      })
    return () => { cancelled = true }
  }, [venueId, ...refetchDeps])
  return stages
}

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

function sharedFacilitiesFromVenue(venue) {
  if (!venue?.shared_facilities_json) return []
  const raw = venue.shared_facilities_json
  if (Array.isArray(raw)) return raw
  if (raw?.facilities && Array.isArray(raw.facilities)) return raw.facilities
  return []
}

function MacroVenueView({ venue, stages }) {
  const facilities = sharedFacilitiesFromVenue(venue)
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Shared resources and stages for this venue</p>
      {facilities.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Shared facilities</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {facilities.map((f) => (
              <div key={f.id} className="p-4 rounded-xl border border-gray-700 bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{f.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${f.status === 'occupied' ? 'bg-red-500/20 text-red-400' : 'bg-gray-600 text-gray-400'}`}>
                    {f.status ?? 'available'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="space-y-3">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stages</h3>
        {stages.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {stages.map((s) => (
              <div key={s.id} className="p-4 rounded-xl border border-gray-700 bg-gray-800/50 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/20">
                  <Box className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="font-medium text-white">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.capacity != null ? `Cap. ${s.capacity}` : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No stages yet. Add stages in Venue Settings.</p>
        )}
      </section>
    </div>
  )
}

export default function VenueDashboard({
  activeVenueId,
  activeVenue,
  venues = [],
  shows = [],
  loading,
  refetchShows,
  refetchVenues,
  setActiveVenueId,
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [stageView, setStageView] = useState(MACRO_VIEW_ID)
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState(defaultEvent())
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)
  // Venue settings form (synced from venue)
  const [settingsForm, setSettingsForm] = useState({ name: '', capacity: '', address_street_1: '', address_street_2: '', address_city: '', address_state_region: '', address_postal_code: '', address_country: '', timezone: '' })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  // Delete venue: 0 = hidden, 1 = first step, 2 = type name to confirm
  const [deleteStep, setDeleteStep] = useState(0)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [stagesVersion, setStagesVersion] = useState(0)

  const stages = useStages(activeVenueId, [stagesVersion])
  const venue = activeVenue ?? (activeVenueId ? venues.find((v) => v.id === activeVenueId) : null)
  const currentStage = stageView !== MACRO_VIEW_ID ? stages.find((s) => s.id === stageView) : null
  const stageDisplayName = stageView === MACRO_VIEW_ID ? 'Venue overview' : (currentStage?.name ?? 'Venue overview')
  const showMacroView = stageView === MACRO_VIEW_ID && stages.length > 0

  useEffect(() => {
    setStageView(MACRO_VIEW_ID)
  }, [activeVenueId])

  // Sync venue settings form from current venue
  useEffect(() => {
    if (!venue) {
      setSettingsForm({ name: '', capacity: '', address_street_1: '', address_street_2: '', address_city: '', address_state_region: '', address_postal_code: '', address_country: '', timezone: '' })
      return
    }
    setSettingsForm({
      name: venue.name ?? '',
      capacity: venue.capacity != null ? String(venue.capacity) : '',
      address_street_1: venue.address_street_1 ?? '',
      address_street_2: venue.address_street_2 ?? '',
      address_city: venue.address_city ?? '',
      address_state_region: venue.address_state_region ?? '',
      address_postal_code: venue.address_postal_code ?? '',
      address_country: venue.address_country ?? '',
      timezone: venue.timezone ?? '',
    })
    setDeleteStep(0)
    setDeleteConfirmName('')
    setDeleteError(null)
  }, [venue?.id, venue?.name, venue?.capacity, venue?.address_street_1, venue?.address_street_2, venue?.address_city, venue?.address_state_region, venue?.address_postal_code, venue?.address_country, venue?.timezone])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    if (!activeVenueId) return
    setSettingsSaving(true)
    setSettingsSaved(false)
    try {
      await updateVenue(activeVenueId, {
        name: settingsForm.name?.trim() || null,
        capacity: settingsForm.capacity === '' ? null : parseInt(settingsForm.capacity, 10),
        address_street_1: settingsForm.address_street_1?.trim() || null,
        address_street_2: settingsForm.address_street_2?.trim() || null,
        address_city: settingsForm.address_city?.trim() || null,
        address_state_region: settingsForm.address_state_region?.trim() || null,
        address_postal_code: settingsForm.address_postal_code?.trim() || null,
        address_country: settingsForm.address_country?.trim() || null,
        timezone: settingsForm.timezone?.trim() || null,
      })
      await refetchVenues?.()
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleDeleteVenue = async () => {
    if (!activeVenueId || deleteStep !== 2) return
    const trimmed = (venue?.name ?? '').trim()
    if (deleteConfirmName.trim() !== trimmed) {
      setDeleteError('Name does not match. Type the venue name exactly to confirm.')
      return
    }
    setDeleteSaving(true)
    setDeleteError(null)
    try {
      await archiveVenue(activeVenueId)
      await refetchVenues?.()
      const remaining = venues.filter((v) => v.id !== activeVenueId)
      setActiveVenueId?.(remaining[0]?.id ?? null)
      setDeleteStep(0)
      setDeleteConfirmName('')
    } catch (err) {
      setDeleteError(err?.message ?? 'Failed to remove venue.')
    } finally {
      setDeleteSaving(false)
    }
  }

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
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-white tracking-tight">{stageDisplayName}</h2>
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setStageDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-600 bg-gray-800/80 text-gray-200 hover:bg-gray-700 text-sm font-normal"
              >
                {stageDisplayName}
                <ChevronDown className="w-4 h-4 shrink-0" />
              </button>
              {stageDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 min-w-[200px] py-1 bg-[#0B0E14] border border-gray-700 rounded-lg shadow-xl z-50">
                  <button
                    type="button"
                    onClick={() => { setStageView(MACRO_VIEW_ID); setStageDropdownOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${showMacroView ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    Venue overview
                  </button>
                  {stages.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setStageView(s.id); setStageDropdownOpen(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${stageView === s.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                      <Box className="w-4 h-4 shrink-0" />
                      {s.name}
                      {s.capacity != null && <span className="ml-auto text-xs text-gray-500">Cap. {s.capacity}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {!showMacroView && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 font-medium shrink-0"
            >
              <CalendarPlus className="w-4 h-4" />
              Add Show
            </button>
          )}
        </div>

        {showMacroView && venue ? (
          <MacroVenueView venue={venue} stages={stages} />
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Tab content (only when a stage is selected, not Venue overview) */}
      {!showMacroView && activeTab === 'overview' && (
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

      {!showMacroView && activeTab === 'venue-settings' && venue && (
        <div className="space-y-6 pb-8">
          {/* Venue details */}
          <section className="rounded-xl border border-gray-700 border-emerald-500/10 bg-gray-800/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20">
                <Settings className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Venue details</h3>
                <p className="text-xs text-gray-500">Name, capacity, address & timezone</p>
              </div>
            </div>
            <form onSubmit={handleSaveSettings} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Venue name</label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. The Grand Hall"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Capacity</label>
                <input
                  type="number"
                  min="0"
                  value={settingsForm.capacity}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, capacity: e.target.value }))}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Street address 1</label>
                <input
                  type="text"
                  value={settingsForm.address_street_1}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, address_street_1: e.target.value }))}
                  placeholder="Street and number"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Street address 2 (optional)</label>
                <input
                  type="text"
                  value={settingsForm.address_street_2}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, address_street_2: e.target.value }))}
                  placeholder="Suite, unit, etc."
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">City</label>
                  <input
                    type="text"
                    value={settingsForm.address_city}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, address_city: e.target.value }))}
                    placeholder="City"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">State / Region</label>
                  <input
                    type="text"
                    value={settingsForm.address_state_region}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, address_state_region: e.target.value }))}
                    placeholder="State or region"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Postal code</label>
                  <input
                    type="text"
                    value={settingsForm.address_postal_code}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, address_postal_code: e.target.value }))}
                    placeholder="ZIP / Postal code"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Country</label>
                  <input
                    type="text"
                    value={settingsForm.address_country}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, address_country: e.target.value }))}
                    placeholder="Country"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Timezone</label>
                <input
                  type="text"
                  value={settingsForm.timezone}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, timezone: e.target.value }))}
                  placeholder="e.g. America/New_York"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 font-medium"
                >
                  {settingsSaving ? 'Saving…' : 'Save changes'}
                </button>
                {settingsSaved && <span className="text-sm text-emerald-400">Saved.</span>}
              </div>
            </form>
          </section>

          {/* Edit stages */}
          <VenueStagesEditor
            venueId={activeVenueId}
            onStagesChange={() => setStagesVersion((v) => v + 1)}
          />

          {/* House Minimums, Catalog Manager, Green Room & Hospitality */}
          <VenueHouseMinimums />
          <VenueCatalogManager />
          <VenueGreenRoomCatalog />

          <div className="pt-2">
            <button
              type="button"
              onClick={() => { setDeleteStep(1); setDeleteConfirmName(''); setDeleteError(null) }}
              className="text-sm px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Venue
            </button>
          </div>
        </div>
      )}

      {/* Delete venue confirmation modal - two steps */}
      {deleteStep >= 1 && venue && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (deleteStep === 1) {
              setDeleteStep(0)
              setDeleteConfirmName('')
              setDeleteError(null)
            }
          }}
        >
          <div
            className={`bg-gray-900 border-2 rounded-lg p-6 max-w-md w-full ${deleteStep === 1 ? 'border-yellow-500/50' : 'border-red-500/50'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {deleteStep === 1 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-6 h-6 text-yellow-500" />
                    <h3 className="text-xl font-bold text-white">Delete Venue?</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDeleteStep(0); setDeleteConfirmName(''); setDeleteError(null) }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-300 mb-6">
                  The venue will be permanently removed from your account. This cannot be undone or restored.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-400 transition-all"
                  >
                    Yes, Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteStep(0); setDeleteConfirmName(''); setDeleteError(null) }}
                    className="flex-1 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-6 h-6 text-red-500" />
                    <h3 className="text-xl font-bold text-red-400">Confirm deletion</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDeleteStep(1); setDeleteConfirmName(''); setDeleteError(null) }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-300 mb-3">
                  Type the venue name <strong className="text-white">&quot;{venue.name}&quot;</strong> to confirm.
                </p>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => { setDeleteConfirmName(e.target.value); setDeleteError(null) }}
                  placeholder="Venue name"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 mb-4"
                  aria-label="Confirm venue name"
                />
                {deleteError && <p className="text-red-400 text-sm mb-3">{deleteError}</p>}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleDeleteVenue}
                    disabled={deleteSaving || deleteConfirmName.trim() !== (venue?.name ?? '').trim()}
                    className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteSaving ? 'Removing…' : 'Delete Venue'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteStep(1); setDeleteConfirmName(''); setDeleteError(null) }}
                    className="flex-1 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300"
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!showMacroView && activeTab === 'logistics' && (
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
