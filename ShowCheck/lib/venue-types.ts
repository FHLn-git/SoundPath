export interface VenueAddress {
  street_1: string | null
  street_2: string | null
  city: string | null
  state_region: string | null
  postal_code: string | null
  country: string | null
}

/** Corporate shell: group of venues (HQ roll-up) */
export interface VenueGroup {
  id: string
  owner_id: string
  group_name: string
  created_at: string
  updated_at: string
}

/** Per-weekday operating hours: null = closed, [start, end] = open (HH:MM). Keys: mon..sun */
export type OperatingHoursMap = Record<string, [string, string] | null>

/** Default show costs for a stage (Staffing, Tech, Cleaning) */
export interface DefaultShowCosts {
  staffing?: number
  tech?: number
  cleaning?: number
  [key: string]: number | undefined
}

/** Room/stage within a venue; capacity and tech specs */
export interface Stage {
  id: string
  venue_id: string
  name: string
  capacity: number | null
  technical_specs_json: Record<string, unknown>
  /** Fire/legal capacity */
  legal_capacity?: number | null
  /** Comfortable operating capacity */
  comfort_capacity?: number | null
  /** Sound console, PA specs (JSON) */
  audio_specs?: Record<string, unknown>
  /** Lighting rig specs (JSON) */
  lighting_specs?: Record<string, unknown>
  /** Number of bars at this stage */
  bar_count?: number | null
  /** Default stage for venue (e.g. Main Stage) */
  is_default?: boolean
  /** Weekly operating hours (template-based scheduling) */
  default_operating_hours?: OperatingHoursMap
  /** Default costs per show (Staffing, Tech, Cleaning) */
  default_show_costs?: DefaultShowCosts
  created_at: string
  updated_at: string
}

/** Shared facility at venue level (e.g. Green Room 1: Occupied) */
export interface SharedFacility {
  id: string
  name: string
  status?: string
  [key: string]: unknown
}

export interface Venue {
  id: string
  owner_id: string
  organization_id: string | null
  group_id: string | null
  name: string
  capacity: number | null
  address: string | null
  address_street_1: string | null
  address_street_2: string | null
  address_city: string | null
  address_state_region: string | null
  address_postal_code: string | null
  address_country: string | null
  timezone: string | null
  shared_facilities_json: SharedFacility[] | Record<string, unknown>
  contact_info: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Show lifecycle status: OPEN, HOLD_1, HOLD_2, CHALLENGED, CONFIRMED + legacy */
export type ShowStatus =
  | "draft"
  | "open"
  | "hold"
  | "hold_1"
  | "hold_2"
  | "challenged"
  | "confirmed"
  | "pending-approval"
  | "on_sale"
  | "cancelled"
  | "completed"

export interface ShowRow {
  id: string
  venue_id: string
  /** When set, show is for this stage (child org of venue org). Null = main venue. */
  stage_organization_id: string | null
  /** Single stage (new model); null when is_multi_stage and linked_stage_ids used */
  stage_id: string | null
  /** Festival mode: event blocks all stages in linked_stage_ids */
  is_multi_stage: boolean
  /** When is_multi_stage=true, stages blocked by this event */
  linked_stage_ids: string[]
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
  /** Phase 0: hold rank for ranked holds; lower = higher priority (optional until migration) */
  hold_rank?: number | null
  /** Phase 0: when true, removing this hold can auto-promote next by rank */
  hold_auto_promote?: boolean
  /** Phase 0: set when show created from accepted offer */
  offer_id?: string | null
  /** Phase 0: settlement / financials */
  guarantee?: number | null
  door_split_pct?: number | null
  ticket_sales_count?: number | null
  ticket_revenue?: number | null
  expenses?: unknown[]
  settlement_notes?: string | null
  settlement_finalized_at?: string | null
  created_at: string
  updated_at: string
}

/** Offer status for deal pipeline */
export type OfferStatus = "draft" | "sent" | "accepted" | "declined" | "expired"

export interface OfferRow {
  id: string
  venue_id: string
  stage_id: string | null
  created_by: string | null
  artist_name: string
  proposed_date: string
  deal_structure: string | null
  line_items: unknown[]
  status: OfferStatus
  show_id: string | null
  sent_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface OfferTemplateRow {
  id: string
  venue_id: string | null
  venue_group_id: string | null
  name: string
  deal_structure: string | null
  line_items_template: unknown[]
  created_at: string
  updated_at: string
}

/** Inbound submission status */
export type InboundStatus = "new" | "reviewed" | "converted" | "rejected"

export interface InboundSubmissionRow {
  id: string
  venue_id: string | null
  group_id: string | null
  submitted_at: string
  artist_name: string | null
  contact_email: string | null
  contact_phone: string | null
  requested_dates: unknown[]
  message: string | null
  source: string
  status: InboundStatus
  tags: string[]
  assigned_to: string | null
  created_at: string
  updated_at: string
}

/** Advance template (Phase 4): default sections for shareable advance page */
export interface AdvanceTemplateRow {
  id: string
  venue_id: string
  name: string
  sections: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Public advance page payload (run-of-show + venue contact; from get_advance_for_show) */
export interface AdvanceDataPayload {
  show: {
    id: string
    name: string | null
    artist_name: string | null
    date: string
    load_in: string | null
    soundcheck: string | null
    doors: string | null
    curfew: string | null
    load_out: string | null
    bands: unknown
    special_requests: string | null
    advance_page_slug: string | null
  }
  venue: {
    id: string
    name: string
    address_street_1: string | null
    address_street_2: string | null
    address_city: string | null
    address_state_region: string | null
    address_postal_code: string | null
    address_country: string | null
    timezone: string | null
    contact_info: Record<string, unknown>
  }
}

/** Venue asset type */
export type VenueAssetType = "rider" | "contract" | "poster" | "flyer" | "other"

export interface VenueAssetRow {
  id: string
  venue_id: string
  show_id: string | null
  name: string
  type: VenueAssetType
  storage_path: string | null
  url: string | null
  /** When true, only roles with financial visibility see this asset. Default false if column missing (pre–Phase 6). */
  confidential?: boolean
  uploaded_by: string | null
  created_at: string
}

/** Integration provider (calendar, ticketing). */
export type VenueIntegrationProvider = "ical" | "google_calendar" | "ticketing_webhook"

export interface VenueIntegrationRow {
  id: string
  venue_id: string
  provider: VenueIntegrationProvider
  config: Record<string, unknown>
  last_sync_at: string | null
  status: string | null
  created_at: string
  updated_at: string
}

/** Venue role for permissions (Group Admin, Venue Manager, Stage Hand) */
export type VenueRoleType = "group_admin" | "venue_manager" | "stage_hand"

export interface VenueRole {
  id: string
  entity_type: "group" | "venue" | "stage"
  entity_id: string
  user_id: string
  role: VenueRoleType
  created_at: string
}
