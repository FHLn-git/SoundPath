/**
 * Green Room & Hospitality: manage green room catalog items (hospitality, non–house minimum).
 */
import { useState } from 'react'
import { Coffee, Plus, Edit2, Trash2, X, Wine, UtensilsCrossed, Laptop, Sofa } from 'lucide-react'
import { useVenueCatalog } from '../../context/VenueCatalogContext'

const CATEGORY_OPTIONS = [
  { value: 'Drinks', icon: Wine },
  { value: 'Food', icon: UtensilsCrossed },
  { value: 'Tech', icon: Laptop },
  { value: 'Comfort', icon: Sofa },
]

export default function VenueGreenRoomCatalog() {
  const catalog = useVenueCatalog()
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState({ name: '', category: 'Drinks', venueCost: 0, promoterPrice: 0 })

  if (!catalog) return null
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = catalog

  const greenRoomItems = menuItems.filter(
    (item) => item.category === 'hospitality' && !item.isHouseMinimum
  )

  const resetForm = () => {
    setForm({ name: '', category: 'Drinks', venueCost: 0, promoterPrice: 0 })
    setEditingItem(null)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    const venueCost = item.costBreakdown?.find((c) => c.category === 'Venue')?.amount ?? 0
    setForm({
      name: item.name,
      category: CATEGORY_OPTIONS.some((o) => o.value === item.subcategory) ? item.subcategory : 'Drinks',
      venueCost,
      promoterPrice: item.basePrice ?? 0,
    })
    setFormOpen(true)
  }

  const handleSave = () => {
    if (!form.name?.trim() || form.promoterPrice <= 0) return
    const itemData = {
      name: form.name,
      description: `${form.category} item for green room hospitality`,
      basePrice: form.promoterPrice,
      category: 'hospitality',
      subcategory: form.category,
      costBreakdown: [{ id: `venue-${Date.now()}`, name: 'Venue Cost', amount: form.venueCost, category: 'Venue' }],
    }
    if (editingItem) {
      updateMenuItem(editingItem.id, itemData)
    } else {
      addMenuItem({ id: `green-room-${Date.now()}`, ...itemData })
    }
    setFormOpen(false)
    resetForm()
  }

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20">
          <Coffee className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Green Room & Hospitality</h3>
          <p className="text-xs text-gray-500">Manage green room items for promoters</p>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50 border-emerald-500/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">{editingItem ? 'Edit item' : 'Add new item'}</h4>
            {!formOpen && !editingItem && (
              <button type="button" onClick={() => setFormOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm transition-colors">
                <Plus className="w-4 h-4" />
                Add
              </button>
            )}
          </div>
          {(formOpen || editingItem) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Item name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. 12pk Sparkling Water" className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white">
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Venue cost ($)</label>
                <input type="number" min="0" step="0.01" value={form.venueCost} onChange={(e) => setForm((f) => ({ ...f, venueCost: Number(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Promoter price ($)</label>
                <input type="number" min="0" step="0.01" value={form.promoterPrice} onChange={(e) => setForm((f) => ({ ...f, promoterPrice: Number(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <button type="button" onClick={handleSave} disabled={!form.name?.trim() || form.promoterPrice <= 0} className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                  {editingItem ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => { setFormOpen(false); resetForm() }} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {greenRoomItems.length > 0 ? (
          <div className="space-y-2">
            {greenRoomItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 px-4 rounded-lg border border-gray-700 bg-gray-800/50">
                <div>
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.subcategory} · ${item.basePrice?.toLocaleString()} to promoter</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleEdit(item)} className="p-2 text-gray-500 hover:text-white rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => { if (confirm('Delete this item?')) deleteMenuItem(item.id) }} className="p-2 text-gray-500 hover:text-red-400 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-4 text-center">No green room items yet. Add items above.</p>
        )}
      </div>
    </section>
  )
}
