/**
 * House Minimums section for Venue Settings. Non-negotiable base costs for every event.
 */
import { useState } from 'react'
import { Lock, DollarSign, Plus, Edit2, ChevronDown, X } from 'lucide-react'
import { useVenueCatalog } from '../../context/VenueCatalogContext'

const COST_CATEGORIES = ['Equipment', 'Labor', 'Venue', 'Admin', 'Maintenance', 'Supplies', 'Food', 'Insurance']

export default function VenueHouseMinimums() {
  const catalog = useVenueCatalog()
  const [openId, setOpenId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', basePrice: 0, costBreakdown: [] })

  if (!catalog) return null
  const { houseMinimums, getHouseMinimumTotal, addMenuItem, updateMenuItem } = catalog

  const resetForm = () => {
    setForm({ name: '', description: '', basePrice: 0, costBreakdown: [] })
    setEditingItem(null)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      description: item.description || '',
      basePrice: item.basePrice,
      costBreakdown: [...(item.costBreakdown || [])],
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.name?.trim()) return
    const payload = {
      ...form,
      isHouseMinimum: true,
      category: 'production',
      subcategory: 'House Minimums',
    }
    if (editingItem) {
      updateMenuItem(editingItem.id, payload)
    } else {
      addMenuItem({ id: `house-min-${Date.now()}`, ...payload })
    }
    setModalOpen(false)
    resetForm()
  }

  const addCostLine = () => {
    setForm((prev) => ({
      ...prev,
      costBreakdown: [...prev.costBreakdown, { id: `cost-${Date.now()}`, name: '', amount: 0, category: 'Admin' }],
    }))
  }

  const updateCostLine = (index, updates) => {
    setForm((prev) => ({
      ...prev,
      costBreakdown: prev.costBreakdown.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    }))
  }

  const removeCostLine = (index) => {
    setForm((prev) => ({ ...prev, costBreakdown: prev.costBreakdown.filter((_, i) => i !== index) }))
  }

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20">
            <Lock className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">House Minimums</h3>
            <p className="text-xs text-gray-500">Non-negotiable base costs for every event</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-medium">
          <DollarSign className="w-4 h-4" />
          {getHouseMinimumTotal().toLocaleString()}
        </span>
      </div>
      <div className="p-4 space-y-2">
        {houseMinimums.map((item) => (
          <div key={item.id} className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(openId === item.id ? null : item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
            >
              <div className="w-5 h-5 rounded border border-emerald-500/50 bg-emerald-500/20 flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{item.name}</p>
                {item.description && <p className="text-sm text-gray-500 truncate">{item.description}</p>}
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded text-sm font-medium border border-gray-600 text-gray-300">
                ${item.basePrice?.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleEdit(item) }}
                className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700"
                aria-label="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${openId === item.id ? 'rotate-180' : ''}`} />
            </button>
            {openId === item.id && item.costBreakdown?.length > 0 && (
              <div className="px-4 pb-4 pt-0 pl-12 space-y-2">
                <p className="text-xs text-gray-500 mb-2">Cost breakdown</p>
                {item.costBreakdown.map((cost) => (
                  <div key={cost.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-900/50">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-400">{cost.category}</span>
                      <span className="text-sm text-white">{cost.name}</span>
                    </div>
                    <span className="text-sm font-medium text-white">${cost.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <p className="text-sm text-gray-500 mt-3 px-1">
          House minimums are automatically applied to every event and cannot be removed.
        </p>
        <button
          type="button"
          onClick={() => { resetForm(); setModalOpen(true) }}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors mt-2"
        >
          <Plus className="w-4 h-4" />
          Add House Minimum
        </button>
      </div>

      {/* Modal: Add / Edit House Minimum */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setModalOpen(false); resetForm() }}>
          <div className="bg-gray-900 border border-emerald-500/20 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">{editingItem ? 'Edit House Minimum' : 'Add House Minimum'}</h3>
              <button type="button" onClick={() => { setModalOpen(false); resetForm() }} className="p-2 text-gray-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Item name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Venue Insurance"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Base price ($)</label>
                <input
                  type="number"
                  min="0"
                  value={form.basePrice}
                  onChange={(e) => setForm((f) => ({ ...f, basePrice: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">Cost breakdown</label>
                  <button type="button" onClick={addCostLine} className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                    + Add line
                  </button>
                </div>
                {form.costBreakdown.map((cost, i) => (
                  <div key={cost.id} className="flex gap-2 mb-2">
                    <select
                      value={cost.category}
                      onChange={(e) => updateCostLine(i, { category: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm w-32"
                    >
                      {COST_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={cost.name}
                      onChange={(e) => updateCostLine(i, { name: e.target.value })}
                      placeholder="Line item"
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      value={cost.amount}
                      onChange={(e) => updateCostLine(i, { amount: Number(e.target.value) || 0 })}
                      className="w-24 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm"
                    />
                    <button type="button" onClick={() => removeCostLine(i)} className="p-2 text-gray-500 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-2">
              <button type="button" onClick={() => { setModalOpen(false); resetForm() }} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800">
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={!form.name?.trim()} className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                {editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
