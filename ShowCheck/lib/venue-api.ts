import { supabase } from "./supabase"
import type { Venue } from "./venue-types"

export interface CreateVenueInput {
  name: string
  capacity?: number | null
  address?: string | null
  address_street_1?: string | null
  address_street_2?: string | null
  address_city?: string | null
  address_state_region?: string | null
  address_postal_code?: string | null
  address_country?: string | null
  contact_info?: Record<string, unknown>
  organization_id?: string | null
}

/** Build a single-line address for display from structured fields */
export function formatVenueAddressLine(venue: {
  address_street_1?: string | null
  address_street_2?: string | null
  address_city?: string | null
  address_state_region?: string | null
  address_postal_code?: string | null
  address_country?: string | null
  address?: string | null
}): string | null {
  if (venue.address && venue.address.trim()) return venue.address.trim()
  const parts = [
    [venue.address_street_1, venue.address_street_2].filter(Boolean).join(", "),
    venue.address_city,
    [venue.address_state_region, venue.address_postal_code].filter(Boolean).join(" "),
    venue.address_country,
  ].filter(Boolean)
  return parts.length ? parts.join(", ") : null
}

export async function createVenue(input: CreateVenueInput): Promise<Venue | null> {
  if (!supabase) {
    throw new Error("Database is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.")
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error("You’re not signed in. Sign in and try again.")
  }

  const addressLine =
    input.address?.trim() ||
    (input.address_street_1 || input.address_city || input.address_country
      ? formatVenueAddressLine({
          address_street_1: input.address_street_1,
          address_street_2: input.address_street_2,
          address_city: input.address_city,
          address_state_region: input.address_state_region,
          address_postal_code: input.address_postal_code,
          address_country: input.address_country,
        })
      : null)

  const { data, error } = await supabase
    .from("venues")
    .insert({
      owner_id: user.id,
      name: input.name,
      capacity: input.capacity ?? null,
      address: addressLine ?? null,
      address_street_1: input.address_street_1?.trim() || null,
      address_street_2: input.address_street_2?.trim() || null,
      address_city: input.address_city?.trim() || null,
      address_state_region: input.address_state_region?.trim() || null,
      address_postal_code: input.address_postal_code?.trim() || null,
      address_country: input.address_country?.trim() || null,
      contact_info: input.contact_info ?? {},
      organization_id: input.organization_id ?? null,
    })
    .select()
    .single()

  if (error) {
    const msg = error.message || "Database rejected the request."
    const hint =
      msg.includes("does not exist") && (msg.includes("address_street") || msg.includes("address_city"))
        ? " Run the database migration 'venues-address-fields.sql' in Supabase to add address columns."
        : ""
    throw new Error(msg + hint)
  }
  return data as Venue
}

export interface UpdateVenueInput {
  name?: string
  capacity?: number | null
  address?: string | null
  address_street_1?: string | null
  address_street_2?: string | null
  address_city?: string | null
  address_state_region?: string | null
  address_postal_code?: string | null
  address_country?: string | null
  timezone?: string | null
  contact_info?: Record<string, unknown>
  organization_id?: string | null
  group_id?: string | null
  shared_facilities_json?: unknown
}

export async function updateVenue(venueId: string, input: UpdateVenueInput): Promise<Venue | null> {
  if (!supabase) return null
  const addressLine =
    input.address !== undefined
      ? (input.address?.trim() || null)
      : undefined
  const payload: Record<string, unknown> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.capacity !== undefined) payload.capacity = input.capacity ?? null
  if (input.address_street_1 !== undefined) payload.address_street_1 = input.address_street_1?.trim() || null
  if (input.address_street_2 !== undefined) payload.address_street_2 = input.address_street_2?.trim() || null
  if (input.address_city !== undefined) payload.address_city = input.address_city?.trim() || null
  if (input.address_state_region !== undefined) payload.address_state_region = input.address_state_region?.trim() || null
  if (input.address_postal_code !== undefined) payload.address_postal_code = input.address_postal_code?.trim() || null
  if (input.address_country !== undefined) payload.address_country = input.address_country?.trim() || null
  if (input.timezone !== undefined) payload.timezone = input.timezone?.trim() || null
  if (input.contact_info !== undefined) payload.contact_info = input.contact_info
  if (input.organization_id !== undefined) payload.organization_id = input.organization_id ?? null
  if (input.group_id !== undefined) payload.group_id = input.group_id ?? null
  if (input.shared_facilities_json !== undefined) payload.shared_facilities_json = input.shared_facilities_json
  if (addressLine !== undefined) payload.address = addressLine

  const { data, error } = await supabase
    .from("venues")
    .update(payload)
    .eq("id", venueId)
    .select()
    .single()
  if (error) throw error
  return data as Venue
}

/** Soft delete: set deleted_at so venue disappears from app; SoundPath retains data. */
export async function archiveVenue(venueId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from("venues")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", venueId)
  if (error) throw error
}
