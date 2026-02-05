"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export interface CostBreakdown {
  id: string
  name: string
  amount: number
  category: string
}

export interface MenuItem {
  id: string
  name: string
  description: string
  basePrice: number
  category: "production" | "staffing" | "hospitality"
  subcategory: string
  costBreakdown: CostBreakdown[]
  mandatoryLabor?: { name: string; cost: number }
  isHouseMinimum?: boolean
}

export interface Band {
  id: string
  name: string
  setStart: string
  setEnd: string
  isHeadliner?: boolean
}

export interface Event {
  id: string
  name: string
  date: string
  loadIn: string
  soundcheck: string
  doors: string
  curfew: string
  loadOut: string
  status: "draft" | "confirmed" | "pending-approval"
  selectedItems: string[]
  greenRoomItems: { id: string; quantity: number }[]
  bands: Band[]
  wizardCompleted: boolean
  specialRequests?: string
}

export interface EventProviderProps {
  children: ReactNode
  /** When provided (multi-tenant venue), events are synced from DB and saves persist to Supabase */
  initialEvents?: Event[] | null
  venueId?: string | null
  onPersistEvent?: (event: Event) => Promise<Event | null>
  onDeleteEvent?: (id: string) => Promise<void>
}

interface EventContextType {
  menuItems: MenuItem[]
  setMenuItems: (items: MenuItem[]) => void
  events: Event[]
  setEvents: (events: Event[]) => void
  currentEvent: Event | null
  setCurrentEvent: (event: Event | null) => void
  houseMinimums: MenuItem[]
  addMenuItem: (item: MenuItem) => void
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void
  deleteMenuItem: (id: string) => void
  toggleEventItem: (itemId: string) => void
  updateGreenRoomItem: (itemId: string, quantity: number) => void
  getTotalBudget: () => number
  getHouseMinimumTotal: () => number
  updateEventTimes: (times: { loadIn: string; soundcheck: string; doors: string; curfew: string; loadOut: string }) => void
  updateSpecialRequests: (requests: string) => void
  finalizeWizard: () => void
  resetWizard: () => void
  saveEvent: (event: Event) => void | Promise<Event | null>
  deleteEvent: (id: string) => void
  venueId: string | null
}

const defaultMenuItems: MenuItem[] = [
  {
    id: "house-insurance",
    name: "Venue Insurance",
    description: "Liability coverage for the event",
    basePrice: 500,
    category: "production",
    subcategory: "House Minimums",
    costBreakdown: [
      { id: "ins-1", name: "Liability Coverage", amount: 400, category: "Insurance" },
      { id: "ins-2", name: "Admin Fee", amount: 100, category: "Admin" },
    ],
    isHouseMinimum: true,
  },
  {
    id: "house-admin",
    name: "Admin & Booking",
    description: "Administrative costs and booking fees",
    basePrice: 350,
    category: "production",
    subcategory: "House Minimums",
    costBreakdown: [
      { id: "admin-1", name: "Booking Fee", amount: 200, category: "Admin" },
      { id: "admin-2", name: "Contract Processing", amount: 150, category: "Admin" },
    ],
    isHouseMinimum: true,
  },
  {
    id: "house-staff",
    name: "Basic Staff",
    description: "Minimum required venue staff",
    basePrice: 800,
    category: "staffing",
    subcategory: "House Minimums",
    costBreakdown: [
      { id: "staff-1", name: "Door Staff (2)", amount: 300, category: "Labor" },
      { id: "staff-2", name: "Sound Tech", amount: 250, category: "Labor" },
      { id: "staff-3", name: "Venue Manager", amount: 250, category: "Labor" },
    ],
    isHouseMinimum: true,
  },
  {
    id: "sound-basic",
    name: "House Sound System",
    description: "Standard PA and monitors",
    basePrice: 400,
    category: "production",
    subcategory: "Sound",
    costBreakdown: [
      { id: "sound-1", name: "PA Rental", amount: 250, category: "Equipment" },
      { id: "sound-2", name: "Monitor System", amount: 100, category: "Equipment" },
      { id: "sound-3", name: "Venue Cut", amount: 50, category: "Venue" },
    ],
  },
  {
    id: "sound-advanced",
    name: "Advanced Sound Package",
    description: "Premium PA with additional monitors and subs",
    basePrice: 1200,
    category: "production",
    subcategory: "Sound",
    costBreakdown: [
      { id: "sound-adv-1", name: "Premium PA System", amount: 600, category: "Equipment" },
      { id: "sound-adv-2", name: "Sub Stacks", amount: 300, category: "Equipment" },
      { id: "sound-adv-3", name: "Monitor Engineer", amount: 200, category: "Labor" },
      { id: "sound-adv-4", name: "Venue Cut", amount: 100, category: "Venue" },
    ],
    mandatoryLabor: { name: "FOH Engineer", cost: 350 },
  },
  {
    id: "lights-basic",
    name: "House Lighting",
    description: "Standard stage lighting package",
    basePrice: 300,
    category: "production",
    subcategory: "Lights",
    costBreakdown: [
      { id: "light-1", name: "Par Cans", amount: 150, category: "Equipment" },
      { id: "light-2", name: "Basic Control", amount: 100, category: "Equipment" },
      { id: "light-3", name: "Maintenance", amount: 50, category: "Maintenance" },
    ],
  },
  {
    id: "lights-advanced",
    name: "Advanced Lighting",
    description: "Full lighting rig with moving heads and control",
    basePrice: 1800,
    category: "production",
    subcategory: "Lights",
    costBreakdown: [
      { id: "light-adv-1", name: "Moving Heads (8)", amount: 800, category: "Equipment" },
      { id: "light-adv-2", name: "LED Bars", amount: 400, category: "Equipment" },
      { id: "light-adv-3", name: "Haze Machine", amount: 150, category: "Equipment" },
      { id: "light-adv-4", name: "DMX Control", amount: 250, category: "Equipment" },
      { id: "light-adv-5", name: "Venue Cut", amount: 200, category: "Venue" },
    ],
    mandatoryLabor: { name: "Lighting Tech", cost: 400 },
  },
  {
    id: "backline-drums",
    name: "Drum Kit",
    description: "House drum kit with hardware",
    basePrice: 200,
    category: "production",
    subcategory: "Backline",
    costBreakdown: [
      { id: "drums-1", name: "Kit Rental", amount: 150, category: "Equipment" },
      { id: "drums-2", name: "Hardware", amount: 30, category: "Equipment" },
      { id: "drums-3", name: "Maintenance", amount: 20, category: "Maintenance" },
    ],
  },
  {
    id: "backline-amps",
    name: "Guitar/Bass Amps",
    description: "Backline amplifiers",
    basePrice: 250,
    category: "production",
    subcategory: "Backline",
    costBreakdown: [
      { id: "amps-1", name: "Guitar Amp", amount: 125, category: "Equipment" },
      { id: "amps-2", name: "Bass Amp", amount: 100, category: "Equipment" },
      { id: "amps-3", name: "Maintenance", amount: 25, category: "Maintenance" },
    ],
  },
  {
    id: "security-extra",
    name: "Additional Security",
    description: "Extra security personnel",
    basePrice: 450,
    category: "staffing",
    subcategory: "Security",
    costBreakdown: [
      { id: "sec-1", name: "Security Guard (3)", amount: 375, category: "Labor" },
      { id: "sec-2", name: "Coordination Fee", amount: 75, category: "Admin" },
    ],
  },
  {
    id: "bar-extra",
    name: "Additional Bar Staff",
    description: "Extra bartenders",
    basePrice: 350,
    category: "staffing",
    subcategory: "Bar",
    costBreakdown: [
      { id: "bar-1", name: "Bartenders (2)", amount: 300, category: "Labor" },
      { id: "bar-2", name: "Barback", amount: 50, category: "Labor" },
    ],
  },
  {
    id: "green-towels",
    name: "Towels",
    description: "Fresh towels for green room",
    basePrice: 15,
    category: "hospitality",
    subcategory: "Green Room",
    costBreakdown: [
      { id: "towel-1", name: "Towel Pack (6)", amount: 15, category: "Supplies" },
    ],
  },
  {
    id: "green-catering",
    name: "Hot Meal Catering",
    description: "Catered meals for artists",
    basePrice: 250,
    category: "hospitality",
    subcategory: "Green Room",
    costBreakdown: [
      { id: "cater-1", name: "Meal Service (8 people)", amount: 200, category: "Food" },
      { id: "cater-2", name: "Setup & Service", amount: 50, category: "Labor" },
    ],
  },
  {
    id: "green-drinks",
    name: "Beverage Rider",
    description: "Drinks package for artists",
    basePrice: 100,
    category: "hospitality",
    subcategory: "Green Room",
    costBreakdown: [
      { id: "drink-1", name: "Water & Soft Drinks", amount: 40, category: "Supplies" },
      { id: "drink-2", name: "Beer/Wine Selection", amount: 60, category: "Supplies" },
    ],
  },
  {
    id: "green-snacks",
    name: "Snack Spread",
    description: "Assorted snacks and fruit",
    basePrice: 75,
    category: "hospitality",
    subcategory: "Green Room",
    costBreakdown: [
      { id: "snack-1", name: "Fresh Fruit", amount: 30, category: "Food" },
      { id: "snack-2", name: "Chips & Dips", amount: 25, category: "Food" },
      { id: "snack-3", name: "Candy & Treats", amount: 20, category: "Food" },
    ],
  },
]

const defaultEvent: Event = {
  id: "event-1",
  name: "Sample Show",
  date: "2026-02-15",
  loadIn: "14:00",
  soundcheck: "16:00",
  doors: "19:00",
  curfew: "23:00",
  loadOut: "00:00",
  status: "draft",
  selectedItems: [],
  greenRoomItems: [],
  bands: [
    { id: "band-1", name: "Local Opener", setStart: "19:30", setEnd: "20:15", isHeadliner: false },
    { id: "band-2", name: "Support Act", setStart: "20:30", setEnd: "21:15", isHeadliner: false },
    { id: "band-3", name: "The Headliners", setStart: "21:45", setEnd: "23:00", isHeadliner: true },
  ],
  wizardCompleted: false,
  specialRequests: "",
}

const EventContext = createContext<EventContextType | undefined>(undefined)

export function EventProvider({
  children,
  initialEvents = undefined,
  venueId = null,
  onPersistEvent,
  onDeleteEvent,
}: EventProviderProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems)
  const [events, setEvents] = useState<Event[]>(
    initialEvents !== undefined && initialEvents !== null ? initialEvents : [defaultEvent]
  )
  const [currentEvent, setCurrentEvent] = useState<Event | null>(
    initialEvents?.length ? initialEvents[0] ?? null : defaultEvent
  )

  useEffect(() => {
    if (initialEvents === undefined || initialEvents === null) return
    setEvents(initialEvents.length ? initialEvents : [defaultEvent])
    setCurrentEvent((prev) => {
      const first = initialEvents.length ? initialEvents[0] : null
      if (!first) return defaultEvent
      const stillThere = initialEvents.find((e) => e.id === prev?.id)
      return stillThere ?? first
    })
  }, [initialEvents])

  const houseMinimums = menuItems.filter((item) => item.isHouseMinimum)

  const saveEvent = useCallback(
    (event: Event): void | Promise<Event | null> => {
      setEvents((prev) => {
        const idx = prev.findIndex((e) => e.id === event.id)
        const next = idx >= 0 ? [...prev.slice(0, idx), event, ...prev.slice(idx + 1)] : [...prev, event]
        return next
      })
      setCurrentEvent(event)
      if (onPersistEvent) {
        const p = onPersistEvent(event)
        if (p && typeof p.then === "function") {
          p.then((updated) => {
            if (updated) setCurrentEvent(updated)
          })
          return p
        }
      }
    },
    [onPersistEvent]
  )

  const deleteEvent = useCallback(
    (id: string) => {
      setEvents((prev) => prev.filter((e) => e.id !== id))
      setCurrentEvent((prev) => (prev?.id === id ? null : prev))
      if (onDeleteEvent) void onDeleteEvent(id)
    },
    [onDeleteEvent]
  )

  const addMenuItem = (item: MenuItem) => {
    setMenuItems((prev) => [...prev, item])
  }

  const updateMenuItem = (id: string, updates: Partial<MenuItem>) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const deleteMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id))
  }

  const toggleEventItem = (itemId: string) => {
    if (!currentEvent) return
    const updated = {
      ...currentEvent,
      selectedItems: currentEvent.selectedItems.includes(itemId)
        ? currentEvent.selectedItems.filter((id) => id !== itemId)
        : [...currentEvent.selectedItems, itemId],
    }
    setCurrentEvent(updated)
    setEvents((prev) =>
      prev.map((e) => (e.id === currentEvent.id ? updated : e))
    )
    if (venueId && onPersistEvent) void onPersistEvent(updated)
  }

  const updateGreenRoomItem = (itemId: string, quantity: number) => {
    if (!currentEvent) return
    const existing = currentEvent.greenRoomItems.find((g) => g.id === itemId)
    let updatedItems = [...currentEvent.greenRoomItems]
    
    if (quantity <= 0) {
      updatedItems = updatedItems.filter((g) => g.id !== itemId)
    } else if (existing) {
      updatedItems = updatedItems.map((g) =>
        g.id === itemId ? { ...g, quantity } : g
      )
    } else {
      updatedItems.push({ id: itemId, quantity })
    }

    const updated = { ...currentEvent, greenRoomItems: updatedItems }
    setCurrentEvent(updated)
    setEvents((prev) =>
      prev.map((e) => (e.id === currentEvent.id ? updated : e))
    )
    if (venueId && onPersistEvent) void onPersistEvent(updated)
  }

  const getHouseMinimumTotal = () => {
    return houseMinimums.reduce((sum, item) => sum + item.basePrice, 0)
  }

  const getTotalBudget = () => {
    if (!currentEvent) return getHouseMinimumTotal()
    
    let total = getHouseMinimumTotal()
    
    currentEvent.selectedItems.forEach((itemId) => {
      const item = menuItems.find((m) => m.id === itemId && !m.isHouseMinimum)
      if (item) {
        total += item.basePrice
        if (item.mandatoryLabor) {
          total += item.mandatoryLabor.cost
        }
      }
    })

    currentEvent.greenRoomItems.forEach((greenItem) => {
      const item = menuItems.find((m) => m.id === greenItem.id)
      if (item) {
        total += item.basePrice * greenItem.quantity
      }
    })

    return total
  }

  const updateEventTimes = (times: { loadIn: string; soundcheck: string; doors: string; curfew: string; loadOut: string }) => {
    if (!currentEvent) return
    const updated = { ...currentEvent, ...times }
    setCurrentEvent(updated)
    setEvents((prev) => prev.map((e) => (e.id === currentEvent.id ? updated : e)))
    if (venueId && onPersistEvent) void onPersistEvent(updated)
  }

  const updateSpecialRequests = (requests: string) => {
    if (!currentEvent) return
    const updated = { ...currentEvent, specialRequests: requests }
    setCurrentEvent(updated)
    setEvents((prev) => prev.map((e) => (e.id === currentEvent.id ? updated : e)))
    if (venueId && onPersistEvent) void onPersistEvent(updated)
  }

  const finalizeWizard = () => {
    if (!currentEvent) return
    const updated = { ...currentEvent, wizardCompleted: true, status: "pending-approval" as const }
    setCurrentEvent(updated)
    setEvents((prev) => prev.map((e) => (e.id === currentEvent.id ? updated : e)))
    if (venueId && onPersistEvent) void onPersistEvent(updated)
  }

  const resetWizard = () => {
    if (!currentEvent) return
    const updated = { ...currentEvent, wizardCompleted: false, status: "draft" as const }
    setCurrentEvent(updated)
    setEvents((prev) => prev.map((e) => (e.id === currentEvent.id ? updated : e)))
    if (venueId && onPersistEvent) void onPersistEvent(updated)
  }

  return (
    <EventContext.Provider
      value={{
        menuItems,
        setMenuItems,
        events,
        setEvents,
        currentEvent,
        setCurrentEvent,
        houseMinimums,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        toggleEventItem,
        updateGreenRoomItem,
        getTotalBudget,
        getHouseMinimumTotal,
        updateEventTimes,
        updateSpecialRequests,
        finalizeWizard,
        resetWizard,
        saveEvent,
        deleteEvent,
        venueId,
      }}
    >
      {children}
    </EventContext.Provider>
  )
}

export function useEvent() {
  const context = useContext(EventContext)
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider")
  }
  return context
}
