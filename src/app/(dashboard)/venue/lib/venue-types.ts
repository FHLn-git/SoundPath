export interface VenueAddress {
  street_1: string | null
  street_2: string | null
  city: string | null
  state_region: string | null
  postal_code: string | null
  country: string | null
}

export interface Venue {
  id: string
  owner_id: string
  organization_id: string | null
  name: string
  capacity: number | null
  address: string | null
  address_street_1: string | null
  address_street_2: string | null
  address_city: string | null
  address_state_region: string | null
  address_postal_code: string | null
  address_country: string | null
  contact_info: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ShowRow {
  id: string
  venue_id: string
  name: string
  artist_name: string | null
  date: string
  status: "draft" | "confirmed" | "pending-approval"
  contract_status: string
  payout_status: string
  load_in: string | null
  soundcheck: string | null
  doors: string | null
  curfew: string | null
  load_out: string | null
  selected_items: string[]
  green_room_items: { id: string; quantity: number }[]
  bands: { id: string; name: string; setStart: string; setEnd: string; isHeadliner?: boolean }[]
  special_requests: string | null
  created_at: string
  updated_at: string
}
