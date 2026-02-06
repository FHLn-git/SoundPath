/**
 * Venue catalog: menu items (house minimums, production, staffing, hospitality).
 * Same shape as dashboard event-context menuItems. In-memory for now; can persist to Supabase later.
 */
import { createContext, useContext, useState, useCallback } from 'react'

const DEFAULT_MENU_ITEMS = [
  { id: 'house-insurance', name: 'Venue Insurance', description: 'Liability coverage for the event', basePrice: 500, category: 'production', subcategory: 'House Minimums', costBreakdown: [{ id: 'ins-1', name: 'Liability Coverage', amount: 400, category: 'Insurance' }, { id: 'ins-2', name: 'Admin Fee', amount: 100, category: 'Admin' }], isHouseMinimum: true },
  { id: 'house-admin', name: 'Admin & Booking', description: 'Administrative costs and booking fees', basePrice: 350, category: 'production', subcategory: 'House Minimums', costBreakdown: [{ id: 'admin-1', name: 'Booking Fee', amount: 200, category: 'Admin' }, { id: 'admin-2', name: 'Contract Processing', amount: 150, category: 'Admin' }], isHouseMinimum: true },
  { id: 'house-staff', name: 'Basic Staff', description: 'Minimum required venue staff', basePrice: 800, category: 'staffing', subcategory: 'House Minimums', costBreakdown: [{ id: 'staff-1', name: 'Door Staff (2)', amount: 300, category: 'Labor' }, { id: 'staff-2', name: 'Sound Tech', amount: 250, category: 'Labor' }, { id: 'staff-3', name: 'Venue Manager', amount: 250, category: 'Labor' }], isHouseMinimum: true },
  { id: 'sound-basic', name: 'House Sound System', description: 'Standard PA and monitors', basePrice: 400, category: 'production', subcategory: 'Sound', costBreakdown: [{ id: 'sound-1', name: 'PA Rental', amount: 250, category: 'Equipment' }, { id: 'sound-2', name: 'Monitor System', amount: 100, category: 'Equipment' }, { id: 'sound-3', name: 'Venue Cut', amount: 50, category: 'Venue' }] },
  { id: 'sound-advanced', name: 'Advanced Sound Package', description: 'Premium PA with additional monitors and subs', basePrice: 1200, category: 'production', subcategory: 'Sound', costBreakdown: [{ id: 'sound-adv-1', name: 'Premium PA System', amount: 600, category: 'Equipment' }, { id: 'sound-adv-2', name: 'Sub Stacks', amount: 300, category: 'Equipment' }, { id: 'sound-adv-3', name: 'Monitor Engineer', amount: 200, category: 'Labor' }, { id: 'sound-adv-4', name: 'Venue Cut', amount: 100, category: 'Venue' }], mandatoryLabor: { name: 'FOH Engineer', cost: 350 } },
  { id: 'lights-basic', name: 'House Lighting', description: 'Standard stage lighting package', basePrice: 300, category: 'production', subcategory: 'Lights', costBreakdown: [{ id: 'light-1', name: 'Par Cans', amount: 150, category: 'Equipment' }, { id: 'light-2', name: 'Basic Control', amount: 100, category: 'Equipment' }, { id: 'light-3', name: 'Maintenance', amount: 50, category: 'Maintenance' }] },
  { id: 'lights-advanced', name: 'Advanced Lighting', description: 'Full lighting rig with moving heads and control', basePrice: 1800, category: 'production', subcategory: 'Lights', costBreakdown: [{ id: 'light-adv-1', name: 'Moving Heads (8)', amount: 800, category: 'Equipment' }, { id: 'light-adv-2', name: 'LED Bars', amount: 400, category: 'Equipment' }, { id: 'light-adv-3', name: 'Haze Machine', amount: 150, category: 'Equipment' }, { id: 'light-adv-4', name: 'DMX Control', amount: 250, category: 'Equipment' }, { id: 'light-adv-5', name: 'Venue Cut', amount: 200, category: 'Venue' }], mandatoryLabor: { name: 'Lighting Tech', cost: 400 } },
  { id: 'backline-drums', name: 'Drum Kit', description: 'House drum kit with hardware', basePrice: 200, category: 'production', subcategory: 'Backline', costBreakdown: [{ id: 'drums-1', name: 'Kit Rental', amount: 150, category: 'Equipment' }, { id: 'drums-2', name: 'Hardware', amount: 30, category: 'Equipment' }, { id: 'drums-3', name: 'Maintenance', amount: 20, category: 'Maintenance' }] },
  { id: 'backline-amps', name: 'Guitar/Bass Amps', description: 'Backline amplifiers', basePrice: 250, category: 'production', subcategory: 'Backline', costBreakdown: [{ id: 'amps-1', name: 'Guitar Amp', amount: 125, category: 'Equipment' }, { id: 'amps-2', name: 'Bass Amp', amount: 100, category: 'Equipment' }, { id: 'amps-3', name: 'Maintenance', amount: 25, category: 'Maintenance' }] },
  { id: 'security-extra', name: 'Additional Security', description: 'Extra security personnel', basePrice: 450, category: 'staffing', subcategory: 'Security', costBreakdown: [{ id: 'sec-1', name: 'Security Guard (3)', amount: 375, category: 'Labor' }, { id: 'sec-2', name: 'Coordination Fee', amount: 75, category: 'Admin' }] },
  { id: 'bar-extra', name: 'Additional Bar Staff', description: 'Extra bartenders', basePrice: 350, category: 'staffing', subcategory: 'Bar', costBreakdown: [{ id: 'bar-1', name: 'Bartenders (2)', amount: 300, category: 'Labor' }, { id: 'bar-2', name: 'Barback', amount: 50, category: 'Labor' }] },
  { id: 'green-towels', name: 'Towels', description: 'Fresh towels for green room', basePrice: 15, category: 'hospitality', subcategory: 'Green Room', costBreakdown: [{ id: 'towel-1', name: 'Towel Pack (6)', amount: 15, category: 'Supplies' }] },
  { id: 'green-catering', name: 'Hot Meal Catering', description: 'Catered meals for artists', basePrice: 250, category: 'hospitality', subcategory: 'Green Room', costBreakdown: [{ id: 'cater-1', name: 'Meal Service (8 people)', amount: 200, category: 'Food' }, { id: 'cater-2', name: 'Setup & Service', amount: 50, category: 'Labor' }] },
  { id: 'green-drinks', name: 'Beverage Rider', description: 'Drinks package for artists', basePrice: 100, category: 'hospitality', subcategory: 'Green Room', costBreakdown: [{ id: 'drink-1', name: 'Water & Soft Drinks', amount: 40, category: 'Supplies' }, { id: 'drink-2', name: 'Beer/Wine Selection', amount: 60, category: 'Supplies' }] },
  { id: 'green-snacks', name: 'Snack Spread', description: 'Assorted snacks and fruit', basePrice: 75, category: 'hospitality', subcategory: 'Green Room', costBreakdown: [{ id: 'snack-1', name: 'Fresh Fruit', amount: 30, category: 'Food' }, { id: 'snack-2', name: 'Chips & Dips', amount: 25, category: 'Food' }, { id: 'snack-3', name: 'Candy & Treats', amount: 20, category: 'Food' }] },
]

const VenueCatalogContext = createContext(null)

export function VenueCatalogProvider({ children }) {
  const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS)

  const houseMinimums = menuItems.filter((item) => item.isHouseMinimum)

  const getHouseMinimumTotal = useCallback(() => {
    return menuItems.filter((item) => item.isHouseMinimum).reduce((sum, item) => sum + item.basePrice, 0)
  }, [menuItems])

  const addMenuItem = useCallback((item) => {
    setMenuItems((prev) => [...prev, item])
  }, [])

  const updateMenuItem = useCallback((id, updates) => {
    setMenuItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }, [])

  const deleteMenuItem = useCallback((id) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const value = {
    menuItems,
    setMenuItems,
    houseMinimums,
    getHouseMinimumTotal,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
  }

  return <VenueCatalogContext.Provider value={value}>{children}</VenueCatalogContext.Provider>
}

export function useVenueCatalog() {
  const ctx = useContext(VenueCatalogContext)
  if (!ctx) return null
  return ctx
}
