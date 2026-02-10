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

export type ShowStatus = "draft" | "confirmed" | "pending-approval" | "completed"
export type SectionApprovalStatus = "CONFIRMED" | "PENDING_APPROVAL"

export interface ShowRow {
  id: string
  venue_id: string
  name: string
  artist_name: string | null
  date: string
  status: ShowStatus
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
  production_approval_status?: SectionApprovalStatus | null
  hospitality_approval_status?: SectionApprovalStatus | null
  schedule_approval_status?: SectionApprovalStatus | null
  created_at: string
  updated_at: string
}

export interface ShowInvitationRow {
  id: string
  show_id: string
  email: string
  token: string
  status: "pending" | "accepted"
  invited_by: string | null
  accepted_at: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export interface VenueNotificationRow {
  id: string
  venue_id: string
  show_id: string | null
  type: string
  title: string
  body: string | null
  read_at: string | null
  created_at: string
  metadata: Record<string, unknown>
}
