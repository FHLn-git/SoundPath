/**
 * Venue API – uses the same Supabase client as the rest of SoundPath.
 * One ecosystem, one auth, one DB.
 */
import { supabase } from './supabaseClient'

/**
 * @typedef {Object} Venue
 * @property {string} id
 * @property {string} owner_id
 * @property {string|null} organization_id
 * @property {string} name
 * @property {number|null} capacity
 * @property {string|null} address
 * @property {string|null} [address_street_1]
 * @property {string|null} [address_street_2]
 * @property {string|null} [address_city]
 * @property {string|null} [address_state_region]
 * @property {string|null} [address_postal_code]
 * @property {string|null} [address_country]
 * @property {Record<string,unknown>} [contact_info]
 * @property {Record<string,unknown>} [metadata]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Build a single-line address for display from structured fields.
 * @param {Venue|Object} venue
 * @returns {string|null}
 */
export function formatVenueAddressLine(venue) {
  if (venue?.address?.trim()) return venue.address.trim()
  const parts = [
    [venue?.address_street_1, venue?.address_street_2].filter(Boolean).join(', '),
    venue?.address_city,
    [venue?.address_state_region, venue?.address_postal_code].filter(Boolean).join(' '),
    venue?.address_country,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

/**
 * @param {Object} input
 * @param {string} input.name
 * @param {number|null} [input.capacity]
 * @param {string|null} [input.address_street_1]
 * @param {string|null} [input.address_street_2]
 * @param {string|null} [input.address_city]
 * @param {string|null} [input.address_state_region]
 * @param {string|null} [input.address_postal_code]
 * @param {string|null} [input.address_country]
 * @param {string|null} [input.address]
 * @param {Record<string,unknown>} [input.contact_info]
 * @param {string|null} [input.organization_id]
 * @returns {Promise<Venue|null>}
 */
export async function createVenue(input) {
  if (!supabase) {
    throw new Error(
      'Database is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.'
    )
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error("You're not signed in. Sign in and try again.")
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
    .from('venues')
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
    const msg = error.message || 'Database rejected the request.'
    const hint =
      msg.includes('does not exist') &&
      (msg.includes('address_street') || msg.includes('address_city'))
      ? " Run the database migration 'venues-address-fields.sql' in Supabase to add address columns."
      : ''
    throw new Error(msg + hint)
  }
  return data
}

/**
 * Update venue. Partial updates supported.
 * @param {string} venueId
 * @param {Object} input
 * @returns {Promise<Venue|null>}
 */
export async function updateVenue(venueId, input) {
  if (!supabase) return null
  const payload = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.capacity !== undefined) payload.capacity = input.capacity ?? null
  if (input.address !== undefined) payload.address = input.address?.trim() || null
  if (input.address_street_1 !== undefined) payload.address_street_1 = input.address_street_1?.trim() || null
  if (input.address_street_2 !== undefined) payload.address_street_2 = input.address_street_2?.trim() || null
  if (input.address_city !== undefined) payload.address_city = input.address_city?.trim() || null
  if (input.address_state_region !== undefined) payload.address_state_region = input.address_state_region?.trim() || null
  if (input.address_postal_code !== undefined) payload.address_postal_code = input.address_postal_code?.trim() || null
  if (input.address_country !== undefined) payload.address_country = input.address_country?.trim() || null
  if (input.timezone !== undefined) payload.timezone = input.timezone?.trim() || null
  if (input.contact_info !== undefined) payload.contact_info = input.contact_info

  const { data, error } = await supabase
    .from('venues')
    .update(payload)
    .eq('id', venueId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Soft delete: set deleted_at so venue disappears from app; SoundPath retains data.
 * @param {string} venueId
 * @returns {Promise<void>}
 */
export async function archiveVenue(venueId) {
  if (!supabase) return
  const { error } = await supabase
    .from('venues')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', venueId)
  if (error) throw error
}
