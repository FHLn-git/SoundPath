/**
 * Edit stages for a venue: list, add, edit, delete. Used in Venue Settings.
 */
import { useState, useEffect } from 'react'
import { Box, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

function technicalNotesFromStage(stage) {
  const j = stage?.technical_specs_json
  if (!j || typeof j !== 'object') return ''
  if (typeof j.notes === 'string') return j.notes
  return ''
}

function technicalSpecsWithNotes(prev, notes) {
  const next = typeof prev === 'object' && prev !== null ? { ...prev } : {}
  if (notes != null && notes !== '') next.notes = notes
  else delete next.notes
  return next
}

export default function VenueStagesEditor({ venueId, onStagesChange }) {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [addForm, setAddForm] = useState({ open: false, name: '', capacity: '', notes: '' })
  const [editDraft, setEditDraft] = useState(null)

  useEffect(() => {
    if (!supabase || !venueId) {
      setStages([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('stages')
      .select('*')
      .eq('venue_id', venueId)
      .order('name')
      .then(({ data }) => {
        if (!cancelled) {
          setStages(data ?? [])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [venueId])

  const refetch = () => {
    if (!supabase || !venueId) return
    supabase
      .from('stages')
      .select('*')
      .eq('venue_id', venueId)
      .order('name')
      .then(({ data }) => setStages(data ?? []))
    onStagesChange?.()
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const name = addForm.name?.trim()
    const capacityVal = addForm.capacity?.trim()
    const capacity = capacityVal !== '' ? parseInt(capacityVal, 10) : NaN
    if (!name || !venueId || !Number.isInteger(capacity) || capacity < 0) return
    setSavingId('new')
    const technical_specs_json = addForm.notes?.trim() ? technicalSpecsWithNotes({}, addForm.notes.trim()) : {}
    const { error } = await supabase.from('stages').insert({
      venue_id: venueId,
      name,
      capacity,
      technical_specs_json,
    })
    setSavingId(null)
    if (error) {
      console.error(error)
      return
    }
    setAddForm({ open: false, name: '', capacity: '', notes: '' })
    refetch()
  }

  const handleUpdate = async (stage) => {
    if (!editDraft || editDraft.id !== stage.id) return
    const name = editDraft.name?.trim()
    const capacityVal = editDraft.capacity?.trim()
    const capacity = capacityVal !== '' ? parseInt(capacityVal, 10) : NaN
    if (!name || !Number.isInteger(capacity) || capacity < 0) return
    setSavingId(stage.id)
    const technical_specs_json = technicalSpecsWithNotes(stage.technical_specs_json ?? {}, editDraft.notes?.trim() ?? '')
    const { error } = await supabase
      .from('stages')
      .update({
        name,
        capacity,
        technical_specs_json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stage.id)
    setSavingId(null)
    setEditDraft(null)
    if (error) {
      console.error(error)
      return
    }
    refetch()
  }

  const handleDelete = async (stage) => {
    if (!window.confirm(`Delete stage "${stage.name}"? Shows linked to this stage will have their stage cleared.`)) return
    setDeletingId(stage.id)
    const { error } = await supabase.from('stages').delete().eq('id', stage.id)
    setDeletingId(null)
    if (error) {
      console.error(error)
      return
    }
    setEditDraft((d) => (d?.id === stage.id ? null : d))
    refetch()
  }

  const startEdit = (stage) => {
    setEditDraft({
      id: stage.id,
      name: stage.name ?? '',
      capacity: stage.capacity != null ? String(stage.capacity) : '',
      notes: technicalNotesFromStage(stage),
    })
  }

  const cancelEdit = () => setEditDraft(null)

  if (!venueId) return null

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20">
            <Box className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Stages</h3>
            <p className="text-xs text-gray-500">Add, edit, or remove stages for this venue</p>
          </div>
        </div>
        {!addForm.open && (
          <button
            type="button"
            onClick={() => setAddForm({ open: true, name: '', capacity: '', notes: '' })}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add stage
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading stages…</p>
        ) : (
          <>
            {stages.map((stage) => (
              <div
                key={stage.id}
                className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-3"
              >
                {editDraft?.id === stage.id ? (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input
                        type="text"
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Stage name"
                        className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Capacity (required)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={editDraft.capacity}
                        onChange={(e) => setEditDraft((d) => ({ ...d, capacity: e.target.value }))}
                        placeholder="e.g. 500"
                        className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Technical specs / notes</label>
                      <textarea
                        value={editDraft.notes}
                        onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))}
                        placeholder="Optional notes or specs"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdate(stage)}
                        disabled={savingId === stage.id || !editDraft.name?.trim() || editDraft.capacity === '' || !/^\d+$/.test(String(editDraft.capacity).trim()) || parseInt(editDraft.capacity, 10) < 0}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 text-sm font-medium"
                      >
                        {savingId === stage.id ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(stage)}
                        disabled={deletingId === stage.id}
                        className="ml-auto px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingId === stage.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{stage.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {stage.capacity != null ? `Capacity ${stage.capacity}` : 'No capacity set'}
                        {technicalNotesFromStage(stage) ? ' · ' + technicalNotesFromStage(stage).slice(0, 60) + (technicalNotesFromStage(stage).length > 60 ? '…' : '') : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(stage)}
                        className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(stage)}
                        disabled={deletingId === stage.id}
                        className="p-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        title="Delete stage"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {addForm.open && (
              <form onSubmit={handleCreate} className="rounded-lg border border-emerald-500/30 bg-gray-800/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-400">New stage</span>
                  <button
                    type="button"
                    onClick={() => setAddForm({ open: false, name: '', capacity: '', notes: '' })}
                    className="text-gray-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Main Stage"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Capacity (required)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={addForm.capacity}
                    onChange={(e) => setAddForm((f) => ({ ...f, capacity: e.target.value }))}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Technical specs / notes (optional)</label>
                  <textarea
                    value={addForm.notes}
                    onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes or specs"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingId === 'new' || !addForm.name?.trim() || addForm.capacity === '' || !/^\d+$/.test(String(addForm.capacity).trim()) || parseInt(addForm.capacity, 10) < 0}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 text-sm font-medium"
                  >
                    {savingId === 'new' ? 'Adding…' : 'Add stage'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddForm({ open: false, name: '', capacity: '', notes: '' })}
                    className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {stages.length === 0 && !addForm.open && (
              <p className="text-sm text-gray-500">No stages yet. Click &quot;Add stage&quot; to create one.</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
