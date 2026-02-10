import { supabase } from "./supabase"
import type { VenueIntegrationRow, VenueIntegrationProvider } from "./venue-types"

/** List all integrations for a venue. */
export async function listIntegrations(venueId: string): Promise<VenueIntegrationRow[]> {
  if (!supabase || !venueId) return []
  const { data, error } = await supabase
    .from("venue_integrations")
    .select("*")
    .eq("venue_id", venueId)
  if (error) throw error
  return (data ?? []) as VenueIntegrationRow[]
}

/** Get one integration by venue + provider. */
export async function getIntegration(
  venueId: string,
  provider: VenueIntegrationProvider
): Promise<VenueIntegrationRow | null> {
  if (!supabase || !venueId) return null
  const { data, error } = await supabase
    .from("venue_integrations")
    .select("*")
    .eq("venue_id", venueId)
    .eq("provider", provider)
    .maybeSingle()
  if (error) throw error
  return data as VenueIntegrationRow | null
}

/** Config shapes per provider (for type-safe usage). */
export interface IcalConfig {
  ical_url?: string
}

export interface TicketingWebhookConfig {
  webhook_secret?: string
  last_received_at?: string
}

/** Upsert integration. Config is stored as JSONB; secrets (e.g. webhook_secret) are in config. */
export async function upsertIntegration(
  venueId: string,
  provider: VenueIntegrationProvider,
  config: Record<string, unknown>
): Promise<VenueIntegrationRow | null> {
  if (!supabase || !venueId) return null
  const { data, error } = await supabase
    .from("venue_integrations")
    .upsert(
      {
        venue_id: venueId,
        provider,
        config: config ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "venue_id,provider" }
    )
    .select()
    .single()
  if (error) throw error
  return data as VenueIntegrationRow
}

/** Update last_sync_at for an integration. */
export async function setIntegrationLastSync(
  venueId: string,
  provider: VenueIntegrationProvider,
  status?: string
): Promise<void> {
  if (!supabase || !venueId) return
  await supabase
    .from("venue_integrations")
    .update({
      last_sync_at: new Date().toISOString(),
      status: status ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("venue_id", venueId)
    .eq("provider", provider)
}

/** Generate a random webhook secret (for ticketing). Caller stores via upsertIntegration. */
export function generateWebhookSecret(): string {
  const array = new Uint8Array(32)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < 32; i++) array[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")
}
