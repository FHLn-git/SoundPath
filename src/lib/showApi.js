/**
 * Show (event) API – same Supabase client as rest of SoundPath.
 */
import { supabase } from './supabaseClient'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id)
}

/** Normalize DB time (HH:MM:SS or HH:MM) to HH:MM for UI */
function dbTimeToUi(time) {
  if (!time) return '00:00'
  const part = String(time).slice(0, 5)
  return part.length === 4 ? `0${part}` : part
}

/** UI time HH:MM to DB (store as HH:MM:00 for TIME type) */
function uiTimeToDb(time) {
  if (!time) return '00:00:00'
  const t = String(time)
  return t.length === 5 ? `${t}:00` : `${t.slice(0, 5)}:00`
}

/**
 * Convert DB show row to UI event shape.
 * @param {Object} row
 * @returns {Object} event
 */
export function showRowToEvent(row) {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    venue_id: row.venue_id,
    loadIn: dbTimeToUi(row.load_in),
    soundcheck: dbTimeToUi(row.soundcheck),
    doors: dbTimeToUi(row.doors),
    curfew: dbTimeToUi(row.curfew),
    loadOut: dbTimeToUi(row.load_out),
    status: row.status || 'draft',
    selectedItems: row.selected_items ?? [],
    greenRoomItems: Array.isArray(row.green_room_items) ? row.green_room_items : [],
    bands: Array.isArray(row.bands) ? row.bands : [],
    wizardCompleted: row.status !== 'draft',
    specialRequests: row.special_requests ?? '',
    productionApprovalStatus: row.production_approval_status ?? null,
    hospitalityApprovalStatus: row.hospitality_approval_status ?? null,
    scheduleApprovalStatus: row.schedule_approval_status ?? null,
  }
}

/**
 * Convert UI event to DB row (omit id, created_at, updated_at).
 * @param {Object} event
 * @param {string} venueId
 * @returns {Object}
 */
export function eventToShowRow(event, venueId) {
  return {
    venue_id: venueId,
    name: event.name,
    artist_name: event.bands?.[0]?.name ?? null,
    date: event.date,
    status: event.status || 'draft',
    contract_status: 'pending',
    payout_status: 'pending',
    load_in: event.loadIn ? uiTimeToDb(event.loadIn) : null,
    soundcheck: event.soundcheck ? uiTimeToDb(event.soundcheck) : null,
    doors: event.doors ? uiTimeToDb(event.doors) : null,
    curfew: event.curfew ? uiTimeToDb(event.curfew) : null,
    load_out: event.loadOut ? uiTimeToDb(event.loadOut) : null,
    selected_items: event.selectedItems ?? [],
    green_room_items: event.greenRoomItems ?? [],
    bands: event.bands ?? [],
    special_requests: event.specialRequests ?? null,
    production_approval_status: event.productionApprovalStatus ?? null,
    hospitality_approval_status: event.hospitalityApprovalStatus ?? null,
    schedule_approval_status: event.scheduleApprovalStatus ?? null,
  }
}

/**
 * @param {string} venueId
 * @param {Object} event - UI event shape (id can be temp for insert)
 * @returns {Promise<Object|null>} updated event with real id
 */
export async function upsertShow(venueId, event) {
  if (!supabase) return null
  const row = eventToShowRow(event, venueId)
  if (isUuid(event.id)) {
    const { data, error } = await supabase
      .from('shows')
      .update({
        name: row.name,
        artist_name: row.artist_name,
        date: row.date,
        status: row.status,
        contract_status: row.contract_status,
        payout_status: row.payout_status,
        load_in: row.load_in,
        soundcheck: row.soundcheck,
        doors: row.doors,
        curfew: row.curfew,
        load_out: row.load_out,
        selected_items: row.selected_items,
        green_room_items: row.green_room_items,
        bands: row.bands,
        special_requests: row.special_requests,
        production_approval_status: row.production_approval_status,
        hospitality_approval_status: row.hospitality_approval_status,
        schedule_approval_status: row.schedule_approval_status,
      })
      .eq('id', event.id)
      .select()
      .single()
    if (error) throw error
    return data ? showRowToEvent(data) : null
  }
  const { data, error } = await supabase.from('shows').insert(row).select().single()
  if (error) throw error
  if (!data) return null
  return showRowToEvent(data)
}

/**
 * Approve one section (Production, Hospitality, Schedule). Venue only.
 * @param {string} showId
 * @param {'production'|'hospitality'|'schedule'} section
 * @returns {Promise<Object|null>}
 */
export async function approveShowSection(showId, section) {
  if (!supabase) return null
  const col = section === 'production' ? 'production_approval_status' : section === 'hospitality' ? 'hospitality_approval_status' : 'schedule_approval_status'
  const { data, error } = await supabase.from('shows').update({ [col]: 'CONFIRMED' }).eq('id', showId).select().single()
  if (error) throw error
  return data ? showRowToEvent(data) : null
}

/**
 * Create show invitation; returns token for invite link. Venue only.
 * @param {string} showId
 * @param {string} email
 * @returns {Promise<{id: string, token: string}|{error: string}>}
 */
export async function createShowInvitation(showId, email) {
  if (!supabase) return { error: 'Not configured' }
  const { data, error } = await supabase.rpc('create_show_invitation', { p_show_id: showId, p_email: email.trim().toLowerCase() })
  if (error) return { error: error.message }
  const r = data
  if (r?.error) return { error: r.error }
  if (r?.id && r?.token) return { id: r.id, token: r.token }
  return { error: 'Invalid response' }
}

/**
 * Accept show invitation (call when authenticated; email must match invite).
 * @param {string} token
 * @returns {Promise<{show_id: string}|{error: string}>}
 */
export async function acceptShowInvitation(token) {
  if (!supabase) return { error: 'Not configured' }
  const { data, error } = await supabase.rpc('accept_show_invitation', { p_token: token })
  if (error) return { error: error.message }
  const r = data
  if (r?.error) return { error: r.error }
  if (r?.show_id) return { show_id: r.show_id }
  return { error: 'Invalid response' }
}

/**
 * Get invitation email by token (anon) for sign-up prefill.
 * @param {string} token
 * @returns {Promise<{email: string}|null>}
 */
export async function getShowInvitationEmailByToken(token) {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('get_show_invitation_email_by_token', { p_token: token })
  if (error || !data?.email) return null
  return { email: data.email }
}

/**
 * @param {string} showId
 * @returns {Promise<void>}
 */
export async function deleteShow(showId) {
  if (!supabase) return
  await supabase.from('shows').delete().eq('id', showId)
}
