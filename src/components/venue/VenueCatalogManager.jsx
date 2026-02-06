/**
 * Catalog Manager: production/staffing/hospitality menu items (excluding house minimums and Green Room).
 */
import { useState } from 'react'
import { Package, Plus, Edit2, Trash2, ChevronDown, X, Volume2, Lightbulb, Guitar, Shield, Wine } from 'lucide-react'
import { useVenueCatalog } from '../../context/VenueCatalogContext'

const SUBCATEGORIES = ['Sound', 'Lights', 'Backline', 'Security', 'Bar']
const CATEGORY_ICONS = { Sound: Volume2, Lights: Lightbulb, Backline: Guitar, Security: Shield, Bar: Wine }
const COST_CATEGORIES = ['Equipment', 'Labor', 'Venue', 'Admin', 'Maintenance', 'Supplies', 'Food']

export default function VenueCatalogManager() {
  const catalog = useVenueCatalog()
  const [openSub, setOpenSub] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    basePrice: 0,
    category: 'production',
    subcategory: 'Sound',
    costBreakdown: [],
  })

  if (!catalog) return null
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = catalog

  const nonHouse = menuItems.filter((item) => !item.isHouseMinimum && item.subcategory !== 'Green Room')
  const grouped = nonHouse.reduce((acc, item) => {
    const sub = item.subcategory || 'Other'
    if (!acc[sub]) acc[sub] = []
    acc[sub].push(item)
    return acc
  }, {})

  const resetForm = () => {
    setForm({ name: '', description: '', basePrice: 0, category: 'production', subcategory: 'Sound', costBreakdown: [] })
    setEditingItem(null)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      description: item.description || '',
      basePrice: item.basePrice,
      category: item.category || 'production',
      subcategory: item.subcategory || 'Sound',
      costBreakdown: [...(item.costBreakdown || [])],
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.name?.trim()) return
    if (editingItem) {
      updateMenuItem(editingItem.id, form)
    } else {
      addMenuItem({ id: `item-${Date.now()}`, ...form })
    }
    setModalOpen(false)
    resetForm()
  }

  const addCostLine = () => {
    setForm((prev) => ({
      ...prev,
      costBreakdown: [...prev.costBreakdown, { id: `cost-${Date.now()}`, name: '', amount: 0, category: 'Equipment' }],
    }))
  }

  const updateCostLine = (i, updates) => {
    setForm((prev) => ({
      ...prev,
      costBreakdown: prev.costBreakdown.map((c, j) => (j === i ? { ...c, ...updates } : c)),
    }))
  }

  const removeCostLine = (i) => {
    setForm((prev) => ({ ...prev, costBreakdown: prev.costBreakdown.filter((_, j) => j !== i) }))
  }

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20">
          <Package className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Catalog Manager</h3>
          <p className="text-xs text-gray-500">Create and manage menu items with cost breakdowns</p>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {Object.entries(grouped).map(([subcategory, items]) => {
          const Icon = CATEGORY_ICONS[subcategory] || Package
          const isOpen = openSub === subcategory
          return (
            <div key={subcategory} className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenSub(isOpen ? null : subcategory)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/50"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20">
                  <Icon className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="font-medium text-white">{subcategory}</span>
                <span className="px-2 py-0.5 rounded text-xs bg-gray-600 text-gray-300">{items.length} items</span>
                <ChevronDown className={`w-4 h-4 ml-auto text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pl-12 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-900/50">
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
                        {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-300">${item.basePrice?.toLocaleString()}</span>
                        <button type="button" onClick={() => handleEdit(item)} className="p-1.5 text-gray-500 hover:text-white rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => { if (confirm('Delete this item?')) deleteMenuItem(item.id) }} className="p-1.5 text-gray-500 hover:text-red-400 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <button
          type="button"
          onClick={() => { resetForm(); setModalOpen(true) }}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 mt-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add catalog item
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setModalOpen(false); resetForm() }}>
          <div className="bg-gray-900 border border-emerald-500/20 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">{editingItem ? 'Edit item' : 'Add catalog item'}</h3>
              <button type="button" onClick={() => { setModalOpen(false); resetForm() }} className="p-2 text-gray-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. House Sound System" className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Base price ($)</label>
                <input type="number" min="0" value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: Number(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subcategory</label>
                <select value={form.subcategory} onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white">
                  {SUBCATEGORIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500" placeholder="Optional" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Cost breakdown</span>
                  <button type="button" onClick={addCostLine} className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">+ Add line</button>
                </div>
                {form.costBreakdown.map((cost, i) => (
                  <div key={cost.id} className="flex gap-2 mb-2">
                    <select value={cost.category} onChange={(e) => updateCostLine(i, { category: e.target.value })} className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm w-28">
                      {COST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="text" value={cost.name} onChange={(e) => updateCostLine(i, { name: e.target.value })} placeholder="Line" className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm" />
                    <input type="number" min="0" value={cost.amount} onChange={(e) => updateCostLine(i, { amount: Number(e.target.value) || 0 })} className="w-20 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm" />
                    <button type="button" onClick={() => removeCostLine(i)} className="p-2 text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-2">
              <button type="button" onClick={() => { setModalOpen(false); resetForm() }} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800">Cancel</button>
              <button type="button" onClick={handleSave} disabled={!form.name?.trim()} className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors">{editingItem ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
